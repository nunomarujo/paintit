'use client';

import { updateProfile, type FormState } from '@/app/app/actions';
import { Field } from '@/components/Field';
import { useFormAction } from '@/components/useFormAction';

export function ProfileForm({ nome, telefone }: { nome: string; telefone: string | null }) {
  const { state, pending, formProps } = useFormAction<FormState>(updateProfile, { errors: {} });
  return (
    <form {...formProps} className="space-y-4">
      <Field name="nome" label="Nome" required defaultValue={nome} error={state.errors.nome} />
      <Field name="telefone" label="Telefone" type="tel" defaultValue={telefone ?? undefined} />
      {state.message && (
        <p className={`text-[17px] ${state.ok ? 'text-tinta-700' : 'text-red-700'}`} role="status">
          {state.message}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="btn-primary"
      >
        {pending ? 'A guardar…' : 'Guardar'}
      </button>
    </form>
  );
}
