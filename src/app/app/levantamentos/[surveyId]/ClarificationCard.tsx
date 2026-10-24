'use client';

import type { FormState } from '@/app/app/actions';
import { useFormAction } from '@/components/useFormAction';
import { confirmClarification, respondClarification } from '../actions';

export interface ClarificationView {
  id: string;
  status: 'aberto' | 'respondido' | 'expirado';
  confirmadoEm: string | null;
  prazoConfirmar: string | null;
  prazoResponder: string | null;
  resposta: string | null;
  /** As dúvidas, juntas e sem identificar quem perguntou (clarification_batch). */
  duvidas: { texto: string; created_at: string }[];
}

const card = 'rounded-2xl border border-amber-200 bg-amber-50 p-6';
const button = 'rounded-lg bg-tinta-600 px-5 py-2 text-sm font-semibold text-white hover:bg-tinta-700 disabled:opacity-60';

const prazo = (iso: string) =>
  new Date(iso).toLocaleString('pt-PT', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

function msg(state: FormState) {
  const m = Object.values(state.errors)[0] ?? state.message;
  return m ? <p className={`text-sm ${state.ok ? 'text-tinta-700' : 'text-red-700'}`}>{m}</p> : null;
}

/**
 * Pedido de esclarecimento, do lado de quem tem de responder. Um ou mais pintores acharam a informação
 * do levantamento insuficiente para orçamentar e pediram o que falta; as dúvidas chegam numa lista só,
 * sem se saber quem perguntou o quê — e o pintor também nunca sabe quem responde.
 */
export function ClarificationCard({ surveyId, clarification }: { surveyId: string; clarification: ClarificationView }) {
  const c = clarification;
  const confirm = useFormAction<FormState>(async () => confirmClarification(surveyId, c.id), { errors: {} });
  const respond = useFormAction<FormState>(respondClarification.bind(null, surveyId, c.id), { errors: {} });

  return (
    <section className={card}>
      <h2 className="font-semibold">
        {c.status === 'respondido' ? 'Esclarecimento respondido' : c.status === 'expirado' ? 'Esclarecimento expirado' : 'Pedido de esclarecimento'}
      </h2>

      {c.duvidas.length > 0 ? (
        <>
          <p className="mt-1 text-sm text-amber-900">
            {c.duvidas.length === 1 ? 'Um pintor precisa' : `${c.duvidas.length} dúvidas de pintores que precisam`} de mais
            informação para orçamentar esta obra. Não se identifica quem perguntou.
          </p>
          <ul className="mt-4 space-y-2 text-sm">
            {c.duvidas.map((d, i) => (
              <li key={`${d.created_at}-${i}`} className="rounded-lg border border-amber-200 bg-white p-3">
                {d.texto}
              </li>
            ))}
          </ul>
        </>
      ) : (
        <p className="mt-1 text-sm text-amber-900">Sem dúvidas registadas nesta tentativa.</p>
      )}

      {c.status === 'respondido' && (
        <div className="mt-4 rounded-lg border border-slate-200 bg-white p-3 text-sm">
          <p className="font-medium">A sua resposta</p>
          <p className="mt-1 whitespace-pre-line text-slate-700">{c.resposta}</p>
        </div>
      )}

      {c.status === 'expirado' && (
        <p className="mt-4 text-sm text-red-800">
          O prazo terminou sem resposta. A comissão desta obra perde-se por completo e esta entidade não pode voltar a
          reservar o esclarecimento — se houver outro fornecedor na zona, a tentativa passa para ele.
        </p>
      )}

      {c.status === 'aberto' && !c.confirmadoEm && (
        <div className="mt-5 border-t border-amber-200 pt-5">
          <p className="text-sm text-amber-900">
            Primeiro passo: confirmar que vai à obra.
            {c.prazoConfirmar && <strong> Até {prazo(c.prazoConfirmar)}.</strong>} A partir da confirmação fica com mais um
            dia para lá ir e responder. Falhar qualquer um dos dois prazos custa a comissão de toda a obra, sem valor
            parcial.
          </p>
          <form {...confirm.formProps} className="mt-3 space-y-2">
            {msg(confirm.state)}
            <button type="submit" disabled={confirm.pending} className={button}>
              {confirm.pending ? 'A confirmar…' : 'Confirmo que vou à obra'}
            </button>
          </form>
        </div>
      )}

      {c.status === 'aberto' && c.confirmadoEm && (
        <div className="mt-5 border-t border-amber-200 pt-5">
          <p className="text-sm text-amber-900">
            Ida confirmada. Responda à lista toda de uma vez.
            {c.prazoResponder && <strong> Até {prazo(c.prazoResponder)}.</strong>}
          </p>
          <form {...respond.formProps} className="mt-3 space-y-2">
            <textarea
              name="resposta"
              rows={5}
              maxLength={2000}
              placeholder="Responda ao que foi perguntado. Não indique nomes, moradas nem contactos."
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
            {msg(respond.state)}
            <button type="submit" disabled={respond.pending} className={button}>
              {respond.pending ? 'A enviar…' : 'Enviar resposta'}
            </button>
          </form>
        </div>
      )}
    </section>
  );
}
