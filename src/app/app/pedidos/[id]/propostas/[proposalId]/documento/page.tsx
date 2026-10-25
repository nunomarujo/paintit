import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ProposalDocument } from '@/components/ProposalDocument';
import { alias } from '@/domain/proposal';
import { parseCapoto } from '@/lib/capoto';
import { myRole } from '@/lib/access';
import { loadReplay } from '@/lib/engagements';
import { toLine, toTerms } from '@/lib/proposals';
import { getUser } from '@/lib/supabase/server';

// Documento de orçamento (PROPOSTA.md, "Rever e enviar"): a versão A4, para imprimir ou guardar em
// PDF. O pintor pode pré-visualizá-lo ainda em rascunho (pedido do Nuno, 25/10/2026) e vê sempre a sua
// própria identidade (é a sua própria empresa); o cliente só vê propostas submetidas, e só conhece a
// identidade depois da apresentação (feePaid, docs/MODELO.md, CLAUDE.md regra 6) — até lá aparece como
// alias, exatamente como no comparador (propostas/page.tsx) e no dossiê.
export default async function ProposalDocumentPage({ params }: { params: Promise<{ id: string; proposalId: string }> }) {
  const { id, proposalId } = await params;
  const { supabase, user } = await getUser();

  const { data: req } = await supabase.from('work_requests').select('*').eq('id', id).maybeSingle();
  if (!req) notFound();

  const { data: proposal } = await supabase.from('proposals').select('*').eq('id', proposalId).eq('request_id', id).maybeSingle();
  if (!proposal) notFound();

  const role = await myRole(supabase, user!.id, { id: proposal.painter_org_id, gerida_por: null });
  const isPainterSide = role !== null;
  // Um rascunho só existe para a sua própria equipa (regra 11: nunca pelo que a consulta devolve, mas
  // pelo papel real em org_members); o cliente nunca o vê, mesmo que a política RLS alguma vez mudasse.
  if (proposal.status === 'rascunho' && !isPainterSide) notFound();

  const [{ data: building }, { data: surfaces }, { data: lines }, { data: painterOrg }, { data: engagement }] = await Promise.all([
    supabase.from('buildings').select('tipo, concelho').eq('id', req.building_id).maybeSingle(),
    supabase.from('request_surfaces').select('id, kind, descricao, area_cm2').eq('request_id', id).order('created_at'),
    supabase.from('proposal_lines').select('*').eq('proposal_id', proposalId).order('created_at'),
    supabase.from('organizations').select('nome, nif, telefone, email_contacto').eq('id', proposal.painter_org_id).maybeSingle(),
    supabase.from('engagements').select('*').eq('proposal_id', proposalId).maybeSingle(),
  ]);
  if (!painterOrg) notFound();

  // Ordem de chegada entre as propostas não-rascunho do pedido, para o mesmo alias do comparador.
  const { data: siblings } = await supabase
    .from('proposals')
    .select('id')
    .eq('request_id', id)
    .neq('status', 'rascunho')
    .order('submitted_at');
  const proposalIndex = (siblings ?? []).findIndex((p) => p.id === proposalId);

  const presented = engagement ? (await loadReplay(supabase, engagement)).replay.engagement.feePaid : false;
  const reveal = isPainterSide || presented;

  const zones = (surfaces ?? []).map((s) => ({ id: s.id, label: s.descricao?.trim() || s.kind, areaCm2: s.area_cm2 }));
  const areaTotalCm2 = (surfaces ?? []).reduce((n, s) => n + s.area_cm2, 0);

  const backHref = isPainterSide ? `/app/oportunidades/${id}` : `/app/pedidos/${id}/propostas`;
  const backLabel = isPainterSide ? '← Oportunidade' : '← Propostas recebidas';

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link href={backHref} className="text-sm text-slate-600 hover:underline">
          {backLabel}
        </Link>
        <p className="text-sm text-slate-500">Para guardar em PDF, use a impressão do navegador.</p>
      </div>
      {proposal.status === 'rascunho' && (
        <p className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800 print:hidden">
          Pré-visualização de rascunho. O cliente não vê esta página enquanto a proposta não for submetida.
        </p>
      )}
      <ProposalDocument
        identity={
          reveal
            ? { label: painterOrg.nome, nif: painterOrg.nif, telefone: painterOrg.telefone, emailContacto: painterOrg.email_contacto }
            : { label: alias(proposalIndex >= 0 ? proposalIndex : 0), nif: null, telefone: null, emailContacto: null }
        }
        request={{
          ref: req.ref,
          concelho: building?.concelho ?? '',
          tipoObra: req.tipo_obra,
          tipoImovel: building?.tipo ?? null,
          areaTotalCm2,
        }}
        zones={zones}
        lines={(lines ?? []).map((l) => ({ id: l.id, ...toLine(l) }))}
        terms={toTerms(proposal)}
        capoto={parseCapoto((proposal as { capoto?: unknown }).capoto)}
        submittedAt={proposal.submitted_at}
      />
    </div>
  );
}
