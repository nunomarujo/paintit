'use client';

import { useFormAction } from '@/components/useFormAction';
import type { FormState } from '@/app/app/actions';
import { reportListing, resolveReport } from '@/app/app/backoffice/actions';

export function ReportListing({ requestId }: { requestId: string }) {
  const { state, pending, formProps } = useFormAction<FormState>(reportListing.bind(null, requestId), { errors: {} });
  if (state.ok) return <p className="text-sm text-tinta-700">{state.message}</p>;
  return (
    <details className="text-sm">
      <summary className="cursor-pointer text-slate-600">Este anúncio identifica o cliente ou a morada? Denunciar</summary>
      <form {...formProps} className="mt-2 space-y-2">
        <textarea
          name="motivo"
          rows={2}
          placeholder="Diga onde está o problema (ex.: na descrição), sem copiar o dado."
          className="w-full rounded-lg border border-slate-300 px-3 py-2"
        />
        {(state.errors.motivo || state.message) && <p className="text-red-700">{state.errors.motivo ?? state.message}</p>}
        <button type="submit" disabled={pending} className="rounded-lg border border-slate-300 px-3 py-1.5 hover:bg-slate-50">
          Enviar denúncia
        </button>
      </form>
    </details>
  );
}

export function ResolveReport({ reportId }: { reportId: string }) {
  const { state, pending, formProps } = useFormAction<FormState>(resolveReport.bind(null, reportId), { errors: {} });
  if (state.ok) return <p className="text-sm text-tinta-700">{state.message}</p>;
  return (
    <form {...formProps} className="mt-3 space-y-2 text-sm">
      <textarea
        name="resolucao"
        rows={2}
        placeholder="Decisão. Se suspender, o cliente lê isto e corrige o pedido."
        className="w-full rounded-lg border border-slate-300 px-3 py-2"
      />
      {(state.errors.resolucao || state.message) && <p className="text-red-700">{state.errors.resolucao ?? state.message}</p>}
      <div className="flex gap-2">
        <button
          type="submit"
          name="decision"
          value="suspender"
          disabled={pending}
          className="rounded-lg bg-red-700 px-3 py-1.5 font-semibold text-white hover:bg-red-800 disabled:opacity-60"
        >
          Suspender anúncio
        </button>
        <button type="submit" name="decision" value="arquivar" disabled={pending} className="rounded-lg border border-slate-300 px-3 py-1.5 hover:bg-slate-50">
          Sem fundamento
        </button>
      </div>
    </form>
  );
}
