import 'server-only';
import { VERSAO_AUTODECLARACAO_DO_AVALIADOR } from '@/domain/avaliador';
import {
  REGRAS_DA_CONVOCATORIA,
  anel,
  descricaoDoConvite,
  motivosDeInelegibilidade,
  onda,
  proximoPasso,
  type Candidato,
  type FichaDoAvaliador,
} from '@/domain/convocatoria';
import { DESEMPENHO_INICIAL } from '@/domain/avaliador';
import { WORK_TYPE_LABELS, type WorkType } from '@/domain/request';
import { referenciaDoLevantamento } from '@/domain/referencias';
import { CURRENT_SURVEY_TERMS_VERSION } from '@/domain/surveyTerms';
import { configuracaoWhatsApp, modeloDoConvite, payloadDoConvite } from '@/domain/whatsapp';
import { cobre, zonaEfetiva, type Cobertura } from '@/domain/coberturaDaEmpresa';
import { CENTROS_DOS_CONCELHOS } from '@/lib/centrosDosConcelhos';
import { sendEmail } from '@/lib/notify';
import { adminClient } from '@/lib/supabase/admin';
import { enviarModelo } from '@/lib/whatsapp';

/**
 * Avança as convocatórias: para cada levantamento aberto decide, pelas regras de
 * `src/domain/convocatoria.ts`, se espera, se lança a onda seguinte, ou se se esgotou — e faz isso.
 *
 * Chamada pela base de dados ao minuto (`private.pedir_convocatorias`, só em horário útil e só quando há
 * trabalho). Corre com a chave de serviço porque junta dados de muitas pessoas que nenhuma sessão pode ver
 * de uma vez; nada daqui sai para o navegador.
 *
 * Duas chamadas ao mesmo tempo não duplicam uma onda: (levantamento, número da onda) é único na base, e a
 * segunda inserção falha antes de enviar o que quer que seja.
 */

export type ResumoDasConvocatorias = { semCanal?: true; ondas: number; convites: number; falhas: number; esgotadas: number; semCandidatos: number };


export async function avancarConvocatorias(agora = new Date()): Promise<ResumoDasConvocatorias> {
  const resumo: ResumoDasConvocatorias = { ondas: 0, convites: 0, falhas: 0, esgotadas: 0, semCandidatos: 0 };
  const db = adminClient();
  const cfg = configuracaoWhatsApp(process.env);
  const modelo = modeloDoConvite(process.env);
  if (!db || !cfg) return { ...resumo, semCanal: true };

  // Levantamentos abertos, com o concelho e o tipo de obra (só isso: a morada nunca entra num convite).
  const { data: abertos } = await db
    .from('request_surveys')
    .select('id, request_id, numero')
    .eq('status', 'aberto')
    .is('convocatoria_esgotada_em', null);
  if (!abertos || abertos.length === 0) return resumo;

  const { data: pedidos } = await db.from('work_requests').select('id, building_id, tipo_obra').in('id', abertos.map((s) => s.request_id));
  const { data: predios } = await db.from('buildings').select('id, concelho').in('id', (pedidos ?? []).map((p) => p.building_id));
  const concelhoDoPredio = new Map((predios ?? []).map((b) => [b.id, b.concelho]));
  const pedidoDe = new Map((pedidos ?? []).map((p) => [p.id, { concelho: concelhoDoPredio.get(p.building_id) ?? '', tipo: p.tipo_obra as WorkType }]));

  const pessoas = await fichasDosAvaliadores(db);
  // A zona da empresa (06/11/2026): só é convidado quem pertence a uma empresa que cobre o concelho da
  // obra — a mesma regra que a base aplica à reserva (`private.supplier_covers`). Sem isto, o convite
  // chegava e o «Aceito» era recusado.
  const coberturas = await coberturasDasEmpresas(db, [...new Set(pessoas.map((p) => p.ficha.orgId))]);

  for (const s of abertos) {
    const pedido = pedidoDe.get(s.request_id);
    if (!pedido || !CENTROS_DOS_CONCELHOS[pedido.concelho]) continue;

    const [{ data: ondas }, { data: convidados }, { data: perdidas }] = await Promise.all([
      db.from('survey_waves').select('numero, enviada_em').eq('survey_id', s.id).order('numero'),
      db.from('survey_invites').select('user_id').eq('survey_id', s.id),
      db.from('survey_attempts').select('vendedor_org_id').eq('survey_id', s.id).eq('estado', 'libertada'),
    ]);
    const jaConvidados = new Set((convidados ?? []).map((c) => c.user_id));
    const orgsExcluidas = new Set((perdidas ?? []).map((p) => p.vendedor_org_id));

    const candidatos: (Candidato & { orgId: string; telemovel: string })[] = [];
    for (const p of pessoas) {
      if (jaConvidados.has(p.ficha.userId) || orgsExcluidas.has(p.ficha.orgId)) continue;
      if (!cobre(coberturas.get(p.ficha.orgId), pedido.concelho)) continue; // já é a zona efetiva
      const a = anel(pedido.concelho, p.ficha.concelhoBase!, p.ficha.raioKm!, CENTROS_DOS_CONCELHOS);
      if (a == null) continue;
      candidatos.push({ ...p.candidato, anel: a, orgId: p.ficha.orgId, telemovel: p.telemovel });
    }

    const feitas = ondas ?? [];
    const ultima = feitas.length ? new Date(feitas[feitas.length - 1]!.enviada_em) : null;
    const seguinte = onda(feitas.length + 1, candidatos, agora);
    const passo = proximoPasso(feitas.length, ultima, agora, seguinte.length > 0);

    if (passo.tipo === 'esgotada') {
      await db.from('request_surveys').update({ convocatoria_esgotada_em: agora.toISOString() }).eq('id', s.id).is('convocatoria_esgotada_em', null);
      await avisarEquipa(db, `${referenciaDoLevantamento(s.numero)} · ${pedido.concelho}`, feitas.length);
      resumo.esgotadas++;
      continue;
    }
    if (passo.tipo === 'sem_candidatos') {
      // Avisa a equipa uma vez (para recrutar na zona) e continua à espera: o primeiro avaliador que se
      // configurar aqui recebe o convite na passagem seguinte.
      const { data: marcado } = await db
        .from('request_surveys')
        .update({ convocatoria_sem_candidatos_em: agora.toISOString() })
        .eq('id', s.id)
        .is('convocatoria_sem_candidatos_em', null)
        .select('id');
      if (marcado && marcado.length > 0) await avisarEquipa(db, `${referenciaDoLevantamento(s.numero)} · ${pedido.concelho}`, 0);
      resumo.semCandidatos++;
      continue;
    }
    if (passo.tipo !== 'nova_onda') continue;

    const { data: w, error } = await db
      .from('survey_waves')
      .insert({ survey_id: s.id, numero: passo.numero, versao_regras: REGRAS_DA_CONVOCATORIA.versao })
      .select('id')
      .single();
    if (error || !w) continue; // outra chamada já lançou esta onda
    resumo.ondas++;

    // Quem não respondeu à onda anterior deixa de estar «à espera»; se ainda carregar em «Aceito» e a vaga
    // estiver livre, fica com ela na mesma — `aceitar_convite` aceita convites expirados.
    await db.from('survey_invites').update({ estado: 'expirado' }).eq('survey_id', s.id).eq('estado', 'enviado');

    const variaveis = { '1': pedido.concelho, '2': descricaoDoConvite(WORK_TYPE_LABELS[pedido.tipo] ?? 'pintura', null) };
    for (const userId of seguinte) {
      const c = candidatos.find((x) => x.userId === userId)!;
      const { data: convite } = await db
        .from('survey_invites')
        .insert({ wave_id: w.id, survey_id: s.id, user_id: userId, org_id: c.orgId, telemovel: c.telemovel })
        .select('id')
        .single();
      if (!convite) continue;
      try {
        const sid = await enviarModelo(cfg, c.telemovel, modelo, [variaveis['1'], variaveis['2']], payloadDoConvite(convite.id));
        await db.from('survey_invites').update({ estado: 'enviado', twilio_sid: sid || null, enviado_em: new Date().toISOString() }).eq('id', convite.id);
        await db.from('whatsapp_messages').insert({
          direcao: 'saida', twilio_sid: sid || null, para: c.telemovel, de: cfg.numeroId, modelo, variaveis, invite_id: convite.id,
        });
        resumo.convites++;
      } catch (e) {
        await db.from('survey_invites').update({ estado: 'falhou', erro: String(e).slice(0, 500) }).eq('id', convite.id);
        resumo.falhas++;
      }
    }
  }
  return resumo;
}

type Admin = NonNullable<ReturnType<typeof adminClient>>;

/** A zona que vale para cada empresa: a escolhida ou, sem ela, o concelho da morada (`zonaEfetiva`). */
async function coberturasDasEmpresas(db: Admin, orgIds: string[]): Promise<Map<string, Cobertura | null>> {
  if (orgIds.length === 0) return new Map();
  const [{ data }, { data: empresas }] = await Promise.all([
    db.from('supplier_survey_coverage').select('org_id, concelhos, todo_o_pais').in('org_id', orgIds),
    db.from('organizations').select('id, concelho').in('id', orgIds),
  ]);
  const escolhida = new Map((data ?? []).map((c) => [c.org_id, { todoOPais: c.todo_o_pais, concelhos: c.concelhos }]));
  const morada = new Map((empresas ?? []).map((o) => [o.id, o.concelho]));
  return new Map(orgIds.map((id) => [id, zonaEfetiva(escolhida.get(id), morada.get(id)).cobertura]));
}

/** Quem pode ser convidado: só quem cumpre todas as condições, com o que a ordem das ondas precisa. */
async function fichasDosAvaliadores(db: Admin): Promise<{ ficha: FichaDoAvaliador; candidato: Omit<Candidato, 'anel'>; telemovel: string }[]> {
  const { data: disp } = await db
    .from('survey_availability')
    .select('user_id, suspenso_ate, alerta_whatsapp, telemovel_whatsapp, concelho_base, raio_km')
    .eq('alerta_whatsapp', true)
    .not('telemovel_whatsapp', 'is', null)
    .not('concelho_base', 'is', null)
    .not('raio_km', 'is', null);
  const ids = (disp ?? []).map((d) => d.user_id);
  if (ids.length === 0) return [];

  const [{ data: membros }, { data: perfis }, { data: termos }, { data: tentativas }, { data: notas }] = await Promise.all([
    db.from('org_members').select('org_id, user_id, role').in('user_id', ids).in('role', ['proprietario', 'gestor', 'vendedor']),
    db.from('profiles').select('user_id, nome').in('user_id', ids),
    db.from('survey_terms_acceptances').select('user_id, version, accepted_at').in('user_id', ids).in('version', [VERSAO_AUTODECLARACAO_DO_AVALIADOR, CURRENT_SURVEY_TERMS_VERSION]),
    db.from('survey_attempts').select('vendedor_user_id, estado, aceita_em, fecho_em').in('vendedor_user_id', ids),
    db.from('survey_reviews').select('vendedor_user_id, nota').in('vendedor_user_id', ids),
  ]);
  const { data: empresas } = await db.from('organizations').select('id, kind, nif').in('id', [...new Set((membros ?? []).map((m) => m.org_id))]);
  const fornecedor = new Map((empresas ?? []).filter((o) => o.kind === 'fornecedor').map((o) => [o.id, o.nif]));
  const zonasDasEmpresas = await coberturasDasEmpresas(db, [...fornecedor.keys()]);
  const zonasEscolhidas = new Set([...zonasDasEmpresas].filter(([, z]) => z !== null).map(([id]) => id));
  const hoje = new Date().toISOString().slice(0, 10);

  const out: { ficha: FichaDoAvaliador; candidato: Omit<Candidato, 'anel'>; telemovel: string }[] = [];
  for (const d of disp ?? []) {
    const membro = (membros ?? []).find((m) => m.user_id === d.user_id && fornecedor.has(m.org_id));
    if (!membro) continue;
    const meus = (termos ?? []).filter((t) => t.user_id === d.user_id);
    const inscricao = meus.find((t) => t.version === VERSAO_AUTODECLARACAO_DO_AVALIADOR);
    const minhas = (tentativas ?? []).filter((t) => t.vendedor_user_id === d.user_id);
    const minhasNotas = (notas ?? []).filter((n) => n.vendedor_user_id === d.user_id).map((n) => n.nota);
    const media = minhasNotas.length ? minhasNotas.reduce((a, b) => a + b, 0) / minhasNotas.length : null;
    const maxData = (xs: (string | null)[]) => xs.filter((x): x is string => !!x).sort().at(-1) ?? null;

    const ficha: FichaDoAvaliador = {
      userId: d.user_id,
      orgId: membro.org_id,
      nipcDaEmpresa: fornecedor.get(membro.org_id) ?? null,
      inscrito: !!inscricao,
      confidencialidade: meus.some((t) => t.version === CURRENT_SURVEY_TERMS_VERSION),
      nomeCompleto: (perfis ?? []).find((p) => p.user_id === d.user_id)?.nome ?? null,
      whatsapp: !!d.alerta_whatsapp && !!d.telemovel_whatsapp,
      concelhoBase: d.concelho_base,
      raioKm: d.raio_km,
      // Aqui só conta se a empresa tem uma zona (escolhida ou a da morada); se cobre o concelho de cada obra
      // vê-se em cada passagem.
      zonasDaEmpresa: zonasEscolhidas.has(membro.org_id),
      suspenso: !!d.suspenso_ate && d.suspenso_ate >= hoje,
      emCurso: minhas.filter((t) => t.estado === 'ativa').length,
    };
    if (motivosDeInelegibilidade(ficha).length > 0) continue;

    const ultimaAtribuicao = maxData(minhas.map((t) => t.aceita_em));
    const ultimoIncumprimento = maxData(minhas.filter((t) => t.estado === 'libertada').map((t) => t.fecho_em));
    out.push({
      ficha,
      telemovel: d.telemovel_whatsapp!,
      candidato: {
        userId: d.user_id,
        avaliacoes: minhasNotas.length,
        media,
        desempenho: { ...DESEMPENHO_INICIAL, qualificacaoGeral: media },
        inscritoEm: new Date(inscricao!.accepted_at),
        ultimaAtribuicao: ultimaAtribuicao ? new Date(ultimaAtribuicao) : null,
        ultimoIncumprimento: ultimoIncumprimento ? new Date(ultimoIncumprimento) : null,
      },
    });
  }
  return out;
}

/** A convocatória esgotou-se: email à equipa da plataforma (`platform_admins`, sem ecrã, de propósito). */
async function avisarEquipa(db: Admin, levantamento: string, ondas: number): Promise<void> {
  const { data: admins } = await db.from('platform_admins').select('user_id');
  const emails = await Promise.all((admins ?? []).map(async (a) => (await db.auth.admin.getUserById(a.user_id)).data.user?.email ?? null));
  const para = [...new Set(emails.filter((e): e is string => !!e))];
  if (para.length === 0) return;
  await sendEmail(
    para,
    `Levantamento sem avaliador: ${levantamento}`,
    [
      ondas === 0
        ? `O levantamento ${levantamento} está aberto e não há nenhum avaliador elegível dentro do raio. Fica à espera: o primeiro que se configurar na zona recebe o convite.`
        : `O levantamento ${levantamento} passou por ${ondas} ${ondas === 1 ? 'onda' : 'ondas'} de convites sem ninguém aceitar.`,
      'O cliente continua a poder preencher o levantamento sozinho. Vale a pena procurar avaliadores nesta zona.',
    ],
    '/app/backoffice',
  ).catch(() => undefined);
}
