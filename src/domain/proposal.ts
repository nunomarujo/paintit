import type { Cents } from './money';
import type { FieldErrors } from './organization';
import { parseHundredths, revealingContent, type AreaCm2, type SurfaceKind, SURFACE_KINDS } from './request';

// Proposta do pintor a um pedido: preço global e linhas técnicas (PRO-04), com
// o que está incluído, o que é opcional e o que só se orçamenta depois de ver
// (PRO-06). O cliente compara propostas sem saber quem as fez; o pintor nunca
// vê as dos concorrentes (PRO-09).

export const LINE_CATEGORIES = ['preparacao', 'reparacao', 'pintura', 'acessos', 'outro'] as const;
export type LineCategory = (typeof LINE_CATEGORIES)[number];
export const LINE_CATEGORY_LABELS: Record<LineCategory, string> = {
  preparacao: 'Preparação (lavagem, raspagem, primário)',
  reparacao: 'Reparações',
  pintura: 'Pintura',
  acessos: 'Acessos (andaimes, plataforma)',
  outro: 'Outro',
};

export const UNITS = ['m2', 'ml', 'un', 'vg'] as const;
export type Unit = (typeof UNITS)[number];
export const UNIT_LABELS: Record<Unit, string> = { m2: 'm²', ml: 'm', un: 'un.', vg: 'vg' };

export const INCLUSIONS = ['incluido', 'opcional', 'condicionado'] as const;
export type Inclusion = (typeof INCLUSIONS)[number];
export const INCLUSION_LABELS: Record<Inclusion, string> = {
  incluido: 'Incluído no preço',
  opcional: 'Opcional (não somado)',
  condicionado: 'Só depois de observar (preço indicativo)',
};

export const VAT_RATES_BPS = [600, 1300, 2300] as const;

export interface ProposalLine {
  categoria: LineCategory;
  descricao: string;
  superficie: SurfaceKind | null;
  /** Quantidade em centésimos da unidade (12,5 m² = 1250). */
  quantidade: number;
  unidade: Unit;
  precoUnitario: Cents;
  demaos: number | null;
  produto: string | null;
  inclusao: Inclusion;
  /** Produto do catálogo de um fornecedor certificado (material certificado). */
  productId?: string | null;
}

/** Total de uma linha em cêntimos, arredondado ao cêntimo. */
export function lineTotal(l: Pick<ProposalLine, 'quantidade' | 'precoUnitario'>): Cents {
  return Math.round((l.quantidade * l.precoUnitario) / 100);
}

export interface ProposalTotals {
  /** Base sem IVA: só linhas incluídas. É a base da comissão e da garantia. */
  base: Cents;
  opcionais: Cents;
  condicionados: Cents;
  iva: Cents;
  totalComIva: Cents;
}

export function proposalTotals(lines: ProposalLine[], ivaBps: number): ProposalTotals {
  const sum = (inc: Inclusion) => lines.filter((l) => l.inclusao === inc).reduce((n, l) => n + lineTotal(l), 0);
  const base = sum('incluido');
  const iva = Math.round((base * ivaBps) / 10_000);
  return { base, opcionais: sum('opcional'), condicionados: sum('condicionado'), iva, totalComIva: base + iva };
}

export interface ProposalTerms {
  ivaBps: number;
  validade: string | null; // AAAA-MM-DD
  inicioPossivel: string | null;
  duracaoDias: number | null;
  adiantamentoBps: number;
  /** Preço por m² para correções de área (DEC-15), em cêntimos. */
  precoAjusteM2: Cents | null;
  garantiaAnos: number | null;
  exclusoes: string;
  notas: string;
}

export const MAX_ADVANCE_BPS = 3000;

export interface SubmitCheckInput {
  terms: ProposalTerms;
  lines: ProposalLine[];
  today: string;
  requestOpen: boolean;
}

/** O que impede a submissão (PIN-17). Vazio = pode ser submetida. */
export function submitBlockers(input: SubmitCheckInput): string[] {
  const out: string[] = [];
  const { terms, lines } = input;
  if (!input.requestOpen) out.push('O pedido já não aceita propostas.');
  if (proposalTotals(lines, terms.ivaBps).base <= 0) out.push('Inclua no preço pelo menos uma linha com valor.');
  if (!terms.validade) out.push('Indique até quando a proposta é válida.');
  else if (terms.validade < input.today) out.push('A validade já passou.');
  if (!terms.duracaoDias) out.push('Indique a duração estimada da obra.');
  if (terms.adiantamentoBps > MAX_ADVANCE_BPS) out.push('O adiantamento de adjudicação não pode passar de 30%.');
  const texts = [terms.exclusoes, terms.notas, ...lines.flatMap((l) => [l.descricao, l.produto ?? ''])];
  const revealing = [...new Set(texts.flatMap(revealingContent))];
  if (revealing.length > 0) {
    out.push(`A proposta parece conter ${revealing.join(', ')}. Os contactos só são trocados depois da apresentação.`);
  }
  return out;
}

// --- Comparação ------------------------------------------------------------------

export interface ComparableProposal {
  id: string;
  lines: ProposalLine[];
  ivaBps: number;
  duracaoDias: number | null;
  inicioPossivel: string | null;
  adiantamentoBps: number;
}

export interface ComparisonRow {
  id: string;
  /** "Pintor A", "Pintor B"… pela ordem de chegada; a identidade só é revelada na apresentação. */
  alias: string;
  totals: ProposalTotals;
  precoM2: Cents | null;
  /** Superfícies do pedido sem nenhuma linha incluída: aparecem como "não indicado" (CLI-15, CMP-03). */
  superficiesEmFalta: SurfaceKind[];
  temCondicionados: boolean;
  categorias: Record<LineCategory, Cents | null>;
  /** Linhas incluídas com material certificado / linhas incluídas com algum produto. */
  materiaisCertificados: number;
}

export const alias = (index: number) =>
  `Pintor ${index < 26 ? String.fromCharCode(65 + index) : String(index + 1)}`;

export function compareProposals(
  proposals: ComparableProposal[],
  request: { areaTotal: AreaCm2; superficies: SurfaceKind[] },
): ComparisonRow[] {
  return proposals.map((p, i) => {
    const totals = proposalTotals(p.lines, p.ivaBps);
    const included = p.lines.filter((l) => l.inclusao === 'incluido');
    const covered = new Set(included.map((l) => l.superficie).filter((s): s is SurfaceKind => s !== null));
    const categorias = Object.fromEntries(
      LINE_CATEGORIES.map((c) => {
        const ls = included.filter((l) => l.categoria === c);
        return [c, ls.length === 0 ? null : ls.reduce((n, l) => n + lineTotal(l), 0)];
      }),
    ) as Record<LineCategory, Cents | null>;
    return {
      id: p.id,
      alias: alias(i),
      totals,
      precoM2: request.areaTotal > 0 ? Math.round((totals.base * 100) / request.areaTotal) : null,
      superficiesEmFalta: [...new Set(request.superficies)].filter((s) => !covered.has(s)),
      temCondicionados: p.lines.some((l) => l.inclusao === 'condicionado'),
      categorias,
      materiaisCertificados: included.filter((l) => l.productId).length,
    };
  });
}

export type SortKey = 'preco' | 'prazo' | 'completude';
export const SORT_LABELS: Record<SortKey, string> = {
  preco: 'Preço sem IVA',
  prazo: 'Duração',
  completude: 'Superfícies cobertas',
};

/** Ordena sem esconder o critério (CMP-02). Empates mantêm a ordem de chegada. */
export function sortRows(rows: ComparisonRow[], key: SortKey, durations: Record<string, number | null>): ComparisonRow[] {
  const val = (r: ComparisonRow) =>
    key === 'preco' ? r.totals.base : key === 'prazo' ? (durations[r.id] ?? Number.MAX_SAFE_INTEGER) : r.superficiesEmFalta.length;
  return [...rows].sort((a, b) => val(a) - val(b));
}

// --- Formulários -----------------------------------------------------------------

/** "12,50" euros → cêntimos; null se vazio; NaN se inválido. */
export const parseEuros = parseHundredths;

const isOneOf = <T extends string>(list: readonly T[], v: string): v is T => (list as readonly string[]).includes(v);

export function parseLine(form: FormData): { value?: ProposalLine; errors: FieldErrors } {
  const errors: FieldErrors = {};
  const get = (k: string) => String(form.get(k) ?? '').trim();
  const categoria = get('categoria');
  if (!isOneOf(LINE_CATEGORIES, categoria)) errors.categoria = 'Escolha a categoria.';
  const unidade = get('unidade') || 'm2';
  if (!isOneOf(UNITS, unidade)) errors.unidade = 'Unidade inválida.';
  const inclusao = get('inclusao') || 'incluido';
  if (!isOneOf(INCLUSIONS, inclusao)) errors.inclusao = 'Escolha se está incluído.';
  const superficie = get('superficie');
  if (superficie && !isOneOf(SURFACE_KINDS, superficie)) errors.superficie = 'Superfície inválida.';
  const descricao = get('descricao');
  if (!descricao) errors.descricao = 'Descreva o trabalho.';
  const quantidade = parseHundredths(form.get('quantidade'));
  if (quantidade === null || Number.isNaN(quantidade) || quantidade <= 0) errors.quantidade = 'Quantidade maior do que zero.';
  const preco = parseEuros(form.get('preco'));
  if (preco === null || Number.isNaN(preco)) errors.preco = 'Preço em euros, com até 2 casas decimais.';
  const demaosRaw = get('demaos');
  const demaos = demaosRaw ? Number(demaosRaw) : null;
  if (demaos !== null && (!Number.isInteger(demaos) || demaos < 1 || demaos > 5)) errors.demaos = 'Entre 1 e 5.';
  if (Object.keys(errors).length > 0) return { errors };
  return {
    errors,
    value: {
      categoria: categoria as LineCategory,
      descricao,
      superficie: (superficie || null) as SurfaceKind | null,
      quantidade: quantidade!,
      unidade: unidade as Unit,
      precoUnitario: preco!,
      demaos,
      produto: get('produto') || null,
      inclusao: inclusao as Inclusion,
    },
  };
}

const DATE = /^\d{4}-\d{2}-\d{2}$/;

export function parseTerms(form: FormData): { value?: ProposalTerms; errors: FieldErrors } {
  const errors: FieldErrors = {};
  const get = (k: string) => String(form.get(k) ?? '').trim();
  const ivaBps = Number(get('ivaBps') || '2300');
  if (!(VAT_RATES_BPS as readonly number[]).includes(ivaBps)) errors.ivaBps = 'Taxa de IVA inválida.';
  const dates: Record<string, string | null> = {};
  for (const k of ['validade', 'inicioPossivel']) {
    const v = get(k);
    if (v && !DATE.test(v)) errors[k] = 'Data inválida.';
    dates[k] = v || null;
  }
  const int = (k: string, min: number, max: number) => {
    const v = get(k);
    if (!v) return null;
    const n = Number(v);
    if (!Number.isInteger(n) || n < min || n > max) {
      errors[k] = `Entre ${min} e ${max}.`;
      return null;
    }
    return n;
  };
  const duracaoDias = int('duracaoDias', 1, 730);
  const garantiaAnos = int('garantiaAnos', 0, 10);
  const adiantamentoPct = parseHundredths(form.get('adiantamento'));
  if (Number.isNaN(adiantamentoPct)) errors.adiantamento = 'Percentagem inválida.';
  const precoAjusteM2 = parseEuros(form.get('precoAjusteM2'));
  if (Number.isNaN(precoAjusteM2)) errors.precoAjusteM2 = 'Preço em euros.';
  if (Object.keys(errors).length > 0) return { errors };
  return {
    errors,
    value: {
      ivaBps,
      validade: dates.validade ?? null,
      inicioPossivel: dates.inicioPossivel ?? null,
      duracaoDias,
      // parseHundredths devolve centésimos: 10,5% → 1050 pontos-base.
      adiantamentoBps: adiantamentoPct ?? 0,
      precoAjusteM2,
      garantiaAnos,
      exclusoes: get('exclusoes'),
      notas: get('notas'),
    },
  };
}
