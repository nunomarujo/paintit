'use client';

import type { FormState } from '@/app/app/actions';
import { useFormAction } from '@/components/useFormAction';
import { decidirCampanhaCrm } from './actions';

export function DecidirCampanha({ id }: { id: string }) {
  const { state, pending, formProps } = useFormAction<FormState>(decidirCampanhaCrm, { errors: {} });
  return (
    <form {...formProps} className="mt-3 space-y-3">
      <input type="hidden" name="campanha" value={id} />
      <label className="block text-[15px] font-medium text-slate-700">
        Correção pedida (só se não aprovar)
        <textarea name="nota" rows={2} className="campo mt-1" aria-invalid={state.errors.nota ? true : undefined} />
        {state.errors.nota && <span className="mt-1 block text-[15px] font-normal text-amber-800">{state.errors.nota}</span>}
      </label>
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" name="decisao" value="aprovar" disabled={pending} className="btn-primary btn-sm">Aprovar</button>
        <button type="submit" name="decisao" value="corrigir" disabled={pending} className="btn-secondary btn-sm">Pedir correção</button>
        {state.message && <span className={`text-[15px] ${state.ok ? 'text-tinta-700' : 'text-amber-800'}`}>{state.message}</span>}
      </div>
    </form>
  );
}
