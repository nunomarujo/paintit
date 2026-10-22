'use client';

import { useState } from 'react';
import { useFormAction } from '@/components/useFormAction';
import type { FormState } from '@/app/app/actions';
import { reviewPhoto } from '@/app/app/pedidos/actions';
import { RejectionReasons } from '@/components/RejectionReasons';
import { PHOTO_REJECTION_REASONS } from '@/domain/review';

export function PhotoReviewForm({ photoId }: { photoId: string }) {
  const { state, pending, formProps } = useFormAction<FormState>(reviewPhoto.bind(null, photoId), { errors: {} });
  const [notas, setNotas] = useState('');
  if (state.ok) return <p className="text-sm text-tinta-700">{state.message}</p>;

  return (
    <form {...formProps} className="mt-3 space-y-2">
      <RejectionReasons reasons={PHOTO_REJECTION_REASONS} value={notas} onChange={setNotas} />
      {(state.errors.notas || state.message) && (
        <p className="text-sm text-red-700" role="alert">
          {state.errors.notas ?? state.message}
        </p>
      )}
      <div className="flex gap-2">
        <button
          type="submit"
          name="decision"
          value="aprovada"
          disabled={pending}
          className="rounded-lg bg-tinta-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-tinta-700 disabled:opacity-60"
        >
          Não identifica o prédio: aprovar
        </button>
        <button
          type="submit"
          name="decision"
          value="rejeitada"
          disabled={pending}
          className="rounded-lg border border-red-300 px-3 py-1.5 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-60"
        >
          Recusar
        </button>
      </div>
    </form>
  );
}
