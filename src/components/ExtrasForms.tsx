'use client';

import type { FormState } from '@/app/app/actions';
import { answerReview, invitePainter, saveReview } from '@/app/app/extras-actions';
import { useFormAction } from '@/components/useFormAction';

const msg = (s: FormState) => {
  const m = Object.values(s.errors)[0] ?? s.message;
  return m ? <p className={`text-[17px] ${s.ok ? 'text-tinta-700' : 'text-red-700'}`}>{m}</p> : null;
};
const button = 'rounded-lg border border-slate-300 px-4 py-2 text-[17px] font-semibold hover:bg-slate-50 disabled:opacity-60';

export function InvitePainter({ requestId, painters }: { requestId: string; painters: { id: string; nome: string }[] }) {
  const { state, pending, formProps } = useFormAction<FormState>(invitePainter.bind(null, requestId), { errors: {} });
  return (
    <form {...formProps} className="flex flex-wrap items-center gap-2 text-[17px]">
      {/* `max-w-full`: sem ele o select estica-se até à largura do nome mais longo da lista e, a
          390px, empurra a página 139px para fora (medido a 27/10/2026). */}
      <select name="painter" defaultValue="" className="w-full max-w-full rounded-lg border border-slate-300 bg-white px-3 py-2 sm:w-auto">
        <option value="" disabled>
          Pintor…
        </option>
        {painters.map((p) => (
          <option key={p.id} value={p.id}>
            {p.nome}
          </option>
        ))}
      </select>
      <button type="submit" disabled={pending} className={button}>
        Convidar
      </button>
      {msg(state)}
    </form>
  );
}

const CRITERIA = [
  ['qualidade', 'Qualidade do trabalho'],
  ['prazo', 'Cumprimento do prazo'],
  ['comunicacao', 'Comunicação'],
] as const;

export function ReviewForm({
  engagementId,
  initial,
}: {
  engagementId: string;
  initial: { qualidade: number; prazo: number; comunicacao: number; comentario: string } | null;
}) {
  const { state, pending, formProps } = useFormAction<FormState>(saveReview.bind(null, engagementId), { errors: {} });
  return (
    <form {...formProps} className="space-y-3 text-[17px]">
      {CRITERIA.map(([k, label]) => (
        <fieldset key={k} className="flex flex-wrap items-center gap-3">
          <legend className="w-48 text-slate-600">{label}</legend>
          {[1, 2, 3, 4, 5].map((n) => (
            <label key={n} className="flex min-h-[44px] items-center gap-2 px-1">
              <input type="radio" name={k} value={n} defaultChecked={initial?.[k] === n} /> {n}
            </label>
          ))}
        </fieldset>
      ))}
      <textarea
        name="comentario"
        rows={3}
        defaultValue={initial?.comentario ?? ''}
        placeholder="Comentário (opcional)"
        className="w-full rounded-lg border border-slate-300 px-3 py-2"
      />
      {msg(state)}
      <button type="submit" disabled={pending} className={button}>
        {initial ? 'Atualizar avaliação' : 'Avaliar'}
      </button>
    </form>
  );
}

export function AnswerForm({ engagementId, initial }: { engagementId: string; initial: string | null }) {
  const { state, pending, formProps } = useFormAction<FormState>(answerReview.bind(null, engagementId), { errors: {} });
  return (
    <form {...formProps} className="space-y-2 text-[17px]">
      <textarea
        name="resposta"
        rows={2}
        defaultValue={initial ?? ''}
        placeholder="A sua resposta à avaliação"
        className="w-full rounded-lg border border-slate-300 px-3 py-2"
      />
      {msg(state)}
      <button type="submit" disabled={pending} className={button}>
        Responder
      </button>
    </form>
  );
}
