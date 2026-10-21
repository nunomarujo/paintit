'use client';

import type { FormState } from '@/app/app/actions';
import { Field } from '@/components/Field';
import { useFormAction } from '@/components/useFormAction';
import { APPEAL_MAX } from '@/domain/strikes';
import { requestReview } from './actions';

export function ReviewForm() {
  const { state, pending, formProps } = useFormAction<FormState>(requestReview, { errors: {} });
  const e = state.errors;
  return (
    <form {...formProps} className="space-y-4">
      <Field name="texto" label="Porque considera que foi um engano?" required error={e.texto} hint={`Até ${APPEAL_MAX} letras. Sem contactos nem moradas: a equipa responde por email.`}>
        <textarea name="texto" rows={5} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-base" />
      </Field>
      {state.message && (
        <p className={`text-sm ${state.ok ? 'text-tinta-700' : 'text-red-700'}`} role="status">
          {state.message}
        </p>
      )}
      <button type="submit" disabled={pending} className="btn-primary">
        {pending ? 'A enviar…' : 'Pedir revisão do segundo aviso'}
      </button>
    </form>
  );
}
