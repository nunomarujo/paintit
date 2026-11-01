'use client';

import { useState } from 'react';
import { reviewDocument, type FormState } from '@/app/app/actions';
import { useFormAction } from '@/components/useFormAction';
import { RejectionReasons } from '@/components/RejectionReasons';
import { DOCUMENT_REJECTION_REASONS } from '@/domain/review';

export function ReviewForm({ documentId }: { documentId: string }) {
  const { state, pending, formProps } = useFormAction<FormState>(reviewDocument.bind(null, documentId), { errors: {} });
  const [notas, setNotas] = useState('');
  if (state.ok) return <p className="text-[17px] text-tinta-700">{state.message}</p>;

  return (
    <form {...formProps} className="mt-3 space-y-2">
      <RejectionReasons reasons={DOCUMENT_REJECTION_REASONS} value={notas} onChange={setNotas} />
      {(state.errors.notas || state.message) && (
        <p className="text-[17px] text-red-700" role="alert">
          {state.errors.notas ?? state.message}
        </p>
      )}
      <div className="flex gap-2">
        <button
          type="submit"
          name="decision"
          value="aprovado"
          disabled={pending}
          className="btn-primary"
        >
          Aprovar
        </button>
        <button
          type="submit"
          name="decision"
          value="rejeitado"
          disabled={pending}
          className="btn-secondary border-red-300 text-red-700 hover:bg-red-50"
        >
          Rejeitar
        </button>
      </div>
    </form>
  );
}
