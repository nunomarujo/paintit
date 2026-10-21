import { describe, expect, it } from 'vitest';
import { planPostings, type PlanSources } from './plan';
import { sum } from './entries';

const empty: PlanSources = { payments: [], retentions: [], payouts: [], redemptions: [], subscriptions: [], stripeFees: [], stripePayouts: [], posted: new Set(), today: '2026-10-21', day: (iso) => iso.slice(0, 10) };
const key = (p: { origem: string; origemId: string }) => `${p.origem}|${p.origemId}`;

describe('livro de movimentos: o que falta lançar', () => {
  const src: PlanSources = {
    ...empty,
    payments: [
      { kind: 'caucao', paymentIntent: 'pi_c', amountCents: 15_000, refundedCents: 15_000, createdAt: '2026-10-20T10:00:00Z' },
      { kind: 'comissao', paymentIntent: 'pi_f', amountCents: 18_450, refundedCents: 0, createdAt: '2026-10-20T11:00:00Z' },
    ],
    retentions: [{ engagementId: 'e1', totalCents: 5_000, lastAt: '2026-10-21T09:00:00Z' }],
    payouts: [
      { id: 'y1', amountCents: 343, estado: 'adjudicada', feeRecebidoEm: '2026-10-20T11:00:00Z' },
      { id: 'y2', amountCents: 500, estado: 'adjudicada', feeRecebidoEm: null },
    ],
    redemptions: [{ id: 'r1', estado: 'paga', comissaoCents: 343, ivaCents: 79, retencaoCents: 86, liquidoCents: 336, invoiceEm: '2026-10-21T08:00:00Z', pagaEm: '2026-10-21T09:00:00Z' }],
    subscriptions: [{ invoiceId: 'in_1', amountCents: 4_797, vatCents: 897, paidAt: '2026-10-19T12:00:00Z' }],
    stripeFees: [
      { id: 'txn_1', feeCents: 320, createdAt: '2026-10-20T11:00:00Z' },
      { id: 'txn_2', feeCents: 0, createdAt: '2026-10-20T11:30:00Z' },
    ],
    stripePayouts: [
      { id: 'po_1', amountCents: 10_000, status: 'paid', arrivalAt: '2026-10-21T00:00:00Z' },
      { id: 'po_2', amountCents: 5_000, status: 'in_transit', arrivalAt: '2026-10-23T00:00:00Z' },
    ],
  };

  it('lança tudo uma vez e todos os lançamentos fecham', () => {
    const plan = planPostings(src);
    expect(plan.map((p) => p.origem).sort()).toEqual(
      ['caucao_retida', 'comissao_adesao', 'resgate_fatura', 'resgate_pago', 'stripe_caucao', 'stripe_comissao', 'stripe_payout', 'stripe_reembolso', 'stripe_subscricao', 'stripe_taxa'].sort(),
    );
    for (const p of plan) expect(sum(p.lines, 'debito')).toBe(sum(p.lines, 'credito'));
    // A comissão do fornecedor que ainda não entrou na conta não é gasto.
    expect(plan.some((p) => p.origemId === 'y2')).toBe(false);
    // Só as taxas com valor e só as transferências já chegadas ao banco.
    expect(plan.filter((p) => p.origem === 'stripe_taxa')).toHaveLength(1);
    expect(plan.filter((p) => p.origem === 'stripe_payout').map((p) => p.origemId)).toEqual(['po_1']);
  });

  it('é idempotente: correr de novo sobre o mesmo estado não lança nada', () => {
    const first = planPostings(src);
    const again = planPostings({ ...src, posted: new Set(first.map(key)) });
    expect(again).toEqual([]);
  });

  it('só lança a diferença de reembolsos e de caução retida', () => {
    const first = planPostings(src);
    const posted = new Set(first.map(key));
    const more = planPostings({
      ...src,
      posted,
      payments: [{ ...src.payments[1]!, refundedCents: 18_450 }, src.payments[0]!],
      retentions: [{ engagementId: 'e1', totalCents: 8_000, lastAt: '2026-10-22T09:00:00Z' }],
    });
    const refund = more.find((p) => p.origem === 'stripe_reembolso')!;
    expect(sum(refund.lines, 'debito')).toBe(18_450);
    const kept = more.find((p) => p.origem === 'caucao_retida')!;
    expect(sum(kept.lines, 'debito')).toBe(3_000);
    expect(more).toHaveLength(2);
  });

  it('estorna a comissão de adesão que fica sem efeito, e só se já estava lançada', () => {
    const accrued = planPostings(src).find((p) => p.origem === 'comissao_adesao')!;
    const voided = { ...src, payouts: [{ id: 'y1', amountCents: 343, estado: 'sem_efeito', feeRecebidoEm: '2026-10-20T11:00:00Z' }] };
    expect(planPostings({ ...voided, posted: new Set([key(accrued)]) }).map((p) => p.origem)).toContain('comissao_adesao_estorno');
    expect(planPostings(voided).map((p) => p.origem)).not.toContain('comissao_adesao');
    expect(planPostings(voided).map((p) => p.origem)).not.toContain('comissao_adesao_estorno');
  });

  it('um resgate anulado estorna o IVA da fatura se já estava lançado', () => {
    const r = { id: 'r9', estado: 'anulado', comissaoCents: 343, ivaCents: 79, retencaoCents: 0, liquidoCents: 422, invoiceEm: '2026-10-21T08:00:00Z', pagaEm: null };
    const inv = planPostings({ ...empty, redemptions: [{ ...r, estado: 'fatura_recebida' }] })[0]!;
    expect(inv.origem).toBe('resgate_fatura');
    const plan = planPostings({ ...empty, redemptions: [r], posted: new Set([key(inv)]) });
    expect(plan.map((p) => p.origem)).toEqual(['resgate_fatura_estorno']);
  });
});
