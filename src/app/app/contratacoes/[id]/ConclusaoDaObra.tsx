'use client';

import type { FormState } from '@/app/app/actions';
import { EstadoDeGravacao } from '@/components/EstadoDeGravacao';
import { useFormAction } from '@/components/useFormAction';
import type { Lado, PassoDaConclusao } from '@/domain/garantia';
import { registarPassoDaConclusao } from '../conclusao';

const ROTULO: Record<PassoDaConclusao, string> = {
  declarou: 'Declarar a obra concluída',
  confirmou: 'Confirmar a conclusão',
  discordou: 'Discordar, com a razão',
  juntou_prova: 'Juntar prova',
};

/** Um passo da conclusão da obra: o formulário mínimo de cada um. O servidor valida tudo outra vez. */
export function PassoDaConclusaoForm({ engagementId, lado, passo }: { engagementId: string; lado: Lado; passo: PassoDaConclusao }) {
  const { state, pending, repetir, formProps } = useFormAction<FormState>(registarPassoDaConclusao.bind(null, engagementId, lado, passo), { errors: {} }, { resetOnSuccess: true });
  const e = state.errors;
  const erro = (k: string) =>
    e[k] ? (
      <span className="mt-1 block text-[15px] font-normal text-red-700" role="alert">
        {e[k]}
      </span>
    ) : null;
  return (
    <form {...formProps} className="space-y-3 rounded-lg border border-slate-200 p-4">
      {passo === 'declarou' && (
        <label className="block text-[17px] font-medium text-slate-700">
          Data em que a obra ficou concluída
          <input type="date" name="dataConclusao" className="campo mt-1 max-w-xs" />
          {erro('dataConclusao')}
        </label>
      )}
      {passo === 'discordou' && (
        <label className="block text-[17px] font-medium text-slate-700">
          Razão
          <textarea name="razao" rows={3} maxLength={2000} className="campo mt-1" />
          {erro('razao')}
        </label>
      )}
      {(passo === 'declarou' || passo === 'juntou_prova' || passo === 'discordou') && (
        <label className="block text-[17px] font-medium text-slate-700">
          {passo === 'juntou_prova' ? 'Fotografia ou PDF (até 10 MB)' : 'Prova, se houver (fotografia ou PDF, até 10 MB)'}
          <input name="ficheiro" type="file" accept="image/jpeg,image/png,application/pdf" className="mt-1 block min-h-[44px] text-[17px]" />
          {erro('ficheiro')}
        </label>
      )}
      <button type="submit" className={passo === 'confirmou' || passo === 'declarou' ? 'btn-primary' : 'btn-secondary'} disabled={pending}>
        {ROTULO[passo]}
      </button>
      <EstadoDeGravacao pending={pending} ok={state.ok} mensagem={state.message} repetir={repetir} />
    </form>
  );
}
