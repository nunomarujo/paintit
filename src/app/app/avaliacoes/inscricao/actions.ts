'use server';

import { revalidatePath } from 'next/cache';
import type { FormState } from '@/app/app/actions';
import { COMPROMISSOS_DO_AVALIADOR, VERSAO_AUTODECLARACAO_DO_AVALIADOR } from '@/domain/avaliador';
import { getUser } from '@/lib/supabase/server';

/**
 * A autodeclaração de avaliador: todos os compromissos têm de vir marcados — o servidor não confia no
 * navegador para isso (regra 10). Fica guardada como uma aceitação de termos com a sua versão, na
 * mesma tabela dos termos de confidencialidade (ver `src/domain/avaliador.ts`).
 */
export async function declararAvaliador(_prev: FormState, form: FormData): Promise<FormState> {
  const { supabase, user } = await getUser();
  if (!user) return { errors: {}, message: 'A sessão expirou. Entre de novo.' };
  const marcados = form.getAll('compromisso').map(String);
  const faltam = COMPROMISSOS_DO_AVALIADOR.filter((_, i) => !marcados.includes(String(i)));
  if (faltam.length > 0) {
    return { errors: { compromissos: 'Para se inscrever é preciso assumir todos os compromissos.' }, message: undefined };
  }
  const { error } = await supabase
    .from('survey_terms_acceptances')
    .insert({ user_id: user.id, version: VERSAO_AUTODECLARACAO_DO_AVALIADOR });
  // Já inscrita é um sucesso, não um erro: a chave primária é (pessoa, versão).
  if (error && !/duplicate|unique|23505/i.test(error.message)) return { errors: {}, message: 'Não foi possível registar a inscrição.' };
  revalidatePath('/app/avaliacoes/inscricao');
  revalidatePath('/app/avaliacoes/oportunidades');
  revalidatePath('/app/avaliacoes');
  return { errors: {}, ok: true, message: 'Inscrição registada. Já pode aceitar oportunidades de levantamento.' };
}
