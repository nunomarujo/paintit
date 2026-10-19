'use server';

import { revalidatePath } from 'next/cache';
import type { FormState } from '@/app/app/actions';
import { getUser } from '@/lib/supabase/server';
import { normalizeCode, parseDiscountPercent } from '@/domain/promo';

export async function reportListing(requestId: string, _prev: FormState, form: FormData): Promise<FormState> {
  const motivo = String(form.get('motivo') ?? '').trim();
  // IMG-10: descrever sem reproduzir o dado identificativo.
  if (motivo.length < 10) return { errors: { motivo: 'Descreva o problema sem copiar o dado que identifica o cliente.' } };
  const { supabase, user } = await getUser();
  if (!user) return { errors: {}, message: 'A sessão expirou.' };
  const { error } = await supabase.from('listing_reports').insert({ request_id: requestId, motivo: motivo.slice(0, 1000), reporter: user.id });
  if (error) return { errors: {}, message: 'Não foi possível enviar a denúncia.' };
  return { errors: {}, ok: true, message: 'Obrigado. A equipa da plataforma vai rever o anúncio.' };
}

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
