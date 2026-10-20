import Link from 'next/link';
import { notFound } from 'next/navigation';
import { deleteDelivery, deleteDiscount, setProductActive } from '@/app/app/catalogo/actions';
import { BUYER_PROFILE_LABELS, PAYMENT_TERMS_LABELS, PRODUCT_TYPE_LABELS, productLabel } from '@/domain/catalog';
import { formatEuros } from '@/domain/money';
import { formatArea } from '@/domain/request';
import { ProductCard } from '@/components/ProductCard';
import { canManage, myRole } from '@/lib/access';
import { loadReferences } from '@/lib/reference';
import { getUser } from '@/lib/supabase/server';
import { ProductForm } from './ProductForm';
import { DeliveryForm, DiscountForm } from './SupplierRules';
import { PLAN_INFO, planAllows, withVat } from '@/domain/subscription';
import { stripeConfigured } from '@/lib/stripe';
import { SubscribeButton } from './SubscribeButton';

export default async function SupplierProductsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, user } = await getUser();
  const { data: org } = await supabase.from('organizations').select('id, nome, kind, gerida_por').eq('id', id).maybeSingle();
  if (!org || org.kind !== 'fornecedor') notFound();
  const manager = canManage(await myRole(supabase, user!.id, org));
  const [{ data: products }, { data: discounts }, { data: deliveries }, { data: sub }] = await Promise.all([
    supabase.from('products').select('*').eq('org_id', id).order('marca').order('nome'),
    supabase.from('supplier_discounts').select('*').eq('org_id', id).order('created_at'),
    supabase.from('supplier_delivery').select('*').eq('org_id', id).order('created_at'),
    supabase.from('supplier_subscriptions').select('*').eq('org_id', id).maybeSingle(),
  ]);
  const plan = sub?.status === 'ativa' ? sub.plan : null;
  const catalogo = planAllows(plan, 'catalogo');

  const productName = (pid: string | null) => {
    const p = (products ?? []).find((x) => x.id === pid);
    return p ? productLabel(p) : '';
  };
  const smallDel = 'text-red-700 hover:underline';

  return (
    <div className="space-y-8">
      <div>
        <Link href={`/app/organizacoes/${id}`} className="text-sm text-slate-600 hover:underline">
          ← {org.nome}
        </Link>
        <h1 className="mt-3 text-2xl font-semibold">Catálogo de produtos</h1>
        <p className="mt-1 text-sm text-slate-600">
          Os pintores veem os produtos ativos ao orçamentar. Um produto não se apaga, porque pode estar numa proposta antiga:
          desative-o.
        </p>
      </div>
      <section className={`rounded-2xl border p-6 text-sm ${plan ? 'border-slate-200 bg-white' : 'border-amber-300 bg-amber-50'}`}>
        <h2 className="font-semibold">Subscrição</h2>
        <p className="mt-1">
          {plan
            ? `Plano ativo: ${PLAN_INFO[plan].label}, ${formatEuros(sub!.price_cents)} por mês mais IVA (${formatEuros(withVat(sub!.price_cents))}).`
            : 'Sem plano ativo: a empresa não aparece aos pintores.'}
        </p>
        <ul className="mt-3 grid gap-3 sm:grid-cols-2">
          {(['vendedores', 'catalogo'] as const).map((p) => (
            <li key={p} className={`rounded-xl border p-4 ${plan === p ? 'border-tinta-600' : 'border-slate-200'}`}>
              <p className="font-semibold">
                {PLAN_INFO[p].label} · {formatEuros(PLAN_INFO[p].monthlyCents)}/mês + IVA
              </p>
              <ul className="mt-2 list-disc pl-5 text-slate-600">
                {PLAN_INFO[p].features.map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
              {manager && stripeConfigured && plan !== p && <SubscribeButton orgId={id} plan={p} />}
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-slate-500">
          A plataforma não recebe nada dos fornecedores pelas vendas; só esta mensalidade. O pagamento é feito no Stripe e o
          plano fica ativo quando o Stripe o confirma.
        </p>
      </section>
      {manager && catalogo && (
        <section className="rounded-2xl border border-slate-200 bg-white p-6">
          <ProductForm orgId={id} references={(await loadReferences(supabase)).map((r) => ({ id: r.id, label: `${r.marca} ${r.nome}` }))} />
        </section>
      )}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 text-sm">
        <h2 className="font-semibold">Descontos para pintores</h2>
        {(discounts ?? []).length === 0 ? (
          <p className="mt-2 text-slate-600">Sem descontos.</p>
        ) : (
          <ul className="mt-3 divide-y divide-slate-100">
            {(discounts ?? []).map((d) => (
              <li key={d.id} className="flex flex-wrap items-center justify-between gap-2 py-1.5">
                <span>
                  <strong>{(d.desconto_bps / 100).toLocaleString('pt-PT')}%</strong> ·{' '}
                  {d.product_id ? productName(d.product_id) : d.tipo ? PRODUCT_TYPE_LABELS[d.tipo] : 'todo o catálogo'}
                  {d.min_area_cm2 !== null ? ` · a partir de ${formatArea(d.min_area_cm2)}` : ''}
                  {d.max_area_cm2 !== null ? ` · até ${formatArea(d.max_area_cm2)}` : ''}
                  {d.valido_ate ? ` · até ${d.valido_ate.split('-').reverse().join('/')}` : ''}
                  {d.perfil ? ` · ${BUYER_PROFILE_LABELS[d.perfil]}` : ''}
                  {d.pagamento ? ` · ${PAYMENT_TERMS_LABELS[d.pagamento]}` : ''}
                  {d.min_quantidade ? ` · a partir de ${d.min_quantidade} embalagens` : ''}
                </span>
                {manager && (
                  <form action={deleteDiscount.bind(null, id, d.id)}>
                    <button type="submit" className={smallDel}>
                      Remover
                    </button>
                  </form>
                )}
              </li>
            ))}
          </ul>
        )}
        {manager && catalogo && (
          <div className="mt-6 border-t border-slate-100 pt-6">
            <DiscountForm
              orgId={id}
              products={(products ?? []).filter((p) => p.ativo).map((p) => ({ id: p.id, label: productLabel(p) }))}
            />
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 text-sm">
        <h2 className="font-semibold">Entrega em obra</h2>
        {(deliveries ?? []).length === 0 ? (
          <p className="mt-2 text-slate-600">Sem condições de entrega: os pintores veem “levantamento na loja”.</p>
        ) : (
          <ul className="mt-3 divide-y divide-slate-100">
            {(deliveries ?? []).map((d) => (
              <li key={d.id} className="flex flex-wrap items-center justify-between gap-2 py-1.5">
                <span>
                  {d.concelhos.length ? d.concelhos.join(', ') : 'Todo o país'} ·{' '}
                  {d.incluida ? 'incluída' : `paga${d.custo_cents !== null ? ` (${formatEuros(d.custo_cents)})` : ''}`}
                  {d.minimo_cents !== null ? ` · encomenda mínima ${formatEuros(d.minimo_cents)}` : ''}
                  {d.condicoes ? ` · ${d.condicoes}` : ''}
                </span>
                {manager && (
                  <form action={deleteDelivery.bind(null, id, d.id)}>
                    <button type="submit" className={smallDel}>
                      Remover
                    </button>
                  </form>
                )}
              </li>
            ))}
          </ul>
        )}
        {manager && (
          <div className="mt-6 border-t border-slate-100 pt-6">
            <DeliveryForm orgId={id} />
          </div>
        )}
      </section>

      <ul className="grid gap-4 sm:grid-cols-2">
        {(products ?? []).map((p) => (
          <li key={p.id}>
            <ProductCard p={p}>
              {manager && (
                <form action={setProductActive.bind(null, id, p.id, !p.ativo)} className="mt-3">
                  <button type="submit" className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50">
                    {p.ativo ? 'Desativar' : 'Reativar'}
                  </button>
                </form>
              )}
            </ProductCard>
          </li>
        ))}
      </ul>
    </div>
  );
}
