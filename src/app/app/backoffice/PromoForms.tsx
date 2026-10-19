'use client';

import { useFormAction } from '@/components/useFormAction';
import type { FormState } from '@/app/app/actions';
import { createPromoCode, setPromoActive } from '@/app/app/backoffice/actions';

const input = 'mt-1 w-full rounded-lg border border-slate-300 px-3 py-2';

export function CreatePromoCode() {
  const { state, pending, formProps } = useFormAction<FormState>(createPromoCode, { errors: {} });
  const field = (name: string, label: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <label className="block text-sm">
      {label}
      <input name={name} className={input} {...props} />
      {state.errors[name] && <span className="text-red-700">{state.errors[name]}</span>}
    </label>
  );
  return (
    <form {...formProps} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
      {field('code', 'Código', { placeholder: 'ARRANQUE-2027', required: true })}
      {field('desconto', 'Desconto (%)', { inputMode: 'decimal', placeholder: '1 a 100', required: true })}
      {field('validade', 'Válido até (opcional)', { type: 'date' })}
      {field('usos', 'Utilizações máximas (opcional)', { inputMode: 'numeric' })}
      {field('notas', 'Notas internas')}
      <div className="sm:col-span-2 lg:col-span-5">
        <button type="submit" disabled={pending} className="rounded-lg bg-tinta-600 px-4 py-2 text-sm font-semibold text-white">
          Criar código
        </button>
        {state.message && <span className={`ml-3 text-sm ${state.ok ? 'text-tinta-700' : 'text-red-700'}`}>{state.message}</span>}
      </div>
    </form>
  );
}

export function TogglePromo({ id, active }: { id: string; active: boolean }) {
  const { pending, formProps } = useFormAction<FormState>(setPromoActive.bind(null, id, !active), { errors: {} });
  return (
    <form {...formProps}>
      <button type="submit" disabled={pending} className="rounded-lg border border-slate-300 px-3 py-1 text-xs hover:bg-slate-50">
        {active ? 'Desativar' : 'Reativar'}
      </button>
    </form>
  );
}
