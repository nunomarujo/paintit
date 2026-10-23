import { describe, expect, it } from 'vitest';
import { coversZone, surveyorPayoutAmount, surveyorShareBp, vendorRatingSummary } from './survey';
import { euros as eurosHelper } from './money';

describe('fórmula dinâmica da fração do vendedor (40/30/15/15, 1%-2,7% do valor adjudicado)', () => {
  it('sem histórico nenhum (tudo neutro): fica exatamente a meio da banda', () => {
    expect(surveyorShareBp({ qualificacaoGeral: null, notaInformacao: null, respostaAtempada: null, notaCliente: null })).toBe(185);
  });

  it('tudo máximo: topo da banda (2,7%)', () => {
    expect(surveyorShareBp({ qualificacaoGeral: 5, notaInformacao: 5, respostaAtempada: true, notaCliente: 5 })).toBe(270);
  });

  it('tudo mínimo: fundo da banda (1%)', () => {
    expect(surveyorShareBp({ qualificacaoGeral: 1, notaInformacao: 1, respostaAtempada: false, notaCliente: 1 })).toBe(100);
  });

  it('pesa mais a qualificação geral (40%) do que a nota da informação (30%)', () => {
    const maisQualificacao = surveyorShareBp({ qualificacaoGeral: 5, notaInformacao: 1, respostaAtempada: null, notaCliente: null });
    const maisInformacao = surveyorShareBp({ qualificacaoGeral: 1, notaInformacao: 5, respostaAtempada: null, notaCliente: null });
    expect(maisQualificacao).toBeGreaterThan(maisInformacao);
  });
});

describe('pagamento ao vendedor: % do valor adjudicado, nunca mais do que a comissão realmente recebida', () => {
  it('numa obra de comissão normal, o teto nunca chega a atuar', () => {
    const valorAdjudicado = eurosHelper(100_000);
    const feeNet = eurosHelper(20_000); // 20%, dentro do intervalo-alvo normal
    expect(surveyorPayoutAmount(valorAdjudicado, 270, feeNet)).toBe(eurosHelper(2_700)); // 2,7% do valor
  });

  it('numa obra de comissão muito baixa, o teto protege a margem da plataforma', () => {
    const valorAdjudicado = eurosHelper(100_000);
    const feeNet = eurosHelper(1_000); // comissão residual, hipotética
    expect(surveyorPayoutAmount(valorAdjudicado, 270, feeNet)).toBe(feeNet); // 2,7% (2 700€) excederia a comissão; fica limitado a 1 000€
  });

  it('percentagem zero não paga nada', () => {
    expect(surveyorPayoutAmount(eurosHelper(100_000), 0, eurosHelper(20_000))).toBe(0);
  });
});

describe('cobertura por concelho (mesma convenção de supplier_delivery)', () => {
  it('lista vazia cobre todo o país', () => {
    expect(coversZone([], 'Viana do Castelo')).toBe(true);
    expect(coversZone([], 'Faro')).toBe(true);
  });

  it('lista não vazia só cobre os concelhos indicados', () => {
    expect(coversZone(['Viana do Castelo', 'Ponte de Lima'], 'Viana do Castelo')).toBe(true);
    expect(coversZone(['Viana do Castelo'], 'Faro')).toBe(false);
  });
});

describe('avaliação do vendedor', () => {
  it('sem nenhuma avaliação: é a primeira obra, sem média', () => {
    expect(vendorRatingSummary([])).toEqual({ n: 0, media: null, primeiraObra: true });
  });

  it('com avaliações: média a uma casa decimal, logo desde a primeira (sem limiar de 3)', () => {
    expect(vendorRatingSummary([5])).toEqual({ n: 1, media: 5, primeiraObra: false });
    expect(vendorRatingSummary([4, 5, 5])).toEqual({ n: 3, media: 4.7, primeiraObra: false });
  });
});
