import { describe, expect, it } from 'vitest';
import { coversZone, surveyorCommissionBp, surveyorDisplayShareBp, surveyPayoutAmount, vendorRatingSummary } from './survey';
import { euros as eurosHelper } from './money';

describe('repartição da comissão com o vendedor', () => {
  it('é uma fração da comissão da plataforma, não do valor da obra', () => {
    const platformFeeNet = eurosHelper(3_000); // 3% de 100 000€, por exemplo
    expect(surveyPayoutAmount(platformFeeNet, 1000)).toBe(eurosHelper(300)); // 10% de 3 000 €
    expect(surveyPayoutAmount(platformFeeNet, 0)).toBe(0);
  });

  it('usa o placeholder por omissão quando não se indica a percentagem', () => {
    expect(surveyPayoutAmount(eurosHelper(1_000))).toBe(eurosHelper(100)); // 10% provisório
  });
});

describe('fórmula dinâmica da fração do vendedor (40/30/15/15)', () => {
  it('sem histórico nenhum (tudo neutro): fica exatamente a meio da banda, igual ao antigo provisório', () => {
    expect(surveyorCommissionBp({ qualificacaoGeral: null, notaInformacao: null, respostaAtempada: null, notaCliente: null })).toBe(1000);
  });

  it('tudo máximo: topo da banda', () => {
    expect(surveyorCommissionBp({ qualificacaoGeral: 5, notaInformacao: 5, respostaAtempada: true, notaCliente: 5 })).toBe(1500);
  });

  it('tudo mínimo: fundo da banda', () => {
    expect(surveyorCommissionBp({ qualificacaoGeral: 1, notaInformacao: 1, respostaAtempada: false, notaCliente: 1 })).toBe(500);
  });

  it('pesa mais a qualificação geral (40%) do que a nota da informação (30%)', () => {
    const maisQualificacao = surveyorCommissionBp({ qualificacaoGeral: 5, notaInformacao: 1, respostaAtempada: null, notaCliente: null });
    const maisInformacao = surveyorCommissionBp({ qualificacaoGeral: 1, notaInformacao: 5, respostaAtempada: null, notaCliente: null });
    expect(maisQualificacao).toBeGreaterThan(maisInformacao);
  });

  it('tradução para "% do valor adjudicado": fração da comissão típica, nunca a comissão em si', () => {
    expect(surveyorDisplayShareBp(1000, 1800)).toBe(180); // 10% de 18% = 1,8%
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
