import type { SupabaseClient } from '@supabase/supabase-js';
import { ISOLAMENTO_E_ACESSORIOS, type ProdutoEscolhivel, type ProductType } from '@/domain/catalog';
import { parsePreferences, pricePerLitre, type UsedProduct } from '@/domain/reference';
import type { Database } from '@/lib/database.types';

export type ReferenceProduct = Database['public']['Tables']['reference_products']['Row'];

export const refPerLitre = (r: Pick<ReferenceProduct, 'preco_referencia_cents' | 'preco_embalagem_l'>) =>
  pricePerLitre({ preco: r.preco_referencia_cents, litros: r.preco_embalagem_l });

/** Preço de referência por m² de embalagem (isolamento e acessórios vendidos por área, não por litro). */
export const refPerM2 = (r: Pick<ReferenceProduct, 'preco_referencia_cents' | 'm2_por_embalagem'>) =>
  pricePerLitre({ preco: r.preco_referencia_cents, litros: r.m2_por_embalagem });

export async function loadReferences(supabase: SupabaseClient<Database>, ids?: string[]): Promise<ReferenceProduct[]> {
  if (ids && ids.length === 0) return [];
  // Produtos sem confirmação suficiente dos dados do fabricante (visivel = false) ficam fora
  // de listagens, formulários e sugestões públicas, mas os dados não se perdem (ver nota_interna).
  let q = supabase.from('reference_products').select('*').eq('visivel', true).order('marca').order('nome');
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

/**
 * O produto de referência como o cliente o escolhe no pedido (`EscolherProdutos`).
 *
 * Só o que ajuda a escolher: fotografia, tipo, acabamento, embalagem e preço. O preço é o de
 * referência do fabricante — venda ao público, sem desconto nenhum. Descontos de fornecedor são
 * matéria do pintor e não aparecem de nenhuma forma do lado do cliente (CLAUDE.md, regra 15).
 */
export function escolhivel(r: ReferenceProduct): ProdutoEscolhivel {
  const porArea = (ISOLAMENTO_E_ACESSORIOS as readonly string[]).includes(r.tipo);
  const quantidade = porArea ? r.m2_por_embalagem : r.preco_embalagem_l;
  return {
    id: r.id,
    marca: r.marca,
    nome: r.nome,
    tipo: r.tipo as ProductType,
    acabamento: r.acabamento,
    descricao: r.descricao,
    fotoPath: r.foto_path,
    embalagem: quantidade ? `${quantidade.toLocaleString('pt-PT')} ${porArea ? 'm²' : 'L'}` : null,
    precoCents: r.preco_referencia_cents,
    unitarioCents: porArea ? refPerM2(r) : refPerLitre(r),
    unidade: porArea ? 'm²' : 'L',
  };
}
