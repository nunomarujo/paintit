'use client';

import type { FormState } from '@/app/app/actions';
import { useFormAction } from '@/components/useFormAction';
import { cancelSurveyHelp, rateSurveyVendor, requestSurveyHelp } from './survey-actions';

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

/** Pedir ajuda de um profissional qualificado para o levantamento — grátis para o cliente, nunca
 * obrigatório (docs/DECISOES.md, 23/10/2026). Sem pedido ainda (ou desistido/expirado): mostra o
 * convite; a partir daí, mostra o estado. */
export function RequestSurveyCard({ requestId, survey }: { requestId: string; survey: SurveyInfo | null }) {
  if (!survey) return <RequestHelpForm requestId={requestId} />;
  if (survey.status === 'cancelado' || survey.status === 'expirado') return null;
  return <ActiveSurveyStatus requestId={requestId} survey={survey} />;
}

function RequestHelpForm({ requestId }: { requestId: string }) {
  const { state, pending, formProps } = useFormAction<FormState>(requestSurveyHelp.bind(null, requestId), { errors: {} });
  return (
    <section className={card}>
      <h2 className="font-semibold">Ajuda de um profissional para o levantamento</h2>
      <p className="mt-1 text-slate-700">
        Um profissional qualificado, de um fornecedor da plataforma, pode visitar a obra e preencher as superfícies e
        fotografias em seu lugar. <strong>Não acrescenta nenhum custo à obra.</strong> É só uma ajuda: a responsabilidade
        pelos dados continua sua, como se os preenchesse sozinho. Se não houver nenhum disponível na zona a tempo, pode
        continuar a preencher sozinho, sem perder nada.
      </p>
      <form {...formProps} className="mt-4 space-y-2">
        {msg(state)}
        <button type="submit" disabled={pending} className="rounded-lg bg-tinta-600 px-5 py-2 text-sm font-semibold text-white hover:bg-tinta-700 disabled:opacity-60">
          {pending ? 'A pedir…' : 'Pedir ajuda de um profissional'}
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
          <p className="mt-1 text-slate-700">À espera de um profissional disponível na zona reservar a visita.</p>
          <form {...cancel.formProps} className="mt-3">
            {msg(cancel.state)}
            <button type="submit" disabled={cancel.pending} className={button}>
              Desistir e preencher sozinho
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
