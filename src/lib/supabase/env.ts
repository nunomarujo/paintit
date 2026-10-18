// Variáveis públicas: a chave "publishable" pode ir para o browser; a
// autorização é feita pelas políticas RLS da base de dados.
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
export const SUPABASE_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? '';

export const supabaseConfigured = SUPABASE_URL !== '' && SUPABASE_PUBLISHABLE_KEY !== '';
