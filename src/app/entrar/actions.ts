'use server';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { safeNext } from '@/lib/redirect';
import { createClient } from '@/lib/supabase/server';

export type SignInState = { status: 'idle' | 'sent' | 'error'; message?: string; email?: string };

export async function sendSignInLink(_prev: SignInState, form: FormData): Promise<SignInState> {
  const email = String(form.get('email') ?? '').trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { status: 'error', message: 'Indique um email válido.', email };
  }
  const next = safeNext(String(form.get('seguinte') ?? ''));
  const h = await headers();
  const origin = h.get('origin') ?? `https://${h.get('host')}`;

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: `${origin}/auth/confirmar?seguinte=${encodeURIComponent(next)}` },
  });
  if (error) {
    return { status: 'error', message: 'Não foi possível enviar o email. Tente de novo dentro de alguns minutos.', email };
  }
  return { status: 'sent', email };
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD = 8;

/** Entrada com email e palavra-passe; ou criação de conta (confirmada por email). */
export async function passwordAuth(_prev: SignInState, form: FormData): Promise<SignInState> {
  const email = String(form.get('email') ?? '').trim().toLowerCase();
  const password = String(form.get('password') ?? '');
  const mode = String(form.get('modo') ?? 'entrar');
  if (!EMAIL.test(email)) return { status: 'error', message: 'Indique um email válido.', email };
  if (password.length < MIN_PASSWORD) return { status: 'error', message: `A palavra-passe tem de ter pelo menos ${MIN_PASSWORD} caracteres.`, email };
  const next = safeNext(String(form.get('seguinte') ?? ''));
  const supabase = await createClient();
  if (mode === 'criar') {
    if (password !== String(form.get('confirmar') ?? '')) return { status: 'error', message: 'As duas palavras-passe não coincidem.', email };
    const h = await headers();
    const origin = h.get('origin') ?? `https://${h.get('host')}`;
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${origin}/auth/confirmar?seguinte=${encodeURIComponent(next)}` },
    });
    if (error) return { status: 'error', message: 'Não foi possível criar a conta. Se já tem conta, entre ou peça um link.', email };
    if (!data.session) return { status: 'sent', email, message: 'confirmar' };
    redirect(next);
  }
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    return {
      status: 'error',
      message: 'Email ou palavra-passe errados. Se entrava sempre por link, peça um link e defina a palavra-passe no seu perfil.',
      email,
    };
  }
  redirect(next);
}

/** Definir ou mudar a palavra-passe de quem já tem sessão. */
export async function setPassword(_prev: SignInState, form: FormData): Promise<SignInState> {
  const password = String(form.get('password') ?? '');
  const confirm = String(form.get('confirmar') ?? '');
  if (password.length < MIN_PASSWORD) return { status: 'error', message: `Pelo menos ${MIN_PASSWORD} caracteres.` };
  if (password !== confirm) return { status: 'error', message: 'As duas palavras-passe não coincidem.' };
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { status: 'error', message: 'Não foi possível guardar. Escolha uma palavra-passe diferente e mais forte.' };
  return { status: 'sent', message: 'Palavra-passe guardada. Da próxima vez pode entrar com ela.' };
}
