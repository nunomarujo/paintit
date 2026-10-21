import { syncLedger } from '@/lib/accounting';

// Todos os dias (vercel.json): lança no livro de movimentos o que ainda não está lançado.
// A Vercel envia "Authorization: Bearer CRON_SECRET".
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) return new Response('Não autorizado', { status: 401 });
  const r = await syncLedger();
  return Response.json(r, { status: r.errors.length ? 500 : 200 });
}
