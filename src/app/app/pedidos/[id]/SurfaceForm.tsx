'use client';

import type { FormState } from '@/app/app/actions';
import { addSurface } from '@/app/app/pedidos/actions';
import { Field, selectClass } from '@/components/Field';
import { AREA_SOURCES, AREA_SOURCE_LABELS, SURFACE_KINDS, SURFACE_KIND_LABELS } from '@/domain/request';
import { useFormAction } from '@/components/useFormAction';

export function SurfaceForm({ requestId }: { requestId: string }) {
  const { state, pending, formProps } = useFormAction<FormState>(
    addSurface.bind(null, requestId),
    { errors: {} },
    { resetOnSuccess: true },
  );
  const e = state.errors;

  return (
    <form {...formProps} className="space-y-4">
      <h3 className="text-sm font-semibold">Acrescentar superfície</h3>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field name="kind" label="Superfície" required error={e.kind}>
          <select name="kind" required defaultValue="fachada" className={selectClass}>
            {SURFACE_KINDS.map((k) => (
              <option key={k} value={k}>
                {SURFACE_KIND_LABELS[k]}
              </option>
            ))}
          </select>
        </Field>
        <Field name="descricao" label="Descrição" error={e.descricao} hint="Ex.: fachada norte, com fissuras." />
        <Field name="origem" label="Origem da medida" error={e.origem}>
          <select name="origem" defaultValue="estimativa" className={selectClass}>
            {AREA_SOURCES.map((s) => (
              <option key={s} value={s}>
                {AREA_SOURCE_LABELS[s]}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <p className="text-xs text-slate-600">Indique a área, ou a largura e a altura (os vãos são descontados).</p>
      <div className="grid gap-4 sm:grid-cols-5">
        <Field name="area" label="Área (m²)" inputMode="text" error={e.area} />
        <Field name="largura" label="Largura (m)" inputMode="text" error={e.largura} />
        <Field name="altura" label="Altura (m)" inputMode="text" error={e.altura} />
        <Field name="vaos" label="Vãos (m²)" inputMode="text" error={e.vaos} hint="Janelas e portas." />
        <Field name="quantidade" label="Quantidade" inputMode="numeric" defaultValue="1" error={e.quantidade} />
      </div>
      {state.message && (
        <p className="text-sm text-red-700" role="alert">
          {state.message}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold hover:bg-slate-50 disabled:opacity-60"
      >
        {pending ? 'A acrescentar…' : 'Acrescentar'}
      </button>
    </form>
  );
}
