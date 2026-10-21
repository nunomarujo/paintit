import 'server-only';
import { planPostings, type PlanSources } from '@/domain/accounting/plan';
import { localDate } from '@/domain/deadline';
import { CURRENT_RULES } from '@/domain/rules';
import { loadReplay } from '@/lib/engagements';
import { adminClient } from '@/lib/supabase/admin';

// Livro de movimentos: lê os acontecimentos que já existem (pagamentos Stripe, retenções, comissões de adesão, resgates,
// mensalidades) e grava o lançamento de cada um que ainda não tem, pela função acc_post, que é idempotente por (origem, origem_id).
// Corre todos os dias (cron) e quando a equipa pede «Sincronizar». As regras estão em src/domain/accounting/entries.ts.

const tz = CURRENT_RULES.timeZone;
const day = (iso: string) => localDate(new Date(iso), tz);

export interface SyncResult {
  posted: number;
  already: number;
  errors: string[];
}

/** Lê os acontecimentos, decide o que falta lançar (src/domain/accounting/plan.ts) e grava, um a um. */
export async function syncLedger(): Promise<SyncResult> {
  const db = adminClient();
  const out: SyncResult = { posted: 0, already: 0, errors: [] };
  if (!db) return { ...out, errors: ['Sem chave do Supabase.'] };

  const posted = new Set<string>();
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db.from('acc_entries').select('origem, origem_id').range(from, from + 999);
    if (error) return { ...out, errors: [`Leitura do livro falhou: ${error.message}`] };
    for (const e of data ?? []) posted.add(`${e.origem}|${e.origem_id}`);
    if ((data ?? []).length < 1000) break;
  }

  const [{ data: payments }, { data: payouts }, { data: redemptions }, { data: subs }] = await Promise.all([
    db.from('stripe_payments').select('*').order('created_at'),
    db.from('referral_payouts').select('id, amount_cents, estado, fee_recebido_em'),
    db.from('referral_redemptions').select('*'),
    db.from('subscription_payments').select('stripe_invoice_id, amount_cents, vat_cents, paid_at'),
  ]);

  // Caução retida: o motor de regras decide, contratação a contratação.
  const retentions: PlanSources['retentions'] = [];
  for (const id of [...new Set((payments ?? []).filter((p) => p.kind === 'caucao').map((p) => p.engagement_id))]) {
    try {
      const { data: row } = await db.from('engagements').select('*').eq('id', id).maybeSingle();
      if (!row) continue;
      const kept = (await loadReplay(db, row)).replay.engagement.movements.filter((m) => m.kind === 'retencao_garantia');
      retentions.push({ engagementId: id, totalCents: kept.reduce((n, m) => n + m.amount, 0), lastAt: kept.length ? kept[kept.length - 1]!.at : null });
    } catch (e) {
      out.errors.push(`Contratação ${id}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  const plan = planPostings({
    payments: (payments ?? []).map((p) => ({ kind: p.kind === 'comissao' ? 'comissao' : 'caucao', paymentIntent: p.payment_intent, amountCents: p.amount_cents, refundedCents: p.refunded_cents, createdAt: p.created_at })),
    retentions,
    payouts: (payouts ?? []).map((y) => ({ id: y.id, amountCents: y.amount_cents, estado: y.estado, feeRecebidoEm: y.fee_recebido_em })),
    redemptions: (redemptions ?? []).map((r) => ({ id: r.id, estado: r.estado, comissaoCents: r.comissao_cents, ivaCents: r.iva_cents, retencaoCents: r.retencao_cents, liquidoCents: r.liquido_cents, invoiceEm: r.invoice_em, pagaEm: r.paga_em })),
    subscriptions: (subs ?? []).map((s) => ({ invoiceId: s.stripe_invoice_id, amountCents: s.amount_cents, vatCents: s.vat_cents, paidAt: s.paid_at })),
    posted,
    today: localDate(new Date(), tz),
    day,
  });
  out.already = posted.size;
  for (const p of plan) {
    const { error } = await db.rpc('acc_post', {
      p_data: p.data,
      p_descricao: p.descricao,
      p_origem: p.origem,
      p_origem_id: p.origemId,
      p_lines: p.lines.map((l) => ({ conta: l.conta, debito: l.debito, credito: l.credito })),
    });
    if (error) out.errors.push(`${p.origem}/${p.origemId}: ${error.message}`);
    else out.posted++;
  }
  return out;
}
