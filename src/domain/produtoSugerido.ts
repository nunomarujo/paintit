import type { ProductType } from './catalog';
import { normalizeText, matchesSearch } from './search';

/**
 * Sugerir o produto enquanto o pintor escreve, no diário de obra (pedido do promotor, 28/10/2026).
 *
 * «Deve o motor ir buscando referências/sugestões do catálogo à medida que o pintor escreve.»
 *
 * O campo "Produto aplicado" era texto livre com um exemplo lá dentro. Quem escreve está numa obra,
 * de telemóvel, e escreve o que se lembra: "vinil branco", "a tinta da CIN", "o mesmo de ontem".
 * Três meses depois, nem o relatório de entrega nem a comparação de preços conseguem dizer o que
 * foi aplicado — e o pintor também não.
 *
 * **O que é sugerido primeiro não vem do catálogo: vem da obra.** Os produtos que o orçamento desta
 * obra já previu são, de longe, a resposta mais provável — e aparecem antes de se escrever uma
 * letra. Só depois vem o resto do catálogo, e só a partir de duas letras, para a lista não saltar à
 * frente de quem ainda está a pensar.
 *
 * O que fica escrito é o nome canónico ("Barbot Acryl Plus VG (1279)"), e não um código: continua a
 * ler-se como texto, mas passa a ser o mesmo texto de obra para obra — que é o que `usedProducts`
 * (src/lib/reference.ts) já precisa para reconhecer o produto mais tarde, sem nenhuma coluna nova.
 *
 * O texto livre continua a valer. Quem aplicou algo que não está no catálogo escreve-o à mesma: a
 * lista sugere, nunca obriga.
 */

export interface ProdutoSugerivel {
  /** O que fica escrito no diário: marca e nome, sempre da mesma maneira. */
  label: string;
  tipo: ProductType;
  /** Da obra (o orçamento já o previu) ou do catálogo geral. */
  origem: 'obra' | 'catalogo';
  /** Acabamento, embalagem — o que distingue dois produtos de nome parecido. */
  detalhe?: string | null;
}

/** A partir de quantas letras é que o catálogo entra. Abaixo disto, só os produtos da obra. */
export const LETRAS_MINIMAS = 2;

export const MAXIMO_SUGESTOES = 6;

/**
 * As sugestões para o que está escrito.
 *
 * Com o campo vazio devolve os produtos da obra, que é o atalho que poupa o tempo todo. Com texto,
 * procura nos dois conjuntos com a mesma tolerância do catálogo — gíria e erros de escrita
 * incluídos — e mantém os da obra à frente.
 */
export function sugestoesDeProduto(
  termo: string,
  candidatos: readonly ProdutoSugerivel[],
  maximo = MAXIMO_SUGESTOES,
): ProdutoSugerivel[] {
  const escrito = termo.trim();
  const daObra = candidatos.filter((c) => c.origem === 'obra');

  const escolhidos =
    escrito.length === 0
      ? daObra
      : escrito.length < LETRAS_MINIMAS
        ? daObra.filter((c) => combina(c, escrito))
        : candidatos.filter((c) => combina(c, escrito));

  // Já escrito por inteiro não é sugestão nenhuma: a lista fechar-se sozinha é o sinal de que ficou
  // igual ao catálogo.
  const exacto = normalizeText(escrito);
  const uteis = escolhidos.filter((c) => normalizeText(c.label) !== exacto);

  const vistos = new Set<string>();
  const unicos = uteis.filter((c) => {
    const chave = normalizeText(c.label);
    if (vistos.has(chave)) return false;
    vistos.add(chave);
    return true;
  });

  return [...unicos.filter((c) => c.origem === 'obra'), ...unicos.filter((c) => c.origem === 'catalogo')].slice(0, maximo);
}

function combina(c: ProdutoSugerivel, termo: string): boolean {
  return matchesSearch(termo, { tipo: c.tipo, texto: `${c.label} ${c.detalhe ?? ''}` });
}
