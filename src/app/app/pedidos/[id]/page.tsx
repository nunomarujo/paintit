import Link from 'next/link';
import { notFound } from 'next/navigation';
import { changeRequestStatus, deletePhoto, deleteSurface, updateRequest } from '@/app/app/pedidos/actions';
import { RequestForm } from '@/app/app/pedidos/RequestForm';
import { ListingPreview } from '@/components/ListingPreview';
import { localDate } from '@/domain/deadline';
import { PHOTO_REVIEW_LABELS } from '@/domain/photo';
import { AREA_SOURCE_LABELS, SURFACE_KIND_LABELS, formatArea, publishBlockers } from '@/domain/request';
import { CURRENT_RULES } from '@/domain/rules';
import { canManage, myRole } from '@/lib/access';
import { getUser } from '@/lib/supabase/server';
import { PhotoUpload } from './PhotoUpload';
import { PublishButton } from './PublishButton';
import { SurfaceForm } from './SurfaceForm';

const STATUS: Record<string, { label: string; className: string }> = {
  rascunho: { label: 'Rascunho', className: 'bg-slate-100 text-slate-700' },
  publicado: { label: 'Publicado', className: 'bg-tinta-100 text-tinta-900' },
  encerrado: { label: 'Encerrado', className: 'bg-slate-100 text-slate-700' },
  cancelado: { label: 'Cancelado', className: 'bg-red-50 text-red-800' },
};

const card = 'rounded-2xl border border-slate-200 bg-white p-6';
const smallButton = 'rounded-lg border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50';

export default async function RequestPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, user } = await getUser();

  const { data: req } = await supabase.from('work_requests').select('*').eq('id', id).maybeSingle();
  if (!req) notFound();

  const [{ data: org }, { data: building }, { data: buildings }, { data: surfaces }, { data: photos }, { count: proposalCount }] =
    await Promise.all([
    supabase.from('organizations').select('id, nome, gerida_por').eq('id', req.org_id).single(),
    supabase.from('buildings').select('concelho, tipo, pisos, fachadas, tem_varandas').eq('id', req.building_id).single(),
    supabase.from('buildings').select('id, nome_interno').eq('org_id', req.org_id).order('nome_interno'),
    supabase.from('request_surfaces').select('*').eq('request_id', id).order('created_at'),
    supabase.from('request_photos').select('id, kind, legenda, revisao, notas_revisao').eq('request_id', id).order('created_at'),
    supabase.from('proposals').select('id', { count: 'exact', head: true }).eq('request_id', id).neq('status', 'rascunho'),
  ]);
  const { data: suspensions } = await supabase
    .from('listing_reports')
    .select('id, resolucao, resolved_at')
    .eq('request_id', id)
    .eq('status', 'suspenso')
    .order('resolved_at', { ascending: false });
  if (!org || !building) notFound();

  const manager = canManage(await myRole(supabase, user!.id, org));
  const draft = req.status === 'rascunho';
  const list = surfaces ?? [];
  const total = list.reduce((n, s) => n + s.area_cm2, 0);
  const blockers = publishBlockers({
    descricao: req.descricao,
    otherTexts: [req.cor_acabamento ?? '', ...list.map((s) => s.descricao ?? '')],
    prazoPropostas: req.prazo_propostas,
    surfacesArea: list.map((s) => s.area_cm2),
    today: localDate(new Date(), CURRENT_RULES.timeZone),
  });
  const status = STATUS[req.status]!;

  return (
    <div className="space-y-8">
      <div>
        <Link href={`/app/organizacoes/${org.id}`} className="text-sm text-slate-600 hover:underline">
          ← {org.nome}
        </Link>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold">{req.titulo}</h1>
          <span className={`rounded-full px-3 py-0.5 text-xs font-semibold ${status.className}`}>{status.label}</span>
          {req.version > 1 && <span className="text-xs text-slate-500">versão {req.version}</span>}
        </div>
        <p className="mt-1 text-sm text-slate-600">
          Referência pública: {req.ref} ·{' '}
          <Link href={`/app/pedidos/${req.id}/dossie`} className="text-tinta-700 hover:underline">
            Dossiê para imprimir
          </Link>
        </p>
      </div>

      {draft && (suspensions ?? []).length > 0 && (
        <section className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm">
          <h2 className="font-semibold text-red-900">O anúncio foi suspenso pela equipa da plataforma</h2>
          <p className="mt-1">{suspensions![0]!.resolucao}</p>
          <p className="mt-1 text-red-900">Corrija o pedido e publique de novo: os pintores veem a nova versão.</p>
        </section>
      )}

      {req.status !== 'rascunho' && (
        <section className={`${card} flex flex-wrap items-center justify-between gap-3`}>
          <p className="text-sm">
            <span className="font-semibold">{proposalCount ?? 0}</span>{' '}
            {proposalCount === 1 ? 'proposta recebida' : 'propostas recebidas'}
          </p>
          <Link
            href={`/app/pedidos/${req.id}/propostas`}
            className="rounded-lg bg-tinta-600 px-4 py-2 text-sm font-semibold text-white hover:bg-tinta-700"
          >
            Comparar propostas e mensagens
          </Link>
        </section>
      )}

      {manager && req.status === 'publicado' && (
        <section className={`${card} flex flex-wrap items-center justify-between gap-3`}>
          <p className="text-sm text-slate-600">
            Publicado. Para alterar o pedido, volte a rascunho: o anúncio sai do ar e uma nova versão é publicada depois.
          </p>
          <div className="flex gap-2">
            <form action={changeRequestStatus.bind(null, req.id, 'rascunho')}>
              <button type="submit" className={smallButton}>
                Voltar a rascunho
              </button>
            </form>
            <form action={changeRequestStatus.bind(null, req.id, 'encerrado')}>
              <button type="submit" className={smallButton}>
                Encerrar propostas
              </button>
            </form>
          </div>
        </section>
      )}

      <section className={card}>
        <h2 className="font-semibold">Dados do pedido</h2>
        <div className="mt-4">
          <RequestForm
            action={updateRequest.bind(null, req.id)}
            buildings={buildings ?? []}
            initial={req}
            disabled={!manager || !draft}
          />
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
                  <span className="block text-slate-500">
                    {s.area_direta_cm2 !== null
                      ? `${formatArea(s.area_direta_cm2)} indicados`
                      : `${(s.largura_cm! / 100).toLocaleString('pt-PT')} m × ${(s.altura_cm! / 100).toLocaleString('pt-PT')} m${
                          s.vaos_cm2 ? ` − ${formatArea(s.vaos_cm2)} de vãos` : ''
                        }`}
                    {s.quantidade > 1 ? ` × ${s.quantidade}` : ''} · {AREA_SOURCE_LABELS[s.origem]}
                  </span>
                </span>
                <span className="flex items-center gap-3">
                  <span className="font-semibold">{formatArea(s.area_cm2)}</span>
                  {manager && draft && (
                    <form action={deleteSurface.bind(null, req.id, s.id)}>
                      <button type="submit" className="text-red-700 hover:underline">
                        Remover
                      </button>
                    </form>
                  )}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-slate-600">Ainda sem superfícies.</p>
        )}
        {manager && draft && (
          <div className="mt-6 border-t border-slate-100 pt-6">
            <SurfaceForm requestId={req.id} />
          </div>
        )}
      </section>

      <section className={card}>
        <h2 className="font-semibold">Fotografias</h2>
        <p className="mt-1 text-sm text-slate-600">
          As fotografias gerais ficam só convosco e com a equipa da plataforma. As de pormenor (uma fissura, um teto de
          varanda) podem ir para o anúncio, mas só depois de a equipa confirmar que não deixam reconhecer o prédio. A
          localização e os dados do aparelho são retirados de todas.
        </p>
        {(photos ?? []).length > 0 && (
          <ul className="mt-4 grid gap-4 sm:grid-cols-3">
            {(photos ?? []).map((p) => (
              <li key={p.id} className="text-sm">
                <a href={`/app/fotos/${p.id}`} target="_blank" rel="noreferrer">
                  {/* eslint-disable-next-line @next/next/no-img-element -- link temporário assinado */}
                  <img src={`/app/fotos/${p.id}`} alt={p.legenda ?? 'Fotografia'} className="aspect-square w-full rounded-lg object-cover" />
                </a>
                <p className="mt-1">{p.legenda ?? (p.kind === 'geral' ? 'Geral' : 'Pormenor')}</p>
                <p className="text-slate-500">
                  {p.kind === 'geral' ? 'Privada' : PHOTO_REVIEW_LABELS[p.revisao ?? 'pendente']}
                  {p.revisao === 'rejeitada' && p.notas_revisao ? `: ${p.notas_revisao}` : ''}
                </p>
                {manager && draft && (
                  <form action={deletePhoto.bind(null, req.id, p.id)}>
                    <button type="submit" className="text-red-700 hover:underline">
                      Remover
                    </button>
                  </form>
                )}
              </li>
            ))}
          </ul>
        )}
        {manager && draft && (
          <div className="mt-6 border-t border-slate-100 pt-6">
            <PhotoUpload requestId={req.id} />
          </div>
        )}
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="font-semibold">O que os pintores vão ver</h2>
          <p className="text-sm text-slate-600">
            Sem morada, sem nomes e sem o nome interno do pedido. A identificação só é revelada depois da escolha.
          </p>
        </div>
        <ListingPreview
          l={{
            ref: req.ref,
            tipoObra: req.tipo_obra,
            concelho: building.concelho,
            tipoImovel: building.tipo,
            pisos: building.pisos,
            fachadas: building.fachadas,
            temVarandas: building.tem_varandas,
            descricao: req.descricao,
            trabalhos: req.trabalhos,
            corAcabamento: req.cor_acabamento,
            prazoPropostas: req.prazo_propostas,
            execucaoDesde: req.execucao_desde,
            execucaoAte: req.execucao_ate,
            surfaces: list.map((s) => ({ kind: s.kind, descricao: s.descricao, area: s.area_cm2 })),
            photos: (photos ?? []).filter((p) => p.revisao === 'aprovada').map((p) => ({ id: p.id, legenda: p.legenda })),
          }}
        />
        {manager && draft && <PublishButton requestId={req.id} blockers={blockers} />}
      </section>
    </div>
  );
}
