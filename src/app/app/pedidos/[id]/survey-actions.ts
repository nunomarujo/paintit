'use server';

import { revalidatePath } from 'next/cache';
import type { FormState } from '@/app/app/actions';
import { getUser } from '@/lib/supabase/server';

/** O cliente pede ajuda de um profissional qualificado para o levantamento (docs/DECISOES.md, 23/10/2026). */
export async function requestSurveyHelp(requestId: string, _prev: FormState, _form: FormData): Promise<FormState> {
  const { supabase } = await getUser();
  const { error } = await supabase.from('request_surveys').insert({ request_id: requestId });
  if (error) return { errors: {}, message: 'Não foi possível pedir ajuda agora.' };
  revalidatePath(`/app/pedidos/${requestId}`);
  return { errors: {}, ok: true, message: 'Pedido enviado. Avisamos quando um profissional reservar a visita.' };
}

export async function cancelSurveyHelp(requestId: string, surveyId: string, _prev: FormState, _form: FormData): Promise<FormState> {
  const { supabase } = await getUser();
  const { error } = await supabase.rpc('cancel_survey', { p_survey_id: surveyId });
  if (error) return { errors: {}, message: error.message };
  revalidatePath(`/app/pedidos/${requestId}`);
  return { errors: {}, ok: true, message: 'Pedido cancelado.' };
}

export async function rateSurveyVendor(requestId: string, surveyId: string, _prev: FormState, form: FormData): Promise<FormState> {
  const nota = Number(form.get('nota'));
  if (!Number.isInteger(nota) || nota < 1 || nota > 5) return { errors: { nota: 'Dê uma nota de 1 a 5.' } };
  const comentario = String(form.get('comentario') ?? '').trim().slice(0, 2000);
  const { supabase } = await getUser();
  const { error } = await supabase.from('survey_reviews').insert({ request_survey_id: surveyId, nota, comentario });
  if (error) return { errors: {}, message: 'Não foi possível guardar a avaliação.' };
  revalidatePath(`/app/pedidos/${requestId}`);
  return { errors: {}, ok: true, message: 'Obrigado pela avaliação.' };
}
