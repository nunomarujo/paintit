import { EQUIVALENT_RULE } from './equivalence';
import {
  carryToNext,
  clientDepositDue,
  clientSign,
  clientWithdraw,
  closeWithoutContract,
  confirmClientDeposit,
  createEngagement,
  EngagementError,
  expire,
  openDispute,
  painterFeeReceived,
  painterSign,
  resolveDispute,
  type DisputeOutcome,
  type Engagement,
  type EngagementStatus,
  type MovementKind,
  held,
} from './engagement';
import type { Cents } from './money';
import { applyPainterDiscount } from './referral';
import { RULES_BY_VERSION } from './rules';

// Persistência da contratação: a base de dados guarda só os acontecimentos
// (quem fez o quê e quando, com o montante confirmado pelo parceiro de
// pagamentos). O estado é sempre reconstruído aqui, a partir de engagement.ts,
// para que as regras de dinheiro existam num único sítio.

export const EVENT_KINDS = [
  'deposito_confirmado',
  'cliente_assinou',
  'fee_recebido',
  'pintor_assinou',
  'cliente_desistiu',
  'litigio_aberto',
  'litigio_resolvido',
  'transitar',
  'encerrar_sem_contrato',
] as const;
export type EventKind = (typeof EVENT_KINDS)[number];

export const EVENT_LABELS: Record<EventKind, string> = {
  deposito_confirmado: 'Depósito do cliente confirmado pelo parceiro de pagamentos',
  cliente_assinou: 'O cliente assinou a minuta',
  fee_recebido: 'Confirmação do pintor registada: as partes ficam a conhecer-se',
  pintor_assinou: 'O pintor assinou: contrato celebrado',
  cliente_desistiu: 'O cliente desistiu',
  litigio_aberto: 'Litígio aberto',
  litigio_resolvido: 'Litígio resolvido',
  transitar: 'Valores transitam para outra proposta',
  encerrar_sem_contrato: 'Encerrado sem contrato',
};

/** Quem pode registar cada acontecimento (a base de dados aplica a mesma regra). */
export const EVENT_ACTOR: Record<EventKind, 'cliente' | 'pintor' | 'plataforma' | 'partes'> = {
  deposito_confirmado: 'plataforma',
  cliente_assinou: 'cliente',
  fee_recebido: 'plataforma',
  pintor_assinou: 'pintor',
  cliente_desistiu: 'cliente',
  litigio_aberto: 'partes',
  litigio_resolvido: 'plataforma',
  transitar: 'cliente',
  encerrar_sem_contrato: 'cliente',
};

export interface EngagementEvent {
  id: string;
  kind: EventKind;
  amount: Cents | null;
  payload: {
    reason?: string;
    outcome?: DisputeOutcome;
    to?: string;
    documentHash?: string;
    /** Como assinou: PDF com Chave Móvel Digital/Cartão de Cidadão, ou aceitação simples (só em testes). */
    metodo?: 'cmd_pdf' | 'aceitacao';
    signatario?: string | null;
    identificacao?: string | null;
    /** O certificado encadeia numa entidade "Cartão de Cidadão" do Estado. */
    cadeiaConfiavel?: boolean;
  };
  at: string;
}

export interface EngagementRecord {
  id: string;
  base: Cents;
  advance: Cents;
  rulesVersion: string;
  /** Desconto do pintor (códigos de adesão + referências de fornecedores), resolvido e gravado uma vez na seleção. */
  referralDiscountBp: number;
  createdAt: string;
  carried?: { from: string; guarantee: Cents; advance: Cents };
}

export interface Replay {
  engagement: Engagement;
  /** Acontecimentos que as regras recusaram (ficam registados, sem efeito). */
  rejected: { event: EngagementEvent; reason: string }[];
  carriedOut?: { from: string; guarantee: Cents; advance: Cents };
}

function apply(e: Engagement, ev: EngagementEvent): { e: Engagement; carried?: Replay['carriedOut'] } {
  const at = new Date(ev.at);
  switch (ev.kind) {
    case 'deposito_confirmado':
      return { e: confirmClientDeposit(e, { amount: ev.amount ?? 0, at }) };
    case 'cliente_assinou':
      return { e: clientSign(e, { at }) };
    case 'fee_recebido':
      return { e: painterFeeReceived(e, { amount: ev.amount ?? 0, at }) };
    case 'pintor_assinou':
      return { e: painterSign(e, { at }) };
    case 'cliente_desistiu':
      return { e: clientWithdraw(e, { at }) };
    case 'litigio_aberto':
      return { e: openDispute(e, { at, reason: ev.payload.reason ?? 'sem motivo indicado' }) };
    case 'litigio_resolvido':
      if (!ev.payload.outcome) throw new EngagementError('sem_decisao', 'Falta a decisão do litígio.');
      return { e: resolveDispute(e, { at, outcome: ev.payload.outcome }) };
    case 'transitar': {
      const r = carryToNext(e, { at, to: ev.payload.to ?? 'outra proposta' });
      return { e: r.engagement, carried: r.carried };
    }
    case 'encerrar_sem_contrato':
      return { e: closeWithoutContract(e, { at }) };
  }
}

/** Reconstrói a contratação a partir dos acontecimentos, por ordem, e aplica os prazos até `now`. */
export function replay(rec: EngagementRecord, events: EngagementEvent[], now: Date): Replay {
  const baseRules = RULES_BY_VERSION[rec.rulesVersion];
  if (!baseRules) throw new EngagementError('regras_desconhecidas', `Versão de regras desconhecida: ${rec.rulesVersion}.`);
  // Contratações antigas (antes de 22/10/2026) já trazem o desconto na própria versão (sufixo "+ref"); as novas
  // gravam-no em referralDiscountBp e a versão fica sem sufixo — applyPainterDiscount com 0 não faz nada.
  const rules = applyPainterDiscount(baseRules, rec.referralDiscountBp);
  let e = createEngagement({
    id: rec.id,
    base: rec.base,
    advance: rec.advance,
    rules,
    at: new Date(rec.createdAt),
    carried: rec.carried,
  });
  const rejected: Replay['rejected'] = [];
  let carriedOut: Replay['carriedOut'];
  for (const ev of [...events].sort((a, b) => a.at.localeCompare(b.at))) {
    try {
      const r = apply(e, ev);
      e = r.e;
      carriedOut = r.carried ?? carriedOut;
    } catch (err) {
      if (!(err instanceof EngagementError)) throw err;
      rejected.push({ event: ev, reason: err.message });
    }
  }
  return { engagement: expire(e, now), rejected, carriedOut };
}

/** A identidade e os contactos são revelados quando o fee entra (CLI-19); depois disso não se desfaz. */
export const isRevealed = (e: Engagement) => e.feePaid;

export const STATUS_LABELS: Record<EngagementStatus, string> = {
  aguarda_deposito: 'À espera do depósito do cliente',
  aguarda_adiantamento: 'Partes apresentadas: à espera do adiantamento do cliente',
  aguarda_assinatura_cliente: 'À espera da assinatura do cliente',
  aguarda_fee: 'À espera da confirmação do pintor',
  aguarda_assinatura_pintor: 'À espera da assinatura do pintor',
  assinado: 'Contrato assinado pelas duas partes',
  pintor_nao_pagou: 'O pintor não confirmou no prazo',
  pintor_nao_assinou: 'O pintor não assinou no prazo',
  cliente_desistiu: 'O cliente desistiu',
  em_litigio: 'Em litígio',
  litigio_culpa_cliente: 'Litígio resolvido: culpa do cliente',
  litigio_culpa_pintor: 'Litígio resolvido: culpa do pintor',
  transitado: 'Valores transitaram para outra proposta',
  encerrado_sem_contrato: 'Encerrado sem contrato',
  cancelado: 'Escolha cancelada',
};

export type Side = 'cliente' | 'pintor' | 'plataforma';

/** O que cada lado pode fazer agora. A base de dados volta a verificar quem é quem. */
export function availableActions(e: Engagement, side: Side): EventKind[] {
  const s = e.status;
  if (e.rules.flow === 'v2') {
    const afterReveal = ['aguarda_adiantamento', 'aguarda_assinatura_cliente', 'aguarda_assinatura_pintor'].includes(s);
    if (side === 'plataforma') {
      const out: EventKind[] = [];
      if (s === 'aguarda_deposito' || s === 'aguarda_adiantamento') out.push('deposito_confirmado');
      if (s === 'aguarda_fee' || s === 'pintor_nao_pagou') out.push('fee_recebido');
      if (s === 'em_litigio') out.push('litigio_resolvido');
      return out;
    }
    if (side === 'cliente') {
      const out: EventKind[] = [];
      if (s === 'aguarda_assinatura_cliente') out.push('cliente_assinou');
      if (s === 'aguarda_deposito' || s === 'aguarda_fee' || afterReveal) out.push('cliente_desistiu');
      if (afterReveal) out.push('litigio_aberto');
      if (s === 'pintor_nao_pagou' || s === 'pintor_nao_assinou') out.push('transitar', 'encerrar_sem_contrato');
      return out;
    }
    const out: EventKind[] = [];
    if (s === 'aguarda_assinatura_pintor') out.push('pintor_assinou');
    if (afterReveal) out.push('litigio_aberto');
    return out;
  }
  if (side === 'plataforma') {
    const out: EventKind[] = [];
    if (s === 'aguarda_deposito') out.push('deposito_confirmado');
    // Um fee que chegue fora de prazo também se regista: é devolvido automaticamente.
    if (s === 'aguarda_fee' || s === 'pintor_nao_pagou') out.push('fee_recebido');
    if (s === 'em_litigio') out.push('litigio_resolvido');
    return out;
  }
  if (side === 'cliente') {
    const out: EventKind[] = [];
    if (s === 'aguarda_assinatura_cliente') out.push('cliente_assinou');
    if (['aguarda_deposito', 'aguarda_assinatura_cliente', 'aguarda_fee', 'aguarda_assinatura_pintor'].includes(s)) {
      out.push('cliente_desistiu');
    }
    if (s === 'aguarda_assinatura_pintor') out.push('litigio_aberto');
    if (s === 'pintor_nao_pagou' || s === 'pintor_nao_assinou') out.push('transitar', 'encerrar_sem_contrato');
    return out;
  }
  const out: EventKind[] = [];
  if (s === 'aguarda_assinatura_pintor') out.push('pintor_assinou', 'litigio_aberto');
  return out;
}

export { clientDepositDue };

// --- Minuta ----------------------------------------------------------------------

/** Diferença de área acima da qual o novo preço tem de ser aprovado antes (acordado, não legal). */
export const AREA_TOLERANCE_PCT = 10;

export interface DraftInput {
  ref: string;
  cliente: { nome: string; nif: string | null; morada: string | null } | null;
  pintor: { nome: string; nif: string | null; morada: string | null } | null;
  obra: { morada: string | null; concelho: string; descricao: string };
  linhas: { descricao: string; quantidade: string; total: string; inclusao: string }[];
  precoSemIva: string;
  iva: string;
  totalComIva: string;
  prazo: string;
  adiantamento: string;
  ajusteM2: string;
  garantiaObra: string;
  exclusoes: string;
  /** Materiais comprometidos que o empreiteiro se compromete a aplicar. */
  /** Alguma linha indica um produto «ou equivalente». */
  equivalentes?: boolean;
  materiais?: { produto: string; fornecedor: string; linha: string }[];
}

export interface Draft {
  title: string;
  sections: { heading: string; paragraphs: string[] }[];
}

const party = (p: DraftInput['cliente'], fallback: string) =>
  p ? `${p.nome}${p.nif ? `, NIF ${p.nif}` : ''}${p.morada ? `, com sede em ${p.morada}` : ''}` : fallback;

/**
 * Minuta do contrato de empreitada, gerada da proposta escolhida e da ficha da
 * obra. Antes da apresentação, as partes aparecem por papel; os dados
 * identificativos entram quando são revelados. O texto final deve ser validado
 * por um advogado (questões jurídicas em aberto em docs/DECISOES.md).
 */
export function contractDraft(d: DraftInput): Draft {
  return {
    title: `Contrato de empreitada — pedido ${d.ref}`,
    sections: [
      {
        heading: 'Partes',
        paragraphs: [
          `Dono da obra: ${party(d.cliente, 'o cliente identificado no pedido (dados revelados na apresentação)')}.`,
          `Empreiteiro: ${party(d.pintor, 'o pintor autor da proposta escolhida (dados revelados na apresentação)')}.`,
        ],
      },
      {
        heading: '1. Objeto',
        paragraphs: [
          `Execução dos trabalhos de pintura descritos na proposta escolhida, no imóvel ${
            d.obra.morada ? `sito em ${d.obra.morada}` : `localizado no concelho de ${d.obra.concelho}`
          }.`,
          d.obra.descricao,
        ],
      },
      {
        heading: '2. Trabalhos e preço',
        paragraphs: [
          ...d.linhas.map((l) => `${l.descricao} — ${l.quantidade} — ${l.total}${l.inclusao ? ` (${l.inclusao})` : ''}.`),
          `Preço global: ${d.precoSemIva}, acrescido de IVA de ${d.iva}, no total de ${d.totalComIva}.`,
          `Correções de área: a área executada que difira da prevista é faturada ou descontada a ${d.ajusteM2} por m². A medição é feita pelo empreiteiro, na presença do dono da obra ou de quem este indicar, e os vãos descontam-se como no pedido. Uma diferença superior a ${AREA_TOLERANCE_PCT}% exige aprovação escrita do novo preço pelo dono da obra antes de os trabalhos adicionais começarem.`,
          d.exclusoes ? `Exclusões: ${d.exclusoes}` : 'Exclusões: as indicadas na proposta.',
        ],
      },
      ...(d.materiais && d.materiais.length > 0
        ? [
            {
              heading: '2-A. Materiais',
              paragraphs: [
                'O empreiteiro compromete-se a aplicar os produtos seguintes, comprados a fornecedores registados na plataforma, que confirmam a venda e a entrega em obra:',
                ...d.materiais.map((m) => `${m.produto}, fornecido por ${m.fornecedor} — ${m.linha}.`),
                'A substituição de um produto só é admitida com acordo escrito do dono da obra e por produto equivalente ou superior.',
              ],
            },
          ]
        : []),
      ...(d.equivalentes
        ? [
            {
              heading: '2-B. Produtos «ou equivalente»',
              paragraphs: [EQUIVALENT_RULE, 'Qualquer diferença visível para o dono da obra, nomeadamente de cor, carece da sua aceitação escrita antes da aplicação.'],
            },
          ]
        : []),
      {
        heading: '3. Prazo',
        paragraphs: [d.prazo],
      },
      {
        heading: '4. Pagamentos',
        paragraphs: [
          d.adiantamento,
          'As restantes tranches são acordadas entre as partes e pagas diretamente ao empreiteiro.',
        ],
      },
      {
        heading: '5. Garantia da obra',
        paragraphs: [
          d.garantiaObra,
          'Esta garantia não reduz os direitos nem os prazos que a lei confere ao dono da obra, nomeadamente o prazo de cinco anos previsto no artigo 1225.º do Código Civil, quando aplicável.',
        ],
      },
      {
        heading: '5-A. Licenças e via pública',
        paragraphs: [
          'O empreiteiro obtém as licenças camarárias necessárias à execução dos trabalhos, incluindo a ocupação da via pública por andaimes e equipamentos, com a colaboração do dono da obra. As taxas estão incluídas no preço quando a proposta tiver uma linha de licenças; caso contrário, são suportadas por quem a proposta indicar.',
          'O licenciamento especial que os trabalhos não exigem por si, como alterações de vãos ou da fachada, cabe ao dono da obra.',
          'Esta distribuição não afasta obrigações que a lei atribua diretamente ao dono da obra.',
        ],
      },
      {
        heading: '6. Papel da plataforma',
        paragraphs: [
          'A plataforma apresentou as partes e conserva a prova deste contrato. Não é parte na empreitada e não responde pela sua execução.',
          'A execução, as tranches seguintes, os aditamentos e eventuais incumprimentos depois da assinatura são matéria entre as partes.',
        ],
      },
    ],
  };
}

/** Texto canónico da minuta: é este texto que se resume (SHA-256) e fica como prova da assinatura. */
export function draftText(d: Draft): string {
  return [d.title, ...d.sections.flatMap((s) => [s.heading, ...s.paragraphs])].join('\n');
}

// --- Conciliação ----------------------------------------------------------------

/** Instruções ao parceiro de pagamentos que resultam dos movimentos (o que tem de executar). */
export const PARTNER_INSTRUCTIONS: Partial<Record<MovementKind, string>> = {
  devolucao_garantia: 'Devolver caução ao cliente',
  devolucao_adiantamento: 'Devolver adiantamento ao cliente',
  devolucao_fee: 'Devolver comissão ao pintor',
  libertacao_adiantamento: 'Transferir adiantamento para o pintor',
  retencao_fee: 'Transferir comissão para a plataforma',
  retencao_garantia: 'Transferir caução perdida para a plataforma',
};

export interface LedgerTotals {
  retido: { guarantee: Cents; advance: Cents; fee: Cents };
  /** O que a plataforma recebeu: comissões (com o IVA à parte) e cauções perdidas. */
  receita: { comissao: Cents; ivaComissao: Cents; garantias: Cents };
  porTipo: Record<string, Cents>;
}

/** Soma de todas as contratações, para conciliar com os extratos do parceiro. */
export function ledger(engagements: Engagement[]): LedgerTotals {
  const out: LedgerTotals = {
    retido: { guarantee: 0, advance: 0, fee: 0 },
    receita: { comissao: 0, ivaComissao: 0, garantias: 0 },
    porTipo: {},
  };
  for (const e of engagements) {
    const h = held(e);
    out.retido.guarantee += h.guarantee;
    out.retido.advance += h.advance;
    out.retido.fee += h.fee;
    for (const m of e.movements) out.porTipo[m.kind] = (out.porTipo[m.kind] ?? 0) + m.amount;
    const fees = e.movements.filter((m) => m.kind === 'retencao_fee').reduce((n, m) => n + m.amount, 0);
    // A comissão retida é sempre a comissão inteira (líquido + IVA) desta contratação.
    if (fees > 0) {
      out.receita.comissao += e.fee.net;
      out.receita.ivaComissao += e.fee.vat;
    }
    out.receita.garantias += e.movements.filter((m) => m.kind === 'retencao_garantia').reduce((n, m) => n + m.amount, 0);
  }
  return out;
}

/** O contrato e as regras de dinheiro em linguagem simples, gerados dos mesmos dados da minuta. */
/** `side` 'cliente' não vê o que a plataforma cobra ao pintor; o pintor e a plataforma veem. */
export function plainSummary(e: Engagement, extra: { duracao: string; materiais: number }, side: Side = 'plataforma'): string[] {
  const client = side === 'cliente';
  const eur = (c: Cents) =>
    new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR', useGrouping: 'always' }).format(c / 100);
  const materiais =
    extra.materiais > 0
      ? [`O pintor compromete-se a aplicar ${extra.materiais === 1 ? 'o produto indicado' : `os ${extra.materiais} produtos indicados`}; o fornecedor confirma a venda e a entrega (não a aplicação).`]
      : [];
  if (e.rules.flow === 'v2') {
    return [
      `O pintor faz os trabalhos da proposta por ${eur(e.base)} mais IVA. ${extra.duracao}`,
      `O cliente deposita ${eur(e.guarantee)} de caução, quando quiser, como garantia de interesse, num parceiro de pagamentos, não na plataforma. É esse depósito que torna a escolha efetiva.`,
      client
        ? `O pintor tem ${e.rules.feeDeadlineDays} dias para confirmar a escolha; nessa altura as partes ficam a conhecer-se.`
        : `O pintor paga ${eur(e.fee.gross)} de comissão à plataforma em ${e.rules.feeDeadlineDays} dias; nessa altura as partes ficam a conhecer-se.`,
      'O cliente assina e depois o pintor. Com as duas assinaturas, a caução volta ao cliente. O adiantamento, se houver, paga-se diretamente ao pintor depois da assinatura, como diz o contrato.',
      client
        ? 'Se o cliente desistir depois de conhecer o pintor, perde a caução. Se o pintor não assinar no prazo, a escolha fica sem efeito.'
        : 'Se o cliente desistir depois de conhecer o pintor, perde a caução e o pintor recupera a comissão. Se o pintor não assinar no prazo, perde a comissão.',
      ...materiais,
      'O pintor obtém as licenças camarárias dos trabalhos, incluindo a ocupação da via pública; o licenciamento especial (vãos, fachada) é do cliente.',
      'Depois da assinatura, a plataforma não intervém na obra: só guarda o contrato.',
    ];
  }
  return [
    `O pintor faz os trabalhos da proposta por ${eur(e.base)} mais IVA. ${extra.duracao}`,
    `O cliente deposita ${eur(e.guarantee)} de caução${e.advance > 0 ? ` e ${eur(e.advance)} de adiantamento` : ''} num parceiro de pagamentos, não na plataforma.`,
    client
      ? `Depois de o cliente assinar, o pintor tem ${e.rules.feeDeadlineDays} dias para confirmar. Só então as partes ficam a saber quem é a outra.`
      : `Depois de o cliente assinar, o pintor tem ${e.rules.feeDeadlineDays} dias para pagar ${eur(e.fee.gross)} de comissão. Só então as partes ficam a saber quem é a outra.`,
    `Quando o pintor assina, a caução volta ao cliente${e.advance > 0 ? ' e o adiantamento passa para o pintor' : ''}. O resto da obra paga-se diretamente ao pintor.`,
    client
      ? 'Se o cliente desistir antes de o pintor assinar, perde a caução. Se o pintor não assinar no prazo, a escolha fica sem efeito.'
      : 'Se o cliente desistir antes de o pintor assinar, perde a caução. Se o pintor pagar e não assinar no prazo, perde a comissão.',
    ...materiais,
    'Depois da assinatura, a plataforma não intervém na obra: só guarda o contrato.',
  ];
}
