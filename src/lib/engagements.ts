import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { contractDraft, replay, type EngagementEvent, type EngagementRecord, type Replay } from '@/domain/contracting';
import { formatEuros, percentOf } from '@/domain/money';
import { INCLUSION_LABELS, UNIT_LABELS, lineTotal, proposalTotals } from '@/domain/proposal';
import type { Database } from '@/lib/database.types';
import { contractPdf } from '@/lib/contractPdf';
import { toLine, toTerms } from '@/lib/proposals';

type Client = SupabaseClient<Database>;
type EventRow = Database['public']['Tables']['engagement_events']['Row'];
type EngagementRow = Database['public']['Tables']['engagements']['Row'];

export const toEvent = (r: EventRow): EngagementEvent => ({
  id: r.id,
  kind: r.kind,
  amount: r.amount_cents,
  payload: (r.payload ?? {}) as EngagementEvent['payload'],
  at: r.at,
});

async function eventsOf(supabase: Client, engagementId: string) {
  const { data } = await supabase.from('engagement_events').select('*').eq('engagement_id', engagementId).order('at');
  return data ?? [];
}

/** Reconstrói a contratação, incluindo os valores transitados de uma anterior. */
export async function loadReplay(
  supabase: Client,
  row: EngagementRow,
  now = new Date(),
  extra: EngagementEvent[] = [],
): Promise<{ replay: Replay; events: EventRow[]; record: EngagementRecord }> {
  let carried: EngagementRecord['carried'];
  if (row.carried_from) {
    const { data: prev } = await supabase.from('engagements').select('*').eq('id', row.carried_from).maybeSingle();
    if (prev) {
      const prevReplay = (await loadReplay(supabase, prev, now)).replay;
      carried = prevReplay.carriedOut;
    }
  }
  const events = await eventsOf(supabase, row.id);
  const record: EngagementRecord = {
    id: row.id,
    base: row.base_cents,
    advance: row.advance_cents,
    rulesVersion: row.rules_version,
    createdAt: row.created_at,
    carried,
  };
  return { replay: replay(record, [...events.map(toEvent), ...extra], now), events, record };
}

const pt = (d: string | null) => (d ? d.split('-').reverse().join('/') : null);

/** Dados da minuta. Os dados identificativos só entram quando a base de dados os deixa ver. */
/**
 * Dados da minuta. Com `anonymous`, usa só o que as duas partes veem desde a
 * escolha (anúncio e proposta), sem identidades nem morada: é a versão que se
 * assina em PDF e que tem de dar os mesmos bytes para o cliente e para o pintor.
 * As identidades ficam nos certificados das assinaturas e na página da contratação.
 */
export async function loadDraft(supabase: Client, row: EngagementRow, opts: { anonymous?: boolean } = {}) {
  const [{ data: proposal }, { data: lines }, { data: listing }, { data: request }, { data: client }, { data: painter }] =
    await Promise.all([
      supabase.from('proposals').select('*').eq('id', row.proposal_id).single(),
      supabase.from('proposal_lines').select('*').eq('proposal_id', row.proposal_id).order('created_at'),
      supabase.from('request_listings').select('ref, concelho, descricao').eq('request_id', row.request_id).maybeSingle(),
      supabase.from('work_requests').select('ref, descricao, building_id').eq('id', row.request_id).maybeSingle(),
      supabase.from('organizations').select('nome, nif, morada_fiscal, codigo_postal, localidade').eq('id', row.client_org_id).maybeSingle(),
      supabase.from('organizations').select('nome, nif, morada_fiscal, codigo_postal, localidade').eq('id', row.painter_org_id).maybeSingle(),
    ]);
  const { data: building } = request
    ? await supabase.from('buildings').select('morada, codigo_postal, localidade, concelho').eq('id', request.building_id).maybeSingle()
    : { data: null };
  const terms = toTerms(proposal!);
  const ls = (lines ?? []).map(toLine);
  const t = proposalTotals(ls, terms.ivaBps);
  const address = (o: { morada_fiscal: string | null; codigo_postal: string | null; localidade: string | null } | null) =>
    o?.morada_fiscal ? `${o.morada_fiscal}, ${o.codigo_postal ?? ''} ${o.localidade ?? ''}`.trim() : null;
  const anon = opts.anonymous === true;
  return contractDraft({
    ref: listing?.ref ?? request?.ref ?? '',
    cliente: !anon && client ? { nome: client.nome, nif: client.nif, morada: address(client) } : null,
    pintor: !anon && painter ? { nome: painter.nome, nif: painter.nif, morada: address(painter) } : null,
    obra: {
      morada: !anon && building ? `${building.morada}, ${building.codigo_postal} ${building.localidade}` : null,
      concelho: anon ? (listing?.concelho ?? '') : (building?.concelho ?? listing?.concelho ?? ''),
      descricao: anon ? (listing?.descricao ?? '') : (request?.descricao ?? listing?.descricao ?? ''),
    },
    linhas: ls.map((l) => ({
      descricao: l.descricao,
      quantidade: `${(l.quantidade / 100).toLocaleString('pt-PT')} ${UNIT_LABELS[l.unidade]}`,
      total: formatEuros(lineTotal(l)),
      inclusao: l.inclusao === 'incluido' ? '' : INCLUSION_LABELS[l.inclusao],
    })),
    precoSemIva: formatEuros(t.base),
    iva: formatEuros(t.iva),
    totalComIva: formatEuros(t.totalComIva),
    prazo: `Duração estimada de ${terms.duracaoDias ?? '—'} dias${
      terms.inicioPossivel ? `, com início possível a ${pt(terms.inicioPossivel)}` : ''
    }, sujeita às condições meteorológicas.`,
    adiantamento:
      terms.adiantamentoBps > 0
        ? `Adiantamento de adjudicação de ${terms.adiantamentoBps / 100}% (${formatEuros(
            percentOf(t.base, terms.adiantamentoBps),
          )}), depositado no parceiro de pagamentos e libertado ao empreiteiro na assinatura.`
        : 'Sem adiantamento de adjudicação.',
    ajusteM2: terms.precoAjusteM2 !== null ? formatEuros(terms.precoAjusteM2) : 'preço por m² a acordar',
    materiais: await (async () => {
      const certified = (lines ?? []).filter((l) => l.product_id && l.inclusao === 'incluido');
      if (certified.length === 0) return [];
      const { data: prods } = await supabase.from('products').select('id, org_id').in('id', certified.map((l) => l.product_id!));
      const { data: sups } = await supabase.from('organizations').select('id, nome').eq('kind', 'fornecedor');
      return certified.map((l) => ({
        produto: l.produto ?? 'produto do catálogo',
        fornecedor: sups?.find((s) => s.id === prods?.find((p) => p.id === l.product_id)?.org_id)?.nome ?? 'fornecedor registado',
        linha: l.descricao,
      }));
    })(),
    garantiaObra: terms.garantiaAnos !== null ? `${terms.garantiaAnos} anos sobre os trabalhos executados.` : 'Nos termos da lei.',
    exclusoes: terms.exclusoes,
  });
}

/** PDF do contrato para assinar: versão sem identidades, sempre com os mesmos bytes. */
export async function contractPdfFor(supabase: Client, row: EngagementRow): Promise<Uint8Array> {
  return contractPdf(await loadDraft(supabase, row, { anonymous: true }), new Date(row.created_at), row.id.slice(0, 8).toUpperCase());
}

/** PDF já assinado por uma das partes, se existir. */
export async function signedPdf(supabase: Client, engagementId: string, side: 'cliente' | 'pintor'): Promise<Uint8Array | null> {
  const { data } = await supabase.storage.from('contratos').download(`${engagementId}/${side}.pdf`);
  return data ? new Uint8Array(await data.arrayBuffer()) : null;
}
