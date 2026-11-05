import type { Forma } from '@/domain/volume';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { changeRequestStatus, updateRequest } from '@/app/app/pedidos/actions';
import { parsePreferences } from '@/domain/reference';
import { RequestForm } from '@/app/app/pedidos/RequestForm';
import { ListingPreview } from '@/components/ListingPreview';
import { localDate } from '@/domain/deadline';
import { estadoDaEntrega } from '@/domain/entrega';
import {
  DESIRED_WORK_LABELS,
  SURFACE_KIND_LABELS,
  bloqueiosDaPublicacao,
  formatArea,
  resumoDasZonas,
  type DesiredWork,
  type WorksMode,
} from '@/domain/request';
import { percursoDoPedido } from '@/domain/percurso';
import { paraZona } from '@/lib/requests';
import { Percurso } from './Percurso';
import { CaixaDaSeccao, PedidoEmSeccoes } from './PedidoEmSeccoes';
import { ConfirmarVisita } from './ConfirmarVisita';
import { horaExata } from '@/domain/contagem';
import { RevisaoEPublicacao } from './RevisaoEPublicacao';
import { estadosDasSeccoes, primeiraPendencia } from '@/domain/seccoes';
import { CURRENT_RULES } from '@/domain/rules';
import { canManage, myRole } from '@/lib/access';
import { BRAND } from '@/config/brand';
import { qrCodeSvg } from '@/lib/qrcode';
import { escolhivel, loadReferences, preferredView } from '@/lib/reference';
import { getUser } from '@/lib/supabase/server';
import { Fotografias } from './Fotografias';
import { ProlongarPrazo } from './ProlongarPrazo';
import { PublishButton } from './PublishButton';
import { RequestInvites, type RequestInvite } from './RequestInvites';
import { SurveyAddenda } from '@/components/SurveyAddenda';
import { RequestSurveyCard, type SurveyInfo } from './RequestSurveyCard';
import { ZonasComVolume } from './ZonasComVolume';
import { Voltar } from '@/components/Voltar';
import { aMinhaEspera } from '@/lib/contratosAMinhaEspera';
import { Dica } from '@/components/Dica';
import { ZonasRecolhiveis } from './ZonasRecolhiveis';
import { AcaoComConsequencia, Acompanhamento } from './Acompanhamento';

const STATUS: Record<string, { label: string; className: string }> = {
  rascunho: { label: 'Rascunho', className: 'bg-slate-100 text-slate-700' },
  publicado: { label: 'Publicado', className: 'bg-tinta-100 text-tinta-900' },
  encerrado: { label: 'Encerrado', className: 'bg-slate-100 text-slate-700' },
  cancelado: { label: 'Cancelado', className: 'bg-red-50 text-red-800' },
};

const card = 'rounded-2xl border border-slate-200 bg-white p-4 sm:p-5';

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
    supabase.from('request_photos').select('*').eq('request_id', id).order('created_at'),
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

  // As medidas do prédio, pela mesma razão e com o mesmo cuidado das janelas: a migração
  // `medidas_do_predio` é de 30/10/2026 e pode ainda não ter corrido. Sem elas, o volume fica em
  // proporções genéricas e os campos não aparecem — não se oferece um formulário que não grava.
  const { data: medidas } = await supabase
    .from('buildings')
    .select('largura_cm, profundidade_cm, pe_direito_cm, medidas_origem')
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
  // O agendamento à espera da confirmação da cliente (migração 20261101000000). A função devolve só o que
  // lhe diz respeito: nada identifica o avaliador, e as notas internas do contacto não vêm (regra 6).
  const { data: agendamentos } = manager ? await supabase.rpc('survey_schedule_for_client', { p_request: id }) : { data: null };
  const agendamento = agendamentos?.[0] ?? null;

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
  // O total é só das zonas incluídas: uma zona excluída foi considerada e deixada de fora, e somá-la
  // dava ao pedido uma área que ninguém vai pintar (promotor, 30/10/2026).
  const zonas = list.map(paraZona);
  const resumo = resumoDasZonas(zonas);
  const total = resumo.areaIncluidaCm2;
  const blockers = bloqueiosDaPublicacao({
    descricao: req.descricao,
    otherTexts: [req.cor_acabamento ?? '', ...list.map((s) => s.descricao ?? '')],
    prazoPropostas: req.prazo_propostas,
    zonas,
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
  const estadosSeccoes = estadosDasSeccoes({
    descricao: req.descricao,
    trabalhos: req.trabalhos ?? [],
    zonas: { total: list.length, prontas: resumo.incluidas, pendentes: resumo.porDecidir + resumo.semQuantidade },
    fotografias: (photos ?? []).length,
    prazoPropostas: req.prazo_propostas,
    bloqueios: blockers,
  });


  // A galeria associa fotografias a zonas. A coluna `zona_id` entrou a 30/10/2026 (migração
  // `fotografias_por_zona`) e, enquanto não estiver aplicada num ambiente, pedi-la devolve erro —
  // por isso pergunta-se primeiro. Sem a coluna, a galeria aparece sem zonas, em vez de rebentar na
  // gravação. Esta pergunta sai daqui quando a migração estiver aplicada em todos os ambientes.
  const { error: faltaZonaNasFotos } = await supabase
    .from('request_photos')
    .select('zona_id', { head: true, count: 'exact' })
    .eq('request_id', id)
    .limit(1);
  const fotosPorZona = !faltaZonaNasFotos;

  // O que os pintores vão ver: é a pré-visualização do anúncio, e é também o que fica debaixo da
  // lista do que falta para publicar. Fica numa variável porque serve nos dois sítios.
  const oQueOsPintoresVeem = (
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
    {manager && draft && (
      <div id="publicar" className="scroll-mt-6">
        <PublishButton requestId={req.id} blockers={blockers} aguardaLevantamento={!tecnicoDoCliente} />
      </div>
    )}
  </section>
  );

  const slots = {
    resumo: (
      <div className="space-y-5">
        <div className={card}>
          <dl className="grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-[15px] text-slate-600">O que pretende</dt>
              <dd className="text-[17px]">
                {(req.trabalhos ?? []).length > 0
                  ? (req.trabalhos as DesiredWork[]).map((t) => DESIRED_WORK_LABELS[t]).join(' · ')
                  : 'Por dizer'}
              </dd>
            </div>
            <div>
              <dt className="text-[15px] text-slate-600">Zonas e medidas</dt>
              <dd className="text-[17px]">
                {list.length === 0
                  ? 'Por levantar'
                  : `${list.length} ${list.length === 1 ? 'zona' : 'zonas'} · ${formatArea(total)}`}
              </dd>
            </div>
            <div>
              <dt className="text-[15px] text-slate-600">Fotografias</dt>
              <dd className="text-[17px]">
                {(photos ?? []).length === 0 ? 'Nenhuma' : `${(photos ?? []).length}`}
              </dd>
            </div>
            <div>
              <dt className="text-[15px] text-slate-600">Aceita propostas até</dt>
              <dd className="text-[17px]">{req.prazo_propostas ? pt(req.prazo_propostas) : 'Por decidir'}</dd>
            </div>
          </dl>
          <p className="mt-4 max-w-[54ch] text-[17px] text-slate-700">
            {req.descricao?.trim() || 'Ainda sem descrição do trabalho.'}
          </p>
        </div>

      {/* Respondida a confirmação, o agendamento fica à mão — o email não é prova de nada, a resposta é. */}
      {agendamento && !agendamento.por_responder && agendamento.agendado_para && (
        <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
          <h2 className="font-semibold">Visita ao prédio</h2>
          <p className="mt-1 text-[17px] text-slate-700">
            {agendamento.resposta_cliente === 'nao_contactado'
              ? 'Indicou não ter sido contactada. A plataforma está a analisar o caso.'
              : `Marcada para ${horaExata(new Date(agendamento.agendado_para))}.`}
          </p>
          {agendamento.resposta_cliente_em && (
            <p className="mt-1 text-[15px] text-slate-600">
              Respondeu a {horaExata(new Date(agendamento.resposta_cliente_em))}.
            </p>
          )}
        </section>
      )}

      {(adendas ?? []).length > 0 && (
        <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
          <SurveyAddenda addenda={adendas!} />
        </section>
      )}
      </div>
    ),
    zonas: (
      <div id="levantamento-da-obra" className="scroll-mt-6">
        {/* Zero é um valor; não haver medição é outro estado, e escrever «0 m²» diz a coisa
            errada (promotor, 29/10/2026). */}
        <p className="text-[15px] text-slate-600">
          {!tecnicoDoCliente
            ? 'O avaliador regista as zonas e as medidas durante a visita.'
            : list.length === 0
              ? 'Área por levantar.'
              : `Total: ${formatArea(total)}`}
          {!tecnicoDoCliente && list.length > 0 && ` Até agora: ${formatArea(total)}.`}
        </p>
        {(resumo.excluidas > 0 || resumo.porConfirmar > 0 || resumo.semQuantidade > 0) && (
          <p className="mt-1 text-[17px] text-slate-600">
            {[
              resumo.semQuantidade > 0
                ? `${resumo.semQuantidade} ${resumo.semQuantidade === 1 ? 'zona' : 'zonas'} por levantar`
                : '',
              resumo.porConfirmar > 0
                ? `${resumo.porConfirmar} ${resumo.porConfirmar === 1 ? 'quantidade' : 'quantidades'} por confirmar`
                : '',
              resumo.excluidas > 0
                ? `${resumo.excluidas} ${resumo.excluidas === 1 ? 'zona deixada' : 'zonas deixadas'} de fora, e por isso fora do total`
                : '',
            ]
              .filter(Boolean)
              .join(' · ')}
            .
          </p>
        )}
        {/* Com visita pedida, os campos de medição ficam recolhidos: a página acompanha a escolha
            do cliente em vez de o pôr a medir (promotor, 01/11/2026). */}
        <ZonasRecolhiveis recolhido={!tecnicoDoCliente}>
          <ZonasComVolume
            requestId={req.id}
            predio={{
              buildingId: req.building_id,
              pisos: building.pisos,
              fachadas: building.fachadas,
              temVarandas: !!building.tem_varandas,
              moradia: building.tipo === 'moradia',
              forma: (building.forma_implantacao as Forma | null) ?? null,
              janelas: {
                frente: janelas?.janelas_frente ?? null,
                esquerda: janelas?.janelas_esquerda ?? null,
                direita: janelas?.janelas_direita ?? null,
                tras: janelas?.janelas_tras ?? null,
              },
              medidas: {
                larguraM: medidas?.largura_cm ? medidas.largura_cm / 100 : null,
                profundidadeM: medidas?.profundidade_cm ? medidas.profundidade_cm / 100 : null,
                peDireitoM: medidas?.pe_direito_cm ? medidas.pe_direito_cm / 100 : null,
                origem: medidas?.medidas_origem ?? 'estimativa',
              },
              podeMedir: !!medidas,
            }}
            zonas={list.map((s) => ({
              id: s.id,
              kind: s.kind,
              descricao: s.descricao,
              areaCm2: s.area_cm2,
              areaDiretaCm2: s.area_direta_cm2,
              larguraCm: s.largura_cm,
              alturaCm: s.altura_cm,
              vaosCm2: s.vaos_cm2,
              quantidade: s.quantidade,
              participacao: paraZona(s).participacao,
              origemDaQuantidade: paraZona(s).origemDaQuantidade,
              confirmacao: paraZona(s).confirmacao,
              trabalhos: s.trabalhos,
            }))}
            modo={req.trabalhos_modo as WorksMode}
            podeEditar={!!manager && draft}
            doCliente={tecnicoDoCliente}
          />
        </ZonasRecolhiveis>
      </div>
    ),
    fotografias: (
      <div>
        {/* Uma linha; o resto (quais vão ao anúncio, a remoção dos dados do aparelho) vai na
            dica, para não gastar altura (promotor, 01/11/2026). */}
        <p className="flex items-center gap-2 text-[15px] text-slate-600">
          Opcionais. Ajudam o avaliador a perceber o estado atual.
          <Dica rotulo="Quem vê as fotografias">
            Só as imagens que aprovar para divulgação são mostradas aos pintores; as gerais ficam privadas. A localização e os
            dados do aparelho são retirados de todas.
          </Dica>
        </p>
        <div className="mt-4">
          <Fotografias
            requestId={req.id}
            fotografias={(photos ?? []).map((f) => ({
              id: f.id,
              kind: f.kind,
              legenda: f.legenda,
              revisao: f.revisao,
              notas_revisao: f.notas_revisao,
              zonaId: f.zona_id ?? null,
            }))}
            zonas={list.map((s) => ({
              id: s.id,
              nome: s.descricao?.trim() || SURFACE_KIND_LABELS[s.kind],
            }))}
            podeEditar={!!manager && draft}
            porZona={fotosPorZona}
          />
        </div>
      </div>
    ),
    publicar:
      manager && draft ? (
        <RevisaoEPublicacao
          bloqueios={blockers}
          aguardaLevantamento={!tecnicoDoCliente}
          publicar={oQueOsPintoresVeem}
        />
      ) : (
        oQueOsPintoresVeem
      ),
  };

  // ── Pedido publicado (ou encerrado): página de acompanhamento, não de preparação ────────────
  // Canvas «Espaço do cliente» (01/11/2026): cabeçalho operacional com as datas nomeadas, duas ações
  // com a consequência explicada antes de confirmar, e separadores só com o que interessa a uma obra
  // já publicada. O conteúdo é o mesmo dos `slots`; a organização é outra.
  if (!draft) {
    const voltarARascunho = changeRequestStatus.bind(null, req.id, 'rascunho');
    const encerrar = changeRequestStatus.bind(null, req.id, 'encerrado');
    const dataLonga = (iso: string | null) =>
      iso ? new Date(`${iso}T12:00:00`).toLocaleDateString('pt-PT', { day: 'numeric', month: 'short' }) : '—';
    // Rasto de avisos do contrato (05/11/2026): escolhida a proposta, o passo seguinte (pagar a caução,
    // assinar) vive na contratação — e é daqui, da obra, que o cliente costuma vir.
    const contratoAEspera = (await aMinhaEspera(user!.id)).find((c) => c.requestId === req.id && c.lado === 'cliente');
    return (
      <div className="space-y-6">
        <Voltar href="/app/pedidos">As minhas obras</Voltar>

        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="flex flex-wrap items-center gap-2 text-[13px] text-slate-500">
              <span className={`rounded-full px-2.5 py-0.5 text-[13px] font-semibold ${status.className}`}>
                {req.status === 'publicado' ? (entrega.entregues ? 'Propostas abertas' : 'A receber propostas') : status.label}
              </span>
              <span>
                Ref. {req.ref} · {building.concelho}
                {req.version > 1 && ` · versão ${req.version}`}
              </span>
            </p>
            <h1 className="mt-2 text-[26px] leading-tight font-semibold">{req.titulo}</h1>
            <dl className="mt-3 flex flex-wrap gap-x-7 gap-y-2">
              {entrega.entregues ? (
                <>
                  <div>
                    <dt className="text-[13px] font-semibold text-slate-500">Recebidas</dt>
                    <dd className="text-[17px] font-bold">{proposalCount ?? 0} {proposalCount === 1 ? 'proposta' : 'propostas'}</dd>
                  </div>
                  {entrega.emEsclarecimentos && entrega.esclarecimentosAte && (
                    <div>
                      <dt className="text-[13px] font-semibold text-slate-500">Pode perguntar até</dt>
                      <dd className="text-[17px] font-bold">{dataLonga(entrega.esclarecimentosAte)}</dd>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div>
                    <dt className="text-[13px] font-semibold text-slate-500">Propostas até</dt>
                    <dd className="text-[17px] font-bold">{dataLonga(req.prazo_propostas)}, 23h59</dd>
                  </div>
                  <div>
                    <dt className="text-[13px] font-semibold text-slate-500">Abrem para comparar</dt>
                    <dd className="text-[17px] font-bold">{dataLonga(entrega.abremEm)}</dd>
                  </div>
                  <div>
                    <dt className="text-[13px] font-semibold text-slate-500">A caminho</dt>
                    <dd className="text-[17px] font-bold">{aCaminho ?? 0} {aCaminho === 1 ? 'proposta' : 'propostas'}</dd>
                  </div>
                </>
              )}
            </dl>
          </div>
          {manager && req.status === 'publicado' && (
            <div className="flex flex-wrap gap-2">
              <AcaoComConsequencia
                action={voltarARascunho}
                titulo="Editar o pedido?"
                texto="O anúncio sai do ar e os pintores deixam de o ver até o publicar de novo. Quem já começou a orçamentar vê a versão nova quando republicar."
                confirmar="Editar o pedido"
                className="btn-secondary"
              >
                Editar pedido
              </AcaoComConsequencia>
              {entrega.entregues && (
                <Link href={`/app/pedidos/${req.id}/propostas`} className="btn-primary">
                  Comparar propostas
                </Link>
              )}
            </div>
          )}
        </div>

        {contratoAEspera && (
          <section className="rounded-2xl bg-tinta-900 p-5 text-white sm:p-6">
            <p className="text-[13px] font-semibold text-lima">Precisa de si</p>
            <h2 className="mt-1 text-[20px] font-semibold leading-snug">{contratoAEspera.passo.titulo}</h2>
            <p className="mt-1 max-w-[54ch] text-[15px] text-tinta-200">
              {contratoAEspera.passo.texto}
              {contratoAEspera.passo.ate ? ` Até ${contratoAEspera.passo.ate.split('-').reverse().join('/')}, às 23:59.` : ''}
            </p>
            <Link
              href={`/app/contratacoes/${contratoAEspera.id}${contratoAEspera.passo.passo === 'assinar' ? '#assinar' : ''}`}
              className="btn-primary mt-4 !bg-lima !text-tinta-900 hover:!bg-lima/90"
            >
              {contratoAEspera.passo.passo === 'assinar' ? 'Ir para o contrato' : 'Abrir a contratação'}
            </Link>
          </section>
        )}

        {/* O aviso obrigatório: enquanto a cliente não responder, o prazo do avaliador continua a correr. */}
        {agendamento?.por_responder && (
          <ConfirmarVisita
            agendamento={{
              attemptId: agendamento.attempt_id,
              agendadoPara: agendamento.agendado_para,
              limiteAdiamento: agendamento.limite_adiamento,
            }}
          />
        )}

        <Acompanhamento
          inicial={entrega.entregues ? 'propostas' : 'geral'}
          contagens={{ propostas: entrega.entregues ? (proposalCount ?? 0) : (aCaminho ?? 0), documentos: 1 }}
          slots={{
            geral: (
              <div className="grid gap-5 lg:grid-cols-[1fr_300px]">
                <div className="space-y-5">
                  <section className="rounded-2xl bg-tinta-900 p-5 text-white">
                    <p className="text-[13px] font-semibold text-lima">Onde está a obra</p>
                    <div className="mt-2">
                      <Percurso
                        estado={percurso}
                        requestId={req.id}
                        marcadoPara={surveyRow?.scheduled_at ?? null}
                        houveLevantamento={!!surveyRow}
                        pendencia={null}
                        escuro
                      />
                    </div>
                    <p className="mt-3 text-[15px] text-tinta-200">
                      {entrega.entregues
                        ? 'As propostas estão abertas. Compare-as e envie as perguntas que faltarem; a escolha pode esperar.'
                        : `As propostas chegam todas ao mesmo tempo a ${dataLonga(entrega.abremEm)}. Até lá não há nada que precise de fazer; avisamos se um pintor pedir um esclarecimento.`}
                    </p>
                  </section>
                  {slots.resumo}
                  {manager && req.status === 'publicado' && (
                    <details className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
                      <summary className="flex min-h-[44px] cursor-pointer list-none flex-wrap items-center justify-between gap-3">
                        <span>
                          <span className="block font-semibold">Tem uma empresa de confiança?</span>
                          <span className="block text-[15px] text-slate-600">Convide-a a apresentar proposta para esta obra. Entra na comparação como as outras.</span>
                        </span>
                        <span className="btn-secondary">Convidar empresa</span>
                      </summary>
                      <div className="mt-4">
                        <RequestInvites requestId={req.id} invites={invites} />
                      </div>
                    </details>
                  )}
                  {manager &&
                    req.status === 'publicado' &&
                    !entrega.entregues &&
                    entrega.faltamDias !== null &&
                    entrega.faltamDias <= 3 &&
                    (aCaminho ?? 0) <= 1 &&
                    req.prazo_propostas && <ProlongarPrazo requestId={req.id} prazo={req.prazo_propostas} quantas={aCaminho ?? 0} />}
                </div>
                <aside className="space-y-4">
                  <div className="rounded-2xl bg-paper p-5">
                    <h2 className="text-[15px] font-semibold">O que o protege nesta obra</h2>
                    <ul className="mt-2 list-disc space-y-1.5 pl-4 text-[15px] text-slate-600">
                      <li>Só orçamentam empresas com alvará e seguros verificados</li>
                      <li>A morada e os contactos ficam escondidos até escolher</li>
                      <li>O contrato transcreve a proposta escolhida, assinado com Chave Móvel Digital</li>
                    </ul>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-white p-5">
                    <h2 className="text-[15px] font-semibold">Documentos</h2>
                    <Link href={`/app/pedidos/${req.id}/dossie`} className="mt-1 inline-flex min-h-[44px] items-center text-[15px] font-semibold text-tinta-600 hover:underline">
                      Dossiê do pedido (PDF)
                    </Link>
                  </div>
                  {manager && req.status === 'publicado' && (
                    <p className="px-1 text-[13px] text-slate-500">
                      <AcaoComConsequencia
                        action={encerrar}
                        titulo="Encerrar o pedido?"
                        texto="Deixa de receber propostas. As que já chegaram ficam guardadas; os pintores que ainda não entregaram deixam de poder fazê-lo."
                        confirmar="Encerrar o pedido"
                        destrutivo
                        className="inline-flex min-h-[44px] items-center text-slate-600 underline underline-offset-4 hover:text-tinta-900"
                      >
                        Encerrar o pedido
                      </AcaoComConsequencia>
                    </p>
                  )}
                </aside>
              </div>
            ),
            detalhes: (
              <div className="space-y-5">
                {slots.resumo}
                {slots.fotografias}
              </div>
            ),
            levantamento: slots.zonas,
            propostas: (
              <section className={card}>
                {entrega.entregues ? (
                  <>
                    <p className="text-[17px]">
                      <span className="font-semibold">{proposalCount ?? 0}</span> {proposalCount === 1 ? 'proposta recebida' : 'propostas recebidas'}
                      {entrega.emEsclarecimentos && entrega.esclarecimentosAte && (
                        <span className="text-slate-600"> · pode perguntar o que quiser até {pt(entrega.esclarecimentosAte)}</span>
                      )}
                    </p>
                    <Link href={`/app/pedidos/${req.id}/propostas`} className="btn-primary mt-4">
                      Comparar propostas e mensagens
                    </Link>
                  </>
                ) : (
                  <p className="text-[17px]">
                    <span className="font-semibold">As propostas abrem a {pt(entrega.abremEm)}</span>
                    <span className="text-slate-600">
                      {' '}
                      · {aCaminho ?? 0} a caminho · chegam todas ao mesmo tempo, para ninguém ficar com o preço à vista antes dos outros.
                    </span>
                  </p>
                )}
              </section>
            ),
            documentos: (
              <div className="space-y-5">
                <section className={card}>
                  <h2 className="font-semibold">Documentos desta obra</h2>
                  <Link href={`/app/pedidos/${req.id}/dossie`} className="mt-1 inline-flex min-h-[44px] items-center text-[17px] font-semibold text-tinta-600 hover:underline">
                    Dossiê do pedido, para imprimir
                  </Link>
                </section>
                {oQueOsPintoresVeem}
              </div>
            ),
          }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <Voltar href={`/app/organizacoes/${org.id}`}>{org.nome}</Voltar>
        {/*
          O cabeçalho diz o nome, o estado e uma linha concreta, e mais nada. A referência e o
          dossiê são acções de serviço: descem para o fim da linha, em letra pequena, e deixam de
          disputar a atenção com a preparação do pedido (promotor, 30/10/2026).
        */}
        {/* Uma linha (promotor, 01/11/2026): o título à esquerda com o (i) da ajuda; o estado, a
            referência e o dossiê à direita, em letra pequena, sem gastar altura. */}
        <div className="mt-3 flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
          <h1 className="flex items-center gap-2 text-[24px] leading-tight font-semibold">
            <span>Orçamentos · {req.titulo}</span>
            {draft && (
              <Dica rotulo="Como começar">
                Pode começar pelo que sabe. Se precisar, peça um levantamento profissional — não acrescenta nenhum custo à obra.
              </Dica>
            )}
          </h1>
          <p className="text-[15px] text-slate-600">
            {status.label}
            {req.version > 1 && ` · versão ${req.version}`}
            {' · '}
            Ref. {req.ref}
            {' · '}
            <Link href={`/app/pedidos/${req.id}/dossie`} className="inline-flex min-h-[44px] items-center font-semibold text-tinta-700 hover:underline">
              Dossiê para imprimir
            </Link>
          </p>
        </div>
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

      {/* O aviso obrigatório: enquanto a cliente não responder, o prazo do avaliador continua a correr. Não
          se fecha sozinho, e «Não fui contactada» é a última das três opções, de propósito. */}
      {agendamento?.por_responder && (
        <ConfirmarVisita
          agendamento={{
            attemptId: agendamento.attempt_id,
            agendadoPara: agendamento.agendado_para,
            limiteAdiamento: agendamento.limite_adiamento,
          }}
        />
      )}

      <Percurso
        estado={percurso}
        requestId={req.id}
        marcadoPara={surveyRow?.scheduled_at ?? null}
        houveLevantamento={!!surveyRow}
        pendencia={primeiraPendencia(estadosSeccoes)}
        detalheDaVisita={manager && draft ? <RequestSurveyCard requestId={req.id} survey={survey} /> : undefined}
      />

      {/* Daqui para baixo só rascunhos: o pedido publicado tem a sua página de acompanhamento acima. */}

      {/*
        As seis secções, finalmente montadas. A 30/10/2026 o promotor exigiu que «os separadores
        troquem o conteúdo visível, não apenas saltem para pontos de uma página interminável», e o
        `PedidoEmSeccoes` foi escrito para isso — mas a página continuou a desenhar tudo seguido e o
        componente ficou importado e nunca usado. Era uma exigência dada por cumprida sem o estar.
        Está aqui o que faltava: cada secção recebe o seu conteúdo, e só uma se vê de cada vez.
      */}
      <PedidoEmSeccoes
        estados={estadosSeccoes}
        inicial={draft ? (primeiraPendencia(estadosSeccoes) ?? 'resumo') : 'resumo'}
        formulario={
          <CaixaDaSeccao seccoes={['pretende', 'preferencias']}>
              <RequestForm
                action={updateRequest.bind(null, req.id)}
                podePublicar={!!manager && draft}
                buildings={buildings ?? []}
                initial={{ ...req, produtos_preferidos: parsePreferences(req.produtos_preferidos) }}
                disabled={!manager || !draft}
                references={(await loadReferences(supabase)).map(escolhivel)}
              />
          </CaixaDaSeccao>
        }
        slots={slots}
      />
    </div>
  );
}
