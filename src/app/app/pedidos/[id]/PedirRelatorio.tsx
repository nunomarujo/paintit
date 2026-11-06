'use client';

import type { FormState } from '@/app/app/actions';
import { EstadoDeGravacao } from '@/components/EstadoDeGravacao';
import { useFormAction } from '@/components/useFormAction';
import { pedirRelatorio } from '../relatorio-actions';

/** «Pedir o relatório desta obra»: o motivo, uma nota opcional, e mais nada. Gratuito. */
export function PedirRelatorio({ requestId }: { requestId: string }) {
  const { state, pending, repetir, formProps } = useFormAction<FormState>(pedirRelatorio.bind(null, requestId), { errors: {} }, { resetOnSuccess: true });
  return (
    <form {...formProps} className="space-y-3">
      <fieldset>
        <legend className="text-[17px] font-medium text-slate-700">Motivo</legend>
        <div className="mt-1 flex flex-wrap gap-x-6">
          {[
            ['litigio', 'Litígio'],
            ['disputa_de_consumo', 'Disputa de consumo'],
            ['outro', 'Outro'],
          ].map(([v, l]) => (
            <label key={v} className="flex min-h-[44px] items-center gap-2 text-[17px]">
              <input type="radio" name="motivo" value={v} defaultChecked={v === 'litigio'} />
              {l}
            </label>
          ))}
        </div>
        {state.errors.motivo && <p className="text-[15px] text-red-700">{state.errors.motivo}</p>}
      </fieldset>
      <label className="block text-[17px] font-medium text-slate-700">
        Nota (opcional)
        <textarea name="nota" rows={2} maxLength={1000} className="campo mt-1" />
      </label>
      <button type="submit" className="btn-secondary" disabled={pending}>
        Pedir o relatório desta obra
      </button>
      <EstadoDeGravacao pending={pending} ok={state.ok} mensagem={state.message} repetir={repetir} />
    </form>
  );
}
