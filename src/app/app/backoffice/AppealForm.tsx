'use client';

import type { FormState } from '@/app/app/actions';
import { Field } from '@/components/Field';
import { useFormAction } from '@/components/useFormAction';
import { decideAppealAction } from './actions';

export function AppealForm({ appealId }: { appealId: string }) {
  const { state, pending, formProps } = useFormAction<FormState>(decideAppealAction.bind(null, appealId), { errors: {} });
  return (
    <form {...formProps} className="mt-3 space-y-2">
      <Field name="motivo" label="Decisão (a pessoa recebe-a por email)" required error={state.errors.motivo}>
        <textarea name="motivo" rows={2} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" />
      </Field>
      {state.message && (
        <p className={`text-sm ${state.ok ? 'text-tinta-700' : 'text-red-700'}`} role="status">
          {state.message}
        </p>
      )}
      <div className="flex gap-2">
        <button type="submit" name="decision" value="aceitar" disabled={pending} className="btn-primary">
          Aceitar (anula o 2.º aviso)
        </button>
        <button type="submit" name="decision" value="recusar" disabled={pending} className="btn-secondary">
          Recusar (mantém o último aviso)
        </button>
      </div>
    </form>
  );
}
