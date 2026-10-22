'use server';

import { revalidatePath } from 'next/cache';
import type { FormState } from '@/app/app/actions';
import { newReferralCode } from '@/domain/referral';
import { getUser } from '@/lib/supabase/server';

// Convites de referência a fornecedores (src/domain/referralEligibility.ts). O orgId e os ids vêm do navegador:
// as políticas RLS garantem que só a equipa do pintor os altera.

const NOT_SIGNED_IN: FormState = { errors: {}, message: 'A sessão expirou. Entre de novo.' };
const path = (orgId: string) => `/app/organizacoes/${orgId}/referencias`;

export async function createSupplierReferralInvite(orgId: string, _prev: FormState, form: FormData): Promise<FormState> {
  const { supabase, user } = await getUser();
  if (!user) return NOT_SIGNED_IN;
  const nota = String(form.get('nota') ?? '').trim().slice(0, 80) || null;
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = newReferralCode();
    const { data, error } = await supabase.from('supplier_referral_invites').insert({ painter_org_id: orgId, code, nota }).select('code').maybeSingle();
    if (!error && data) {
      revalidatePath(path(orgId));
      return { errors: {}, ok: true, message: `Código ${data.code} criado. Entregue-o ao fornecedor.` };
    }
    if (error?.code !== '23505') return { errors: {}, message: 'Não foi possível criar o código. Só gestores de um pintor o podem fazer.' };
  }
  return { errors: {}, message: 'Não foi possível gerar um código novo. Tente de novo.' };
}

export async function setInviteActive(orgId: string, inviteId: string, active: boolean) {
  const { supabase } = await getUser();
  await supabase.from('supplier_referral_invites').update({ active: active === true }).eq('id', inviteId).eq('painter_org_id', orgId);
  revalidatePath(path(orgId));
}
