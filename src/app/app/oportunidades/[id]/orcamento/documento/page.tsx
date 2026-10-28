import { notFound } from 'next/navigation';
import { PrintButton } from '@/components/PrintButton';
import { ProposalDocument } from '@/components/ProposalDocument';
import { SURFACE_KIND_LABELS } from '@/domain/request';
import { parseCapoto } from '@/lib/capoto';
import { loadReplay } from '@/lib/engagements';
import { toLine, toTerms } from '@/lib/proposals';
import { painterOrgs } from '@/lib/queries';
import { getUser } from '@/lib/supabase/server';
import { Voltar } from '@/components/Voltar';

/**
 * O orçamento como documento, do lado do pintor: ver no ecrã e guardar em PDF (pedido do promotor,
 * 24/10/2026 — "uma vez submetida a proposta o ficheiro deve ficar disponível para consulta").
 *
 * Usa o mesmo `ProposalDocument` que o cliente vê, para não existirem dois documentos diferentes
 * para a mesma proposta. A diferença é só a identidade: aqui é a própria empresa a ver o seu
 * orçamento, por isso o nome e os contactos são os verdadeiros; do lado do cliente, o componente
 * recebe o alias até à apresentação.
 */
export default async function PainterQuoteDocumentPage({ params }: { params: Promise<{ id: string }> }) {
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
  if (!proposal || !listing) notFound();

  const { data: lines } = await supabase.from('proposal_lines').select('*').eq('proposal_id', proposal.id).order('created_at');
  const { data: engagement } = await supabase.from('engagements').select('*').eq('proposal_id', proposal.id).maybeSingle();
  const presented = engagement ? (await loadReplay(supabase, engagement)).replay.engagement.feePaid : false;
  const { data: org } = await supabase
    .from('organizations')
    .select('nome, nif, telefone, email_contacto')
    .eq('id', proposal.painter_org_id)
    .maybeSingle();

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Voltar href={`/app/oportunidades/${id}`}>Voltar ao pedido</Voltar>
        <PrintButton />
      </div>
      <ProposalDocument
        identity={{
          label: org?.nome ?? 'A sua empresa',
          nif: org?.nif ?? null,
          telefone: org?.telefone ?? null,
          emailContacto: org?.email_contacto ?? null,
        }}
        request={{
          ref: listing.ref,
          concelho: listing.concelho,
          tipoObra: listing.tipo_obra,
          tipoImovel: listing.tipo_imovel,
          areaTotalCm2: listing.area_total_cm2,
        }}
        zones={(surfaces ?? []).map((s) => ({
          id: s.id,
          label: s.descricao?.trim() || SURFACE_KIND_LABELS[s.kind],
          areaCm2: s.area_cm2 ?? 0,
        }))}
        lines={(lines ?? []).map((l) => ({ id: l.id, ...toLine(l) }))}
        terms={toTerms(proposal)}
        capoto={parseCapoto((proposal as { capoto?: unknown }).capoto)}
        revelado={presented}
        submittedAt={proposal.submitted_at}
      />
    </div>
  );
}
