import { describe, expect, it } from 'vitest';
import { allocateRefund, onlinePaymentDue, refundsDue } from './payments';
import { createEngagement } from './engagement';
import { RULES_2026_10_20 } from './rules';
import { euros } from './money';

const e = createEngagement({ id: 'E', base: euros(100_000), advance: 0, rules: RULES_2026_10_20, at: new Date('2026-10-20T10:00:00Z') });

describe('pagamentos online', () => {
  it('o cliente paga a caução; o pintor ainda não paga nada', () => {
    expect(onlinePaymentDue(e, 'cliente')).toEqual({ kind: 'caucao', amount: euros(3_000) });
    expect(onlinePaymentDue(e, 'pintor')).toBeNull();
  });
  it('devoluções em falta descontam o que já foi devolvido', () => {
    const m = [
      { kind: 'devolucao_garantia', amount: 300_000, at: '' },
      { kind: 'devolucao_fee', amount: 369_000, at: '' },
    ] as never;
    expect(refundsDue(m, { caucao: 0, comissao: 0 })).toEqual({ caucao: 300_000, comissao: 369_000 });
    expect(refundsDue(m, { caucao: 300_000, comissao: 0 })).toEqual({ caucao: 0, comissao: 369_000 });
  });
  it('reparte a devolução pelos pagamentos', () => {
    const ps = [
      { id: 'a', amount: 100, refunded: 0, createdAt: '2026-01-01' },
      { id: 'b', amount: 50, refunded: 20, createdAt: '2026-02-01' },
    ];
    expect(allocateRefund(60, ps)).toEqual([
      { id: 'b', amount: 30 },
      { id: 'a', amount: 30 },
    ]);
  });
});
