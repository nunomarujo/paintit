'use client';

import type { FormState } from '@/app/app/actions';
import { useFormAction } from '@/components/useFormAction';
import { emitir } from './actions';

export function EmitirRelatorio({ requestId, destinatario, pedidoId, rotulo }: { requestId: string; destinatario: 'cliente' | 'pintor' | 'backoffice'; pedidoId: string | null; rotulo: string }) {
  const { state, pending, formProps } = useFormAction<FormState>(() => emitir(requestId, destinatario, pedidoId), { errors: {} });
  return (
    <form {...formProps} className="inline-flex flex-wrap items-center gap-2">
      <button type="submit" className={destinatario === 'backoffice' ? 'btn-secondary btn-sm' : 'btn-primary btn-sm'} disabled={pending}>
        {rotulo}
      </button>
      {state.message && <span className={`text-[15px] ${state.ok ? 'text-slate-700' : 'text-amber-800'}`}>{state.message}</span>}
    </form>
  );
}
