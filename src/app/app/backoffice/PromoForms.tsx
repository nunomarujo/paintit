'use client';

import { useFormAction } from '@/components/useFormAction';
import type { FormState } from '@/app/app/actions';
import { createPromoCode, setPromoActive, setSupplierPlan } from '@/app/app/backoffice/actions';

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

export function SupplierPlanForm({ suppliers }: { suppliers: { id: string; nome: string }[] }) {
  const { state, pending, formProps } = useFormAction<FormState>(setSupplierPlan, { errors: {} });
  const err = (k: string) => state.errors[k] && <span className="text-red-700">{state.errors[k]}</span>;
  return (
    <form {...formProps} className="grid gap-3 sm:grid-cols-4">
      <label className="block text-sm">
        Fornecedor
        <select name="fornecedor" className={input} defaultValue="">
          <option value="">—</option>
          {suppliers.map((s) => (
            <option key={s.id} value={s.id}>
              {s.nome}
            </option>
          ))}
        </select>
        {err('fornecedor')}
      </label>
      <label className="block text-sm">
        Plano
        <select name="plano" className={input} defaultValue="catalogo">
          <option value="vendedores">Listagem de vendedores (44 €)</option>
          <option value="catalogo">Catálogo de produtos (49 €)</option>
          <option value="cancelar">Cancelar subscrição</option>
        </select>
        {err('plano')}
      </label>
      <label className="block text-sm">
        Código promocional
        <input name="codigo" className={input} />
        {err('codigo')}
      </label>
      <div className="flex items-end">
        <button type="submit" disabled={pending} className="rounded-lg bg-tinta-600 px-4 py-2 text-sm font-semibold text-white">
          Aplicar
        </button>
        {state.message && <span className={`ml-3 text-sm ${state.ok ? 'text-tinta-700' : 'text-red-700'}`}>{state.message}</span>}
      </div>
    </form>
  );
}
