import { setOrderState } from '@/app/app/obras/actions';
import { productLabel } from '@/domain/catalog';
import { getUser } from '@/lib/supabase/server';

const ORDER: Record<string, string> = { pedida: 'Pedida', confirmada: 'Venda confirmada', entregue: 'Entregue em obra', cancelada: 'Cancelada' };
const dt = (iso: string | null) => (iso ? new Date(iso).toLocaleString('pt-PT', { timeZone: 'Europe/Lisbon' }) : '—');

// Encomendas com confirmação recebidas pelo fornecedor: confirmar a venda e a entrega.
export default async function SupplierOrdersPage() {
  const { supabase, user } = await getUser();
  const { data: memberships } = await supabase
    .from('org_members')
    .select('role, organizations!inner(id, kind)')
    .eq('user_id', user!.id)
    .eq('organizations.kind', 'fornecedor');
  const mine = (memberships ?? []).map((m) => m.organizations.id);
  const managed = new Set((memberships ?? []).filter((m) => ['proprietario', 'gestor'].includes(m.role)).map((m) => m.organizations.id));
  const { data: orders } = mine.length
    ? await supabase.from('material_orders').select('*').in('supplier_org_id', mine).order('created_at', { ascending: false })
    : { data: [] };
  const productIds = [...new Set((orders ?? []).map((o) => o.product_id))];
  const painterIds = [...new Set((orders ?? []).map((o) => o.painter_org_id))];
  const [{ data: products }, { data: painters }] = await Promise.all([
    productIds.length ? supabase.from('products').select('*').in('id', productIds) : Promise.resolve({ data: [] }),
    painterIds.length ? supabase.from('organizations').select('id, nome, telefone, email_contacto').in('id', painterIds) : Promise.resolve({ data: [] }),
  ]);
  const button = 'rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-semibold hover:bg-slate-50';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Encomendas com confirmação</h1>
        <p className="mt-1 text-sm text-slate-600">
          Encomendas de pintores para obras contratadas na plataforma. Ao confirmar a venda e a entrega, certifica ao cliente
          que o material do contrato foi comprado e entregue.
        </p>
      </div>
      {(orders ?? []).length === 0 ? (
        <p className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600">Sem encomendas.</p>
      ) : (
        <ul className="divide-y divide-slate-200 rounded-2xl border border-slate-200 bg-white text-sm">
          {(orders ?? []).map((o) => {
            const p = (products ?? []).find((x) => x.id === o.product_id);
            const pi = (painters ?? []).find((x) => x.id === o.painter_org_id);
            const can = managed.has(o.supplier_org_id);
            return (
              <li key={o.id} className="flex flex-wrap items-start justify-between gap-3 p-4">
                <span>
                  <span className="font-semibold">
                    {o.embalagens} × {p ? productLabel(p) : 'produto'}
                  </span>
                  <span className="block text-slate-600">
                    {pi?.nome ?? 'Pintor'}
                    {pi?.telefone ? ` · ${pi.telefone}` : ''}
                    {pi?.email_contacto ? ` · ${pi.email_contacto}` : ''}
                  </span>
                  {o.nota && <span className="block">Nota: {o.nota}</span>}
                  <span className="block text-slate-500">
                    Pedida a {dt(o.created_at)} · {ORDER[o.estado]}
                    {o.delivered_at ? ` a ${dt(o.delivered_at)}` : ''}
                  </span>
                </span>
                {can && o.estado === 'pedida' && (
                  <form action={setOrderState.bind(null, o.id, 'confirmada', '/app/encomendas')}>
                    <button type="submit" className={button}>
                      Confirmar venda
                    </button>
                  </form>
                )}
                {can && o.estado === 'confirmada' && (
                  <form action={setOrderState.bind(null, o.id, 'entregue', '/app/encomendas')}>
                    <button type="submit" className={button}>
                      Confirmar entrega em obra
                    </button>
                  </form>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
