import { describe, expect, it } from 'vitest';
import { discountedPrice, normalizeCode, parseDiscountPercent, promoBlocker } from './promo';

describe('códigos promocionais dos fornecedores', () => {
  it('desconto de 1% a 100%', () => {
    expect(parseDiscountPercent('1')).toBe(100);
    expect(parseDiscountPercent('12,5')).toBe(1250);
    expect(parseDiscountPercent('100')).toBe(10_000);
    expect(parseDiscountPercent('0,5')).toBeNull();
    expect(parseDiscountPercent('101')).toBeNull();
    expect(parseDiscountPercent('x')).toBeNull();
  });
  it('preço com desconto em cêntimos', () => {
    expect(discountedPrice(4_900, 10_000)).toBe(0);
    expect(discountedPrice(4_900, 1_000)).toBe(4_410);
    expect(discountedPrice(999, 100)).toBe(989);
    expect(() => discountedPrice(1000, 50)).toThrow();
  });
  it('código válido, expirado ou esgotado', () => {
    const p = { code: 'ARRANQUE', discountBps: 5000, validUntil: '2026-12-31', maxUses: 2, uses: 1, active: true };
    expect(normalizeCode(' arranque ')).toBe('ARRANQUE');
    expect(normalizeCode('a b')).toBeNull();
    expect(promoBlocker(p, '2026-10-20')).toBeNull();
    expect(promoBlocker(p, '2027-01-01')).toMatch(/expirado/);
    expect(promoBlocker({ ...p, uses: 2 }, '2026-10-20')).toMatch(/esgotado/);
    expect(promoBlocker({ ...p, active: false }, '2026-10-20')).toMatch(/desativado/);
  });
});
