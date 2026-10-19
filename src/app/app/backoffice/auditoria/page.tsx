import Link from 'next/link';
import { notFound } from 'next/navigation';
import { EVENT_LABELS } from '@/domain/contracting';
import { formatEuros } from '@/domain/money';
import { isPlatformAdmin } from '@/lib/access';
import { getUser } from '@/lib/supabase/server';

const dt = (iso: string) => new Date(iso).toLocaleString('pt-PT', { timeZone: 'Europe/Lisbon' });

// Auditoria (ADM-26): cada decisão da equipa da plataforma, com autor e hora.
export default async function AuditPage() {
  const { supabase, user } = await getUser();
  if (!(await isPlatformAdmin(supabase, user!.id))) notFound();

  const [{ data: admins }, { data: docs }, { data: photos }, { data: reports }] = await Promise.all([
    supabase.from('platform_admins').select('user_id'),
    supabase.from('org_documents').select('id, status, validated_by, validated_at, notas_validacao').not('validated_at', 'is', null),
    supabase.from('request_photos').select('id, revisao, reviewed_by, reviewed_at, notas_revisao').not('reviewed_at', 'is', null),
    supabase.from('listing_reports').select('id, status, resolved_by, resolved_at, resolucao').not('resolved_at', 'is', null),
  ]);
  const adminIds = (admins ?? []).map((a) => a.user_id);
  const { data: events } = adminIds.length
    ? await supabase.from('engagement_events').select('id, engagement_id, kind, amount_cents, actor, at, created_at').in('actor', adminIds)
    : { data: [] };
  const { data: profiles } = await supabase.from('profiles').select('user_id, nome, email');
  const who = (id: string | null) => {
    const p = profiles?.find((x) => x.user_id === id);
    return p ? p.nome || p.email || id : id ?? '—';
  };

  const entries = [
    ...(docs ?? []).map((d) => ({ at: d.validated_at!, by: d.validated_by, what: `Documento ${d.status}`, note: d.notas_validacao })),
    ...(photos ?? []).map((p) => ({ at: p.reviewed_at!, by: p.reviewed_by, what: `Fotografia ${p.revisao}`, note: p.notas_revisao })),
    ...(reports ?? []).map((r) => ({ at: r.resolved_at!, by: r.resolved_by, what: `Denúncia: ${r.status.replace('_', ' ')}`, note: r.resolucao })),
    ...(events ?? []).map((e) => ({
      at: e.created_at,
      by: e.actor,
      what: `${EVENT_LABELS[e.kind]} (${e.engagement_id.slice(0, 8).toUpperCase()})`,
      note: e.amount_cents !== null ? `${formatEuros(e.amount_cents)}, recebido a ${dt(e.at)}` : null,
    })),
  ].sort((a, b) => b.at.localeCompare(a.at));

  return (
    <div className="space-y-6">
      <Link href="/app/backoffice" className="text-sm text-slate-600 hover:underline">
        ← Backoffice
      </Link>
      <h1 className="text-2xl font-semibold">Auditoria</h1>
      {entries.length === 0 ? (
        <p className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600">Ainda não há decisões registadas.</p>
      ) : (
        <ul className="divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white text-sm">
          {entries.map((x, i) => (
            <li key={i} className="flex flex-wrap justify-between gap-2 p-3">
              <span>
                <span className="font-medium">{x.what}</span>
                {x.note && <span className="block text-slate-500">{x.note}</span>}
              </span>
              <span className="text-right text-slate-500">
                {who(x.by)}
                <span className="block">{dt(x.at)}</span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
