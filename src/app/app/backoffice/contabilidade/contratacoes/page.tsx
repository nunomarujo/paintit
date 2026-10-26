import Link from 'next/link';
import { PARTNER_INSTRUCTIONS, STATUS_LABELS, ledger } from '@/domain/contracting';
import { held } from '@/domain/engagement';
import { formatEuros } from '@/domain/money';
import { loadReplay } from '@/lib/engagements';
import { getUser } from '@/lib/supabase/server';

const card = 'rounded-2xl border border-slate-200 bg-white p-4 sm:p-5';
const dt = (iso: string) => new Date(iso).toLocaleString('pt-PT', { timeZone: 'Europe/Lisbon' });

// Conciliação (ADM-25): o que está retido no parceiro, o que a plataforma
// recebeu e as instruções que o parceiro tem de executar.
export default async function ReconciliationPage() {
  const { supabase } = await getUser();
  const { data: rows } = await supabase.from('engagements').select('*').order('created_at');
  // Uma contratação malformada não pode derrubar a conciliação inteira — fica fora dos totais e marcada aqui;
  // aparece de qualquer forma na fila de pendingEngagements do backoffice, onde o erro é visível.
  const items = (
    await Promise.all(
      (rows ?? []).map(async (r) => {
        try {
          return { r, e: (await loadReplay(supabase, r)).replay.engagement, error: null as string | null };
        } catch (err) {
          return { r, e: null, error: err instanceof Error ? err.message : String(err) };
        }
      }),
    )
  );
  const ok = items.filter((i): i is { r: (typeof items)[number]['r']; e: NonNullable<(typeof items)[number]['e']>; error: null } => i.e !== null);
  const l = ledger(ok.map((i) => i.e));
  const instructions = ok
    .flatMap(({ r, e }) =>
      e.movements
        .filter((m) => PARTNER_INSTRUCTIONS[m.kind])
        .map((m) => ({ ref: r.id.slice(0, 8).toUpperCase(), id: r.id, ...m, label: PARTNER_INSTRUCTIONS[m.kind]! })),
    )
    .sort((a, b) => b.at.localeCompare(a.at));

  return (
    <div className="space-y-8">
      <div>
        <p className="mt-1 text-sm text-slate-600">
          Calculado a partir dos acontecimentos de cada contratação. Compare com o extrato do parceiro de pagamentos.{' '}
          <a href="/app/backoffice/contabilidade/contratacoes/csv" className="text-tinta-700 hover:underline">
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
              {items.map(({ r, e, error }) => {
                const h = e ? held(e) : null;
                return (
                  <tr key={r.id}>
                    <td className="py-1.5">
                      <Link href={`/app/contratacoes/${r.id}`} className="text-tinta-700 hover:underline">
                        {r.id.slice(0, 8).toUpperCase()}
                      </Link>
                    </td>
                    <td className="py-1.5">{h && e ? STATUS_LABELS[e.status] : <span className="text-red-700">erro{error ? `: ${error}` : ''}</span>}</td>
                    <td className="py-1.5 text-right">{h ? formatEuros(h.guarantee + h.advance + h.fee) : '—'}</td>
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
