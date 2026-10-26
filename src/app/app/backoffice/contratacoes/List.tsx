import Link from 'next/link';
import { STATUS_LABELS } from '@/domain/contracting';
import type { Engagement } from '@/domain/engagement';
import { formatEuros } from '@/domain/money';
import type { Database } from '@/lib/database.types';

type Row = Database['public']['Tables']['engagements']['Row'];

export function EngagementList({ items, empty }: { items: { r: Row; e: Engagement | null; pending: boolean; error?: string }[]; empty: string }) {
  if (items.length === 0) return <p className="rounded-2xl border border-slate-200 bg-white p-6 text-[17px] text-slate-600">{empty}</p>;
  return (
    <ul className="divide-y divide-slate-200 rounded-2xl border border-slate-200 bg-white">
      {items.map(({ r, e, pending, error }) => (
        <li key={r.id}>
          <Link href={`/app/contratacoes/${r.id}`} className="flex flex-wrap justify-between gap-2 p-4 hover:bg-slate-50">
            <span>
              <span className="font-semibold">Contratação {r.id.slice(0, 8).toUpperCase()}</span>
              <span className="block text-[17px] text-slate-600">
                {e ? STATUS_LABELS[e.status] : 'Erro ao reconstruir'} · desde {r.created_at.slice(0, 10).split('-').reverse().join('/')}
              </span>
              {error && <span className="block text-[17px] text-red-700">{error}</span>}
            </span>
            <span className="text-right text-[17px]">
              {e && `${formatEuros(e.base)} sem IVA`}
              {pending && <span className="block font-semibold text-amber-700">Espera confirmação da plataforma</span>}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
