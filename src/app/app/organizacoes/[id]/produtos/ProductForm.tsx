'use client';

import { useFormAction } from '@/components/useFormAction';
import type { FormState } from '@/app/app/actions';
import { addProduct } from '@/app/app/catalogo/actions';
import { Field, selectClass } from '@/components/Field';
import { APPLICATION_LABELS, APPLICATION_METHODS, FINISHES, PRODUCT_TYPES, PRODUCT_TYPE_LABELS } from '@/domain/catalog';

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
        <Field name="unidade" label="Vendido em" error={e.unidade}>
          <select name="unidade" defaultValue="L" className={selectClass}>
            <option value="L">Litros</option>
            <option value="kg">Quilos</option>
          </select>
        </Field>
        <Field name="rendimento" label="Rendimento (m² por L ou kg, por demão)" error={e.rendimento} />
        <Field name="embalagem" label="Embalagem (L ou kg)" error={e.embalagem} />
        <Field name="demaos" label="Demãos recomendadas" inputMode="numeric" error={e.demaos} />
        <Field name="secagem" label="Secagem entre demãos (horas)" inputMode="numeric" error={e.secagem} />
        <Field name="diluicao" label="Diluição" error={e.diluicao} placeholder="Ex.: 5–10% água" />
        <Field name="acabamento" label="Acabamento" error={e.acabamento}>
          <select name="acabamento" defaultValue="" className={selectClass}>
            <option value="">—</option>
            {FINISHES.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
        </Field>
        <Field name="uso" label="Uso" error={e.uso}>
          <select name="uso" defaultValue="" className={selectClass}>
            <option value="">—</option>
            <option value="interior">Interior</option>
            <option value="exterior">Exterior</option>
            <option value="ambos">Interior e exterior</option>
          </select>
        </Field>
        <Field name="base" label="Base" error={e.base}>
          <select name="base" defaultValue="" className={selectClass}>
            <option value="">—</option>
            <option value="aquosa">Aquosa</option>
            <option value="solvente">Solvente</option>
          </select>
        </Field>
        <Field name="preco" label="Preço de mercado por embalagem (€)" error={e.preco} hint="Sem IVA, o preço de venda ao público." />
        <Field name="precoData" label="Data do preço de mercado" type="date" error={e.precoData} />
        <Field
          name="precoFornecedor"
          label="Preço para pintores (€)"
          error={e.precoFornecedor}
          hint="Sem IVA, antes dos descontos por obra."
        />
      </div>
      <fieldset className="text-sm">
        <legend className="font-medium text-slate-700">Modos de aplicação</legend>
        <div className="mt-1 flex flex-wrap gap-4">
          {APPLICATION_METHODS.map((m) => (
            <label key={m} className="flex items-center gap-1">
              <input type="checkbox" name="modos" value={m} /> {APPLICATION_LABELS[m]}
            </label>
          ))}
        </div>
      </fieldset>
      <Field name="descricao" label="Descrição" error={e.descricao}>
        <textarea name="descricao" rows={2} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" />
      </Field>
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
