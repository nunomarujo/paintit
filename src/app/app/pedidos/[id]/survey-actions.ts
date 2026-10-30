'use server';

import { revalidatePath } from 'next/cache';
import type { FormState } from '@/app/app/actions';
import { getUser } from '@/lib/supabase/server';

// O pedido de ajuda fica aberto por omissão desde a criação do pedido em rascunho (gatilho
// `work_requests_create_survey`, 23/10/2026 — docs/DECISOES.md), e o cliente pode desistir a
// qualquer momento.
//
// **Desistir deixou de ser definitivo a 30/10/2026**, por defeito apontado pelo promotor: o cartão
// desaparecia e não havia maneira de voltar atrás. «É exactamente a saída de que o cliente precisa
// quando fica com dificuldades» — quem desistiu e depois percebeu que não sabe medir tem de poder
// pedir outra vez, sem perder o que já escreveu.

export async function cancelSurveyHelp(requestId: string, surveyId: string, _prev: FormState, _form: FormData): Promise<FormState> {
  const { supabase } = await getUser();
  const { error } = await supabase.rpc('cancel_survey', { p_survey_id: surveyId });
  if (error) return { errors: {}, message: error.message };
  revalidatePath(`/app/pedidos/${requestId}`);
  return { errors: {}, ok: true, message: 'Pedido cancelado.' };
}

/**
 * Pede o levantamento, ou pede-o outra vez depois de ter desistido.
 *
 * Os dados do pedido não se tocam: zonas, medidas e fotografias são do cliente e servem de
 * referência ao profissional, que os completa ou propõe correcções. A função na base impede uma
 * segunda vaga para o mesmo pedido, que é o pedido duplicado que não pode acontecer por engano.
 */
export async function pedirLevantamento(requestId: string, _prev: FormState, _form: FormData): Promise<FormState> {
  const { supabase } = await getUser();
  const { error } = await supabase.rpc('reabrir_levantamento', { p_request: requestId });
  if (error) return { errors: {}, message: error.message };
  revalidatePath(`/app/pedidos/${requestId}`);
  return { errors: {}, ok: true, message: 'Pedido de levantamento entregue. Mantemos tudo o que já escreveu.' };
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
