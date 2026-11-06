'use server';

import { revalidatePath } from 'next/cache';
import type { FormState } from '@/app/app/actions';
import { addressProblem } from '@/domain/address';
import { concelhoConhecido } from '@/domain/coberturaDaEmpresa';
import { lerLoja } from '@/domain/lojas';
import { lookupPostalCode } from '@/lib/postalCodes';
import { getUser } from '@/lib/supabase/server';

// Lojas do fornecedor (06/11/2026, `src/domain/lojas.ts`). A morada confere-se com a base dos CTT, como a
// da empresa, e o concelho tira-se do código postal — nunca vem do navegador. Quem pode gravar decide-o a
// base (RLS: quem gere uma empresa fornecedora).

export async function adicionarLoja(orgId: string, _prev: FormState, form: FormData): Promise<FormState> {
  const lido = lerLoja(form);
  if ('errors' in lido) return { errors: lido.errors };
  const v = lido.value;
  const info = await lookupPostalCode(v.codigoPostal);
  if (info !== 'indisponivel') {
    const problema = addressProblem(v.morada, v.codigoPostal, info);
    if (problema) return { errors: info ? { morada: problema } : { codigoPostal: problema } };
  }
  const { supabase, user } = await getUser();
  if (!user) return { errors: {}, message: 'A sessão expirou. Entre de novo.' };
  const { error } = await supabase.from('supplier_stores').insert({
    org_id: orgId,
    nome: v.nome,
    morada: v.morada,
    codigo_postal: v.codigoPostal,
    localidade: v.localidade,
    concelho: info === 'indisponivel' ? null : concelhoConhecido(info?.concelho),
    created_by: user.id,
  });
  if (error) return { errors: {}, message: 'Não foi possível guardar a loja. Só quem gere a empresa o pode fazer.' };
  revalidatePath(`/app/organizacoes/${orgId}`);
  revalidatePath('/app/avaliacoes', 'layout');
  return {
    errors: {},
    ok: true,
    message:
      info === 'indisponivel'
        ? 'Loja guardada. O concelho fica por ler (o serviço dos códigos postais não respondeu): gravar de novo mais tarde.'
        : 'Loja guardada.',
  };
}

export async function removerLoja(orgId: string, lojaId: string) {
  const { supabase } = await getUser();
  await supabase.from('supplier_stores').delete().eq('id', lojaId).eq('org_id', orgId);
  revalidatePath(`/app/organizacoes/${orgId}`);
  revalidatePath('/app/avaliacoes', 'layout');
}
