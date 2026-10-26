'use client';

import { changeEmail, type SignInState } from '@/app/entrar/actions';
import { Field } from '@/components/Field';
import { useFormAction } from '@/components/useFormAction';

/**
 * Mudar o mail de acesso (login), diferente do mail de contacto da empresa (esse grava-se em
 * `EntityCardForm`). Fica a pedir confirmação no mail novo antes de valer — entra-se com o mail atual
 * até esse clique, e só depois é que o antigo deixa de servir para entrar (26/10/2026, docs/DECISOES.md).
 */
export function ChangeEmailForm({ emailAtual }: { emailAtual: string }) {
  const { state, pending, formProps } = useFormAction<SignInState>(changeEmail, { status: 'idle' });

  return (
    <form {...formProps} className="space-y-3">
      <h3 className="text-[17px] font-semibold">Mail de acesso</h3>
      <p className="text-[17px] text-slate-600">
        Entra atualmente com <strong>{emailAtual}</strong>.
      </p>
      <Field name="email" label="Novo mail de acesso" type="email" required />
      {state.message && (
        <p className={`text-[17px] ${state.status === 'error' ? 'text-red-700' : 'text-tinta-700'}`} role="status">
          {state.message}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg border border-slate-300 px-4 py-2 text-[17px] font-semibold hover:bg-slate-50 disabled:opacity-60"
      >
        {pending ? 'A enviar…' : 'Pedir mudança de mail'}
      </button>
    </form>
  );
}
