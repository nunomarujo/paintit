import { describe, expect, it } from 'vitest';
import { descontoAceitavel, limiteAplicavel, limiteEmPalavras, type LimiteDeDesconto } from './limitesDeDesconto';

const JOAO = 'u-joao';
const ANA = 'u-ana';
const TUDO = { tipo: null, productId: null };

const l = (p: Partial<LimiteDeDesconto> & { limiteBps: number }): LimiteDeDesconto => ({
  vendedorUserId: null,
  tipo: null,
  productId: null,
  ...p,
});

describe('limiteAplicavel', () => {
  it('sem regra nenhuma, ninguém desconta', () => {
    expect(limiteAplicavel([], JOAO, TUDO)).toBe(0);
  });

  it('o limite da empresa vale para todos', () => {
    const limites = [l({ limiteBps: 1000 })];
    expect(limiteAplicavel(limites, JOAO, TUDO)).toBe(1000);
    expect(limiteAplicavel(limites, ANA, TUDO)).toBe(1000);
  });

  it('o limite do vendedor substitui o da empresa, para cima', () => {
    const limites = [l({ limiteBps: 1000 }), l({ vendedorUserId: JOAO, limiteBps: 1500 })];
    expect(limiteAplicavel(limites, JOAO, TUDO)).toBe(1500);
    expect(limiteAplicavel(limites, ANA, TUDO)).toBe(1000);
  });

  it('o limite do vendedor substitui o da empresa, para baixo', () => {
    const limites = [l({ limiteBps: 1000 }), l({ vendedorUserId: ANA, limiteBps: 300 })];
    expect(limiteAplicavel(limites, ANA, TUDO)).toBe(300);
  });

  it('o teto da categoria corta por cima, mesmo a quem tem mais autorização', () => {
    const limites = [
      l({ limiteBps: 1000 }),
      l({ vendedorUserId: JOAO, limiteBps: 1500 }),
      l({ tipo: 'esmalte', limiteBps: 500 }),
    ];
    expect(limiteAplicavel(limites, JOAO, { tipo: 'esmalte', productId: null })).toBe(500);
    expect(limiteAplicavel(limites, JOAO, { tipo: 'tinta_exterior', productId: null })).toBe(1500);
  });

  it('o teto do produto é o mais específico de todos', () => {
    const limites = [l({ limiteBps: 1000 }), l({ tipo: 'esmalte', limiteBps: 500 }), l({ productId: 'p1', limiteBps: 200 })];
    expect(limiteAplicavel(limites, JOAO, { tipo: 'esmalte', productId: 'p1' })).toBe(200);
  });

  it('um desconto a todo o catálogo respeita o teto mais apertado que exista', () => {
    // Senão bastava não escolher produto nenhum para furar o teto dos esmaltes.
    const limites = [l({ limiteBps: 1000 }), l({ tipo: 'esmalte', limiteBps: 500 })];
    expect(limiteAplicavel(limites, JOAO, TUDO)).toBe(500);
  });

  it('o teto de um produto não afeta outro produto', () => {
    const limites = [l({ limiteBps: 1000 }), l({ productId: 'p1', limiteBps: 200 })];
    expect(limiteAplicavel(limites, JOAO, { tipo: 'esmalte', productId: 'p2' })).toBe(1000);
  });
});

describe('descontoAceitavel', () => {
  const limites = [l({ limiteBps: 1000 })];
  it('aceita no limite e recusa acima', () => {
    expect(descontoAceitavel(limites, JOAO, TUDO, 1000)).toBe(true);
    expect(descontoAceitavel(limites, JOAO, TUDO, 1001)).toBe(false);
  });
  it('recusa um desconto negativo', () => {
    expect(descontoAceitavel(limites, JOAO, TUDO, -1)).toBe(false);
  });
  it('sem autorização, nem zero passa por engano', () => {
    expect(descontoAceitavel([], JOAO, TUDO, 100)).toBe(false);
    expect(descontoAceitavel([], JOAO, TUDO, 0)).toBe(true);
  });
});

describe('limiteEmPalavras', () => {
  it('diz o que se pode dar, ou que não se pode', () => {
    expect(limiteEmPalavras(0)).toBe('Sem autorização para descontar');
    expect(limiteEmPalavras(1500)).toBe('Até 15%');
    expect(limiteEmPalavras(750)).toBe('Até 7,5%');
  });
});
