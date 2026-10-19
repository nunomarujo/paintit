import { describe, expect, it } from 'vitest';
import { monthlyPrice, planAllows, withVat } from './subscription';

describe('subscrição dos fornecedores', () => {
  it('preços mensais, IVA e códigos promocionais', () => {
    expect(monthlyPrice('vendedores')).toBe(3_900);
    expect(monthlyPrice('catalogo')).toBe(4_900);
    expect(withVat(4_900)).toBe(6_027);
    expect(monthlyPrice('catalogo', 5_000)).toBe(2_450);
    expect(monthlyPrice('catalogo', 10_000)).toBe(0);
  });
  it('o catálogo inclui a listagem de vendedores', () => {
    expect(planAllows('catalogo', 'vendedores')).toBe(true);
    expect(planAllows('vendedores', 'catalogo')).toBe(false);
    expect(planAllows(null, 'vendedores')).toBe(false);
  });
});

import { fromStripeStatus, isSupplierPlan } from './subscription';

describe('estado da subscrição vindo do Stripe', () => {
  it('converte os estados', () => {
    expect(fromStripeStatus('active')).toBe('ativa');
    expect(fromStripeStatus('trialing')).toBe('ativa');
    expect(fromStripeStatus('past_due')).toBe('suspensa');
    expect(fromStripeStatus('unpaid')).toBe('suspensa');
    expect(fromStripeStatus('canceled')).toBe('cancelada');
    expect(isSupplierPlan('catalogo')).toBe(true);
    expect(isSupplierPlan('x')).toBe(false);
  });
});
