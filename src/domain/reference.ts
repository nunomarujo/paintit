import type { Cents } from './money';
import type { ProductType } from './catalog';

// Produtos de referência pedidos pelo cliente e comparação com o que cada proposta usa.

export interface Preference {
  id: string;
  /** true: o cliente quer este produto; o pintor não o deve substituir. */
  fixo: boolean;
}

export function parsePreferences(raw: unknown): Preference[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((x): x is { id: string; fixo?: unknown } => typeof x === 'object' && x !== null && typeof (x as { id?: unknown }).id === 'string')
    .map((x) => ({ id: x.id, fixo: x.fixo === true }));
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Lê do formulário: checkboxes "preferido" (ids) e "fixo" (ids). Ignora ids mal formados. */
export function preferencesFromForm(form: FormData): Preference[] {
  const ids = [...new Set(form.getAll('preferido').map(String).filter((x) => UUID.test(x)))].slice(0, 12);
  const fixed = new Set(form.getAll('fixo').map(String));
  return ids.map((id) => ({ id, fixo: fixed.has(id) }));
}

/** Preço de referência por litro, em cêntimos, ou null. */
export function pricePerLitre(p: { preco: Cents | null; litros: number | null }): Cents | null {
  if (!p.preco || !p.litros || p.litros <= 0) return null;
  return Math.round(p.preco / p.litros);
}

export interface UsedProduct {
  referenceId: string | null;
  tipo: ProductType;
  label: string;
  perLitre: Cents | null;
}

export type Adherence =
  | { kind: 'segue' }
  | { kind: 'substitui'; por: string; diffPct: number | null }
  | { kind: 'sem_indicacao' };

/** Para cada produto pedido: a proposta segue-o, substitui-o (por qual, e quanto mais caro ou barato por litro) ou não diz. */
export function adherence(
  prefs: Preference[],
  refs: Map<string, { tipo: ProductType; perLitre: Cents | null }>,
  used: UsedProduct[],
): { pref: Preference; result: Adherence }[] {
  return prefs.map((pref) => {
    if (used.some((u) => u.referenceId === pref.id)) return { pref, result: { kind: 'segue' } };
    const ref = refs.get(pref.id);
    const alt = ref ? used.find((u) => u.tipo === ref.tipo) : undefined;
    if (!alt) return { pref, result: { kind: 'sem_indicacao' } };
    const diffPct = ref?.perLitre && alt.perLitre ? Math.round(((alt.perLitre - ref.perLitre) / ref.perLitre) * 100) : null;
    return { pref, result: { kind: 'substitui', por: alt.label, diffPct } };
  });
}
