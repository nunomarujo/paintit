import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { MemberRole } from '@/domain/organization';
import type { Database } from '@/lib/database.types';

// Só decide o que mostrar na interface. Quem autoriza é a base de dados (RLS):
// esconder um botão não substitui a política.

const RANK: Record<MemberRole, number> = { leitor: 0, financeiro: 1, gestor: 2, proprietario: 3 };

/** Papel efetivo do utilizador: o direto ou o herdado da administradora que gere a entidade. */
export async function myRole(
  supabase: SupabaseClient<Database>,
  userId: string,
  org: { id: string; gerida_por: string | null },
): Promise<MemberRole | null> {
  const orgIds = [org.id, org.gerida_por].filter((x): x is string => x !== null);
  const { data } = await supabase.from('org_members').select('role').eq('user_id', userId).in('org_id', orgIds);
  const roles = (data ?? []).map((r) => r.role);
  if (roles.length === 0) return null;
  return roles.reduce((best, r) => (RANK[r] > RANK[best] ? r : best));
}

export function canManage(role: MemberRole | null): boolean {
  return role === 'proprietario' || role === 'gestor';
}

export async function isPlatformAdmin(supabase: SupabaseClient<Database>, userId: string): Promise<boolean> {
  const { data } = await supabase.from('platform_admins').select('user_id').eq('user_id', userId).maybeSingle();
  return data !== null;
}
