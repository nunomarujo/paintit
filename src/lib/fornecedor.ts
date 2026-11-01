import type { SupabaseClient, User } from '@supabase/supabase-js';
import type { Database } from '@/lib/database.types';
import type { ConvitePendente } from '@/components/vendas/SemEmpresa';

/**
 * A empresa fornecedora desta pessoa — ou, se não houver, o que está por resolver.
 *
 * Os ecrãs deste workspace chamavam `notFound()` quando a pessoa não pertencia a nenhuma empresa. Mas
 * «ainda não pertenço» e «fui convidado e ainda não aceitei» não são erros: são estados por resolver,
 * e cada um tem a sua ação (01/11/2026).
 */
export type Pertenca =
  | { tipo: 'membro'; orgId: string; papel: string }
  | { tipo: 'sem_empresa'; convites: ConvitePendente[] };

const PAPEIS = ['proprietario', 'gestor', 'vendedor'];

export async function pertencaDoFornecedor(
  supabase: SupabaseClient<Database>,
  user: User,
  papeis: string[] = PAPEIS,
): Promise<Pertenca> {
  const { data: memberships } = await supabase
    .from('org_members')
    .select('org_id, role, organizations!inner(kind)')
    .eq('user_id', user.id)
    .eq('organizations.kind', 'fornecedor');
  const meu = (memberships ?? []).find((m) => papeis.includes(m.role));
  if (meu) return { tipo: 'membro', orgId: meu.org_id, papel: meu.role };

  // A política só devolve convites dirigidos ao email desta conta.
  const { data: convites } = await supabase
    .from('org_invitations')
    .select('id, role, expires_at, org_nome, org_kind')
    .eq('email', (user.email ?? '').toLowerCase())
    .is('accepted_at', null)
    .gt('expires_at', new Date().toISOString());

  return {
    tipo: 'sem_empresa',
    convites: (convites ?? [])
      .filter((c) => c.org_kind === 'fornecedor')
      .map((c) => ({ id: c.id, orgNome: c.org_nome, papel: c.role, expiraEm: c.expires_at })),
  };
}
