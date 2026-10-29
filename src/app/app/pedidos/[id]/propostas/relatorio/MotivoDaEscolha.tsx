'use client';

import type { FormState } from '@/app/app/actions';
import { useFormAction } from '@/components/useFormAction';

/** Escrever o motivo da escolha. Fora do papel: ao imprimir sai o texto, não o formulário. */
export function MotivoDaEscolha({
  action,
  inicial,
}: {
  action: (state: FormState, form: FormData) => Promise<FormState>;
  inicial: string | null;
}) {
  const { state, pending, formProps } = useFormAction<FormState>(action, { errors: {} });
  return (
    <form {...formProps} className="mt-3 print:hidden">
      <label className="block text-[15px] font-medium text-slate-700">
        Porque é que escolheu esta proposta
        <textarea
          name="motivo"
          rows={4}
          maxLength={4000}
          defaultValue={inicial ?? ''}
          placeholder="Por exemplo: escolhemos a proposta B porque inclui a impermeabilização das platibandas, que as outras deixam de fora, e porque dá dois anos a mais de garantia."
          className="mt-1 campo font-normal"
        />
      </label>
      <p className="mt-1 text-[15px] text-slate-500">
        Entra no relatório numa secção própria, dita de si. Quem o ler sabe o que é cálculo da plataforma e o que é
        decisão sua.
      </p>
      <div className="mt-2 flex items-center gap-3">
        <button type="submit" disabled={pending} className="btn-secondary">
          {pending ? 'A guardar…' : 'Guardar motivo'}
        </button>
        {state.message && (
          <span className={`text-[15px] ${state.ok ? 'text-tinta-700' : 'text-red-700'}`} role="status">
            {state.message}
          </span>
        )}
      </div>
    </form>
  );
}
