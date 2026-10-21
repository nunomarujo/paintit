'use server';

import { revalidatePath } from 'next/cache';
import type { FormState } from '@/app/app/actions';
import { APPEAL_MAX, APPEAL_MIN } from '@/domain/strikes';
import { revealingContent } from '@/domain/request';
import { requestAppeal } from '@/lib/strikes';
import { getUser } from '@/lib/supabase/server';

// Pedido de revisão do 2.º aviso por contactos. A elegibilidade é verificada no servidor.
export async function requestReview(...[, form]: [FormState, FormData]): Promise<FormState> {
  const texto = String(form.get('texto') ?? '').trim();
  if (texto.length < APPEAL_MIN) return { errors: { texto: `Explique em pelo menos ${APPEAL_MIN} letras porque considera que foi um engano.` } };
  if (texto.length > APPEAL_MAX) return { errors: { texto: `No máximo ${APPEAL_MAX} letras.` } };
  // O pedido não é uma nova via para contactos, mas também não conta como nova infração.
  const revealing = revealingContent(texto);
  if (revealing.length > 0) return { errors: { texto: `Retire ${revealing.join(', ')}: o pedido é lido pela equipa, que responde por email.` } };
  const { supabase, user } = await getUser();
  if (!user) return { errors: {}, message: 'A sessão expirou. Entre de novo.' };
  const r = await requestAppeal(supabase, user.id, texto);
  if (!r.ok) return { errors: {}, message: r.message };
  revalidatePath('/app/revisao');
  revalidatePath('/app');
  return { errors: {}, ok: true, message: r.message };
}
