'use client';

import { useState } from 'react';
import type { FormState } from '@/app/app/actions';
import { CONFIRMACAO_TODO_O_PAIS } from '@/domain/coberturaDaEmpresa';
import { ConcelhosPicker } from '@/components/ConcelhosPicker';
import { Field } from '@/components/Field';
import { useFormAction } from '@/components/useFormAction';
import { setSurveyCoverage } from './actions';

const button = 'btn-secondary';
const msg = (s: FormState) => {
  const m = Object.values(s.errors)[0] ?? s.message;
  return m ? (
    <p className={`text-[17px] ${s.ok ? 'text-tinta-700' : 'text-red-700'}`} role="status">
      {m}
    </p>
  ) : null;
};

export function CoverageForm({
  orgId,
  initial,
  todoOPais = false,
  concelhoDaEmpresa = null,
}: {
  orgId: string;
  initial: string[];
  todoOPais?: boolean;
  concelhoDaEmpresa?: string | null;
}) {
  const { state, pending, formProps } = useFormAction<FormState>(setSurveyCoverage.bind(null, orgId), { errors: {} });
  // «Todo o país» é uma escolha explícita, com a confirmação escrita ao lado — nunca o que fica quando a
  // lista está vazia (promotor, 06/11/2026).
  const [todo, setTodo] = useState(todoOPais);
  return (
    <form {...formProps} className="space-y-4">
      {!todo && (
        <Field
          name="concelhos"
          label="Concelhos"
          hint={
            concelhoDaEmpresa
              ? `Só chegam oportunidades dos concelhos escolhidos. Sem nenhum, fica o da morada da empresa: ${concelhoDaEmpresa}.`
              : 'Pelo menos um. Só chegam oportunidades dos concelhos escolhidos.'
          }
        >
          <ConcelhosPicker name="concelhos" defaultValue={initial} />
        </Field>
      )}
      <label className="flex min-h-[44px] max-w-[54ch] items-start gap-3 text-[17px] text-slate-800">
        <input
          type="checkbox"
          name="todo_o_pais"
          checked={todo}
          onChange={(e) => setTodo(e.target.checked)}
          className="mt-1 h-5 w-5 flex-none"
        />
        <span>
          <span className="font-semibold">Todo o país</span>
          <span className="block text-[15px] text-slate-600">{CONFIRMACAO_TODO_O_PAIS}</span>
        </span>
      </label>
      <button type="submit" disabled={pending} className={button}>
        {pending ? 'A guardar…' : 'Guardar'}
      </button>
      <div>{msg(state)}</div>
    </form>
  );
}
