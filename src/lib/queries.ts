import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { ObraConcluida } from '@/domain/margin';
import { isPlanoPintor, subscriberDiscountBp, type SubscricaoPintor } from '@/domain/painterPlan';
import { orcamentosPorEnviar } from '@/domain/quoteBoard';
import { custoDasHoras, custoHoraEm } from '@/domain/overtime';
import { margemDaObra } from '@/domain/margin';
import { formatEuros, type Cents } from '@/domain/money';
import { summarize } from '@/domain/worksite';
import type { Database } from '@/lib/database.types';
import type { IsoDate } from '@/domain/deadline';
import { combinedPainterDiscountBp, linkedSupplierDiscountBp } from '@/domain/referral';
import { countEligibleReferrals, referralDiscountBp, type ReferredSupplier } from '@/domain/referralEligibility';

/** Administradoras em que o utilizador é proprietário ou gestor (para gerir condomínios). */
export async function managedAdministradoras(supabase: SupabaseClient<Database>, userId: string) {
  const { data } = await supabase
    .from('org_members')
    .select('role, organizations!inner(id, nome, kind)')
    .eq('user_id', userId)
    .in('role', ['proprietario', 'gestor'])
    .eq('organizations.kind', 'administradora');
  return (data ?? []).map((m) => ({ id: m.organizations.id, nome: m.organizations.nome }));
}

/** Entidades de pintura de que o utilizador é membro, com o papel e as zonas de serviço. */
export async function painterOrgs(supabase: SupabaseClient<Database>, userId: string) {
  const { data } = await supabase
    .from('org_members')
    .select('role, organizations!inner(id, nome, kind, zonas_servico)')
    .eq('user_id', userId)
    .eq('organizations.kind', 'pintor');
  return (data ?? []).map((m) => ({
    id: m.organizations.id,
    nome: m.organizations.nome,
    zonas: m.organizations.zonas_servico,
    manager: m.role === 'proprietario' || m.role === 'gestor',
  }));
}

/** Códigos de adesão ligados e ativos a este pintor, com o nome do fornecedor — para escolher, por proposta,
 * qual fica associado a essa obra (o desconto do pintor já conta todos, ver `painterDiscountBp`). */
export async function linkedSupplierCodes(supabase: SupabaseClient<Database>, painterOrgId: string) {
  const { data: codes } = await supabase.from('referral_codes').select('id, code, supplier_org_id').eq('painter_org_id', painterOrgId).eq('active', true);
  const ids = (codes ?? []).map((c) => c.supplier_org_id);
  const { data: suppliers } = ids.length ? await supabase.from('organizations').select('id, nome').in('id', ids) : { data: [] };
  const nameOf = new Map((suppliers ?? []).map((s) => [s.id, s.nome]));
  return (codes ?? []).map((c) => ({ id: c.id, code: c.code, supplierOrgId: c.supplier_org_id, nome: nameOf.get(c.supplier_org_id) ?? 'Fornecedor' }));
}

export interface SupplierCustomer {
  id: string;
  nome: string;
  deliveredOrders: number;
  premium: boolean;
  nota: string;
}

/** Pintores que já compraram a este fornecedor ("carteira de clientes"), com a contagem de encomendas
 * entregues e a classificação/nota que o fornecedor lhes deu (supplier_customers) — para a página
 * /clientes e para escolher um cliente específico ao criar um desconto (src/domain/catalog.ts). */
export async function supplierCustomers(supabase: SupabaseClient<Database>, orgId: string): Promise<SupplierCustomer[]> {
  const [{ data: orders }, { data: profiles }] = await Promise.all([
    supabase.from('material_orders').select('painter_org_id, estado').eq('supplier_org_id', orgId),
    supabase.from('supplier_customers').select('painter_org_id, premium, nota').eq('org_id', orgId),
  ]);
  const ids = [...new Set((orders ?? []).map((o) => o.painter_org_id))];
  if (ids.length === 0) return [];
  const { data: orgs } = await supabase.from('organizations').select('id, nome').in('id', ids);
  const nameOf = new Map((orgs ?? []).map((o) => [o.id, o.nome]));
  const profileOf = new Map((profiles ?? []).map((p) => [p.painter_org_id, p]));
  return ids
    .map((id) => {
      const delivered = (orders ?? []).filter((o) => o.painter_org_id === id && o.estado === 'entregue').length;
      const profile = profileOf.get(id);
      return { id, nome: nameOf.get(id) ?? 'Pintor', deliveredOrders: delivered, premium: profile?.premium ?? false, nota: profile?.nota ?? '' };
    })
    .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-PT'));
}

export interface PainterDiscountBreakdown {
  linkedCount: number;
  linkedBp: number;
  eligibleCount: number;
  referralsBp: number;
  combinedBp: number;
  /** Desconto do plano Pro (5 p.p.), fora do teto conjunto dos outros dois — soma-se por cima deles. */
  subscriberBp: number;
  /** Desconto total a aplicar à comissão: o teto conjunto dos dois primeiros mais o de subscritor. */
  totalBp: number;
  subscricao: SubscricaoPintor | null;
}

/** O desconto do pintor em vigor agora: códigos de adesão ligados (ambiente, qualquer que seja o marcado nesta
 * proposta) somado às referências de fornecedores elegíveis, com o teto conjunto. Devolve os dois lados em
 * separado, para quem quiser mostrar o detalhe (ex.: a pré-visualização da comissão). */
export async function painterDiscountBreakdown(supabase: SupabaseClient<Database>, painterOrgId: string): Promise<PainterDiscountBreakdown> {
  const { data: codes } = await supabase.from('referral_codes').select('supplier_org_id').eq('painter_org_id', painterOrgId).eq('active', true);
  const linkedCount = new Set((codes ?? []).map((c) => c.supplier_org_id)).size;
  const linkedBp = linkedSupplierDiscountBp(linkedCount);

  const { data: invites } = await supabase
    .from('supplier_referral_invites')
    .select('nif, convite_confirmado_em, adesao_elegivel_em')
    .eq('painter_org_id', painterOrgId);
  const referred: ReferredSupplier[] = (invites ?? []).map((i) => ({
    nif: i.nif ?? '',
    conviteConfirmadoEm: (i.convite_confirmado_em?.slice(0, 10) as IsoDate | undefined) ?? null,
    adesaoElegivelEm: (i.adesao_elegivel_em as IsoDate | null) ?? null,
  }));
  const today = new Date().toISOString().slice(0, 10) as IsoDate;
  const eligibleCount = countEligibleReferrals(referred, today);
  const referralsBp = referralDiscountBp(eligibleCount);

  const combinedBp = combinedPainterDiscountBp(linkedBp, referralsBp);

  // O desconto de subscritor é independente: não entra no teto conjunto dos dois de fornecedores,
  // soma-se por cima deles, e é o piso da versão das regras que impede o conjunto de ir longe demais.
  const subscricao = await painterSubscription(supabase, painterOrgId);
  const subscriberBp = subscriberDiscountBp(subscricao, today);

  return { linkedCount, linkedBp, eligibleCount, referralsBp, combinedBp, subscriberBp, totalBp: combinedBp + subscriberBp, subscricao };
}

/** A subscrição em vigor de uma empresa de pintura, ou null se estiver no plano gratuito. */
export async function painterSubscription(supabase: SupabaseClient<Database>, painterOrgId: string): Promise<SubscricaoPintor | null> {
  const { data } = await supabase
    .from('org_subscriptions')
    .select('plano, estado, periodicidade, valida_ate, preco_cents')
    .eq('org_id', painterOrgId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!data || !isPlanoPintor(data.plano)) return null;
  return {
    plano: data.plano,
    estado: data.estado as SubscricaoPintor['estado'],
    periodicidade: data.periodicidade as SubscricaoPintor['periodicidade'],
    validaAte: data.valida_ate,
    precoCents: data.preco_cents ?? undefined,
  };
}

/**
 * As obras concluídas da empresa, com o que custaram de facto — para comparar o preço que vai cobrar
 * com o que as obras dela têm custado (src/domain/margin.ts).
 *
 * Só obras concluídas: uma obra a meio tem os custos por lançar e mentiria para baixo.
 */
export async function painterWorkHistory(supabase: SupabaseClient<Database>, orgId: string): Promise<ObraConcluida[]> {
  const { data: obras } = await supabase
    .from('worksites')
    .select('id, nome, valor_cents, area_cm2, fim')
    .eq('org_id', orgId)
    .eq('estado', 'concluida');
  if (!obras || obras.length === 0) return [];

  const ids = obras.map((o) => o.id);
  const [{ data: lancamentos }, { data: membros }] = await Promise.all([
    supabase.from('worksite_entries').select('worksite_id, tipo, valor_cents, horas, member_id, data, tipo_dia').in('worksite_id', ids),
    supabase.from('worksite_members').select('id, custo_hora_cents').in('worksite_id', ids),
  ]);
  const custoHora = new Map((membros ?? []).map((m) => [m.id, m.custo_hora_cents]));

  return obras.map((o) => {
    const meus = (lancamentos ?? []).filter((l) => l.worksite_id === o.id);
    const custosDiretos = meus.filter((l) => l.tipo === 'custo').reduce((n, l) => n + (l.valor_cents ?? 0), 0);
    const horasLinhas = meus
      .filter((l) => l.tipo === 'horas')
      .sort((a, b) => a.data.localeCompare(b.data))
      .map((l) => ({
        horas: l.horas ?? 0,
        custoHora: custoHora.get(l.member_id ?? '') ?? null,
        memberId: l.member_id,
        data: l.data,
        tipoDia: l.tipo_dia,
      }));
    const resumo = summarize({ contrato: o.valor_cents ?? 0, tranches: [], costs: [], hours: horasLinhas, today: o.fim ?? new Date().toISOString().slice(0, 10) });
    return {
      id: o.id,
      nome: o.nome,
      valorCents: o.valor_cents ?? 0,
      areaCm2: o.area_cm2,
      custosDiretos,
      maoDeObra: resumo.maoDeObra,
      horas: resumo.horas,
      fim: o.fim,
    };
  });
}

/**
 * Quantos orçamentos estão feitos e nunca foram enviados, pela mesma regra do ecrã.
 *
 * Serve o aviso na navegação, que tem de concordar com o da página: dois números diferentes para a
 * mesma coisa são pior do que não haver número nenhum. Só lê rascunhos, que são poucos.
 */
export async function contarOrcamentosPorEnviar(supabase: SupabaseClient<Database>, orgId: string): Promise<number> {
  const { data: rascunhos } = await supabase
    .from('painter_quotes')
    .select('id, created_at, estado')
    .eq('org_id', orgId)
    .eq('estado', 'rascunho');
  if (!rascunhos || rascunhos.length === 0) return 0;

  const { data: linhas } = await supabase
    .from('painter_quote_lines')
    .select('quote_id, quantidade, preco_unitario, inclusao')
    .in('quote_id', rascunhos.map((q) => q.id));

  const doPainel = rascunhos.map((q) => {
    const minhas = (linhas ?? []).filter((l) => l.quote_id === q.id);
    return {
      id: q.id,
      estado: 'rascunho' as const,
      criadoEm: q.created_at,
      linhas: minhas.length,
      totalCents: minhas
        .filter((l) => l.inclusao === 'incluido')
        .reduce((n, l) => n + Math.round((l.quantidade * l.preco_unitario) / 100), 0),
    };
  });
  return orcamentosPorEnviar(doPainel, new Date().toISOString().slice(0, 10)).length;
}

export interface PessoaNoDia {
  id: string;
  nome: string;
  funcao: string;
  /** Obras onde está atribuída, com as horas registadas hoje em cada uma. */
  obras: { nome: string; horasHoje: number }[];
  horasNaSemana: number;
}

/**
 * As pessoas da empresa, onde estão e quanto fizeram.
 *
 * Nota do desenho, que a proposta de Gestão de Obra sublinha e vale a pena respeitar: **sem obra
 * atribuída não quer dizer disponível, ausente ou de folga**, e estar atribuída não prova presença.
 * O ecrã mostra o que foi registado, não onde a pessoa está.
 */
export async function equipaDaEmpresa(
  supabase: SupabaseClient<Database>,
  orgId: string,
  hoje: string,
): Promise<PessoaNoDia[]> {
  const seteDiasAntes = new Date(Date.parse(hoje) - 6 * 86_400_000).toISOString().slice(0, 10);
  const [{ data: pessoas }, { data: fichas }, { data: obras }, { data: horas }] = await Promise.all([
    supabase.from('painter_people').select('id, nome, funcao').eq('painter_org_id', orgId).eq('ativo', true).order('nome'),
    supabase.from('worksite_members').select('id, person_id, worksite_id').eq('painter_org_id', orgId).eq('ativo', true),
    supabase.from('worksites').select('id, nome').eq('org_id', orgId),
    supabase
      .from('worksite_entries')
      .select('member_id, worksite_id, horas, data')
      .eq('painter_org_id', orgId)
      .eq('tipo', 'horas')
      .gte('data', seteDiasAntes)
      .lte('data', hoje),
  ]);

  const nomeDaObra = new Map((obras ?? []).map((o) => [o.id, o.nome]));
  const pessoaDaFicha = new Map((fichas ?? []).map((f) => [f.id, f.person_id]));

  return (pessoas ?? []).map((p) => {
    const minhasFichas = (fichas ?? []).filter((f) => f.person_id === p.id);
    const minhasHoras = (horas ?? []).filter((h) => h.member_id && pessoaDaFicha.get(h.member_id) === p.id);
    return {
      id: p.id,
      nome: p.nome,
      funcao: p.funcao,
      obras: minhasFichas.map((f) => ({
        nome: nomeDaObra.get(f.worksite_id) ?? 'Obra sem nome',
        horasHoje: minhasHoras
          .filter((h) => h.worksite_id === f.worksite_id && h.data === hoje)
          .reduce((n, h) => n + (h.horas ?? 0), 0),
      })),
      horasNaSemana: minhasHoras.reduce((n, h) => n + (h.horas ?? 0), 0),
    };
  });
}

export interface ContaDaObra {
  id: string;
  nome: string;
  estado: string;
  contrato: Cents;
  custos: Cents;
  margem: Cents;
  /** Sem horas registadas, a margem é uma conta a meio e diz-se que é. */
  fiavel: boolean;
  /** Tranches já recebidas do cliente. */
  recebido: Cents;
  /** O que falta receber: contratado menos recebido, nunca abaixo de zero. */
  porReceber: Cents;
  /** Trabalhos a mais aceites, já dentro do contratado, e os que ainda esperam resposta. */
  adendasAceites: Cents;
  adendasPendentes: Cents;
}

/** As contas de cada obra, com a mão de obra calculada sobre todas as obras (overtime.ts). */
export async function contasDasObras(supabase: SupabaseClient<Database>, orgId: string): Promise<ContaDaObra[]> {
  const [{ data: obras }, { data: lancamentos }, { data: fichas }, { data: custosHora }, { data: adendas }] = await Promise.all([
    supabase.from('worksites').select('id, nome, estado, valor_cents').eq('org_id', orgId).order('created_at', { ascending: false }),
    supabase.from('worksite_entries').select('worksite_id, tipo, valor_cents, horas, member_id, data, tipo_dia, id, recebida_em').eq('painter_org_id', orgId),
    supabase.from('worksite_members').select('id, person_id').eq('painter_org_id', orgId),
    supabase.from('painter_person_rates').select('person_id, desde, custo_hora_cents, painter_people!inner(painter_org_id)').eq('painter_people.painter_org_id', orgId),
    supabase.from('worksite_addenda').select('worksite_id, estado, valor_cents').eq('painter_org_id', orgId),
  ]);

  const pessoaDaFicha = new Map((fichas ?? []).map((f) => [f.id, f.person_id]));
  const tabelaDe = new Map<string, { desde: string; custoHoraCents: Cents }[]>();
  for (const r of custosHora ?? []) {
    const lista = tabelaDe.get(r.person_id) ?? [];
    lista.push({ desde: r.desde, custoHoraCents: r.custo_hora_cents });
    tabelaDe.set(r.person_id, lista);
  }

  const horas = (lancamentos ?? []).filter((x) => x.tipo === 'horas');
  const custoPorLinha = custoDasHoras(
    horas.map((x) => {
      const pessoa = x.member_id ? (pessoaDaFicha.get(x.member_id) ?? null) : null;
      return {
        id: x.id,
        horas: x.horas ?? 0,
        custoHora: pessoa ? custoHoraEm(tabelaDe.get(pessoa) ?? [], x.data) : null,
        pessoaId: pessoa,
        data: x.data,
        tipoDia: x.tipo_dia,
      };
    }),
  );

  return (obras ?? []).map((o) => {
    const minhas = (lancamentos ?? []).filter((x) => x.worksite_id === o.id);
    const custosDiretos = minhas.filter((x) => x.tipo === 'custo').reduce((n, x) => n + (x.valor_cents ?? 0), 0);
    const minhasHoras = minhas.filter((x) => x.tipo === 'horas');
    const maoDeObra = minhasHoras.reduce((n, x) => n + (custoPorLinha.get(x.id)?.custoTotal ?? 0), 0);
    const m = margemDaObra({
      valorCents: o.valor_cents ?? 0,
      areaCm2: null,
      custosDiretos,
      maoDeObra,
      horas: minhasHoras.reduce((n, x) => n + (x.horas ?? 0), 0),
    });
    const recebido = minhas
      .filter((x) => x.tipo === 'tranche' && x.recebida_em !== null)
      .reduce((n, x) => n + (x.valor_cents ?? 0), 0);
    const minhasAdendas = (adendas ?? []).filter((a) => a.worksite_id === o.id);
    return {
      id: o.id,
      nome: o.nome,
      estado: o.estado,
      contrato: m.valor,
      custos: m.custo,
      margem: m.margem,
      fiavel: m.fiavel,
      recebido,
      porReceber: Math.max(0, m.valor - recebido),
      adendasAceites: minhasAdendas.filter((a) => a.estado === 'aceite').reduce((n, a) => n + (a.valor_cents ?? 0), 0),
      adendasPendentes: minhasAdendas.filter((a) => a.estado === 'proposta').reduce((n, a) => n + (a.valor_cents ?? 0), 0),
    };
  });
}

/** Uma pessoa no dia de uma obra: o que se mostra no cartão "Equipa hoje". */
export interface PresencaDoDia {
  memberId: string;
  nome: string;
  funcao: string | null;
  /** Horas já registadas hoje nesta obra, em centésimas. Zero quando ainda não se registou. */
  horasHoje: number;
  /** Horas da mesma pessoa noutras obras hoje — o aviso de colisão, antes de ela existir. */
  horasNoutras: { obra: string; horas: number }[];
  confirmado: boolean;
}

/** O que precisa de uma decisão: cada linha é uma coisa parada à espera de alguém. */
export interface AtencaoDaObra {
  tipo: 'adenda' | 'horas' | 'fase';
  titulo: string;
  detalhe: string;
  href: string;
}

export interface DiaDaObra {
  presencas: PresencaDoDia[];
  horasConfirmadas: number;
  horasPrevistas: number;
  atencao: AtencaoDaObra[];
  fases: { id: string; nome: string; estado: string | null; inicio: string | null; fim: string | null }[];
  registos: { id: string; quando: string; titulo: string; detalhe: string; tipo: string }[];
}

/**
 * O dia de uma obra: quem lá anda, o que está à espera de decisão, em que ponto vai e o que foi
 * registado por último.
 *
 * É a consulta do ecrã "Hoje", que é o ecrã que se abre todos os dias. Tudo o resto da gestão de obra
 * é ocasional; isto é diário, e por isso traz-se numa consulta só em vez de montar o ecrã a pedaços.
 */
export async function diaDaObra(
  supabase: SupabaseClient<Database>,
  worksiteId: string,
  orgId: string,
  hoje: string,
): Promise<DiaDaObra> {
  const [{ data: fichas }, { data: pessoas }, { data: entradasHoje }, { data: obras }, { data: fases }, { data: adendas }, { data: ultimas }] =
    await Promise.all([
      supabase.from('worksite_members').select('id, person_id, nome, funcao').eq('worksite_id', worksiteId).eq('ativo', true).order('nome'),
      supabase.from('painter_people').select('id, nome, funcao').eq('painter_org_id', orgId).eq('ativo', true),
      // Hoje em todas as obras da empresa: é assim que se vê que o João já tem 4 horas noutro lado.
      supabase.from('worksite_entries').select('member_id, worksite_id, horas').eq('painter_org_id', orgId).eq('tipo', 'horas').eq('data', hoje),
      supabase.from('worksites').select('id, nome').eq('org_id', orgId),
      supabase.from('worksite_phases').select('id, nome, estado, inicio, fim').eq('worksite_id', worksiteId).order('inicio', { nullsFirst: false }),
      supabase.from('worksite_addenda').select('id, descricao, valor_cents, estado').eq('worksite_id', worksiteId),
      supabase
        .from('worksite_entries')
        .select('id, tipo, data, descricao, horas, valor_cents, created_at')
        .eq('worksite_id', worksiteId)
        .order('created_at', { ascending: false })
        .limit(6),
    ]);

  const nomeDaObra = new Map((obras ?? []).map((o) => [o.id, o.nome]));
  const pessoaDe = new Map((pessoas ?? []).map((p) => [p.id, p]));
  const fichasDaPessoa = new Map<string, string[]>();
  for (const f of fichas ?? []) if (f.person_id) fichasDaPessoa.set(f.person_id, [...(fichasDaPessoa.get(f.person_id) ?? []), f.id]);

  const presencas: PresencaDoDia[] = (fichas ?? []).map((f) => {
    const p = f.person_id ? pessoaDe.get(f.person_id) : null;
    const minhasFichas = f.person_id ? (fichasDaPessoa.get(f.person_id) ?? [f.id]) : [f.id];
    const minhas = (entradasHoje ?? []).filter((e) => e.member_id && minhasFichas.includes(e.member_id));
    const aqui = minhas.filter((e) => e.worksite_id === worksiteId);
    return {
      memberId: f.id,
      nome: p?.nome ?? f.nome ?? 'Sem nome',
      funcao: p?.funcao ?? f.funcao,
      horasHoje: aqui.reduce((n, e) => n + (e.horas ?? 0), 0),
      horasNoutras: minhas
        .filter((e) => e.worksite_id !== worksiteId && (e.horas ?? 0) > 0)
        .map((e) => ({ obra: nomeDaObra.get(e.worksite_id) ?? 'Outra obra', horas: e.horas ?? 0 })),
      confirmado: aqui.length > 0,
    };
  });

  const atencao: AtencaoDaObra[] = [];
  for (const a of adendas ?? []) {
    // Um trabalho a mais sem preço é dinheiro que o pintor já gastou e ainda não pode cobrar: é o
    // primeiro item da lista porque é o que mais custa deixar parado.
    if (a.valor_cents === null)
      atencao.push({
        tipo: 'adenda',
        titulo: a.descricao || 'Trabalho a mais',
        detalhe: 'O cliente pediu mais trabalho. Falta definir o preço antes de enviar.',
        href: `/app/obras/${worksiteId}?s=adendas`,
      });
    else if (a.estado === 'proposta')
      atencao.push({
        tipo: 'adenda',
        titulo: a.descricao || 'Trabalho a mais',
        detalhe: 'A aguardar resposta do cliente. Ainda não entra no valor aprovado.',
        href: `/app/obras/${worksiteId}?s=adendas`,
      });
  }
  if (presencas.length > 0 && presencas.every((p) => !p.confirmado))
    atencao.push({
      tipo: 'horas',
      titulo: 'O dia de hoje ainda não foi registado',
      detalhe: `${presencas.length} ${presencas.length === 1 ? 'pessoa' : 'pessoas'} nesta obra, nenhuma hora confirmada.`,
      href: `/app/obras/${worksiteId}?s=dia`,
    });

  return {
    presencas,
    horasConfirmadas: presencas.reduce((n, p) => n + p.horasHoje, 0),
    horasPrevistas: presencas.length * 800,
    atencao,
    fases: fases ?? [],
    registos: (ultimas ?? []).map((e) => ({
      id: e.id,
      quando: e.data,
      tipo: e.tipo,
      titulo:
        e.tipo === 'horas'
          ? `${formatHorasBreve(e.horas ?? 0)} h registadas`
          : e.descricao || (e.tipo === 'custo' ? 'Despesa' : 'Registo'),
      detalhe: e.tipo === 'horas' ? (e.descricao ?? '') : e.valor_cents !== null ? formatEuros(e.valor_cents) : '',
    })),
  };
}

const formatHorasBreve = (centesimas: number) => (centesimas / 100).toLocaleString('pt-PT', { maximumFractionDigits: 1 });
