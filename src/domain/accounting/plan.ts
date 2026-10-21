import { stripeFee, stripePayout, commissionReceived, depositReceived, guaranteeRetained, redemptionInvoiced, redemptionPaid, referralAccrued, refundIssued, reverse, subscriptionReceived, type Posting } from './entries';

// Decide que lançamentos faltam, a partir do que existe e do que já está lançado. Pura e determinística: a gravação
// (src/lib/accounting.ts) só envia o resultado. Correr duas vezes sobre o mesmo estado não lança nada de novo.

export interface PlanSources {
  payments: { kind: 'comissao' | 'caucao'; paymentIntent: string; amountCents: number; refundedCents: number; createdAt: string }[];
  /** Caução retida por contratação, no total (do motor de regras), e quando foi a última retenção. */
  retentions: { engagementId: string; totalCents: number; lastAt: string | null }[];
  payouts: { id: string; amountCents: number; estado: string; feeRecebidoEm: string | null }[];
  redemptions: { id: string; estado: string; comissaoCents: number; ivaCents: number; retencaoCents: number; liquidoCents: number; invoiceEm: string | null; pagaEm: string | null }[];
  subscriptions: { invoiceId: string; amountCents: number; vatCents: number | null; paidAt: string }[];
  /** Taxas da Stripe por movimento de saldo (só as com valor) e transferências para o banco. */
  stripeFees: { id: string; feeCents: number; createdAt: string }[];
  stripePayouts: { id: string; amountCents: number; status: string; arrivalAt: string | null }[];
  /** Pares `origem|origemId` já lançados. */
  posted: Set<string>;
  /** Data (AAAA-MM-DD) de hoje em Lisboa e conversor de instante para data de Lisboa. */
  today: string;
  day: (iso: string) => string;
}

const key = (p: Posting) => `${p.origem}|${p.origemId}`;

export function planPostings(src: PlanSources): Posting[] {
  const seen = new Set(src.posted);
  const out: Posting[] = [];
  const add = (p: Posting | null) => {
    if (!p || seen.has(key(p))) return;
    seen.add(key(p));
    out.push(p);
  };
  const maxCumulative = (origem: string, id: string) =>
    [...src.posted].filter((k) => k.startsWith(`${origem}|${id}:`)).reduce((n, k) => Math.max(n, Number(k.split(':').pop())), 0);

  for (const p of src.payments) {
    const data = src.day(p.createdAt);
    add(p.kind === 'comissao' ? commissionReceived({ paymentIntent: p.paymentIntent, gross: p.amountCents, data }) : depositReceived({ paymentIntent: p.paymentIntent, gross: p.amountCents, data }));
    const delta = p.refundedCents - maxCumulative('stripe_reembolso', p.paymentIntent);
    if (delta > 0) add(refundIssued({ kind: p.kind, paymentIntent: p.paymentIntent, cumulative: p.refundedCents, delta, data: src.today }));
  }

  for (const r of src.retentions) {
    const delta = r.totalCents - maxCumulative('caucao_retida', r.engagementId);
    if (delta > 0) add(guaranteeRetained({ engagementId: r.engagementId, cumulative: r.totalCents, delta, data: r.lastAt ? src.day(r.lastAt) : src.today }));
  }

  for (const y of src.payouts) {
    if (!y.feeRecebidoEm) continue;
    const accrual = referralAccrued({ payoutId: y.id, amount: y.amountCents, data: src.day(y.feeRecebidoEm) });
    if (y.estado === 'sem_efeito') {
      if (src.posted.has(key(accrual))) add(reverse(accrual, src.today));
    } else add(accrual);
  }

  for (const r of src.redemptions) {
    if (r.invoiceEm && r.estado !== 'pedido') {
      const inv = redemptionInvoiced({ redemptionId: r.id, vat: r.ivaCents, data: src.day(r.invoiceEm) });
      if (r.estado === 'anulado') {
        if (inv && src.posted.has(key(inv))) add(reverse(inv, src.today));
      } else add(inv);
    }
    if (r.estado === 'paga' && r.pagaEm) {
      add(redemptionPaid({ redemptionId: r.id, base: r.comissaoCents, vat: r.ivaCents, retention: r.retencaoCents, net: r.liquidoCents, data: src.day(r.pagaEm) }));
    }
  }

  for (const s of src.subscriptions) add(subscriptionReceived({ invoiceId: s.invoiceId, gross: s.amountCents, vat: s.vatCents, data: src.day(s.paidAt) }));

  for (const f of src.stripeFees) if (f.feeCents > 0) add(stripeFee({ btId: f.id, fee: f.feeCents, data: src.day(f.createdAt) }));
  // Só as transferências já chegadas ao banco; as a caminho são uma diferença explicada na reconciliação.
  for (const o of src.stripePayouts) if (o.status === 'paid' && o.amountCents > 0) add(stripePayout({ payoutId: o.id, amount: o.amountCents, data: src.day(o.arrivalAt ?? src.today) }));
  return out;
}
