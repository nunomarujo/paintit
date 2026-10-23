'use server';

import { revalidatePath } from 'next/cache';
import type { FormState } from '@/app/app/actions';
import { sniffPdf } from '@/domain/fileSignature';
import { CURRENT_SURVEY_TERMS_VERSION } from '@/domain/surveyTerms';
import { getUser } from '@/lib/supabase/server';

const NOT_SIGNED_IN: FormState = { errors: {}, message: 'A sessão expirou. Entre de novo.' };
const path = '/app/levantamentos';

export async function acceptSurveyTerms(surveyId: string): Promise<FormState> {
  const { supabase, user } = await getUser();
  if (!user) return NOT_SIGNED_IN;
  const { error } = await supabase.from('survey_terms_acceptances').insert({ user_id: user.id, version: CURRENT_SURVEY_TERMS_VERSION });
  if (error) return { errors: {}, message: 'Não foi possível registar.' };
  revalidatePath(`${path}/${surveyId}`);
  return { errors: {}, ok: true };
}

export async function reserveSurvey(surveyId: string, orgId: string): Promise<FormState> {
  const { supabase, user } = await getUser();
  if (!user) return NOT_SIGNED_IN;
  const { error } = await supabase.rpc('reserve_survey', { p_survey_id: surveyId, p_org: orgId });
  if (error) return { errors: {}, message: error.message };
  revalidatePath(path);
  return { errors: {}, ok: true, message: 'Reservado. Agende com o cliente dentro da app e registe o levantamento.' };
}

export async function logContact(surveyId: string, _prev: FormState, form: FormData): Promise<FormState> {
  const notas = String(form.get('notas') ?? '').trim().slice(0, 2000);
  const agendado = String(form.get('agendado') ?? '').trim();
  const { supabase, user } = await getUser();
  if (!user) return NOT_SIGNED_IN;
  const scheduledAt = agendado ? new Date(agendado).toISOString() : null;
  const { error } = await supabase.from('request_surveys').update({ contact_notes: notas, scheduled_at: scheduledAt }).eq('id', surveyId);
  if (error) return { errors: {}, message: 'Não foi possível guardar.' };
  revalidatePath(path);
  return { errors: {}, ok: true, message: 'Guardado.' };
}

export async function concludeSurvey(surveyId: string): Promise<FormState> {
  const { supabase, user } = await getUser();
  if (!user) return NOT_SIGNED_IN;
  const { error } = await supabase.rpc('conclude_survey', { p_survey_id: surveyId });
  if (error) return { errors: {}, message: error.message };
  revalidatePath(path);
  return { errors: {}, ok: true, message: 'Levantamento concluído.' };
}

export async function setSurveyCoverage(orgId: string, _prev: FormState, form: FormData): Promise<FormState> {
  const { supabase, user } = await getUser();
  if (!user) return NOT_SIGNED_IN;
  const concelhos = form.getAll('concelhos').map((c) => String(c).trim()).filter(Boolean);
  const { error } = await supabase.from('supplier_survey_coverage').upsert({ org_id: orgId, concelhos }, { onConflict: 'org_id' });
  if (error) return { errors: {}, message: 'Não foi possível guardar.' };
  revalidatePath(path);
  return { errors: {}, ok: true, message: 'Zonas guardadas.' };
}

export async function requestSurveyRedemption(orgId: string): Promise<FormState> {
  const { supabase, user } = await getUser();
  if (!user) return NOT_SIGNED_IN;
  const { error } = await supabase.rpc('survey_request_redemption', { p_org: orgId });
  if (error) return { errors: {}, message: error.message };
  revalidatePath(path);
  return { errors: {}, ok: true, message: 'Resgate pedido. Envie agora a fatura.' };
}

export async function cancelSurveyRedemption(redemptionId: string): Promise<void> {
  const { supabase } = await getUser();
  await supabase.rpc('survey_redemption_cancel', { p_redemption: redemptionId, p_motivo: 'Cancelado pelo fornecedor' });
  revalidatePath(path);
}

export async function submitSurveyRedemptionInvoice(orgId: string, redemptionId: string, _prev: FormState, form: FormData): Promise<FormState> {
  const { supabase, user } = await getUser();
  if (!user) return NOT_SIGNED_IN;
  const numero = String(form.get('numero') ?? '').trim();
  const file = form.get('ficheiro');
  if (!numero || numero.length > 40) return { errors: { numero: 'Indique o número da fatura.' } };
  if (!(file instanceof File) || file.size === 0) return { errors: { ficheiro: 'Escolha o PDF da fatura.' } };
  if (file.size > 5 * 1024 * 1024) return { errors: { ficheiro: 'PDF até 5 MB.' } };
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (!sniffPdf(bytes)) return { errors: { ficheiro: 'O ficheiro não é um PDF.' } };
  // Mesmo balde já usado pelas comissões de adesão (faturas-adesao): mesmo formato de caminho, mesma política.
  const storagePath = `${orgId}/levantamento-${redemptionId}.pdf`;
  const up = await supabase.storage.from('faturas-adesao').upload(storagePath, bytes, { contentType: 'application/pdf', upsert: false });
  if (up.error && !/exists|Duplicate/i.test(up.error.message)) return { errors: {}, message: 'Não foi possível enviar o ficheiro. Só gestores do fornecedor o podem fazer.' };
  const { error } = await supabase.rpc('survey_redemption_invoice', { p_redemption: redemptionId, p_numero: numero, p_path: storagePath });
  if (error) return { errors: {}, message: error.message };
  revalidatePath(path);
  return { errors: {}, ok: true, message: 'Fatura enviada. A plataforma paga por transferência.' };
}
