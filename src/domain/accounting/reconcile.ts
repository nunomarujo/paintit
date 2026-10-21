import type { Cents } from '../money';

// Reconciliação com a Stripe: compara o que a Stripe diz que aconteceu (movimentos de saldo) com o que a plataforma registou
// (pagamentos, mensalidades) e com o saldo do livro (conta 13.1). Pura e testada; os dados vêm de src/lib/stripeSync.ts.

export interface StripeLine {
  id: string;
  type: string;
  category: string;
  amountCents: Cents;
  feeCents: Cents;
  currency: string;
  createdAt: string;
  paymentIntent: string | null;
  invoiceId: string | null;
  description: string | null;
}

export interface PlatformPayment {
  paymentIntent: string;
  kind: 'comissao' | 'caucao';
  amountCents: Cents;
  refundedCents: Cents;
}

export interface ReconcileInput {
  lines: StripeLine[];
  payments: PlatformPayment[];
  subscriptions: { invoiceId: string; amountCents: Cents }[];
  payouts: { id: string; amountCents: Cents; status: string }[];
  /** Saldo do livro na conta 13.1 (Stripe), em cêntimos. */
  ledgerCents: Cents;
  /** Saldo da Stripe (disponível + pendente), em cêntimos; null se ainda não foi lido. */
  stripeCents: Cents | null;
}

export type DiscrepancyKind = 'cobranca_nao_registada' | 'valor_diferente' | 'reembolso_diferente' | 'pagamento_sem_cobranca' | 'movimento_a_rever';

export interface Discrepancy {
  kind: DiscrepancyKind;
  ref: string;
  stripeCents: Cents | null;
  platformCents: Cents | null;
  detail: string;
}

export interface Reconciliation {
  discrepancies: Discrepancy[];
  matchedCharges: number;
  ledgerCents: Cents;
  stripeCents: Cents | null;
  /** livro − Stripe. */
  difference: Cents | null;
  explained: { label: string; cents: Cents }[];
  unexplainedCents: Cents | null;
  reconciled: boolean;
}

/** Categorias de movimento que são normais e já têm tratamento próprio (taxas e transferências). */
const EXPECTED = new Set(['charge', 'refund', 'fee', 'stripe_fee', 'payout', 'payout_reversal']);

export function reconcile(input: ReconcileInput): Reconciliation {
  const discrepancies: Discrepancy[] = [];
  const explained: { label: string; cents: Cents }[] = [];
  const byPi = new Map(input.payments.map((p) => [p.paymentIntent, p]));
  const subs = new Map(input.subscriptions.map((s) => [s.invoiceId, s.amountCents]));
  const chargedPi = new Set<string>();
  const seenInvoices = new Set<string>();
  const refundsByPi = new Map<string, Cents>();
  let matched = 0;
  let unregistered = 0;
  let mismatch = 0;

  for (const l of input.lines) {
    if (l.category === 'charge') {
      if (l.paymentIntent && byPi.has(l.paymentIntent)) {
        const p = byPi.get(l.paymentIntent)!;
        chargedPi.add(l.paymentIntent);
        if (p.amountCents === l.amountCents) matched++;
        else {
          mismatch += p.amountCents - l.amountCents;
          discrepancies.push({ kind: 'valor_diferente', ref: l.paymentIntent, stripeCents: l.amountCents, platformCents: p.amountCents, detail: 'O valor cobrado na Stripe é diferente do registado na plataforma.' });
        }
      } else if (l.invoiceId && subs.has(l.invoiceId)) {
        seenInvoices.add(l.invoiceId);
        const amount = subs.get(l.invoiceId)!;
        if (amount === l.amountCents) matched++;
        else {
          mismatch += amount - l.amountCents;
          discrepancies.push({ kind: 'valor_diferente', ref: l.invoiceId, stripeCents: l.amountCents, platformCents: amount, detail: 'A mensalidade registada tem valor diferente do cobrado.' });
        }
      } else if (l.paymentIntent || l.invoiceId) {
        unregistered += l.amountCents;
        discrepancies.push({
          kind: 'cobranca_nao_registada',
          ref: l.paymentIntent ?? l.invoiceId ?? l.id,
          stripeCents: l.amountCents,
          platformCents: null,
          detail: 'A Stripe cobrou, mas a plataforma não registou este pagamento (por exemplo, o aviso da Stripe falhou).',
        });
      } else {
        unregistered += l.amountCents;
        discrepancies.push({ kind: 'movimento_a_rever', ref: l.id, stripeCents: l.amountCents, platformCents: null, detail: `Cobrança sem pagamento associado${l.description ? `: ${l.description}` : ''}.` });
      }
    } else if (l.category === 'refund') {
      if (l.paymentIntent) refundsByPi.set(l.paymentIntent, (refundsByPi.get(l.paymentIntent) ?? 0) + Math.abs(l.amountCents));
      else discrepancies.push({ kind: 'movimento_a_rever', ref: l.id, stripeCents: l.amountCents, platformCents: null, detail: 'Reembolso sem pagamento associado (por exemplo, de uma mensalidade).' });
    } else if (!EXPECTED.has(l.category)) {
      discrepancies.push({ kind: 'movimento_a_rever', ref: l.id, stripeCents: l.amountCents, platformCents: null, detail: `Movimento de tipo «${l.category}»${l.description ? ` (${l.description})` : ''}: rever com o contabilista.` });
    }
  }

  let refundGap = 0;
  for (const p of input.payments) {
    const stripeRefunded = refundsByPi.get(p.paymentIntent) ?? 0;
    if (stripeRefunded !== p.refundedCents) {
      refundGap += stripeRefunded - p.refundedCents;
      discrepancies.push({ kind: 'reembolso_diferente', ref: p.paymentIntent, stripeCents: stripeRefunded, platformCents: p.refundedCents, detail: 'O total reembolsado na Stripe é diferente do registado na plataforma.' });
    }
  }
  let withoutCharge = 0;
  for (const p of input.payments) {
    if (!chargedPi.has(p.paymentIntent) && input.lines.length > 0) {
      withoutCharge += p.amountCents;
      discrepancies.push({ kind: 'pagamento_sem_cobranca', ref: p.paymentIntent, stripeCents: null, platformCents: p.amountCents, detail: 'A plataforma registou um pagamento que não aparece nos movimentos da Stripe (sincronize de novo).' });
    }
  }
  for (const [invoiceId, amount] of subs) {
    if (!seenInvoices.has(invoiceId) && input.lines.length > 0) {
      withoutCharge += amount;
      discrepancies.push({ kind: 'pagamento_sem_cobranca', ref: invoiceId, stripeCents: null, platformCents: amount, detail: 'Mensalidade registada que não aparece nos movimentos da Stripe.' });
    }
  }

  const inTransit = input.payouts.filter((o) => o.status === 'in_transit' || o.status === 'pending').reduce((n, o) => n + o.amountCents, 0);
  // livro − Stripe = (o que a Stripe não tem e o livro sim) − (o que a Stripe tem e o livro não).
  if (unregistered) explained.push({ label: 'Cobranças da Stripe ainda não registadas na plataforma', cents: -unregistered });
  if (mismatch) explained.push({ label: 'Valores registados diferentes dos cobrados', cents: mismatch });
  if (refundGap) explained.push({ label: 'Reembolsos diferentes entre a Stripe e a plataforma', cents: refundGap });
  if (withoutCharge) explained.push({ label: 'Pagamentos registados que não aparecem na Stripe', cents: withoutCharge });
  if (inTransit) explained.push({ label: 'Transferências para o banco a caminho', cents: inTransit });

  const difference = input.stripeCents === null ? null : input.ledgerCents - input.stripeCents;
  const explainedTotal = explained.reduce((n, e) => n + e.cents, 0);
  const unexplained = difference === null ? null : difference - explainedTotal;
  return {
    discrepancies,
    matchedCharges: matched,
    ledgerCents: input.ledgerCents,
    stripeCents: input.stripeCents,
    difference,
    explained,
    unexplainedCents: unexplained,
    reconciled: discrepancies.length === 0 && unexplained === 0,
  };
}
