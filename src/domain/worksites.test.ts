import { describe, expect, it } from 'vitest';
import { formatQuantidade, gastoNaObra, saldos, worksiteErrors, type Consumivel, type Movimento } from './worksites';

const c = (id: string, nome: string, minimo = 0): Consumivel => ({ id, nome, unidade: 'un', minimo });

describe('obras próprias', () => {
  it('basta um nome para criar uma obra', () => {
    expect(worksiteErrors({ nome: 'Rua das Flores, 12', clienteNome: null, local: null, valorCents: null, inicio: null })).toEqual({});
  });

  it('recusa nome vazio, valor negativo e data inválida', () => {
    expect(worksiteErrors({ nome: 'x', clienteNome: null, local: null, valorCents: null, inicio: null })).toHaveProperty('nome');
    expect(worksiteErrors({ nome: 'Obra', clienteNome: null, local: null, valorCents: -1, inicio: null })).toHaveProperty('valor');
    expect(worksiteErrors({ nome: 'Obra', clienteNome: null, local: null, valorCents: null, inicio: '25/10/2026' })).toHaveProperty('inicio');
  });
});

describe('consumíveis', () => {
  const lista = [c('a', 'Fita de pintor', 1000), c('b', 'Rolo de lã', 500)];
  const movs: Movimento[] = [
    { consumableId: 'a', quantidade: 2400, worksiteId: null },
    { consumableId: 'a', quantidade: -1800, worksiteId: 'obra1' },
    { consumableId: 'b', quantidade: 1000, worksiteId: null },
  ];

  it('o stock soma-se dos movimentos, não se guarda', () => {
    const s = saldos(lista, movs);
    expect(s.find((x) => x.id === 'a')!.stock).toBe(600);
    expect(s.find((x) => x.id === 'b')!.stock).toBe(1000);
  });

  it('marca para repor o que está abaixo do mínimo, e põe-no em primeiro', () => {
    const s = saldos(lista, movs);
    expect(s[0]!.id).toBe('a');
    expect(s[0]!.repor).toBe(true);
    expect(s[1]!.repor).toBe(false);
  });

  it('sem mínimo definido nunca pede para repor, mesmo a zero', () => {
    expect(saldos([c('z', 'Diluente')], []).at(0)!.repor).toBe(false);
  });

  it('diz quanto é que cada obra gastou', () => {
    expect(gastoNaObra(movs, 'obra1')).toEqual({ a: 1800 });
    expect(gastoNaObra(movs, 'obra2')).toEqual({});
  });

  it('mostra as quantidades como números portugueses', () => {
    expect(formatQuantidade(1250)).toBe('12,5');
  });
});
