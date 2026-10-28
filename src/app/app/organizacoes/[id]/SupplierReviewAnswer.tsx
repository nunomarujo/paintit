'use client';

import { useFormAction } from '@/components/useFormAction';
import type { FormState } from '@/app/app/actions';
import { answerSupplierReview } from '@/app/app/obras/actions';

export function SupplierReviewAnswer({ reviewId, supplierOrgId, initial }: { reviewId: string; supplierOrgId: string; initial: string | null }) {
  const { state, pending, formProps } = useFormAction<FormState>(answerSupplierReview.bind(null, reviewId, supplierOrgId), { errors: {} });
  const msg = Object.values(state.errors)[0] ?? state.message;
  return (
    <form {...formProps} className="mt-2 space-y-2 text-[17px]">
      <textarea
        name="resposta"
        rows={2}
        defaultValue={initial ?? ''}
        placeholder="A sua resposta a esta avaliação"
        className="campo"
      />
      {msg && <p className={`text-[17px] ${state.ok ? 'text-tinta-700' : 'text-red-700'}`}>{msg}</p>}
      <button type="submit" disabled={pending} className="btn-secondary">
        {pending ? 'A guardar…' : initial ? 'Atualizar resposta' : 'Responder'}
      </button>
    </form>
  );
}
