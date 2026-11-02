'use client';

import type { FormState } from '@/app/app/actions';
import { useFormAction } from '@/components/useFormAction';
import { enviarFlyer } from './actions';

export function EnviarFlyer({ flyerId }: { flyerId: string }) {
  const { state, pending, formProps } = useFormAction<FormState>(enviarFlyer, { errors: {} }, { resetOnSuccess: true });
  return (
    <details className="group">
      <summary className="btn-quiet btn-sm cursor-pointer list-none [&::-webkit-details-marker]:hidden">Enviar por email</summary>
      <form {...formProps} className="mt-3 space-y-3 rounded-lg bg-paper p-4">
        <input type="hidden" name="flyer" value={flyerId} />
        <label className="block text-[15px] font-medium text-slate-700">
          Para
          <input name="para" type="text" inputMode="email" placeholder="nome@empresa.pt, outro@empresa.pt" className="campo mt-1" aria-invalid={state.errors.para ? true : undefined} />
          {state.errors.para && <span className="mt-1 block text-[15px] font-normal text-amber-800">{state.errors.para}</span>}
        </label>
        <label className="block text-[15px] font-medium text-slate-700">
          Nota (opcional)
          <textarea name="nota" rows={2} className="campo mt-1" placeholder="Uma frase para abrir o email." />
        </label>
        <div className="flex flex-wrap items-center gap-3">
          <button type="submit" disabled={pending} className="btn-primary btn-sm">
            {pending ? 'A enviar…' : 'Enviar'}
          </button>
          {state.message && <span className={`text-[15px] ${state.ok ? 'text-tinta-700' : 'text-amber-800'}`}>{state.message}</span>}
        </div>
      </form>
    </details>
  );
}
