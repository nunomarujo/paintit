import Link from 'next/link';
import { painterOrgs } from '@/lib/queries';
import { getUser } from '@/lib/supabase/server';

// Obras contratadas do pintor, para abrir as ferramentas de obra.
export default async function WorksitesPage() {
  const { supabase, user } = await getUser();
  const orgs = await painterOrgs(supabase, user!.id);
  const { data: rows } = orgs.length
    ? await supabase.from('engagements').select('id, request_id, created_at').in('painter_org_id', orgs.map((o) => o.id)).order('created_at', { ascending: false })
    : { data: [] };
  const { data: signed } = rows?.length
    ? await supabase.from('engagement_events').select('engagement_id').eq('kind', 'pintor_assinou').in('engagement_id', rows.map((r) => r.id))
    : { data: [] };
  const done = new Set((signed ?? []).map((s) => s.engagement_id));
  const { data: listings } = rows?.length
    ? await supabase.from('request_listings').select('request_id, ref, concelho').in('request_id', rows.map((r) => r.request_id))
    : { data: [] };
  const obras = (rows ?? []).filter((r) => done.has(r.id));

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Ferramentas de obra</h1>
      <p className="text-sm text-slate-600">Para as obras com contrato assinado: materiais, equipa, cronograma, custos e tranches.</p>
      {obras.length === 0 ? (
        <p className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600">Ainda não há obras com contrato assinado.</p>
      ) : (
        <ul className="divide-y divide-slate-200 rounded-2xl border border-slate-200 bg-white">
          {obras.map((r) => {
            const l = (listings ?? []).find((x) => x.request_id === r.request_id);
            return (
              <li key={r.id}>
                <Link href={`/app/obras/${r.id}`} className="block p-4 hover:bg-slate-50">
                  <span className="font-semibold">Obra {l?.ref ?? r.id.slice(0, 8).toUpperCase()}</span>
                  <span className="block text-sm text-slate-600">{l?.concelho}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
