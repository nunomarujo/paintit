import Link from 'next/link';
import { notFound } from 'next/navigation';
import { PrintButton } from '@/components/PrintButton';
import { QuoteDocument } from '@/components/QuoteDocument';
import { SURFACE_KIND_LABELS, formatArea } from '@/domain/request';
import { parseCapoto } from '@/lib/capoto';
import { toLine, toTerms } from '@/lib/proposals';
import { productsFor } from '@/lib/materials';
import { painterOrgs } from '@/lib/queries';
import { getUser } from '@/lib/supabase/server';

/**
 * O orçamento como documento, para ver no ecrã e guardar em PDF (pedido do promotor, 24/10/2026:
 * "o ficheiro do orçamento deve ficar disponível para consulta… e em PDF para download").
 *
 * Não há biblioteca de PDF: a página é preparada para imprimir, como já acontece com a minuta do
 * contrato e o dossiê do prédio, e o navegador guarda-a em PDF.
 */
export default async function QuoteDocumentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, user } = await getUser();
  const orgs = await painterOrgs(supabase, user!.id);
  if (orgs.length === 0) notFound();

  const [{ data: listing }, { data: surfaces }, { data: proposals }] = await Promise.all([
    supabase.from('request_listings').select('*').eq('request_id', id).maybeSingle(),
    supabase.from('request_surfaces').select('id, kind, descricao, area_cm2').eq('request_id', id).order('created_at'),
    supabase.from('proposals').select('*').eq('request_id', id).in('painter_org_id', orgs.map((o) => o.id)),
  ]);
  const proposal = proposals?.[0] ?? null;
  if (!proposal) notFound();

  const { data: lines } = await supabase.from('proposal_lines').select('*').eq('proposal_id', proposal.id).order('created_at');
  const { data: org } = await supabase
    .from('organizations')
    .select('nome, nif, telefone, email_contacto')
    .eq('id', proposal.painter_org_id)
    .maybeSingle();

  const zoneNames = Object.fromEntries(
    (surfaces ?? []).map((s) => [s.id, `${s.descricao?.trim() || SURFACE_KIND_LABELS[s.kind]} (${formatArea(s.area_cm2 ?? 0)})`]),
  );
  const domainLines = (lines ?? []).map((l) => ({ id: l.id, ...toLine(l) }));
  const products = Object.fromEntries(
    await productsFor(supabase, [...new Set(domainLines.map((l) => l.productId).filter((x): x is string => !!x))]),
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link href={`/app/oportunidades/${id}`} className="text-sm text-slate-600 hover:underline">
          ← Voltar ao pedido
        </Link>
        <PrintButton />
      </div>
      <QuoteDocument
        d={{
          pintor: {
            nome: org?.nome ?? 'A sua empresa',
            nif: org?.nif ?? null,
            telefone: org?.telefone ?? null,
            email: org?.email_contacto ?? null,
          },
          ref: listing?.ref ?? '—',
          concelho: listing?.concelho ?? null,
          tipoImovel: null,
          areaTotalCm2: listing?.area_total_cm2 ?? 0,
          data: (proposal.submitted_at ?? proposal.updated_at ?? '').slice(0, 10),
          validade: proposal.validade,
          lines: domainLines,
          terms: toTerms(proposal),
          zoneNames,
          products,
          capoto: parseCapoto((proposal as { capoto?: unknown }).capoto),
          apresentacao: proposal.notas || null,
        }}
      />
    </div>
  );
}
