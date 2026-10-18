import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/database.types';

/** Administradoras em que o utilizador é proprietário ou gestor (para gerir condomínios). */
export async function managedAdministradoras(supabase: SupabaseClient<Database>, userId: string) {
  const { data } = await supabase
    .from('org_members')
    .select('role, organizations!inner(id, nome, kind)')
    .eq('user_id', userId)
    .in('role', ['proprietario', 'gestor'])
    .eq('organizations.kind', 'administradora');
  return (data ?? []).map((m) => ({ id: m.organizations.id, nome: m.organizations.nome }));
}
