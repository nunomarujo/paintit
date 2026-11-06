'use client';

import type { FormState } from '@/app/app/actions';
import { useFormAction } from '@/components/useFormAction';
import { descobrirContactos } from './actions';

export function Descobrir({ zonaId }: { zonaId: string }) {
  const { state, pending, formProps } = useFormAction<FormState>(descobrirContactos, { errors: {} });
  return (
    <form {...formProps} className="mt-3 flex flex-wrap items-center gap-3">
      <input type="hidden" name="zona" value={zonaId} />
      <button type="submit" disabled={pending} className="btn-secondary btn-sm">
        {pending ? 'A pesquisar…' : 'Pesquisar contactos'}
      </button>
      {state.message && <span className={`text-[15px] ${state.ok ? 'text-tinta-700' : 'text-amber-800'}`}>{state.message}</span>}
    </form>
  );
}
