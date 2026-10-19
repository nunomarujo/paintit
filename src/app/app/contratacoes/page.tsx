import Link from 'next/link';
import { STATUS_LABELS, availableActions } from '@/domain/contracting';
import { formatEuros } from '@/domain/money';
import { isPlatformAdmin } from '@/lib/access';
import { loadReplay } from '@/lib/engagements';
import { getUser } from '@/lib/supabase/server';

// Contratações em que o utilizador participa. Para a equipa da plataforma, todas,
// com as que esperam uma confirmação sua primeiro.
export default async function EngagementsPage() {
  const { supabase, user } = await getUser();
  const admin = await isPlatformAdmin(supabase, user!.id);
  const { data: rows } = await supabase.from('engagements').select('*').order('created_at', { ascending: false });
  const items = await Promise.all(
    (rows ?? []).map(async (r) => {
      const e = (await loadReplay(supabase, r)).replay.engagement;
      return { r, e, pending: admin && availableActions(e, 'plataforma').length > 0 };
    }),
  );
  items.sort((a, b) => Number(b.pending) - Number(a.pending));

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Contratações</h1>
      {items.length === 0 ? (
        <p className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
          Ainda não há contratações. Uma contratação começa quando o cliente escolhe uma proposta.
        </p>
      ) : (
        <ul className="divide-y divide-slate-200 rounded-2xl border border-slate-200 bg-white">
          {items.map(({ r, e, pending }) => (
            <li key={r.id}>
              <Link href={`/app/contratacoes/${r.id}`} className="flex flex-wrap justify-between gap-2 p-4 hover:bg-slate-50">
                <span>
                  <span className="font-semibold">Contratação {r.id.slice(0, 8).toUpperCase()}</span>
                  <span className="block text-sm text-slate-600">{STATUS_LABELS[e.status]}</span>
                </span>
                <span className="text-right text-sm">
                  {formatEuros(e.base)} sem IVA
                  {pending && <span className="block font-semibold text-amber-700">Espera confirmação da plataforma</span>}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
