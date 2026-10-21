import { describe, expect, it } from 'vitest';
import { reconcile, type ReconcileInput, type StripeLine } from './reconcile';

const line = (o: Partial<StripeLine> & { id: string }): StripeLine => ({ type: 'charge', category: 'charge', amountCents: 0, feeCents: 0, currency: 'eur', createdAt: '2026-10-20T10:00:00Z', paymentIntent: null, invoiceId: null, description: null, ...o });

describe('reconciliação com a Stripe', () => {
  const base: ReconcileInput = {
    lines: [
      line({ id: 'txn_1', amountCents: 15_000, feeCents: 300, paymentIntent: 'pi_c' }),
      line({ id: 'txn_2', amountCents: 18_450, feeCents: 400, paymentIntent: 'pi_f' }),
      line({ id: 'txn_3', category: 'refund', type: 'refund', amountCents: -15_000, paymentIntent: 'pi_c' }),
      line({ id: 'txn_4', amountCents: 4_797, feeCents: 120, invoiceId: 'in_1' }),
      line({ id: 'txn_5', category: 'payout', type: 'payout', amountCents: -10_000 }),
    ],
    payments: [
      { paymentIntent: 'pi_c', kind: 'caucao', amountCents: 15_000, refundedCents: 15_000 },
      { paymentIntent: 'pi_f', kind: 'comissao', amountCents: 18_450, refundedCents: 0 },
    ],
    subscriptions: [{ invoiceId: 'in_1', amountCents: 4_797 }],
    payouts: [{ id: 'po_1', amountCents: 10_000, status: 'paid' }],
    ledgerCents: 0,
    stripeCents: 0,
  };
  // Saldo da Stripe = Σ líquidos: (15000-300) + (18450-400) + (-15000) + (4797-120) + (-10000) = 12.727 ; no livro, com taxas e payouts lançados, o mesmo.
  const balanced = { ...base, ledgerCents: 12_727, stripeCents: 12_727 };

  it('tudo registado e lançado: reconciliado', () => {
    const r = reconcile(balanced);
    expect(r.discrepancies).toEqual([]);
    expect(r.matchedCharges).toBe(3);
    expect(r.difference).toBe(0);
    expect(r.unexplainedCents).toBe(0);
    expect(r.reconciled).toBe(true);
  });

  it('apanha a cobrança que a plataforma não registou e explica a diferença', () => {
    // A Stripe cobrou 18 450 € em pi_f, mas a plataforma não o registou (o caso real de 21/10/2026).
    const r = reconcile({ ...balanced, payments: [balanced.payments[0]!], ledgerCents: 12_727 - 18_450 });
    expect(r.discrepancies.map((d) => d.kind)).toEqual(['cobranca_nao_registada']);
    expect(r.discrepancies[0]).toMatchObject({ ref: 'pi_f', stripeCents: 18_450, platformCents: null });
    expect(r.difference).toBe(-18_450);
    expect(r.explained).toEqual([{ label: expect.stringContaining('não registadas'), cents: -18_450 }]);
    expect(r.unexplainedCents).toBe(0);
    expect(r.reconciled).toBe(false);
  });

  it('assinala valores e reembolsos diferentes', () => {
    const r = reconcile({
      ...balanced,
      payments: [
        { paymentIntent: 'pi_c', kind: 'caucao', amountCents: 15_000, refundedCents: 0 },
        { paymentIntent: 'pi_f', kind: 'comissao', amountCents: 18_000, refundedCents: 0 },
      ],
    });
    expect(r.discrepancies.map((d) => d.kind).sort()).toEqual(['reembolso_diferente', 'valor_diferente']);
  });

  it('transferências a caminho explicam a diferença sem serem erro', () => {
    const r = reconcile({ ...balanced, payouts: [{ id: 'po_2', amountCents: 5_000, status: 'in_transit' }], ledgerCents: 12_727 + 5_000 });
    expect(r.explained).toEqual([{ label: expect.stringContaining('a caminho'), cents: 5_000 }]);
    expect(r.unexplainedCents).toBe(0);
    expect(r.reconciled).toBe(true);
  });

  it('o que não se explica fica à vista', () => {
    const r = reconcile({ ...balanced, ledgerCents: 12_727 + 777 });
    expect(r.unexplainedCents).toBe(777);
    expect(r.reconciled).toBe(false);
  });

  it('movimentos de outros tipos pedem revisão e entram na diferença explicada', () => {
    const lines = [...balanced.lines, line({ id: 'txn_9', category: 'dispute', type: 'adjustment', amountCents: -2_000, description: 'Chargeback' })];
    const r = reconcile({ ...balanced, lines, ledgerCents: 12_727, stripeCents: 12_727 - 2_000 });
    expect(r.discrepancies.map((d) => [d.kind, d.lineId])).toEqual([['movimento_a_rever', 'txn_9']]);
    expect(r.explained).toEqual([{ label: expect.stringContaining('por tratar'), cents: 2_000 }]);
    expect(r.unexplainedCents).toBe(0);
    expect(r.reconciled).toBe(false);
  });

  it('o que a equipa reviu e deixou fora do livro deixa de ser diferença e fecha a conta', () => {
    const lines = [...balanced.lines, line({ id: 'txn_9', category: 'platform_earning', type: 'charge', amountCents: 300, description: 'teste' }), line({ id: 'txn_10', category: 'charge', amountCents: 10_000, paymentIntent: 'pi_teste' })];
    const open = reconcile({ ...balanced, lines, ledgerCents: 12_727, stripeCents: 12_727 + 10_300 });
    expect(open.discrepancies.map((d) => d.lineId).sort()).toEqual(['txn_10', 'txn_9']);
    const done = reconcile({ ...balanced, lines, ledgerCents: 12_727, stripeCents: 12_727 + 10_300, reviewed: new Set(['txn_9', 'txn_10']) });
    expect(done.discrepancies).toEqual([]);
    expect(done.unexplainedCents).toBe(0);
    expect(done.reconciled).toBe(true);
  });

  it('pagamento registado que a Stripe não mostra', () => {
    const r = reconcile({ ...balanced, payments: [...balanced.payments, { paymentIntent: 'pi_x', kind: 'caucao', amountCents: 9_000, refundedCents: 0 }] });
    expect(r.discrepancies.map((d) => d.kind)).toEqual(['pagamento_sem_cobranca']);
  });

  it('sem saldo da Stripe lido, não conclui', () => {
    const r = reconcile({ ...balanced, stripeCents: null });
    expect(r.difference).toBeNull();
    expect(r.reconciled).toBe(false);
  });
});
