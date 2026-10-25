import type { Cents } from './money';
import type { FieldErrors } from './organization';
import { workDef } from './works';
import { parseHundredths, revealingContent, type AreaCm2, type SurfaceKind, SURFACE_KINDS } from './request';

// Proposta do pintor a um pedido: preço global e linhas técnicas (PRO-04), com
// o que está incluído, o que é opcional e o que só se orçamenta depois de ver
// (PRO-06). O cliente compara propostas sem saber quem as fez; o pintor nunca
// vê as dos concorrentes (PRO-09).

export const LINE_CATEGORIES = ['preparacao', 'reparacao', 'pintura', 'acessos', 'licencas', 'outro'] as const;
export type LineCategory = (typeof LINE_CATEGORIES)[number];
export const LINE_CATEGORY_LABELS: Record<LineCategory, string> = {
  preparacao: 'Preparação (lavagem, raspagem, primário)',
  reparacao: 'Reparações',
  pintura: 'Pintura',
  acessos: 'Acessos (andaimes, plataforma)',
  licencas: 'Licenças camarárias (ocupação da via pública)',
  outro: 'Outro',
};

export const UNITS = ['m2', 'ml', 'un', 'vg'] as const;
export type Unit = (typeof UNITS)[number];
// "vg" é verba global: um preço fechado para o trabalho todo, sem quantidade a multiplicar. Estava
// abreviado e ninguém de fora o percebia — nem o pintor, nem o cliente que recebe o documento.
export const UNIT_LABELS: Record<Unit, string> = { m2: 'm²', ml: 'm', un: 'un.', vg: 'verba global' };

export const INCLUSIONS = ['incluido', 'opcional', 'condicionado', 'nao_incluido'] as const;
export type Inclusion = (typeof INCLUSIONS)[number];
export const INCLUSION_LABELS: Record<Inclusion, string> = {
  incluido: 'Incluído no preço',
  opcional: 'Opcional (não somado)',
  condicionado: 'Só depois de observar (preço indicativo)',
  nao_incluido: 'Não incluído',
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
  /** Produto do catálogo de um fornecedor registado na plataforma (material comprometido). */
  productId?: string | null;
  /** Trabalho do orçamento guiado que gerou a linha (src/domain/works.ts); 'global' = preço global da obra. */
  trabalho?: string | null;
  /** Zonas (fachadas) do pedido a que a linha se aplica; vazio = obra toda. */
  zonas?: string[];
  /** Porque esta linha só se aplica a algumas zonas. */
  motivoDiferenca?: string | null;
}

/** Total de uma linha em cêntimos, arredondado ao cêntimo. */
export function lineTotal(l: Pick<ProposalLine, 'quantidade' | 'precoUnitario'>): Cents {
  return Math.round((l.quantidade * l.precoUnitario) / 100);
}

export interface ProposalTotals {
  /** Base sem IVA: só linhas incluídas. É a base da comissão e da caução. */
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

/** Fase do plano de pagamentos: nome livre e percentagem do preço em pontos-base. */
export interface PaymentPhase {
  nome: string;
  bps: number;
}
export const MAX_PHASES = 8;
export type Declared = 'sim' | 'nao';

/** O adiantamento e as fases têm de somar 100% do preço. null = em ordem. */
export function phasesProblem(adiantamentoBps: number, fases: PaymentPhase[]): string | null {
  if (fases.length === 0) return 'Indique o plano de pagamentos: as fases e a percentagem de cada uma.';
  const sum = adiantamentoBps + fases.reduce((n, f) => n + f.bps, 0);
  if (sum !== 10_000) return `O plano de pagamentos soma ${(sum / 100).toLocaleString('pt-PT')}%: tem de somar 100%.`;
  return null;
}

export function parseFases(raw: unknown): PaymentPhase[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((x): x is { nome: string; bps: number } => typeof x === 'object' && x !== null && typeof (x as { nome?: unknown }).nome === 'string' && Number.isInteger((x as { bps?: unknown }).bps))
    .map((x) => ({ nome: x.nome, bps: x.bps }));
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
  /** Plano de pagamentos por fases (além do adiantamento). */
  fases: PaymentPhase[];
  /** O pintor confirma que o orçamento inclui mão-de-obra qualificada para a execução proposta. */
  confirmaMaoObra: boolean;
  /** Seguros declarados: responsabilidade civil e acidentes de trabalho. null = por declarar. */
  seguroRc: Declared | null;
  seguroAt: Declared | null;
  /** Preço por trabalho ou um preço global da obra. */
  modoPreco?: 'detalhado' | 'global';
}

export const MAX_ADVANCE_BPS = 3000;

export interface SubmitCheckInput {
  terms: ProposalTerms;
  lines: ProposalLine[];
  today: string;
  requestOpen: boolean;
  /** O anúncio prevê ocupação da via pública: a proposta tem de prever as licenças. */
  viaPublica?: 'sim' | 'nao' | 'a_avaliar';
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
  if (!terms.confirmaMaoObra) out.push('Confirme que o orçamento inclui mão-de-obra qualificada para a execução proposta.');
  if (!terms.seguroRc || !terms.seguroAt) out.push('Declare os seguros: responsabilidade civil e acidentes de trabalho.');
  const phases = phasesProblem(terms.adiantamentoBps, terms.fases);
  if (phases) out.push(phases);
  if ((terms.modoPreco ?? 'detalhado') === 'detalhado') {
    const unpriced = lines.filter((l) => l.trabalho && l.trabalho !== 'global' && (l.inclusao === 'incluido' || l.inclusao === 'opcional') && l.precoUnitario === 0);
    if (unpriced.length > 0) out.push(`Falta o preço de: ${[...new Set(unpriced.map((l) => workDef(l.trabalho!)?.label ?? l.trabalho))].join(', ')}.`);
  }
  if (input.viaPublica === 'sim' && !lines.some((l) => l.categoria === 'licencas' && l.inclusao !== 'opcional')) {
    out.push('A obra prevê ocupação da via pública: acrescente uma linha de licenças camarárias (incluída ou só depois de observar).');
  }
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
  /** Zonas do pedido (por id) sem nenhuma linha incluída que as abranja. */
  zonasEmFalta: string[];
  id: string;
  /** "Pintor A", "Pintor B"… pela ordem de chegada; a identidade só é revelada na apresentação. */
  alias: string;
  totals: ProposalTotals;
  precoM2: Cents | null;
  /** Superfícies do pedido sem nenhuma linha incluída: aparecem como "não indicado" (CLI-15, CMP-03). */
  superficiesEmFalta: SurfaceKind[];
  temCondicionados: boolean;
  categorias: Record<LineCategory, Cents | null>;
  /** Linhas incluídas com material comprometido / linhas incluídas com algum produto. */
  materiaisCertificados: number;
}

export const alias = (index: number) =>
  `Pintor ${index < 26 ? String.fromCharCode(65 + index) : String(index + 1)}`;

export function compareProposals(
  proposals: ComparableProposal[],
  request: { areaTotal: AreaCm2; superficies: SurfaceKind[]; zonas?: { id: string; kind: SurfaceKind }[] },
): ComparisonRow[] {
  return proposals.map((p, i) => {
    const totals = proposalTotals(p.lines, p.ivaBps);
    const included = p.lines.filter((l) => l.inclusao === 'incluido');
    const covered = new Set(included.map((l) => l.superficie).filter((s): s is SurfaceKind => s !== null));
    // Com zonas identificadas, cobre-se cada zona: por id, ou (linhas antigas, sem zonas) pelo tipo de superfície.
    const zonasEmFalta = (request.zonas ?? [])
      .filter((z) => !included.some((l) => (l.zonas?.length ? l.zonas.includes(z.id) : l.superficie === z.kind)))
      .map((z) => z.id);
    const missingKinds = request.zonas
      ? [...new Set((request.zonas ?? []).filter((z) => zonasEmFalta.includes(z.id)).map((z) => z.kind))]
      : [...new Set(request.superficies)].filter((s) => !covered.has(s));
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
      superficiesEmFalta: missingKinds,
      zonasEmFalta,
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

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
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
  const zonas = [...new Set(form.getAll('zona').map(String))];
  if (zonas.some((z) => !UUID.test(z)) || zonas.length > 30) errors.zona = 'Zona inválida.';
  const motivoDiferenca = get('motivoDiferenca');
  if (motivoDiferenca.length > 300) errors.motivoDiferenca = 'No máximo 300 letras.';
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
      zonas,
      motivoDiferenca: motivoDiferenca || null,
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
  const nomes = form.getAll('faseNome').map((v) => String(v).trim());
  const pcts = form.getAll('fasePct').map((v) => String(v));
  const fases: PaymentPhase[] = [];
  nomes.forEach((nome, i) => {
    const bps = parseHundredths(pcts[i] ?? null);
    if (!nome && (bps === null || bps === undefined)) return; // linha em branco
    if (!nome || nome.length > 60) errors.fases = 'Cada fase precisa de um nome (até 60 letras).';
    else if (bps === null || bps === undefined || Number.isNaN(bps) || bps <= 0 || bps > 10_000) errors.fases = 'Percentagem de cada fase entre 0 e 100.';
    else fases.push({ nome, bps });
  });
  if (fases.length > MAX_PHASES) errors.fases = `No máximo ${MAX_PHASES} fases.`;
  const declared = (k: string): Declared | null => (get(k) === 'sim' || get(k) === 'nao' ? (get(k) as Declared) : null);
  if (Object.keys(errors).length > 0) return { errors };
  return {
    errors,
    value: {
      fases,
      confirmaMaoObra: form.get('confirmaMaoObra') === 'sim',
      seguroRc: declared('seguroRc'),
      seguroAt: declared('seguroAt'),
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
