import Link from 'next/link';
import { STATUS_LABELS } from '@/domain/contracting';
import type { Engagement } from '@/domain/engagement';
import { formatEuros } from '@/domain/money';
import type { Database } from '@/lib/database.types';

type Row = Database['public']['Tables']['engagements']['Row'];

export function EngagementList({ items, empty }: { items: { r: Row; e: Engagement; pending: boolean }[]; empty: string }) {
  if (items.length === 0) return <p className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600">{empty}</p>;
  return (
    <ul className="divide-y divide-slate-200 rounded-2xl border border-slate-200 bg-white">
      {items.map(({ r, e, pending }) => (
        <li key={r.id}>
          <Link href={`/app/contratacoes/${r.id}`} className="flex flex-wrap justify-between gap-2 p-4 hover:bg-slate-50">
            <span>
              <span className="font-semibold">Contratação {r.id.slice(0, 8).toUpperCase()}</span>
              <span className="block text-sm text-slate-600">
                {STATUS_LABELS[e.status]} · desde {r.created_at.slice(0, 10).split('-').reverse().join('/')}
              </span>
            </span>
            <span className="text-right text-sm">
              {formatEuros(e.base)} sem IVA
              {pending && <span className="block font-semibold text-amber-700">Espera confirmação da plataforma</span>}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
