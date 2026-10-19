'use client';

import { useState } from 'react';
import { passwordAuth, sendSignInLink, type SignInState } from './actions';
import { useFormAction } from '@/components/useFormAction';

type Mode = 'entrar' | 'criar' | 'link';
const input = 'mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-base';
const button = 'w-full rounded-lg bg-tinta-600 px-4 py-2 font-semibold text-white hover:bg-tinta-700 disabled:opacity-60';

export function SignInForm({ next }: { next: string }) {
  const [mode, setMode] = useState<Mode>('entrar');
  const pw = useFormAction<SignInState>(passwordAuth, { status: 'idle' });
  const link = useFormAction<SignInState>(sendSignInLink, { status: 'idle' });
  const state = mode === 'link' ? link.state : pw.state;

  if (state.status === 'sent') {
    return (
      <div className="rounded-xl bg-tinta-50 p-4 text-sm" role="status">
        {mode === 'criar' ? (
          <>
            Conta criada. Enviámos um email para <strong>{state.email}</strong> para confirmar o endereço; depois disso entra
            com a sua palavra-passe.
          </>
        ) : (
          <>
            Enviámos um link para <strong>{state.email}</strong>. Abra-o neste dispositivo para entrar. Se não o encontrar, veja
            também a pasta de spam.
          </>
        )}
      </div>
    );
  }

  const tab = (m: Mode, label: string) => (
    <button
      type="button"
      onClick={() => setMode(m)}
      className={`flex-1 rounded-lg px-3 py-1.5 text-sm ${mode === m ? 'bg-white font-semibold shadow-sm' : 'text-slate-600'}`}
    >
      {label}
    </button>
  );

  return (
    <div className="space-y-4">
      <div className="flex gap-1 rounded-xl bg-slate-100 p-1">
        {tab('entrar', 'Entrar')}
        {tab('criar', 'Criar conta')}
        {tab('link', 'Link por email')}
      </div>
      {mode === 'link' ? (
        <form {...link.formProps} className="space-y-4">
          <input type="hidden" name="seguinte" value={next} />
          <label className="block text-sm font-medium text-slate-700">
            Email
            <input name="email" type="email" autoComplete="email" required defaultValue={link.state.email} className={input} />
          </label>
          <p className="text-xs text-slate-500">Sem palavra-passe, ou se a esqueceu: entra pelo link e pode defini-la no perfil.</p>
          {link.state.status === 'error' && (
            <p className="text-sm text-red-700" role="alert">
              {link.state.message}
            </p>
          )}
          <button type="submit" disabled={link.pending} className={button}>
            {link.pending ? 'A enviar…' : 'Enviar link de entrada'}
          </button>
        </form>
      ) : (
        <form {...pw.formProps} className="space-y-4">
          <input type="hidden" name="seguinte" value={next} />
          <input type="hidden" name="modo" value={mode} />
          <label className="block text-sm font-medium text-slate-700">
            Email
            <input name="email" type="email" autoComplete="email" required defaultValue={pw.state.email} className={input} />
          </label>
          <label className="block text-sm font-medium text-slate-700">
            Palavra-passe
            <input
              name="password"
              type="password"
              required
              minLength={8}
              autoComplete={mode === 'criar' ? 'new-password' : 'current-password'}
              className={input}
            />
          </label>
          {pw.state.status === 'error' && (
            <p className="text-sm text-red-700" role="alert">
              {pw.state.message}
            </p>
          )}
          <button type="submit" disabled={pw.pending} className={button}>
            {pw.pending ? 'Um momento…' : mode === 'criar' ? 'Criar conta' : 'Entrar'}
          </button>
        </form>
      )}
    </div>
  );
}
