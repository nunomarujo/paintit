import type { Cents } from './money';
import { discountedPrice } from './promo';
import { percentOf } from './money';

// Subscrição mensal dos fornecedores (decisão de 20/10/2026). A plataforma não recebe
// nada dos fornecedores pelas transações; só esta subscrição.

export const SUPPLIER_PLANS = ['vendedores', 'catalogo'] as const;
export type SupplierPlan = (typeof SUPPLIER_PLANS)[number];

export const PLAN_INFO: Record<SupplierPlan, { label: string; monthlyCents: Cents; features: string[] }> = {
  vendedores: {
    label: 'Listagem de vendedores',
    monthlyCents: 3_900,
    features: ['Presença na listagem de vendedores, com contactos e condições de entrega.'],
  },
  catalogo: {
    label: 'Catálogo de produtos',
    monthlyCents: 4_900,
    features: [
      'Tudo o da listagem de vendedores.',
      'Produtos na listagem de produtos, editáveis um a um.',
      'Descontos por perfil de compra: por produto ou tipo, por área da obra e por cliente.',
    ],
  },
};

export const SUBSCRIPTION_VAT_BP = 2_300;

/** Mensalidade sem IVA, com o desconto do código promocional (0 se não houver). */
export function monthlyPrice(plan: SupplierPlan, promoBps = 0): Cents {
  const base = PLAN_INFO[plan].monthlyCents;
  return promoBps > 0 ? discountedPrice(base, promoBps) : base;
}

export function withVat(net: Cents): Cents {
  return net + percentOf(net, SUBSCRIPTION_VAT_BP);
}

/** O plano permite a funcionalidade? O de catálogo inclui o de vendedores. */
export function planAllows(plan: SupplierPlan | null, needed: SupplierPlan): boolean {
  return plan === 'catalogo' || (plan !== null && plan === needed);
}

/** Preços no Stripe (modo de teste, conta acct_1USIiAFGpN3v1aBO). Os IDs não são secretos. */
export const STRIPE_TEST_PRICES: Record<SupplierPlan, string> = {
  vendedores: 'price_1USKbMFGpN3v1aBOO9dJFUps',
  catalogo: 'price_1USKbtFGpN3v1aBOvyB2ExdN',
};

export type LocalSubscriptionStatus = 'ativa' | 'suspensa' | 'cancelada';

/** Estado da subscrição no Stripe → estado na app. */
export function fromStripeStatus(status: string): LocalSubscriptionStatus {
  if (status === 'active' || status === 'trialing') return 'ativa';
  if (status === 'canceled' || status === 'incomplete_expired') return 'cancelada';
  return 'suspensa'; // past_due, unpaid, incomplete, paused
}

export function isSupplierPlan(x: unknown): x is SupplierPlan {
  return typeof x === 'string' && (SUPPLIER_PLANS as readonly string[]).includes(x);
}
