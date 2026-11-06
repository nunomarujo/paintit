import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/database.types';
import type { PorOmissao } from '@/domain/coberturaDaEmpresa';

/**
 * Os concelhos por omissão de uma empresa: o da morada (`organizations.concelho`) e os das suas lojas
 * (`supplier_stores`). Valem quando a empresa não indica concelhos de levantamento ou de entrega.
 */
export async function porOmissaoDaEmpresa(supabase: SupabaseClient<Database>, orgId: string): Promise<Exclude<PorOmissao, string | null | undefined>> {
  const [{ data: empresa }, { data: lojas }] = await Promise.all([
    supabase.from('organizations').select('concelho').eq('id', orgId).maybeSingle(),
    supabase.from('supplier_stores').select('concelho').eq('org_id', orgId),
  ]);
  return { morada: empresa?.concelho ?? null, lojas: (lojas ?? []).map((l) => l.concelho) };
}
