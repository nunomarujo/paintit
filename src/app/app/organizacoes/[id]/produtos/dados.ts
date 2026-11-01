import { notFound } from 'next/navigation';
import { canManage, myRole } from '@/lib/access';
import { planAllows } from '@/domain/subscription';
import { getUser } from '@/lib/supabase/server';

/**
 * O que os três separadores de «Produtos e preços» precisam de saber antes de desenhar seja o que for:
 * quem é a empresa, se quem está a ver manda nela, e se o plano inclui catálogo.
 *
 * Num sítio só, para os três não divergirem — e porque a verificação de acesso é a parte que nunca pode
 * faltar num deles.
 */
export async function contextoDoCatalogo(id: string) {
  const { supabase, user } = await getUser();
  const { data: org } = await supabase.from('organizations').select('id, nome, kind, gerida_por').eq('id', id).maybeSingle();
  if (!org || org.kind !== 'fornecedor') notFound();
  const manager = canManage(await myRole(supabase, user!.id, org));
  const { data: sub } = await supabase.from('supplier_subscriptions').select('plan, status').eq('org_id', id).maybeSingle();
  const plan = sub?.status === 'ativa' ? sub.plan : null;
  return { supabase, user, org, manager, catalogo: planAllows(plan, 'catalogo') };
}
