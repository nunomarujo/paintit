import { describe, expect, it } from 'vitest';
import { commissionFor, painterFee } from './commission';
import { isValidPtIban, newReferralCode, normalizeCode, payoutStatus, redemptionAmounts, RULES_2026_10_20_REF, supplierBalance, supplierCommission, supplierCommissionVat } from './referral';
import { CURRENT_RULES, RULES_BY_VERSION } from './rules';

describe('códigos de adesão', () => {
  it('a comissão do pintor desce de 3% para 2,75%, com o mesmo mínimo', () => {
    expect(RULES_2026_10_20_REF.commissionBp).toBe(275);
    expect(commissionFor(1_000_000, CURRENT_RULES)).toBe(30_000);
    expect(commissionFor(1_000_000, RULES_2026_10_20_REF)).toBe(27_500);
    // Obra pequena: o mínimo de 150 € mantém-se e o desconto não se nota.
    expect(commissionFor(300_000, RULES_2026_10_20_REF)).toBe(15_000);
    expect(painterFee(1_000_000, RULES_2026_10_20_REF).gross).toBe(33_825);
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
