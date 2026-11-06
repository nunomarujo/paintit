import type { Cents } from './money';
import { pricePerLitre } from './reference';

// A lista de materiais do interior (adenda 2, 06/11/2026): os produtos de referência, com os preços de
// mercado (data e fonte), o preço por litro e por m², e uma **estimativa** de consumo — nunca um
// orçamento. Preços de referência de mercado, não da Quem Pinta nem de um pintor.

export const TIPOS_DA_LISTA_POR_OMISSAO = ['tinta_interior', 'primario', 'esmalte'] as const;
export const DEMAOS_POR_OMISSAO = 2;

/** Litros ≈ área ÷ rendimento × demãos. `null` sem área, sem rendimento ou sem demãos válidas: não se inventa. */
export function litrosEstimados(areaM2: number | null, rendimentoM2L: number | null, demaos: number): number | null {
  if (!areaM2 || areaM2 <= 0 || !rendimentoM2L || rendimentoM2L <= 0 || !Number.isInteger(demaos) || demaos < 1 || demaos > 5) return null;
  return Math.ceil((areaM2 / rendimentoM2L) * demaos * 10) / 10;
}

/** Embalagens para os litros estimados, com a embalagem indicada (a maior que caiba, em número inteiro). */
export function embalagensEstimadas(litros: number | null, embalagemL: number | null): number | null {
  if (litros === null || !embalagemL || embalagemL <= 0) return null;
  return Math.ceil(litros / embalagemL);
}

export interface PrecoDeReferencia {
  precoCents: Cents | null;
  embalagemL: number | null;
  m2PorEmbalagem: number | null;
  rendimentoM2L: number | null;
}

/**
 * Preço por litro e por m² pintado (por demão): por m² com o rendimento quando há preço por litro;
 * senão, com os m² por embalagem. Qualquer parcela em falta dá `null`, nunca zero.
 */
export function precosUnitarios(p: PrecoDeReferencia): { porLitro: Cents | null; porM2: Cents | null } {
  const porLitro = pricePerLitre({ preco: p.precoCents, litros: p.embalagemL });
  const porM2 =
    porLitro !== null && p.rendimentoM2L && p.rendimentoM2L > 0
      ? Math.round(porLitro / p.rendimentoM2L)
      : pricePerLitre({ preco: p.precoCents, litros: p.m2PorEmbalagem });
  return { porLitro, porM2 };
}
