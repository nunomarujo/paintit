import type { Forma } from '@/domain/volume';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { changeRequestStatus, deletePhoto, deleteSurface, updateRequest } from '@/app/app/pedidos/actions';
import { parsePreferences } from '@/domain/reference';
import { RequestForm } from '@/app/app/pedidos/RequestForm';
import { ListingPreview } from '@/components/ListingPreview';
import { localDate } from '@/domain/deadline';
import { estadoDaEntrega } from '@/domain/entrega';
import { PHOTO_REVIEW_LABELS } from '@/domain/photo';
import { AREA_SOURCE_LABELS, DESIRED_WORK_LABELS, SURFACE_KIND_LABELS, bloqueiosDaPublicacao, formatArea, type DesiredWork } from '@/domain/request';
import { percursoDoPedido } from '@/domain/percurso';
import { Percurso } from './Percurso';
import { CURRENT_RULES } from '@/domain/rules';
import { canManage, myRole } from '@/lib/access';
import { BRAND } from '@/config/brand';
import { qrCodeSvg } from '@/lib/qrcode';
import { escolhivel, loadReferences, preferredView } from '@/lib/reference';
import { getUser } from '@/lib/supabase/server';
import { PhotoUpload } from './PhotoUpload';
import { ProlongarPrazo } from './ProlongarPrazo';
import { PublishButton } from './PublishButton';
import { RequestInvites, type RequestInvite } from './RequestInvites';
import { SurveyAddenda } from '@/components/SurveyAddenda';
import { RequestSurveyCard, type SurveyInfo } from './RequestSurveyCard';
import { SurfaceForm } from './SurfaceForm';
import { Voltar } from '@/components/Voltar';

const STATUS: Record<string, { label: string; className: string }> = {
  rascunho: { label: 'Rascunho', className: 'bg-slate-100 text-slate-700' },
  publicado: { label: 'Publicado', className: 'bg-tinta-100 text-tinta-900' },
  encerrado: { label: 'Encerrado', className: 'bg-slate-100 text-slate-700' },
  cancelado: { label: 'Cancelado', className: 'bg-red-50 text-red-800' },
};

const card = 'rounded-2xl border border-slate-200 bg-white p-4 sm:p-5';
const smallButton = 'rounded-lg border border-slate-300 px-3 py-1.5 text-[17px] hover:bg-slate-50';

export default async function RequestPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, user } = await getUser();

  const { data: req } = await supabase.from('work_requests').select('*').eq('id', id).maybeSingle();
  if (!req) notFound();

  const [{ data: org }, { data: building }, { data: buildings }, { data: surfaces }, { data: photos }, { count: proposalCount }] =
    await Promise.all([
    supabase.from('organizations').select('id, nome, gerida_por').eq('id', req.org_id).single(),
    supabase.from('buildings').select('concelho, tipo, pisos, fachadas, tem_varandas, forma_implantacao').eq('id', req.building_id).single(),
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

  // As janelas por fachada vêm à parte, e de propósito.
  //
  // O código chega sempre à produção antes da migração: são dois lançamentos independentes e nenhum
  // espera pelo outro. Pedi estas quatro colunas dentro da consulta acima e, enquanto a migração não
  // correu, o PostgREST devolveu erro à consulta inteira — `building` nulo, `notFound()`, e todos os
  // pedidos a dar «Não encontrado», incluindo o que o cliente acabava de criar (28/10/2026).
  //
  // Uma coluna que só decide quantos vãos o desenho mostra não pode derrubar o ecrã. Fica numa
  // consulta própria, cujo fracasso só custa o número por omissão. Regra: ler coluna recém-nascida
  // à parte; falhar alto só onde o valor é preciso para gravar.
  const { data: janelas } = await supabase
    .from('buildings')
    .select('janelas_frente, janelas_esquerda, janelas_direita, janelas_tras')
    .eq('id', req.building_id)
    .maybeSingle();

  const manager = canManage(await myRole(supabase, user!.id, org));
  const draft = req.status === 'rascunho';
  const pt = (iso: string | null) => (iso ? iso.split('-').reverse().join('/') : '');
  // Quando é que as propostas chegam ao cliente. A porta verdadeira está na base de dados
  // (`propostas_entregues`); isto é só o que o ecrã diz, e conta os dias da mesma maneira.
  const entrega = estadoDaEntrega(req.prazo_propostas, localDate(new Date(), CURRENT_RULES.timeZone), req.status === 'publicado');
  // Antes da entrega o cliente não consegue contar as propostas (a regra de acesso esconde-as), e
  // precisa do número para decidir se prolonga. A função devolve só a contagem, nunca uma linha.
  const { data: aCaminho } = !entrega.entregues && req.status === 'publicado'
    ? await supabase.rpc('propostas_a_caminho', { p_request: id })
    : { data: null };
  const { data: surveyRow } = draft ? await supabase.from('request_surveys').select('*').eq('request_id', id).maybeSingle() : { data: null };
  let survey: SurveyInfo | null = null;
  if (surveyRow) {
    const [{ data: vendorRatingRow }, { data: ratedRow }] = await Promise.all([
      surveyRow.vendedor_user_id ? supabase.rpc('survey_vendor_rating', { p_user: surveyRow.vendedor_user_id }) : Promise.resolve({ data: null }),
      supabase.from('survey_reviews').select('id').eq('request_survey_id', surveyRow.id).maybeSingle(),
    ]);
    survey = {
      id: surveyRow.id,
      status: surveyRow.status,
      vendorRating: vendorRatingRow?.[0] ?? null,
      rated: !!ratedRow,
    };
  }
  // Adendas ao levantamento (migração 20261024034129): perguntas dos pintores e respostas dadas na obra.
  // Lido independentemente de o pedido estar em rascunho — ao contrário do cartão de ajuda acima, isto
  // interessa sobretudo depois de publicado, que é quando os pintores perguntam. Vem vazio enquanto essa
  // migração não estiver aplicada.
  const { data: surveyForAddenda } = await supabase.from('request_surveys').select('id').eq('request_id', id).maybeSingle();
  const { data: adendas } = surveyForAddenda ? await supabase.rpc('survey_addenda', { p_request_survey_id: surveyForAddenda.id }) : { data: null };

  const { data: rawInvites } = req.status === 'publicado' ? await supabase.from('request_invites').select('*').eq('request_id', id).order('created_at', { ascending: false }) : { data: [] };
  const invitePainterIds = [...new Set((rawInvites ?? []).map((i) => i.painter_org_id).filter((x): x is string => !!x))];
  const { data: invitePainters } = invitePainterIds.length ? await supabase.from('organizations').select('id, nome').in('id', invitePainterIds) : { data: [] };
  const invitePainterName = new Map((invitePainters ?? []).map((p) => [p.id, p.nome]));
  const invites: RequestInvite[] = (rawInvites ?? []).map((i) => ({
    id: i.id,
    qrSvg: i.active ? qrCodeSvg(`${BRAND.url}/convite/${i.code}`) : null,
    code: i.code,
    nota: i.nota,
    active: i.active,
    estado: !i.active ? 'desativado' : i.painter_org_id ? 'associado' : 'disponivel',
    painterNome: i.painter_org_id ? invitePainterName.get(i.painter_org_id) ?? null : null,
  }));
  const list = surfaces ?? [];
  const total = list.reduce((n, s) => n + s.area_cm2, 0);
  const blockers = bloqueiosDaPublicacao({
    descricao: req.descricao,
    otherTexts: [req.cor_acabamento ?? '', ...list.map((s) => s.descricao ?? '')],
    prazoPropostas: req.prazo_propostas,
    surfacesArea: list.map((s) => s.area_cm2),
    today: localDate(new Date(), CURRENT_RULES.timeZone),
  });
  const status = STATUS[req.status]!;
  // Em que ponto está isto, e de quem é a vez. É a primeira pergunta de quem abre a página, e a
  // que ela não respondia: mostrava campos e bloqueios, e deixava o cliente a adivinhar.
  const percurso = percursoDoPedido({
    estadoDoPedido: req.status,
    levantamento: surveyRow ? { status: surveyRow.status, marcadoPara: surveyRow.scheduled_at } : null,
    bloqueiosDaPublicacao: blockers.length,
  });
  const tecnicoDoCliente = percurso.tecnicoPertenceAoCliente;

  return (
    <div className="space-y-8">
      <div>
        <Voltar href={`/app/organizacoes/${org.id}`}>{org.nome}</Voltar>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <h1 className="text-[26px] leading-tight font-semibold">{req.titulo}</h1>
          <span className={`rounded-full px-3 py-0.5 text-[15px] font-semibold ${status.className}`}>{status.label}</span>
          {req.version > 1 && <span className="text-[15px] text-slate-500">versão {req.version}</span>}
        </div>
        <p className="mt-1 text-[17px] text-slate-600">
          Referência pública: {req.ref} ·{' '}
          <Link href={`/app/pedidos/${req.id}/dossie`} className="text-tinta-700 hover:underline">
            Dossiê para imprimir
          </Link>
        </p>
      </div>

      {draft && (suspensions ?? []).length > 0 && (
        // Regra 13 do CLAUDE.md: resolve-se corrigindo e publicando de novo — não é "já fechou,
        // caducou ou foi recusado", por isso âmbar, não vermelho (27/10/2026).
        <section className="rounded-2xl border border-amber-300 bg-amber-50 p-6 text-[17px]">
          <h2 className="font-semibold text-amber-900">O anúncio foi suspenso pela equipa da plataforma</h2>
          <p className="mt-1">{suspensions![0]!.resolucao}</p>
          <p className="mt-1 text-amber-900">Corrija o pedido e publique de novo: os pintores veem a nova versão.</p>
        </section>
      )}

      <Percurso estado={percurso} marcadoPara={surveyRow?.scheduled_at ?? null} houveLevantamento={!!surveyRow} />

      {req.status !== 'rascunho' && (
        <section className={`${card} flex flex-wrap items-center justify-between gap-3`}>
          {entrega.entregues ? (
            <p className="text-[17px]">
              <span className="font-semibold">{proposalCount ?? 0}</span>{' '}
              {proposalCount === 1 ? 'proposta recebida' : 'propostas recebidas'}
              {entrega.emEsclarecimentos && entrega.esclarecimentosAte && (
                <span className="text-slate-600"> · pode perguntar o que quiser até {pt(entrega.esclarecimentosAte)}</span>
              )}
            </p>
          ) : (
            /* Antes do prazo não se diz "0 propostas": não é verdade, é que ainda não abriram. */
            <p className="text-[17px]">
              <span className="font-semibold">As propostas abrem a {pt(entrega.abremEm)}</span>
              <span className="text-slate-600">
                {' '}
                · {aCaminho ?? 0} a caminho · chegam todas ao mesmo tempo, para ninguém ficar com o preço à vista antes
                dos outros
              </span>
            </p>
          )}
          {entrega.entregues && (
            <Link
              href={`/app/pedidos/${req.id}/propostas`}
              className="rounded-lg bg-tinta-600 px-4 py-2 text-[17px] font-semibold text-white hover:bg-tinta-700"
            >
              Comparar propostas e mensagens
            </Link>
          )}
        </section>
      )}

      {manager && req.status === 'publicado' && (
        <section className={`${card} flex flex-wrap items-center justify-between gap-3`}>
          <p className="text-[17px] text-slate-600">
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

      {manager &&
        req.status === 'publicado' &&
        !entrega.entregues &&
        entrega.faltamDias !== null &&
        entrega.faltamDias <= 3 &&
        (aCaminho ?? 0) <= 1 &&
        req.prazo_propostas && (
          <ProlongarPrazo requestId={req.id} prazo={req.prazo_propostas} quantas={aCaminho ?? 0} />
        )}

      {manager && req.status === 'publicado' && <RequestInvites requestId={req.id} invites={invites} />}

      <section className={card}>
        <h2 className="font-semibold">Dados do pedido</h2>
        <div className="mt-4">
          <RequestForm
            action={updateRequest.bind(null, req.id)}
            buildings={buildings ?? []}
            initial={{ ...req, produtos_preferidos: parsePreferences(req.produtos_preferidos) }}
            disabled={!manager || !draft}
            references={(await loadReferences(supabase)).map(escolhivel)}
          />
        </div>
      </section>

      {manager && draft && <RequestSurveyCard requestId={req.id} survey={survey} />}

      {(adendas ?? []).length > 0 && (
        <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
          <SurveyAddenda addenda={adendas!} />
        </section>
      )}

      <section className={card}>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-semibold">{tecnicoDoCliente ? 'Superfícies e áreas' : 'Levantamento da obra'}</h2>
          {/* Zero é um valor; não haver medição é outro estado, e escrever «0 m²» diz a coisa
              errada (promotor, 29/10/2026). */}
          <span className="text-[17px] text-slate-600">
            {list.length === 0 ? 'Área por levantar' : `Total: ${formatArea(total)}`}
          </span>
        </div>
        {!tecnicoDoCliente && (
          <p className="mt-1 text-[17px] text-slate-600">
            Será preenchido pelo profissional que fizer a visita. Pode consultar e acrescentar o que souber, mas não
            precisa de indicar medidas nenhumas.
          </p>
        )}
        {list.length > 0 ? (
          <ul className="mt-4 divide-y divide-slate-100 text-[17px]">
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
                  {s.trabalhos && s.trabalhos.length > 0 && (
                    <span className="block text-slate-600">
                      Nesta zona: {s.trabalhos.map((t) => DESIRED_WORK_LABELS[t as DesiredWork] ?? t).join(', ')}
                    </span>
                  )}
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
          <p className="mt-3 text-[17px] text-slate-600">Ainda sem superfícies.</p>
        )}
        {manager && draft && (
          <div className="mt-6 border-t border-slate-100 pt-6">
            <SurfaceForm requestId={req.id} modo={req.trabalhos_modo as 'iguais' | 'diferencas' | 'nao_sei'} />
          </div>
        )}
      </section>

      <section className={card}>
        <h2 className="font-semibold">Fotografias</h2>
        <p className="mt-1 text-[17px] text-slate-600">
          As fotografias gerais ficam só convosco e com a equipa da plataforma. As de pormenor (uma fissura, um teto de
          varanda) podem ir para o anúncio, mas só depois de a equipa confirmar que não deixam reconhecer o prédio. A
          localização e os dados do aparelho são retirados de todas.
        </p>
        {(photos ?? []).length > 0 && (
          <ul className="mt-4 grid gap-4 sm:grid-cols-3">
            {(photos ?? []).map((p) => (
              <li key={p.id} className="text-[17px]">
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
          <p className="text-[17px] text-slate-600">
            Sem morada, sem nomes e sem o nome interno do pedido. A identificação só é revelada depois da escolha.
          </p>
        </div>
        <ListingPreview
          l={{
            ref: req.ref,
            tipoObra: req.tipo_obra,
            tiposObra: req.tipos_obra,
            datasFlexiveis: req.datas_flexiveis,
            concelho: building.concelho,
            tipoImovel: building.tipo,
            pisos: building.pisos,
            fachadas: building.fachadas,
            temVarandas: building.tem_varandas,
            forma: (building.forma_implantacao as Forma | null) ?? null,
            janelas: {
              frente: janelas?.janelas_frente ?? null,
              esquerda: janelas?.janelas_esquerda ?? null,
              direita: janelas?.janelas_direita ?? null,
              tras: janelas?.janelas_tras ?? null,
            },
            descricao: req.descricao,
            trabalhos: req.trabalhos,
            corAcabamento: req.cor_acabamento,
            prazoPropostas: req.prazo_propostas,
            execucaoDesde: req.execucao_desde,
            execucaoAte: req.execucao_ate,
            surfaces: list.map((s) => ({ id: s.id, kind: s.kind, descricao: s.descricao, area: s.area_cm2, trabalhos: s.trabalhos })),
            trabalhosModo: req.trabalhos_modo as 'iguais' | 'diferencas' | 'nao_sei',
            ocupacaoViaPublica: req.ocupacao_via_publica,
            preferidos: await preferredView(supabase, req.produtos_preferidos),
            photos: (photos ?? []).filter((p) => p.revisao === 'aprovada').map((p) => ({ id: p.id, legenda: p.legenda })),
          }}
        />
        {manager && draft && <PublishButton requestId={req.id} blockers={blockers} aguardaLevantamento={!tecnicoDoCliente} />}
      </section>
    </div>
  );
}
