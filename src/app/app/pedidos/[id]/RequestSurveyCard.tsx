'use client';

import type { FormState } from '@/app/app/actions';
import { useFormAction } from '@/components/useFormAction';
import { cancelSurveyHelp, pedirLevantamento, rateSurveyVendor } from './survey-actions';

export interface SurveyInfo {
  id: string;
  status: 'aberto' | 'reservado' | 'concluido' | 'expirado' | 'cancelado';
  vendorRating: { n: number; media: number | null } | null;
  rated: boolean;
}

const card = 'rounded-2xl border border-tinta-200 bg-tinta-50 p-6 text-[17px]';
const button = 'btn-secondary';

function msg(state: FormState) {
  const m = Object.values(state.errors)[0] ?? state.message;
  return m ? <p className={`text-[17px] ${state.ok ? 'text-tinta-700' : 'text-red-700'}`}>{m}</p> : null;
}

const ratingText = (r: { n: number; media: number | null }) =>
  r.n === 0 ? ' (primeira obra na plataforma)' : ` (${r.media!.toFixed(1)}★, ${r.n} ${r.n === 1 ? 'obra avaliada' : 'obras avaliadas'})`;

/** Ajuda de um profissional qualificado para o levantamento — grátis para o cliente, sempre aberta por
 * omissão desde que o pedido é criado (gatilho `work_requests_create_survey`, 23/10/2026), nunca
 * obrigatória: pode desistir e preencher sozinho em qualquer momento. `survey === null` só devia
 * acontecer para pedidos de antes desta mudança que o backfill da migração já cobriu — por segurança,
 * não mostra nada em vez de um erro. Desistido/expirado: também não mostra nada. */
export function RequestSurveyCard({ requestId, survey }: { requestId: string; survey: SurveyInfo | null }) {
  // Sem vaga activa, o cartão **não desaparece**: oferece-a. Era este o defeito — desistir fechava
  // a porta, e a porta é precisamente a saída de que o cliente precisa quando fica com
  // dificuldades (promotor, 30/10/2026).
  if (!survey || survey.status === 'cancelado' || survey.status === 'expirado') {
    return <PedirAjuda requestId={requestId} jaDesistiu={!!survey} />;
  }
  return <ActiveSurveyStatus requestId={requestId} survey={survey} />;
}

/**
 * Preencher dados e pedir ajuda **não são alternativas incompatíveis**. O cliente pode começar
 * sozinho, pedir ajuda a meio, e continuar a acrescentar informação enquanto espera.
 *
 * A confirmação existe para dizer a única coisa que ele teme ao carregar: que perde o que escreveu.
 * Não perde.
 */
function PedirAjuda({ requestId, jaDesistiu }: { requestId: string; jaDesistiu: boolean }) {
  const pedir = useFormAction<FormState>(pedirLevantamento.bind(null, requestId), { errors: {} });
  return (
    <section className={card}>
      <h2 className="font-semibold">Precisa de ajuda para preparar o pedido?</h2>
      <p className="mt-1 text-slate-700">
        Pode começar com o que sabe. Um profissional qualificado visita o imóvel e completa as medições, as fotografias
        e os trabalhos — e os dados que já introduziu ficam, e servem-lhe de referência.{' '}
        <strong>Não acrescenta nenhum custo à obra.</strong>
      </p>
      {jaDesistiu && (
        <p className="mt-2 text-slate-600">Tinha preferido preencher sozinho. Pode mudar de ideias quando quiser.</p>
      )}
      <form {...pedir.formProps} className="mt-3">
        {msg(pedir.state)}
        <button type="submit" disabled={pedir.pending} className="btn-primary">
          {pedir.pending ? 'A pedir…' : 'Pedir levantamento'}
        </button>
      </form>
    </section>
  );
}

function ActiveSurveyStatus({ requestId, survey }: { requestId: string; survey: SurveyInfo }) {
  const cancel = useFormAction<FormState>(cancelSurveyHelp.bind(null, requestId, survey.id), { errors: {} });
  const rate = useFormAction<FormState>(rateSurveyVendor.bind(null, requestId, survey.id), { errors: {} });
  return (
    <section className={card}>
      <h2 className="font-semibold">Ajuda de um profissional para o levantamento</h2>
      {survey.status === 'aberto' && (
        <>
          <p className="mt-1 text-slate-700">
            {/*
              Substituiu «a responsabilidade pelos dados continua sua, como se os preenchesse
              sozinho» (promotor, 29/10/2026). Além de desencorajadora, a frase não dizia quem mediu
              nem o que o cliente tem de confirmar — e deixava-o a responder por uma medição que não
              fez. O registo guarda quem mediu e quando; o que ele faz é rever e pedir correcções.
            */}
            O profissional regista as medições e os trabalhos que observar. Antes da publicação, poderá rever o pedido e
            pedir correcções. <strong>Não acrescenta nenhum custo à obra.</strong>
          </p>
          <p className="mt-2 text-slate-700">
            Pode ir preenchendo o que souber entretanto, sem perder nada — ou, se preferir tratar de tudo sozinho,
            desistir abaixo.
          </p>
          <form {...cancel.formProps} className="mt-3">
            {msg(cancel.state)}
            <button type="submit" disabled={cancel.pending} className={button}>
              Prefiro preencher sozinho
            </button>
          </form>
        </>
      )}
      {/* O estado — à espera, marcada, entregue — diz-se uma vez, no topo da página. Aqui fica o
          que é só deste cartão: quem é o profissional, e o que o cliente pode fazer. */}
      {survey.status === 'reservado' && (
        <p className="mt-1 text-slate-700">
          Ficou com a visita um profissional qualificado de um fornecedor da plataforma
          {survey.vendorRating ? ratingText(survey.vendorRating) : ''}. Avisamos quando o levantamento estiver
          registado.
        </p>
      )}
      {survey.status === 'concluido' && (
        <>
          <p className="mt-1 text-slate-700">
            O levantamento foi registado por um profissional{survey.vendorRating ? ratingText(survey.vendorRating) : ''}.
            Reveja o que está aqui e peça correcções se alguma coisa não corresponder ao que viu.
          </p>
          {!survey.rated && (
            <form {...rate.formProps} className="mt-3 space-y-2">
              <p className="font-medium">Como correu?</p>
              <div className="flex gap-3">
                {[1, 2, 3, 4, 5].map((n) => (
                  <label key={n} className="flex items-center gap-1">
                    <input type="radio" name="nota" value={n} /> {n}
                  </label>
                ))}
              </div>
              <textarea name="comentario" rows={2} placeholder="Comentário (opcional)" className="campo" />
              {msg(rate.state)}
              <button type="submit" disabled={rate.pending} className={button}>
                Avaliar
              </button>
            </form>
          )}
        </>
      )}
    </section>
  );
}
