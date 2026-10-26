import Link from 'next/link';
import { notFound } from 'next/navigation';
import { deleteDiscount } from '@/app/app/catalogo/actions';
import { BUYER_PROFILE_LABELS, PAYMENT_TERMS_LABELS, PRODUCT_TYPE_LABELS, productLabel } from '@/domain/catalog';
import { formatArea } from '@/domain/request';
import { canManage, myRole } from '@/lib/access';
import { getUser } from '@/lib/supabase/server';
import { CustomerProfileForm } from '../CustomerProfileForm';
import { DiscountForm } from '../../produtos/SupplierRules';

const ORDER_STATE_LABELS: Record<string, string> = { pedida: 'pedida', confirmada: 'confirmada', entregue: 'entregue', cancelada: 'cancelada' };

export default async function SupplierCustomerPage({ params }: { params: Promise<{ id: string; painterOrgId: string }> }) {
  const { id, painterOrgId } = await params;
  const { supabase, user } = await getUser();
  const { data: org } = await supabase.from('organizations').select('id, nome, kind, gerida_por').eq('id', id).maybeSingle();
  if (!org || org.kind !== 'fornecedor') notFound();
  const manager = canManage(await myRole(supabase, user!.id, org));

  // Visível (RLS organizations_select, private.ordered_from_me): só pintores que já encomendaram a esta
  // empresa — exatamente a carteira de clientes (src/lib/queries.ts, supplierCustomers).
  const { data: painter } = await supabase.from('organizations').select('id, nome, email_contacto, telefone').eq('id', painterOrgId).maybeSingle();
  if (!painter) notFound();

  const [{ data: orders }, { data: profile }, { data: discounts }, { data: products }] = await Promise.all([
    supabase.from('material_orders').select('estado').eq('supplier_org_id', id).eq('painter_org_id', painterOrgId),
    supabase.from('supplier_customers').select('premium, nota').eq('org_id', id).eq('painter_org_id', painterOrgId).maybeSingle(),
    supabase.from('supplier_discounts').select('*').eq('org_id', id).eq('painter_org_id', painterOrgId).order('created_at'),
    supabase.from('products').select('id, nome, marca, referencia, tipo').eq('org_id', id).eq('ativo', true).order('marca').order('nome'),
  ]);

  const productName = (pid: string | null) => {
    const p = (products ?? []).find((x) => x.id === pid);
    return p ? productLabel(p) : '';
  };
  const counts = (orders ?? []).reduce<Record<string, number>>((acc, o) => ({ ...acc, [o.estado]: (acc[o.estado] ?? 0) + 1 }), {});

  return (
    <div className="space-y-8">
      <div>
        <Link href={`/app/organizacoes/${id}/clientes`} className="text-[17px] text-slate-600 hover:underline">
          ← Clientes
        </Link>
        <h1 className="mt-3 text-[26px] leading-tight font-semibold">{painter.nome}</h1>
        <p className="mt-1 text-[17px] text-slate-600">
          {painter.email_contacto ?? 'Sem email indicado'}
          {painter.telefone ? ` · ${painter.telefone}` : ''}
        </p>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 text-[17px]">
        <h2 className="font-semibold">Encomendas</h2>
        {Object.keys(counts).length === 0 ? (
          <p className="mt-2 text-slate-600">Sem encomendas registadas.</p>
        ) : (
          <ul className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-slate-600">
            {Object.entries(counts).map(([estado, n]) => (
              <li key={estado}>
                <strong className="text-slate-900">{n}</strong> {ORDER_STATE_LABELS[estado] ?? estado}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 text-[17px]">
        <h2 className="font-semibold">Classificação e notas</h2>
        <p className="mt-1 text-slate-600">
          Só visível a si e a este cliente — nunca a terceiros. &ldquo;Premium&rdquo; é uma classificação sua, que pode
          usar nos descontos (ao contrário de &ldquo;cliente frequente&rdquo;, não se conta sozinha pelas encomendas).
        </p>
        <div className="mt-4">
          {manager ? (
            <CustomerProfileForm orgId={id} painterOrgId={painterOrgId} initial={{ premium: profile?.premium ?? false, nota: profile?.nota ?? '' }} />
          ) : (
            <p className="text-slate-700">
              {profile?.premium ? 'Cliente premium. ' : ''}
              {profile?.nota || 'Sem notas.'}
            </p>
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 text-[17px]">
        <h2 className="font-semibold">Descontos só para este cliente</h2>
        {(discounts ?? []).length === 0 ? (
          <p className="mt-2 text-slate-600">Sem descontos específicos — vale o que estiver em &ldquo;Produtos e descontos&rdquo;.</p>
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
                    <button type="submit" className="text-red-700 hover:underline">
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
            <DiscountForm
              orgId={id}
              products={(products ?? []).map((p) => ({ id: p.id, label: productLabel(p), currentBps: null }))}
              fixedCliente={{ id: painterOrgId, nome: painter.nome }}
            />
          </div>
        )}
      </section>
    </div>
  );
}
