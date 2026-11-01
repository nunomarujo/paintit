/**
 * Até quanto pode um vendedor descontar (01/11/2026, decisão do promotor).
 *
 * O dono da empresa define tetos em três níveis, e os três coexistem:
 *
 * - **da empresa** — vale para todos os vendedores («até 10%»);
 * - **do vendedor** — substitui o da empresa para essa pessoa, para cima ou para baixo («o João até
 *   15%»): é o que premeia quem tem mais traquejo, e por isso substitui em vez de limitar;
 * - **do produto ou da categoria** — é um teto que se aplica sempre por cima dos outros dois («nos
 *   esmaltes, nunca mais de 5%»): existe para proteger as margens apertadas, e um vendedor de
 *   confiança não é razão para as furar.
 *
 * Daí a ordem: a autorização da pessoa decide o ponto de partida, e o produto corta-o se for preciso.
 *
 * **Sem autorização nenhuma escrita, o limite é zero** — um vendedor não desconta. É o comportamento de
 * hoje, e é o que fica a valer para quem nunca mexer nestas regras.
 *
 * Esta função é a única dona da regra: a base de dados tem a sua cópia em plpgsql, e um teste compara
 * as duas (regra 2 do CLAUDE.md).
 */

export type LimiteDeDesconto = {
  /** Nulo: vale para todos os vendedores da empresa. */
  vendedorUserId: string | null;
  /** Nulo: vale para todas as categorias. */
  tipo: string | null;
  /** Nulo: vale para todos os produtos. */
  productId: string | null;
  limiteBps: number;
};

export type Artigo = { tipo: string | null; productId: string | null };

const geralDaEmpresa = (l: LimiteDeDesconto) => !l.vendedorUserId && !l.tipo && !l.productId;
const doVendedor = (l: LimiteDeDesconto, u: string) => l.vendedorUserId === u && !l.tipo && !l.productId;

/**
 * O teto que vale para esta pessoa neste artigo, em pontos-base. Zero significa «não pode descontar».
 *
 * Um desconto sem produto nem categoria — a campanha aberta a todo o catálogo — tem de respeitar o
 * teto mais apertado de todos os produtos, senão bastava não escolher produto para o contornar.
 */
export function limiteAplicavel(limites: LimiteDeDesconto[], vendedorUserId: string, artigo: Artigo): number {
  const pessoal = limites.find((l) => doVendedor(l, vendedorUserId));
  const empresa = limites.find(geralDaEmpresa);
  const base = pessoal?.limiteBps ?? empresa?.limiteBps ?? 0;

  const tetos = limites.filter((l) => !l.vendedorUserId && (l.tipo !== null || l.productId !== null));
  const aplicaveis = artigo.productId
    ? tetos.filter((l) => l.productId === artigo.productId || (l.tipo !== null && l.tipo === artigo.tipo))
    : artigo.tipo
      ? tetos.filter((l) => l.tipo === artigo.tipo)
      : // Todo o catálogo: respeita o teto mais apertado que exista, seja de que produto for.
        tetos;

  return aplicaveis.reduce((n, l) => Math.min(n, l.limiteBps), base);
}

/** Se este desconto cabe no que a pessoa pode dar. */
export function descontoAceitavel(
  limites: LimiteDeDesconto[],
  vendedorUserId: string,
  artigo: Artigo,
  descontoBps: number,
): boolean {
  return descontoBps >= 0 && descontoBps <= limiteAplicavel(limites, vendedorUserId, artigo);
}

/** O limite em palavras, para o ecrã dizer o que se pode dar antes de alguém tentar. */
export function limiteEmPalavras(bps: number): string {
  if (bps <= 0) return 'Sem autorização para descontar';
  return `Até ${(bps / 100).toLocaleString('pt-PT', { maximumFractionDigits: 2 })}%`;
}
