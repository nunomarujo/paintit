import Link from 'next/link';
import { notFound } from 'next/navigation';
import { PARTNER_INSTRUCTIONS, STATUS_LABELS, ledger } from '@/domain/contracting';
import { held } from '@/domain/engagement';
import { formatEuros } from '@/domain/money';
import { isPlatformAdmin } from '@/lib/access';
import { loadReplay } from '@/lib/engagements';
import { getUser } from '@/lib/supabase/server';

const card = 'rounded-2xl border border-slate-200 bg-white p-6';
const dt = (iso: string) => new Date(iso).toLocaleString('pt-PT', { timeZone: 'Europe/Lisbon' });

// Conciliação (ADM-25): o que está retido no parceiro, o que a plataforma
// recebeu e as instruções que o parceiro tem de executar.
export default async function ReconciliationPage() {
  const { supabase, user } = await getUser();
  if (!(await isPlatformAdmin(supabase, user!.id))) notFound();
  const { data: rows } = await supabase.from('engagements').select('*').order('created_at');
  const items = await Promise.all((rows ?? []).map(async (r) => ({ r, e: (await loadReplay(supabase, r)).replay.engagement })));
  const l = ledger(items.map((i) => i.e));
  const instructions = items
    .flatMap(({ r, e }) =>
      e.movements
        .filter((m) => PARTNER_INSTRUCTIONS[m.kind])
        .map((m) => ({ ref: r.id.slice(0, 8).toUpperCase(), id: r.id, ...m, label: PARTNER_INSTRUCTIONS[m.kind]! })),
    )
    .sort((a, b) => b.at.localeCompare(a.at));

  return (
    <div className="space-y-8">
      <div>
        <Link href="/app/backoffice" className="text-sm text-slate-600 hover:underline">
          ← Backoffice
        </Link>
        <h1 className="mt-3 text-2xl font-semibold">Conciliação</h1>
        <p className="mt-1 text-sm text-slate-600">
          Calculado a partir dos acontecimentos de cada contratação. Compare com o extrato do parceiro de pagamentos.{' '}
          <a href="/app/backoffice/conciliacao/csv" className="text-tinta-700 hover:underline">
            Descarregar movimentos (CSV)
          </a>
        </p>
      </div>

      <section className={card}>
        <h2 className="font-semibold">Totais</h2>
        <dl className="mt-3 grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
          <dt className="text-slate-500">Retido: cauções de clientes</dt>
          <dd className="sm:text-right">{formatEuros(l.retido.guarantee)}</dd>
          <dt className="text-slate-500">Retido: adiantamentos</dt>
          <dd className="sm:text-right">{formatEuros(l.retido.advance)}</dd>
          <dt className="text-slate-500">Retido: comissões de pintores</dt>
          <dd className="sm:text-right">{formatEuros(l.retido.fee)}</dd>
          <dt className="text-slate-500">Receita: comissões (sem IVA)</dt>
          <dd className="font-semibold sm:text-right">{formatEuros(l.receita.comissao)}</dd>
          <dt className="text-slate-500">IVA das comissões, a entregar ao Estado</dt>
          <dd className="sm:text-right">{formatEuros(l.receita.ivaComissao)}</dd>
          <dt className="text-slate-500">Receita: cauções perdidas por clientes</dt>
          <dd className="sm:text-right">{formatEuros(l.receita.garantias)}</dd>
        </dl>
        <p className="mt-3 text-xs text-slate-500">O tratamento fiscal da caução perdida está por validar com o contabilista (bloco D).</p>
      </section>

      <section className={card}>
        <h2 className="font-semibold">Por contratação</h2>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[36rem] text-left text-sm">
            <thead className="text-slate-500">
              <tr>
                <th className="py-1 font-normal">Contratação</th>
                <th className="py-1 font-normal">Estado</th>
                <th className="py-1 text-right font-normal">Retido</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map(({ r, e }) => {
                const h = held(e);
                return (
                  <tr key={r.id}>
                    <td className="py-1.5">
                      <Link href={`/app/contratacoes/${r.id}`} className="text-tinta-700 hover:underline">
                        {r.id.slice(0, 8).toUpperCase()}
                      </Link>
                    </td>
                    <td className="py-1.5">{STATUS_LABELS[e.status]}</td>
                    <td className="py-1.5 text-right">{formatEuros(h.guarantee + h.advance + h.fee)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className={card}>
        <h2 className="font-semibold">Instruções ao parceiro de pagamentos</h2>
        {instructions.length === 0 ? (
          <p className="mt-2 text-sm text-slate-600">Sem instruções.</p>
        ) : (
          <ul className="mt-3 divide-y divide-slate-100 text-sm">
            {instructions.map((i, n) => (
              <li key={n} className="flex flex-wrap justify-between gap-2 py-1.5">
                <span>
                  {i.label} · <span className="text-slate-500">{i.ref}</span>
                  {i.note ? <span className="text-slate-500"> ({i.note})</span> : null}
                </span>
                <span>
                  {formatEuros(i.amount)} <span className="text-slate-500">· {dt(i.at)}</span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
