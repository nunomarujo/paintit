'use client';

import type { FormState } from '@/app/app/actions';
import { useFormAction } from '@/components/useFormAction';
import { addExpense } from '@/app/app/obras/actions';

/**
 * Despesa: o documento e o valor. Mais nada.
 *
 * A obra já se sabe e a data é hoje. Pedir fornecedor, categoria e número de factura aqui era
 * garantir que a despesa não se lança — e uma despesa por lançar não aparece no custo da obra, que
 * é a única razão por que isto existe (proposta de Gestão de Obra, 25/10/2026).
 */
export function ExpenseForm({ worksiteId }: { worksiteId: string }) {
  const { state, pending, formProps } = useFormAction<FormState>(addExpense.bind(null, worksiteId), { errors: {} });
  const msg = Object.values(state.errors)[0] ?? state.message;

  return (
    <form {...formProps} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-[1fr_9rem]">
        <label className="text-[17px]">
          Documento
          <input
            type="file"
            name="comprovativo"
            accept="image/jpeg,image/png,application/pdf,image/*"
            capture="environment"
            className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-[17px] file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-[15px] file:font-semibold"
          />
        </label>
        <label className="text-[17px]">
          Quanto custou
          <input
            name="valor"
            inputMode="decimal"
            placeholder="48,30"
            className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-right"
          />
        </label>
      </div>
      <label className="block text-[17px]">
        De quê <span className="text-slate-500">(opcional)</span>
        <input name="descricao" placeholder="Tinta branca, 4 latas" className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2" />
      </label>
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={pending} className="btn-primary">
          {pending ? 'A lançar…' : 'Lançar despesa'}
        </button>
        {msg && <span className="text-[15px] text-slate-600">{msg}</span>}
      </div>
      <p className="text-[15px] text-slate-500">
        O documento fica guardado e não é visível ao cliente da obra. A data é hoje; muda-se depois se for preciso.
      </p>
    </form>
  );
}
