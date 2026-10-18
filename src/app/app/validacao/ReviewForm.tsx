'use client';

import { useActionState } from 'react';
import { reviewDocument, type FormState } from '@/app/app/actions';

export function ReviewForm({ documentId }: { documentId: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(reviewDocument.bind(null, documentId), {
    errors: {},
  });
  if (state.ok) return <p className="text-sm text-tinta-700">{state.message}</p>;

  return (
    <form action={action} className="mt-3 space-y-2">
      <textarea
        name="notas"
        rows={2}
        placeholder="Notas (obrigatórias para rejeitar; o cliente vê o motivo)"
        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
      />
      {(state.errors.notas || state.message) && (
        <p className="text-sm text-red-700" role="alert">
          {state.errors.notas ?? state.message}
        </p>
      )}
      <div className="flex gap-2">
        <button
          type="submit"
          name="decision"
          value="aprovado"
          disabled={pending}
          className="rounded-lg bg-tinta-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-tinta-700 disabled:opacity-60"
        >
          Aprovar
        </button>
        <button
          type="submit"
          name="decision"
          value="rejeitado"
          disabled={pending}
          className="rounded-lg border border-red-300 px-3 py-1.5 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-60"
        >
          Rejeitar
        </button>
      </div>
    </form>
  );
}
