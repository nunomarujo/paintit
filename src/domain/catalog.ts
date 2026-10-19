import type { Cents } from './money';
import type { FieldErrors } from './organization';
import { parseHundredths, type AreaCm2 } from './request';

// Catálogo de fornecedores: produtos com ficha técnica, rendimento e preço de
// referência datado (CMP-05). Serve para o pintor escolher o produto da linha
// e para estimar a quantidade necessária (CMP-06), nunca para concluir que um
// produto é melhor por ser mais caro ou mais conhecido (CMP-04).

export const PRODUCT_TYPES = [
  'tinta_exterior',
  'tinta_interior',
  'primario',
  'impermeabilizante',
  'esmalte',
  'massa_reparacao',
  'outro',
] as const;
export type ProductType = (typeof PRODUCT_TYPES)[number];
export const PRODUCT_TYPE_LABELS: Record<ProductType, string> = {
  tinta_exterior: 'Tinta de exterior',
  tinta_interior: 'Tinta de interior',
  primario: 'Primário / isolante',
  impermeabilizante: 'Impermeabilizante',
  esmalte: 'Esmalte (metais, madeiras)',
  massa_reparacao: 'Massa de reparação',
  outro: 'Outro',
};

export interface ProductInput {
  nome: string;
  marca: string;
  referencia: string | null;
  tipo: ProductType;
  /** m² por litro e por demão, em centésimos (12,5 m²/L = 1250). */
  rendimento: number | null;
  /** Embalagem em mililitros. */
  embalagemMl: number | null;
  precoReferencia: Cents | null;
  precoData: string | null;
}

export interface Consumption {
  /** Litros necessários, em mililitros. */
  ml: number;
  embalagens: number | null;
  custo: Cents | null;
}

/** Quantidade para uma área e número de demãos; as embalagens arredondam para cima. */
export function consumption(area: AreaCm2, demaos: number, p: Pick<ProductInput, 'rendimento' | 'embalagemMl' | 'precoReferencia'>): Consumption | null {
  if (!p.rendimento || p.rendimento <= 0 || area <= 0 || demaos <= 0) return null;
  // área (cm2 = centésimos de m²) / rendimento (centésimos de m²/L) = litros.
  const ml = Math.ceil((area * demaos * 1000) / p.rendimento);
  const embalagens = p.embalagemMl ? Math.ceil(ml / p.embalagemMl) : null;
  return { ml, embalagens, custo: embalagens !== null && p.precoReferencia !== null ? embalagens * p.precoReferencia : null };
}

export function productLabel(p: Pick<ProductInput, 'marca' | 'nome' | 'referencia'>): string {
  return `${p.marca} ${p.nome}${p.referencia ? ` (${p.referencia})` : ''}`;
}

const DATE = /^\d{4}-\d{2}-\d{2}$/;

export function parseProduct(form: FormData): { value?: ProductInput; errors: FieldErrors } {
  const errors: FieldErrors = {};
  const get = (k: string) => String(form.get(k) ?? '').trim();
  const nome = get('nome');
  if (!nome) errors.nome = 'Indique o nome do produto.';
  const marca = get('marca');
  if (!marca) errors.marca = 'Indique a marca.';
  const tipo = get('tipo');
  if (!(PRODUCT_TYPES as readonly string[]).includes(tipo)) errors.tipo = 'Escolha o tipo.';
  const rendimento = parseHundredths(form.get('rendimento'));
  if (Number.isNaN(rendimento) || (rendimento !== null && rendimento <= 0)) errors.rendimento = 'm² por litro, maior do que zero.';
  const litros = parseHundredths(form.get('embalagem'));
  if (Number.isNaN(litros) || (litros !== null && litros <= 0)) errors.embalagem = 'Litros por embalagem.';
  const preco = parseHundredths(form.get('preco'));
  if (Number.isNaN(preco)) errors.preco = 'Preço em euros.';
  const precoData = get('precoData') || null;
  if (precoData && !DATE.test(precoData)) errors.precoData = 'Data inválida.';
  if (preco !== null && !Number.isNaN(preco) && !precoData) errors.precoData = 'Indique a data do preço.';
  if (Object.keys(errors).length > 0) return { errors };
  return {
    errors,
    value: {
      nome,
      marca,
      referencia: get('referencia') || null,
      tipo: tipo as ProductType,
      rendimento,
      // litros em centésimos → mililitros
      embalagemMl: litros === null ? null : litros * 10,
      precoReferencia: preco,
      precoData,
    },
  };
}
