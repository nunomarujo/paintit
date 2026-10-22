'use client';

import { useState } from 'react';
import { reviewDocument, type FormState } from '@/app/app/actions';
import { useFormAction } from '@/components/useFormAction';
import { RejectionReasons } from '@/components/RejectionReasons';
import { DOCUMENT_REJECTION_REASONS } from '@/domain/review';

export function ReviewForm({ documentId }: { documentId: string }) {
  const { state, pending, formProps } = useFormAction<FormState>(reviewDocument.bind(null, documentId), { errors: {} });
  const [notas, setNotas] = useState('');
  if (state.ok) return <p className="text-sm text-tinta-700">{state.message}</p>;

  return (
    <form {...formProps} className="mt-3 space-y-2">
      <RejectionReasons reasons={DOCUMENT_REJECTION_REASONS} value={notas} onChange={setNotas} />
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
