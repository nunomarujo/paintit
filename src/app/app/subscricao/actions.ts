'use server';

import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { BRAND } from '@/config/brand';
import { stripe } from '@/lib/stripe';
import type { FormState } from '@/app/app/actions';
import { PRECO_ATUAL, isPeriodicidade } from '@/domain/painterPlan';
import { painterOrgs } from '@/lib/queries';
import { getUser } from '@/lib/supabase/server';


/**
 * Adesão ao plano Pro. Fica em 'por_pagar': quem a activa é o parceiro de pagamentos, nunca este
 * formulário — a política de RLS recusa um insert já activo, e o argumento que vem do navegador não
 * decide nada (CLAUDE.md, regras 4 e 10). O preço é lido da tabela em vigor no servidor, não do
 * formulário, para que ninguém subscreva ao preço que escrever no HTML.
 */
/**
 * Adesão ao plano Pro: grava a intenção e manda para o pagamento no Stripe.
 *
 * A linha fica em 'por_pagar' e **só passa a activa quando o Stripe confirmar**, pelo webhook
 * assinado (src/app/api/stripe/webhook) — nunca pelo regresso do navegador, que qualquer pessoa
 * consegue forjar. É o mesmo desenho das subscrições dos fornecedores.
 *
 * O preço vai em `price_data`, construído a partir de `PRECO_ATUAL`: a tabela de preços da aplicação
 * é a fonte da verdade, e não há um valor no painel do Stripe a divergir dela em silêncio.
 */
export async function subscribePro(_prev: FormState, form: FormData): Promise<FormState> {
  const periodicidade = form.get('periodicidade');
  if (!isPeriodicidade(periodicidade)) return { errors: { periodicidade: 'Escolha mensal ou anual.' } };
  if (!stripe) return { errors: {}, message: 'Os pagamentos ainda não estão configurados. Avise a equipa.' };

  const { supabase, user } = await getUser();
  const orgs = await painterOrgs(supabase, user!.id);
  const org = orgs[0];
  if (!org) return { errors: {}, message: 'Só uma empresa de pintura pode subscrever.' };

  const precoCents = periodicidade === 'anual' ? PRECO_ATUAL.anualCents : PRECO_ATUAL.mensalCents;

  // Uma adesão por pagar que tenha ficado para trás é reaproveitada, para não acumularem linhas
  // mortas sempre que alguém desiste a meio do pagamento.
  const { data: existente } = await supabase
    .from('org_subscriptions')
    .select('id, estado')
    .eq('org_id', org.id)
    .in('estado', ['ativa', 'por_pagar'])
    .maybeSingle();
  if (existente?.estado === 'ativa') return { errors: {}, message: 'Já tem o plano Pro activo.' };
  const linha = {
    plano: 'pro' as const,
    periodicidade,
    estado: 'por_pagar' as const,
    preco_versao: PRECO_ATUAL.version,
    preco_cents: precoCents,
  };
  if (existente) {
    // Reaproveitar a linha é escrever-lhe a periodicidade escolhida agora. Sem isto, quem desistia a
    // meio de uma adesão mensal e voltava a aderir à anual pagava 250 € no Stripe e ficava com
    // "mensal, 30 €" gravado — e era esse valor que ia para a fatura (25/10/2026).
    const { error } = await supabase.from('org_subscriptions').update(linha).eq('id', existente.id);
    if (error) return { errors: {}, message: 'Não foi possível registar a adesão.' };
  } else {
    const { error } = await supabase.from('org_subscriptions').insert({ org_id: org.id, ...linha });
    if (error) return { errors: {}, message: 'Não foi possível registar a adesão.' };
  }

  const metadata = { org_id: org.id, plano: 'pro', periodicidade };
  const taxRate = process.env.STRIPE_TAX_RATE_IVA;
  const origin = (await headers()).get('origin') ?? BRAND.url;
  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    line_items: [
      {
        price_data: {
          currency: 'eur',
          product_data: { name: `Quem Pinta Pro (${periodicidade})` },
          unit_amount: precoCents,
          recurring: { interval: periodicidade === 'anual' ? 'year' : 'month' },
        },
        quantity: 1,
        ...(taxRate ? { tax_rates: [taxRate] } : {}),
      },
    ],
    customer_email: user!.email,
    client_reference_id: org.id,
    metadata,
    subscription_data: { metadata },
    locale: 'pt',
    success_url: `${origin}/app/subscricao?pagamento=ok`,
    cancel_url: `${origin}/app/subscricao`,
  });
  if (!session.url) return { errors: {}, message: 'O Stripe não devolveu a página de pagamento.' };
  redirect(session.url);
}

/**
 * Cancelar. No Stripe cancela-se **no fim do período**, não já: o pintor pagou aquele mês ou aquele
 * ano e o desconto é dele até ao fim. A linha fica marcada como cancelada e `subscriberDiscountBp`
 * continua a descontar enquanto `valida_ate` não passar.
 */
export async function cancelPro(_prev: FormState, _form: FormData): Promise<FormState> {
  const { supabase, user } = await getUser();
  const orgs = await painterOrgs(supabase, user!.id);
  const org = orgs[0];
  if (!org) return { errors: {}, message: 'Sem empresa de pintura.' };

  const { data: atual } = await supabase
    .from('org_subscriptions')
    .select('id, stripe_subscription_id')
    .eq('org_id', org.id)
    .in('estado', ['ativa', 'por_pagar'])
    .maybeSingle();

  if (atual?.stripe_subscription_id && stripe) {
    try {
      await stripe.subscriptions.update(atual.stripe_subscription_id, { cancel_at_period_end: true });
    } catch {
      return { errors: {}, message: 'Não foi possível cancelar no Stripe. Tente de novo ou avise a equipa.' };
    }
  }

  const { error } = await supabase
    .from('org_subscriptions')
    .update({ estado: 'cancelada', cancelada_em: new Date().toISOString() })
    .eq('org_id', org.id)
    .in('estado', ['ativa', 'por_pagar']);
  if (error) return { errors: {}, message: 'Não foi possível cancelar.' };
  revalidatePath('/app/subscricao');
  return { errors: {}, ok: true, message: 'Subscrição cancelada. O desconto mantém-se até ao fim do período já pago.' };
}
