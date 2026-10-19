import { describe, expect, it } from 'vitest';
import {
  carryToNext,
  clientDepositDue,
  clientSign,
  clientWithdraw,
  confirmClientDeposit,
  createEngagement,
  expire,
  held,
  painterFeeReceived,
  painterSign,
  settlement,
  type Engagement,
} from './engagement';
import { euros } from './money';
import { RULES_2026_10_19 as rules } from './rules';

// Percurso v2 (decisão do promotor de 19/10/2026), com o exemplo de 100 000 €.
const t = (iso: string) => new Date(iso);
// O adiantamento da proposta (10%) não passa pela plataforma no v2.
const start = () => createEngagement({ id: 'V2', base: euros(100_000), advance: euros(10_000), rules, at: t('2026-10-19T09:00:00Z') });

function presented(): Engagement {
  let e = start();
  expect(e.advance).toBe(0);
  expect(clientDepositDue(e)).toBe(euros(3_000)); // só a caução
  // A caução não tem prazo: é o ato de escolher.
  expect(expire(e, t('2027-01-01T00:00:00Z')).status).toBe('aguarda_deposito');
  e = confirmClientDeposit(e, { amount: euros(3_000), at: t('2026-10-30T10:00:00Z') });
  expect(e.status).toBe('aguarda_fee');
  e = painterFeeReceived(e, { amount: euros(3_690), at: t('2026-11-02T10:00:00Z') });
  expect(e.status).toBe('aguarda_assinatura_cliente');
  expect(e.feePaid).toBe(true); // apresentação
  return e;
}

describe('percurso v2: caução, comissão, apresentação, assinaturas', () => {
  it('percurso completo: a caução volta ao cliente na assinatura e a comissão fica', () => {
    let e = clientSign(presented(), { at: t('2026-11-03T10:00:00Z') });
    e = painterSign(e, { at: t('2026-11-04T10:00:00Z') });
    expect(e.status).toBe('assinado');
    expect(held(e)).toEqual({ guarantee: 0, advance: 0, fee: 0 });
    expect(settlement(e)).toMatchObject({
      cliente: { entregou: euros(3_000), recebeu: euros(3_000) },
      pintor: { entregou: euros(3_690), recebeu: 0 },
      plataforma: { recebeu: euros(3_690) },
    });
  });

  it('antes da apresentação, o cliente desiste sem penalização', () => {
    let e = confirmClientDeposit(start(), { amount: euros(3_000), at: t('2026-10-19T10:00:00Z') });
    e = clientWithdraw(e, { at: t('2026-10-20T10:00:00Z') });
    expect(e.status).toBe('cancelado');
    expect(settlement(e)).toMatchObject({ cliente: { entregou: euros(3_000), recebeu: euros(3_000) }, plataforma: { recebeu: 0 } });
  });

  it('depois da apresentação, o cliente que desiste perde a caução e o pintor recupera a comissão', () => {
    const e = clientWithdraw(presented(), { at: t('2026-11-03T10:00:00Z') });
    expect(e.status).toBe('cliente_desistiu');
    expect(settlement(e)).toMatchObject({
      cliente: { entregou: euros(3_000), recebeu: 0 },
      pintor: { entregou: euros(3_690), recebeu: euros(3_690) },
      plataforma: { recebeu: euros(3_000) },
    });
  });

  it('o cliente que não assina no prazo depois da apresentação é tratado como desistência', () => {
    const e = expire(presented(), t('2026-11-11T00:00:00Z'));
    expect(e.status).toBe('cliente_desistiu');
    expect(settlement(e).plataforma.recebeu).toBe(euros(3_000));
  });

  it('o pintor que não paga em 8 dias: a caução transita para outra proposta', () => {
    const e = expire(confirmClientDeposit(start(), { amount: euros(3_000), at: t('2026-10-19T10:00:00Z') }), t('2026-10-28T00:00:00Z'));
    expect(e.status).toBe('pintor_nao_pagou');
    expect(carryToNext(e, { at: t('2026-10-28T10:00:00Z'), to: 'V3' }).carried).toEqual({ from: 'V2', guarantee: euros(3_000), advance: 0 });
  });

  it('o pintor que não assina perde a comissão; a caução fica para transitar ou ser devolvida', () => {
    let e = clientSign(presented(), { at: t('2026-11-03T10:00:00Z') });
    e = expire(e, t('2026-11-12T00:00:00Z'));
    expect(e.status).toBe('pintor_nao_assinou');
    expect(held(e)).toEqual({ guarantee: euros(3_000), advance: 0, fee: 0 });
    expect(settlement(e).plataforma.recebeu).toBe(euros(3_690));
  });
});
