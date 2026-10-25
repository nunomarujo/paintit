import type { Cents } from './money';
import type { LineCategory, ProposalLine, Unit } from './proposal';

// Biblioteca de preços da empresa (25/10/2026, docs/DECISOES.md).
//
// A razão de existir: dos 25 minutos que um pintor gasta a decidir preços em cada orçamento, quase
// todos são a lembrar-se do que cobrou da última vez. A biblioteca não inventa preços nem usa médias
// de mercado — guarda **os preços dele**, tirados dos orçamentos que já fez, e sugere-os da próxima.
// Um preço que a aplicação proponha sem ser dele seria pior do que não propor nada: ou está abaixo e
// ele perde dinheiro, ou está acima e ele perde a obra, e em qualquer dos casos perde a confiança.

export interface PriceEntry {
  id: string;
  /** A chave com que foi guardada — por código de trabalho, quando a linha o tinha. */
  chave: string;
  descricao: string;
  categoria: LineCategory;
  unidade: Unit;
  /** O último preço que praticou nesta linha. */
  precoUnitario: Cents;
  /** Quantas vezes já a usou, para ordenar as sugestões pelo que ele usa mesmo. */
  vezes: number;
  /** Data do último uso (AAAA-MM-DD): um preço de há dois anos vale menos do que um de há um mês. */
  ultimaVez: string;
}

/**
 * Chave de uma linha para efeitos de biblioteca.
 *
 * Quando a linha veio do catálogo de trabalhos, a chave é o **código do trabalho** — e aí "Duas demãos
 * de tinta acrílica" e "2 demãos tinta acrílica" são o mesmo item, como devem ser. Sem código, usa-se
 * a descrição normalizada, que é o melhor que há para texto escrito à mão.
 */
export const chaveDe = (descricao: string, unidade: Unit, trabalho?: string | null): string =>
  trabalho ? `#${trabalho}|${unidade}` : `${descricao.trim().toLowerCase().replace(/\s+/g, ' ')}|${unidade}`;

/**
 * As sugestões para um campo de descrição, ordenadas pelo que é mais provável ele querer: primeiro o
 * que usa mais vezes, e entre os de uso igual o mais recente. A pesquisa é por qualquer palavra, não
 * só pelo início — ele escreve "fissuras" e encontra "Tratamento de fissuras com rede".
 */
export function sugerir(entradas: PriceEntry[], termo: string, limite = 8): PriceEntry[] {
  const palavras = termo.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const candidatas = palavras.length === 0 ? entradas : entradas.filter((e) => palavras.every((p) => e.descricao.toLowerCase().includes(p)));
  return [...candidatas].sort((a, b) => b.vezes - a.vezes || b.ultimaVez.localeCompare(a.ultimaVez)).slice(0, limite);
}

/**
 * Quanto é que a biblioteca já cobre deste orçamento — a medida honesta de quanto tempo ela vai
 * poupar. Zero no primeiro orçamento, perto de um ao terceiro ou quarto.
 */
export function cobertura(entradas: PriceEntry[], linhas: Pick<ProposalLine, 'descricao' | 'unidade' | 'trabalho'>[]): number {
  if (linhas.length === 0) return 0;
  const conhecidas = new Set(entradas.map((e) => e.chave));
  return linhas.filter((l) => conhecidas.has(chaveDe(l.descricao, l.unidade, l.trabalho))).length / linhas.length;
}

export interface Aprendizagem {
  chave: string;
  descricao: string;
  categoria: LineCategory;
  unidade: Unit;
  precoUnitario: Cents;
}

/**
 * O que a biblioteca aprende de um orçamento acabado. Só linhas com descrição e preço, e uma linha
 * por chave — se o mesmo trabalho aparecer duas vezes no mesmo orçamento com preços diferentes, fica
 * o último, que é o que ele acabou por decidir.
 */
export function aprenderDe(linhas: Pick<ProposalLine, 'descricao' | 'unidade' | 'precoUnitario' | 'categoria' | 'trabalho'>[]): Aprendizagem[] {
  const por = new Map<string, Aprendizagem>();
  for (const l of linhas) {
    const descricao = l.descricao.trim();
    if (descricao.length < 3 || l.precoUnitario <= 0) continue;
    por.set(chaveDe(descricao, l.unidade, l.trabalho), {
      chave: chaveDe(descricao, l.unidade, l.trabalho),
      descricao,
      categoria: l.categoria,
      unidade: l.unidade,
      precoUnitario: l.precoUnitario,
    });
  }
  return [...por.values()];
}
