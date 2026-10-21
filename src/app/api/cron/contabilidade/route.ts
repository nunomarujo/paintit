import { syncLedger } from '@/lib/accounting';
import { syncStripeData } from '@/lib/stripeSync';

// Todos os dias (vercel.json): lança no livro de movimentos o que ainda não está lançado.
// A Vercel envia "Authorization: Bearer CRON_SECRET".
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) return new Response('Não autorizado', { status: 401 });
  // Primeiro a Stripe (taxas, transferências, saldo), depois o livro.
  const stripe = await syncStripeData();
  const ledger = await syncLedger();
  const errors = [...stripe.errors, ...ledger.errors];
  return Response.json({ stripe: { lines: stripe.lines, payouts: stripe.payouts }, ledger: { posted: ledger.posted }, errors }, { status: errors.length ? 500 : 200 });
}
