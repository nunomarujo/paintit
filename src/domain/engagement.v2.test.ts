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

// Percurso v2 (decisão do promotor de 19/10/2026), com o exemplo de 100 000 € e 10% de adiantamento.
const t = (iso: string) => new Date(iso);
const start = () => createEngagement({ id: 'V2', base: euros(100_000), advance: euros(10_000), rules, at: t('2026-10-19T09:00:00Z') });

function presented(): Engagement {
  let e = start();
  expect(clientDepositDue(e)).toBe(euros(3_000)); // só a caução, antes da apresentação
  e = confirmClientDeposit(e, { amount: euros(3_000), at: t('2026-10-19T10:00:00Z') });
  expect(e.status).toBe('aguarda_fee');
  e = painterFeeReceived(e, { amount: euros(3_690), at: t('2026-10-21T10:00:00Z') });
  expect(e.status).toBe('aguarda_adiantamento');
  expect(e.feePaid).toBe(true); // apresentação
  return e;
}

describe('percurso v2: apresentação antes das assinaturas', () => {
  it('percurso completo: caução volta ao cliente na assinatura, adiantamento ao pintor, comissão fica', () => {
    let e = presented();
    expect(clientDepositDue(e)).toBe(euros(10_000));
    e = confirmClientDeposit(e, { amount: euros(10_000), at: t('2026-10-22T10:00:00Z') });
    e = clientSign(e, { at: t('2026-10-23T10:00:00Z') });
    e = painterSign(e, { at: t('2026-10-24T10:00:00Z') });
    expect(e.status).toBe('assinado');
    expect(held(e)).toEqual({ guarantee: 0, advance: 0, fee: 0 });
    expect(settlement(e)).toMatchObject({
      cliente: { entregou: euros(13_000), recebeu: euros(3_000) },
      pintor: { entregou: euros(3_690), recebeu: euros(10_000) },
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
    const e = clientWithdraw(presented(), { at: t('2026-10-22T10:00:00Z') });
    expect(e.status).toBe('cliente_desistiu');
    expect(settlement(e)).toMatchObject({
      cliente: { entregou: euros(3_000), recebeu: 0 },
      pintor: { entregou: euros(3_690), recebeu: euros(3_690) },
      plataforma: { recebeu: euros(3_000) },
    });
  });

  it('o cliente que não avança no prazo depois da apresentação é tratado como desistência', () => {
    const e = expire(presented(), t('2026-10-31T00:00:00Z'));
    expect(e.status).toBe('cliente_desistiu');
    expect(settlement(e).plataforma.recebeu).toBe(euros(3_000));
  });

  it('o pintor que não paga: a caução transita para outra proposta', () => {
    const e = expire(confirmClientDeposit(start(), { amount: euros(3_000), at: t('2026-10-19T10:00:00Z') }), t('2026-10-28T00:00:00Z'));
    expect(e.status).toBe('pintor_nao_pagou');
    const r = carryToNext(e, { at: t('2026-10-28T10:00:00Z'), to: 'V3' });
    expect(r.carried).toEqual({ from: 'V2', guarantee: euros(3_000), advance: 0 });
  });

  it('o pintor que não assina perde a comissão; cliente recupera adiantamento e caução pode transitar', () => {
    let e = confirmClientDeposit(presented(), { amount: euros(10_000), at: t('2026-10-22T10:00:00Z') });
    e = clientSign(e, { at: t('2026-10-23T10:00:00Z') });
    e = expire(e, t('2026-11-02T00:00:00Z'));
    expect(e.status).toBe('pintor_nao_assinou');
    expect(held(e)).toEqual({ guarantee: euros(3_000), advance: 0, fee: 0 });
    expect(settlement(e).plataforma.recebeu).toBe(euros(3_690));
  });

  it('sem adiantamento, passa direto à assinatura do cliente', () => {
    let e = createEngagement({ id: 'V4', base: euros(20_000), advance: 0, rules, at: t('2026-10-19T09:00:00Z') });
    e = confirmClientDeposit(e, { amount: euros(600), at: t('2026-10-19T10:00:00Z') });
    e = painterFeeReceived(e, { amount: e.fee.gross, at: t('2026-10-20T10:00:00Z') });
    expect(e.status).toBe('aguarda_assinatura_cliente');
  });
});
