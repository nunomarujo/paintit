'use client';

import type { FormState } from '@/app/app/actions';
import { useFormAction } from '@/components/useFormAction';
import { reserveSurvey } from './actions';

export function ReserveButton({ surveyId, orgId }: { surveyId: string; orgId: string }) {
  const { state, pending, formProps } = useFormAction<FormState>(async () => reserveSurvey(surveyId, orgId), { errors: {} });
  const msg = Object.values(state.errors)[0] ?? state.message;
  return (
    <form {...formProps} className="flex items-center gap-2">
      <button type="submit" disabled={pending} className="rounded-lg bg-tinta-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-tinta-700 disabled:opacity-60">
        {pending ? 'A reservar…' : 'Reservar'}
      </button>
      {msg && <span className={`text-sm ${state.ok ? 'text-tinta-700' : 'text-red-700'}`}>{msg}</span>}
    </form>
  );
}
