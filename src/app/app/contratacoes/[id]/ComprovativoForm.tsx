'use client';

import type { FormState } from '@/app/app/actions';
import { EstadoDeGravacao } from '@/components/EstadoDeGravacao';
import { useFormAction } from '@/components/useFormAction';
import { registarComprovativo } from '../elementos';

/**
 * O cliente regista o que pagou numa tranche (06/11/2026): é só registo, e fica tal como foi enviado. Não
 * marca a tranche como recebida — isso é o pintor a confirmar. A nota serve, por exemplo, para dizer que o
 * pagamento foi para outro IBAN na sequência de uma adenda feita entre as partes.
 */
export function ComprovativoForm({ engagementId, tranches }: { engagementId: string; tranches: string[] }) {
  const { state, pending, repetir, formProps } = useFormAction<FormState>(registarComprovativo.bind(null, engagementId), { errors: {} }, { resetOnSuccess: true });
  const e = state.errors;
  const erro = (k: string) =>
    e[k] ? (
      <span className="mt-1 block text-[15px] font-normal text-red-700" role="alert">
        {e[k]}
      </span>
    ) : null;
  return (
    <form {...formProps} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <label className="block text-[17px] font-medium text-slate-700">
          Tranche
          <input name="tranche" list={`tranches-${engagementId}`} className="campo mt-1" defaultValue={tranches[0] ?? ''} />
          <datalist id={`tranches-${engagementId}`}>
            {[...tranches, 'Outro'].map((t) => (
              <option key={t} value={t} />
            ))}
          </datalist>
          {erro('tranche')}
        </label>
        <label className="block text-[17px] font-medium text-slate-700">
          Valor pago (€)
          <input name="valor" inputMode="decimal" className="campo mt-1" placeholder="Por exemplo: 1500,00" />
          {erro('valor')}
        </label>
        <label className="block text-[17px] font-medium text-slate-700">
          Data do pagamento
          <input name="pagoEm" type="date" className="campo mt-1" />
          {erro('pagoEm')}
        </label>
      </div>
      <label className="block text-[17px] font-medium text-slate-700">
        Comprovativo (fotografia ou PDF, até 10 MB)
        <input name="ficheiro" type="file" accept="image/jpeg,image/png,application/pdf" className="mt-1 block min-h-[44px] text-[17px]" />
        {erro('ficheiro')}
      </label>
      <label className="block text-[17px] font-medium text-slate-700">
        Nota (opcional)
        <textarea name="nota" rows={2} maxLength={1000} className="campo mt-1" placeholder="Por exemplo: pago para outro IBAN, combinado entre as partes." />
        {erro('nota')}
      </label>
      <button type="submit" className="btn-primary" disabled={pending}>
        Registar o comprovativo
      </button>
      <EstadoDeGravacao pending={pending} ok={state.ok} mensagem={state.message} repetir={repetir} />
    </form>
  );
}
