import { ProductCard } from '@/components/ProductCard';
import { AutoSubmit } from '@/components/AutoSubmit';
import { ISOLAMENTO_E_ACESSORIOS, PRODUCT_TYPES, PRODUCT_TYPE_LABELS, boardQuantity, consumption, type ProductType } from '@/domain/catalog';
import { formatEuros } from '@/domain/money';
import { parseHundredths } from '@/domain/request';
import { loadReferences, refPerLitre, refPerM2 } from '@/lib/reference';
import { getUser } from '@/lib/supabase/server';
import Link from 'next/link';
import { ProductThumb } from '@/components/ProductThumb';

const TABS = [
  { id: 'referencia', label: 'Produtos de referência' },
  { id: 'fornecedores', label: 'Produtos e descontos' },
] as const;

// Catálogo de todos os fornecedores, com uma estimativa de consumo (CMP-06). Dois separadores (decisão de
// 23/10/2026, docs/DECISOES.md): "Produtos de referência" (fichas públicas dos fabricantes, sem fornecedor
// nenhum por trás) e "Produtos e descontos" (o que os fornecedores da plataforma realmente vendem, com o
// seu preço) — antes vinham empilhados na mesma página, confundindo os dois conceitos.
export default async function CatalogPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; tipo?: string; area?: string; demaos?: string; ordenar?: string; touched?: string; tab?: string }>;
}) {
  const { q, tipo, area, demaos, ordenar, touched, tab } = await searchParams;
  const activeTab = tab === 'fornecedores' ? 'fornecedores' : 'referencia';
  const qs = (overrides: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries({ q, tipo, area, demaos, ordenar, ...overrides })) if (v) p.set(k, v);
    const s = p.toString();
    return s ? `?${s}` : '';
  };
  const { supabase } = await getUser();
  let query = supabase.from('products').select('*').eq('ativo', true).order('marca').order('nome').limit(200);
  if (tipo && (PRODUCT_TYPES as readonly string[]).includes(tipo)) query = query.eq('tipo', tipo as ProductType);
  const term = (q ?? '').trim().replace(/[%,()]/g, '');
  if (term) query = query.or(`nome.ilike.%${term}%,marca.ilike.%${term}%,referencia.ilike.%${term}%`);
  const [{ data: all }, { data: active }] = await Promise.all([query, supabase.rpc('active_suppliers', { p_plan: 'catalogo' })]);
  const withPlan = new Set(active ?? []);
  const refsAll = (await loadReferences(supabase)).filter(
    (r) => (!tipo || r.tipo === tipo) && (!term || `${r.marca} ${r.nome}`.toLowerCase().includes(term.toLowerCase())),
  );
  const products = (all ?? []).filter((p) => withPlan.has(p.org_id));
  const areaCm2 = parseHundredths(area ?? null);
  const coats = Math.max(1, Math.min(5, Number(demaos) || 2));
  const field = 'mt-1 block rounded-lg border border-slate-300 bg-white px-3 py-2';

  // Estimativa de consumo/quantidade e custo por produto de referência, quando há área conhecida — o mesmo
  // cálculo usado abaixo para os produtos dos fornecedores (CMP-06). Isolamento e acessórios não se medem em
  // litros nem levam demãos: a quantidade vem de m² por embalagem (ISOLAMENTO_E_ACESSORIOS, docs/DECISOES.md).
  const refsCalc = refsAll.map((r) => {
    const isBoard = (ISOLAMENTO_E_ACESSORIOS as readonly string[]).includes(r.tipo);
    const pl = isBoard ? refPerM2(r) : refPerLitre(r);
    const areaM2 = areaCm2 && !Number.isNaN(areaCm2) ? areaCm2 / 100 : null;
    const estimativa = isBoard
      ? areaM2 ? boardQuantity(areaM2, { m2PorEmbalagem: r.m2_por_embalagem, precoReferencia: r.preco_referencia_cents }) : null
      : areaCm2 && !Number.isNaN(areaCm2) && r.rendimento_m2_l && r.preco_embalagem_l && r.preco_referencia_cents
        ? consumption(areaCm2, coats, {
            rendimento: Math.round(r.rendimento_m2_l * 100),
            embalagemMl: Math.round(r.preco_embalagem_l * 1000),
            precoReferencia: r.preco_referencia_cents,
          })
        : null;
    return { r, pl, isBoard, estimativa };
  });
  const sortByPrice = ordenar === 'preco';
  const refsSorted = sortByPrice
    ? [...refsCalc].sort((a, b) => (a.estimativa?.custo ?? a.pl ?? Infinity) - (b.estimativa?.custo ?? b.pl ?? Infinity))
    : refsCalc; // ordem por marca/nome já vem de loadReferences

  // Primeira visita, sem qualquer escolha: mostra uma seleção em vez do catálogo todo, para não
  // expor todos os produtos de uma vez. Qualquer interação com o formulário (procurar, mudar o
  // tipo — mesmo para "Todos" — ou ordenar) liga `touched` e passa a mostrar a lista filtrada.
  // Por agora a seleção é aleatória; no futuro pode ser um lugar pago pelos fornecedores.
  const curated = !touched && !term && !tipo;
  const picks = curated ? [...refsCalc].sort(() => Math.random() - 0.5).slice(0, 6) : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Catálogo de produtos</h1>
        <p className="mt-1 text-sm text-slate-600">
          Fichas de fabricante e produtos à venda na plataforma, com ficha técnica e preço de referência datado.
          Indique a área e as demãos para uma estimativa de litros, embalagens e custo por produto; o preço por
          litro e a marca não dizem, por si, qual é o melhor sistema para o suporte.
        </p>
      </div>
      <form autoComplete="off" className="flex flex-wrap items-end gap-3 text-sm">
        <input type="hidden" name="touched" value="1" />
        <label>
          Procurar
          <input name="q" defaultValue={q ?? ''} className={field} />
        </label>
        <label>
          Tipo
          <AutoSubmit>
            <select name="tipo" defaultValue={tipo ?? ''} className={field}>
              <option value="">Todos</option>
              {PRODUCT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {PRODUCT_TYPE_LABELS[t]}
                </option>
              ))}
            </select>
          </AutoSubmit>
        </label>
        <label>
          Área (m²)
          <input name="area" defaultValue={area ?? ''} className={`${field} w-28`} />
        </label>
        <label>
          Demãos
          <input name="demaos" defaultValue={String(coats)} className={`${field} w-20`} />
        </label>
        <label>
          Ordenar por
          <AutoSubmit>
            <select name="ordenar" defaultValue={sortByPrice ? 'preco' : 'marca'} className={field}>
              <option value="marca">Marca</option>
              <option value="preco">Preço{areaCm2 && !Number.isNaN(areaCm2) ? ' estimado' : ' por litro'}</option>
            </select>
          </AutoSubmit>
        </label>
        <button type="submit" className="rounded-lg border border-slate-300 px-4 py-2 font-semibold hover:bg-slate-50">
          Aplicar
        </button>
      </form>

      <nav className="flex gap-1 border-b border-slate-200 text-sm font-semibold">
        {TABS.map((t) => (
          <Link
            key={t.id}
            href={`/app/catalogo${qs({ tab: t.id === 'referencia' ? undefined : t.id })}`}
            aria-current={activeTab === t.id ? 'page' : undefined}
            className={`-mb-px border-b-2 px-3 py-2 ${
              activeTab === t.id ? 'border-tinta-600 text-tinta-700' : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            {t.label}
          </Link>
        ))}
      </nav>

      {activeTab !== 'referencia' ? null : curated ? (
        <section className="space-y-3">
          <div>
            <h2 className="text-lg font-semibold">Escolhas e descobertas do mês</h2>
            <p className="text-sm text-slate-600">
              Uma amostra do catálogo de referência. Para ver todos os produtos, escolha um tipo acima (ou “Todos”).
            </p>
          </div>
          {picks.length === 0 ? (
            <p className="text-sm text-slate-600">Ainda sem produtos de referência no catálogo.</p>
          ) : (
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {picks.map(({ r, pl, isBoard }) => (
                <li key={r.id}>
                  <Link
                    href={`/app/catalogo/referencia/${r.id}`}
                    className="flex h-full flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-5 text-sm hover:border-tinta-600"
                  >
                    <ProductThumb
                      fotoPath={r.foto_path}
                      alt={`${r.marca} ${r.nome}`}
                      className="h-32 w-28 self-center rounded-lg border border-slate-100 bg-white object-contain"
                    />
                    <div>
                      <span className="block font-semibold">
                        {r.marca} {r.nome}
                      </span>
                      <span className="block text-slate-600">
                        {PRODUCT_TYPE_LABELS[r.tipo]}
                        {r.acabamento ? ` · ${r.acabamento}` : ''}
                      </span>
                    </div>
                    <p className="flex-1 text-xs text-slate-600">
                      {r.descricao ??
                        `${PRODUCT_TYPE_LABELS[r.tipo]}${r.uso ? ` para uso ${r.uso}` : ''}${!isBoard && r.cores ? `, em ${r.cores.toLowerCase()}` : ''}.`}
                    </p>
                    <span className="text-xs text-slate-500">
                      {isBoard
                        ? r.espessuras_mm.length
                          ? `${r.espessuras_mm.map((e) => e.toLocaleString('pt-PT')).join(' / ')} mm`
                          : r.dimensoes ?? 'Espessuras não indicadas'
                        : r.embalagens_l.length
                          ? `${r.embalagens_l.map((l) => l.toLocaleString('pt-PT')).join(' / ')} L`
                          : 'Embalagens não indicadas'}
                      {pl !== null ? ` · ${formatEuros(pl)}/${isBoard ? 'm²' : 'L'}` : ''}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Produtos de referência do mercado</h2>
          <p className="text-sm text-slate-600">
            Fichas públicas dos fabricantes, para comparar e indicar no pedido. O preço de referência é de tabela, sem
            descontos nem entrega; quando não há fonte pública fica “não indicado”.
          </p>
          {refsSorted.length === 0 ? (
            <p className="text-sm text-slate-600">Sem produtos de referência com estes filtros.</p>
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {refsSorted.map(({ r, pl, isBoard, estimativa }) => (
                <li key={r.id}>
                  <Link
                    href={`/app/catalogo/referencia/${r.id}`}
                    className="flex h-full gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-sm hover:border-tinta-600"
                  >
                    <ProductThumb fotoPath={r.foto_path} alt={`${r.marca} ${r.nome}`} />
                    <span>
                      <span className="block font-semibold">
                        {r.marca} {r.nome}
                      </span>
                      <span className="block text-slate-600">
                        {PRODUCT_TYPE_LABELS[r.tipo]}
                        {r.acabamento ? ` · ${r.acabamento}` : ''}
                      </span>
                      <span className="mt-1 block text-xs text-slate-500">
                        {isBoard
                          ? r.espessuras_mm.length
                            ? `${r.espessuras_mm.map((e) => e.toLocaleString('pt-PT')).join(' / ')} mm`
                            : r.dimensoes ?? 'Espessuras não indicadas'
                          : r.embalagens_l.length
                            ? `${r.embalagens_l.map((l) => l.toLocaleString('pt-PT')).join(' / ')} L`
                            : 'Embalagens não indicadas'}
                        {pl !== null ? ` · ${formatEuros(pl)}/${isBoard ? 'm²' : 'L'}` : ''}
                      </span>
                      {estimativa && isBoard && !('ml' in estimativa) && (
                        <span className="mt-1 block rounded-lg bg-slate-50 p-1.5 text-xs">
                          Para {area} m²: {estimativa.embalagens} embalage{estimativa.embalagens > 1 ? 'ns' : 'm'}
                          {estimativa.custo !== null ? `, cerca de ${formatEuros(estimativa.custo)} sem IVA` : ''}
                        </span>
                      )}
                      {estimativa && !isBoard && 'ml' in estimativa && (
                        <span className="mt-1 block rounded-lg bg-slate-50 p-1.5 text-xs">
                          Para {area} m² com {coats} demão{coats > 1 ? 's' : ''}:{' '}
                          {(estimativa.ml / 1000).toLocaleString('pt-PT', { maximumFractionDigits: 1 })} L
                          {estimativa.embalagens !== null ? `, ${estimativa.embalagens} embalage${estimativa.embalagens > 1 ? 'ns' : 'm'}` : ''}
                          {estimativa.custo !== null ? `, cerca de ${formatEuros(estimativa.custo)} sem IVA` : ''}
                        </span>
                      )}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
      {activeTab === 'fornecedores' && (
        <section className="space-y-3">
          <p className="text-sm text-slate-600">
            O que os fornecedores da plataforma vendem, com o preço e o desconto que já têm — nunca fichas de
            fabricante sem ninguém por trás a vender.
          </p>
          {!products || products.length === 0 ? (
            <p className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
              Nenhum produto corresponde a estes filtros. Experimente alargar o tipo ou limpar a ordenação.
            </p>
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
        </section>
      )}
    </div>
  );
}
