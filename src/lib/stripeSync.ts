import 'server-only';
import type Stripe from 'stripe';
import { stripe } from '@/lib/stripe';
import { adminClient } from '@/lib/supabase/admin';

// Copia para a base de dados os movimentos de saldo e as transferências da Stripe, e guarda uma fotografia do saldo, para a
// reconciliação (src/domain/accounting/reconcile.ts). Só leitura na Stripe: nunca move dinheiro.

export interface StripeSyncResult {
  lines: number;
  payouts: number;
  balance: { availableCents: number; pendingCents: number } | null;
  errors: string[];
}

const iso = (unix: number) => new Date(unix * 1000).toISOString();
const idOf = (x: string | { id: string } | null | undefined) => (typeof x === 'string' ? x : (x?.id ?? null));

export async function syncStripeData(): Promise<StripeSyncResult> {
  const db = adminClient();
  const out: StripeSyncResult = { lines: 0, payouts: 0, balance: null, errors: [] };
  if (!stripe) return { ...out, errors: ['Stripe não configurada.'] };
  if (!db) return { ...out, errors: ['Sem chave do Supabase.'] };
  try {
    // Incremental, com um dia de sobreposição; a primeira vez traz tudo.
    const { data: latest } = await db.from('stripe_bt').select('created_at').order('created_at', { ascending: false }).limit(1);
    const since = latest?.[0] ? Math.floor(new Date(latest[0].created_at).getTime() / 1000) - 86_400 : undefined;
    const rows: {
      id: string;
      type: string;
      reporting_category: string;
      amount_cents: number;
      fee_cents: number;
      net_cents: number;
      currency: string;
      created_at: string;
      available_on: string;
      source_id: string | null;
      payment_intent: string | null;
      invoice_id: string | null;
      description: string | null;
    }[] = [];
    for await (const bt of stripe.balanceTransactions.list({ limit: 100, ...(since ? { created: { gte: since } } : {}), expand: ['data.source'] })) {
      const src = typeof bt.source === 'object' && bt.source ? (bt.source as Stripe.BalanceTransactionSource) : null;
      let paymentIntent: string | null = null;
      let invoice: string | null = null;
      if (src?.object === 'charge') {
        paymentIntent = idOf(src.payment_intent);
        invoice = idOf(src.invoice);
      } else if (src?.object === 'refund') {
        paymentIntent = idOf(src.payment_intent);
      }
      rows.push({
        id: bt.id,
        type: bt.type,
        reporting_category: bt.reporting_category,
        amount_cents: bt.amount,
        fee_cents: bt.fee,
        net_cents: bt.net,
        currency: bt.currency,
        created_at: iso(bt.created),
        available_on: iso(bt.available_on),
        source_id: idOf(bt.source as string | { id: string } | null),
        payment_intent: paymentIntent,
        invoice_id: invoice,
        description: bt.description ?? null,
      });
    }
    for (let i = 0; i < rows.length; i += 200) {
      const { error } = await db.from('stripe_bt').upsert(rows.slice(i, i + 200), { onConflict: 'id' });
      if (error) throw new Error(`Gravar movimentos: ${error.message}`);
    }
    out.lines = rows.length;

    const payouts: { id: string; amount_cents: number; status: string; currency: string; created_at: string; arrival_at: string }[] = [];
    for await (const p of stripe.payouts.list({ limit: 100 })) {
      payouts.push({ id: p.id, amount_cents: p.amount, status: p.status, currency: p.currency, created_at: iso(p.created), arrival_at: iso(p.arrival_date) });
    }
    if (payouts.length) {
      const { error } = await db.from('stripe_payouts').upsert(payouts, { onConflict: 'id' });
      if (error) throw new Error(`Gravar transferências: ${error.message}`);
    }
    out.payouts = payouts.length;

    const b = await stripe.balance.retrieve();
    const sum = (list: { amount: number; currency: string }[]) => list.filter((x) => x.currency === 'eur').reduce((n, x) => n + x.amount, 0);
    out.balance = { availableCents: sum(b.available), pendingCents: sum(b.pending) };
    const { error } = await db.from('stripe_balance_snapshots').insert({ available_cents: out.balance.availableCents, pending_cents: out.balance.pendingCents, currency: 'eur' });
    if (error) throw new Error(`Gravar saldo: ${error.message}`);
  } catch (e) {
    out.errors.push(e instanceof Error ? e.message : String(e));
  }
  return out;
}
