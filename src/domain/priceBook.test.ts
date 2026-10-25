import { describe, expect, it } from 'vitest';
import { aprenderDe, chaveDe, cobertura, sugerir, type PriceEntry } from './priceBook';

const e = (descricao: string, vezes: number, ultimaVez: string, preco = 1200): PriceEntry => ({
  id: descricao, descricao, categoria: 'pintura', unidade: 'm2', precoUnitario: preco, vezes, ultimaVez,
});

describe('biblioteca de preços', () => {
  const lista = [
    e('Duas demãos de tinta acrílica', 9, '2026-10-01'),
    e('Tratamento de fissuras com rede', 3, '2026-10-20'),
    e('Lavagem a alta pressão', 3, '2026-09-01'),
  ];

  it('sugere primeiro o que ele usa mais vezes', () => {
    expect(sugerir(lista, '')[0]!.descricao).toBe('Duas demãos de tinta acrílica');
  });

  it('entre os de uso igual, o mais recente primeiro', () => {
    const r = sugerir(lista, '').slice(1).map((x) => x.descricao);
    expect(r).toEqual(['Tratamento de fissuras com rede', 'Lavagem a alta pressão']);
  });

  it('encontra por qualquer palavra, não só pelo início', () => {
    expect(sugerir(lista, 'fissuras').map((x) => x.descricao)).toEqual(['Tratamento de fissuras com rede']);
  });

  it('exige todas as palavras escritas', () => {
    expect(sugerir(lista, 'demãos acrílica')).toHaveLength(1);
    expect(sugerir(lista, 'demãos verniz')).toHaveLength(0);
  });

  it('a mesma descrição noutra unidade é outro item', () => {
    expect(chaveDe('Rodapé', 'm2')).not.toBe(chaveDe('Rodapé', 'ml'));
    expect(chaveDe(' duas  DEMÃOS ', 'm2')).toBe(chaveDe('Duas demãos', 'm2'));
  });
});

describe('quanto a biblioteca já poupa', () => {
  const lista = [e('Duas demãos de tinta acrílica', 9, '2026-10-01')];

  it('é zero no primeiro orçamento', () => {
    expect(cobertura([], [{ descricao: 'Duas demãos de tinta acrílica', unidade: 'm2' }])).toBe(0);
  });

  it('conta as linhas que já conhece', () => {
    const linhas = [
      { descricao: 'Duas demãos de tinta acrílica', unidade: 'm2' as const },
      { descricao: 'Andaime', unidade: 'vg' as const },
    ];
    expect(cobertura(lista, linhas)).toBe(0.5);
  });

  it('um orçamento vazio não tem cobertura nenhuma', () => {
    expect(cobertura(lista, [])).toBe(0);
  });
});

describe('o que a biblioteca aprende', () => {
  const linha = (descricao: string, precoUnitario: number, unidade: 'm2' | 'ml' = 'm2') => ({
    descricao, precoUnitario, unidade, categoria: 'pintura' as const,
  });

  it('guarda uma linha por trabalho, com o preço praticado', () => {
    expect(aprenderDe([linha('Duas demãos', 1180)])).toEqual([
      { chave: chaveDe('Duas demãos', 'm2'), descricao: 'Duas demãos', categoria: 'pintura', unidade: 'm2', precoUnitario: 1180 },
    ]);
  });

  it('ignora linhas sem descrição útil ou sem preço', () => {
    expect(aprenderDe([linha('x', 1180), linha('Duas demãos', 0)])).toEqual([]);
  });

  it('repetida no mesmo orçamento, fica o preço com que ele acabou', () => {
    const r = aprenderDe([linha('Duas demãos', 1100), linha('Duas demãos', 1250)]);
    expect(r).toHaveLength(1);
    expect(r[0]!.precoUnitario).toBe(1250);
  });
});
