import { assertCents, percentOf, type Cents } from './money';
import type { CommercialRules } from './rules';

export interface FeeBreakdown {
  net: Cents;
  vat: Cents;
  gross: Cents;
}

/** Comissão do pintor: 3% do valor sem IVA, com mínimo e sem teto. */
export function commissionFor(base: Cents, rules: CommercialRules): Cents {
  assertCents(base, 'valor da proposta');
  return Math.max(rules.commissionMinCents, percentOf(base, rules.commissionBp));
}

/** O que o pintor paga: comissão mais o IVA que lhe acresce. */
export function painterFee(base: Cents, rules: CommercialRules): FeeBreakdown {
  const net = commissionFor(base, rules);
  const vat = percentOf(net, rules.commissionVatBp);
  return { net, vat, gross: net + vat };
}

/** Garantia que o cliente deposita ao escolher a proposta. */
export function clientGuarantee(base: Cents, rules: CommercialRules): Cents {
  assertCents(base, 'valor da proposta');
  return Math.max(rules.guaranteeMinCents, percentOf(base, rules.guaranteeBp));
}

/** Taxa efetiva, para mostrar ao pintor quando o mínimo se aplica. */
export function effectiveRate(base: Cents, rules: CommercialRules): number {
  if (base === 0) return 0;
  return commissionFor(base, rules) / base;
}
