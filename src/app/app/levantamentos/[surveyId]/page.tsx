import { notFound } from 'next/navigation';
import { Fotografias } from '@/app/app/pedidos/[id]/Fotografias';
import { ZonasComVolume } from '@/app/app/pedidos/[id]/ZonasComVolume';
import { paraZona } from '@/lib/requests';
import { SURFACE_KIND_LABELS } from '@/domain/request';
import { CURRENT_SURVEY_TERMS_VERSION } from '@/domain/surveyTerms';
import { surveyPendings } from '@/domain/surveyPendings';
import { surveyorEarningView } from '@/lib/surveys';
import { referenciaDoLevantamento } from '@/domain/referencias';
import { getUser } from '@/lib/supabase/server';
import { EarningCard } from './EarningCard';
import { horaExata } from '@/domain/contagem';
import { AcceptTerms } from './AcceptTerms';
import { ClarificationCard, type ClarificationView } from './ClarificationCard';
import { SurveyWorkspace } from './SurveyWorkspace';
import { Agendamento } from './Agendamento';
import { ConcludeButton } from './ConcludeButton';
import { Voltar } from '@/components/Voltar';

const card = 'rounded-2xl border border-slate-200 bg-white p-4 sm:p-5';

export default async function SurveyWorkspacePage({ params }: { params: Promise<{ surveyId: string }> }) {
  const { surveyId } = await params;
  const { supabase, user } = await getUser();
  const { data: survey } = await supabase.from('request_surveys').select('*').eq('id', surveyId).maybeSingle();
  if (!survey || (survey.status !== 'reservado' && survey.status !== 'concluido')) notFound();

  // A morada exata só se mostra depois de aceites os termos de confidencialidade (uma vez,
  // por pessoa — src/domain/surveyTerms.ts), mesmo padrão do pintor antes da ficha completa da obra.
  const { data: accepted } = await supabase
    .from('survey_terms_acceptances')
    .select('version')
    .eq('version', CURRENT_SURVEY_TERMS_VERSION)
    .maybeSingle();
  if (!accepted) {
    // O prazo de contacto corre mesmo com os termos por aceitar. Esconder-lhe o prazo atrás desta barreira
    // era deixar perder a vaga a olhar para um texto que não diz que há um relógio a andar — e esta barreira
    // aparece a toda a gente de cada vez que os termos mudam de versão.
    const { data: aDecorrer } = await supabase
      .from('survey_attempts')
      .select('prazo_contacto, contacto_registado_em')
      .eq('survey_id', survey.id)
      .eq('estado', 'ativa')
      .maybeSingle();
    return (
      <div className="space-y-8">
        <Voltar href="/app/avaliacoes/levantamentos">Os meus levantamentos</Voltar>
        {aDecorrer && !aDecorrer.contacto_registado_em && (
          <section className="rounded-2xl border border-tinta-200 bg-tinta-50 p-4">
            <h2 className="font-semibold text-slate-900">
              Contactar a cliente até {horaExata(new Date(aDecorrer.prazo_contacto))}
            </h2>
            <p className="mt-1 text-[17px] text-slate-700">
              O prazo já está a correr. Aceite os termos abaixo para ver o contacto e registar a chamada.
            </p>
          </section>
        )}
        <AcceptTerms surveyId={survey.id} />
      </div>
    );
  }

  // A tentativa em curso: é dela que vêm os prazos, o que foi registado e a resposta da cliente. As colunas
  // antigas de `request_surveys` continuam a existir mas já não mandam em nada disto (migração de 31/10/2026).
  // A tentativa mais recente, **qualquer que seja o estado**. Carregar só as que estão a decorrer foi um
  // erro meu: num levantamento já concluído a secção desaparecia por inteiro, e com ela o registo do
  // contacto e o agendamento — informação que estava à vista antes e que o ecrã deixou de mostrar.
  const { data: tentativa } = await supabase
    .from('survey_attempts')
    .select('*')
    .eq('survey_id', survey.id)
    .order('numero', { ascending: false })
    .limit(1)
    .maybeSingle();

  // O contacto da cliente abre com duas chaves — reserva válida e confidencialidade aceite — e as duas são
  // verificadas na base. Se faltar alguma, a função recusa e aqui fica simplesmente sem contacto para mostrar.
  const contactoDaCliente = tentativa
    ? (await supabase.rpc('survey_client_contact', { p_attempt: tentativa.id })).data?.[0] ?? null
    : null;

  const { data: request } = await supabase.from('work_requests').select('id, descricao, building_id').eq('id', survey.request_id).maybeSingle();
  if (!request) notFound();
  const [{ data: building }, { data: surfaces }, { data: photos }] = await Promise.all([
    supabase.from('buildings').select('morada, codigo_postal, localidade, concelho, pisos, fachadas, tem_varandas').eq('id', request.building_id).maybeSingle(),
    supabase.from('request_surfaces').select('*').eq('request_id', request.id).order('created_at'),
    supabase.from('request_photos').select('*').eq('request_id', request.id).order('created_at'),
  ]);
  const list = surfaces ?? [];
  // Ver `fotosPorZona` em app/pedidos/[id]/page.tsx: a coluna `zona_id` entrou a 30/10/2026 e, até a
  // migração estar aplicada, pedi-la devolve erro. Sem ela, a galeria aparece sem zonas.
  const { error: faltaZonaNasFotos } = await supabase
    .from('request_photos')
    .select('zona_id', { head: true, count: 'exact' })
    .eq('request_id', request.id)
    .limit(1);
  const done = survey.status === 'concluido';

  // Pedido de esclarecimento desta obra (migração 20261024010647): a tentativa mais recente, com a lista
  // conjunta de dúvidas. `clarification_batch` é a única forma de as ler — não há política de leitura
  // sobre os itens para o vendedor, de propósito, para nunca se saber quem perguntou o quê.
  const { data: clarificationRow } = await supabase
    .from('survey_clarifications')
    .select('id, status, confirmed_at, confirm_deadline, respond_deadline, resposta')
    .eq('request_survey_id', survey.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  const { data: duvidas } = clarificationRow
    ? await supabase.rpc('clarification_batch', { p_clarification_id: clarificationRow.id })
    : { data: null };
  // Ganho previsto: só a quem pertence à entidade do vendedor deste levantamento. A leitura por baixo
  // usa privilégios próprios (as notas individuais dos pintores não são visíveis ao vendedor, só a
  // média), por isso a autorização confirma-se aqui, explicitamente, e não se delega na RLS.
  const { data: euSouDoVendedor } = survey.vendedor_org_id
    ? await supabase.from('org_members').select('role').eq('org_id', survey.vendedor_org_id).eq('user_id', user!.id).maybeSingle()
    : { data: null };
  const earning = euSouDoVendedor ? await surveyorEarningView(survey.id, survey.vendedor_org_id!, survey.vendedor_user_id) : null;

  const clarification: ClarificationView | null = clarificationRow
    ? {
        id: clarificationRow.id,
        status: clarificationRow.status as ClarificationView['status'],
        confirmadoEm: clarificationRow.confirmed_at,
        prazoConfirmar: clarificationRow.confirm_deadline,
        prazoResponder: clarificationRow.respond_deadline,
        resposta: clarificationRow.resposta,
        duvidas: (duvidas ?? []) as ClarificationView['duvidas'],
      }
    : null;

  // O que falta para o levantamento estar pronto a entregar. Vale mais aqui do que no orçamento: ele
  // está no local, e saber o que falta enquanto lá está poupa-lhe uma segunda ida.
  const pendings = done
    ? []
    : surveyPendings({
        superficies: list.map((s) => ({
          id: s.id,
          label: `${SURFACE_KIND_LABELS[s.kind]}${s.descricao ? ` · ${s.descricao}` : ''}`,
          areaCm2: s.area_cm2 ?? 0,
        })),
        fotografias: (photos ?? []).length,
        esclarecimentoPorResponder: !!clarification && clarification.status !== 'respondido',
      });

  return (
    <div className="space-y-4">
      <Voltar href="/app/avaliacoes/levantamentos">Os meus levantamentos</Voltar>

      <SurveyWorkspace
        referencia={survey.numero ? referenciaDoLevantamento(survey.numero) : null}
        morada={building ? `${building.morada}, ${building.codigo_postal} ${building.localidade}` : null}
        concelho={building?.concelho ?? null}
        caracteristicas={[
          building?.pisos ? `${building.pisos} pisos` : null,
          building?.fachadas ? `${building.fachadas} fachadas` : null,
          building?.tem_varandas ? 'com varandas' : null,
        ]
          .filter(Boolean)
          .join(' · ')}
        concluido={done}
        prazo={clarification && clarification.status !== 'respondido' ? (clarification.prazoResponder ?? clarification.prazoConfirmar) : null}
        pendings={pendings}
        levantamento={
          <>
      <section className={card}>
        {/* O total e o que falta vêm do próprio quadro das zonas (passo 2 do cliente, 05/11/2026). */}
        <h2 id="superficies" className="scroll-mt-4 font-semibold">Zonas e medidas</h2>
        {/*
          O mesmo editor do cliente, e não o formulário antigo de dez campos de uma vez. Quem está
          no prédio tem o telemóvel numa mão e a fita métrica na outra: uma pergunta de cada vez é
          ainda mais necessária aqui do que à secretária. E com o volume ao lado, a zona que se está
          a medir acende-se — que é a maneira de não registar o tardoz duas vezes e esquecer a empena.

          As medidas do prédio ficam de fora desta página de propósito: quem as grava é quem gere o
          pedido, e o vendedor regista as zonas. A separação é a mesma do lado do cliente.
        */}
        <div className="mt-4">
          <ZonasComVolume
            requestId={request.id}
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
              margemBps: paraZona(s).margemBps,
              face: s.face_do_predio ?? null,
              trabalhos: s.trabalhos,
            }))}
            modo="iguais"
            podeEditar={!done}
            // O avaliador mede no local, e o que mede fica confirmado. A ferramenta da fotografia grava
            // «medida pelo cliente», que não é o que ele faz: aqui não se oferece (06/11/2026).
            medirNaFotografia={false}
            doCliente={false}
            predio={{
              buildingId: request.building_id,
              pisos: building?.pisos ?? null,
              fachadas: building?.fachadas ?? null,
              temVarandas: !!building?.tem_varandas,
              moradia: false,
              forma: null,
              medidas: { larguraM: null, profundidadeM: null, peDireitoM: null, origem: 'estimativa' },
              podeMedir: false,
            }}
          />
        </div>
      </section>

      <section className={card}>
        <h2 id="fotografias" className="scroll-mt-4 font-semibold">Fotografias</h2>
        {!done && (
          <p className="mt-2 text-[17px] text-amber-900">
            Não fotografe nada que identifique a localização do prédio ou dos vizinhos — números de porta, placas
            de rua, matrículas, fachadas inteiras reconhecíveis à distância. Fotografe só o pormenor da obra em
            si (fissuras, humidade, acabamentos): a aplicação trata o resto para o cliente nunca ser identificável
            a partir das fotografias.
          </p>
        )}
        <div className="mt-4">
          {/*
            A mesma galeria do cliente, e de propósito: quem está no prédio é quem sabe de que zona
            é cada fotografia, e escolher doze imagens de uma vez é o que faz sentido em obra. A base
            de dados deixa o vendedor do levantamento corrigir legenda e zona (migração
            `fotografias_por_zona`), não só juntar e apagar.
          */}
          <Fotografias
            requestId={request.id}
            fotografias={(photos ?? []).map((f) => ({
              id: f.id,
              kind: f.kind,
              legenda: f.legenda,
              revisao: f.revisao,
              notas_revisao: f.notas_revisao,
              zonaId: f.zona_id ?? null,
            }))}
            zonas={list.map((s) => ({ id: s.id, nome: s.descricao?.trim() || SURFACE_KIND_LABELS[s.kind] }))}
            podeEditar={!done}
            porZona={!faltaZonaNasFotos}
          />
        </div>
      </section>


      {!done && (
        <section className={card}>
          <h2 className="font-semibold">Concluir</h2>
          <p className="mt-1 text-[17px] text-slate-600">
            Marque como concluído quando as superfícies e as fotografias estiverem registadas. O cliente passa a poder
            avaliar o seu trabalho.
          </p>
          <div className="mt-4">
            <ConcludeButton surveyId={survey.id} />
          </div>
        </section>
      )}
          </>
        }
        esclarecimentos={
          <>
      {/* Esclarecimento primeiro: tem prazo a correr e custa a comissão de toda a obra se falhar. */}
      {clarification && <ClarificationCard surveyId={survey.id} clarification={clarification} />}
          </>
        }
        obra={
          <>
      {request.descricao && (
        <section className={card}>
          <h2 className="font-semibold">Descrição do cliente</h2>
          <p className="mt-2 whitespace-pre-line text-[17px] text-slate-700">{request.descricao}</p>
        </section>
      )}

      {/* Contacto e agendamento: os prazos, os dados da cliente e o registo. Sem tentativa ativa não há nada
          a mostrar aqui — é o caso de um levantamento concluído ou de uma reserva já libertada. */}
      {tentativa && (
        <section className={card}>
          <h2 className="font-semibold">Contacto e agendamento</h2>
          <div className="mt-3">
            <Agendamento
              prazos={{
                attemptId: tentativa.id,
                prazoContacto: tentativa.prazo_contacto,
                prazoConclusao: tentativa.prazo_conclusao,
                limiteAdiamento: tentativa.limite_adiamento,
                contactoRegistadoEm: tentativa.contacto_registado_em,
                contactoNotas: tentativa.contacto_notas,
                agendadoPara: tentativa.agendado_para,
                respostaCliente: tentativa.resposta_cliente,
                adiadoPara: tentativa.adiado_para,
                estado: tentativa.estado,
              }}
              contacto={
                contactoDaCliente
                  ? {
                      nome: contactoDaCliente.nome,
                      telefone: contactoDaCliente.telefone,
                      email: contactoDaCliente.email,
                      morada: contactoDaCliente.morada,
                      codigoPostal: contactoDaCliente.codigo_postal,
                      localidade: contactoDaCliente.localidade,
                    }
                  : null
              }
              agoraIso={new Date().toISOString()}
            />
          </div>
        </section>
      )}

      {earning && <EarningCard earning={earning} />}

      {/* Lembrete permanente, e por isso sem fundo de cor (regra 13): a banda âmbar estava a gastar o único
          destaque do ecrã num texto que está sempre ali e não exige nada agora. O destaque pertence ao prazo,
          que é o que se perde se não se olhar. O lembrete fica, em texto. */}
      <section className="rounded-2xl border border-slate-200 bg-white p-4 text-[17px] text-slate-700">
        A morada e os dados desta obra são confidenciais: não os partilhe fora da aplicação, nem indique esta obra a
        nenhum pintor ou terceiro fora do fluxo normal da plataforma.
      </section>
          </>
        }
      />
    </div>
  );
}
