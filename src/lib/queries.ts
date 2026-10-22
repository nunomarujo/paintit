import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/database.types';
import type { IsoDate } from '@/domain/deadline';
import { combinedPainterDiscountBp, linkedSupplierDiscountBp } from '@/domain/referral';
import { countEligibleReferrals, referralDiscountBp, type ReferredSupplier } from '@/domain/referralEligibility';

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

/** Entidades de pintura de que o utilizador é membro, com o papel e as zonas de serviço. */
export async function painterOrgs(supabase: SupabaseClient<Database>, userId: string) {
  const { data } = await supabase
    .from('org_members')
    .select('role, organizations!inner(id, nome, kind, zonas_servico)')
    .eq('user_id', userId)
    .eq('organizations.kind', 'pintor');
  return (data ?? []).map((m) => ({
    id: m.organizations.id,
    nome: m.organizations.nome,
    zonas: m.organizations.zonas_servico,
    manager: m.role === 'proprietario' || m.role === 'gestor',
  }));
}

/** Códigos de adesão ligados e ativos a este pintor, com o nome do fornecedor — para escolher, por proposta,
 * qual fica associado a essa obra (o desconto do pintor já conta todos, ver `painterDiscountBp`). */
export async function linkedSupplierCodes(supabase: SupabaseClient<Database>, painterOrgId: string) {
  const { data: codes } = await supabase.from('referral_codes').select('id, code, supplier_org_id').eq('painter_org_id', painterOrgId).eq('active', true);
  const ids = (codes ?? []).map((c) => c.supplier_org_id);
  const { data: suppliers } = ids.length ? await supabase.from('organizations').select('id, nome').in('id', ids) : { data: [] };
  const nameOf = new Map((suppliers ?? []).map((s) => [s.id, s.nome]));
  return (codes ?? []).map((c) => ({ id: c.id, code: c.code, nome: nameOf.get(c.supplier_org_id) ?? 'Fornecedor' }));
}

/** O desconto do pintor em vigor agora, em pontos-base: códigos de adesão ligados (ambiente, qualquer que seja o
 * marcado nesta proposta) somado às referências de fornecedores elegíveis, com o teto conjunto. */
export async function painterDiscountBp(supabase: SupabaseClient<Database>, painterOrgId: string): Promise<number> {
  const { data: codes } = await supabase.from('referral_codes').select('supplier_org_id').eq('painter_org_id', painterOrgId).eq('active', true);
  const linkedCount = new Set((codes ?? []).map((c) => c.supplier_org_id)).size;

  const { data: invites } = await supabase
    .from('supplier_referral_invites')
    .select('nif, convite_confirmado_em, adesao_elegivel_em')
    .eq('painter_org_id', painterOrgId);
  const referred: ReferredSupplier[] = (invites ?? []).map((i) => ({
    nif: i.nif ?? '',
    conviteConfirmadoEm: (i.convite_confirmado_em?.slice(0, 10) as IsoDate | undefined) ?? null,
    adesaoElegivelEm: (i.adesao_elegivel_em as IsoDate | null) ?? null,
  }));
  const today = new Date().toISOString().slice(0, 10) as IsoDate;
  const referralsBp = referralDiscountBp(countEligibleReferrals(referred, today));

  return combinedPainterDiscountBp(linkedSupplierDiscountBp(linkedCount), referralsBp);
}
