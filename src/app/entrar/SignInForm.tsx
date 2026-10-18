'use client';

import { useActionState } from 'react';
import { sendSignInLink, type SignInState } from './actions';

export function SignInForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState<SignInState, FormData>(sendSignInLink, { status: 'idle' });

  if (state.status === 'sent') {
    return (
      <div className="rounded-xl bg-tinta-50 p-4 text-sm" role="status">
        Enviámos um link para <strong>{state.email}</strong>. Abra-o neste dispositivo para entrar. Se não o encontrar,
        veja também a pasta de spam.
      </div>
    );
  }

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="seguinte" value={next} />
      <label className="block text-sm font-medium text-slate-700">
        Email
        <input
          name="email"
          type="email"
          autoComplete="email"
          required
          defaultValue={state.email}
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-base"
        />
      </label>
      {state.status === 'error' && (
        <p className="text-sm text-red-700" role="alert">
          {state.message}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-tinta-600 px-4 py-2 font-semibold text-white hover:bg-tinta-700 disabled:opacity-60"
      >
        {pending ? 'A enviar…' : 'Enviar link de entrada'}
      </button>
    </form>
  );
}
