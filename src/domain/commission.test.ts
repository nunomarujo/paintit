import { describe, expect, it } from 'vitest';
import { clientGuarantee, commissionFor, effectiveRate, painterFee } from './commission';
import { euros, formatEuros, percentOf } from './money';
import { RULES_2026_10 as rules, RULES_2026_10_20_CONVITE } from './rules';

describe('comissão do pintor', () => {
  it('é 3% do valor sem IVA', () => {
    expect(commissionFor(euros(40_000), rules)).toBe(euros(1_200));
    expect(commissionFor(euros(100_000), rules)).toBe(euros(3_000));
  });

  it('tem mínimo de 150 € e taxa efetiva maior em obras pequenas', () => {
    expect(commissionFor(euros(2_000), rules)).toBe(euros(150));
    expect(effectiveRate(euros(2_000), rules)).toBeCloseTo(0.075);
    expect(commissionFor(euros(5_000), rules)).toBe(euros(150));
  });

  it('não tem teto', () => {
    expect(commissionFor(euros(1_000_000), rules)).toBe(euros(30_000));
  });

  it('acresce IVA a 23%', () => {
    expect(painterFee(euros(100_000), rules)).toEqual({
      net: euros(3_000),
      vat: euros(690),
      gross: euros(3_690),
    });
  });
});

describe('garantia do cliente', () => {
  it('é 3% do valor sem IVA', () => {
    expect(clientGuarantee(euros(100_000), rules)).toBe(euros(3_000));
  });
});

describe('dinheiro em cêntimos', () => {
  it('arredonda metade para cima', () => {
    expect(percentOf(50, 300)).toBe(2); // 1,5 cêntimos
    expect(percentOf(49, 300)).toBe(1); // 1,47 cêntimos
  });

  it('rejeita valores negativos ou fracionários', () => {
    expect(() => commissionFor(-1, rules)).toThrow();
    expect(() => commissionFor(1.5, rules)).toThrow();
  });

  it('formata em euros de Portugal', () => {
    expect(formatEuros(euros(3_690))).toMatch(/^3\s690,00\s€$/);
  });
});

describe('convite direto do cliente ("traga o seu pintor")', () => {
  it('1%, não os 3% normais; o mínimo de 150 € mantém-se', () => {
    expect(RULES_2026_10_20_CONVITE.commissionBp).toBe(100);
    expect(RULES_2026_10_20_CONVITE.version).toBe('2026-10-20+convite');
    expect(commissionFor(euros(100_000), RULES_2026_10_20_CONVITE)).toBe(euros(1_000));
    expect(commissionFor(euros(5_000), RULES_2026_10_20_CONVITE)).toBe(euros(150));
  });
});
