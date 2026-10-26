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
        <input name="codigo" className="mt-1 block w-36 rounded-lg border border-slate-300 px-2 py-1.5" />
      </label>
      <button type="submit" disabled={pending} className="rounded-lg bg-tinta-600 px-3 py-2 text-[17px] font-semibold text-white disabled:opacity-60">
        Subscrever
      </button>
      {(state.errors.codigo || state.message) && <p className="w-full text-[17px] text-red-700">{state.errors.codigo ?? state.message}</p>}
    </form>
  );
}
