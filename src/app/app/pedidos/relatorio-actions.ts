'use server';

import { revalidatePath } from 'next/cache';
import type { FormState } from '@/app/app/actions';
import { getUser } from '@/lib/supabase/server';

const MOTIVOS = ['litigio', 'disputa_de_consumo', 'outro'] as const;

/**
 * O cliente pede o relatório do percurso negocial da obra (06/11/2026). Gratuito: nenhum pagamento nem
 * subscrição. Quem emite é a equipa, que confirma antes que quem pede é parte da obra. O pedido entra
 * pela regra de acesso da base (só quem gere a entidade cliente do pedido) e fica no registo da obra.
 */
export async function pedirRelatorio(requestId: string, _prev: FormState, form: FormData): Promise<FormState> {
  const motivo = String(form.get('motivo') ?? '');
  if (!(MOTIVOS as readonly string[]).includes(motivo)) return { errors: { motivo: 'Escolha o motivo.' } };
  const nota = String(form.get('nota') ?? '').trim();
  if (nota.length > 1000) return { errors: { nota: 'A nota tem um máximo de 1000 caracteres.' } };
  const { supabase, user } = await getUser();
  if (!user) return { errors: {}, message: 'A sessão expirou. Entre de novo.' };
  const { data: pedido } = await supabase.from('work_requests').select('id, org_id').eq('id', requestId).maybeSingle();
  if (!pedido) return { errors: {}, message: 'Pedido não encontrado.' };
  const { error } = await supabase.from('pedidos_de_relatorio').insert({ request_id: pedido.id, org_id: pedido.org_id, motivo, nota: nota || null });
  if (error) return { errors: {}, message: 'O relatório pede-o quem gere a entidade que fez o pedido.' };
  revalidatePath(`/app/pedidos/${pedido.id}`);
  return { errors: {}, ok: true, message: 'Pedido registado. A equipa da plataforma emite o relatório e ele aparece aqui; é gratuito.' };
}
