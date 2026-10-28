'use client';

import { setPassword, type SignInState } from '@/app/entrar/actions';
import { useFormAction } from '@/components/useFormAction';
import { PasswordInput } from '@/components/PasswordInput';

export function PasswordForm() {
  const { state, pending, formProps } = useFormAction<SignInState>(setPassword, { status: 'idle' }, { resetOnSuccess: true });
  const input = 'mt-1 campo';
  return (
    <form {...formProps} className="space-y-3">
      <h2 className="font-semibold">Palavra-passe</h2>
      <p className="text-[17px] text-slate-600">Defina ou mude a palavra-passe para entrar sem esperar pelo email.</p>
      <label className="block text-[17px]">
        Nova palavra-passe
        <PasswordInput name="password" autoComplete="new-password" className={input} />
      </label>
      <label className="block text-[17px]">
        Repetir
        <PasswordInput name="confirmar" autoComplete="new-password" className={input} />
      </label>
      {state.message && <p className={`text-[17px] ${state.status === 'error' ? 'text-red-700' : 'text-tinta-700'}`}>{state.message}</p>}
      <button type="submit" disabled={pending} className="rounded-lg bg-tinta-600 px-4 py-2 text-[17px] font-semibold text-white disabled:opacity-60">
        Guardar palavra-passe
      </button>
    </form>
  );
}
