'use client';

import type { FormState } from '@/app/app/actions';
import { useFormAction } from '@/components/useFormAction';
import { reserveSurvey } from './actions';

export function ReserveButton({ surveyId, orgId }: { surveyId: string; orgId: string }) {
  const { state, pending, formProps } = useFormAction<FormState>(async () => reserveSurvey(surveyId, orgId), { errors: {} });
  const msg = Object.values(state.errors)[0] ?? state.message;
  return (
    <form {...formProps} className="flex items-center gap-2">
      {/* Geometria do sistema, não escrita à mão: `btn-primary` já traz os 44px de altura (regra 17). */}
      <button type="submit" disabled={pending} className="btn-primary disabled:opacity-60">
        {pending ? 'A aceitar…' : 'Aceitar'}
      </button>
      {msg && <span className={`text-[17px] ${state.ok ? 'text-tinta-700' : 'text-red-700'}`}>{msg}</span>}
    </form>
  );
}
