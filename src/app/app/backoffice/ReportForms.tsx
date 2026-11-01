'use client';

import { useFormAction } from '@/components/useFormAction';
import type { FormState } from '@/app/app/actions';
import { resolveReport } from '@/app/app/backoffice/actions';

export function ResolveReport({ reportId }: { reportId: string }) {
  const { state, pending, formProps } = useFormAction<FormState>(resolveReport.bind(null, reportId), { errors: {} });
  if (state.ok) return <p className="text-[17px] text-tinta-700">{state.message}</p>;
  return (
    <form {...formProps} className="mt-3 space-y-2 text-[17px]">
      <textarea
        name="resolucao"
        rows={2}
        placeholder="Decisão. Se suspender, o cliente lê isto e corrige o pedido."
        className="campo"
      />
      {(state.errors.resolucao || state.message) && <p className="text-red-700">{state.errors.resolucao ?? state.message}</p>}
      <div className="flex gap-2">
        <button
          type="submit"
          name="decision"
          value="suspender"
          disabled={pending}
          className="btn-primary bg-red-700 hover:bg-red-800"
        >
          Suspender anúncio
        </button>
        <button type="submit" name="decision" value="arquivar" disabled={pending} className="btn-secondary">
          Sem fundamento
        </button>
      </div>
    </form>
  );
}
