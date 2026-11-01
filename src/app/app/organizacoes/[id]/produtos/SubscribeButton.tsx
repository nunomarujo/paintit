'use client';

import type { FormState } from '@/app/app/actions';
import { useFormAction } from '@/components/useFormAction';
import { startSubscription } from './subscription-actions';

export function SubscribeButton({ orgId, plan }: { orgId: string; plan: 'vendedores' | 'catalogo' }) {
  const { state, pending, formProps } = useFormAction<FormState>(startSubscription.bind(null, orgId, plan), { errors: {} });
  return (
    <form {...formProps} className="mt-3 flex flex-wrap items-end gap-2">
      <label className="text-[15px]">
        Código promocional
        <input name="codigo" className="campo mt-1 w-36" />
      </label>
      <button type="submit" disabled={pending} className="btn-primary disabled:opacity-60">
        Subscrever
      </button>
      {(state.errors.codigo || state.message) && <p className="w-full text-[17px] text-red-700">{state.errors.codigo ?? state.message}</p>}
    </form>
  );
}
