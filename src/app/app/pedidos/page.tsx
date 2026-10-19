import Link from 'next/link';
import { WORK_TYPE_LABELS } from '@/domain/request';
import { getUser } from '@/lib/supabase/server';

const STATUS: Record<string, { label: string; className: string }> = {
  rascunho: { label: 'Rascunho', className: 'badge' },
  publicado: { label: 'A receber propostas', className: 'badge badge-green' },
  encerrado: { label: 'Encerrado', className: 'badge' },
  cancelado: { label: 'Cancelado', className: 'badge badge-amber' },
};

// Todos os pedidos das entidades da conta (e dos condomínios geridos).
export default async function RequestsPage() {
  const { supabase, user } = await getUser();
  const { data: memberships } = await supabase.from('org_members').select('org_id').eq('user_id', user!.id);
  const direct = (memberships ?? []).map((m) => m.org_id);
  const { data: orgs } = direct.length
    ? await supabase.from('organizations').select('id, nome, kind, gerida_por').or(`id.in.(${direct.join(',')}),gerida_por.in.(${direct.join(',')})`)
    : { data: [] };
  const clientOrgs = (orgs ?? []).filter((o) => ['condominio', 'particular'].includes(o.kind));
  const ids = clientOrgs.map((o) => o.id);
  const [{ data: requests }, { data: proposals }] = await Promise.all([
    ids.length ? supabase.from('work_requests').select('*').in('org_id', ids).order('updated_at', { ascending: false }) : Promise.resolve({ data: [] }),
    ids.length ? supabase.from('proposals').select('request_id').neq('status', 'rascunho') : Promise.resolve({ data: [] }),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="eyebrow">Pedidos de orçamento</p>
          <h1 className="mt-2 text-[30px] font-semibold leading-tight">Os seus pedidos</h1>
          <p className="mt-1 text-slate-500">Cada pedido é publicado sem morada nem nomes. Os pintores verificados respondem com propostas discriminadas.</p>
        </div>
        {clientOrgs.length > 0 && (
          <Link href={`/app/organizacoes/${clientOrgs[0]!.id}/pedidos/novo`} className="btn-primary">
            Novo pedido
          </Link>
        )}
      </div>
      {clientOrgs.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <p>Para pedir orçamentos, registe primeiro um condomínio ou um particular em “Início”.</p>
        </div>
      ) : (requests ?? []).length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-slate-600">Ainda não há pedidos.</div>
      ) : (
        <ul className="grid gap-4 md:grid-cols-2">
          {(requests ?? []).map((r) => {
            const n = (proposals ?? []).filter((p) => p.request_id === r.id).length;
            const st = STATUS[r.status]!;
            return (
              <li key={r.id}>
                <Link href={`/app/pedidos/${r.id}`} className="block rounded-2xl border border-slate-200 bg-white p-6 transition-colors hover:border-tinta-200">
                  <div className="flex items-start justify-between gap-3">
                    <span className={st.className}>{st.label}</span>
                    <span className="text-xs text-slate-500">Ref. {r.ref}</span>
                  </div>
                  <h2 className="mt-4 text-lg font-semibold">{r.titulo}</h2>
                  <p className="text-slate-500">
                    {WORK_TYPE_LABELS[r.tipo_obra]} · {clientOrgs.find((o) => o.id === r.org_id)?.nome}
                  </p>
                  <div className="mt-4 flex gap-8 border-t border-slate-200 pt-4">
                    <span>
                      <strong className="block text-2xl font-semibold tracking-tight">{n}</strong>
                      <span className="text-xs text-slate-500">propostas</span>
                    </span>
                    <span>
                      <strong className="block text-2xl font-semibold tracking-tight">
                        {r.prazo_propostas ? r.prazo_propostas.split('-').reverse().slice(0, 2).join('/') : '—'}
                      </strong>
                      <span className="text-xs text-slate-500">prazo de propostas</span>
                    </span>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
