'use server';

import { headers } from 'next/headers';
import { createClient } from '@/lib/supabase/server';

export type Estado = {
  errors: Record<string, string | undefined>;
  message?: string;
  /** Registo feito e email enviado: a página mostra «veja o email». */
  enviado?: boolean;
  email?: string;
};

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Registo do condómino pelo código do prédio. Duas coisas acontecem: a linha fica criada (ou
 * completada) na base, pela função `registar_condomino`, e segue o email com o link de entrada —
 * o mesmo link mágico com que toda a gente entra, apontado para a área do condómino. Na primeira
 * sessão a linha liga-se à conta pelo email (`reclamar_acesso_de_condomino`, no layout da app).
 */
export async function registar(codigo: string, _prev: Estado, form: FormData): Promise<Estado> {
  const fracao = String(form.get('fracao') ?? '').trim();
  const andar = String(form.get('andar') ?? '').trim();
  const nome = String(form.get('nome') ?? '').trim();
  const email = String(form.get('email') ?? '').trim().toLowerCase();
  const telemovel = String(form.get('telemovel') ?? '').trim();
  const errors: Estado['errors'] = {};
  if (!fracao) errors.fracao = 'Indique a fração (ex.: 3.º Esq).';
  if (!andar) errors.andar = 'Indique o andar.';
  if (!EMAIL.test(email)) errors.email = 'Indique um email válido.';
  if (telemovel.replace(/\D/g, '').length < 9) errors.telemovel = 'Indique o telemóvel, com 9 dígitos.';
  if (Object.keys(errors).length) return { errors };

  const supabase = await createClient();
  const { error } = await supabase.rpc('registar_condomino', {
    p_codigo: codigo,
    p_fracao: fracao,
    p_andar: andar,
    p_email: email,
    p_telemovel: telemovel,
    p_nome: nome,
  });
  if (error) {
    return { errors: {}, message: error.message.includes('código') ? 'Este código já não está activo. Peça um novo à administração.' : 'Não foi possível registar. Tente de novo.' };
  }

  const h = await headers();
  const origin = h.get('origin') ?? `https://${h.get('host')}`;
  const { error: otp } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: `${origin}/auth/confirmar?seguinte=${encodeURIComponent('/app/condominio')}` },
  });
  if (otp) return { errors: {}, message: 'O registo ficou feito, mas o email não seguiu. Tente de novo dentro de alguns minutos.' };
  return { errors: {}, enviado: true, email };
}
