'use client';

import type { FormState } from '@/app/app/actions';
import { useFormAction } from '@/components/useFormAction';
import { concludeSurvey, logContact } from '../actions';

export function ContactForm({ surveyId, initial }: { surveyId: string; initial: { notas: string; agendado: string | null } }) {
  const { state, pending, formProps } = useFormAction<FormState>(logContact.bind(null, surveyId), { errors: {} });
  const msg = Object.values(state.errors)[0] ?? state.message;
  return (
    <form {...formProps} className="space-y-3 text-sm">
      <label className="block">
        Tentativas de contacto e agendamento
        <textarea
          name="notas"
          rows={3}
          defaultValue={initial.notas}
          placeholder="Ex.: ligado a 23/10 às 10h, agendada visita para 24/10."
          className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2"
        />
      </label>
      <label className="block">
        Visita agendada para
        <input
          name="agendado"
          type="datetime-local"
          defaultValue={initial.agendado ?? ''}
          className="mt-1 block rounded-lg border border-slate-300 px-3 py-2"
        />
      </label>
      {msg && <p className={`text-sm ${state.ok ? 'text-tinta-700' : 'text-red-700'}`}>{msg}</p>}
      <button type="submit" disabled={pending} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold hover:bg-slate-50 disabled:opacity-60">
        {pending ? 'A guardar…' : 'Guardar'}
      </button>
    </form>
  );
}

export function ConcludeButton({ surveyId }: { surveyId: string }) {
  const { state, pending, formProps } = useFormAction<FormState>(async () => concludeSurvey(surveyId), { errors: {} });
  const msg = Object.values(state.errors)[0] ?? state.message;
  return (
    <form {...formProps} className="flex items-center gap-2">
      <button type="submit" disabled={pending} className="rounded-lg bg-tinta-600 px-5 py-2 text-sm font-semibold text-white hover:bg-tinta-700 disabled:opacity-60">
        {pending ? 'A concluir…' : 'Concluir levantamento'}
      </button>
      {msg && <span className={`text-sm ${state.ok ? 'text-tinta-700' : 'text-red-700'}`}>{msg}</span>}
    </form>
  );
}
