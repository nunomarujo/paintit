'use server';

import { redirect } from 'next/navigation';
import type { FormState } from '@/app/app/actions';
import { getUser } from '@/lib/supabase/server';

/** Aceita um convite de adesão de um fornecedor (docs/DECISOES.md, 23/10/2026) com a entidade de
 * pintura escolhida. Erros (código inválido, já associado a outra empresa) ficam no formulário. */
export async function claimAndGo(code: string, painterOrgId: string, _prev: FormState): Promise<FormState> {
  const { supabase, user } = await getUser();
  if (!user) return { errors: {}, message: 'A sessão expirou. Entre de novo.' };
  const { error } = await supabase.rpc('claim_supplier_invite', { p_code: code, p_org: painterOrgId });
  if (error) return { errors: {}, message: error.message };
  redirect(`/app/organizacoes/${painterOrgId}/referencias`);
}
