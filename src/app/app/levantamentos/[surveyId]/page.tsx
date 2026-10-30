import { notFound } from 'next/navigation';
import { Fotografias } from '@/app/app/pedidos/[id]/Fotografias';
import { SurfaceForm } from '@/app/app/pedidos/[id]/SurfaceForm';
import { AREA_SOURCE_LABELS, SURFACE_KIND_LABELS, formatArea } from '@/domain/request';
import { CURRENT_SURVEY_TERMS_VERSION } from '@/domain/surveyTerms';
import { surveyPendings } from '@/domain/surveyPendings';
import { surveyorEarningView } from '@/lib/surveys';
import { getUser } from '@/lib/supabase/server';
import { EarningCard } from './EarningCard';
import { AcceptTerms } from './AcceptTerms';
import { ClarificationCard, type ClarificationView } from './ClarificationCard';
import { SurveyWorkspace } from './SurveyWorkspace';
import { ConcludeButton, ContactForm } from './ContactForm';
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
    return (
      <div className="space-y-8">
        <Voltar href="/app/levantamentos">Levantamentos</Voltar>
        <AcceptTerms surveyId={survey.id} />
      </div>
    );
  }

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
  const total = list.reduce((n, s) => n + s.area_cm2, 0);
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
      <Voltar href="/app/levantamentos">Levantamentos</Voltar>

      <SurveyWorkspace
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
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="superficies" className="scroll-mt-4 font-semibold">Superfícies e áreas</h2>
          <span className="text-[17px] text-slate-600">Total: {formatArea(total)}</span>
        </div>
        {list.length > 0 ? (
          <ul className="mt-4 divide-y divide-slate-100 text-[17px]">
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
          <p className="mt-3 text-[17px] text-slate-600">Ainda sem superfícies.</p>
        )}
        {!done && (
          <div className="mt-6 border-t border-slate-100 pt-6">
            <SurfaceForm requestId={request.id} />
          </div>
        )}
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

      <section className={card}>
        <h2 className="font-semibold">Contacto e agendamento</h2>
        <div className="mt-3">
          <ContactForm surveyId={survey.id} initial={{ notas: survey.contact_notes, agendado: survey.scheduled_at?.slice(0, 16) ?? null }} />
        </div>
      </section>

      {earning && <EarningCard earning={earning} />}

      <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-[17px] text-amber-900">
        A morada e os dados desta obra são confidenciais: não os partilhe fora da aplicação, nem indique esta obra a
        nenhum pintor ou terceiro fora do fluxo normal da plataforma.
      </section>
          </>
        }
      />
    </div>
  );
}
