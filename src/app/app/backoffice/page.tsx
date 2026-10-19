import Link from 'next/link';
import { notFound } from 'next/navigation';
import { availableActions } from '@/domain/contracting';
import { isPlatformAdmin } from '@/lib/access';
import { loadReplay } from '@/lib/engagements';
import { getUser } from '@/lib/supabase/server';
import { ResolveReport } from './ReportForms';

const card = 'rounded-2xl border border-slate-200 bg-white p-6';

// Backoffice da equipa da plataforma: o que espera por uma pessoa.
export default async function BackofficePage() {
  const { supabase, user } = await getUser();
  if (!(await isPlatformAdmin(supabase, user!.id))) notFound();

  const [docs, photos, { data: reports }, { data: engagements }] = await Promise.all([
    supabase.from('org_documents').select('id', { count: 'exact', head: true }).in('status', ['submetido', 'em_validacao']),
    supabase.from('request_photos').select('id', { count: 'exact', head: true }).eq('revisao', 'pendente'),
    supabase.from('listing_reports').select('*').eq('status', 'pendente').order('created_at'),
    supabase.from('engagements').select('*'),
  ]);
  const pendingEngagements = (
    await Promise.all((engagements ?? []).map(async (r) => availableActions((await loadReplay(supabase, r)).replay.engagement, 'plataforma').length > 0))
  ).filter(Boolean).length;
  const listings = reports?.length
    ? (await supabase.from('request_listings').select('request_id, ref, concelho, descricao').in('request_id', reports.map((r) => r.request_id))).data ?? []
    : [];

  const tiles = [
    { href: '/app/validacao', label: 'Documentos e fotografias por rever', n: (docs.count ?? 0) + (photos.count ?? 0) },
    { href: '/app/contratacoes', label: 'Contratações à espera da plataforma', n: pendingEngagements },
    { href: '#denuncias', label: 'Denúncias de anúncios', n: reports?.length ?? 0 },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Backoffice</h1>
        <p className="mt-1 text-sm text-slate-600">
          Tudo o que a equipa da plataforma faz fica registado com autor e hora (ver auditoria).
        </p>
      </div>

      <ul className="grid gap-4 sm:grid-cols-3">
        {tiles.map((t) => (
          <li key={t.label}>
            <Link href={t.href} className={`${card} block hover:bg-slate-50`}>
              <span className="text-3xl font-semibold text-tinta-700">{t.n}</span>
              <span className="mt-1 block text-sm text-slate-600">{t.label}</span>
            </Link>
          </li>
        ))}
      </ul>

      <div className="flex flex-wrap gap-3 text-sm">
        <Link href="/app/backoffice/conciliacao" className="rounded-lg border border-slate-300 px-4 py-2 font-semibold hover:bg-slate-50">
          Conciliação de pagamentos
        </Link>
        <Link href="/app/backoffice/auditoria" className="rounded-lg border border-slate-300 px-4 py-2 font-semibold hover:bg-slate-50">
          Auditoria
        </Link>
      </div>

      <section id="denuncias" className={card}>
        <h2 className="font-semibold">Denúncias de anúncios</h2>
        {!reports || reports.length === 0 ? (
          <p className="mt-2 text-sm text-slate-600">Não há denúncias por decidir.</p>
        ) : (
          <ul className="mt-4 space-y-6">
            {reports.map((r) => {
              const l = listings.find((x) => x.request_id === r.request_id);
              return (
                <li key={r.id} className="text-sm">
                  <p className="font-medium">
                    Pedido {l?.ref ?? '—'} · {l?.concelho ?? ''}
                  </p>
                  <p className="mt-1">
                    <span className="text-slate-500">Denúncia: </span>
                    {r.motivo}
                  </p>
                  {l && <p className="mt-1 whitespace-pre-line rounded-lg bg-slate-50 p-2 text-slate-700">{l.descricao}</p>}
                  <ResolveReport reportId={r.id} />
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
