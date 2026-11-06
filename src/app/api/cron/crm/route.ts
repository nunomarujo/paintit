import { FLYERS } from '@/domain/campanhas';
import { campanhaSeguinte, decidirCampanha, sequenciaDeCampanhas, type Resultados, type TipoContacto } from '@/domain/crm';
import { emailDoWebsite } from '@/lib/crmEnriquecimento';
import { procurarNoOsm } from '@/lib/crmDescoberta';
import { guardarCandidatos } from '@/lib/crmServico';
import { adminClient } from '@/lib/supabase/admin';

/**
 * A tarefa diária do CRM (06/11/2026). Por cada zona ativa: (1) procura empresas no OpenStreetMap, uma vez por
 * semana; (2) lê os websites sem email, no máximo 15 por dia; (3) PROPÕE o envio da campanha da zona aos
 * contactos elegíveis, no máximo 20 por dia; (4) decide se a campanha avança ou pára. **Não envia nada:** os
 * envios ficam `proposto` à espera de aprovação por uma pessoa. A Vercel envia "Authorization: Bearer CRON_SECRET".
 */
const POR_DIA_ENRIQUECER = 15;
const POR_DIA_PROPOR = 20;
const SEMANA_MS = 7 * 24 * 3600 * 1000;
const TIPOS: TipoContacto[] = ['pintor', 'fornecedor', 'administradora'];

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) return new Response('Não autorizado', { status: 401 });
  const db = adminClient();
  if (!db) return new Response('Não configurado', { status: 503 });

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
      const { error } = await db
        .from('crm_contactos')
        .update({ email, enriquecido_em: new Date().toISOString() })
        .eq('id', c.id);
      // Um email já existente noutro contacto viola a unicidade: marca-se como lido sem email.
      if (error) await db.from('crm_contactos').update({ enriquecido_em: new Date().toISOString() }).eq('id', c.id);
      else if (email) comEmail++;
    }
    linha.emailsEncontrados = comEmail;

    // 3. Propostas de envio da campanha atual da zona.
    const idx = z.campanha_atual - 1;
    const campanhaDe = (t: TipoContacto) => sequenciaDeCampanhas(t)[idx];
    const ids = [...new Set(TIPOS.flatMap((t) => (campanhaDe(t) ? [campanhaDe(t)!] : [])))];
    const { data: contactos } = await db
      .from('crm_contactos')
      .select('id, tipo, email, pessoa_coletiva, desistiu_em, estado')
      .eq('zona_id', z.id);
    const contactoIds = (contactos ?? []).map((c) => c.id);
    const { data: envios } = contactoIds.length
      ? await db.from('crm_envios').select('id, contacto_id, campanha_id, estado').in('contacto_id', contactoIds)
      : { data: [] };
    const jaTem = new Set((envios ?? []).map((e) => `${e.contacto_id}|${e.campanha_id}`));
    const elegiveis = (contactos ?? []).filter(
      (c) => c.email && c.pessoa_coletiva && !c.desistiu_em && c.estado !== 'desistiu' && campanhaDe(c.tipo as TipoContacto),
    );
    const porPropor = elegiveis.filter((c) => !jaTem.has(`${c.id}|${campanhaDe(c.tipo as TipoContacto)}`));
    const propostas = porPropor.slice(0, POR_DIA_PROPOR).map((c) => ({ contacto_id: c.id, campanha_id: campanhaDe(c.tipo as TipoContacto)! }));
    if (propostas.length > 0) {
      const { error } = await db.from('crm_envios').insert(propostas);
      linha.propostos = error ? `erro: ${error.message}` : propostas.length;
    }

    // 4. Decisão sobre a campanha da zona (só com envios feitos).
    const daCampanha = (envios ?? []).filter((e) => ids.includes(e.campanha_id));
    const enviados = daCampanha.filter((e) => e.estado === 'enviado');
    if (enviados.length > 0) {
      const { data: eventos } = await db.from('crm_eventos').select('contacto_id, tipo').in('contacto_id', contactoIds);
      const dos = new Set(enviados.map((e) => e.contacto_id));
      const ev = (eventos ?? []).filter((e) => dos.has(e.contacto_id));
      const r: Resultados = {
        enviados: enviados.length,
        agiram: new Set(ev.filter((e) => e.tipo !== 'desistencia').map((e) => e.contacto_id)).size,
        respostas: ev.filter((e) => e.tipo === 'resposta').length,
        adesoes: ev.filter((e) => e.tipo === 'adesao').length,
        desistencias: ev.filter((e) => e.tipo === 'desistencia').length,
      };
      const restantes = porPropor.length + daCampanha.filter((e) => e.estado === 'proposto' || e.estado === 'aprovado').length;
      const d = decidirCampanha(r, restantes);
      linha.decisao = d.acao;
      if (d.acao === 'parar') await db.from('crm_zonas').update({ ativa: false }).eq('id', z.id);
      if (d.acao === 'avancar' && campanhaSeguinte(sequenciaDeCampanhas('pintor'), sequenciaDeCampanhas('pintor')[idx] ?? '')) {
        await db.from('crm_zonas').update({ campanha_atual: z.campanha_atual + 1 }).eq('id', z.id);
      }
    }
    relatorio.push(linha);
  }
  return Response.json({ zonas: relatorio, campanhas: FLYERS.length });
}
