import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { isPlanoPintor, subscriberDiscountBp, type SubscricaoPintor } from '@/domain/painterPlan';
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
  return (codes ?? []).map((c) => ({ id: c.id, code: c.code, supplierOrgId: c.supplier_org_id, nome: nameOf.get(c.supplier_org_id) ?? 'Fornecedor' }));
}

export interface SupplierCustomer {
  id: string;
  nome: string;
  deliveredOrders: number;
  premium: boolean;
  nota: string;
}

/** Pintores que já compraram a este fornecedor ("carteira de clientes"), com a contagem de encomendas
 * entregues e a classificação/nota que o fornecedor lhes deu (supplier_customers) — para a página
 * /clientes e para escolher um cliente específico ao criar um desconto (src/domain/catalog.ts). */
export async function supplierCustomers(supabase: SupabaseClient<Database>, orgId: string): Promise<SupplierCustomer[]> {
  const [{ data: orders }, { data: profiles }] = await Promise.all([
    supabase.from('material_orders').select('painter_org_id, estado').eq('supplier_org_id', orgId),
    supabase.from('supplier_customers').select('painter_org_id, premium, nota').eq('org_id', orgId),
  ]);
  const ids = [...new Set((orders ?? []).map((o) => o.painter_org_id))];
  if (ids.length === 0) return [];
  const { data: orgs } = await supabase.from('organizations').select('id, nome').in('id', ids);
  const nameOf = new Map((orgs ?? []).map((o) => [o.id, o.nome]));
  const profileOf = new Map((profiles ?? []).map((p) => [p.painter_org_id, p]));
  return ids
    .map((id) => {
      const delivered = (orders ?? []).filter((o) => o.painter_org_id === id && o.estado === 'entregue').length;
      const profile = profileOf.get(id);
      return { id, nome: nameOf.get(id) ?? 'Pintor', deliveredOrders: delivered, premium: profile?.premium ?? false, nota: profile?.nota ?? '' };
    })
    .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-PT'));
}

export interface PainterDiscountBreakdown {
  linkedCount: number;
  linkedBp: number;
  eligibleCount: number;
  referralsBp: number;
  combinedBp: number;
  /** Desconto do plano Pro (5 p.p.), fora do teto conjunto dos outros dois — soma-se por cima deles. */
  subscriberBp: number;
  /** Desconto total a aplicar à comissão: o teto conjunto dos dois primeiros mais o de subscritor. */
  totalBp: number;
  subscricao: SubscricaoPintor | null;
}

/** O desconto do pintor em vigor agora: códigos de adesão ligados (ambiente, qualquer que seja o marcado nesta
 * proposta) somado às referências de fornecedores elegíveis, com o teto conjunto. Devolve os dois lados em
 * separado, para quem quiser mostrar o detalhe (ex.: a pré-visualização da comissão). */
export async function painterDiscountBreakdown(supabase: SupabaseClient<Database>, painterOrgId: string): Promise<PainterDiscountBreakdown> {
  const { data: codes } = await supabase.from('referral_codes').select('supplier_org_id').eq('painter_org_id', painterOrgId).eq('active', true);
  const linkedCount = new Set((codes ?? []).map((c) => c.supplier_org_id)).size;
  const linkedBp = linkedSupplierDiscountBp(linkedCount);

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
  const eligibleCount = countEligibleReferrals(referred, today);
  const referralsBp = referralDiscountBp(eligibleCount);

  const combinedBp = combinedPainterDiscountBp(linkedBp, referralsBp);

  // O desconto de subscritor é independente: não entra no teto conjunto dos dois de fornecedores,
  // soma-se por cima deles, e é o piso da versão das regras que impede o conjunto de ir longe demais.
  const subscricao = await painterSubscription(supabase, painterOrgId);
  const subscriberBp = subscriberDiscountBp(subscricao, today);

  return { linkedCount, linkedBp, eligibleCount, referralsBp, combinedBp, subscriberBp, totalBp: combinedBp + subscriberBp, subscricao };
}

/** A subscrição em vigor de uma empresa de pintura, ou null se estiver no plano gratuito. */
export async function painterSubscription(supabase: SupabaseClient<Database>, painterOrgId: string): Promise<SubscricaoPintor | null> {
  const { data } = await supabase
    .from('org_subscriptions')
    .select('plano, estado, periodicidade, valida_ate')
    .eq('org_id', painterOrgId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!data || !isPlanoPintor(data.plano)) return null;
  return {
    plano: data.plano,
    estado: data.estado as SubscricaoPintor['estado'],
    periodicidade: data.periodicidade as SubscricaoPintor['periodicidade'],
    validaAte: data.valida_ate,
  };
}
