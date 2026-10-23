'use server';

import { revalidatePath } from 'next/cache';
import type { FormState } from '@/app/app/actions';
import { getUser } from '@/lib/supabase/server';

// O pedido de ajuda de um profissional já não é uma ação do cliente: fica aberto, por omissão, desde a
// criação do pedido em rascunho (gatilho `work_requests_create_survey`, 23/10/2026 — docs/DECISOES.md).
// Só resta a possibilidade de desistir, a qualquer momento, e preencher sozinho.

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
