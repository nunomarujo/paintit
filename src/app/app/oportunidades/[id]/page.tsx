import Link from 'next/link';
import { notFound } from 'next/navigation';
import { changeProposalStatus, createProposal, deleteLine } from '@/app/app/oportunidades/actions';
import { ReportListing } from '@/app/app/backoffice/ReportForms';
import { ListingPreview } from '@/components/ListingPreview';
import { MessageThread } from '@/components/MessageThread';
import { ProposalView } from '@/components/ProposalView';
import { painterFee } from '@/domain/commission';
import { hasLicenseFor, licenseLabel, requiredLicense } from '@/domain/license';
import { localDate } from '@/domain/deadline';
import { formatEuros } from '@/domain/money';
import { proposalTotals, submitBlockers } from '@/domain/proposal';
import { CURRENT_RULES } from '@/domain/rules';
import { toLine, toTerms } from '@/lib/proposals';
import { materialOptions } from '@/lib/materials';
import { painterOrgs } from '@/lib/queries';
import { getUser } from '@/lib/supabase/server';
import { LineForm, SubmitProposal, TermsForm } from './ProposalForms';

const card = 'rounded-2xl border border-slate-200 bg-white p-6';
const smallButton = 'rounded-lg border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50';

const STATUS: Record<string, string> = {
  rascunho: 'Rascunho: só a sua equipa a vê.',
  submetida: 'Submetida: o cliente vê-a, sem saber quem a fez.',
  retirada: 'Retirada.',
  selecionada: 'Escolhida pelo cliente. Segue-se a apresentação e a contratação.',
  nao_selecionada: 'O cliente escolheu outra proposta.',
  falhada: 'Foi escolhida, mas a contratação não avançou.',
};

export default async function OpportunityPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, user } = await getUser();
  const orgs = await painterOrgs(supabase, user!.id);
  if (orgs.length === 0) notFound();

  const [{ data: listing }, { data: surfaces }, { data: photos }, { data: proposals }] = await Promise.all([
    supabase.from('request_listings').select('*').eq('request_id', id).maybeSingle(),
    supabase.from('request_surfaces').select('kind, descricao, area_cm2').eq('request_id', id).order('created_at'),
    supabase.from('request_photos').select('id, legenda').eq('request_id', id).eq('revisao', 'aprovada'),
    supabase.from('proposals').select('*').eq('request_id', id).in('painter_org_id', orgs.map((o) => o.id)),
  ]);
  const proposal = proposals?.[0] ?? null;
  // Sem anúncio aberto, só se mostra a quem já tinha proposta.
  if (!listing && !proposal) notFound();

  const org = orgs.find((o) => o.id === proposal?.painter_org_id) ?? orgs.find((o) => o.manager) ?? orgs[0]!;
  const [{ data: lines }, { data: messages }] = proposal
    ? await Promise.all([
        supabase.from('proposal_lines').select('*').eq('proposal_id', proposal.id).order('created_at'),
        supabase.from('proposal_messages').select('id, lado, texto, created_at').eq('proposal_id', proposal.id).order('created_at'),
      ])
    : [{ data: [] }, { data: [] }];
  const domainLines = (lines ?? []).map((l) => ({ id: l.id, ...toLine(l) }));
  const draft = proposal?.status === 'rascunho';
  const terms = proposal ? toTerms(proposal) : null;
  const totals = terms ? proposalTotals(domainLines, terms.ivaBps) : null;
  const fee = totals && totals.base > 0 ? painterFee(totals.base, CURRENT_RULES) : null;
  const { data: licenses } = proposal
    ? await supabase
        .from('org_documents')
        .select('kind, classe, valido_ate')
        .eq('org_id', org.id)
        .eq('status', 'aprovado')
        .in('kind', ['certificado_impic', 'alvara_impic'])
    : { data: [] };
  const todayIso = localDate(new Date(), CURRENT_RULES.timeZone);
  const held = (licenses ?? [])
    .filter((d) => !d.valido_ate || d.valido_ate >= todayIso)
    .map((d) => ({ kind: d.kind === 'alvara_impic' ? ('alvara' as const) : ('certificado' as const), classe: d.classe }));
  const blockers =
    proposal && terms
      ? [
          ...submitBlockers({ terms, lines: domainLines, today: todayIso, requestOpen: listing?.aberto ?? false, viaPublica: listing?.ocupacao_via_publica }),
          ...(totals && totals.base > 0 && !hasLicenseFor(totals.base, held)
            ? [
                `Para uma obra deste valor precisa de ${licenseLabel(requiredLicense(totals.base))}, enviado e validado na página da sua empresa.`,
              ]
            : []),
        ]
      : [];
  const path = `/app/oportunidades/${id}`;
  const materials =
    draft && listing
      ? await materialOptions(supabase, {
          area: listing.area_total_cm2,
          concelho: listing.concelho,
          today: localDate(new Date(), CURRENT_RULES.timeZone),
        })
      : [];
  const { data: engagement } =
    proposal && ['selecionada', 'falhada'].includes(proposal.status)
      ? await supabase.from('engagements').select('id').eq('proposal_id', proposal.id).maybeSingle()
      : { data: null };

  return (
    <div className="space-y-8">
      <Link href="/app/oportunidades" className="text-sm text-slate-600 hover:underline">
        ← Oportunidades
      </Link>

      {listing && (
        <ListingPreview
          l={{
            ref: listing.ref,
            tipoObra: listing.tipo_obra,
            concelho: listing.concelho,
            tipoImovel: listing.tipo_imovel,
            pisos: listing.pisos,
            fachadas: listing.fachadas,
            temVarandas: listing.tem_varandas,
            descricao: listing.descricao,
            trabalhos: listing.trabalhos,
            corAcabamento: listing.cor_acabamento,
            prazoPropostas: listing.prazo_propostas,
            execucaoDesde: listing.execucao_desde,
            execucaoAte: listing.execucao_ate,
            surfaces: (surfaces ?? []).map((s) => ({ kind: s.kind, descricao: s.descricao, area: s.area_cm2 })),
            ocupacaoViaPublica: listing.ocupacao_via_publica,
            photos: photos ?? [],
          }}
        />
      )}

      {listing?.aberto && (
        <p className="rounded-xl border border-tinta-100 bg-tinta-50 p-4 text-sm">
          <strong>Dica:</strong> ao escolher materiais de um fornecedor registado na plataforma, o fornecedor confirma a
          compra e a entrega e o produto fica no contrato com o cliente. A proposta mostra “Material comprometido”, e os
          clientes tendem a preferir quem se compromete com o produto. Vê também os descontos que os fornecedores dão para
          esta obra.
        </p>
      )}
      {listing?.aberto && <ReportListing requestId={id} />}

      {!proposal ? (
        <section className={card}>
          <h2 className="font-semibold">Fazer proposta</h2>
          {org.manager ? (
            <form action={createProposal.bind(null, id, org.id)} className="mt-3">
              <p className="text-sm text-slate-600">
                Em nome de <strong>{org.nome}</strong>. A proposta fica em rascunho até a submeter.
              </p>
              <button type="submit" className="mt-3 rounded-lg bg-tinta-600 px-5 py-2 font-semibold text-white hover:bg-tinta-700">
                Começar proposta
              </button>
            </form>
          ) : (
            <p className="mt-2 text-sm text-slate-600">Só proprietários e gestores da entidade podem fazer propostas.</p>
          )}
        </section>
      ) : (
        <>
          <section className={card}>
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="font-semibold">
                A sua proposta{proposal.version > 1 ? ` (versão ${proposal.version})` : ''}
              </h2>
              <span className="text-sm text-slate-600">{STATUS[proposal.status]}</span>
            </div>
            {engagement && (
              <Link
                href={`/app/contratacoes/${engagement.id}`}
                className="mt-3 block rounded-xl bg-tinta-50 p-3 text-sm font-semibold text-tinta-900 hover:bg-tinta-100"
              >
                Ir para a contratação (comissão, contrato e assinatura) →
              </Link>
            )}
            {proposal.status === 'submetida' && listing && proposal.request_version !== null && proposal.request_version < (listing.version ?? 0) && (
              <p className="mt-3 rounded-xl bg-amber-50 p-3 text-sm">
                O cliente alterou o pedido depois da sua submissão. Reveja a proposta para continuar a concorrer.
              </p>
            )}
            <div className="mt-4">
              <ProposalView
                lines={domainLines}
                terms={terms!}
                onDelete={
                  draft && org.manager
                    ? (lineId) => (
                        <form action={deleteLine.bind(null, id, lineId)}>
                          <button type="submit" className="text-red-700 hover:underline">
                            Remover
                          </button>
                        </form>
                      )
                    : undefined
                }
              />
            </div>
            {fee && (
              <p className="mt-4 rounded-xl bg-slate-50 p-3 text-sm text-slate-700">
                Se for escolhido, paga à plataforma {formatEuros(fee.gross)} ({formatEuros(fee.net)} de comissão +{' '}
                {formatEuros(fee.vat)} de IVA), em 8 dias depois de o cliente assinar. Só depois disso assina e recebe os contactos. Não é somado ao preço do cliente.
              </p>
            )}
            {proposal.status === 'submetida' && org.manager && (
              <div className="mt-4 flex flex-wrap gap-2">
                <form action={changeProposalStatus.bind(null, proposal.id, id, 'rascunho')}>
                  <button type="submit" className={smallButton}>
                    Rever proposta
                  </button>
                </form>
                <form action={changeProposalStatus.bind(null, proposal.id, id, 'retirada')}>
                  <button type="submit" className={smallButton}>
                    Retirar
                  </button>
                </form>
              </div>
            )}
          </section>

          {draft && org.manager && (
            <>
              <section className={card}>
                <LineForm
                  proposalId={proposal.id}
                  requestId={id}
                  surfaces={(surfaces ?? []).map((s) => s.kind)}
                  materials={materials}
                />
              </section>
              <section className={card}>
                <h2 className="font-semibold">Condições</h2>
                <div className="mt-4">
                  <TermsForm proposalId={proposal.id} requestId={id} terms={terms!} />
                </div>
              </section>
              <section className={card}>
                <SubmitProposal proposalId={proposal.id} requestId={id} blockers={blockers} />
              </section>
            </>
          )}

          <section className={card}>
            <h2 className="font-semibold">Mensagens com o cliente</h2>
            <p className="mt-1 text-sm text-slate-600">
              Para esclarecimentos técnicos. O cliente vê as suas perguntas mesmo antes de submeter a proposta.
            </p>
            <div className="mt-4">
              <MessageThread
                proposalId={proposal.id}
                side="pintor"
                path={path}
                messages={messages ?? []}
                canWrite={org.manager && ['rascunho', 'submetida', 'selecionada'].includes(proposal.status)}
                otherLabel="Cliente"
              />
            </div>
          </section>
        </>
      )}
    </div>
  );
}
