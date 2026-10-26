import Link from 'next/link';
import { WORK_TYPES, WORK_TYPE_LABELS, formatArea, type WorkType } from '@/domain/request';
import { painterOrgs } from '@/lib/queries';
import { getUser } from '@/lib/supabase/server';

const PROPOSAL_LABEL: Record<string, string> = {
  rascunho: 'Proposta em rascunho',
  submetida: 'Proposta submetida',
  retirada: 'Proposta retirada',
  selecionada: 'Escolhida',
  nao_selecionada: 'Não escolhida',
  falhada: 'Escolhida, sem contrato',
};

// Oportunidades para pintores: anúncios abertos, anónimos (PIN-05).
export default async function OpportunitiesPage({
  searchParams,
}: {
  searchParams: Promise<{ tipo?: string; zona?: string }>;
}) {
  const { tipo, zona } = await searchParams;
  const { supabase, user } = await getUser();
  const orgs = await painterOrgs(supabase, user!.id);

  if (orgs.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6">
        <h1 className="text-xl font-semibold">Oportunidades</h1>
        <p className="mt-2 text-sm text-slate-600">
          As oportunidades são para empresas de pintura. Registe a sua entidade de pintura em{' '}
          <Link href="/app/organizacoes/nova" className="text-tinta-700 hover:underline">
            Adicionar entidade
          </Link>
          .
        </p>
      </div>
    );
  }

  const zonas = [...new Set(orgs.flatMap((o) => o.zonas))];
  let query = supabase.from('request_listings').select('*').eq('aberto', true).order('prazo_propostas');
  if (tipo && (WORK_TYPES as readonly string[]).includes(tipo)) query = query.eq('tipo_obra', tipo as WorkType);
  if (zona === 'minha' && zonas.length > 0) query = query.in('concelho', zonas);
  const [{ data: listings }, { data: mine }, { data: invites }] = await Promise.all([
    query,
    supabase.from('proposals').select('request_id, status').in('painter_org_id', orgs.map((o) => o.id)),
    supabase.from('listing_invites').select('request_id').in('painter_org_id', orgs.map((o) => o.id)),
  ]);
  const invited = new Set((invites ?? []).map((i) => i.request_id));
  const sortedListings = [...(listings ?? [])].sort((a, b) => Number(invited.has(b.request_id)) - Number(invited.has(a.request_id)));
  const status = new Map((mine ?? []).map((p) => [p.request_id, p.status]));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Oportunidades</h1>
        <p className="mt-1 text-sm text-slate-600">
          Pedidos abertos, sem identificação do cliente nem morada. Os contactos são trocados só depois da escolha e da
          apresentação.
        </p>
      </div>

      <form className="flex flex-wrap items-end gap-3 text-sm">
        <label>
          Tipo de obra
          <select name="tipo" defaultValue={tipo ?? ''} className="mt-1 block rounded-lg border border-slate-300 bg-white px-3 py-2">
            <option value="">Todos</option>
            {WORK_TYPES.map((t) => (
              <option key={t} value={t}>
                {WORK_TYPE_LABELS[t]}
              </option>
            ))}
          </select>
        </label>
        <label>
          Zona
          <select name="zona" defaultValue={zona ?? ''} className="mt-1 block rounded-lg border border-slate-300 bg-white px-3 py-2">
            <option value="">Todo o país</option>
            <option value="minha" disabled={zonas.length === 0}>
              As minhas zonas de serviço{zonas.length === 0 ? ' (por definir)' : ''}
            </option>
          </select>
        </label>
        <button type="submit" className="rounded-lg border border-slate-300 px-4 py-2 font-semibold hover:bg-slate-50">
          Filtrar
        </button>
      </form>

      {!listings || listings.length === 0 ? (
        <p className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600">Não há pedidos abertos com estes filtros.</p>
      ) : (
        <ul className="divide-y divide-slate-200 overflow-hidden rounded-2xl border border-slate-200 bg-white xl:grid xl:grid-cols-2 xl:divide-y-0 xl:gap-x-px xl:bg-slate-200">
          {sortedListings.map((l) => (
            <li key={l.request_id}>
              <Link href={`/app/oportunidades/${l.request_id}`} className="flex flex-wrap justify-between gap-2 p-4 hover:bg-slate-50">
                <span>
                  <span className="font-semibold">
                    {WORK_TYPE_LABELS[l.tipo_obra]} · {l.concelho}
                  </span>
                  {invited.has(l.request_id) && (
                    <span className="ml-2 rounded-full bg-tinta-100 px-2 py-0.5 text-xs font-semibold text-tinta-900">Convidado</span>
                  )}
                  <span className="block text-sm text-slate-600">
                    Pedido {l.ref} · {formatArea(l.area_total_cm2)}
                    {l.pisos !== null ? ` · ${l.pisos} pisos` : ''}
                  </span>
                </span>
                <span className="text-right text-sm text-slate-500">
                  Propostas até {l.prazo_propostas.split('-').reverse().join('/')}
                  {status.has(l.request_id) && (
                    <span className="block font-medium text-tinta-700">{PROPOSAL_LABEL[status.get(l.request_id)!]}</span>
                  )}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
