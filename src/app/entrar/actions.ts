'use server';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { LIMIAR_FUGAS, mensagemDeFuga } from '@/domain/pwned';
import { pwnedCount } from '@/lib/pwned';
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
    // Palavra-passe já vista em fugas de dados. O Supabase só faz esta verificação a partir do plano
    // Pro, por isso fazemo-la nós — e do mesmo modo, sem a palavra-passe sair do servidor
    // (src/lib/pwned.ts). Só na criação e na mudança: a quem já tem conta não se tranca a entrada.
    const fuga = await pwnedCount(password);
    if (fuga.ocorrencias >= LIMIAR_FUGAS) return { status: 'error', message: mensagemDeFuga(fuga.ocorrencias), email };
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
    if (error.code === 'user_banned' || /banned/i.test(error.message)) redirect('/conta-bloqueada');
    return {
      status: 'error',
      message: 'Email ou palavra-passe errados. Se entrava sempre por link, peça um link e defina a palavra-passe no seu perfil.',
      email,
    };
  }
  redirect(next);
}

/**
 * Mudar o mail de acesso (26/10/2026, docs/DECISOES.md): fica a pedir confirmação no mail novo antes de
 * valer — a conta continua a entrar com o mail antigo até esse clique, e só depois é que o Supabase
 * Auth troca (o gatilho `sync_profile_email`, já em produção, mantém `profiles.email` ao dia nesse
 * momento — é aí que "apaga o 1º mail", nunca antes). `/auth/confirmar` (PKCE) já trata genericamente
 * este tipo de link, sem precisar de nenhuma alteração.
 */
export async function changeEmail(_prev: SignInState, form: FormData): Promise<SignInState> {
  const email = String(form.get('email') ?? '').trim().toLowerCase();
  if (!EMAIL.test(email)) return { status: 'error', message: 'Indique um email válido.' };
  const h = await headers();
  const origin = h.get('origin') ?? `https://${h.get('host')}`;
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ email }, { emailRedirectTo: `${origin}/auth/confirmar?seguinte=${encodeURIComponent('/app')}` });
  if (error) {
    return { status: 'error', message: 'Não foi possível pedir a mudança. Confirme o email e tente de novo.' };
  }
  return {
    status: 'sent',
    email,
    message: `Enviámos um link de confirmação para ${email}. Enquanto não o abrir, continua a entrar com o mail atual.`,
  };
}

/** Definir ou mudar a palavra-passe de quem já tem sessão. */
export async function setPassword(_prev: SignInState, form: FormData): Promise<SignInState> {
  const password = String(form.get('password') ?? '');
  const confirm = String(form.get('confirmar') ?? '');
  if (password.length < MIN_PASSWORD) return { status: 'error', message: `Pelo menos ${MIN_PASSWORD} caracteres.` };
  if (password !== confirm) return { status: 'error', message: 'As duas palavras-passe não coincidem.' };
  const fuga = await pwnedCount(password);
  if (fuga.ocorrencias >= LIMIAR_FUGAS) return { status: 'error', message: mensagemDeFuga(fuga.ocorrencias) };
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { status: 'error', message: 'Não foi possível guardar. Escolha uma palavra-passe diferente e mais forte.' };
  return { status: 'sent', message: 'Palavra-passe guardada. Da próxima vez pode entrar com ela.' };
}
