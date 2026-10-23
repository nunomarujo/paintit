import { describe, expect, it } from 'vitest';
import { coversZone, surveyPayoutAmount, vendorRatingSummary } from './survey';
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
