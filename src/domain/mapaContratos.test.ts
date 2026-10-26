import { describe, expect, it } from 'vitest';
import {
  ANOS_DO_MAPA,
  concentraConvites,
  ordenarEntidades,
  temHabito,
  type EntidadeDoMapa,
} from './mapaContratos';

const entidade = (p: Partial<EntidadeDoMapa>): EntidadeDoMapa => ({
  chave: '500051062',
  nif: '500051062',
  nome: 'Município de Sintra',
  contratos: 10,
  totalCents: 100_000_00,
  medianaCents: 10_000_00,
  porConvite: 0,
  conviteUnico: 0,
  semLista: 0,
  ultimo: '2026-03-01',
  concelhos: ['Sintra'],
  ...p,
});

describe('ordenarEntidades', () => {
  it('ordena por frequência, não por valor', () => {
    // Uma junta com uma obra grande não vale mais, ao pintor, do que uma câmara que contrata sempre.
    const r = ordenarEntidades([
      entidade({ chave: '1', nome: 'Junta', contratos: 1, totalCents: 500_000_00 }),
      entidade({ chave: '2', nome: 'Câmara', contratos: 2, totalCents: 30_000_00 }),
    ]);
    expect(r.map((e) => e.nome)).toEqual(['Câmara', 'Junta']);
  });

  it('em empate de frequência decide o valor, e depois o nome', () => {
    const r = ordenarEntidades([
      entidade({ chave: 'c', nome: 'C', contratos: 5, totalCents: 10_000_00 }),
      entidade({ chave: 'a', nome: 'A', contratos: 5, totalCents: 10_000_00 }),
      entidade({ chave: 'b', nome: 'B', contratos: 5, totalCents: 90_000_00 }),
    ]);
    expect(r.map((e) => e.nome)).toEqual(['B', 'A', 'C']);
  });

  it('não mexe na lista que recebe', () => {
    const original = [entidade({ chave: '1', contratos: 1 }), entidade({ chave: '2', contratos: 9 })];
    ordenarEntidades(original);
    expect(original.map((e) => e.chave)).toEqual(['1', '2']);
  });
});

describe('temHabito', () => {
  it('um ou dois contratos não são hábito nenhum', () => {
    expect(temHabito(entidade({ contratos: 1 }))).toBe(false);
    expect(temHabito(entidade({ contratos: 2 }))).toBe(false);
    expect(temHabito(entidade({ contratos: 3 }))).toBe(true);
  });
});

describe('concentraConvites', () => {
  it('assinala a entidade que chama quase sempre a mesma empresa', () => {
    // Vila Franca de Xira, medido a 26/10/2026: 21 dos 33 convites a uma empresa só.
    expect(concentraConvites(entidade({ porConvite: 33, conviteUnico: 21, semLista: 0 }))).toBe(true);
  });

  it('não assinala a entidade que roda', () => {
    // O comportamento nacional: a mais chamada fica em média com 24% dos convites de cada entidade.
    expect(concentraConvites(entidade({ porConvite: 20, conviteUnico: 4, semLista: 0 }))).toBe(false);
  });

  it('conta só sobre os convites com lista publicada', () => {
    // Seis convites, cinco sem lista: o único que se conhece foi a uma empresa só. Um caso não é
    // padrão, e dizer "metade ou mais" sobre uma amostra de um seria inventar.
    expect(concentraConvites(entidade({ porConvite: 6, conviteUnico: 1, semLista: 5 }))).toBe(false);
    // Com lista em quatro deles, e dois a uma empresa só, já é metade de uma amostra que existe.
    expect(concentraConvites(entidade({ porConvite: 6, conviteUnico: 2, semLista: 2 }))).toBe(true);
  });

  it('sem convites nenhuns não assinala nada', () => {
    expect(concentraConvites(entidade({ porConvite: 0, conviteUnico: 0, semLista: 0 }))).toBe(false);
  });
});

describe('ANOS_DO_MAPA', () => {
  it('são cinco: hábito que chegue, e recente que baste', () => {
    expect(ANOS_DO_MAPA).toBe(5);
  });
});
