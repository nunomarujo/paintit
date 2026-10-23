'use client';

import { useFormAction } from '@/components/useFormAction';
import type { FormState } from '@/app/app/actions';
import { answerSupplierReview } from '@/app/app/obras/actions';

export function SupplierReviewAnswer({ reviewId, supplierOrgId, initial }: { reviewId: string; supplierOrgId: string; initial: string | null }) {
  const { state, pending, formProps } = useFormAction<FormState>(answerSupplierReview.bind(null, reviewId, supplierOrgId), { errors: {} });
  const msg = Object.values(state.errors)[0] ?? state.message;
  return (
    <form {...formProps} className="mt-2 space-y-2 text-sm">
      <textarea
        name="resposta"
        rows={2}
        defaultValue={initial ?? ''}
        placeholder="A sua resposta a esta avaliação"
        className="w-full rounded-lg border border-slate-300 px-3 py-2"
      />
      {msg && <p className={`text-sm ${state.ok ? 'text-tinta-700' : 'text-red-700'}`}>{msg}</p>}
      <button type="submit" disabled={pending} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold hover:bg-slate-50 disabled:opacity-60">
        {pending ? 'A guardar…' : initial ? 'Atualizar resposta' : 'Responder'}
      </button>
    </form>
  );
}
