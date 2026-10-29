import { describe, expect, it } from 'vitest';
import { formatEuros } from './money';
import { indicacoes, type PropostaParaIndicacao } from './indicacoes';
import { matrizDasPropostas, type PropostaNaMatriz } from './matriz';

const m = (alias: string, total: number, o: Partial<PropostaNaMatriz> = {}): PropostaNaMatriz => ({
  id: alias,
  alias,
  totalComIva: total,
  emFalta: 0,
  semPrecoFirme: 0,
  zonasSemPreco: 0,
  avaliacao: { media: 4.6, n: 61 },
  ...o,
});

const paraIndicacao = (p: PropostaNaMatriz): PropostaParaIndicacao => ({
  id: p.id,
  alias: p.alias,
  totalComIva: p.totalComIva,
  precoFirme: p.semPrecoFirme === 0 && p.zonasSemPreco === 0,
  emFalta: p.emFalta,
});

const matriz = (ps: PropostaNaMatriz[]) =>
  matrizDasPropostas(ps, indicacoes(ps.map(paraIndicacao), formatEuros), formatEuros);

describe('a matriz de todas as propostas', () => {
  it('uma linha por proposta, pela ordem recebida', () => {
    const ls = matriz([m('Pintor A', 1_400_000), m('Pintor B', 1_600_000), m('Pintor C', 1_640_000)]);
    expect(ls.map((l) => l.alias)).toEqual(['Pintor A', 'Pintor B', 'Pintor C']);
  });

  it('as indicações aparecem na linha da proposta a que pertencem', () => {
    const ls = matriz([
      m('Pintor A', 1_400_000, { emFalta: 2 }),
      m('Pintor B', 1_600_000),
      m('Pintor C', 1_640_000),
    ]);
    expect(ls[0]!.indicacoes).toEqual(['Menor preço apresentado']);
    expect(ls[1]!.indicacoes).toEqual(['Melhor preço para o pedido completo']);
    expect(ls[2]!.indicacoes).toEqual([]);
  });

  it('uma proposta pode levar as duas indicações', () => {
    const ls = matriz([m('Pintor A', 1_400_000), m('Pintor B', 1_600_000)]);
    expect(ls[0]!.indicacoes).toHaveLength(2);
  });

  it('o que falta ao pedido conta-se, e pede atenção', () => {
    const ls = matriz([m('Pintor A', 1_400_000, { emFalta: 2 }), m('Pintor B', 1_600_000)]);
    expect(ls[0]!.pedido).toEqual({ texto: '2 trabalhos em falta', atencao: true });
    expect(ls[1]!.pedido).toEqual({ texto: 'Completo', atencao: false });
  });

  it('custos por fechar separam o que fica por observar das zonas sem preço', () => {
    const ls = matriz([m('Pintor A', 1_400_000, { semPrecoFirme: 1, zonasSemPreco: 2 }), m('Pintor B', 1_600_000)]);
    expect(ls[0]!.custosPorFechar.texto).toBe('1 após observação, 2 zonas sem preço');
    expect(ls[0]!.custosPorFechar.atencao).toBe(true);
    expect(ls[1]!.custosPorFechar).toEqual({ texto: 'Não', atencao: false });
  });

  it('histórico curto diz-se, e não vira nota baixa nem aviso', () => {
    const ls = matriz([m('Pintor A', 1_400_000, { avaliacao: { media: 5, n: 1 } }), m('Pintor B', 1_600_000, { avaliacao: null })]);
    expect(ls[0]!.reputacao.texto).toBe('Histórico ainda limitado (1)');
    expect(ls[1]!.reputacao.texto).toBe('Sem obras avaliadas');
    // Não é um defeito da proposta: não se pinta de âmbar.
    expect(ls[0]!.reputacao.atencao).toBe(false);
    expect(ls[1]!.reputacao.atencao).toBe(false);
    // E uma única avaliação de 5 não aparece como 5,0/5 ao lado de quem tem 61 obras.
    expect(ls[0]!.reputacao.texto).not.toContain('5,0');
  });

  it('com avaliações suficientes mostra a média e quantas são', () => {
    const ls = matriz([m('Pintor A', 1_400_000), m('Pintor B', 1_600_000)]);
    expect(ls[0]!.reputacao.texto).toBe('4,6/5 · 61 obras');
  });

  it('a reputação não altera as indicações: um histórico melhor não ganha nada', () => {
    const fraca = matriz([
      m('Pintor A', 1_400_000, { avaliacao: { media: 3.0, n: 40 } }),
      m('Pintor B', 1_600_000, { avaliacao: { media: 5.0, n: 90 } }),
    ]);
    expect(fraca[0]!.indicacoes).toHaveLength(2);
    expect(fraca[1]!.indicacoes).toEqual([]);
  });

  it('escala para dez propostas sem mudar de regra', () => {
    const ps = Array.from({ length: 10 }, (_, i) => m(`Pintor ${String.fromCharCode(65 + i)}`, 1_400_000 + i * 50_000));
    const ls = matriz(ps);
    expect(ls).toHaveLength(10);
    expect(ls[0]!.indicacoes).toHaveLength(2);
    expect(ls.slice(1).every((l) => l.indicacoes.length === 0)).toBe(true);
  });
});

describe('âmbito e preço não se confundem na matriz', () => {
  it('um trabalho condicionado cobre o pedido: a coluna diz Completo, e o custo por fechar avisa', () => {
    // O defeito que isto fixa apareceu no render da primeira página: a linha dizia «0 trabalhos em
    // falta» a âmbar, porque a cobertura vinha de um campo que exigia todos os trabalhos firmes.
    const ls = matriz([m('Pintor A', 1_600_000, { emFalta: 0, semPrecoFirme: 1 }), m('Pintor B', 1_700_000)]);
    expect(ls[0]!.pedido).toEqual({ texto: 'Completo', atencao: false });
    expect(ls[0]!.custosPorFechar.texto).toBe('1 após observação');
    expect(ls[0]!.custosPorFechar.atencao).toBe(true);
  });

  it('e não ganha o preço completo, porque o total ainda pode subir', () => {
    const ls = matriz([m('Pintor A', 1_600_000, { emFalta: 0, semPrecoFirme: 1 }), m('Pintor B', 1_700_000)]);
    expect(ls[0]!.indicacoes).toEqual(['Menor preço apresentado']);
    expect(ls[1]!.indicacoes).toEqual(['Melhor preço para o pedido completo']);
  });

  it('nenhuma célula do pedido mostra um zero', () => {
    const ls = matriz([
      m('Pintor A', 1_600_000, { emFalta: 0, semPrecoFirme: 2 }),
      m('Pintor B', 1_700_000, { emFalta: 3 }),
      m('Pintor C', 1_800_000),
    ]);
    for (const l of ls) expect(l.pedido.texto).not.toMatch(/\b0\b/);
  });
});
