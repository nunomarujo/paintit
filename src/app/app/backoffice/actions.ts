'use server';

import { revalidatePath } from 'next/cache';
import type { FormState } from '@/app/app/actions';
import { isPlatformAdmin } from '@/lib/access';
import { decideAppeal, unblockUser } from '@/lib/strikes';
import { getUser } from '@/lib/supabase/server';
import { normalizeCode, parseDiscountPercent, promoBlocker } from '@/domain/promo';
import { SUPPLIER_PLANS, monthlyPrice, type SupplierPlan } from '@/domain/subscription';

export async function resolveReport(reportId: string, _prev: FormState, form: FormData): Promise<FormState> {
  const decision = String(form.get('decision') ?? '');
  const resolucao = String(form.get('resolucao') ?? '').trim();
  if (!resolucao) return { errors: { resolucao: 'Explique a decisão (o cliente vê-a se o anúncio for suspenso).' } };
  const { supabase } = await getUser();
  const { error } = await supabase.rpc('resolve_listing_report', {
    p_report: reportId,
    p_suspend: decision === 'suspender',
    p_resolucao: resolucao,
  });
  if (error) return { errors: {}, message: error.message };
  revalidatePath('/app/backoffice');
  return { errors: {}, ok: true, message: decision === 'suspender' ? 'Anúncio suspenso.' : 'Denúncia arquivada.' };
}

export async function createPromoCode(_prev: FormState, form: FormData): Promise<FormState> {
  const code = normalizeCode(String(form.get('code') ?? ''));
  const bps = parseDiscountPercent(String(form.get('desconto') ?? ''));
  const validade = String(form.get('validade') ?? '').trim();
  const usosRaw = String(form.get('usos') ?? '').trim();
  const usos = usosRaw ? Number(usosRaw) : null;
  const errors: Record<string, string> = {};
  if (!code) errors.code = 'Use 4 a 32 letras, algarismos ou hífenes.';
  if (bps === null) errors.desconto = 'Indique um desconto entre 1% e 100%.';
  if (validade && !/^\d{4}-\d{2}-\d{2}$/.test(validade)) errors.validade = 'Data inválida.';
  if (usos !== null && !(Number.isInteger(usos) && usos > 0)) errors.usos = 'Número inteiro maior que zero, ou vazio.';
  if (Object.keys(errors).length) return { errors };
  const { supabase, user } = await getUser();
  if (!user) return { errors: {}, message: 'A sessão expirou.' };
  const { error } = await supabase.from('promo_codes').insert({
    code: code!,
    discount_bps: bps!,
    valid_until: validade || null,
    max_uses: usos,
    notas: String(form.get('notas') ?? '').trim().slice(0, 500) || null,
    created_by: user.id,
  });
  if (error) return { errors: {}, message: error.code === '23505' ? 'Esse código já existe.' : 'Não foi possível criar o código.' };
  revalidatePath('/app/backoffice');
  return { errors: {}, ok: true, message: `Código ${code} criado.` };
}

export async function setPromoActive(id: string, active: boolean, ...[]: [FormState]): Promise<FormState> {
  const { supabase } = await getUser();
  // Só a equipa da plataforma passa a política RLS; `active` vem do navegador mas é só um booleano.
  const { error } = await supabase.from('promo_codes').update({ active: active === true }).eq('id', id);
  if (error) return { errors: {}, message: 'Não foi possível alterar o código.' };
  revalidatePath('/app/backoffice');
  return { errors: {}, ok: true };
}

export async function setSupplierPlan(_prev: FormState, form: FormData): Promise<FormState> {
  const orgId = String(form.get('fornecedor') ?? '');
  const plan = String(form.get('plano') ?? '');
  const code = String(form.get('codigo') ?? '').trim();
  if (!orgId) return { errors: { fornecedor: 'Escolha o fornecedor.' } };
  const { supabase } = await getUser();
  if (plan === 'cancelar') {
    const { error } = await supabase.from('supplier_subscriptions').update({ status: 'cancelada', updated_at: new Date().toISOString() }).eq('org_id', orgId);
    if (error) return { errors: {}, message: 'Não foi possível cancelar.' };
    revalidatePath('/app/backoffice');
    return { errors: {}, ok: true, message: 'Subscrição cancelada.' };
  }
  if (!(SUPPLIER_PLANS as readonly string[]).includes(plan)) return { errors: { plano: 'Plano inválido.' } };
  let promo: { id: string; discount_bps: number; uses: number } | null = null;
  if (code) {
    const normalized = normalizeCode(code);
    const { data } = normalized ? await supabase.from('promo_codes').select('*').eq('code', normalized).maybeSingle() : { data: null };
    const today = new Date().toISOString().slice(0, 10);
    const blocker = data
      ? promoBlocker({ code: data.code, discountBps: data.discount_bps, validUntil: data.valid_until, maxUses: data.max_uses, uses: data.uses, active: data.active }, today)
      : 'Código inexistente.';
    if (blocker) return { errors: { codigo: blocker } };
    promo = data!;
  }
  const p = plan as SupplierPlan;
  const { error } = await supabase.from('supplier_subscriptions').upsert({
    org_id: orgId,
    plan: p,
    status: 'ativa',
    price_cents: monthlyPrice(p, promo?.discount_bps ?? 0),
    promo_code_id: promo?.id ?? null,
    discount_bps: promo?.discount_bps ?? 0,
    updated_at: new Date().toISOString(),
  });
  if (error) return { errors: {}, message: 'Não foi possível ativar o plano.' };
  if (promo) await supabase.from('promo_codes').update({ uses: promo.uses + 1 }).eq('id', promo.id);
  revalidatePath('/app/backoffice');
  return { errors: {}, ok: true, message: 'Plano ativo.' };
}

/** Desbloqueia uma conta bloqueada por tentativas de partilhar contactos (só a equipa da plataforma). */
export async function unblockAccount(userId: string): Promise<void> {
  const { supabase, user } = await getUser();
  if (!user || !(await isPlatformAdmin(supabase, user.id))) return;
  if (!/^[0-9a-f-]{36}$/i.test(userId)) return;
  await unblockUser(userId);
  revalidatePath('/app/backoffice');
}

/** Decisão sobre um pedido de revisão do 2.º aviso por contactos (src/domain/strikes.ts). */
export async function decideAppealAction(appealId: string, _prev: FormState, form: FormData): Promise<FormState> {
  const decision = String(form.get('decision') ?? '');
  const motivo = String(form.get('motivo') ?? '').trim();
  if (decision !== 'aceitar' && decision !== 'recusar') return { errors: {}, message: 'Escolha aceitar ou recusar.' };
  if (motivo.length < 10) return { errors: { motivo: 'Explique a decisão: a pessoa recebe-a por email.' } };
  if (!/^[0-9a-f-]{36}$/i.test(appealId)) return { errors: {}, message: 'Pedido inválido.' };
  const { supabase, user } = await getUser();
  if (!user || !(await isPlatformAdmin(supabase, user.id))) return { errors: {}, message: 'Sem permissão.' };
  const done = await decideAppeal(appealId, decision === 'aceitar', motivo.slice(0, 1000), user.id);
  if (!done) return { errors: {}, message: 'O pedido já foi decidido ou não existe.' };
  revalidatePath('/app/backoffice');
  return { errors: {}, ok: true, message: decision === 'aceitar' ? 'Aceite: o segundo aviso foi anulado.' : 'Recusado: mantém-se o último aviso.' };
}
