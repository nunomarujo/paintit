'use client';

import type { FormState } from '@/app/app/actions';
import { useFormAction } from '@/components/useFormAction';
import { startEngagementPayment } from './payment-actions';

export function PayButton({ engagementId, side, label }: { engagementId: string; side: 'cliente' | 'pintor'; label: string }) {
  const { state, pending, formProps } = useFormAction<FormState>(startEngagementPayment.bind(null, engagementId, side), { errors: {} });
  return (
    <form {...formProps} className="mt-3">
      <button type="submit" disabled={pending} className="btn-primary">
        {pending ? 'A abrir o pagamento…' : label}
      </button>
      {state.message && <p className="mt-2 text-[17px] text-red-700">{state.message}</p>}
    </form>
  );
}
