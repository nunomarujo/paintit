'use client';

import type { FormState } from '@/app/app/actions';
import { Field } from '@/components/Field';
import { useFormAction } from '@/components/useFormAction';
import { decideReferralPayout } from './actions';

export function ReferralPayoutForm({ payoutId, canPay }: { payoutId: string; canPay: boolean }) {
  const { state, pending, formProps } = useFormAction<FormState>(decideReferralPayout.bind(null, payoutId), { errors: {} });
  return (
    <form {...formProps} autoComplete="off" className="mt-2 flex flex-wrap items-end gap-3">
      <Field name="texto" label={canPay ? 'Referência da transferência (ou motivo, se anular)' : 'Motivo, se anular'} error={state.errors.texto} />
      {canPay && (
        <button type="submit" name="decision" value="paga" disabled={pending} className="btn-primary">
          Marcar como paga
        </button>
      )}
      <button type="submit" name="decision" value="anular" disabled={pending} className="btn-secondary">
        Anular
      </button>
      {state.message && (
        <p className={`basis-full text-sm ${state.ok ? 'text-tinta-700' : 'text-red-700'}`} role="status">
          {state.message}
        </p>
      )}
    </form>
  );
}
