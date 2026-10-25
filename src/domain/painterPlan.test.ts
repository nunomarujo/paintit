import { describe, expect, it } from 'vitest';
import { CURRENT_RULES } from './rules';
import { applyPainterDiscount } from './referral';
import { PRECO_ATUAL, PRO_DISCOUNT_BP, poupancaAnual, subscriberDiscountBp, type SubscricaoPintor } from './painterPlan';

const pro = (over: Partial<SubscricaoPintor> = {}): SubscricaoPintor => ({ plano: 'pro', estado: 'ativa', periodicidade: 'mensal', validaAte: '2026-12-31', ...over });

describe('desconto de subscritor', () => {
  it('não desconta sem subscrição', () => {
    expect(subscriberDiscountBp(null, '2026-10-25')).toBe(0);
  });

  it('não desconta no plano gratuito', () => {
    expect(subscriberDiscountBp(pro({ plano: 'gratuito' }), '2026-10-25')).toBe(0);
  });

  it('desconta 5 pontos percentuais no plano Pro ativo', () => {
    expect(subscriberDiscountBp(pro(), '2026-10-25')).toBe(500);
    expect(PRO_DISCOUNT_BP).toBe(500);
  });

  it('não desconta enquanto a subscrição está por pagar', () => {
    expect(subscriberDiscountBp(pro({ estado: 'por_pagar' }), '2026-10-25')).toBe(0);
  });

  it('cancelada sem validade conhecida não desconta — senão bastava cancelar para ficar com o desconto', () => {
    expect(subscriberDiscountBp(pro({ estado: 'cancelada', validaAte: null }), '2026-10-25')).toBe(0);
  });

  it('activa sem validade ainda desconta: é o estado logo a seguir ao pagamento', () => {
    expect(subscriberDiscountBp(pro({ validaAte: null }), '2026-10-25')).toBe(500);
  });

  it('mantém o desconto depois de cancelada, até ao fim do período já pago', () => {
    const cancelada = pro({ estado: 'cancelada', validaAte: '2026-11-30' });
    expect(subscriberDiscountBp(cancelada, '2026-11-30')).toBe(500);
    expect(subscriberDiscountBp(cancelada, '2026-12-01')).toBe(0);
  });
});

describe('comissão com subscrição', () => {
  it('leva a comissão de 18% para 13%', () => {
    expect(applyPainterDiscount(CURRENT_RULES, 500).commissionBp).toBe(1_300);
  });

  it('soma-se aos outros descontos do pintor', () => {
    // 0,5 p.p. de códigos de adesão + 5 p.p. de subscritor = 12,5%.
    expect(applyPainterDiscount(CURRENT_RULES, 50 + 500).commissionBp).toBe(1_250);
  });

  it('não atravessa o piso de 9%, nem com todos os descontos empilhados', () => {
    expect(applyPainterDiscount(CURRENT_RULES, 800 + 500).commissionBp).toBe(900);
  });
});

describe('preço de lançamento', () => {
  it('é 30 €/mês e 250 €/ano, abaixo do preço de tabela', () => {
    expect(PRECO_ATUAL.mensalCents).toBe(3_000);
    expect(PRECO_ATUAL.anualCents).toBe(25_000);
    expect(PRECO_ATUAL.tabelaMensalCents).toBe(5_000);
    expect(PRECO_ATUAL.tabelaAnualCents).toBe(50_000);
  });

  it('a anual poupa 110 € face a doze meses', () => {
    expect(poupancaAnual()).toBe(11_000);
  });
});
