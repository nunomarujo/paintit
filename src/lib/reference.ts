import type { SupabaseClient } from '@supabase/supabase-js';
import type { ProductType } from '@/domain/catalog';
import { parsePreferences, pricePerLitre, type UsedProduct } from '@/domain/reference';
import type { Database } from '@/lib/database.types';

export type ReferenceProduct = Database['public']['Tables']['reference_products']['Row'];

export const refPerLitre = (r: Pick<ReferenceProduct, 'preco_referencia_cents' | 'preco_embalagem_l'>) =>
  pricePerLitre({ preco: r.preco_referencia_cents, litros: r.preco_embalagem_l });

export async function loadReferences(supabase: SupabaseClient<Database>, ids?: string[]): Promise<ReferenceProduct[]> {
  if (ids && ids.length === 0) return [];
  let q = supabase.from('reference_products').select('*').order('marca').order('nome');
  if (ids) q = q.in('id', ids);
  const { data } = await q;
  return data ?? [];
}

/** Produtos que cada proposta usa, a partir das linhas (produto do fornecedor ou texto livre). */
export async function usedProducts(
  supabase: SupabaseClient<Database>,
  lines: { proposal_id: string; product_id: string | null; produto: string | null }[],
  refs: ReferenceProduct[],
): Promise<Map<string, UsedProduct[]>> {
  const productIds = [...new Set(lines.map((l) => l.product_id).filter((x): x is string => !!x))];
  const { data: products } = productIds.length
    ? await supabase.from('products').select('id, nome, marca, tipo, embalagem_ml, preco_referencia_cents, reference_product_id').in('id', productIds)
    : { data: [] };
  const byId = new Map((products ?? []).map((p) => [p.id, p]));
  const out = new Map<string, UsedProduct[]>();
  for (const l of lines) {
    const list = out.get(l.proposal_id) ?? [];
    const p = l.product_id ? byId.get(l.product_id) : undefined;
    if (p) {
      list.push({
        referenceId: p.reference_product_id,
        tipo: p.tipo as ProductType,
        label: `${p.marca} ${p.nome}`,
        perLitre: pricePerLitre({ preco: p.preco_referencia_cents, litros: p.embalagem_ml ? p.embalagem_ml / 1000 : null }),
      });
    } else if (l.produto) {
      // Texto livre: reconhece o produto de referência pelo nome; sem tipo nem preço.
      const text = l.produto.toLowerCase();
      const ref = refs.find((r) => text.includes(r.nome.toLowerCase().replace(/\s*\(.*\)$/, '')));
      if (ref) list.push({ referenceId: ref.id, tipo: ref.tipo, label: l.produto, perLitre: refPerLitre(ref) });
    }
    out.set(l.proposal_id, list);
  }
  return out;
}

/** Preferências do pedido com o nome do produto, para o anúncio. */
export async function preferredView(supabase: SupabaseClient<Database>, raw: unknown) {
  const prefs = parsePreferences(raw);
  const refs = await loadReferences(supabase, prefs.map((p) => p.id));
  return prefs.flatMap((p) => {
    const r = refs.find((x) => x.id === p.id);
    return r ? [{ id: p.id, fixo: p.fixo, label: `${r.marca} ${r.nome}` }] : [];
  });
}
