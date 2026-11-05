'use server';

import { revalidatePath } from 'next/cache';
import type { FormState } from '@/app/app/actions';
import { normalizarCodigoCertidao } from '@/domain/poderes';
import { getUser } from '@/lib/supabase/server';

/**
 * A entidade entrega (ou troca) o código de acesso da certidão permanente (decisão de 05/11/2026).
 *
 * O código dá acesso a dados pessoais de terceiros: não se repete em nenhuma resposta, mensagem de erro ou
 * registo, e o formulário limpa-se depois de guardar. Quem pode guardá-lo decide a base
 * (`definir_codigo_certidao`: só quem gere a entidade); o `orgId` vem do navegador e é a base que o confere.
 */
export async function definirCodigoCertidao(orgId: string, _prev: FormState, form: FormData): Promise<FormState> {
  const codigo = normalizarCodigoCertidao(String(form.get('codigo') ?? ''));
  if (!codigo) return { errors: { codigo: 'O código tem 12 algarismos, no formato NNNN-NNNN-NNNN.' } };
  const { supabase, user } = await getUser();
  if (!user) return { errors: {}, message: 'A sessão expirou. Entre de novo.' };
  const { error } = await supabase.rpc('definir_codigo_certidao', { p_org: orgId, p_codigo: codigo });
  if (error) {
    // As mensagens P0001 da função foram escritas para o ecrã e nunca levam o código.
    if (error.code === 'P0001') return { errors: {}, message: error.message };
    if (error.code === '42501') return { errors: {}, message: 'Só quem gere a entidade pode indicar o código.' };
    return { errors: {}, message: 'Não foi possível guardar o código. Tente de novo.' };
  }
  revalidatePath(`/app/organizacoes/${orgId}`);
  return { errors: {}, ok: true, message: 'Código guardado. A equipa da plataforma vai ler a certidão.' };
}
