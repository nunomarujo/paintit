import { describe, expect, it } from 'vitest';
import { formatEuros } from './money';
import { indicacoes, type PropostaParaIndicacao } from './indicacoes';
import { matrizDasPropostas, type PropostaNaMatriz } from './matriz';
import { REGRAS_DAS_INDICACOES } from './metodologia';

/** O nome vem da metodologia publicada: se mudar lá, muda aqui, e o teste continua a valer. */
const NOME_COMPLETO = REGRAS_DAS_INDICACOES.find((r) => r.id === 'menor_preco_completo')!.nome;

const m = (alias: string, total: number, o: Partial<PropostaNaMatriz> = {}): PropostaNaMatriz => ({
  id: alias,
  alias,
  totalComIva: total,
  naoIndicados: 0,
  excluidos: 0,
  trabalhosPedidos: 5,
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
  naoIndicados: p.naoIndicados,
  excluidos: p.excluidos,
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
      m('Pintor A', 1_400_000, { naoIndicados: 2 }),
      m('Pintor B', 1_600_000),
      m('Pintor C', 1_640_000),
    ]);
    expect(ls[0]!.indicacoes).toEqual(['Menor preço apresentado']);
    expect(ls[1]!.indicacoes).toEqual([NOME_COMPLETO]);
    expect(ls[2]!.indicacoes).toEqual([]);
  });

  it('uma proposta pode levar as duas indicações', () => {
    const ls = matriz([m('Pintor A', 1_400_000), m('Pintor B', 1_600_000)]);
    expect(ls[0]!.indicacoes).toHaveLength(2);
  });

  it('o que falta ao pedido conta-se, e pede atenção', () => {
    const ls = matriz([m('Pintor A', 1_400_000, { naoIndicados: 2 }), m('Pintor B', 1_600_000)]);
    expect(ls[0]!.pedido).toEqual({ texto: '2 por esclarecer', atencao: true });
    expect(ls[1]!.pedido).toEqual({ texto: 'Completo', atencao: false });
  });

  it('custos por fechar separam o que fica por observar das zonas sem preço', () => {
    const ls = matriz([m('Pintor A', 1_400_000, { semPrecoFirme: 1, zonasSemPreco: 2 }), m('Pintor B', 1_600_000)]);
    expect(ls[0]!.custosPorFechar.texto).toBe('1 após observação, 2 zonas sem preço');
    expect(ls[0]!.custosPorFechar.atencao).toBe(true);
    // «Nenhum declarado» e não «Não»: o que se sabe é o que a proposta declarou.
    expect(ls[1]!.custosPorFechar).toEqual({ texto: 'Nenhum declarado', atencao: false });
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
    const ls = matriz([m('Pintor A', 1_600_000, { naoIndicados: 0, semPrecoFirme: 1 }), m('Pintor B', 1_700_000)]);
    expect(ls[0]!.pedido).toEqual({ texto: 'Completo', atencao: false });
    expect(ls[0]!.custosPorFechar.texto).toBe('1 após observação');
    expect(ls[0]!.custosPorFechar.atencao).toBe(true);
  });

  it('e não ganha o preço completo, porque o total ainda pode subir', () => {
    const ls = matriz([m('Pintor A', 1_600_000, { naoIndicados: 0, semPrecoFirme: 1 }), m('Pintor B', 1_700_000)]);
    expect(ls[0]!.indicacoes).toEqual(['Menor preço apresentado']);
    expect(ls[1]!.indicacoes).toEqual([NOME_COMPLETO]);
  });

  it('nenhuma célula do pedido mostra um zero', () => {
    const ls = matriz([
      m('Pintor A', 1_600_000, { naoIndicados: 0, semPrecoFirme: 2 }),
      m('Pintor B', 1_700_000, { naoIndicados: 3 }),
      m('Pintor C', 1_800_000),
    ]);
    for (const l of ls) expect(l.pedido.texto).not.toMatch(/\b0\b/);
  });
});

describe('não indicar não é excluir, também na matriz', () => {
  it('um trabalho sobre o qual a proposta se cala fica «por esclarecer»', () => {
    const ls = matriz([m('Pintor A', 1_400_000, { naoIndicados: 3 }), m('Pintor B', 1_600_000)]);
    expect(ls[0]!.pedido.texto).toBe('3 por esclarecer');
    expect(ls[0]!.pedido.texto).not.toContain('falta');
    expect(ls[0]!.pedido.texto).not.toContain('excluí');
  });

  it('um trabalho que o pintor declara não fazer fica «excluído»', () => {
    const ls = matriz([m('Pintor A', 1_400_000, { excluidos: 2 }), m('Pintor B', 1_600_000)]);
    expect(ls[0]!.pedido.texto).toBe('2 excluídos');
  });

  it('os dois contam-se em separado, porque o cliente faz coisas diferentes com cada um', () => {
    const ls = matriz([m('Pintor A', 1_400_000, { naoIndicados: 2, excluidos: 1 }), m('Pintor B', 1_600_000)]);
    expect(ls[0]!.pedido.texto).toBe('2 por esclarecer, 1 excluído');
  });

  it('nenhum dos dois ganha a indicação do pedido completo', () => {
    const ls = matriz([
      m('Pintor A', 1_400_000, { naoIndicados: 1 }),
      m('Pintor B', 1_500_000, { excluidos: 1 }),
      m('Pintor C', 1_600_000),
    ]);
    expect(ls[2]!.indicacoes).toContain(NOME_COMPLETO);
    expect(ls[0]!.indicacoes).not.toContain(NOME_COMPLETO);
    expect(ls[1]!.indicacoes).not.toContain(NOME_COMPLETO);
  });
});

describe('casos que estão mesmo na base', () => {
  it('um pedido sem trabalhos indicados não aparece como coberto', () => {
    // Há pedidos publicados na base com a lista de trabalhos vazia. Sem este caso tratado, a matriz
    // dizia «Completo» — não havia nada por esclarecer nem excluído — e contradizia a classificação,
    // que com zero trabalhos nunca dá o pedido por completo.
    const ls = matriz([
      m('Pintor A', 1_400_000, { trabalhosPedidos: 0 }),
      m('Pintor B', 1_600_000, { trabalhosPedidos: 0 }),
    ]);
    expect(ls[0]!.pedido).toEqual({ texto: 'Pedido sem trabalhos indicados', atencao: true });
    expect(ls[0]!.pedido.texto).not.toBe('Completo');
  });
});
