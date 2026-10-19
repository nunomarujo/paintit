import { settleRefunds } from '@/lib/payments';
import { adminClient } from '@/lib/supabase/admin';

// Corre uma vez por dia (vercel.json): prazos que expiram sem ninguém agir (ex.: pintor não
// assina) também geram devoluções. A Vercel envia "Authorization: Bearer CRON_SECRET".
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) return new Response('Não autorizado', { status: 401 });
  const db = adminClient();
  if (!db) return new Response('Não configurado', { status: 503 });
  const { data } = await db.from('stripe_payments').select('engagement_id');
  const ids = [...new Set((data ?? []).map((p) => p.engagement_id))];
  for (const id of ids) await settleRefunds(id).catch(() => undefined);
  return Response.json({ verificadas: ids.length });
}
