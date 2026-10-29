/**
 * Como se repartem as propostas pelos quadros da folha A4.
 *
 * Numa folha cabem três colunas com conforto. A largura dava para quatro — medido, 680px dos 681
 * úteis —, mas com quatro as células de texto comprido partem-se em três e quatro linhas e a grelha
 * deixa de se percorrer com o olho. Daí a norma ser **a referência mais duas**.
 *
 * **A excepção, decidida pelo promotor a 29/10/2026:** quando a norma deixaria um candidato
 * sozinho no último quadro, aperta-se. Com cinco candidatos, a norma dava 2+2+1 — e um quadro com
 * uma proposta só não é uma comparação, é uma ficha. Passa a 3+2: um quadro com quatro colunas e
 * outro com três, e nenhum candidato isolado. O exemplo é dele: «referência + 3 e referência + 2,
 * em vez de deixar um candidato isolado».
 *
 * A regra fica assim: usa-se o **menor número de quadros** que não deixe ninguém sozinho, e
 * distribuem-se os candidatos o mais igualmente possível por eles. Nunca mais de três candidatos
 * por quadro — acima disso a folha deixa de os aguentar, e aí vale mais um quadro a mais.
 *
 * A referência repete-se em todos: sem ela em cada quadro, os quadros não se comparam entre si.
 */

/** O normal: a referência e mais dois. */
const CANDIDATOS_POR_QUADRO = 2;
/** O limite, e só para não deixar ninguém sozinho. Acima disto a folha não aguenta. */
const MAXIMO_DE_CANDIDATOS = 3;

/**
 * Quantos candidatos leva cada quadro, do primeiro ao último.
 *
 * Exportada à parte da repartição por índices porque é aqui que está a regra, e é isto que os
 * testes fixam: a aritmética não depende de quem é a referência nem de quantas propostas há no
 * total, só de quantos candidatos sobram.
 */
export function tamanhosDosQuadros(candidatos: number): number[] {
  if (candidatos <= 0) return [];
  if (candidatos <= MAXIMO_DE_CANDIDATOS && candidatos > CANDIDATOS_POR_QUADRO) return [candidatos];

  let quadros = Math.ceil(candidatos / CANDIDATOS_POR_QUADRO);
  // Se o último ficasse com um candidato só, tira-se um quadro e reparte-se por todos. Só se faz
  // quando sobra espaço: com dois quadros de três já cheios, um sétimo candidato abre um quadro
  // novo em vez de encher os outros.
  if (quadros > 1 && candidatos % CANDIDATOS_POR_QUADRO === 1 && candidatos <= (quadros - 1) * MAXIMO_DE_CANDIDATOS) {
    quadros -= 1;
  }
  const base = Math.floor(candidatos / quadros);
  const resto = candidatos % quadros;
  // Os maiores primeiro: a comparação que mais interessa é a das propostas da frente, e é essa que
  // ganha a coluna a mais.
  return Array.from({ length: quadros }, (_, i) => base + (i < resto ? 1 : 0));
}

/**
 * Os índices de cada quadro, com a referência à cabeça de todos.
 *
 * @param total quantas propostas há
 * @param referencia o índice da que se repete em todos os quadros
 */
export function gruposDeColunas(total: number, referencia: number): number[][] {
  if (total <= 0) return [];
  if (total <= CANDIDATOS_POR_QUADRO + 1) return [[...Array(total).keys()]];
  const outras = [...Array(total).keys()].filter((i) => i !== referencia);
  const grupos: number[][] = [];
  let i = 0;
  for (const n of tamanhosDosQuadros(outras.length)) {
    grupos.push([referencia, ...outras.slice(i, i + n)]);
    i += n;
  }
  return grupos;
}
