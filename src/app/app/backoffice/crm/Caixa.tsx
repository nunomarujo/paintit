'use client';

import type { FormState } from '@/app/app/actions';
import { useFormAction } from '@/components/useFormAction';
import { decidirMensagemCrm } from './actions';

export function Caixa({ id, rascunho }: { id: string; rascunho: { assunto: string; corpo: string } | null }) {
  const { state, pending, formProps } = useFormAction<FormState>(decidirMensagemCrm, { errors: {} });
  return (
    <form {...formProps} className="mt-3 space-y-3">
      <input type="hidden" name="mensagem" value={id} />
      {rascunho && (
        <>
          <label className="block text-[15px] font-medium text-slate-700">
            Assunto da resposta
            <input name="assunto" defaultValue={rascunho.assunto} className="campo mt-1" />
          </label>
          <label className="block text-[15px] font-medium text-slate-700">
            Resposta (rascunho: rever antes de enviar)
            <textarea name="corpo" rows={6} defaultValue={rascunho.corpo} className="campo mt-1" aria-invalid={state.errors.corpo ? true : undefined} />
            {state.errors.corpo && <span className="mt-1 block text-[15px] font-normal text-amber-800">{state.errors.corpo}</span>}
          </label>
        </>
      )}
      <div className="flex flex-wrap items-center gap-3">
        {rascunho && (
          <button type="submit" name="acao" value="enviar" disabled={pending} className="btn-primary btn-sm">
            {pending ? 'A enviar…' : 'Enviar resposta'}
          </button>
        )}
        <button type="submit" name="acao" value="tratada" disabled={pending} className="btn-secondary btn-sm">
          Marcar como tratada
        </button>
        {state.message && <span className={`text-[15px] ${state.ok ? 'text-tinta-700' : 'text-amber-800'}`}>{state.message}</span>}
      </div>
    </form>
  );
}
