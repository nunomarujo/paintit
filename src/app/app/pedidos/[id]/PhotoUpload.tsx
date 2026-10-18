'use client';

import { useActionState, useEffect, useRef } from 'react';
import type { FormState } from '@/app/app/actions';
import { uploadPhoto } from '@/app/app/pedidos/actions';
import { Field, selectClass } from '@/components/Field';
import { PHOTO_KINDS, PHOTO_KIND_LABELS } from '@/domain/photo';

export function PhotoUpload({ requestId }: { requestId: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(uploadPhoto.bind(null, requestId), { errors: {} });
  const formRef = useRef<HTMLFormElement>(null);
  const e = state.errors;

  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={action} className="space-y-4">
      <h3 className="text-sm font-semibold">Acrescentar fotografia</h3>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field name="kind" label="Tipo" required error={e.kind}>
          <select name="kind" required defaultValue="geral" className={selectClass}>
            {PHOTO_KINDS.map((k) => (
              <option key={k} value={k}>
                {PHOTO_KIND_LABELS[k]}
              </option>
            ))}
          </select>
        </Field>
        <Field name="legenda" label="Legenda" error={e.legenda} hint="Opcional. Ex.: fissura no teto de uma varanda." />
      </div>
      <Field name="ficheiro" label="Fotografia" required error={e.ficheiro} hint="JPG ou PNG, até 10 MB.">
        <input name="ficheiro" type="file" required accept="image/jpeg,image/png" className="mt-1 block w-full text-sm" />
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
        {pending ? 'A enviar…' : 'Enviar fotografia'}
      </button>
    </form>
  );
}
