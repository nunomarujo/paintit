import 'server-only';
import { localDate } from '@/domain/deadline';
import { commissionInvoice, retainedGuaranteeInvoice, subscriptionInvoice, type InvoiceDraft } from '@/domain/invoicing';
import { PLAN_INFO } from '@/domain/subscription';
import { CURRENT_RULES } from '@/domain/rules';
import { emitDocument, moloniConfigured } from '@/lib/moloni';
import { loadReplay } from '@/lib/engagements';
import { adminClient } from '@/lib/supabase/admin';

const tz = CURRENT_RULES.timeZone;
const day = (iso: string) => localDate(new Date(iso), tz);

async function customerOf(db: ReturnType<typeof adminClient>, orgId: string) {
  const { data: o } = await db!.from('organizations').select('nome, nif, morada_fiscal, codigo_postal, localidade').eq('id', orgId).maybeSingle();
  return { nome: o?.nome ?? 'Entidade', nif: o?.nif ?? null, morada: o?.morada_fiscal ?? null, codigoPostal: o?.codigo_postal ?? null, localidade: o?.localidade ?? null };
}

/** Documentos que faltam emitir (pendentes), para a fila do backoffice. Não escreve nada: só calcula. */
export async function pendingInvoices(): Promise<InvoiceDraft[]> {
  const db = adminClient();
  if (!db) return [];
  const [{ data: already }, { data: payments }, { data: subs }] = await Promise.all([
    db.from('fiscal_documents').select('origin_type, origin_id'),
    db.from('stripe_payments').select('*').eq('kind', 'comissao'),
    db.from('subscription_payments').select('*'),
  ]);
  const done = new Set((already ?? []).map((d) => `${d.origin_type}|${d.origin_id}`));
  const out: InvoiceDraft[] = [];

  for (const p of payments ?? []) {
    if (done.has(`stripe_payment|${p.payment_intent}`)) continue;
    const { data: e } = await db.from('engagements').select('painter_org_id').eq('id', p.engagement_id).maybeSingle();
    if (!e) continue;
    const pintor = await customerOf(db, e.painter_org_id);
    out.push(commissionInvoice({ paymentIntent: p.payment_intent, gross: p.amount_cents, data: day(p.created_at), pintor }));
  }

  for (const s of subs ?? []) {
    if (!s.org_id || done.has(`subscription_payment|${s.stripe_invoice_id}`)) continue;
    // A mesma tabela guarda as subscrições dos fornecedores e o plano Pro das empresas de pintura: o
    // que muda é só a designação que vai na fatura.
    const [{ data: sub }, { data: pro }] = await Promise.all([
      db.from('supplier_subscriptions').select('plan').eq('org_id', s.org_id).maybeSingle(),
      db.from('org_subscriptions').select('plano, periodicidade').eq('org_id', s.org_id).eq('plano', 'pro').maybeSingle(),
    ]);
    const planLabel = sub
      ? PLAN_INFO[sub.plan].label
      : pro
        ? `Plano Pro (${pro.periodicidade})`
        : 'Subscrição';
    const cliente = await customerOf(db, s.org_id);
    out.push(subscriptionInvoice({ stripeInvoiceId: s.stripe_invoice_id, planLabel, gross: s.amount_cents, vat: s.vat_cents, data: day(s.paid_at), fornecedor: cliente }));
  }

  // Caução retida: calculada pelo motor de regras, por contratação com depósito.
  const { data: deposits } = await db.from('stripe_payments').select('engagement_id').eq('kind', 'caucao');
  for (const id of [...new Set((deposits ?? []).map((d) => d.engagement_id))]) {
    const { data: row } = await db.from('engagements').select('*').eq('id', id).maybeSingle();
    if (!row) continue;
    // Uma contratação malformada não pode impedir o cálculo das restantes — esta fila alimenta a contagem da
    // barra lateral de todo o backoffice (invoicingCount), por isso uma falha aqui já derrubou páginas antes
    // (mesmo princípio de pendingEngagements em backofficeCounts.ts).
    let replay: Awaited<ReturnType<typeof loadReplay>>['replay'];
    try {
      replay = (await loadReplay(db, row)).replay;
    } catch {
      continue;
    }
    const kept = replay.engagement.movements.filter((m) => m.kind === 'retencao_garantia');
    const total = kept.reduce((n, m) => n + m.amount, 0);
    if (total <= 0 || done.has(`engagement|${id}:${total}`)) continue;
    const cliente = await customerOf(db, row.client_org_id);
    out.push(retainedGuaranteeInvoice({ engagementId: id, cumulative: total, data: kept.length ? day(kept[kept.length - 1]!.at) : day(row.created_at), cliente }));
  }
  return out;
}

export interface EmitResult {
  ok: boolean;
  message: string;
}

/** Emite um documento na Moloni e grava o resultado (ou o erro, para se repetir). Idempotente por (origem, id). */
export async function emitInvoice(draft: InvoiceDraft): Promise<EmitResult> {
  const db = adminClient();
  if (!db) return { ok: false, message: 'Sem chave do Supabase.' };
  if (!moloniConfigured) return { ok: false, message: 'Faturação (Moloni) ainda não configurada.' };
  const { data: existing } = await db.from('fiscal_documents').select('id, estado').eq('origin_type', draft.originType).eq('origin_id', draft.originId).maybeSingle();
  if (existing?.estado === 'emitido') return { ok: true, message: 'Já estava emitido.' };
  const total = draft.lines.reduce((n, l) => n + Math.round((l.quantidade * l.precoUnitario) / 100), 0);
  const base = {
    reason: draft.reason,
    origin_type: draft.originType,
    origin_id: draft.originId,
    tipo: draft.tipo,
    data: draft.data,
    cliente_nome: draft.customer.nome,
    cliente_nif: draft.customer.nif,
    total_cents: total,
    referencia_origin_type: draft.referencia?.originType ?? null,
    referencia_origin_id: draft.referencia?.originId ?? null,
  };
  try {
    const r = await emitDocument(draft);
    let pdfPath: string | null = null;
    if (r.pdfBytes) {
      pdfPath = `${draft.originType}/${draft.originId.replace(/[^a-z0-9_-]/gi, '_')}.pdf`;
      await db.storage.from('documentos-fiscais').upload(pdfPath, r.pdfBytes, { contentType: 'application/pdf', upsert: true });
    }
    await db.from('fiscal_documents').upsert(
      { ...base, estado: 'emitido', provider_document_id: r.providerDocumentId, numero: r.numero, atcud: r.atcud, pdf_path: pdfPath, erro: null, emitido_em: new Date().toISOString() },
      { onConflict: 'origin_type,origin_id' },
    );
    return { ok: true, message: `Emitido${r.numero ? ` (${r.numero})` : ''}.` };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await db.from('fiscal_documents').upsert({ ...base, estado: 'falhou', erro: msg.slice(0, 500) }, { onConflict: 'origin_type,origin_id' });
    return { ok: false, message: msg };
  }
}
