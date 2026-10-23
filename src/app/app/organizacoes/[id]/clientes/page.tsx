import Link from 'next/link';
import { notFound } from 'next/navigation';
import { FREQUENT_MIN_ORDERS } from '@/domain/catalog';
import { canManage, myRole } from '@/lib/access';
import { supplierCustomers } from '@/lib/queries';
import { getUser } from '@/lib/supabase/server';
import { InviteForm } from './InviteForm';

const tier = (c: { deliveredOrders: number; premium: boolean }) =>
  c.premium ? 'Premium' : c.deliveredOrders >= FREQUENT_MIN_ORDERS ? 'Cliente frequente' : c.deliveredOrders === 0 ? 'Ainda sem entregas' : 'Cliente';

export default async function SupplierCustomersPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, user } = await getUser();
  const { data: org } = await supabase.from('organizations').select('id, nome, kind, gerida_por').eq('id', id).maybeSingle();
  if (!org || org.kind !== 'fornecedor') notFound();
  const manager = canManage(await myRole(supabase, user!.id, org));
  const clientes = await supplierCustomers(supabase, id);
  const { data: invites } =
    manager && clientes.length === 0
      ? await supabase
          .from('supplier_painter_invites')
          .select('id, nome, email, created_at, referral_codes!inner(painter_org_id)')
          .eq('org_id', id)
          .order('created_at', { ascending: false })
      : { data: null };

  return (
    <div className="space-y-6">
      <div>
        <Link href={`/app/organizacoes/${id}/produtos`} className="text-sm text-slate-600 hover:underline">
          ← {org.nome}
        </Link>
        <h1 className="mt-3 text-2xl font-semibold">Clientes</h1>
        <p className="mt-1 max-w-2xl text-sm text-slate-600">
          Pintores que já encomendaram a esta empresa. Na ficha de cada um: classificar como premium, escrever condições
          específicas, ou criar um desconto só para ele.
        </p>
      </div>
      {clientes.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm">
          <p className="text-slate-600">Ainda não há encomendas de nenhum pintor. A carteira preenche-se sozinha à medida que recebe encomendas.</p>
          {manager && (
            <div className="mt-6 border-t border-slate-100 pt-6">
              <h2 className="font-semibold">Convidar um pintor que conhece</h2>
              <p className="mt-1 text-slate-600">
                Indique o nome e o email: enviamos um convite para se juntar à Quem Pinta já ligado à sua empresa — os
                orçamentos dele passam a ter o desconto de adesão dos seus produtos, sem precisar de descobrir nenhum
                código por fora.
              </p>
              <InviteForm orgId={id} />
              {invites && invites.length > 0 && (
                <ul className="mt-6 divide-y divide-slate-100 border-t border-slate-100 pt-4">
                  {invites.map((i) => (
                    <li key={i.id} className="flex flex-wrap items-center justify-between gap-2 py-1.5">
                      <span>
                        {i.nome} · {i.email}
                      </span>
                      <span className="text-slate-500">
                        {i.referral_codes.painter_org_id ? 'Aceite' : 'A aguardar'} · {i.created_at.slice(0, 10).split('-').reverse().join('/')}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      ) : (
        <ul className="divide-y divide-slate-200 rounded-2xl border border-slate-200 bg-white">
          {clientes.map((c) => (
            <li key={c.id}>
              <Link href={`/app/organizacoes/${id}/clientes/${c.id}`} className="flex flex-wrap items-center justify-between gap-2 p-4 hover:bg-slate-50">
                <span>
                  <span className="font-semibold">{c.nome}</span>
                  <span className="block text-sm text-slate-600">
                    {tier(c)} · {c.deliveredOrders} encomenda{c.deliveredOrders === 1 ? '' : 's'} entregue{c.deliveredOrders === 1 ? '' : 's'}
                  </span>
                </span>
                {c.nota && <span className="max-w-xs truncate text-sm text-slate-500">{c.nota}</span>}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
