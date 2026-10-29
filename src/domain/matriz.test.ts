import { describe, expect, it } from 'vitest';
import { formatEuros } from './money';
import {
  GRUPO_COM_PENDENCIAS,
  GRUPO_SEM_PENDENCIAS,
  matrizDasPropostas,
  type PropostaNaMatriz,
} from './matriz';

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

const matriz = (ps: PropostaNaMatriz[]) => matrizDasPropostas(ps, formatEuros);

/** A matriz reagrupa as linhas, por isso procura-se pelo alias e não pela posição. */
const linha = (ls: ReturnType<typeof matriz>, alias: string) => ls.find((l) => l.alias === alias)!;

describe('a matriz de todas as propostas', () => {
  it('uma linha por proposta e, sem pendências nenhumas, um grupo só e a ordem recebida', () => {
    const ls = matriz([m('Pintor A', 1_400_000), m('Pintor B', 1_600_000), m('Pintor C', 1_640_000)]);
    expect(ls.map((l) => l.alias)).toEqual(['Pintor A', 'Pintor B', 'Pintor C']);
    expect(new Set(ls.map((l) => l.grupo))).toEqual(new Set([GRUPO_SEM_PENDENCIAS]));
  });

  it('o âmbito diz-se numa palavra, e a contagem vai na coluna ao lado', () => {
    const ls = matriz([m('Pintor A', 1_400_000, { naoIndicados: 2 }), m('Pintor B', 1_600_000)]);
    expect(linha(ls, 'Pintor A').pedido).toEqual({ texto: 'Por confirmar', atencao: true });
    expect(linha(ls, 'Pintor A').aEsclarecer).toEqual({ texto: '2 trabalhos', atencao: true });
    expect(linha(ls, 'Pintor B').pedido).toEqual({ texto: 'Incluído', atencao: false });
  });

  it('o que falta esclarecer separa trabalhos, preços e zonas sem preço', () => {
    const ls = matriz([m('Pintor A', 1_400_000, { semPrecoFirme: 1, zonasSemPreco: 2 }), m('Pintor B', 1_600_000)]);
    expect(linha(ls, 'Pintor A').aEsclarecer).toEqual({ texto: '1 preço · 2 zonas', atencao: true });
    // Um travessão, e não «Nenhum»: a célula não afirma nada que a proposta não tenha declarado.
    expect(linha(ls, 'Pintor B').aEsclarecer).toEqual({ texto: '—', atencao: false });
  });

  it('as propostas sem pendências vêm primeiro, mesmo quando custam mais', () => {
    const ls = matriz([m('Pintor A', 1_400_000, { naoIndicados: 2 }), m('Pintor B', 1_600_000)]);
    expect(ls.map((l) => l.alias)).toEqual(['Pintor B', 'Pintor A']);
    expect(ls.map((l) => l.grupo)).toEqual([GRUPO_SEM_PENDENCIAS, GRUPO_COM_PENDENCIAS]);
  });

  it('dentro de cada grupo mantém-se a ordem recebida, que é a ordenação do relatório', () => {
    const ls = matriz([
      m('Pintor A', 1_400_000, { naoIndicados: 1 }),
      m('Pintor B', 1_500_000),
      m('Pintor C', 1_550_000, { excluidos: 1 }),
      m('Pintor D', 1_600_000),
    ]);
    expect(ls.map((l) => l.alias)).toEqual(['Pintor B', 'Pintor D', 'Pintor A', 'Pintor C']);
  });

  it('histórico curto diz-se, e não vira nota baixa nem aviso', () => {
    const ls = matriz([
      m('Pintor A', 1_400_000, { avaliacao: { media: 5, n: 1 } }),
      m('Pintor B', 1_600_000, { avaliacao: null }),
    ]);
    expect(linha(ls, 'Pintor A').reputacao.texto).toBe('Histórico ainda limitado (1)');
    expect(linha(ls, 'Pintor B').reputacao.texto).toBe('Sem obras avaliadas');
    // Não é um defeito da proposta: não se pinta de âmbar, nem muda de grupo.
    expect(linha(ls, 'Pintor A').reputacao.atencao).toBe(false);
    expect(linha(ls, 'Pintor B').reputacao.atencao).toBe(false);
    expect(linha(ls, 'Pintor B').grupo).toBe(GRUPO_SEM_PENDENCIAS);
    // E uma única avaliação de 5 não aparece como 5,0/5 ao lado de quem tem 61 obras.
    expect(linha(ls, 'Pintor A').reputacao.texto).not.toContain('5,0');
  });

  it('com avaliações suficientes mostra a média e quantas são', () => {
    const ls = matriz([m('Pintor A', 1_400_000), m('Pintor B', 1_600_000)]);
    expect(linha(ls, 'Pintor A').reputacao.texto).toBe('4,6/5 · 61 obras');
  });

  it('escala para dez propostas sem mudar de regra', () => {
    const ps = Array.from({ length: 10 }, (_, i) => m(`Pintor ${String.fromCharCode(65 + i)}`, 1_400_000 + i * 50_000));
    const ls = matriz(ps);
    expect(ls).toHaveLength(10);
    // Nenhuma célula é um parágrafo: é isso que deixa caber dez linhas na primeira folha.
    for (const l of ls) {
      for (const c of [l.pedido, l.aEsclarecer, l.reputacao]) expect(c.texto.length).toBeLessThanOrEqual(30);
    }
  });
});

describe('âmbito e preço não se confundem na matriz', () => {
  it('um trabalho condicionado cobre o pedido: o âmbito diz Incluído, e o que falta avisa', () => {
    // O defeito que isto fixa apareceu no render da primeira página: a linha dizia «0 trabalhos em
    // falta» a âmbar, porque a cobertura vinha de um campo que exigia todos os trabalhos firmes.
    const ls = matriz([m('Pintor A', 1_600_000, { naoIndicados: 0, semPrecoFirme: 1 }), m('Pintor B', 1_700_000)]);
    expect(linha(ls, 'Pintor A').pedido).toEqual({ texto: 'Incluído', atencao: false });
    expect(linha(ls, 'Pintor A').aEsclarecer).toEqual({ texto: '1 preço', atencao: true });
    // Um preço por fechar é pendência: a linha vai para o segundo grupo mesmo com o âmbito coberto.
    expect(linha(ls, 'Pintor A').grupo).toBe(GRUPO_COM_PENDENCIAS);
  });

  it('nenhuma célula mostra um zero', () => {
    const ls = matriz([
      m('Pintor A', 1_600_000, { naoIndicados: 0, semPrecoFirme: 2 }),
      m('Pintor B', 1_700_000, { naoIndicados: 3 }),
      m('Pintor C', 1_800_000),
    ]);
    for (const l of ls) {
      expect(l.pedido.texto).not.toMatch(/\b0\b/);
      expect(l.aEsclarecer.texto).not.toMatch(/\b0\b/);
    }
  });
});

describe('não indicar não é excluir, também na matriz', () => {
  it('um trabalho sobre o qual a proposta se cala fica por confirmar, e não excluído', () => {
    const ls = matriz([m('Pintor A', 1_400_000, { naoIndicados: 3 }), m('Pintor B', 1_600_000)]);
    expect(linha(ls, 'Pintor A').pedido.texto).toBe('Por confirmar');
    expect(linha(ls, 'Pintor A').aEsclarecer.texto).toBe('3 trabalhos');
    expect(linha(ls, 'Pintor A').pedido.texto).not.toContain('excluí');
  });

  it('um trabalho que o pintor declara não fazer fica «excluído»', () => {
    const ls = matriz([m('Pintor A', 1_400_000, { excluidos: 2 }), m('Pintor B', 1_600_000)]);
    expect(linha(ls, 'Pintor A').pedido.texto).toBe('2 excluídos');
  });

  it('havendo os dois, o âmbito mostra a exclusão e a contagem mostra o que falta perguntar', () => {
    const ls = matriz([m('Pintor A', 1_400_000, { naoIndicados: 2, excluidos: 1 }), m('Pintor B', 1_600_000)]);
    expect(linha(ls, 'Pintor A').pedido.texto).toBe('1 excluído');
    expect(linha(ls, 'Pintor A').aEsclarecer.texto).toBe('2 trabalhos');
  });
});

describe('casos que estão mesmo na base', () => {
  it('um pedido sem trabalhos indicados não aparece como coberto', () => {
    // Há pedidos publicados na base com a lista de trabalhos vazia. Sem este caso tratado, a matriz
    // dizia «Incluído» — não havia nada por esclarecer nem excluído — e contradizia a classificação,
    // que com zero trabalhos nunca dá o pedido por completo.
    const ls = matriz([
      m('Pintor A', 1_400_000, { trabalhosPedidos: 0 }),
      m('Pintor B', 1_600_000, { trabalhosPedidos: 0 }),
    ]);
    expect(ls[0]!.pedido).toEqual({ texto: 'Pedido por definir', atencao: true });
    expect(ls[0]!.pedido.texto).not.toBe('Incluído');
  });
});
