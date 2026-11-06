'use server';

import { revalidatePath } from 'next/cache';
import type { FormState } from '@/app/app/actions';
import { isPlatformAdmin } from '@/lib/access';
import { emitirRelatorio } from '@/lib/percursoNegocial';
import { recipients, sendEmail } from '@/lib/notify';
import { adminClient } from '@/lib/supabase/admin';
import { getUser } from '@/lib/supabase/server';

/**
 * A equipa emite o relatório (06/11/2026). Para o cliente, só depois de confirmar que **quem pediu é parte
 * da obra** (pessoa da entidade que fez o pedido); a emissão e a entrega ficam no registo da obra.
 * A versão completa (backoffice) emite-se para qualquer pedido, sem pedido do cliente.
 */
export async function emitir(requestId: string, destinatario: 'cliente' | 'backoffice', pedidoId: string | null): Promise<FormState> {
  if (destinatario !== 'cliente' && destinatario !== 'backoffice') return { errors: {}, message: 'Pedido inválido.' };
  const { supabase, user } = await getUser();
  if (!user || !(await isPlatformAdmin(supabase, user.id))) return { errors: {}, message: 'Só a equipa da plataforma emite relatórios.' };
  const db = adminClient();
  if (!db) return { errors: {}, message: 'Sem acesso ao serviço agora.' };

  if (destinatario === 'cliente') {
    if (!pedidoId) return { errors: {}, message: 'Falta o pedido do cliente.' };
    const { data: pedido } = await db.from('pedidos_de_relatorio').select('*').eq('id', pedidoId).eq('request_id', requestId).maybeSingle();
    if (!pedido) return { errors: {}, message: 'Pedido de relatório não encontrado.' };
    // Parte da obra: quem pediu tem de ser da entidade que fez o pedido (ou da administradora que a gere).
    const { data: entidade } = await db.from('organizations').select('id, gerida_por').eq('id', pedido.org_id).maybeSingle();
    const orgs = [pedido.org_id, ...(entidade?.gerida_por ? [entidade.gerida_por] : [])];
    const { data: membro } = await db.from('org_members').select('user_id').eq('user_id', pedido.pedido_por).in('org_id', orgs).limit(1).maybeSingle();
    const { data: dono } = await db.from('work_requests').select('org_id').eq('id', requestId).maybeSingle();
    if (!membro || dono?.org_id !== pedido.org_id) return { errors: {}, message: 'Quem pediu não é, hoje, parte desta obra. Não se entrega.' };
  }
  const r = await emitirRelatorio(db, { requestId, destinatario, pedidoId: destinatario === 'cliente' ? pedidoId : null, emitidoPor: user.id });
  if ('erro' in r) return { errors: {}, message: r.erro };
  if (destinatario === 'cliente') {
    const { data: pedido } = await db.from('pedidos_de_relatorio').select('org_id').eq('id', pedidoId!).maybeSingle();
    if (pedido) {
      await sendEmail(
        await recipients(pedido.org_id),
        'O relatório do percurso da obra está disponível',
        ['O relatório pedido está disponível na página do pedido, em Documentos. É gratuito.', 'É um registo do que aconteceu na plataforma, com as datas do servidor.'],
        `/app/pedidos/${requestId}/relatorio/${r.id}`,
        { cta: 'Abrir o relatório' },
      ).catch(() => false);
    }
  }
  revalidatePath('/app/backoffice/pedidos/relatorios');
  return { errors: {}, ok: true, message: `Emitido: versão ${r.versao}, SHA-256 ${r.sha256.slice(0, 16)}…` };
}
