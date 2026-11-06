import Link from 'next/link';
import { WORK_TYPES, WORK_TYPE_LABELS, formatArea, fraseDePrazo, urgenciaPrazo, type WorkType } from '@/domain/request';
import { Dica } from '@/components/Dica';
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
        <h1 className="text-[20px] leading-snug font-semibold">Oportunidades</h1>
        <p className="mt-2 text-[17px] text-slate-600">
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
  const hoje = new Date().toISOString().slice(0, 10);
  const prazos = new Map(sortedListings.map((l) => [l.request_id, urgenciaPrazo(l.prazo_propostas, hoje)]));
  const terminamHoje = sortedListings.filter((l) => prazos.get(l.request_id)!.nivel === 'hoje');

  const comPropostaNossa = sortedListings.filter((l) => status.has(l.request_id)).length;
  const aFechar = sortedListings.filter((l) => prazos.get(l.request_id)!.nivel !== 'normal').length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[26px] leading-tight font-semibold">
          Oportunidades
          <span className="ml-1 align-middle">
            <Dica rotulo="Quem vê os pedidos">
              Pedidos abertos, sem identificação do cliente nem morada. Os contactos são trocados só depois da escolha e da apresentação.
            </Dica>
          </span>
        </h1>
        {/* Os números seguem a vista: mudam com os filtros (guia, §11). */}
        <p className="mt-1 text-[17px] text-slate-600">
          {sortedListings.length === 0
            ? 'Nenhum pedido aberto.'
            : `${sortedListings.length} ${sortedListings.length === 1 ? 'pedido aberto' : 'pedidos abertos'}` +
              (aFechar > 0 ? ` · ${aFechar} a fechar em 3 dias` : '') +
              (comPropostaNossa > 0 ? ` · ${comPropostaNossa} com proposta sua` : '')}
        </p>
      </div>

      {/* Uma só banda, no topo (regra 13 do CLAUDE.md): o prazo mais urgente entre os pedidos abertos. */}
      {terminamHoje.length > 0 && (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[17px] text-amber-900">
          <strong className="font-semibold">
            {terminamHoje.length === 1 ? '1 pedido termina hoje.' : `${terminamHoje.length} pedidos terminam hoje.`}
          </strong>{' '}
          {WORK_TYPE_LABELS[terminamHoje[0]!.tipo_obra]}, em {terminamHoje[0]!.concelho}.
        </p>
      )}

      <form className="flex flex-wrap items-end gap-3 text-[17px]">
        <label className="w-full sm:w-auto">
          <span className="text-slate-600">Tipo de obra</span>
          <select name="tipo" defaultValue={tipo ?? ''} className="campo mt-1 sm:w-56">
            <option value="">Todos</option>
            {WORK_TYPES.map((t) => (
              <option key={t} value={t}>
                {WORK_TYPE_LABELS[t]}
              </option>
            ))}
          </select>
        </label>
        <label className="w-full sm:w-auto">
          <span className="text-slate-600">Zona</span>
          <select name="zona" defaultValue={zona ?? ''} className="campo mt-1 sm:w-72">
            <option value="">Todo o país</option>
            <option value="minha" disabled={zonas.length === 0}>
              As minhas zonas de serviço{zonas.length === 0 ? ' (por definir)' : ''}
            </option>
          </select>
        </label>
        <button type="submit" className="btn-secondary">
          Filtrar
        </button>
      </form>

      {!listings || listings.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-slate-300 p-6 text-[17px] text-slate-600">
          Não há pedidos abertos com estes filtros.
        </p>
      ) : (
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          {/* Cabeçalho de colunas só em ecrã largo: 13px, cinzento, sem faixa (guia, §7.2). */}
          <div className="hidden grid-cols-[minmax(0,1fr)_7rem_11rem] gap-4 border-b border-slate-200 px-5 py-2 text-[13px] text-slate-600 md:grid">
            <span>Pedido</span>
            <span className="text-right">Área</span>
            <span className="text-right">Propostas até</span>
          </div>
          <ul className="divide-y divide-slate-200">
            {sortedListings.map((l) => {
              const prazo = prazos.get(l.request_id)!;
              return (
                <li key={l.request_id}>
                  <Link
                    href={`/app/oportunidades/${l.request_id}`}
                    className="grid min-h-[44px] grid-cols-2 gap-x-4 gap-y-1 px-5 py-3 hover:bg-slate-50 focus-visible:bg-slate-50 md:grid-cols-[minmax(0,1fr)_7rem_11rem]"
                  >
                    <span className="col-span-2 min-w-0 md:col-span-1">
                      <span className="block font-semibold text-slate-900">
                        {WORK_TYPE_LABELS[l.tipo_obra]} · {l.concelho}
                        {invited.has(l.request_id) && (
                          <span className="ml-2 rounded-full bg-tinta-100 px-2 py-0.5 text-[15px] font-semibold text-tinta-900">Convidado</span>
                        )}
                      </span>
                      <span className="block text-[15px] text-slate-600">
                        Pedido {l.ref}
                        {l.pisos !== null ? ` · ${l.pisos} ${l.pisos === 1 ? 'piso' : 'pisos'}` : ''}
                        {status.has(l.request_id) && (
                          <span className="font-semibold text-tinta-700"> · {PROPOSAL_LABEL[status.get(l.request_id)!]}</span>
                        )}
                      </span>
                    </span>
                    <span className="text-[17px] tabular-nums text-slate-900 md:text-right">{formatArea(l.area_total_cm2)}</span>
                    <span className="text-right text-[15px] tabular-nums text-slate-600">
                      <span className="block text-[17px] text-slate-900">{l.prazo_propostas.split('-').reverse().join('/')}</span>
                      {/* Alarme em texto dentro de lista, nunca fundo de cor (regra 13). */}
                      <span className={prazo.nivel === 'hoje' ? 'font-semibold text-amber-800' : prazo.nivel === 'atencao' ? 'text-amber-800' : ''}>
                        {fraseDePrazo(prazo)}
                      </span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}
