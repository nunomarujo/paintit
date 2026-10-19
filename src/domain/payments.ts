import { clientDepositDue, type Engagement, type Movement } from './engagement';
import type { Cents } from './money';

// Pagamentos online (Stripe) da caução do cliente e da comissão do pintor.
// O Stripe guarda o dinheiro; a plataforma só dá instruções (cobrar, devolver).

export type PaymentKind = 'caucao' | 'comissao';

/** O que esta parte pode pagar agora online, ou null. */
export function onlinePaymentDue(e: Engagement, side: 'cliente' | 'pintor'): { kind: PaymentKind; amount: Cents } | null {
  if (side === 'cliente' && e.status === 'aguarda_deposito') {
    const amount = clientDepositDue(e);
    return amount > 0 ? { kind: 'caucao', amount } : null;
  }
  if (side === 'pintor' && e.status === 'aguarda_fee') return { kind: 'comissao', amount: e.fee.gross };
  return null;
}

const sum = (ms: Movement[], kind: Movement['kind']) => ms.filter((m) => m.kind === kind).reduce((n, m) => n + m.amount, 0);

/**
 * Devoluções que o motor de regras manda fazer e que ainda não foram executadas no Stripe.
 * `refunded` é o que já foi devolvido em cada tipo de pagamento.
 */
export function refundsDue(movements: Movement[], refunded: Record<PaymentKind, Cents>): Record<PaymentKind, Cents> {
  return {
    caucao: Math.max(0, sum(movements, 'devolucao_garantia') - refunded.caucao),
    comissao: Math.max(0, sum(movements, 'devolucao_fee') - refunded.comissao),
  };
}

/** Reparte uma devolução pelos pagamentos (mais recentes primeiro), sem exceder o que cada um ainda tem. */
export function allocateRefund(
  amount: Cents,
  payments: { id: string; amount: Cents; refunded: Cents; createdAt: string }[],
): { id: string; amount: Cents }[] {
  const out: { id: string; amount: Cents }[] = [];
  let left = amount;
  for (const p of [...payments].sort((a, b) => b.createdAt.localeCompare(a.createdAt))) {
    if (left <= 0) break;
    const take = Math.min(left, p.amount - p.refunded);
    if (take > 0) {
      out.push({ id: p.id, amount: take });
      left -= take;
    }
  }
  return out;
}
