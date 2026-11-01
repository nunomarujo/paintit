'use server';

import { revalidatePath } from 'next/cache';
import { getUser } from '@/lib/supabase/server';

export type EstadoDoVoto = { ok?: boolean; message?: string };

/** O voto do condómino. A base verifica tudo (acesso ao prédio, abertura, proposta do pedido, fecho). */
export async function votar(requestId: string, proposalId: string): Promise<EstadoDoVoto> {
  const { supabase, user } = await getUser();
  if (!user) return { message: 'A sessão expirou. Entre de novo.' };
  const { error } = await supabase.rpc('votar', { p_request: requestId, p_proposal: proposalId });
  if (error) return { message: error.message.replace(/^.*?: /, '') || 'Não foi possível registar o voto.' };
  revalidatePath(`/app/condominio/pedidos/${requestId}`);
  revalidatePath('/app/condominio');
  return { ok: true };
}
