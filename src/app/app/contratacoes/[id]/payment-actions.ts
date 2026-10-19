'use server';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import type { FormState } from '@/app/app/actions';
import { BRAND } from '@/config/brand';
import { onlinePaymentDue } from '@/domain/payments';
import { canManage, myRole } from '@/lib/access';
import { loadReplay } from '@/lib/engagements';
import { stripe } from '@/lib/stripe';
import { getUser } from '@/lib/supabase/server';

// Pagamento online da caução (cliente) ou da comissão (pintor). O valor vem das regras,
// nunca do navegador; só conta quando o Stripe o confirma no webhook.
export async function startEngagementPayment(engagementId: string, side: string, ...[]: [FormState]): Promise<FormState> {
  if (!stripe) return { errors: {}, message: 'Pagamentos online ainda não configurados.' };
  if (side !== 'cliente' && side !== 'pintor') return { errors: {}, message: 'Pedido inválido.' };
  const { supabase, user } = await getUser();
  if (!user) return { errors: {}, message: 'A sessão expirou.' };
  const { data: row } = await supabase.from('engagements').select('*').eq('id', engagementId).maybeSingle();
  if (!row) return { errors: {}, message: 'Contratação não encontrada.' };
  const orgId = side === 'cliente' ? row.client_org_id : row.painter_org_id;
  const { data: org } = await supabase.from('organizations').select('id, gerida_por').eq('id', orgId).maybeSingle();
  if (!org || !canManage(await myRole(supabase, user.id, org))) return { errors: {}, message: 'Sem permissão para pagar por esta entidade.' };

  const due = onlinePaymentDue((await loadReplay(supabase, row)).replay.engagement, side);
  if (!due) return { errors: {}, message: 'Não há nada a pagar neste momento.' };
  const origin = (await headers()).get('origin') ?? BRAND.url;
  const metadata = { engagement_id: row.id, kind: due.kind, user_id: user.id };
  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: 'eur',
          unit_amount: due.amount,
          product_data: {
            name: due.kind === 'caucao' ? 'Caução do cliente (devolvida na assinatura)' : 'Comissão de apresentação (IVA incluído)',
          },
        },
      },
    ],
    customer_email: user.email,
    client_reference_id: row.id,
    metadata,
    payment_intent_data: { metadata },
    locale: 'pt',
    success_url: `${origin}/app/contratacoes/${row.id}?pagamento=ok`,
    cancel_url: `${origin}/app/contratacoes/${row.id}`,
  });
  if (!session.url) return { errors: {}, message: 'O Stripe não devolveu a página de pagamento.' };
  redirect(session.url);
}
