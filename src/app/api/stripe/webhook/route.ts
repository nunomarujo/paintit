import type Stripe from 'stripe';
import { fromStripeStatus, isSupplierPlan, monthlyPrice } from '@/domain/subscription';
import { stripe } from '@/lib/stripe';
import { adminClient } from '@/lib/supabase/admin';

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
    if (s.mode === 'subscription' && m.org_id && isSupplierPlan(m.plan)) {
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
  } else if (event.type === 'customer.subscription.updated' || event.type === 'customer.subscription.deleted') {
    const sub = event.data.object;
    await db
      .from('supplier_subscriptions')
      .update({ status: fromStripeStatus(sub.status), updated_at: new Date().toISOString() })
      .eq('stripe_subscription_id', sub.id);
  }
  return new Response('ok');
}
