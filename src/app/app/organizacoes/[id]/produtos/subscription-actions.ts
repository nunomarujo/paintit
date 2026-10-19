'use server';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import type { FormState } from '@/app/app/actions';
import { BRAND } from '@/config/brand';
import { STRIPE_TEST_PRICES, isSupplierPlan } from '@/domain/subscription';
import { canManage, myRole } from '@/lib/access';
import { stripe } from '@/lib/stripe';
import { getUser } from '@/lib/supabase/server';

// Pagamento da mensalidade no Stripe Checkout. O plano fica ativo só quando o Stripe
// confirma o pagamento (src/app/api/stripe/webhook), nunca pelo regresso do navegador.
export async function startSubscription(orgId: string, plan: string, _prev: FormState, form: FormData): Promise<FormState> {
  if (!stripe) return { errors: {}, message: 'Pagamentos ainda não configurados.' };
  if (!isSupplierPlan(plan)) return { errors: {}, message: 'Plano inválido.' };
  const { supabase, user } = await getUser();
  if (!user) return { errors: {}, message: 'A sessão expirou.' };
  const { data: org } = await supabase.from('organizations').select('id, nome, kind, gerida_por').eq('id', orgId).maybeSingle();
  if (!org || org.kind !== 'fornecedor' || !canManage(await myRole(supabase, user.id, org))) {
    return { errors: {}, message: 'Sem permissão para gerir esta empresa.' };
  }
  const code = String(form.get('codigo') ?? '').trim();
  let discountBps = 0;
  if (code) {
    const { data } = await supabase.rpc('check_promo_code', { p_code: code });
    if (!data) return { errors: { codigo: 'Código inválido, expirado ou esgotado.' } };
    discountBps = data;
  }
  const coupon = discountBps > 0 ? await stripe.coupons.create({ percent_off: discountBps / 100, duration: 'forever', name: code.toUpperCase() }) : null;
  const metadata = { org_id: org.id, plan, promo_code: code.toUpperCase(), discount_bps: String(discountBps) };
  const taxRate = process.env.STRIPE_TAX_RATE_IVA;
  const origin = (await headers()).get('origin') ?? BRAND.url;
  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    line_items: [{ price: STRIPE_TEST_PRICES[plan], quantity: 1, ...(taxRate ? { tax_rates: [taxRate] } : {}) }],
    ...(coupon ? { discounts: [{ coupon: coupon.id }] } : {}),
    customer_email: user.email,
    client_reference_id: org.id,
    metadata,
    subscription_data: { metadata },
    locale: 'pt',
    success_url: `${origin}/app/organizacoes/${org.id}/produtos?subscricao=ok`,
    cancel_url: `${origin}/app/organizacoes/${org.id}/produtos`,
  });
  if (!session.url) return { errors: {}, message: 'O Stripe não devolveu a página de pagamento.' };
  redirect(session.url);
}
