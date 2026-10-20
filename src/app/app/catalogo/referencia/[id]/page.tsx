import Link from 'next/link';
import { notFound } from 'next/navigation';
import { TinIcon } from '@/components/TinIcon';
import { PRODUCT_TYPE_LABELS } from '@/domain/catalog';
import { formatEuros } from '@/domain/money';
import { loadReferences, refPerLitre } from '@/lib/reference';
import { getUser } from '@/lib/supabase/server';

const card = 'rounded-2xl border border-slate-200 bg-white p-6';

// Ficha de um produto de referência: características, preço por litro, vendedores e produtos para usar em conjunto.
export default async function ReferencePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ concelho?: string }>;
}) {
  const { id } = await params;
  const { concelho } = await searchParams;
  const { supabase } = await getUser();
  const { data: r } = await supabase.from('reference_products').select('*').eq('id', id).maybeSingle();
  if (!r) notFound();

  const all = await loadReferences(supabase);
  const norm = (s: string) => s.toLowerCase().replace(/\s*\(.*\)$/, '').trim();
  const complementares = r.complementares.map((nome) => ({ nome, ref: all.find((x) => norm(x.nome) === norm(nome) || x.nome === nome) }));

  // Vendedores: fornecedores com plano de catálogo que ligaram um produto seu a esta referência.
  const [{ data: products }, { data: active }] = await Promise.all([
    supabase.from('products').select('id, org_id, nome, embalagem_ml, preco_referencia_cents').eq('reference_product_id', id).eq('ativo', true),
    supabase.rpc('active_suppliers', { p_plan: 'catalogo' }),
  ]);
  const withPlan = new Set(active ?? []);
  const sellerProducts = (products ?? []).filter((p) => withPlan.has(p.org_id));
  const orgIds = [...new Set(sellerProducts.map((p) => p.org_id))];
  const [{ data: orgs }, { data: delivery }] = orgIds.length
    ? await Promise.all([
        supabase.from('organizations').select('id, nome, localidade').in('id', orgIds),
        supabase.from('supplier_delivery').select('org_id, concelhos, condicoes').in('org_id', orgIds),
      ])
    : [{ data: [] }, { data: [] }];
  const place = (concelho ?? '').trim().toLowerCase();
  const sellers = (orgs ?? [])
    .map((o) => ({ ...o, entrega: (delivery ?? []).find((d) => d.org_id === o.id), items: sellerProducts.filter((p) => p.org_id === o.id) }))
    .filter((o) => !place || o.localidade?.toLowerCase() === place || o.entrega?.concelhos.some((c) => c.toLowerCase() === place));
  const pl = refPerLitre(r);

  return (
    <div className="space-y-6">
      <Link href="/app/catalogo" className="text-sm text-slate-600 hover:underline">
        ← Catálogo
      </Link>
      <div className={`${card} flex gap-5`}>
        <TinIcon />
        <div className="space-y-2 text-sm">
          <h1 className="text-2xl font-semibold">
            {r.marca} {r.nome}
          </h1>
          <p className="text-slate-600">
            {PRODUCT_TYPE_LABELS[r.tipo]}
            {r.acabamento ? ` · ${r.acabamento}` : ''}
            {r.uso ? ` · ${r.uso}` : ''}
            {r.base_aquosa === true ? ' · base aquosa' : r.base_aquosa === false ? ' · base solvente' : ''}
          </p>
          {r.descricao && <p>{r.descricao}</p>}
        </div>
      </div>

      <section className={card}>
        <h2 className="font-semibold">Detalhes</h2>
        <dl className="mt-3 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-[12rem_1fr]">
          {(
            [
              ['Embalagens', r.embalagens_l.length ? `${r.embalagens_l.map((l) => l.toLocaleString('pt-PT')).join(' / ')} L` : 'Não indicadas'],
              ['Cores', r.cores ?? 'Não indicadas'],
              ['Rendimento', r.rendimento_m2_l ? `${r.rendimento_m2_l.toLocaleString('pt-PT')} m²/L por demão` : 'Não indicado'],
              ['Demãos', r.demaos ?? 'Não indicadas'],
              ['Secagem para repintura', r.secagem_horas ? `${r.secagem_horas.toLocaleString('pt-PT')} h` : 'Não indicada'],
              ['Diluição', r.diluicao ?? 'Não indicada'],
              [
                'Preço de referência',
                r.preco_referencia_cents
                  ? `${formatEuros(r.preco_referencia_cents)} (${r.preco_embalagem_l?.toLocaleString('pt-PT')} L)${pl !== null ? ` · ${formatEuros(pl)}/L` : ''}${r.preco_fonte ? ` · fonte: ${r.preco_fonte}` : ''}${r.preco_data ? `, ${r.preco_data}` : ''}`
                  : 'Não indicado',
              ],
            ] as const
          ).map(([k, v]) => (
            <div key={k} className="contents">
              <dt className="text-slate-500">{k}</dt>
              <dd>{v}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-3 flex flex-wrap gap-4 text-sm">
          {r.url_ficha_tecnica && (
            <a href={r.url_ficha_tecnica} target="_blank" rel="noopener noreferrer" className="font-semibold text-tinta-700 hover:underline">
              Ficha técnica ↗
            </a>
          )}
          {r.url_produto && (
            <a href={r.url_produto} target="_blank" rel="noopener noreferrer" className="text-tinta-700 hover:underline">
              Página do fabricante ↗
            </a>
          )}
        </p>
        {r.nota && <p className="mt-3 text-xs text-slate-500">{r.nota}</p>}
      </section>

      <section className={card}>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 className="font-semibold">Onde comprar</h2>
          <form className="flex items-end gap-2 text-sm">
            <label>
              Perto de mim (concelho)
              <input name="concelho" defaultValue={concelho ?? ''} className="mt-1 block rounded-lg border border-slate-300 px-3 py-1.5" />
            </label>
            <button type="submit" className="rounded-lg border border-slate-300 px-3 py-1.5 hover:bg-slate-50">
              Filtrar
            </button>
          </form>
        </div>
        {sellers.length === 0 ? (
          <p className="mt-3 text-sm text-slate-600">
            {place ? 'Nenhum vendedor da plataforma entrega neste concelho.' : 'Ainda nenhum vendedor da plataforma indicou este produto.'}
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-slate-100 text-sm">
            {sellers.map((s) => (
              <li key={s.id} className="py-2">
                <b>{s.nome}</b>
                {s.localidade ? ` · ${s.localidade}` : ''}
                {s.items.map((p) => (
                  <span key={p.id} className="block text-slate-600">
                    {p.nome}
                    {p.embalagem_ml ? ` · ${(p.embalagem_ml / 1000).toLocaleString('pt-PT')} L` : ''}
                    {p.preco_referencia_cents ? ` · ${formatEuros(p.preco_referencia_cents)}` : ''}
                  </span>
                ))}
                {s.entrega && <span className="block text-xs text-slate-500">Entrega: {s.entrega.condicoes || s.entrega.concelhos.join(', ')}</span>}
              </li>
            ))}
          </ul>
        )}
      </section>

      {complementares.length > 0 && (
        <section className={card}>
          <h2 className="font-semibold">Para usar na mesma obra</h2>
          <p className="mt-1 text-xs text-slate-500">Sugeridos pelo fabricante: primários, fundos ou produtos do mesmo sistema.</p>
          <ul className="mt-3 flex flex-wrap gap-2 text-sm">
            {complementares.map((c) =>
              c.ref ? (
                <li key={c.nome}>
                  <Link href={`/app/catalogo/referencia/${c.ref.id}`} className="badge badge-green hover:underline">
                    {c.nome}
                  </Link>
                </li>
              ) : (
                <li key={c.nome} className="badge">
                  {c.nome}
                </li>
              ),
            )}
          </ul>
        </section>
      )}
    </div>
  );
}
