import 'server-only';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/database.types';
import { SUPABASE_URL } from './env';

// Cliente com a chave secreta do Supabase, só para os avisos do Stripe (webhook), que não
// têm utilizador. A chave vive em SUPABASE_SECRET_KEY nas variáveis do alojamento, nunca no repositório.
export function adminClient() {
  const key = (process.env.SUPABASE_SECRET_KEY ?? '').trim();
  if (!key || !SUPABASE_URL) return null;
  return createClient<Database>(SUPABASE_URL, key, { auth: { persistSession: false } });
}
