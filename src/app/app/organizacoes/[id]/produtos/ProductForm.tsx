'use client';

import { useFormAction } from '@/components/useFormAction';
import type { FormState } from '@/app/app/actions';
import { addProduct } from '@/app/app/catalogo/actions';
import { Field, selectClass } from '@/components/Field';
import { PRODUCT_TYPES, PRODUCT_TYPE_LABELS } from '@/domain/catalog';

export function ProductForm({ orgId }: { orgId: string }) {
  const { state, pending, formProps } = useFormAction<FormState>(addProduct.bind(null, orgId), { errors: {} }, { resetOnSuccess: true });
  const e = state.errors;
  return (
    <form {...formProps} className="space-y-4">
      <h2 className="font-semibold">Acrescentar produto</h2>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field name="marca" label="Marca" required error={e.marca} />
        <Field name="nome" label="Nome" required error={e.nome} />
        <Field name="referencia" label="Referência" error={e.referencia} />
        <Field name="tipo" label="Tipo" required error={e.tipo}>
          <select name="tipo" defaultValue="tinta_exterior" className={selectClass}>
            {PRODUCT_TYPES.map((t) => (
              <option key={t} value={t}>
                {PRODUCT_TYPE_LABELS[t]}
              </option>
            ))}
          </select>
        </Field>
        <Field name="rendimento" label="Rendimento (m² por litro, por demão)" error={e.rendimento} />
        <Field name="embalagem" label="Embalagem (litros)" error={e.embalagem} />
        <Field name="preco" label="Preço de referência por embalagem (€)" error={e.preco} hint="Sem IVA." />
        <Field name="precoData" label="Data do preço" type="date" error={e.precoData} />
      </div>
      <Field name="ficha" label="Ficha técnica" error={e.ficha} hint="PDF até 10 MB.">
        <input name="ficha" type="file" accept="application/pdf" className="mt-1 block w-full text-sm" />
      </Field>
      {state.message && (
        <p className={`text-sm ${state.ok ? 'text-tinta-700' : 'text-red-700'}`} role="status">
          {state.message}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-tinta-600 px-5 py-2 text-sm font-semibold text-white hover:bg-tinta-700 disabled:opacity-60"
      >
        {pending ? 'A guardar…' : 'Acrescentar'}
      </button>
    </form>
  );
}
