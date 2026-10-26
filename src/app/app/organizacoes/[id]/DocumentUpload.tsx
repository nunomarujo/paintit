'use client';

import { uploadDocument, type FormState } from '@/app/app/actions';
import { Field, selectClass } from '@/components/Field';
import { useState } from 'react';
import { ALLOWED_DOCS, DOC_KIND_LABELS, DOC_KIND_WHY, type DocKind, type OrgKind } from '@/domain/organization';
import { useFormAction } from '@/components/useFormAction';

export function DocumentUpload({ orgId, orgKind }: { orgId: string; orgKind: OrgKind }) {
  const [kind, setKind] = useState<DocKind | ''>('');
  const { state, pending, formProps } = useFormAction<FormState>(uploadDocument.bind(null, orgId), { errors: {} }, { resetOnSuccess: true });
  const e = state.errors;

  return (
    <form {...formProps} className="space-y-4">
      <h3 className="text-[17px] font-semibold">Enviar documento</h3>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field name="kind" label="Tipo" required error={e.kind}>
          <select name="kind" required value={kind} onChange={(ev) => setKind(ev.target.value as DocKind)} className={selectClass}>
            <option value="" disabled>
              Escolha…
            </option>
            {ALLOWED_DOCS[orgKind].map((k) => (
              <option key={k} value={k}>
                {DOC_KIND_LABELS[k]}
              </option>
            ))}
          </select>
        </Field>
        <Field name="validoAte" label="Válido até" type="date" error={e.validoAte} hint="Se o documento tiver validade." />
        {kind === 'alvara_impic' && (
          <Field name="classe" label="Classe do alvará (1 a 9)" inputMode="numeric" required error={e.classe} hint="Define o valor máximo das obras." />
        )}
      </div>
      {kind && <p className="text-[15px] text-slate-600">{DOC_KIND_WHY[kind]}</p>}
      <Field name="ficheiro" label="Ficheiro" required error={e.ficheiro} hint="PDF, JPG ou PNG, até 10 MB.">
        <input name="ficheiro" type="file" required accept="application/pdf,image/jpeg,image/png" className="mt-1 block w-full text-[17px]" />
      </Field>
      {state.message && (
        <p className={`text-[17px] ${state.ok ? 'text-tinta-700' : 'text-red-700'}`} role="status">
          {state.message}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg border border-slate-300 px-4 py-2 text-[17px] font-semibold hover:bg-slate-50 disabled:opacity-60"
      >
        {pending ? 'A enviar…' : 'Enviar documento'}
      </button>
    </form>
  );
}
