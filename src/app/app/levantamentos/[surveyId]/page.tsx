import Link from 'next/link';
import { notFound } from 'next/navigation';
import { PhotoUpload } from '@/app/app/pedidos/[id]/PhotoUpload';
import { SurfaceForm } from '@/app/app/pedidos/[id]/SurfaceForm';
import { AREA_SOURCE_LABELS, SURFACE_KIND_LABELS, formatArea } from '@/domain/request';
import { getUser } from '@/lib/supabase/server';
import { ConcludeButton, ContactForm } from './ContactForm';

const card = 'rounded-2xl border border-slate-200 bg-white p-6';

export default async function SurveyWorkspacePage({ params }: { params: Promise<{ surveyId: string }> }) {
  const { surveyId } = await params;
  const { supabase } = await getUser();
  const { data: survey } = await supabase.from('request_surveys').select('*').eq('id', surveyId).maybeSingle();
  if (!survey || (survey.status !== 'reservado' && survey.status !== 'concluido')) notFound();

  const { data: request } = await supabase.from('work_requests').select('id, descricao, building_id').eq('id', survey.request_id).maybeSingle();
  if (!request) notFound();
  const [{ data: building }, { data: surfaces }, { data: photos }] = await Promise.all([
    supabase.from('buildings').select('morada, codigo_postal, localidade, concelho, pisos, fachadas, tem_varandas').eq('id', request.building_id).maybeSingle(),
    supabase.from('request_surfaces').select('*').eq('request_id', request.id).order('created_at'),
    supabase.from('request_photos').select('id, kind, legenda').eq('request_id', request.id).order('created_at'),
  ]);
  const list = surfaces ?? [];
  const total = list.reduce((n, s) => n + s.area_cm2, 0);
  const done = survey.status === 'concluido';

  return (
    <div className="space-y-8">
      <div>
        <Link href="/app/levantamentos" className="text-sm text-slate-600 hover:underline">
          ← Levantamentos
        </Link>
        <h1 className="mt-3 text-2xl font-semibold">Levantamento da obra</h1>
        {building && (
          <p className="mt-1 text-sm text-slate-600">
            {building.morada}, {building.codigo_postal} {building.localidade} ({building.concelho}).{' '}
            {building.pisos ? `${building.pisos} pisos. ` : ''}
            {building.fachadas ? `${building.fachadas} fachadas. ` : ''}
            {building.tem_varandas ? 'Com varandas.' : 'Sem varandas.'}
          </p>
        )}
      </div>

      <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        A morada e os dados desta obra são confidenciais: não os partilhe fora da aplicação, nem indique esta obra a
        nenhum pintor ou terceiro fora do fluxo normal da plataforma.
      </section>

      {request.descricao && (
        <section className={card}>
          <h2 className="font-semibold">Descrição do cliente</h2>
          <p className="mt-2 whitespace-pre-line text-sm text-slate-700">{request.descricao}</p>
        </section>
      )}

      <section className={card}>
        <h2 className="font-semibold">Contacto e agendamento</h2>
        <div className="mt-3">
          <ContactForm surveyId={survey.id} initial={{ notas: survey.contact_notes, agendado: survey.scheduled_at?.slice(0, 16) ?? null }} />
        </div>
      </section>

      <section className={card}>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-semibold">Superfícies e áreas</h2>
          <span className="text-sm text-slate-600">Total: {formatArea(total)}</span>
        </div>
        {list.length > 0 ? (
          <ul className="mt-4 divide-y divide-slate-100 text-sm">
            {list.map((s) => (
              <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <span>
                  <span className="font-medium">{SURFACE_KIND_LABELS[s.kind]}</span>
                  {s.descricao && <span className="text-slate-500"> · {s.descricao}</span>}
                  <span className="block text-slate-500">{AREA_SOURCE_LABELS[s.origem]}</span>
                </span>
                <span className="font-semibold">{formatArea(s.area_cm2)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-slate-600">Ainda sem superfícies.</p>
        )}
        {!done && (
          <div className="mt-6 border-t border-slate-100 pt-6">
            <SurfaceForm requestId={request.id} />
          </div>
        )}
      </section>

      <section className={card}>
        <h2 className="font-semibold">Fotografias</h2>
        {(photos ?? []).length > 0 && (
          <ul className="mt-4 grid gap-4 sm:grid-cols-3">
            {(photos ?? []).map((p) => (
              <li key={p.id} className="text-sm">
                <a href={`/app/fotos/${p.id}`} target="_blank" rel="noreferrer">
                  {/* eslint-disable-next-line @next/next/no-img-element -- link temporário assinado */}
                  <img src={`/app/fotos/${p.id}`} alt={p.legenda ?? 'Fotografia'} className="aspect-square w-full rounded-lg object-cover" />
                </a>
                <p className="mt-1">{p.legenda ?? (p.kind === 'geral' ? 'Geral' : 'Pormenor')}</p>
              </li>
            ))}
          </ul>
        )}
        {!done && (
          <div className="mt-6 border-t border-slate-100 pt-6">
            <PhotoUpload requestId={request.id} />
          </div>
        )}
      </section>

      {!done && (
        <section className={card}>
          <h2 className="font-semibold">Concluir</h2>
          <p className="mt-1 text-sm text-slate-600">
            Marque como concluído quando as superfícies e as fotografias estiverem registadas. O cliente passa a poder
            avaliar o seu trabalho.
          </p>
          <div className="mt-4">
            <ConcludeButton surveyId={survey.id} />
          </div>
        </section>
      )}
    </div>
  );
}
