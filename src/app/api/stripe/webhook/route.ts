import type Stripe from 'stripe';
import { fromStripeStatus, isSupplierPlan, monthlyPrice } from '@/domain/subscription';
import { stripe } from '@/lib/stripe';
import { adminClient } from '@/lib/supabase/admin';
import { recordStripePayment } from '@/lib/payments';

/** Fim do período já pago de uma subscrição, para o desconto durar exactamente até lá. */
async function periodoAte(subscriptionId: string): Promise<string | null> {
  if (!stripe) return null;
  try {
    const sub = await stripe.subscriptions.retrieve(subscriptionId);
    const fim = (sub as unknown as { current_period_end?: number }).current_period_end;
    return fim ? new Date(fim * 1000).toISOString().slice(0, 10) : null;
  } catch {
    return null;
  }
}

// Avisos do Stripe. A assinatura (STRIPE_WEBHOOK_SECRET) prova que vêm do Stripe; só depois
// se escreve na base, com a chave secreta do Supabase.
export async function POST(req: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const db = adminClient();
  if (!stripe || !secret || !db) return new Response('Não configurado', { status: 503 });
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(await req.text(), req.headers.get('stripe-signature') ?? '', secret);
  } catch {
    return new Response('Assinatura inválida', { status: 400 });
  }

  if (event.type === 'checkout.session.completed') {
    const s = event.data.object;
    const m = s.metadata ?? {};
    if (s.mode === 'payment' && s.payment_status === 'paid' && m.engagement_id && (m.kind === 'caucao' || m.kind === 'comissao') && m.user_id) {
      const pi = typeof s.payment_intent === 'string' ? s.payment_intent : s.payment_intent?.id;
      if (!pi || !s.amount_total) return new Response('Sem pagamento', { status: 400 });
      const r = await recordStripePayment({
        engagementId: m.engagement_id,
        kind: m.kind,
        amount: s.amount_total,
        paymentIntent: pi,
        actor: m.user_id,
        at: new Date(event.created * 1000),
      });
      if (!r.ok) return new Response(r.reason ?? 'Erro', { status: 500 });
    } else if (s.mode === 'subscription' && m.org_id && m.plano === 'pro') {
      // Plano Pro de uma empresa de pintura. A linha só passa a activa aqui, com o Stripe a confirmar
      // — o regresso do navegador não serve de prova (25/10/2026, docs/DECISOES.md).
      const subId = typeof s.subscription === 'string' ? s.subscription : (s.subscription?.id ?? null);
      const fim = subId && stripe ? await periodoAte(subId) : null;
      const { error } = await db
        .from('org_subscriptions')
        .update({ estado: 'ativa', stripe_subscription_id: subId, valida_ate: fim })
        .eq('org_id', m.org_id)
        .eq('plano', 'pro')
        .in('estado', ['por_pagar', 'ativa']);
      if (error) return new Response('Erro ao gravar', { status: 500 });
    } else if (s.mode === 'subscription' && m.org_id && isSupplierPlan(m.plan)) {
      const bps = Number(m.discount_bps) || 0;
      const { data: promo } = m.promo_code
        ? await db.from('promo_codes').select('id, uses').eq('code', m.promo_code).maybeSingle()
        : { data: null };
      const { error } = await db.from('supplier_subscriptions').upsert({
        org_id: m.org_id,
        plan: m.plan,
        status: 'ativa',
        price_cents: monthlyPrice(m.plan, bps),
        promo_code_id: promo?.id ?? null,
        discount_bps: bps,
        stripe_subscription_id: typeof s.subscription === 'string' ? s.subscription : (s.subscription?.id ?? null),
        updated_by: null,
        updated_at: new Date().toISOString(),
      });
      if (error) return new Response('Erro ao gravar', { status: 500 });
      if (promo) await db.from('promo_codes').update({ uses: promo.uses + 1 }).eq('id', promo.id);
    }
  } else if (event.type === 'invoice.paid') {
    // Cada mensalidade paga entra no livro de movimentos (src/lib/accounting.ts). Idempotente pelo id da fatura do Stripe.
    const inv = event.data.object;
    if (inv.subscription && inv.amount_paid > 0 && inv.id) {
      const orgId = inv.subscription_details?.metadata?.org_id ?? null;
      const { error } = await db.from('subscription_payments').upsert(
        {
          stripe_invoice_id: inv.id,
          org_id: orgId,
          amount_cents: inv.amount_paid,
          vat_cents: inv.tax ?? null,
          paid_at: new Date((inv.status_transitions?.paid_at ?? event.created) * 1000).toISOString(),
        },
        { onConflict: 'stripe_invoice_id', ignoreDuplicates: true },
      );
      if (error) return new Response('Erro ao gravar', { status: 500 });
    }
  } else if (event.type === 'customer.subscription.updated' || event.type === 'customer.subscription.deleted') {
    const sub = event.data.object;
    await db
      .from('supplier_subscriptions')
      .update({ status: fromStripeStatus(sub.status), updated_at: new Date().toISOString() })
      .eq('stripe_subscription_id', sub.id);

    // O mesmo para o plano Pro das empresas de pintura. Uma renovação paga empurra `valida_ate` para
    // a frente; um pagamento falhado tira o desconto, que é o que o 'por_pagar' significa.
    const fim = (sub as unknown as { current_period_end?: number }).current_period_end;
    const estado = sub.status === 'active' || sub.status === 'trialing' ? 'ativa' : sub.status === 'canceled' ? 'cancelada' : 'por_pagar';
    await db
      .from('org_subscriptions')
      .update({
        estado,
        valida_ate: fim ? new Date(fim * 1000).toISOString().slice(0, 10) : null,
        ...(estado === 'cancelada' ? { cancelada_em: new Date().toISOString() } : {}),
      })
      .eq('stripe_subscription_id', sub.id);
  }
  return new Response('ok');
}
