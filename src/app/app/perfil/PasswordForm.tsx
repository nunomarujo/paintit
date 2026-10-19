'use client';

import { setPassword, type SignInState } from '@/app/entrar/actions';
import { useFormAction } from '@/components/useFormAction';

export function PasswordForm() {
  const { state, pending, formProps } = useFormAction<SignInState>(setPassword, { status: 'idle' }, { resetOnSuccess: true });
  const input = 'mt-1 w-full rounded-lg border border-slate-300 px-3 py-2';
  return (
    <form {...formProps} className="space-y-3">
      <h2 className="font-semibold">Palavra-passe</h2>
      <p className="text-sm text-slate-600">Defina ou mude a palavra-passe para entrar sem esperar pelo email.</p>
      <label className="block text-sm">
        Nova palavra-passe
        <input name="password" type="password" minLength={8} required autoComplete="new-password" className={input} />
      </label>
      <label className="block text-sm">
        Repetir
        <input name="confirmar" type="password" minLength={8} required autoComplete="new-password" className={input} />
      </label>
      {state.message && <p className={`text-sm ${state.status === 'error' ? 'text-red-700' : 'text-tinta-700'}`}>{state.message}</p>}
      <button type="submit" disabled={pending} className="rounded-lg bg-tinta-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
        Guardar palavra-passe
      </button>
    </form>
  );
}
