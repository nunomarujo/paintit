'use server';

import { revalidatePath } from 'next/cache';
import type { FormState } from '@/app/app/actions';
import { getUser } from '@/lib/supabase/server';

const NOT_SIGNED_IN: FormState = { errors: {}, message: 'Sessão terminada.' };
const CAMINHO = '/app/avaliacoes/disponibilidade';

/**
 * A presença e os avisos desta pessoa. Nunca recebe um identificador de utilizador do navegador: o dono
 * da linha é sempre quem está em sessão (regra 10 do CLAUDE.md — o que vem ligado pode ser trocado).
 */
export async function guardarDisponibilidade(_prev: FormState, form: FormData): Promise<FormState> {
  const { supabase, user } = await getUser();
  if (!user) return NOT_SIGNED_IN;

  const ate = String(form.get('suspenso_ate') ?? '').trim();
  const alertaEmail = form.get('alerta_email') === 'on';

  if (ate && !/^\d{4}-\d{2}-\d{2}$/.test(ate)) {
    return { errors: { suspenso_ate: 'Indique uma data válida.' } };
  }
  const hoje = new Date().toISOString().slice(0, 10);
  if (ate && ate < hoje) {
    return { errors: { suspenso_ate: 'A data já passou. Para voltar a estar disponível, deixe o campo vazio.' } };
  }

  const { error } = await supabase
    .from('survey_availability')
    .upsert({ user_id: user.id, suspenso_ate: ate || null, alerta_email: alertaEmail }, { onConflict: 'user_id' });
  if (error) return { errors: {}, message: 'Não foi possível guardar.' };

  revalidatePath(CAMINHO);
  return { errors: {}, ok: true, message: ate ? 'Presença suspensa.' : 'Disponível para receber oportunidades.' };
}
