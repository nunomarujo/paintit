import { serverChecks } from '@/lib/diagnostics';
import { getUser } from '@/lib/supabase/server';

const card = 'rounded-2xl border border-slate-200 bg-white p-6';

export default async function ServerStatusPage() {
  const { supabase } = await getUser();
  const { count } = await supabase.from('engagements').select('id', { count: 'exact', head: true });
  const checks = await serverChecks(count ?? 0);
  return (
    <section className={card} aria-labelledby="diagnostico">
      <h2 id="diagnostico" className="font-semibold">
        Estado do servidor
      </h2>
      <ul className="mt-3 space-y-2 text-sm">
        {checks.map((c) => (
          <li key={c.label} className="flex gap-3">
            <span className={c.ok ? 'text-tinta-700' : 'font-bold text-red-700'} aria-label={c.ok ? 'Em ordem' : 'Com problema'}>
              {c.ok ? '✓' : '✗'}
            </span>
            <span>
              <b>{c.label}.</b> <span className={c.ok ? 'text-slate-600' : 'text-red-800'}>{c.detail}</span>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
