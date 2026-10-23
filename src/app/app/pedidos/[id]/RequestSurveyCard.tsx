'use client';

import type { FormState } from '@/app/app/actions';
import { useFormAction } from '@/components/useFormAction';
import { cancelSurveyHelp, rateSurveyVendor } from './survey-actions';

export interface SurveyInfo {
  id: string;
  status: 'aberto' | 'reservado' | 'concluido' | 'expirado' | 'cancelado';
  vendorRating: { n: number; media: number | null } | null;
  rated: boolean;
}

const card = 'rounded-2xl border border-tinta-200 bg-tinta-50 p-6 text-sm';
const button = 'rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold hover:bg-slate-50 disabled:opacity-60';

function msg(state: FormState) {
  const m = Object.values(state.errors)[0] ?? state.message;
  return m ? <p className={`text-sm ${state.ok ? 'text-tinta-700' : 'text-red-700'}`}>{m}</p> : null;
}

const ratingText = (r: { n: number; media: number | null }) =>
  r.n === 0 ? ' (primeira obra na plataforma)' : ` (${r.media!.toFixed(1)}★, ${r.n} ${r.n === 1 ? 'obra avaliada' : 'obras avaliadas'})`;

/** Ajuda de um profissional qualificado para o levantamento — grátis para o cliente, sempre aberta por
 * omissão desde que o pedido é criado (gatilho `work_requests_create_survey`, 23/10/2026), nunca
 * obrigatória: pode desistir e preencher sozinho em qualquer momento. `survey === null` só devia
 * acontecer para pedidos de antes desta mudança que o backfill da migração já cobriu — por segurança,
 * não mostra nada em vez de um erro. Desistido/expirado: também não mostra nada. */
export function RequestSurveyCard({ requestId, survey }: { requestId: string; survey: SurveyInfo | null }) {
  if (!survey || survey.status === 'cancelado' || survey.status === 'expirado') return null;
  return <ActiveSurveyStatus requestId={requestId} survey={survey} />;
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
            Um profissional qualificado de um fornecedor da plataforma pode visitar a obra em breve e preencher as
            superfícies e fotografias em seu lugar. <strong>Não acrescenta nenhum custo à obra</strong> — é só uma
            ajuda, e a responsabilidade pelos dados continua sua, como se os preenchesse sozinho.
          </p>
          <p className="mt-2 text-slate-700">
            Pode continuar a preencher sozinho entretanto, a qualquer momento, sem perder nada — ou, se preferir não
            receber esta ajuda, desistir abaixo.
          </p>
          <form {...cancel.formProps} className="mt-3">
            {msg(cancel.state)}
            <button type="submit" disabled={cancel.pending} className={button}>
              Prefiro preencher sozinho
            </button>
          </form>
        </>
      )}
      {survey.status === 'reservado' && (
        <p className="mt-1 text-slate-700">
          Um profissional reservou a visita{survey.vendorRating ? ratingText(survey.vendorRating) : ''}. Avisamos quando o
          levantamento estiver registado.
        </p>
      )}
      {survey.status === 'concluido' && (
        <>
          <p className="mt-1 text-slate-700">
            O levantamento foi registado por um profissional{survey.vendorRating ? ratingText(survey.vendorRating) : ''}.
            Pode continuar a rever e a acrescentar superfícies, se faltar algo.
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
              <textarea name="comentario" rows={2} placeholder="Comentário (opcional)" className="w-full rounded-lg border border-slate-300 px-3 py-2" />
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
