import Link from 'next/link';
import { redirect } from 'next/navigation';
import { CURRENT_RULES } from '@/domain/rules';
import { estadoDaEntrega } from '@/domain/entrega';
import { localDate } from '@/domain/deadline';
import { residenciasDe } from '@/lib/condomino';
import { getUser } from '@/lib/supabase/server';

export const metadata = { title: 'O meu prédio' };

const dataLonga = (iso: string | null) =>
  iso ? new Date(`${iso}T12:00:00`).toLocaleDateString('pt-PT', { day: 'numeric', month: 'long' }) : '—';

/**
 * Início do condómino (01/11/2026). Uma conta que entrou pelo código do prédio vê aqui o que a
 * administração abriu: o pedido de orçamentos do prédio, em que ponto está, quando abrem as
 * propostas — ao mesmo tempo para toda a gente — e, depois disso, o caminho para as ler e votar.
 * Não vê rascunhos, morada nem outros prédios: a política da base só devolve o que é deste prédio.
 */
export default async function CondominioPage() {
  const { supabase } = await getUser();
  const residencias = await residenciasDe(supabase);
  if (residencias.length === 0) redirect('/app');

  const hoje = localDate(new Date(), CURRENT_RULES.timeZone);
  const { data: pedidos } = await supabase
    .from('work_requests')
    .select('id, ref, titulo, status, prazo_propostas, building_id, created_at')
    .in(
      'building_id',
      residencias.map((r) => r.buildingId),
    )
    .neq('status', 'rascunho')
    .order('created_at', { ascending: false });
  const lista = pedidos ?? [];
  const ids = lista.map((p) => p.id);
  const [{ data: propostas }, { data: votos }] = await Promise.all([
    ids.length ? supabase.from('proposals').select('id, request_id').in('request_id', ids).neq('status', 'rascunho') : { data: [] },
    ids.length ? supabase.from('proposal_votes').select('request_id').in('request_id', ids) : { data: [] },
  ]);
  const nPropostas = (rid: string) => (propostas ?? []).filter((p) => p.request_id === rid).length;
  const votou = new Set((votos ?? []).map((v) => v.request_id));

  return (
    <div className="space-y-8">
      {residencias.map((r) => {
        const meus = lista.filter((p) => p.building_id === r.buildingId);
        return (
          <section key={r.id}>
            <p className="eyebrow text-tinta-600">{r.condominio}</p>
            <h1 className="mt-1 text-[26px] leading-tight font-semibold">{r.predio}</h1>
            <p className="mt-1 text-[17px] text-slate-600">
              Fração {r.fracao}
              {r.andar && ` · ${r.andar}`}
              {r.permilagem !== null && ` · ${r.permilagem}‰`}
            </p>

            {meus.length === 0 ? (
              <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6">
                <p className="text-[17px]">A administração ainda não publicou nenhum pedido de orçamentos para este prédio.</p>
                <p className="mt-1 text-[15px] text-slate-600">Quando publicar, aparece aqui, com as datas.</p>
              </div>
            ) : (
              <ul className="mt-6 space-y-4">
                {meus.map((p) => {
                  const entrega = estadoDaEntrega(p.prazo_propostas, hoje, p.status === 'publicado');
                  const n = nPropostas(p.id);
                  const abertas = entrega.entregues && p.status !== 'cancelado';
                  return (
                    <li key={p.id} className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-[13px] text-slate-500">Ref. {p.ref}</p>
                          <h2 className="mt-1 text-[20px] font-semibold">{p.titulo}</h2>
                        </div>
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-[13px] font-semibold ${
                            p.status === 'publicado' ? (abertas ? 'bg-tinta-100 text-tinta-900' : 'bg-slate-100 text-slate-700') : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {p.status === 'cancelado' ? 'Cancelado' : p.status === 'encerrado' ? 'Encerrado' : abertas ? 'Propostas abertas' : 'A receber propostas'}
                        </span>
                      </div>

                      {abertas ? (
                        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                          <p className="text-[17px]">
                            <span className="font-semibold">{n}</span> {n === 1 ? 'proposta' : 'propostas'}
                            {votou.has(p.id) ? <span className="text-slate-600"> · já votou; pode mudar o voto</span> : p.status === 'publicado' && n > 0 ? <span className="text-slate-600"> · ainda não votou</span> : null}
                          </p>
                          <Link href={`/app/condominio/pedidos/${p.id}`} className="btn-primary">
                            {votou.has(p.id) ? 'Ver propostas e o meu voto' : 'Ler as propostas e votar'}
                          </Link>
                        </div>
                      ) : p.status === 'publicado' ? (
                        <div className="mt-4 rounded-2xl bg-tinta-900 p-5 text-white">
                          <p className="text-[13px] font-semibold text-lima">Abertura simultânea</p>
                          <p className="mt-1 text-[20px] font-semibold">As propostas abrem a {dataLonga(entrega.abremEm)}</p>
                          <p className="mt-2 text-[15px] text-tinta-200">
                            Chegam todas ao mesmo tempo, para a administração e para os condóminos. Ninguém — nem a plataforma
                            — mostra uma proposta antes dessa data, para não haver espaço a favorecimentos. Até lá, nada a fazer.
                          </p>
                        </div>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        );
      })}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl bg-paper p-5">
          <h2 className="text-[15px] font-semibold">O que vale o voto</h2>
          <p className="mt-1 text-[15px] text-slate-600">
            O voto é indicativo: diz à administração qual a proposta que o prédio prefere, em número de frações e, quando
            registada, em permilagem. A decisão formal continua a ser a da assembleia.
          </p>
        </div>
        <div className="rounded-2xl bg-paper p-5">
          <h2 className="text-[15px] font-semibold">Materiais e preços de referência</h2>
          <p className="mt-1 text-[15px] text-slate-600">
            As fichas técnicas das tintas e os preços de mercado, para perceber o que cada proposta inclui.
          </p>
          <Link href="/app/condominio/catalogo" className="mt-2 inline-flex min-h-[44px] items-center text-[15px] font-semibold text-tinta-600 hover:underline">
            Abrir o catálogo
          </Link>
        </div>
      </div>
    </div>
  );
}
