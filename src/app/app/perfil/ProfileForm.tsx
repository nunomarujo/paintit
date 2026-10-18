'use client';

import { useActionState } from 'react';
import { updateProfile, type FormState } from '@/app/app/actions';
import { Field } from '@/components/Field';

export function ProfileForm({ nome, telefone }: { nome: string; telefone: string | null }) {
  const [state, action, pending] = useActionState<FormState, FormData>(updateProfile, { errors: {} });
  return (
    <form action={action} className="space-y-4">
      <Field name="nome" label="Nome" required defaultValue={nome} error={state.errors.nome} />
      <Field name="telefone" label="Telefone" type="tel" defaultValue={telefone ?? undefined} />
      {state.message && (
        <p className={`text-sm ${state.ok ? 'text-tinta-700' : 'text-red-700'}`} role="status">
          {state.message}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-tinta-600 px-5 py-2 font-semibold text-white hover:bg-tinta-700 disabled:opacity-60"
      >
        {pending ? 'A guardar…' : 'Guardar'}
      </button>
    </form>
  );
}
