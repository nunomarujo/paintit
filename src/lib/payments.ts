import 'server-only';
import { isRevealed } from '@/domain/contracting';
import { allocateRefund, refundsDue, type PaymentKind } from '@/domain/payments';
import { loadReplay } from '@/lib/engagements';
import { notifyEngagementChange } from '@/lib/notify';
import { stripe } from '@/lib/stripe';
import { adminClient } from '@/lib/supabase/admin';

// Execução no Stripe do que o motor de regras decide. Só corre no servidor, com a
// chave secreta do Supabase (o webhook e as devoluções não têm utilizador).

/** Regista um pagamento confirmado pelo Stripe como acontecimento da contratação. */
export async function recordStripePayment(p: {
  engagementId: string;
  kind: PaymentKind;
  amount: number;
  paymentIntent: string;
  actor: string;
  at: Date;
}): Promise<{ ok: boolean; reason?: string }> {
  const db = adminClient();
  if (!db) return { ok: false, reason: 'Sem chave do Supabase.' };
  const { data: already } = await db.from('stripe_payments').select('id').eq('payment_intent', p.paymentIntent).maybeSingle();
  if (already) return { ok: true };
  const { data: row } = await db.from('engagements').select('*').eq('id', p.engagementId).maybeSingle();
  if (!row) return { ok: false, reason: 'Contratação não encontrada.' };

  const kind = p.kind === 'caucao' ? 'deposito_confirmado' : 'fee_recebido';
  const candidate = { id: 'novo', kind, amount: p.amount, payload: {}, at: p.at.toISOString() } as const;
  const before = (await loadReplay(db, row, p.at)).replay.engagement;
  const { replay: after } = await loadReplay(db, row, p.at, [candidate]);
  const refused = after.rejected.find((r) => r.event.id === 'novo');
  // Mesmo recusado pelas regras (ex.: fora de prazo), o dinheiro entrou: guarda-se o pagamento e devolve-se.
  if (!refused) {
    const reveal = kind === 'fee_recebido' && !isRevealed(before) && isRevealed(after.engagement);
    const { error } = await db.from('engagement_events').insert({
      engagement_id: p.engagementId,
      kind,
      amount_cents: p.amount,
      payload: { fonte: 'stripe', payment_intent: p.paymentIntent },
      reveal,
      actor: p.actor,
      at: p.at.toISOString(),
    });
    if (error) return { ok: false, reason: error.message };
  }
  const { error } = await db.from('stripe_payments').insert({
    engagement_id: p.engagementId,
    kind: p.kind,
    amount_cents: p.amount,
    payment_intent: p.paymentIntent,
  });
  if (error) return { ok: false, reason: error.message };
  if (refused) await refundPayment(p.paymentIntent, p.amount, 'recusado pelas regras: ' + refused.reason);
  else {
    await settleRefunds(p.engagementId);
    await notifyEngagementChange(p.engagementId, before.status, after.engagement.status).catch(() => undefined);
  }
  return { ok: true };
}

async function refundPayment(paymentIntent: string, amount: number, reason: string) {
  const db = adminClient();
  if (!db || !stripe) return;
  const { data: pay } = await db.from('stripe_payments').select('*').eq('payment_intent', paymentIntent).maybeSingle();
  if (!pay || pay.refunded_cents + amount > pay.amount_cents) return;
  await stripe.refunds.create(
    { payment_intent: paymentIntent, amount, metadata: { motivo: reason.slice(0, 450) } },
    { idempotencyKey: `${pay.id}:${pay.refunded_cents + amount}` },
  );
  await db.from('stripe_payments').update({ refunded_cents: pay.refunded_cents + amount }).eq('id', pay.id);
}

/** Executa no Stripe as devoluções que as regras mandam fazer e que ainda faltam. */
export async function settleRefunds(engagementId: string): Promise<void> {
  const db = adminClient();
  if (!db || !stripe) return;
  const { data: row } = await db.from('engagements').select('*').eq('id', engagementId).maybeSingle();
  if (!row) return;
  const { data: pays } = await db.from('stripe_payments').select('*').eq('engagement_id', engagementId);
  if (!pays?.length) return;
  const { replay } = await loadReplay(db, row);
  const refunded = { caucao: 0, comissao: 0 };
  for (const p of pays) refunded[p.kind as PaymentKind] += p.refunded_cents;
  const due = refundsDue(replay.engagement.movements, refunded);
  for (const kind of ['caucao', 'comissao'] as const) {
    if (due[kind] <= 0) continue;
    const parts = allocateRefund(
      due[kind],
      pays.filter((p) => p.kind === kind).map((p) => ({ id: p.id, amount: p.amount_cents, refunded: p.refunded_cents, createdAt: p.created_at })),
    );
    for (const part of parts) {
      const pay = pays.find((p) => p.id === part.id)!;
      await refundPayment(pay.payment_intent, part.amount, kind === 'caucao' ? 'devolução da caução' : 'devolução da comissão');
    }
  }
}
