import { campanhaSeguinte, decidirCampanha, sequenciaDeCampanhas, type Resultados, type TipoContacto } from '@/domain/crm';
import { TEXTOS_INICIAIS, renderizarEmail } from '@/domain/crmEmails';
import { emailDoWebsite } from '@/lib/crmEnriquecimento';
import { enviarEmailCrm } from '@/lib/crmEmail';
import { procurarNoOsm } from '@/lib/crmDescoberta';
import { guardarCandidatos } from '@/lib/crmServico';
import { adminClient } from '@/lib/supabase/admin';

/**
 * A tarefa diária do CRM (06/11/2026). Por cada zona ativa: (1) procura empresas no OpenStreetMap, uma vez por semana;
 * (2) lê os websites sem email, no máximo 15 por dia; (3) cria os envios da campanha da zona aos contactos elegíveis —
 * **só se a campanha estiver aprovada pelo promotor** — no máximo 20 por dia; (4) envia-os; (5) decide se a campanha
 * avança ou pára. Uma campanha nova ou corrigida não gera nenhum envio até ser aprovada: é só isso que espera por uma
 * pessoa. A base de dados recusa, por gatilho, qualquer envio de campanha não aprovada ou a quem não pode receber.
 * A Vercel envia "Authorization: Bearer CRON_SECRET".
 */
const POR_DIA_ENRIQUECER = 15;
const POR_DIA_ENVIAR = 20;
const SEMANA_MS = 7 * 24 * 3600 * 1000;
const TIPOS: TipoContacto[] = ['pintor', 'fornecedor', 'administradora'];

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) return new Response('Não autorizado', { status: 401 });
  const db = adminClient();
  if (!db) return new Response('Não configurado', { status: 503 });

  // Os textos iniciais entram como rascunho; os que já existem (aprovados ou em correção) ficam como estão.
  await db.from('crm_campanhas').upsert(
    Object.entries(TEXTOS_INICIAIS).map(([id, t]) => ({ id, assunto: t.assunto, corpo: t.corpo, cta: t.cta })),
    { onConflict: 'id', ignoreDuplicates: true },
  );
  const { data: textos } = await db.from('crm_campanhas').select('*');
  const campanhas = new Map((textos ?? []).map((c) => [c.id, c]));
  const aprovada = (id: string | undefined) => !!id && campanhas.get(id)?.estado === 'aprovada';

  const { data: zonas } = await db.from('crm_zonas').select('*').eq('ativa', true);
  const relatorio: Record<string, unknown>[] = [];

  for (const z of zonas ?? []) {
    const linha: Record<string, unknown> = { zona: z.concelho };

    // 1. Descoberta, semanal.
    if (!z.descoberta_em || Date.now() - new Date(z.descoberta_em).getTime() > SEMANA_MS) {
      const r = await procurarNoOsm(z.concelho);
      if (r.ok) {
        const g = await guardarCandidatos(db, z.id, r.candidatos);
        await db.from('crm_zonas').update({ descoberta_em: new Date().toISOString() }).eq('id', z.id);
        linha.descobertos = g.novos;
      } else linha.descoberta = r.erro;
    }

    // 2. Enriquecimento: o email geral, lido do website.
    const { data: porLer } = await db
      .from('crm_contactos')
      .select('id, website')
      .eq('zona_id', z.id)
      .is('email', null)
      .is('enriquecido_em', null)
      .not('website', 'is', null)
      .limit(POR_DIA_ENRIQUECER);
    let comEmail = 0;
    for (const c of porLer ?? []) {
      const email = c.website ? await emailDoWebsite(c.website) : null;
      const { error } = await db.from('crm_contactos').update({ email, enriquecido_em: new Date().toISOString() }).eq('id', c.id);
      // Um email já existente noutro contacto viola a unicidade: marca-se como lido sem email.
      if (error) await db.from('crm_contactos').update({ enriquecido_em: new Date().toISOString() }).eq('id', c.id);
      else if (email) comEmail++;
    }
    linha.emailsEncontrados = comEmail;

    // 3. Envios da campanha atual — só da que o promotor aprovou.
    const idx = z.campanha_atual - 1;
    const campanhaDe = (t: TipoContacto) => sequenciaDeCampanhas(t)[idx];
    const ids = [...new Set(TIPOS.flatMap((t) => (campanhaDe(t) ? [campanhaDe(t)!] : [])))];
    linha.aguardaAprovacao = ids.filter((id) => !aprovada(id));

    const { data: contactos } = await db
      .from('crm_contactos')
      .select('id, tipo, nome, email, codigo, pessoa_coletiva, desistiu_em, estado')
      .eq('zona_id', z.id);
    const contactoIds = (contactos ?? []).map((c) => c.id);
    const lerEnvios = async () =>
      contactoIds.length
        ? ((await db.from('crm_envios').select('id, contacto_id, campanha_id, estado').in('contacto_id', contactoIds)).data ?? [])
        : [];
    let envios = await lerEnvios();
    const jaTem = new Set(envios.map((e) => `${e.contacto_id}|${e.campanha_id}`));
    const elegiveis = (contactos ?? []).filter(
      (c) => c.email && c.pessoa_coletiva && !c.desistiu_em && c.estado !== 'desistiu' && campanhaDe(c.tipo as TipoContacto),
    );
    const porCriar = elegiveis.filter((c) => !jaTem.has(`${c.id}|${campanhaDe(c.tipo as TipoContacto)}`));
    const aCriar = porCriar
      .filter((c) => aprovada(campanhaDe(c.tipo as TipoContacto)))
      .slice(0, POR_DIA_ENVIAR)
      .map((c) => ({ contacto_id: c.id, campanha_id: campanhaDe(c.tipo as TipoContacto)!, estado: 'aprovado' }));
    if (aCriar.length > 0) {
      const { error } = await db.from('crm_envios').insert(aCriar);
      linha.criados = error ? `erro: ${error.message}` : aCriar.length;
      envios = await lerEnvios();
    }

    // 4. Envio. Cada envio volta a conferir, na base, a campanha e o contacto (gatilho).
    const porContacto = new Map((contactos ?? []).map((c) => [c.id, c]));
    let enviados = 0;
    let semConfig = false;
    for (const e of envios.filter((x) => x.estado === 'aprovado').slice(0, POR_DIA_ENVIAR)) {
      const camp = campanhas.get(e.campanha_id);
      const c = porContacto.get(e.contacto_id);
      if (!camp || camp.estado !== 'aprovada' || !c?.email) continue;
      const r = await enviarEmailCrm(c.email, renderizarEmail(e.campanha_id, camp, { nome: c.nome, codigo: c.codigo }));
      if (r === 'nao_configurado') {
        semConfig = true;
        break;
      }
      const { error } = await db
        .from('crm_envios')
        .update({ estado: r === 'enviado' ? 'enviado' : 'falhou', enviado_em: r === 'enviado' ? new Date().toISOString() : null })
        .eq('id', e.id);
      if (error) await db.from('crm_envios').update({ estado: 'rejeitado' }).eq('id', e.id);
      else if (r === 'enviado') {
        enviados++;
        await db.from('crm_contactos').update({ estado: 'contactado' }).eq('id', c.id).eq('estado', 'novo');
      }
    }
    linha.enviados = enviados;
    if (semConfig) linha.envio = 'CRM_REMETENTE ou RESEND_API_KEY em falta: nada enviado';

    // 5. Decisão sobre a campanha da zona (só com envios feitos).
    envios = await lerEnvios();
    const daCampanha = envios.filter((e) => ids.includes(e.campanha_id));
    const feitos = daCampanha.filter((e) => e.estado === 'enviado');
    if (feitos.length > 0) {
      const { data: eventos } = await db.from('crm_eventos').select('contacto_id, tipo').in('contacto_id', contactoIds);
      const dos = new Set(feitos.map((e) => e.contacto_id));
      const ev = (eventos ?? []).filter((e) => dos.has(e.contacto_id));
      const r: Resultados = {
        enviados: feitos.length,
        agiram: new Set(ev.filter((e) => e.tipo !== 'desistencia').map((e) => e.contacto_id)).size,
        respostas: ev.filter((e) => e.tipo === 'resposta').length,
        adesoes: ev.filter((e) => e.tipo === 'adesao').length,
        desistencias: ev.filter((e) => e.tipo === 'desistencia').length,
      };
      const restantes = porCriar.length + daCampanha.filter((e) => e.estado === 'aprovado').length;
      const d = decidirCampanha(r, restantes);
      linha.decisao = d.acao;
      if (d.acao === 'parar') await db.from('crm_zonas').update({ ativa: false }).eq('id', z.id);
      if (d.acao === 'avancar' && campanhaSeguinte(sequenciaDeCampanhas('pintor'), sequenciaDeCampanhas('pintor')[idx] ?? '')) {
        await db.from('crm_zonas').update({ campanha_atual: z.campanha_atual + 1 }).eq('id', z.id);
      }
    }
    relatorio.push(linha);
  }
  return Response.json({ zonas: relatorio });
}
