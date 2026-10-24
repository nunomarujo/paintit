import { describe, expect, it } from 'vitest';
import { clientGuarantee, commissionFor, effectiveRate, painterFee } from './commission';
import { applyPainterDiscount } from './referral';
import { CURRENT_RULES, RULES_2026_10_20, RULES_2026_10_24 } from './rules';
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
  it('9% — o piso do algoritmo de fee, não os 3% normais; o mínimo de 150 € mantém-se', () => {
    expect(RULES_2026_10_20_CONVITE.commissionBp).toBe(900);
    expect(RULES_2026_10_20_CONVITE.version).toBe('2026-10-20+convite');
    expect(commissionFor(euros(100_000), RULES_2026_10_20_CONVITE)).toBe(euros(9_000));
    expect(commissionFor(euros(1_000), RULES_2026_10_20_CONVITE)).toBe(euros(150));
  });
});

// 24/10/2026: comissão a 18% com piso de 9%.
describe('comissão de 24/10/2026', () => {
  it('são 18% do valor sem IVA', () => {
    expect(commissionFor(euros(34_800), RULES_2026_10_24)).toBe(euros(6_264));
    expect(RULES_2026_10_24.commissionBp).toBe(1_800);
  });

  it('nenhum desconto desce abaixo dos 9%, nem todos empilhados', () => {
    const tudo = applyPainterDiscount(RULES_2026_10_24, 300 + 200 + 400);
    expect(tudo.commissionBp).toBe(900);
    const exagero = applyPainterDiscount(RULES_2026_10_24, 5_000);
    expect(exagero.commissionBp).toBe(900);
  });

  it('um desconto pequeno aplica-se na mesma', () => {
    expect(applyPainterDiscount(RULES_2026_10_24, 25).commissionBp).toBe(1_775);
  });

  it('as versões antigas não ganham piso: continuam a reconstruir-se como foram', () => {
    expect(applyPainterDiscount(RULES_2026_10_20, 300).commissionBp).toBe(0);
    expect(RULES_2026_10_20.commissionFloorBp).toBeUndefined();
  });

  it('a versão em vigor é a de 24/10', () => {
    expect(CURRENT_RULES.version).toBe('2026-10-24');
    expect(CURRENT_RULES.commissionBp).toBe(1_800);
  });
});
