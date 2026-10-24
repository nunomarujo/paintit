'use server';

import { revalidatePath } from 'next/cache';
import type { FormState } from '@/app/app/actions';
import { guardContact } from '@/lib/strikes';
import { getUser } from '@/lib/supabase/server';

// O que o pintor pode fazer sobre o levantamento da obra que está a orçamentar (migrações
// 20261024010647 e 20261024010704): pedir o que falta para conseguir orçamentar, e dar uma nota à
// qualidade da informação. Em nenhum dos dois sabe quem fez o levantamento, nem o vendedor sabe qual
// dos pintores perguntou ou avaliou o quê.

const NOT_SIGNED_IN: FormState = { errors: {}, message: 'A sessão expirou. Entre de novo.' };

export async function askSurveyClarification(requestId: string, surveyId: string, _prev: FormState, form: FormData): Promise<FormState> {
  const texto = String(form.get('texto') ?? '').trim();
  if (!texto) return { errors: { texto: 'Escreva o que falta saber.' } };
  if (texto.length > 2000) return { errors: { texto: 'Até 2000 caracteres.' } };
  const { supabase, user } = await getUser();
  if (!user) return NOT_SIGNED_IN;
  // Mesmo tratamento de qualquer campo livre: tentar passar contactos conta como aviso.
  const refused = await guardContact(supabase, user.id, 'pedido de esclarecimento', { texto });
  if (refused) return refused;
  const { error } = await supabase.rpc('request_painter_doubt', { p_request_survey_id: surveyId, p_texto: texto });
  if (error) return { errors: {}, message: error.message };
  revalidatePath(`/app/oportunidades/${requestId}`);
  return { errors: {}, ok: true, message: 'Pedido enviado. A resposta aparece aqui assim que chegar.' };
}

export async function rateSurveyInfo(requestId: string, surveyId: string, _prev: FormState, form: FormData): Promise<FormState> {
  const nota = Number(form.get('nota'));
  if (!Number.isInteger(nota) || nota < 1 || nota > 5) return { errors: { nota: 'Dê uma nota de 1 a 5.' } };
  const comentario = String(form.get('comentario') ?? '').trim().slice(0, 2000);
  const { supabase, user } = await getUser();
  if (!user) return NOT_SIGNED_IN;
  const refused = await guardContact(supabase, user.id, 'avaliação do levantamento', { comentario });
  if (refused) return refused;
  const { error } = await supabase.rpc('rate_survey_info', { p_request_survey_id: surveyId, p_nota: nota, p_comentario: comentario });
  if (error) return { errors: {}, message: error.message };
  revalidatePath(`/app/oportunidades/${requestId}`);
  return { errors: {}, ok: true, message: 'Obrigado. A sua nota entra na média que remunera quem faz os levantamentos.' };
}
