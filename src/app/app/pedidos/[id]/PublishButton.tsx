'use client';

import { useFormAction } from '@/components/useFormAction';
import type { FormState } from '@/app/app/actions';
import { publishRequest } from '@/app/app/pedidos/actions';

export function PublishButton({ requestId, blockers }: { requestId: string; blockers: string[] }) {
  const { state, pending, formProps } = useFormAction<FormState>(publishRequest.bind(null, requestId), {
    errors: {},
  });

  return (
    <form {...formProps} className="space-y-3">
      {blockers.length > 0 && (
        <div className="rounded-xl bg-amber-50 p-4 text-sm">
          <p className="font-medium">Antes de publicar:</p>
          <ul className="mt-1 list-disc pl-5">
            {blockers.map((b) => (
              <li key={b}>{b}</li>
            ))}
          </ul>
        </div>
      )}
      {state.message && (
        <p className={`text-sm ${state.ok ? 'text-tinta-700' : 'text-red-700'}`} role="status">
          {state.message}
        </p>
      )}
      <button
        type="submit"
        disabled={pending || blockers.length > 0}
        className="rounded-lg bg-tinta-600 px-5 py-2 font-semibold text-white hover:bg-tinta-700 disabled:opacity-50"
      >
        {pending ? 'A publicar…' : 'Publicar pedido'}
      </button>
    </form>
  );
}
