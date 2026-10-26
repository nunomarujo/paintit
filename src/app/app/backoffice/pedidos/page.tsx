import { InvitePainter } from '@/components/ExtrasForms';
import { formatArea } from '@/domain/request';
import { getUser } from '@/lib/supabase/server';

const card = 'rounded-2xl border border-slate-200 bg-white p-4 sm:p-5';

// ADM-07: pedidos abertos com menos de três propostas, para convidar pintores.
export default async function FewProposalsPage() {
  const { supabase } = await getUser();
  const [{ data: open }, { data: painterList }, { data: submitted }] = await Promise.all([
    supabase.from('request_listings').select('request_id, ref, concelho, area_total_cm2, prazo_propostas').eq('aberto', true).order('prazo_propostas'),
    supabase.from('organizations').select('id, nome').eq('kind', 'pintor').order('nome'),
    supabase.from('proposals').select('request_id').eq('status', 'submetida'),
  ]);
  const proposalsFor = (rid: string) => (submitted ?? []).filter((p) => p.request_id === rid).length;
  const needing = (open ?? []).filter((l) => proposalsFor(l.request_id) < 3);
  return (
    <section className={card}>
      <h2 className="font-semibold">Pedidos abertos com menos de três propostas ({needing.length} de {(open ?? []).length} abertos)</h2>
      <p className="mt-1 text-[17px] text-slate-600">Convide pintores verificados. O convite não garante propostas nem apresenta pintores relacionados como independentes.</p>
      {needing.length === 0 ? (
        <p className="mt-3 text-[17px] text-slate-600">Nenhum.</p>
      ) : (
        <ul className="mt-4 space-y-4">
          {needing.map((l) => (
            <li key={l.request_id} className="text-[17px]">
              <p>
                <span className="font-medium">Pedido {l.ref}</span> · {l.concelho} · {formatArea(l.area_total_cm2)} · {proposalsFor(l.request_id)} proposta(s) · até{' '}
                {l.prazo_propostas.split('-').reverse().join('/')}
              </p>
              <div className="mt-2">
                <InvitePainter requestId={l.request_id} painters={painterList ?? []} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
