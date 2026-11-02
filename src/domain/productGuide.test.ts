import { describe, expect, it } from 'vitest';
import { productGuide, type ProductGuideInput } from './productGuide';

const base: ProductGuideInput = {
  tipo: 'tinta_exterior',
  acabamento: null,
  uso: null,
  demaos: null,
  diluicao: null,
  secagemHoras: null,
  rendimentoM2L: null,
  espessurasMm: [],
  condutividadeTermicaWMk: null,
  reacaoFogo: null,
};

describe('productGuide', () => {
  it('nunca inventa um número que a ficha não tenha: sem dados, recua para a ficha técnica', () => {
    const g = productGuide(base);
    expect(g.comoAplicar).toContain('ficha técnica');
    expect(g.comoAplicar).not.toMatch(/\d/);
  });

  it('usa os números reais da ficha quando existem (tinta)', () => {
    const g = productGuide({ ...base, demaos: '2 a 3 demãos', diluicao: 'até 10% em água', secagemHoras: 4, rendimentoM2L: 12.5 });
    expect(g.comoAplicar).toContain('2 a 3 demãos');
    expect(g.comoAplicar).toContain('até 10% em água');
    expect(g.comoAplicar).toContain('4h');
    expect(g.sugestoes).toContain('12,5');
  });

  it('isolamento: distingue EPS, EPS grafitado e XPS no texto', () => {
    const eps = productGuide({ ...base, tipo: 'isolamento_eps' });
    const grafitado = productGuide({ ...base, tipo: 'isolamento_eps_grafitado' });
    const xps = productGuide({ ...base, tipo: 'isolamento_xps' });
    expect(eps.paraQueServe).toContain('esferovite');
    expect(grafitado.paraQueServe).toContain('grafite');
    expect(xps.paraQueServe).toContain('XPS');
    expect(eps.comoAplicar).toContain('capoto');
  });

  it('isolamento: usa espessura e condutividade térmica reais quando existem', () => {
    const g = productGuide({ ...base, tipo: 'isolamento_xps', espessurasMm: [40, 60], condutividadeTermicaWMk: 0.034 });
    expect(g.comoAplicar).toContain('40 / 60 mm');
    expect(g.comoAplicar).toContain('0,034');
  });

  it('isolamento: menciona a reação ao fogo quando indicada', () => {
    const g = productGuide({ ...base, tipo: 'isolamento_la_mineral', reacaoFogo: 'A1' });
    expect(g.sugestoes).toContain('A1');
  });

  it('fixador, rede e reboco de capoto têm texto próprio (não o genérico de placas)', () => {
    expect(productGuide({ ...base, tipo: 'fixador_capoto' }).paraQueServe).toContain('Buchas');
    expect(productGuide({ ...base, tipo: 'rede_fibra_vidro' }).paraQueServe).toContain('Rede/malha');
    expect(productGuide({ ...base, tipo: 'reboco_capoto' }).paraQueServe).toContain('Reboco delgado');
  });

  it('"outro" devolve um texto neutro, sem afirmar nada sobre um produto desconhecido', () => {
    const g = productGuide({ ...base, tipo: 'outro' });
    expect(g.paraQueServe).toContain('ficha técnica');
    expect(g.comoAplicar).toContain('ficha técnica');
    expect(g.sugestoes).toContain('ficha técnica');
  });

  it('todos os 15 tipos de produto devolvem os três textos, não vazios', () => {
    const tipos: ProductGuideInput['tipo'][] = [
      'tinta_exterior',
      'tinta_interior',
      'primario',
      'impermeabilizante',
      'esmalte',
      'massa_reparacao',
      'isolamento_eps',
      'isolamento_eps_grafitado',
      'isolamento_xps',
      'isolamento_la_mineral',
      'isolamento_cortica',
      'fixador_capoto',
      'rede_fibra_vidro',
      'reboco_capoto',
      'outro',
    ];
    for (const tipo of tipos) {
      const g = productGuide({ ...base, tipo });
      expect(g.paraQueServe.length).toBeGreaterThan(10);
      expect(g.comoAplicar.length).toBeGreaterThan(10);
      expect(g.sugestoes.length).toBeGreaterThan(10);
    }
  });
});
