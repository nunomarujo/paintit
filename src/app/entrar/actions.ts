'use server';

import { headers } from 'next/headers';
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
