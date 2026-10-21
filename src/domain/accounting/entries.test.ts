import { describe, expect, it } from 'vitest';
import { ACCOUNT_LIST } from './accounts';
import {
  assertBalanced,
  commissionReceived,
  depositReceived,
  guaranteeRetained,
  redemptionInvoiced,
  redemptionPaid,
  referralAccrued,
  refundIssued,
  reverse,
  splitGross,
  subscriptionReceived,
  sum,
} from './entries';

const D = '2026-10-21';

describe('livro de movimentos: lançamentos', () => {
  it('separa o IVA de um valor com IVA incluído', () => {
    expect(splitGross(18_450, 2_300)).toEqual({ net: 15_000, vat: 3_450 });
    expect(splitGross(33_825, 2_300)).toEqual({ net: 27_500, vat: 6_325 });
    expect(splitGross(0, 2_300)).toEqual({ net: 0, vat: 0 });
    const odd = splitGross(12_345, 2_300);
    expect(odd.net + odd.vat).toBe(12_345);
  });

  it('a comissão do pintor é rendimento mais IVA liquidado', () => {
    const p = commissionReceived({ paymentIntent: 'pi_1', gross: 18_450, data: D });
    expect(p.lines).toEqual([
      { conta: '13.1', debito: 18_450, credito: 0 },
      { conta: '72.1', debito: 0, credito: 15_000 },
      { conta: '24.33', debito: 0, credito: 3_450 },
    ]);
  });

  it('a caução não é rendimento: entra e sai do passivo; só a retida é rendimento com IVA', () => {
    const dep = depositReceived({ paymentIntent: 'pi_2', gross: 15_000, data: D });
    expect(dep.lines.map((l) => l.conta)).toEqual(['13.1', '27.8.1']);
    const back = refundIssued({ kind: 'caucao', paymentIntent: 'pi_2', cumulative: 15_000, delta: 15_000, data: D });
    expect(back.lines).toEqual([
      { conta: '27.8.1', debito: 15_000, credito: 0 },
      { conta: '13.1', debito: 0, credito: 15_000 },
    ]);
    const kept = guaranteeRetained({ engagementId: 'e1', cumulative: 15_000, delta: 15_000, data: D });
    expect(kept.lines).toEqual([
      { conta: '27.8.1', debito: 15_000, credito: 0 },
      { conta: '72.3', debito: 0, credito: 12_195 },
      { conta: '24.33', debito: 0, credito: 2_805 },
    ]);
  });

  it('devolver a comissão estorna rendimento e IVA', () => {
    const p = refundIssued({ kind: 'comissao', paymentIntent: 'pi_1', cumulative: 18_450, delta: 18_450, data: D });
    expect(sum(p.lines, 'debito')).toBe(18_450);
    expect(p.lines.find((l) => l.conta === '72.1')?.debito).toBe(15_000);
    expect(p.lines.find((l) => l.conta === '24.33')?.debito).toBe(3_450);
    expect(p.origemId).toBe('pi_1:18450');
  });

  it('a mensalidade usa o IVA do Stripe, ou 23% se faltar', () => {
    const a = subscriptionReceived({ invoiceId: 'in_1', gross: 4_797, vat: 897, data: D });
    expect(a.lines.find((l) => l.conta === '72.2')?.credito).toBe(3_900);
    const b = subscriptionReceived({ invoiceId: 'in_2', gross: 4_797, vat: null, data: D });
    expect(b.lines.find((l) => l.conta === '24.33')?.credito).toBe(897);
  });

  it('comissão de adesão: gasto na adjudicação paga, IVA na fatura, pagamento com retenção', () => {
    const acc = referralAccrued({ payoutId: 'p1', amount: 10_000, data: D });
    expect(acc.lines).toEqual([
      { conta: '62.2.1', debito: 10_000, credito: 0 },
      { conta: '22.1', debito: 0, credito: 10_000 },
    ]);
    expect(redemptionInvoiced({ redemptionId: 'r1', vat: 0, data: D })).toBeNull();
    const inv = redemptionInvoiced({ redemptionId: 'r1', vat: 2_300, data: D })!;
    expect(inv.lines[0]).toEqual({ conta: '24.32', debito: 2_300, credito: 0 });
    // 100 € + 23 € de IVA − 25 € de retenção = 98 € ao fornecedor.
    const paid = redemptionPaid({ redemptionId: 'r1', base: 10_000, vat: 2_300, retention: 2_500, net: 9_800, data: D });
    expect(paid.lines).toEqual([
      { conta: '22.1', debito: 12_300, credito: 0 },
      { conta: '24.2', debito: 0, credito: 2_500 },
      { conta: '12.1', debito: 0, credito: 9_800 },
    ]);
    expect(() => redemptionPaid({ redemptionId: 'r2', base: 10_000, vat: 0, retention: 0, net: 9_999, data: D })).toThrow(/não fecham/);
  });

  it('a conta do fornecedor fecha a zero depois de acumular, faturar e pagar', () => {
    const all = [
      referralAccrued({ payoutId: 'p1', amount: 10_000, data: D }),
      redemptionInvoiced({ redemptionId: 'r1', vat: 2_300, data: D })!,
      redemptionPaid({ redemptionId: 'r1', base: 10_000, vat: 2_300, retention: 0, net: 12_300, data: D }),
    ].flatMap((p) => p.lines);
    const balance = all.filter((l) => l.conta === '22.1').reduce((n, l) => n + l.credito - l.debito, 0);
    expect(balance).toBe(0);
  });

  it('estorno troca débitos e créditos e anula o efeito', () => {
    const p = commissionReceived({ paymentIntent: 'pi_9', gross: 18_450, data: D });
    const r = reverse(p, '2026-10-22');
    expect(r.origem).toBe('stripe_comissao_estorno');
    const net = [...p.lines, ...r.lines].reduce((n, l) => n + l.debito - l.credito, 0);
    expect(net).toBe(0);
    for (const c of ['13.1', '72.1', '24.33']) {
      expect([...p.lines, ...r.lines].filter((l) => l.conta === c).reduce((n, l) => n + l.debito - l.credito, 0)).toBe(0);
    }
  });

  it('recusa lançamentos desequilibrados, com uma só linha ou com valores inválidos', () => {
    const base = { origem: 'x', origemId: '1', data: D, descricao: 'x' };
    expect(() => assertBalanced({ ...base, lines: [{ conta: '13.1', debito: 100, credito: 0 }, { conta: '72.1', debito: 0, credito: 99 }] })).toThrow(/desequilibrado/);
    expect(() => assertBalanced({ ...base, lines: [{ conta: '13.1', debito: 100, credito: 0 }] })).toThrow(/duas linhas/);
    expect(() => assertBalanced({ ...base, lines: [{ conta: '13.1', debito: 100.5, credito: 0 }, { conta: '72.1', debito: 0, credito: 100.5 }] })).toThrow(/inválida/);
  });

  it('todas as contas usadas existem no plano e têm códigos únicos', () => {
    const codes = ACCOUNT_LIST.map((a) => a.codigo);
    expect(new Set(codes).size).toBe(codes.length);
    for (const c of ['13.1', '72.1', '24.33', '27.8.1', '72.3', '72.2', '62.2.1', '22.1', '24.32', '24.2', '12.1']) expect(codes).toContain(c);
  });
});
