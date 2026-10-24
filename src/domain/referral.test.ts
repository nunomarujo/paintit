import { describe, expect, it } from 'vitest';
import { commissionFor, painterFee } from './commission';
import type { IsoDate } from './deadline';
import {
  applyPainterDiscount,
  combinedPainterDiscountBp,
  isValidPtIban,
  linkedSupplierDiscountBp,
  MAX_COMBINED_PAINTER_DISCOUNT_BP,
  newReferralCode,
  normalizeCode,
  payoutStatus,
  priorWinsInSupplierWindow,
  redemptionAmounts,
  RULES_2026_10_20_REF,
  supplierBalance,
  supplierCommission,
  supplierCommissionBpAt,
  supplierCommissionVat,
} from './referral';
import { CURRENT_RULES, RULES_2026_10_24_REF, RULES_BY_VERSION } from './rules';

describe('códigos de adesão', () => {
  it('o código de adesão desce 0,25 pontos à comissão, com o mesmo mínimo', () => {
    // A versão de 20/10 fica como foi, para reconstruir contratações dessa altura.
    expect(RULES_2026_10_20_REF.commissionBp).toBe(275);
    expect(commissionFor(1_000_000, RULES_2026_10_20_REF)).toBe(27_500);
    expect(painterFee(1_000_000, RULES_2026_10_20_REF).gross).toBe(33_825);

    // Em vigor desde 24/10: 18%, e com código 17,75%.
    expect(commissionFor(1_000_000, CURRENT_RULES)).toBe(180_000);
    expect(RULES_2026_10_24_REF.commissionBp).toBe(1_775);
    expect(commissionFor(1_000_000, RULES_2026_10_24_REF)).toBe(177_500);

    // Obra pequena: o mínimo de 150 € mantém-se e o desconto não se nota.
    expect(commissionFor(50_000, RULES_2026_10_20_REF)).toBe(15_000);
  });

  it('a versão com desconto está registada, para reconstruir a contratação', () => {
    expect(RULES_BY_VERSION[RULES_2026_10_20_REF.version]).toBe(RULES_2026_10_20_REF);
    expect(RULES_2026_10_20_REF.version >= '2026-10-19').toBe(true);
    expect(RULES_2026_10_20_REF.flow).toBe('v2');
  });

  it('o fornecedor recebe 0,25% do valor sem IVA, mais IVA só se o cobrar', () => {
    expect(supplierCommission(137_275)).toBe(343); // igual à base de dados (rls.test.ts)
    expect(supplierCommission(1_000_000)).toBe(2_500);
    expect(supplierCommissionVat(2_500, true)).toBe(575);
    expect(supplierCommissionVat(2_500, false)).toBe(0);
  });

  it('o estado e o saldo seguem adjudicada → disponível → em resgate → paga', () => {
    expect(payoutStatus({ estado: 'adjudicada', feeRecebidoEm: null }).key).toBe('adjudicada');
    expect(payoutStatus({ estado: 'adjudicada', feeRecebidoEm: '2026-10-21' }).key).toBe('disponivel');
    expect(payoutStatus({ estado: 'adjudicada', feeRecebidoEm: '2026-10-21', redemptionId: 'r' }).key).toBe('em_resgate');
    expect(payoutStatus({ estado: 'paga', feeRecebidoEm: '2026-10-21', redemptionId: 'r' }).label).toBe('Paga');
    const b = supplierBalance([
      { estado: 'adjudicada', feeRecebidoEm: null, redemptionId: null, amount: 100 },
      { estado: 'adjudicada', feeRecebidoEm: 'x', redemptionId: null, amount: 200 },
      { estado: 'adjudicada', feeRecebidoEm: 'x', redemptionId: 'r', amount: 400 },
      { estado: 'paga', feeRecebidoEm: 'x', redemptionId: 'r0', amount: 800 },
      { estado: 'sem_efeito', feeRecebidoEm: 'x', redemptionId: null, amount: 1600 },
    ]);
    expect(b).toEqual({ adjudicada: 100, disponivel: 200, em_resgate: 400, paga: 800 });
  });

  it('o resgate soma o IVA e desconta a retenção, como a base de dados', () => {
    expect(redemptionAmounts(343, true, 2500)).toEqual({ iva: 79, retencao: 86, liquido: 336 });
    expect(redemptionAmounts(10_000, false, 0)).toEqual({ iva: 0, retencao: 0, liquido: 10_000 });
    expect(redemptionAmounts(10_000, true, 0).liquido).toBe(12_300);
  });

  it('gera códigos legíveis e normaliza o que o pintor escreve', () => {
    expect(newReferralCode()).toMatch(/^[A-Z2-9]{8}$/);
    expect(newReferralCode()).not.toMatch(/[01OI]/);
    expect(normalizeCode(' abcd-1234 ')).toBe('ABCD1234');
  });

  it('valida o IBAN português', () => {
    expect(isValidPtIban('PT50 0002 0123 1234 5678 9015 4')).toBe(true);
    expect(isValidPtIban('PT50000201231234567890154')).toBe(true);
    expect(isValidPtIban('PT50000201231234567890155')).toBe(false);
    expect(isValidPtIban('ES9121000418450200051332')).toBe(false);
  });
});

// Decisão de 22/10/2026 (docs/DECISOES.md): o código de adesão deixa de ser "um código, uma obra" — o desconto do
// pintor passa a somar-se por fornecedor com código ligado, e a comissão do fornecedor passa a subir por volume.

describe('desconto do pintor por fornecedores com código ligado', () => {
  it('soma 0,25 p.p. por fornecedor ligado, sem crescer com o volume de cada um', () => {
    expect(linkedSupplierDiscountBp(0)).toBe(0);
    expect(linkedSupplierDiscountBp(1)).toBe(25);
    expect(linkedSupplierDiscountBp(2)).toBe(50); // o exemplo do promotor: 0,5 p.p. de 2 fornecedores
    expect(linkedSupplierDiscountBp(4)).toBe(100);
  });

  it('ignora contagens inválidas', () => {
    expect(linkedSupplierDiscountBp(-1)).toBe(0);
    expect(linkedSupplierDiscountBp(1.5)).toBe(0);
  });

  it('soma-se com o desconto das referências de fornecedores, com um teto conjunto de 8 p.p.', () => {
    expect(combinedPainterDiscountBp(50, 175)).toBe(225);
    expect(combinedPainterDiscountBp(500, 500)).toBe(MAX_COMBINED_PAINTER_DISCOUNT_BP);
    expect(MAX_COMBINED_PAINTER_DISCOUNT_BP).toBe(800);
  });

  it('aplica o desconto à comissão, sem nunca atravessar o piso de 9%', () => {
    expect(applyPainterDiscount(CURRENT_RULES, 50).commissionBp).toBe(CURRENT_RULES.commissionBp - 50);
    // Desconto absurdo: para no piso, nunca em zero nem em negativo.
    expect(applyPainterDiscount(CURRENT_RULES, 10_000).commissionBp).toBe(900);
  });
});

describe('comissão do fornecedor por volume (códigos de adesão)', () => {
  it('fica em 1% enquanto esta não é a 3.ª obra da janela', () => {
    expect(supplierCommissionBpAt([], '2026-10-22')).toBe(100);
    expect(supplierCommissionBpAt(['2026-09-01'], '2026-10-22')).toBe(100);
  });

  it('sobe a 2% na 3.ª obra da janela (de qualquer pintor que o fornecedor referenciou)', () => {
    expect(supplierCommissionBpAt(['2026-09-01', '2026-09-15'], '2026-10-01')).toBe(200);
  });

  it('a janela é de 2 meses corridos a recuar da vitória, inclusive no limite', () => {
    expect(priorWinsInSupplierWindow(['2026-08-01'], '2026-10-01')).toBe(1); // o próprio limite: conta
    expect(priorWinsInSupplierWindow(['2026-07-31'], '2026-10-01')).toBe(0); // um dia antes: já não conta
  });

  it('nunca é retroativo: cada vitória resolve a sua taxa só a partir das anteriores', () => {
    const wins: IsoDate[] = [];
    const rate = (at: IsoDate) => {
      const bp = supplierCommissionBpAt(wins, at);
      wins.push(at);
      return bp;
    };
    expect(rate('2026-10-01')).toBe(100); // 1.ª obra
    expect(rate('2026-10-10')).toBe(100); // 2.ª obra
    expect(rate('2026-10-20')).toBe(200); // 3.ª obra: sobe agora, não as anteriores
    expect(rate('2026-11-01')).toBe(200); // 4.ª, ainda com 3 anteriores na janela
  });
});
