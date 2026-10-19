'use client';

import { uploadDocument, type FormState } from '@/app/app/actions';
import { Field, selectClass } from '@/components/Field';
import { DOC_KINDS, DOC_KIND_LABELS } from '@/domain/organization';
import { useFormAction } from '@/components/useFormAction';

export function DocumentUpload({ orgId }: { orgId: string }) {
  const { state, pending, formProps } = useFormAction<FormState>(uploadDocument.bind(null, orgId), { errors: {} }, { resetOnSuccess: true });
  const e = state.errors;

  return (
    <form {...formProps} className="space-y-4">
      <h3 className="text-sm font-semibold">Enviar documento</h3>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field name="kind" label="Tipo" required error={e.kind}>
          <select name="kind" required defaultValue="" className={selectClass}>
            <option value="" disabled>
              Escolha…
            </option>
            {DOC_KINDS.map((k) => (
              <option key={k} value={k}>
                {DOC_KIND_LABELS[k]}
              </option>
            ))}
          </select>
        </Field>
        <Field name="validoAte" label="Válido até" type="date" error={e.validoAte} hint="Se o documento tiver validade." />
      </div>
      <Field name="ficheiro" label="Ficheiro" required error={e.ficheiro} hint="PDF, JPG ou PNG, até 10 MB.">
        <input name="ficheiro" type="file" required accept="application/pdf,image/jpeg,image/png" className="mt-1 block w-full text-sm" />
      </Field>
      {state.message && (
        <p className={`text-sm ${state.ok ? 'text-tinta-700' : 'text-red-700'}`} role="status">
          {state.message}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold hover:bg-slate-50 disabled:opacity-60"
      >
        {pending ? 'A enviar…' : 'Enviar documento'}
      </button>
    </form>
  );
}
