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
  unidade?: 'L' | 'kg';
  descricao?: string | null;
  modosAplicacao?: string[];
  acabamento?: string | null;
  uso?: string | null;
  base?: string | null;
  secagemHoras?: number | null;
  diluicao?: string | null;
  demaosRecomendadas?: number | null;
  /** Preço de tabela para pintores, antes dos descontos. */
  precoFornecedor?: Cents | null;
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

export interface MaterialCheck {
  /** Litros/embalagens/custo esperados para esta linha, com as demãos declaradas (ou as recomendadas, se não
   * houver nenhuma declarada). null se o produto não tiver rendimento (sem base para estimar). */
  consumo: Consumption | null;
  /** As demãos declaradas excedem em mais de uma as recomendadas pelo próprio produto — um pintor não pode
   * justificar o rendimento mínimo, nem o fornecedor o preço de referência, por isso não é fraude do fornecedor;
   * é só um sinal para o cliente notar, não um bloqueio (decisão de 22/10/2026, docs/DECISOES.md). */
  demaosAcimaDoEsperado: boolean;
}

/** Sinal de transparência para uma linha com material comprometido: a conta de litros/custo esperada, e se as
 * demãos declaradas se afastam muito da recomendação do próprio produto. */
export function materialCheck(
  area: AreaCm2,
  demaos: number | null,
  p: Pick<ProductInput, 'rendimento' | 'embalagemMl' | 'precoReferencia' | 'demaosRecomendadas'>,
): MaterialCheck {
  const recomendadas = p.demaosRecomendadas ?? null;
  const efetivas = demaos ?? recomendadas ?? 2;
  return {
    consumo: consumption(area, efetivas, p),
    demaosAcimaDoEsperado: demaos !== null && recomendadas !== null && demaos > recomendadas + 1,
  };
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
  const unidade = get('unidade') || 'L';
  if (unidade !== 'L' && unidade !== 'kg') errors.unidade = 'Litros ou quilos.';
  const modos = form.getAll('modos').map(String).filter((m) => (APPLICATION_METHODS as readonly string[]).includes(m));
  const acabamento = get('acabamento') || null;
  if (acabamento && !(FINISHES as readonly string[]).includes(acabamento)) errors.acabamento = 'Acabamento inválido.';
  const uso = get('uso') || null;
  if (uso && !['interior', 'exterior', 'ambos'].includes(uso)) errors.uso = 'Uso inválido.';
  const base = get('base') || null;
  if (base && !['aquosa', 'solvente'].includes(base)) errors.base = 'Base inválida.';
  const secagemRaw = get('secagem');
  const secagemHoras = secagemRaw ? Number(secagemRaw) : null;
  if (secagemHoras !== null && (!Number.isInteger(secagemHoras) || secagemHoras < 0 || secagemHoras > 720)) errors.secagem = 'Horas, de 0 a 720.';
  const demaosRaw = get('demaos');
  const demaosRecomendadas = demaosRaw ? Number(demaosRaw) : null;
  if (demaosRecomendadas !== null && (!Number.isInteger(demaosRecomendadas) || demaosRecomendadas < 1 || demaosRecomendadas > 5)) {
    errors.demaos = 'De 1 a 5.';
  }
  const precoFornecedor = parseHundredths(form.get('precoFornecedor'));
  if (Number.isNaN(precoFornecedor)) errors.precoFornecedor = 'Preço em euros.';
  if (Object.keys(errors).length > 0) return { errors };
  return {
    errors,
    value: {
      unidade: unidade as 'L' | 'kg',
      descricao: get('descricao') || null,
      modosAplicacao: modos,
      acabamento,
      uso,
      base,
      secagemHoras,
      diluicao: get('diluicao') || null,
      demaosRecomendadas,
      precoFornecedor,
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

// --- Características gerais ------------------------------------------------------

export const SALE_UNITS = ['L', 'kg'] as const;
export type SaleUnit = (typeof SALE_UNITS)[number];

export const APPLICATION_METHODS = ['rolo', 'trincha', 'pistola_airless', 'pistola_convencional', 'talocha', 'espatula'] as const;
export type ApplicationMethod = (typeof APPLICATION_METHODS)[number];
export const APPLICATION_LABELS: Record<ApplicationMethod, string> = {
  rolo: 'Rolo',
  trincha: 'Trincha',
  pistola_airless: 'Pistola airless',
  pistola_convencional: 'Pistola convencional',
  talocha: 'Talocha',
  espatula: 'Espátula',
};

export const FINISHES = ['mate', 'acetinado', 'semibrilho', 'brilhante', 'texturado'] as const;
export type Finish = (typeof FINISHES)[number];

// --- Descontos dos fornecedores -------------------------------------------------
// Regras definidas antecipadamente pelo fornecedor, por produto, por tipo de
// produto ou para todo o catálogo, com escalões de área da obra. A app mostra ao
// pintor o melhor desconto aplicável à área que está a orçamentar.

export const PAYMENT_TERMS = ['pronto', 'diferido'] as const;
export type PaymentTerms = (typeof PAYMENT_TERMS)[number];
export const PAYMENT_TERMS_LABELS: Record<PaymentTerms, string> = {
  pronto: 'pronto pagamento',
  diferido: 'pagamento diferido (crédito)',
};
export const BUYER_PROFILES = ['primeira_compra', 'cliente_frequente'] as const;
export type BuyerProfile = (typeof BUYER_PROFILES)[number];
export const BUYER_PROFILE_LABELS: Record<BuyerProfile, string> = {
  primeira_compra: 'primeira compra a este fornecedor',
  cliente_frequente: 'cliente frequente',
};
/** Encomendas entregues a partir das quais o pintor é cliente frequente de um fornecedor. */
export const FREQUENT_MIN_ORDERS = 3;

export interface DiscountRule {
  id: string;
  /** Produto concreto; ou null para um tipo ou todo o catálogo. */
  productId: string | null;
  tipo: ProductType | null;
  /** Escalão de área da obra, em centésimos de m² (inclusivo). */
  minArea: AreaCm2 | null;
  maxArea: AreaCm2 | null;
  bps: number;
  validUntil: string | null; // AAAA-MM-DD
  /** Desconto só para este cliente (pintor); null para todos. */
  painterOrgId?: string | null;
  /** Só com esta condição de pagamento. */
  pagamento?: PaymentTerms | null;
  /** Só a partir desta quantidade de embalagens. */
  minQuantidade?: number | null;
  /** Só para este perfil de comprador. */
  perfil?: BuyerProfile | null;
}

/** O que se sabe do comprador e da compra. O que não se sabe fica por definir. */
export interface BuyerContext {
  painterOrgId?: string | null;
  /** Encomendas entregues deste pintor a este fornecedor. */
  deliveredOrders?: number;
  pagamento?: PaymentTerms;
  quantidade?: number;
}

const baseMatch = (r: DiscountRule, product: { id: string; tipo: ProductType }, area: AreaCm2, today: string, ctx: BuyerContext) =>
  (!r.painterOrgId || r.painterOrgId === ctx.painterOrgId) &&
  (r.productId === null || r.productId === product.id) &&
  (r.tipo === null || r.tipo === product.tipo) &&
  (r.minArea === null || area >= r.minArea) &&
  (r.maxArea === null || area <= r.maxArea) &&
  (r.validUntil === null || r.validUntil >= today) &&
  (!r.perfil ||
    (r.perfil === 'primeira_compra' && ctx.deliveredOrders === 0) ||
    (r.perfil === 'cliente_frequente' && (ctx.deliveredOrders ?? 0) >= FREQUENT_MIN_ORDERS));

/** Condições de compra que a regra exige e o contexto ainda não confirma. */
function pending(r: DiscountRule, ctx: BuyerContext): string[] {
  const out: string[] = [];
  if (r.pagamento && ctx.pagamento !== r.pagamento) out.push(PAYMENT_TERMS_LABELS[r.pagamento]);
  if (r.minQuantidade && (ctx.quantidade ?? 0) < r.minQuantidade) out.push(`a partir de ${r.minQuantidade} embalagens`);
  return out;
}

export function bestDiscount(
  product: { id: string; tipo: ProductType },
  area: AreaCm2,
  today: string,
  rules: DiscountRule[],
  ctx: BuyerContext = {},
): DiscountRule | null {
  const applicable = rules.filter((r) => baseMatch(r, product, area, today, ctx) && pending(r, ctx).length === 0);
  return applicable.reduce<DiscountRule | null>((best, r) => (best === null || r.bps > best.bps ? r : best), null);
}

/** Descontos maiores que o garantido, que dependem da forma de pagamento ou da quantidade. */
export function conditionalOffers(
  product: { id: string; tipo: ProductType },
  area: AreaCm2,
  today: string,
  rules: DiscountRule[],
  ctx: BuyerContext = {},
): { bps: number; condicoes: string[] }[] {
  const base = bestDiscount(product, area, today, rules, ctx)?.bps ?? 0;
  return rules
    .filter((r) => r.bps > base && baseMatch(r, product, area, today, ctx))
    .map((r) => ({ bps: r.bps, condicoes: pending(r, ctx) }))
    .filter((o) => o.condicoes.length > 0)
    .sort((a, b) => b.bps - a.bps);
}

/** Preço com desconto, arredondado ao cêntimo. */
export function discounted(price: Cents, bps: number): Cents {
  return price - Math.floor((price * bps + 5000) / 10000);
}

// --- Entrega em obra ---------------------------------------------------------------

export interface DeliveryRule {
  /** Concelhos servidos; vazio = todo o país. */
  concelhos: string[];
  incluida: boolean;
  custo: Cents | null;
  /** Encomenda mínima para a entrega incluída. */
  minimo: Cents | null;
  condicoes: string;
}

export type DeliveryQuote =
  | { kind: 'incluida' }
  | { kind: 'paga'; custo: Cents | null; condicoes: string }
  | { kind: 'sem_entrega' };

const norm = (s: string) => s.trim().toLocaleLowerCase('pt-PT').normalize('NFD').replace(/\p{Diacritic}/gu, '');

/** Condições de entrega numa obra no `concelho`, para uma encomenda de `valor`. */
export function deliveryFor(rules: DeliveryRule[], concelho: string, valor: Cents): DeliveryQuote {
  const here = rules.filter((r) => r.concelhos.length === 0 || r.concelhos.some((c) => norm(c) === norm(concelho)));
  if (here.length === 0) return { kind: 'sem_entrega' };
  if (here.some((r) => r.incluida && (r.minimo === null || valor >= r.minimo))) return { kind: 'incluida' };
  const paid = here.filter((r) => !r.incluida || r.custo !== null);
  const cheapest = paid.reduce<DeliveryRule | null>((b, r) => (b === null || (r.custo ?? Infinity) < (b.custo ?? Infinity) ? r : b), null);
  return { kind: 'paga', custo: cheapest?.custo ?? null, condicoes: cheapest?.condicoes ?? here[0]!.condicoes };
}

/** "10,5" (%) → pontos-base; null se vazio; NaN se inválido ou fora de 0–100%. */
export function parsePercent(v: FormDataEntryValue | null): number | null {
  const h = parseHundredths(v);
  if (h === null) return null;
  return Number.isNaN(h) || h > 10000 ? Number.NaN : h;
}
