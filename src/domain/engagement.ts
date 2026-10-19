import { clientGuarantee, painterFee } from './commission';
import { deadlineFrom, isWithin, type IsoDate } from './deadline';
import { assertCents, type Cents } from './money';
import type { CommercialRules } from './rules';

// Contratação: da escolha de uma proposta pelo cliente até à assinatura das
// duas partes. O papel da plataforma termina na assinatura. Modelo completo em
// docs/MODELO.md. A plataforma nunca guarda o dinheiro ela própria: cada
// movimento aqui é uma instrução ao parceiro de pagamentos autorizado.

export type EngagementStatus =
  | 'aguarda_deposito'
  | 'aguarda_assinatura_cliente'
  | 'aguarda_fee'
  | 'aguarda_assinatura_pintor'
  | 'assinado'
  | 'pintor_nao_pagou'
  | 'pintor_nao_assinou'
  | 'cliente_desistiu'
  | 'em_litigio'
  | 'litigio_culpa_cliente'
  | 'litigio_culpa_pintor'
  | 'transitado'
  | 'encerrado_sem_contrato'
  | 'cancelado';

export type MovementKind =
  | 'deposito_garantia'
  | 'deposito_adiantamento'
  | 'pagamento_fee'
  | 'devolucao_garantia'
  | 'devolucao_adiantamento'
  | 'devolucao_fee'
  | 'libertacao_adiantamento'
  | 'retencao_fee'
  | 'retencao_garantia'
  | 'transferencia_garantia'
  | 'transferencia_adiantamento';

export interface Movement {
  kind: MovementKind;
  amount: Cents;
  at: string;
  note?: string;
}

export interface Engagement {
  id: string;
  rules: CommercialRules;
  /** Valor da proposta aceite, sem IVA. */
  base: Cents;
  /** Adiantamento de adjudicação previsto na proposta (0 se não houver). */
  advance: Cents;
  guarantee: Cents;
  fee: { net: Cents; vat: Cents; gross: Cents };
  status: EngagementStatus;
  feeDue?: IsoDate;
  signDue?: IsoDate;
  feePaid: boolean;
  /** Valores que transitaram de uma contratação anterior do mesmo pedido. */
  carriedFrom?: string;
  carriedCredit: Cents;
  movements: Movement[];
  history: { at: string; event: string }[];
}

export class EngagementError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

const OPEN_FOR_WITHDRAWAL: EngagementStatus[] = [
  'aguarda_assinatura_cliente',
  'aguarda_fee',
  'aguarda_assinatura_pintor',
];

function fail(code: string, message: string): never {
  throw new EngagementError(code, message);
}

function expectStatus(e: Engagement, allowed: EngagementStatus[], action: string) {
  if (!allowed.includes(e.status)) {
    fail('estado_invalido', `${action} não é possível no estado "${e.status}".`);
  }
}

function sum(e: Engagement, kinds: MovementKind[]): Cents {
  return e.movements.filter((m) => kinds.includes(m.kind)).reduce((n, m) => n + m.amount, 0);
}

/** Valores ainda retidos no parceiro de pagamentos, por rubrica. */
export function held(e: Engagement) {
  return {
    guarantee:
      sum(e, ['deposito_garantia']) -
      sum(e, ['devolucao_garantia', 'retencao_garantia', 'transferencia_garantia']),
    advance:
      sum(e, ['deposito_adiantamento']) -
      sum(e, ['devolucao_adiantamento', 'libertacao_adiantamento', 'transferencia_adiantamento']),
    fee: sum(e, ['pagamento_fee']) - sum(e, ['devolucao_fee', 'retencao_fee']),
  };
}

/** Quanto cada parte entregou e recebeu, e quanto ficou para a plataforma. */
export function settlement(e: Engagement) {
  return {
    cliente: {
      entregou: sum(e, ['deposito_garantia', 'deposito_adiantamento']) - e.carriedCredit,
      recebeu: sum(e, ['devolucao_garantia', 'devolucao_adiantamento']),
      transitou: sum(e, ['transferencia_garantia', 'transferencia_adiantamento']),
    },
    pintor: {
      entregou: sum(e, ['pagamento_fee']),
      recebeu: sum(e, ['devolucao_fee', 'libertacao_adiantamento']),
    },
    plataforma: { recebeu: sum(e, ['retencao_fee', 'retencao_garantia']) },
  };
}

function record(e: Engagement, at: Date, event: string, moves: Omit<Movement, 'at'>[] = []): Engagement {
  const iso = at.toISOString();
  return {
    ...e,
    movements: [...e.movements, ...moves.filter((m) => m.amount > 0).map((m) => ({ ...m, at: iso }))],
    history: [...e.history, { at: iso, event }],
  };
}

export interface CreateInput {
  id: string;
  base: Cents;
  advance: Cents;
  rules: CommercialRules;
  at: Date;
  /** Caução e adiantamento que transitam de uma contratação anterior. */
  carried?: { from: string; guarantee: Cents; advance: Cents };
}

export function createEngagement(input: CreateInput): Engagement {
  const base = assertCents(input.base, 'valor da proposta');
  const advance = assertCents(input.advance, 'adiantamento');
  if (advance > base) fail('adiantamento_invalido', 'O adiantamento não pode exceder o valor da obra.');
  let e: Engagement = {
    id: input.id,
    rules: input.rules,
    base,
    advance,
    guarantee: clientGuarantee(base, input.rules),
    fee: painterFee(base, input.rules),
    status: 'aguarda_deposito',
    feePaid: false,
    carriedCredit: 0,
    movements: [],
    history: [],
  };
  e = record(e, input.at, 'criada');
  if (input.carried) {
    const c = input.carried;
    e = record(e, input.at, `valores transitados de ${c.from}`, [
      { kind: 'deposito_garantia', amount: c.guarantee, note: `transitado de ${c.from}` },
      { kind: 'deposito_adiantamento', amount: c.advance, note: `transitado de ${c.from}` },
    ]);
    e = { ...e, carriedFrom: c.from, carriedCredit: c.guarantee + c.advance };
  }
  return e;
}

/** Quanto o cliente ainda tem de depositar (descontando valores transitados). */
export function clientDepositDue(e: Engagement): Cents {
  const h = held(e);
  return Math.max(0, e.guarantee - h.guarantee) + Math.max(0, e.advance - h.advance);
}

export function confirmClientDeposit(e: Engagement, p: { amount: Cents; at: Date }): Engagement {
  expectStatus(e, ['aguarda_deposito'], 'Confirmar o depósito do cliente');
  const due = clientDepositDue(e);
  if (p.amount !== due) {
    fail('montante_divergente', `Esperado ${due} cêntimos, recebido ${p.amount}.`);
  }
  const h = held(e);
  const toGuarantee = Math.max(0, e.guarantee - h.guarantee);
  const toAdvance = Math.max(0, e.advance - h.advance);
  // Um crédito transitado acima do necessário volta ao cliente.
  const excessGuarantee = Math.max(0, h.guarantee - e.guarantee);
  const excessAdvance = Math.max(0, h.advance - e.advance);
  const next = record(e, p.at, 'depósito do cliente confirmado; minuta gerada', [
    { kind: 'deposito_garantia', amount: toGuarantee },
    { kind: 'deposito_adiantamento', amount: toAdvance },
    { kind: 'devolucao_garantia', amount: excessGuarantee, note: 'excesso transitado' },
    { kind: 'devolucao_adiantamento', amount: excessAdvance, note: 'excesso transitado' },
  ]);
  return { ...next, status: 'aguarda_assinatura_cliente' };
}

/** O cliente assina a minuta; o pintor é avisado de que ganhou a obra. */
export function clientSign(e: Engagement, p: { at: Date }): Engagement {
  expectStatus(e, ['aguarda_assinatura_cliente'], 'A assinatura do cliente');
  if (e.feePaid) {
    // Retoma depois de um litígio: o fee já está pago, falta só o pintor assinar.
    const signDue = deadlineFrom(p.at, e.rules.signDeadlineDays, e.rules.timeZone);
    return { ...record(e, p.at, 'cliente assinou a nova minuta'), status: 'aguarda_assinatura_pintor', signDue };
  }
  const feeDue = deadlineFrom(p.at, e.rules.feeDeadlineDays, e.rules.timeZone);
  return { ...record(e, p.at, 'cliente assinou; pintor notificado'), status: 'aguarda_fee', feeDue };
}

/**
 * O parceiro de pagamentos comunica que o fee do pintor entrou. Um pagamento
 * fora de prazo, ou que já não é esperado, é registado e devolvido de imediato.
 */
export function painterFeeReceived(e: Engagement, p: { amount: Cents; at: Date }): Engagement {
  assertCents(p.amount, 'fee');
  let current = expire(e, p.at);
  if (current.status !== 'aguarda_fee') {
    return record(current, p.at, 'fee recebido fora do prazo ou sem contratação ativa; devolvido', [
      { kind: 'pagamento_fee', amount: p.amount },
      { kind: 'devolucao_fee', amount: p.amount, note: 'fora de prazo' },
    ]);
  }
  if (p.amount !== e.fee.gross) {
    fail('montante_divergente', `Esperado ${e.fee.gross} cêntimos, recebido ${p.amount}.`);
  }
  const signDue = deadlineFrom(p.at, e.rules.signDeadlineDays, e.rules.timeZone);
  current = record(current, p.at, 'fee do pintor recebido; contrato disponível para assinar', [
    { kind: 'pagamento_fee', amount: p.amount },
  ]);
  return { ...current, status: 'aguarda_assinatura_pintor', feePaid: true, signDue };
}

/** O pintor assina: o contrato fica celebrado e a plataforma sai de cena. */
export function painterSign(e: Engagement, p: { at: Date }): Engagement {
  const current = expire(e, p.at);
  expectStatus(current, ['aguarda_assinatura_pintor'], 'A assinatura do pintor');
  const h = held(current);
  const next = record(current, p.at, 'pintor assinou; contrato celebrado', [
    { kind: 'retencao_fee', amount: h.fee },
    { kind: 'devolucao_garantia', amount: h.guarantee },
    { kind: 'libertacao_adiantamento', amount: h.advance },
  ]);
  return { ...next, status: 'assinado' };
}

/** Aplica os prazos esgotados. Idempotente: pode ser chamada a qualquer momento. */
export function expire(e: Engagement, now: Date): Engagement {
  const tz = e.rules.timeZone;
  if (e.status === 'aguarda_fee' && e.feeDue && !isWithin(now, e.feeDue, tz)) {
    return { ...record(e, now, `fee não recebido até ${e.feeDue}; cliente informado`), status: 'pintor_nao_pagou' };
  }
  if (e.status === 'aguarda_assinatura_pintor' && e.signDue && !isWithin(now, e.signDue, tz)) {
    const h = held(e);
    const next = record(e, now, `pintor não assinou até ${e.signDue}; contrato cancelado`, [
      { kind: 'retencao_fee', amount: h.fee },
      { kind: 'devolucao_adiantamento', amount: h.advance },
    ]);
    return { ...next, status: 'pintor_nao_assinou' };
  }
  return e;
}

/** O cliente desiste antes de o pintor assinar: perde a caução. */
export function clientWithdraw(e: Engagement, p: { at: Date }): Engagement {
  if (e.status === 'aguarda_deposito') {
    return { ...record(e, p.at, 'escolha cancelada antes do depósito'), status: 'cancelado' };
  }
  const current = expire(e, p.at);
  expectStatus(current, OPEN_FOR_WITHDRAWAL, 'A desistência do cliente');
  const h = held(current);
  const next = record(current, p.at, 'cliente desistiu', [
    { kind: 'retencao_garantia', amount: h.guarantee },
    { kind: 'devolucao_fee', amount: h.fee },
    { kind: 'devolucao_adiantamento', amount: h.advance },
  ]);
  return { ...next, status: 'cliente_desistiu' };
}

/**
 * Litígio antes da assinatura do pintor (por exemplo, o pintor quer reajustar o
 * contrato). As cauções ficam retidas; o adiantamento volta ao cliente
 * (proposta ainda em aberto, docs/DECISOES.md).
 */
export function openDispute(e: Engagement, p: { at: Date; reason: string }): Engagement {
  const current = expire(e, p.at);
  expectStatus(current, ['aguarda_assinatura_pintor'], 'Abrir um litígio');
  const h = held(current);
  const next = record(current, p.at, `litígio aberto: ${p.reason}`, [
    { kind: 'devolucao_adiantamento', amount: h.advance, note: 'litígio' },
  ]);
  return { ...next, status: 'em_litigio', signDue: undefined };
}

export type DisputeOutcome = 'culpa_cliente' | 'culpa_pintor' | 'retomar';

/** Acordo ou decisão: só a parte culpada perde os seus 3%. */
export function resolveDispute(e: Engagement, p: { at: Date; outcome: DisputeOutcome }): Engagement {
  expectStatus(e, ['em_litigio'], 'Resolver o litígio');
  const h = held(e);
  if (p.outcome === 'culpa_cliente') {
    const next = record(e, p.at, 'litígio resolvido: culpa do cliente', [
      { kind: 'retencao_garantia', amount: h.guarantee },
      { kind: 'devolucao_fee', amount: h.fee },
    ]);
    return { ...next, status: 'litigio_culpa_cliente' };
  }
  if (p.outcome === 'culpa_pintor') {
    const next = record(e, p.at, 'litígio resolvido: culpa do pintor', [
      { kind: 'retencao_fee', amount: h.fee },
      { kind: 'devolucao_garantia', amount: h.guarantee },
    ]);
    return { ...next, status: 'litigio_culpa_pintor' };
  }
  return { ...record(e, p.at, 'acordo: nova minuta para o cliente assinar'), status: 'aguarda_assinatura_cliente' };
}

const AFTER_PAINTER_FAILURE: EngagementStatus[] = ['pintor_nao_pagou', 'pintor_nao_assinou'];

/** O pintor falhou e o cliente escolhe outra proposta: os valores transitam. */
export function carryToNext(e: Engagement, p: { at: Date; to: string }) {
  const current = expire(e, p.at);
  expectStatus(current, AFTER_PAINTER_FAILURE, 'Passar para outra proposta');
  const h = held(current);
  const next = record(current, p.at, `valores transitam para ${p.to}`, [
    { kind: 'transferencia_garantia', amount: h.guarantee, note: p.to },
    { kind: 'transferencia_adiantamento', amount: h.advance, note: p.to },
  ]);
  return {
    engagement: { ...next, status: 'transitado' as const },
    carried: { from: e.id, guarantee: h.guarantee, advance: h.advance },
  };
}

/** O pintor falhou e o cliente não continua: tudo volta ao cliente (proposta). */
export function closeWithoutContract(e: Engagement, p: { at: Date }): Engagement {
  const current = expire(e, p.at);
  expectStatus(current, AFTER_PAINTER_FAILURE, 'Encerrar sem contrato');
  const h = held(current);
  const next = record(current, p.at, 'cliente não continua; valores devolvidos', [
    { kind: 'devolucao_garantia', amount: h.guarantee },
    { kind: 'devolucao_adiantamento', amount: h.advance },
  ]);
  return { ...next, status: 'encerrado_sem_contrato' };
}

