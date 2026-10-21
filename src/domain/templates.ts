import { equivalentFlag } from './equivalence';
import { parseFases, type Declared, type PaymentPhase } from './proposal';
import { WORK_STATES, suggestedQuantity, workDef, type WorkItem, type WorkState, type Zone } from './works';

// Método de trabalho: o que o pintor repete de obra para obra (trabalhos, produtos, preços e condições).
// Não leva zonas nem quantidades: essas vêm do pedido de cada cliente.

export interface TemplateItem {
  code: string;
  estado: WorkState;
  campos: Record<string, string>;
  notas: string;
}

export interface TemplateTerms {
  ivaBps: number;
  adiantamentoBps: number;
  garantiaAnos: number | null;
  precoAjusteM2: number | null;
  exclusoes: string;
  notas: string;
  fases: PaymentPhase[];
  seguroRc: Declared | null;
  seguroAt: Declared | null;
  confirmaMaoObra: boolean;
}

export interface TemplateData {
  items: TemplateItem[];
  /** Preço unitário em cêntimos, por código de trabalho. */
  prices: Record<string, number>;
  terms: TemplateTerms;
}

export function buildTemplate(items: WorkItem[], priceByKey: Record<string, number>, terms: TemplateTerms): TemplateData {
  const prices: Record<string, number> = {};
  for (const i of items) {
    const p = priceByKey[i.key] ?? 0;
    if (p > 0 && prices[i.code] === undefined) prices[i.code] = p;
  }
  // Um só trabalho de cada tipo: as versões repetidas (`codigo#2`) dependem das zonas de cada obra.
  const first = items.filter((i, n) => items.findIndex((x) => x.code === i.code) === n);
  return {
    items: first.map((i) => ({ code: i.code, estado: i.estado, campos: { ...i.campos }, notas: i.notas })),
    prices,
    terms,
  };
}

const declared = (v: unknown): Declared | null => (v === 'sim' || v === 'nao' ? v : null);
const intOrNull = (v: unknown, max: number): number | null => (Number.isInteger(v) && (v as number) >= 0 && (v as number) <= max ? (v as number) : null);

/** Lê o JSON guardado, ignorando o que já não existe (trabalhos retirados do catálogo). */
export function parseTemplate(raw: unknown): TemplateData {
  const o = (raw ?? {}) as Record<string, unknown>;
  const items: TemplateItem[] = [];
  const seen = new Set<string>();
  for (const r of Array.isArray(o.items) ? o.items : []) {
    const x = (r ?? {}) as Record<string, unknown>;
    const code = String(x.code ?? '');
    const def = workDef(code);
    if (!def || seen.has(code)) continue;
    seen.add(code);
    const estado = (WORK_STATES as readonly string[]).includes(String(x.estado)) ? (x.estado as WorkState) : 'base';
    const campos: Record<string, string> = {};
    for (const f of def.fields) {
      const v = String((x.campos as Record<string, unknown> | undefined)?.[f.key] ?? '').trim().slice(0, 200);
      if (v && (f.kind !== 'select' || (f.options ?? []).includes(v))) campos[f.key] = v;
      if (v && f.kind === 'text' && (x.campos as Record<string, unknown> | undefined)?.[equivalentFlag(f.key)] === 'sim') campos[equivalentFlag(f.key)] = 'sim';
    }
    items.push({ code, estado, campos, notas: String(x.notas ?? '').slice(0, 300) });
  }
  const prices: Record<string, number> = {};
  for (const [k, v] of Object.entries((o.prices ?? {}) as Record<string, unknown>)) {
    if (workDef(k) && Number.isInteger(v) && (v as number) > 0 && (v as number) <= 100_000_000) prices[k] = v as number;
  }
  const t = (o.terms ?? {}) as Record<string, unknown>;
  const iva = intOrNull(t.ivaBps, 3000);
  return {
    items,
    prices,
    terms: {
      ivaBps: iva ?? 2300,
      adiantamentoBps: intOrNull(t.adiantamentoBps, 3000) ?? 0,
      garantiaAnos: intOrNull(t.garantiaAnos, 30),
      precoAjusteM2: intOrNull(t.precoAjusteM2, 100_000_000),
      exclusoes: String(t.exclusoes ?? '').slice(0, 1000),
      notas: String(t.notas ?? '').slice(0, 2000),
      fases: parseFases(t.fases).slice(0, 8),
      seguroRc: declared(t.seguroRc),
      seguroAt: declared(t.seguroAt),
      confirmaMaoObra: t.confirmaMaoObra === true,
    },
  };
}

/** Trabalhos do método aplicados a um pedido novo: todas as zonas, com a área estimada como quantidade. */
export function templateToItems(t: TemplateData, zones: Zone[]): WorkItem[] {
  return t.items.filter((i, n) => t.items.findIndex((x) => x.code === i.code) === n).map((i) => {
    const def = workDef(i.code)!;
    return { key: i.code, code: i.code, estado: i.estado, zonas: 'todas', campos: { ...i.campos }, quantidade: suggestedQuantity(def, 'todas', zones), notas: i.notas };
  });
}
