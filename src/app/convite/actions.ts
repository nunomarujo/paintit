'use server';

import { redirect } from 'next/navigation';
import type { FormState } from '@/app/app/actions';
import { getUser } from '@/lib/supabase/server';

/** Segue o convite direto de uma obra ("traga o seu pintor", docs/DECISOES.md) com a entidade de pintura
 * escolhida, e abre a obra. Erros (código inválido, já associado a outra empresa) ficam no formulário. */
export async function redeemAndGo(code: string, painterOrgId: string, _prev: FormState): Promise<FormState> {
  const { supabase, user } = await getUser();
  if (!user) return { errors: {}, message: 'A sessão expirou. Entre de novo.' };
  const { data, error } = await supabase.rpc('redeem_request_invite', { p_code: code, p_painter_org: painterOrgId });
  if (error || !data) return { errors: {}, message: error?.message ?? 'Não foi possível seguir este convite.' };
  redirect(`/app/oportunidades/${data}`);
}
