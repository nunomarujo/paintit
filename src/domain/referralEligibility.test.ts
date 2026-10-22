import { describe, expect, it } from 'vitest';
import { addCalendarMonths, type IsoDate } from './deadline';
import {
  countEligibleReferrals,
  isReferralEligible,
  MAX_REFERRAL_DISCOUNT_BP,
  oneBenefitPerEntity,
  referralDiscountBp,
  referralDiscountFor,
  referralWindow,
  type ReferredSupplier,
} from './referralEligibility';

describe('Q(n): desconto por fornecedores referidos elegíveis', () => {
  it('segue a Tabela 6 do documento, de 0 a 10, e nunca excede o máximo', () => {
    const expected = [0, 100, 175, 225, 275, 325, 375, 400, 400, 400, 400];
    for (let n = 0; n <= 10; n++) expect(referralDiscountBp(n)).toBe(expected[n]);
    expect(referralDiscountBp(10)).toBe(MAX_REFERRAL_DISCOUNT_BP);
    expect(referralDiscountBp(-1)).toBe(0);
    expect(referralDiscountBp(1.5)).toBe(0);
  });
});

describe('janela de 12 meses', () => {
  it('é inclusive no início e exclusive no aniversário, em meses normais', () => {
    const w = referralWindow('2026-03-15');
    expect(w).toEqual({ from: '2026-03-15', until: '2027-03-15' });
    expect(isReferralEligible('2026-03-15', '2026-03-15')).toBe(true); // inclusive
    expect(isReferralEligible('2026-03-15', '2027-03-14')).toBe(true);
    expect(isReferralEligible('2026-03-15', '2027-03-15')).toBe(false); // exclusive
    expect(isReferralEligible('2026-03-15', '2026-03-14')).toBe(false);
  });

  it('29 de fevereiro: o fim cai no último dia de fevereiro do ano seguinte', () => {
    // 2028 é bissexto; 12 meses depois é 2029, que não é.
    expect(addCalendarMonths('2028-02-29', 12)).toBe('2029-02-28');
    expect(isReferralEligible('2028-02-29', '2029-02-27')).toBe(true);
    expect(isReferralEligible('2028-02-29', '2029-02-28')).toBe(false);
    // Encadeado a partir de outro 29 de fevereiro bissexto (2032): mantém-se correto.
    expect(addCalendarMonths('2032-02-29', 12)).toBe('2033-02-28');
  });

  it('meses com menos dias (ex.: 31 de janeiro): não transborda para o mês seguinte', () => {
    expect(addCalendarMonths('2026-01-31', 1)).toBe('2026-02-28');
    expect(addCalendarMonths('2026-01-31', 12)).toBe('2027-01-31');
  });
});

describe('um benefício por entidade, e só com convite confirmado e adesão elegível', () => {
  const s = (nif: string, convite: IsoDate | null, adesao: IsoDate | null): ReferredSupplier => ({ nif, conviteConfirmadoEm: convite, adesaoElegivelEm: adesao });

  it('ignora convites pendentes e entidades ainda não ativadas', () => {
    const out = oneBenefitPerEntity([s('1', null, '2026-01-01'), s('2', '2026-01-01', null)]);
    expect(out).toEqual([]);
  });

  it('a mesma entidade só conta uma vez, pelo primeiro convite confirmado', () => {
    const out = oneBenefitPerEntity([
      s('123456789', '2026-03-01', '2026-03-10'),
      s('123456789', '2026-01-01', '2026-01-15'), // convite anterior: prevalece
    ]);
    expect(out).toEqual([{ nif: '123456789', adesaoElegivelEm: '2026-01-15' }]);
  });
});

describe('contagem e desconto no instante de cálculo', () => {
  const suppliers: ReferredSupplier[] = [
    { nif: '1', conviteConfirmadoEm: '2025-01-01', adesaoElegivelEm: '2025-10-01' }, // expira 2026-10-01
    { nif: '2', conviteConfirmadoEm: '2026-01-01', adesaoElegivelEm: '2026-01-01' }, // expira 2027-01-01
    { nif: '3', conviteConfirmadoEm: '2026-06-01', adesaoElegivelEm: '2026-06-01' }, // expira 2027-06-01
    { nif: '4', conviteConfirmadoEm: '2026-09-01', adesaoElegivelEm: null }, // ainda não ativado
  ];

  it('conta só os elegíveis nesse dia, e o desconto acompanha', () => {
    expect(countEligibleReferrals(suppliers, '2026-09-30')).toBe(3);
    expect(referralDiscountFor(suppliers, '2026-09-30')).toBe(225); // Q(3)
    // O primeiro expira a 2026-10-01 (exclusive): a partir daí ficam 2.
    expect(countEligibleReferrals(suppliers, '2026-10-01')).toBe(2);
    expect(referralDiscountFor(suppliers, '2026-10-01')).toBe(175); // Q(2)
  });

  it('novas referências não prolongam o prazo das antigas', () => {
    const extra: ReferredSupplier[] = [...suppliers, { nif: '5', conviteConfirmadoEm: '2026-09-15', adesaoElegivelEm: '2026-09-15' }];
    expect(countEligibleReferrals(extra, '2026-10-01')).toBe(3); // 2, 3, 5 — o 1 já expirou na mesma
  });
});
