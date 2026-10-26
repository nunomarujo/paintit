import { getUser } from '@/lib/supabase/server';
import { ResolveReport } from '../../ReportForms';

const card = 'rounded-2xl border border-slate-200 bg-white p-4 sm:p-5';

export default async function ReportsPage() {
  const { supabase } = await getUser();
  const { data: reports } = await supabase.from('listing_reports').select('*').eq('status', 'pendente').order('created_at');
  const listings = reports?.length
    ? ((await supabase.from('request_listings').select('request_id, ref, concelho, descricao').in('request_id', reports.map((r) => r.request_id))).data ?? [])
    : [];
  return (
    <section className={card}>
      <h2 className="font-semibold">Denúncias de anúncios por decidir</h2>
      {!reports || reports.length === 0 ? (
        <p className="mt-2 text-[17px] text-slate-600">Não há denúncias por decidir.</p>
      ) : (
        <ul className="mt-4 space-y-6">
          {reports.map((r) => {
            const l = listings.find((x) => x.request_id === r.request_id);
            return (
              <li key={r.id} className="text-[17px]">
                <p className="font-medium">
                  Pedido {l?.ref ?? '—'} · {l?.concelho ?? ''}
                </p>
                <p className="mt-1">
                  <span className="text-slate-500">Denúncia: </span>
                  {r.motivo}
                </p>
                {l && <p className="mt-1 whitespace-pre-line rounded-lg bg-slate-50 p-2 text-slate-700">{l.descricao}</p>}
                <ResolveReport reportId={r.id} />
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
