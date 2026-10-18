import { describe, expect, it } from 'vitest';
import {
  carryToNext,
  clientDepositDue,
  clientSign,
  clientWithdraw,
  closeWithoutContract,
  confirmClientDeposit,
  createEngagement,
  expire,
  held,
  openDispute,
  painterFeeReceived,
  painterSign,
  resolveDispute,
  settlement,
  type Engagement,
} from './engagement';
import { euros } from './money';
import { RULES_2026_10 as rules } from './rules';

// Exemplo do documento: obra de 100 000 € sem IVA, adiantamento de 10%.
const BASE = euros(100_000);
const ADVANCE = euros(10_000);
const GUARANTEE = euros(3_000);
const FEE_GROSS = euros(3_690);

const t = (iso: string) => new Date(iso);

function upToPainterNotified(advance = ADVANCE): Engagement {
  let e = createEngagement({ id: 'C1', base: BASE, advance, rules, at: t('2026-10-19T09:00:00Z') });
  e = confirmClientDeposit(e, { amount: clientDepositDue(e), at: t('2026-10-19T10:00:00Z') });
  return clientSign(e, { at: t('2026-10-20T10:00:00Z') });
}

function upToFeePaid(): Engagement {
  return painterFeeReceived(upToPainterNotified(), { amount: FEE_GROSS, at: t('2026-10-22T10:00:00Z') });
}

function expectNothingHeld(e: Engagement) {
  expect(held(e)).toEqual({ guarantee: 0, advance: 0, fee: 0 });
}

describe('percurso normal', () => {
  it('cliente deposita 13 000 €, pintor paga 3 690 €; no fim o cliente recebe 3 000 € e o pintor 10 000 €', () => {
    let e = createEngagement({ id: 'C1', base: BASE, advance: ADVANCE, rules, at: t('2026-10-19T09:00:00Z') });
    expect(clientDepositDue(e)).toBe(euros(13_000));

    e = confirmClientDeposit(e, { amount: euros(13_000), at: t('2026-10-19T10:00:00Z') });
    expect(e.status).toBe('aguarda_assinatura_cliente');

    e = clientSign(e, { at: t('2026-10-20T10:00:00Z') });
    expect(e.status).toBe('aguarda_fee');
    expect(e.feeDue).toBe('2026-10-28');

    e = painterFeeReceived(e, { amount: FEE_GROSS, at: t('2026-10-22T10:00:00Z') });
    expect(e.status).toBe('aguarda_assinatura_pintor');
    expect(e.signDue).toBe('2026-10-30');

    e = painterSign(e, { at: t('2026-10-23T10:00:00Z') });
    expect(e.status).toBe('assinado');
    expectNothingHeld(e);
    expect(settlement(e)).toEqual({
      cliente: { entregou: euros(13_000), recebeu: GUARANTEE, transitou: 0 },
      pintor: { entregou: FEE_GROSS, recebeu: ADVANCE },
      plataforma: { recebeu: FEE_GROSS }, // 3 000 € de comissão + 690 € de IVA a entregar ao Estado
    });
  });

  it('sem adiantamento o cliente deposita só a garantia', () => {
    const e = createEngagement({ id: 'C2', base: BASE, advance: 0, rules, at: t('2026-10-19T09:00:00Z') });
    expect(clientDepositDue(e)).toBe(GUARANTEE);
  });

  it('recusa um depósito com montante diferente', () => {
    const e = createEngagement({ id: 'C3', base: BASE, advance: ADVANCE, rules, at: t('2026-10-19T09:00:00Z') });
    expect(() => confirmClientDeposit(e, { amount: euros(3_000), at: t('2026-10-19T10:00:00Z') })).toThrow(
      /Esperado/,
    );
  });

  it('o pintor não pode assinar antes de pagar o fee', () => {
    expect(() => painterSign(upToPainterNotified(), { at: t('2026-10-21T10:00:00Z') })).toThrow(/estado/);
  });
});

describe('o pintor não paga em 8 dias', () => {
  it('um fee que chega depois do 8.º dia é devolvido e o cliente é informado', () => {
    const e = painterFeeReceived(upToPainterNotified(), { amount: FEE_GROSS, at: t('2026-10-29T00:30:00Z') });
    expect(e.status).toBe('pintor_nao_pagou');
    expect(held(e)).toEqual({ guarantee: GUARANTEE, advance: ADVANCE, fee: 0 });
    expect(settlement(e).pintor).toEqual({ entregou: FEE_GROSS, recebeu: FEE_GROSS });
  });

  it('a garantia e o adiantamento transitam para a proposta seguinte', () => {
    const failed = expire(upToPainterNotified(), t('2026-10-29T08:00:00Z'));
    const { engagement, carried } = carryToNext(failed, { at: t('2026-10-29T09:00:00Z'), to: 'C2' });
    expect(engagement.status).toBe('transitado');
    expectNothingHeld(engagement);
    expect(settlement(engagement).plataforma.recebeu).toBe(0);

    // A segunda proposta é de 90 000 € com 9 000 € de adiantamento: o crédito transitado excede o necessário.
    let next = createEngagement({
      id: 'C2', base: euros(90_000), advance: euros(9_000), rules, at: t('2026-10-29T09:00:00Z'), carried,
    });
    expect(clientDepositDue(next)).toBe(0);
    next = confirmClientDeposit(next, { amount: 0, at: t('2026-10-29T09:05:00Z') });
    expect(held(next)).toEqual({ guarantee: euros(2_700), advance: euros(9_000), fee: 0 });
    expect(settlement(next).cliente.recebeu).toBe(euros(300) + euros(1_000));
  });

  it('se o cliente não continuar, recebe tudo de volta', () => {
    const failed = expire(upToPainterNotified(), t('2026-10-29T08:00:00Z'));
    const e = closeWithoutContract(failed, { at: t('2026-10-29T09:00:00Z') });
    expectNothingHeld(e);
    expect(settlement(e).cliente.recebeu).toBe(euros(13_000));
    expect(settlement(e).plataforma.recebeu).toBe(0);
  });
});

describe('o pintor paga mas não assina no prazo', () => {
  it('perde o fee e o adiantamento volta ao cliente', () => {
    const e = expire(upToFeePaid(), t('2026-10-31T09:00:00Z'));
    expect(e.status).toBe('pintor_nao_assinou');
    expect(held(e)).toEqual({ guarantee: GUARANTEE, advance: 0, fee: 0 });
    expect(settlement(e).plataforma.recebeu).toBe(FEE_GROSS);
    expect(settlement(e).cliente.recebeu).toBe(ADVANCE);
  });

  it('a assinatura depois do prazo é recusada', () => {
    expect(() => painterSign(upToFeePaid(), { at: t('2026-10-31T09:00:00Z') })).toThrow(/estado/);
  });
});

describe('o cliente desiste antes de o pintor assinar', () => {
  it('perde a garantia; o fee e o adiantamento são devolvidos', () => {
    const e = clientWithdraw(upToFeePaid(), { at: t('2026-10-23T09:00:00Z') });
    expect(e.status).toBe('cliente_desistiu');
    expectNothingHeld(e);
    expect(settlement(e)).toEqual({
      cliente: { entregou: euros(13_000), recebeu: ADVANCE, transitou: 0 },
      pintor: { entregou: FEE_GROSS, recebeu: FEE_GROSS },
      plataforma: { recebeu: GUARANTEE },
    });
  });

  it('antes de depositar, cancelar não tem custo', () => {
    const e = createEngagement({ id: 'C9', base: BASE, advance: ADVANCE, rules, at: t('2026-10-19T09:00:00Z') });
    expect(clientWithdraw(e, { at: t('2026-10-19T09:30:00Z') }).status).toBe('cancelado');
  });

  it('depois de o pintor assinar já não é possível', () => {
    const signed = painterSign(upToFeePaid(), { at: t('2026-10-23T10:00:00Z') });
    expect(() => clientWithdraw(signed, { at: t('2026-10-24T10:00:00Z') })).toThrow(/estado/);
  });
});

describe('litígio antes da assinatura do pintor', () => {
  const disputed = () =>
    openDispute(upToFeePaid(), { at: t('2026-10-23T09:00:00Z'), reason: 'pintor quer reajustar prazos' });

  it('as garantias ficam retidas e o adiantamento volta ao cliente', () => {
    const e = disputed();
    expect(e.status).toBe('em_litigio');
    expect(held(e)).toEqual({ guarantee: GUARANTEE, advance: 0, fee: FEE_GROSS });
    // O prazo de assinatura fica suspenso durante o litígio.
    expect(expire(e, t('2027-03-01T00:00:00Z')).status).toBe('em_litigio');
  });

  it('culpa do pintor: perde o fee, o cliente recebe a garantia', () => {
    const e = resolveDispute(disputed(), { at: t('2026-12-01T09:00:00Z'), outcome: 'culpa_pintor' });
    expectNothingHeld(e);
    expect(settlement(e).plataforma.recebeu).toBe(FEE_GROSS);
  });

  it('culpa do cliente: perde a garantia, o pintor recebe o fee', () => {
    const e = resolveDispute(disputed(), { at: t('2026-12-01T09:00:00Z'), outcome: 'culpa_cliente' });
    expectNothingHeld(e);
    expect(settlement(e).plataforma.recebeu).toBe(GUARANTEE);
    expect(settlement(e).pintor.recebeu).toBe(FEE_GROSS);
  });

  it('acordo: nova minuta, o cliente assina e o pintor assina sem voltar a pagar', () => {
    let e = resolveDispute(disputed(), { at: t('2026-11-02T09:00:00Z'), outcome: 'retomar' });
    e = clientSign(e, { at: t('2026-11-03T09:00:00Z') });
    expect(e.status).toBe('aguarda_assinatura_pintor');
    e = painterSign(e, { at: t('2026-11-04T09:00:00Z') });
    expect(e.status).toBe('assinado');
    expectNothingHeld(e);
    expect(settlement(e).plataforma.recebeu).toBe(FEE_GROSS);
  });
});

describe('regra central: a plataforma recebe 3% uma única vez', () => {
  const outcomes: [string, () => Engagement][] = [
    ['assinado', () => painterSign(upToFeePaid(), { at: t('2026-10-23T10:00:00Z') })],
    ['pintor não assinou', () => closeWithoutContract(expire(upToFeePaid(), t('2026-10-31T09:00:00Z')), { at: t('2026-10-31T10:00:00Z') })],
    ['cliente desistiu', () => clientWithdraw(upToFeePaid(), { at: t('2026-10-23T09:00:00Z') })],
    ['culpa do cliente', () => resolveDispute(openDispute(upToFeePaid(), { at: t('2026-10-23T09:00:00Z'), reason: 'x' }), { at: t('2026-11-01T09:00:00Z'), outcome: 'culpa_cliente' })],
    ['culpa do pintor', () => resolveDispute(openDispute(upToFeePaid(), { at: t('2026-10-23T09:00:00Z'), reason: 'x' }), { at: t('2026-11-01T09:00:00Z'), outcome: 'culpa_pintor' })],
  ];

  it.each(outcomes)('%s: nunca recebe as duas garantias e nada fica retido', (_name, run) => {
    const e = run();
    expectNothingHeld(e);
    expect([GUARANTEE, FEE_GROSS]).toContain(settlement(e).plataforma.recebeu);
  });
});
