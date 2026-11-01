import Link from 'next/link';
import { WORK_TYPE_LABELS } from '@/domain/request';
import { CURRENT_RULES } from '@/domain/rules';
import { localDate } from '@/domain/deadline';
import { estadoDaEntrega } from '@/domain/entrega';
import { getUser } from '@/lib/supabase/server';

const dataCurta = (iso: string | null) =>
  iso ? new Date(`${iso}T12:00:00`).toLocaleDateString('pt-PT', { day: 'numeric', month: 'short' }) : '—';

/**
 * «As minhas obras» em áreas por função (promotor, 01/11/2026): à esquerda o que pede atenção e
 * os números; à direita as obras em grelha, agrupadas pela fase em que estão — a receber propostas,
 * propostas abertas, em preparação, terminadas. Cada grupo tem a sua cor de pílula, uma só vez, no
 * título do grupo; dentro dos cartões o alarme é texto (regra 13).
 */
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
  const hoje = localDate(new Date(), CURRENT_RULES.timeZone);
  const lista = (requests ?? []).map((r) => {
    const entrega = estadoDaEntrega(r.prazo_propostas, hoje, r.status === 'publicado');
    const propostas = (proposals ?? []).filter((p) => p.request_id === r.id).length;
    const fase: Fase =
      r.status === 'rascunho' ? 'preparacao' : r.status === 'publicado' ? (entrega.entregues ? 'abertas' : 'a_receber') : 'terminadas';
    return { r, entrega, propostas, fase };
  });
  const grupos = FASES.map((f) => ({ ...f, obras: lista.filter((o) => o.fase === f.id) })).filter((g) => g.obras.length > 0);
  const nomeDaOrg = (id: string) => clientOrgs.find((o) => o.id === id)?.nome ?? '';
  const porComparar = lista.filter((o) => o.fase === 'abertas');
  const proximaAbertura = lista
    .filter((o) => o.fase === 'a_receber' && o.entrega.abremEm)
    .sort((a, b) => (a.entrega.abremEm! < b.entrega.abremEm! ? -1 : 1))[0];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-[26px] font-semibold leading-tight">As minhas obras</h1>
          <p className="mt-1 text-[17px] text-slate-600">Só empresas com documentos verificados respondem, com propostas discriminadas.</p>
        </div>
        {clientOrgs.length > 0 && (
          <Link href={`/app/organizacoes/${clientOrgs[0]!.id}/pedidos/novo`} className="btn-primary">
            Pedir orçamentos
          </Link>
        )}
      </div>

      {clientOrgs.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <p className="text-[17px]">Para pedir orçamentos, registe primeiro um condomínio ou um particular em «Início».</p>
        </div>
      ) : lista.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <p className="text-[17px]">Ainda não há obras.</p>
          <Link href={`/app/organizacoes/${clientOrgs[0]!.id}/pedidos/novo`} className="btn-primary mt-4">
            Pedir orçamentos
          </Link>
        </div>
      ) : (
        <div className="grid gap-5 lg:grid-cols-12">
          {/* Painel: o que pede atenção, e os números. */}
          <aside className="space-y-4 lg:col-span-3">
            {porComparar.length > 0 ? (
              <section className="rounded-2xl bg-tinta-900 p-5 text-white">
                <p className="text-[13px] font-semibold text-lima">Precisa de si</p>
                <p className="mt-1 text-[20px] font-semibold leading-tight">
                  {porComparar.length === 1 ? 'Propostas abertas numa obra' : `Propostas abertas em ${porComparar.length} obras`}
                </p>
                <ul className="mt-3 space-y-2">
                  {porComparar.slice(0, 3).map((o) => (
                    <li key={o.r.id}>
                      <Link href={`/app/pedidos/${o.r.id}/propostas`} className="inline-flex min-h-[44px] items-center text-[15px] font-semibold text-lima hover:underline">
                        Comparar · {o.r.titulo}
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            ) : (
              <section className="rounded-2xl bg-paper p-5">
                <p className="text-[13px] font-semibold text-slate-500">Nada por fazer</p>
                <p className="mt-1 text-[17px]">
                  {proximaAbertura
                    ? `As próximas propostas abrem a ${dataCurta(proximaAbertura.entrega.abremEm)}.`
                    : 'Avisamos quando houver algo que precise de si.'}
                </p>
              </section>
            )}
            <section className="rounded-2xl border border-slate-200 bg-white p-5">
              <h2 className="text-[13px] font-semibold text-slate-500">Em números</h2>
              <dl className="mt-2 grid grid-cols-2 gap-3 lg:grid-cols-1">
                {FASES.map((f) => {
                  const n = lista.filter((o) => o.fase === f.id).length;
                  return (
                    <div key={f.id} className="flex items-baseline justify-between gap-2">
                      <dt className="text-[15px] text-slate-600">{f.nome}</dt>
                      <dd className="text-[20px] font-semibold tabular-nums">{n}</dd>
                    </div>
                  );
                })}
              </dl>
            </section>
            <section className="rounded-2xl border border-slate-200 bg-white p-5">
              <h2 className="text-[13px] font-semibold text-slate-500">O que o protege</h2>
              <ul className="mt-2 list-disc space-y-1 pl-4 text-[15px] text-slate-600">
                <li>Empresas com alvará e seguros verificados</li>
                <li>Propostas abertas todas ao mesmo tempo</li>
                <li>Contrato que transcreve a proposta escolhida</li>
              </ul>
            </section>
          </aside>

          {/* As obras, por fase. */}
          <div className="space-y-6 lg:col-span-9">
            {grupos.map((g) => (
              <section key={g.id}>
                <h2 className="flex items-center gap-2 text-[17px] font-semibold">
                  <span className={`rounded-full px-2.5 py-0.5 text-[13px] ${g.pilula}`}>{g.nome}</span>
                  <span className="text-slate-500">
                    {g.obras.length} {g.obras.length === 1 ? 'obra' : 'obras'}
                  </span>
                </h2>
                <ul className="mt-3 grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
                  {g.obras.map(({ r, entrega, propostas, fase }) => (
                    <li key={r.id}>
                      <Link href={`/app/pedidos/${r.id}`} className="block h-full rounded-2xl border border-slate-200 bg-white p-5 transition-colors hover:border-tinta-600">
                        <p className="text-[13px] text-slate-500">
                          Ref. {r.ref} · {nomeDaOrg(r.org_id)}
                        </p>
                        <h3 className="mt-1 text-[20px] font-semibold leading-tight">{r.titulo}</h3>
                        <p className="mt-1 text-[15px] text-slate-600">{WORK_TYPE_LABELS[r.tipo_obra]}</p>
                        <dl className="mt-4 flex flex-wrap gap-x-6 gap-y-2 border-t border-slate-200 pt-3">
                          {fase === 'a_receber' && (
                            <>
                              <Dado rotulo="Propostas até" valor={dataCurta(r.prazo_propostas)} />
                              <Dado rotulo="Abrem" valor={dataCurta(entrega.abremEm)} />
                            </>
                          )}
                          {fase === 'abertas' && (
                            <>
                              <Dado rotulo="Propostas" valor={String(propostas)} />
                              <Dado rotulo="Por fazer" valor="Comparar" destaque />
                            </>
                          )}
                          {fase === 'preparacao' && <Dado rotulo="Por fazer" valor="Completar e publicar" destaque />}
                          {fase === 'terminadas' && <Dado rotulo="Propostas" valor={String(propostas)} />}
                        </dl>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

type Fase = 'abertas' | 'a_receber' | 'preparacao' | 'terminadas';
const FASES: { id: Fase; nome: string; pilula: string }[] = [
  { id: 'abertas', nome: 'Propostas abertas', pilula: 'bg-tinta-900 text-white' },
  { id: 'a_receber', nome: 'A receber propostas', pilula: 'bg-tinta-100 text-tinta-900' },
  { id: 'preparacao', nome: 'Em preparação', pilula: 'bg-slate-100 text-slate-700' },
  { id: 'terminadas', nome: 'Terminadas', pilula: 'bg-slate-100 text-slate-600' },
];

function Dado({ rotulo, valor, destaque = false }: { rotulo: string; valor: string; destaque?: boolean }) {
  return (
    <div>
      <dt className="text-[13px] text-slate-500">{rotulo}</dt>
      <dd className={`text-[17px] font-semibold ${destaque ? 'text-amber-800' : ''}`}>{valor}</dd>
    </div>
  );
}
