'use client';

import type { FormState } from '@/app/app/actions';
import { useFormAction } from '@/components/useFormAction';
import { concludeSurvey } from '../actions';

export function ConcludeButton({ surveyId }: { surveyId: string }) {
  const { state, pending, formProps } = useFormAction<FormState>(async () => concludeSurvey(surveyId), { errors: {} });
  const msg = Object.values(state.errors)[0] ?? state.message;
  return (
    <form {...formProps} className="flex items-center gap-2">
      <button type="submit" disabled={pending} className="rounded-lg bg-tinta-600 px-5 py-2 text-[17px] font-semibold text-white hover:bg-tinta-700 disabled:opacity-60">
        {pending ? 'A concluir…' : 'Concluir levantamento'}
      </button>
      {msg && <span className={`text-[17px] ${state.ok ? 'text-tinta-700' : 'text-red-700'}`}>{msg}</span>}
    </form>
  );
}
