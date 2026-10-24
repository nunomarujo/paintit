'use client';

import type { FormState } from '@/app/app/actions';
import { useFormAction } from '@/components/useFormAction';
import { askSurveyClarification, rateSurveyInfo } from '../survey-actions';

export interface SurveyInfoView {
  surveyId: string;
  /** O pedido de esclarecimento a que este pintor já se juntou, se houver. */
  pedido: { status: 'aberto' | 'respondido' | 'expirado'; resposta: string | null } | null;
  /** A nota que este pintor já deu, se já deu alguma. */
  minhaNota: number | null;
}

const card = 'rounded-2xl border border-slate-200 bg-white p-6';
const button = 'rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold hover:bg-slate-50 disabled:opacity-60';

function msg(state: FormState) {
  const m = Object.values(state.errors)[0] ?? state.message;
  return m ? <p className={`text-sm ${state.ok ? 'text-tinta-700' : 'text-red-700'}`}>{m}</p> : null;
}

/**
 * A informação do levantamento, do lado do pintor: o que ele pode fazer quando o que está registado não
 * chega para orçamentar. Só aparece sobre um levantamento concluído e com o anúncio aberto — o mesmo
 * critério que guarda as duas funções na base de dados.
 */
export function SurveyInfoCard({ requestId, info }: { requestId: string; info: SurveyInfoView }) {
  const ask = useFormAction<FormState>(askSurveyClarification.bind(null, requestId, info.surveyId), { errors: {} }, { resetOnSuccess: true });
  const rate = useFormAction<FormState>(rateSurveyInfo.bind(null, requestId, info.surveyId), { errors: {} });

  return (
    <section className={card}>
      <h2 className="font-semibold">A informação desta obra foi levantada por um profissional</h2>
      <p className="mt-1 text-sm text-slate-600">
        As superfícies, áreas e fotografias acima foram registadas por um avaliador que visitou a obra. Se faltar alguma
        coisa para conseguir orçamentar, peça — ele volta lá e responde. Não fica a saber quem perguntou.
      </p>

      {info.pedido ? (
        <div className="mt-4 rounded-xl bg-slate-50 p-4 text-sm">
          {info.pedido.status === 'respondido' && info.pedido.resposta ? (
            <>
              <p className="font-medium">Resposta ao que foi perguntado</p>
              <p className="mt-1 whitespace-pre-line text-slate-700">{info.pedido.resposta}</p>
            </>
          ) : info.pedido.status === 'expirado' ? (
            <p className="text-slate-700">
              Ninguém respondeu dentro do prazo. Se houver outro profissional disponível na zona, a plataforma passa-lhe
              o pedido; é avisado quando houver resposta.
            </p>
          ) : (
            <p className="text-slate-700">
              Pedido registado, à espera de resposta. O profissional tem um dia para confirmar a ida à obra e mais um
              para responder.
            </p>
          )}
        </div>
      ) : null}

      <form {...ask.formProps} className="mt-4 space-y-2">
        <label className="block text-sm font-medium text-slate-700">
          {info.pedido ? 'Acrescentar outra dúvida' : 'Falta alguma coisa para orçamentar?'}
          <textarea
            name="texto"
            rows={3}
            maxLength={2000}
            placeholder="Ex.: falta saber se há andaime montado e qual a altura das fachadas de tardoz."
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </label>
        <p className="text-xs text-slate-500">
          As dúvidas de todos os pintores desta obra seguem numa lista só, sem dizer quem perguntou o quê. Não indique
          nomes nem contactos.
        </p>
        {msg(ask.state)}
        <button type="submit" disabled={ask.pending} className={button}>
          {ask.pending ? 'A enviar…' : 'Pedir esclarecimento'}
        </button>
      </form>

      <div className="mt-6 border-t border-slate-100 pt-5">
        <form {...rate.formProps} className="space-y-2">
          <p className="text-sm font-medium text-slate-700">
            {info.minhaNota ? 'A sua avaliação da informação' : 'Que tal estava a informação?'}
          </p>
          <p className="text-xs text-slate-500">
            A média das notas dos pintores entra no cálculo do que a plataforma paga a quem faz os levantamentos. Pode
            corrigir a sua nota mais tarde.
          </p>
          <div className="flex gap-3 text-sm">
            {[1, 2, 3, 4, 5].map((n) => (
              <label key={n} className="flex items-center gap-1">
                <input type="radio" name="nota" value={n} defaultChecked={info.minhaNota === n} /> {n}
              </label>
            ))}
          </div>
          <textarea
            name="comentario"
            rows={2}
            maxLength={2000}
            placeholder="O que faltava, ou o que estava bem (opcional)"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          {msg(rate.state)}
          <button type="submit" disabled={rate.pending} className={button}>
            {rate.pending ? 'A guardar…' : info.minhaNota ? 'Corrigir avaliação' : 'Avaliar informação'}
          </button>
        </form>
      </div>
    </section>
  );
}
