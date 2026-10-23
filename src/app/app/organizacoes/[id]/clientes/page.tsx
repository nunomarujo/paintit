import Link from 'next/link';
import { notFound } from 'next/navigation';
import { FREQUENT_MIN_ORDERS } from '@/domain/catalog';
import { supplierCustomers } from '@/lib/queries';
import { getUser } from '@/lib/supabase/server';

const tier = (c: { deliveredOrders: number; premium: boolean }) =>
  c.premium ? 'Premium' : c.deliveredOrders >= FREQUENT_MIN_ORDERS ? 'Cliente frequente' : c.deliveredOrders === 0 ? 'Ainda sem entregas' : 'Cliente';

export default async function SupplierCustomersPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase } = await getUser();
  const { data: org } = await supabase.from('organizations').select('id, nome, kind').eq('id', id).maybeSingle();
  if (!org || org.kind !== 'fornecedor') notFound();
  const clientes = await supplierCustomers(supabase, id);

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
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
          Ainda não há encomendas de nenhum pintor. A carteira preenche-se sozinha à medida que recebe encomendas.
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
