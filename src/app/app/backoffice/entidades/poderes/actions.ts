'use server';

import { revalidatePath } from 'next/cache';
import type { FormState } from '@/app/app/actions';
import { diaDeLisboa } from '@/domain/disponibilidade';
import { parseLeitura } from '@/domain/poderes';
import { isPlatformAdmin } from '@/lib/access';
import { getUser } from '@/lib/supabase/server';

/**
 * A equipa regista a leitura da certidão permanente (ou da ata de nomeação, num condomínio). A fonte chega
 * ligada à ação e vem do navegador: valida-se aqui (regra 10) e outra vez na base, que também confere o tipo
 * de entidade e que quem chama é da equipa.
 */
export async function registarLeitura(orgId: string, fonte: string, _prev: FormState, form: FormData): Promise<FormState> {
  if (fonte !== 'certidao' && fonte !== 'ata') return { errors: {}, message: 'Fonte inválida.' };
  const { value, errors } = parseLeitura(form, diaDeLisboa(new Date()));
  if (!value) return { errors };
  const { supabase, user } = await getUser();
  if (!user) return { errors: {}, message: 'A sessão expirou. Entre de novo.' };
  if (!(await isPlatformAdmin(supabase, user.id))) return { errors: {}, message: 'Sem permissão.' };
  const { error } = await supabase.rpc('registar_leitura_poderes', {
    p_org: orgId,
    p_fonte: fonte,
    p_forma_de_obrigar: value.formaDeObrigar,
    p_assinaturas: value.assinaturasExigidas,
    p_valida_ate: value.validaAte,
    p_membros: value.membros.map((m) => ({ nome: m.nome, cargo: m.cargo, nif: m.nif })),
  });
  if (error) return { errors: {}, message: error.code === 'P0001' ? error.message : 'Não foi possível registar a leitura.' };
  revalidatePath('/app/backoffice', 'layout');
  revalidatePath(`/app/organizacoes/${orgId}`);
  return { errors: {}, ok: true, message: 'Leitura registada.' };
}
