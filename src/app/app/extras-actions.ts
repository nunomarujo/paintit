'use server';

import { revalidatePath } from 'next/cache';
import type { FormState } from '@/app/app/actions';
import { guardContact } from '@/lib/strikes';
import { notifyNewReview } from '@/lib/notify';
import { getUser } from '@/lib/supabase/server';

// Convites, avaliações e avisos.

export async function invitePainter(requestId: string, _prev: FormState, form: FormData): Promise<FormState> {
  const painterOrgId = String(form.get('painter') ?? '');
  if (!painterOrgId) return { errors: { painter: 'Escolha um pintor.' } };
  const { supabase, user } = await getUser();
  if (!user) return { errors: {}, message: 'A sessão expirou.' };
  const { error } = await supabase.from('listing_invites').insert({ request_id: requestId, painter_org_id: painterOrgId, invited_by: user.id });
  if (error) return { errors: {}, message: error.code === '23505' ? 'Esse pintor já foi convidado.' : 'Não foi possível convidar.' };
  revalidatePath('/app/backoffice', 'layout');
  return { errors: {}, ok: true, message: 'Convite enviado.' };
}

const score = (form: FormData, k: string) => {
  const n = Number(form.get(k));
  return Number.isInteger(n) && n >= 1 && n <= 5 ? n : null;
};

export async function saveReview(engagementId: string, _prev: FormState, form: FormData): Promise<FormState> {
  const qualidade = score(form, 'qualidade');
  const prazo = score(form, 'prazo');
  const comunicacao = score(form, 'comunicacao');
  const comentario = String(form.get('comentario') ?? '').trim().slice(0, 2000);
  if (!qualidade || !prazo || !comunicacao) return { errors: {}, message: 'Dê uma nota de 1 a 5 a cada critério.' };
  const { supabase, user } = await getUser();
  if (!user) return { errors: {}, message: 'A sessão expirou.' };
  const { data: existing } = await supabase.from('reviews').select('id').eq('engagement_id', engagementId).maybeSingle();
  const { error } = existing
    ? await supabase.from('reviews').update({ qualidade, prazo, comunicacao, comentario }).eq('id', existing.id)
    : await supabase.from('reviews').insert({ engagement_id: engagementId, qualidade, prazo, comunicacao, comentario, created_by: user.id });
  if (error) return { errors: {}, message: 'Não foi possível guardar a avaliação.' };
  if (!existing) await notifyNewReview(engagementId).catch(() => undefined);
  revalidatePath(`/app/contratacoes/${engagementId}`);
  return { errors: {}, ok: true, message: existing ? 'Avaliação atualizada.' : 'Obrigado pela avaliação.' };
}

export async function answerReview(engagementId: string, _prev: FormState, form: FormData): Promise<FormState> {
  const resposta = String(form.get('resposta') ?? '').trim().slice(0, 2000);
  if (!resposta) return { errors: { resposta: 'Escreva a resposta.' } };
  const { supabase, user } = await getUser();
  if (!user) return { errors: {}, message: 'A sessão expirou. Entre de novo.' };
  const refused = await guardContact(supabase, user.id, 'resposta a avaliação', { resposta });
  if (refused) return refused;
  const { error } = await supabase.from('reviews').update({ resposta }).eq('engagement_id', engagementId);
  if (error) return { errors: {}, message: 'Não foi possível guardar a resposta.' };
  revalidatePath(`/app/contratacoes/${engagementId}`);
  return { errors: {}, ok: true, message: 'Resposta guardada.' };
}

export async function markNotificationsRead() {
  const { supabase } = await getUser();
  await supabase.from('notifications').update({ lida_em: new Date().toISOString() }).is('lida_em', null);
  revalidatePath('/app');
}
