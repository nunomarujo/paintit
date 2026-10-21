import { ProductCard } from '@/components/ProductCard';
import { PRODUCT_TYPES, PRODUCT_TYPE_LABELS, consumption, type ProductType } from '@/domain/catalog';
import { formatEuros } from '@/domain/money';
import { parseHundredths } from '@/domain/request';
import { loadReferences, refPerLitre } from '@/lib/reference';
import { getUser } from '@/lib/supabase/server';
import Link from 'next/link';
import { TinIcon } from '@/components/TinIcon';

// Catálogo de todos os fornecedores, com uma estimativa de consumo (CMP-06).
export default async function CatalogPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; tipo?: string; area?: string; demaos?: string }>;
}) {
  const { q, tipo, area, demaos } = await searchParams;
  const { supabase } = await getUser();
  let query = supabase.from('products').select('*').eq('ativo', true).order('marca').order('nome').limit(200);
  if (tipo && (PRODUCT_TYPES as readonly string[]).includes(tipo)) query = query.eq('tipo', tipo as ProductType);
  const term = (q ?? '').trim().replace(/[%,()]/g, '');
  if (term) query = query.or(`nome.ilike.%${term}%,marca.ilike.%${term}%,referencia.ilike.%${term}%`);
  const [{ data: all }, { data: active }] = await Promise.all([query, supabase.rpc('active_suppliers', { p_plan: 'catalogo' })]);
  const withPlan = new Set(active ?? []);
  const refs = (await loadReferences(supabase)).filter(
    (r) =>
      (!tipo || r.tipo === tipo) &&
      (!term || `${r.marca} ${r.nome}`.toLowerCase().includes(term.toLowerCase())),
  );
  const products = (all ?? []).filter((p) => withPlan.has(p.org_id));
  const areaCm2 = parseHundredths(area ?? null);
  const coats = Math.max(1, Math.min(5, Number(demaos) || 2));
  const field = 'mt-1 block rounded-lg border border-slate-300 bg-white px-3 py-2';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Catálogo de produtos</h1>
        <p className="mt-1 text-sm text-slate-600">
          Produtos dos fornecedores, com ficha técnica e preço de referência datado. A estimativa usa o rendimento
          declarado; o preço por litro e a marca não dizem, por si, qual é o melhor sistema para o suporte.
        </p>
      </div>
      <form autoComplete="off" className="flex flex-wrap items-end gap-3 text-sm">
        <label>
          Procurar
          <input name="q" defaultValue={q ?? ''} className={field} />
        </label>
        <label>
          Tipo
          <select name="tipo" defaultValue={tipo ?? ''} className={field}>
            <option value="">Todos</option>
            {PRODUCT_TYPES.map((t) => (
              <option key={t} value={t}>
                {PRODUCT_TYPE_LABELS[t]}
              </option>
            ))}
          </select>
        </label>
        <label>
          Área (m²)
          <input name="area" defaultValue={area ?? ''} className={`${field} w-28`} />
        </label>
        <label>
          Demãos
          <input name="demaos" defaultValue={String(coats)} className={`${field} w-20`} />
        </label>
        <button type="submit" className="rounded-lg border border-slate-300 px-4 py-2 font-semibold hover:bg-slate-50">
          Aplicar
        </button>
      </form>
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Produtos de referência do mercado</h2>
        <p className="text-sm text-slate-600">
          Fichas públicas dos fabricantes, para comparar e indicar no pedido. O preço de referência é de tabela, sem
          descontos nem entrega; quando não há fonte pública fica “não indicado”.
        </p>
        {refs.length === 0 ? (
          <p className="text-sm text-slate-600">Sem produtos de referência com estes filtros.</p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {refs.map((r) => {
              const pl = refPerLitre(r);
              return (
                <li key={r.id}>
                  <Link
                    href={`/app/catalogo/referencia/${r.id}`}
                    className="flex h-full gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-sm hover:border-tinta-600"
                  >
                    <TinIcon />
                    <span>
                      <span className="block font-semibold">{r.marca} {r.nome}</span>
                      <span className="block text-slate-600">{PRODUCT_TYPE_LABELS[r.tipo]}{r.acabamento ? ` · ${r.acabamento}` : ''}</span>
                      <span className="mt-1 block text-xs text-slate-500">
                        {r.embalagens_l.length ? `${r.embalagens_l.map((l) => l.toLocaleString('pt-PT')).join(' / ')} L` : 'Embalagens não indicadas'}
                        {pl !== null ? ` · ${formatEuros(pl)}/L` : ''}
                      </span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
      <h2 className="text-lg font-semibold">Produtos dos fornecedores</h2>
      {!products || products.length === 0 ? (
        <p className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600">Sem produtos com estes filtros.</p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {products.map((p) => {
            const c =
              areaCm2 && !Number.isNaN(areaCm2)
                ? consumption(areaCm2, coats, { rendimento: p.rendimento, embalagemMl: p.embalagem_ml, precoReferencia: p.preco_referencia_cents })
                : null;
            return (
              <li key={p.id}>
                <ProductCard p={p}>
                  {c && (
                    <p className="mt-2 rounded-lg bg-slate-50 p-2">
                      Para {area} m² com {coats} demão{coats > 1 ? 's' : ''}: {(c.ml / 1000).toLocaleString('pt-PT', { maximumFractionDigits: 1 })} L
                      {c.embalagens !== null ? `, ${c.embalagens} embalage${c.embalagens > 1 ? 'ns' : 'm'}` : ''}
                      {c.custo !== null ? `, cerca de ${formatEuros(c.custo)} sem IVA` : ''}
                    </p>
                  )}
                </ProductCard>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

