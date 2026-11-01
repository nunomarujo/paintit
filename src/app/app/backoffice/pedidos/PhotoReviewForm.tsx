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
  if (state.ok) return <p className="text-[17px] text-tinta-700">{state.message}</p>;

  return (
    <form {...formProps} className="mt-3 space-y-2">
      <RejectionReasons reasons={PHOTO_REJECTION_REASONS} value={notas} onChange={setNotas} />
      {(state.errors.notas || state.message) && (
        <p className="text-[17px] text-red-700" role="alert">
          {state.errors.notas ?? state.message}
        </p>
      )}
      <div className="flex gap-2">
        <button
          type="submit"
          name="decision"
          value="aprovada"
          disabled={pending}
          className="btn-primary"
        >
          Não identifica o prédio: aprovar
        </button>
        <button
          type="submit"
          name="decision"
          value="rejeitada"
          disabled={pending}
          className="btn-secondary border-red-300 text-red-700 hover:bg-red-50"
        >
          Recusar
        </button>
      </div>
    </form>
  );
}
