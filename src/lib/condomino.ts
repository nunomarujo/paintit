import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/database.types';

export type Residencia = {
  id: string;
  buildingId: string;
  orgId: string;
  fracao: string;
  andar: string;
  permilagem: number | null;
  predio: string;
  concelho: string;
  condominio: string;
};

/**
 * Os prédios a que esta conta tem acesso como condómino. Antes de ler, liga as linhas que o gestor
 * ou o próprio registaram com este email e ainda não tinham conta (`reclamar_acesso_de_condomino`,
 * idempotente e barato). A política só devolve as linhas da própria pessoa.
 */
export async function residenciasDe(supabase: SupabaseClient<Database>): Promise<Residencia[]> {
  await supabase.rpc('reclamar_acesso_de_condomino');
  const { data } = await supabase
    .from('building_residents')
    .select('id, building_id, org_id, fracao, andar, permilagem, buildings!inner(nome_interno, concelho), organizations!inner(nome)')
    .is('revoked_at', null)
    .order('created_at');
  return (data ?? []).map((r) => ({
    id: r.id,
    buildingId: r.building_id,
    orgId: r.org_id,
    fracao: r.fracao,
    andar: r.andar,
    permilagem: r.permilagem,
    predio: r.buildings.nome_interno,
    concelho: r.buildings.concelho,
    condominio: r.organizations.nome,
  }));
}
