import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { availableActions } from '@/domain/contracting';
import type { Database } from '@/lib/database.types';
import { loadReplay } from '@/lib/engagements';
import { pendingInvoices } from '@/lib/invoicing';

type Client = SupabaseClient<Database>;

/** O que espera por uma pessoa da equipa, por fila. Só contagens baratas (servem a barra lateral em cada página). */
export async function queueCounts(supabase: Client) {
  const head = { count: 'exact' as const, head: true };
  const [docs, photos, reports, appeals, redemptions, regimes, bank, unverified] = await Promise.all([
    supabase.from('org_documents').select('id', head).in('status', ['submetido', 'em_validacao']),
    supabase.from('request_photos').select('id', head).eq('revisao', 'pendente'),
    supabase.from('listing_reports').select('id', head).eq('status', 'pendente'),
    supabase.from('strike_appeals').select('id', head).eq('estado', 'pendente'),
    supabase.from('referral_redemptions').select('id', head).eq('estado', 'fatura_recebida'),
    supabase.from('supplier_payout_details').select('org_id', head).eq('regime_validado', false),
    supabase.from('bank_lines').select('id', head).eq('classificacao', 'por_classificar'),
    supabase.from('engagement_events').select('id', head).eq('payload->>metodo', 'cmd_pdf').eq('payload->>cadeiaConfiavel', 'false'),
  ]);
  const n = (r: { count: number | null }) => r.count ?? 0;
  return {
    documentos: n(docs),
    fotografias: n(photos),
    denuncias: n(reports),
    revisoes: n(appeals),
    resgates: n(redemptions),
    regimes: n(regimes),
    banco: n(bank),
    assinaturas: n(unverified),
  };
}
export type QueueCounts = Awaited<ReturnType<typeof queueCounts>>;

/**
 * Contratações à espera de uma confirmação da equipa (reconstrói cada uma: só no painel e na secção).
 *
 * Reconstruir uma contratação pode falhar (dados antigos de uma versão de regras já retirada, uma coluna
 * aditiva ainda por chegar à base real, etc.). Isto corre a cada visita ao painel: uma linha malformada não
 * pode derrubar a página inteira (22/10/2026 — ver docs/ESTADO.md, "server-side exception"), por isso cada
 * contratação é reconstruída isoladamente; a que falhar fica marcada com `error` e `pending: true`, para a
 * equipa a ver e investigar, em vez de desaparecer ou impedir as restantes de aparecer.
 */
export async function pendingEngagements(supabase: Client) {
  const { data: rows } = await supabase.from('engagements').select('*').order('created_at', { ascending: false });
  const items = await Promise.all(
    (rows ?? []).map(async (r) => {
      try {
        const { replay } = await loadReplay(supabase, r);
        return { r, e: replay.engagement, error: undefined as string | undefined };
      } catch (err) {
        return { r, e: null, error: err instanceof Error ? err.message : String(err) };
      }
    }),
  );
  return items.map((i) => ({ ...i, pending: i.e ? availableActions(i.e, 'plataforma').length > 0 : true }));
}

/** Documentos fiscais por emitir (só a contagem; barato o suficiente para a barra lateral). */
export async function invoicingCount(): Promise<number> {
  return (await pendingInvoices()).length;
}
