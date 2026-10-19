import Link from 'next/link';
import { notFound } from 'next/navigation';
import { EVENT_LABELS, STATUS_LABELS, availableActions, clientDepositDue, isRevealed } from '@/domain/contracting';
import { held, settlement } from '@/domain/engagement';
import { formatEuros } from '@/domain/money';
import { alias, proposalTotals } from '@/domain/proposal';
import { canManage, isPlatformAdmin, myRole } from '@/lib/access';
import { loadReplay, missingCondoDocs } from '@/lib/engagements';
import { toLine } from '@/lib/proposals';
import { getUser } from '@/lib/supabase/server';
import { AnswerForm, ReviewForm } from '@/components/ExtrasForms';
import { Steps } from '@/components/Steps';
import { PartyAction, PlatformAction } from './ActionForms';
import { CarryForm } from './CarryForm';
import { PdfSign } from './PdfSign';

const card = 'rounded-2xl border border-slate-200 bg-white p-6';
const pt = (d: string | undefined) => (d ? d.split('-').reverse().join('/') : '—');
const euros = (c: number) => (c / 100).toFixed(2).replace('.', ',');
const dt = (iso: string) => new Date(iso).toLocaleString('pt-PT', { timeZone: 'Europe/Lisbon' });

export default async function EngagementPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, user } = await getUser();
  const { data: row } = await supabase.from('engagements').select('*').eq('id', id).maybeSingle();
  if (!row) notFound();

  const [{ data: clientOrg }, { data: painterOrg }, admin] = await Promise.all([
    supabase.from('organizations').select('*').eq('id', row.client_org_id).maybeSingle(),
    supabase.from('organizations').select('*').eq('id', row.painter_org_id).maybeSingle(),
    isPlatformAdmin(supabase, user!.id),
  ]);
  const clientRole = clientOrg ? await myRole(supabase, user!.id, clientOrg) : null;
  const painterRole = painterOrg ? await myRole(supabase, user!.id, painterOrg) : null;
  const side = clientRole ? 'cliente' : painterRole ? 'pintor' : admin ? 'plataforma' : null;
  if (!side) notFound();
  const manager = side === 'cliente' ? canManage(clientRole) : side === 'pintor' ? canManage(painterRole) : false;

  const { replay, events } = await loadReplay(supabase, row);
  const e = replay.engagement;
  const h = held(e);
  const s = settlement(e);
  const revealed = isRevealed(e);
  const partyActions = manager && side !== 'plataforma' ? availableActions(e, side) : [];
  const platformActions = admin ? availableActions(e, 'plataforma') : [];
  const due = clientDepositDue(e);
  const counterpart = side === 'pintor' ? clientOrg : side === 'cliente' ? painterOrg : null;
  const reference = row.id.slice(0, 8).toUpperCase();

  // Alternativas para transitar: as outras propostas do pedido que ficaram de fora.
  const canCarry = partyActions.includes('transitar');
  const { data: others } = canCarry
    ? await supabase.from('proposals').select('*').eq('request_id', row.request_id).neq('status', 'rascunho').order('submitted_at')
    : { data: [] };
  const { data: otherLines } = canCarry && others?.length
    ? await supabase.from('proposal_lines').select('*').in('proposal_id', others.map((o) => o.id))
    : { data: [] };

  const condoMissing = side === 'cliente' && partyActions.includes('cliente_assinou') ? await missingCondoDocs(supabase, row) : [];
  const { data: orders } = e.status === 'assinado' ? await supabase.from('material_orders').select('*').eq('engagement_id', id).neq('estado', 'cancelada') : { data: [] };
  const { data: review } = e.status === 'assinado' ? await supabase.from('reviews').select('*').eq('engagement_id', id).maybeSingle() : { data: null };

  return (
    <div className="space-y-8">
      <div>
        <Link
          href={side === 'cliente' ? `/app/pedidos/${row.request_id}/propostas` : '/app/contratacoes'}
          className="text-sm text-slate-600 hover:underline"
        >
          ← {side === 'cliente' ? 'Propostas do pedido' : 'Contratações'}
        </Link>
        <h1 className="mt-3 text-2xl font-semibold">Contratação {reference}</h1>
        <p className="mt-1 text-sm font-medium text-tinta-700">{STATUS_LABELS[e.status]}</p>
        <Steps
          steps={['Depósito do cliente', 'Assinatura do cliente', 'Comissão do pintor', 'Assinatura do pintor']}
          done={
            ({ aguarda_deposito: 0, aguarda_assinatura_cliente: 1, aguarda_fee: 2, aguarda_assinatura_pintor: 3, em_litigio: 3, assinado: 4 } as Record<string, number>)[
              e.status
            ] ?? 0
          }
        />
        <div className="mt-2 flex flex-wrap gap-4 text-sm">
          <Link href={`/app/contratacoes/${id}/minuta`} className="text-tinta-700 hover:underline">
            Ver {e.status === 'assinado' ? 'contrato' : 'minuta'} →
          </Link>
          {events.some((v) => v.kind === 'pintor_assinou' && (v.payload as { metodo?: string }).metodo === 'cmd_pdf') && (
            <a href={`/app/contratacoes/${id}/pdf?v=pintor`} className="text-tinta-700 hover:underline">
              Descarregar contrato assinado (PDF)
            </a>
          )}
          {side === 'pintor' && e.status === 'assinado' && (
            <Link href={`/app/obras/${id}`} className="text-slate-600 hover:underline">
              Ferramentas de obra
            </Link>
          )}
        </div>
      </div>

      <section className={card}>
        <h2 className="font-semibold">Valores</h2>
        <dl className="mt-3 grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
          <dt className="text-slate-500">Valor da obra sem IVA</dt>
          <dd className="font-semibold sm:text-right">{formatEuros(e.base)}</dd>
          <dt className="text-slate-500">Caução do cliente (3%)</dt>
          <dd className="sm:text-right">{formatEuros(e.guarantee)}</dd>
          <dt className="text-slate-500">Adiantamento de adjudicação</dt>
          <dd className="sm:text-right">{e.advance > 0 ? formatEuros(e.advance) : 'Nenhum'}</dd>
          <dt className="text-slate-500">Comissão do pintor (3% + IVA)</dt>
          <dd className="sm:text-right">
            {formatEuros(e.fee.gross)} <span className="text-slate-500">({formatEuros(e.fee.net)} + {formatEuros(e.fee.vat)})</span>
          </dd>
          {e.carriedCredit > 0 && (
            <>
              <dt className="text-slate-500">Transitado da contratação anterior</dt>
              <dd className="sm:text-right">{formatEuros(e.carriedCredit)}</dd>
            </>
          )}
          <dt className="text-slate-500">Retido agora no parceiro de pagamentos</dt>
          <dd className="sm:text-right">{formatEuros(h.guarantee + h.advance + h.fee)}</dd>
        </dl>
        {e.feeDue && e.status === 'aguarda_fee' && (
          <p className="mt-3 text-sm">
            Prazo para a comissão do pintor entrar: <strong>{pt(e.feeDue)}</strong>, até às 23:59 (Lisboa).
          </p>
        )}
        {e.signDue && e.status === 'aguarda_assinatura_pintor' && (
          <p className="mt-3 text-sm">
            Prazo para o pintor assinar: <strong>{pt(e.signDue)}</strong>, até às 23:59 (Lisboa).
          </p>
        )}
      </section>

      {e.status === 'aguarda_deposito' && side === 'cliente' && (
        <section className={`${card} border-tinta-100 bg-tinta-50`}>
          <h2 className="font-semibold">Depósito a fazer</h2>
          <p className="mt-2 text-sm">
            Deposite <strong>{formatEuros(due)}</strong> com a referência <strong>{reference}</strong>. O dinheiro fica no
            parceiro de pagamentos autorizado, nunca na plataforma. A caução é-lhe devolvida quando as duas partes
            assinarem; o adiantamento passa para o pintor nesse momento.
          </p>
          <p className="mt-2 text-xs text-slate-600">
            O parceiro de pagamentos ainda está a ser escolhido: os dados bancários serão indicados aqui. Até lá, a equipa da
            plataforma combina o depósito consigo.
          </p>
        </section>
      )}
      {e.status === 'aguarda_fee' && side === 'pintor' && (
        <section className={`${card} border-tinta-100 bg-tinta-50`}>
          <h2 className="font-semibold">Ganhou esta obra</h2>
          <p className="mt-2 text-sm">
            O cliente já assinou. Pague <strong>{formatEuros(e.fee.gross)}</strong> com a referência <strong>{reference}</strong>{' '}
            até <strong>{pt(e.feeDue)}</strong>. Quando o pagamento for confirmado, vê a identidade do cliente e a morada, e
            pode assinar. {e.advance > 0 && `O adiantamento de ${formatEuros(e.advance)} está reservado para si e é libertado quando assinar.`}
          </p>
        </section>
      )}

      {revealed && counterpart && (
        <section className={card}>
          <h2 className="font-semibold">{side === 'pintor' ? 'Cliente' : 'Pintor'}</h2>
          <dl className="mt-3 grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
            <dt className="text-slate-500">Nome</dt>
            <dd>{counterpart.nome}</dd>
            <dt className="text-slate-500">NIF</dt>
            <dd>{counterpart.nif ?? '—'}</dd>
            <dt className="text-slate-500">Morada</dt>
            <dd>
              {counterpart.morada_fiscal ? `${counterpart.morada_fiscal}, ${counterpart.codigo_postal ?? ''} ${counterpart.localidade ?? ''}` : '—'}
            </dd>
            <dt className="text-slate-500">Email</dt>
            <dd>{counterpart.email_contacto ?? '—'}</dd>
            <dt className="text-slate-500">Telefone</dt>
            <dd>{counterpart.telefone ?? '—'}</dd>
          </dl>
        </section>
      )}

      {(partyActions.length > 0 || platformActions.length > 0) && (
        <section className={card}>
          <h2 className="font-semibold">O que pode fazer agora</h2>
          <div className="mt-4 space-y-4">
            {platformActions.map((k) => (
              <PlatformAction
                key={k}
                engagementId={id}
                kind={k as 'deposito_confirmado' | 'fee_recebido' | 'litigio_resolvido'}
                expected={k === 'deposito_confirmado' ? euros(due) : k === 'fee_recebido' ? euros(e.fee.gross) : undefined}
              />
            ))}
            {condoMissing.length > 0 && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm">
                <p className="font-semibold">Antes de assinar em nome do condomínio</p>
                <p className="mt-1">
                  Envie na página do condomínio, e aguarde a validação: {condoMissing.join('; ')}. Quem assina tem de ter poderes
                  para obrigar o condomínio.
                </p>
                <Link href={`/app/organizacoes/${row.client_org_id}`} className="mt-2 inline-block font-semibold text-tinta-700 hover:underline">
                  Ir para os documentos do condomínio →
                </Link>
              </div>
            )}
            {partyActions.includes('cliente_assinou') && condoMissing.length === 0 && <PdfSign engagementId={id} side="cliente" />}
            {partyActions.includes('pintor_assinou') && <PdfSign engagementId={id} side="pintor" />}
            {partyActions
              .filter((k) => k !== 'transitar')
              .filter((k) => process.env.PERMITIR_ACEITACAO_SIMPLES === '1' || (k !== 'cliente_assinou' && k !== 'pintor_assinou'))
              .map((k) => (
                <PartyAction
                  key={k}
                  engagementId={id}
                  kind={k as 'cliente_assinou' | 'cliente_desistiu' | 'pintor_assinou' | 'litigio_aberto' | 'encerrar_sem_contrato'}
                />
              ))}
            {canCarry && (
              <div className="space-y-3 rounded-xl border border-slate-200 p-4 text-sm">
                <p>
                  O pintor não cumpriu. Pode passar para outra proposta: a caução e o adiantamento já depositados transitam
                  para ela.
                </p>
                {(others ?? []).map((o, i) =>
                  o.status === 'nao_selecionada' ? (
                    <div key={o.id} className="flex flex-wrap items-center justify-between gap-2">
                      <span>
                        {alias(i)} ·{' '}
                        {formatEuros(proposalTotals((otherLines ?? []).filter((l) => l.proposal_id === o.id).map(toLine), o.iva_bps).base)} sem IVA
                      </span>
                      <CarryForm engagementId={id} requestId={row.request_id} proposalId={o.id} label={`Passar para ${alias(i)}`} />
                    </div>
                  ) : null,
                )}
              </div>
            )}
          </div>
        </section>
      )}

      {['assinado', 'cliente_desistiu', 'litigio_culpa_cliente', 'litigio_culpa_pintor', 'encerrado_sem_contrato', 'transitado'].includes(e.status) && (
        <section className={card}>
          <h2 className="font-semibold">Acerto final</h2>
          <dl className="mt-3 grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
            <dt className="text-slate-500">Cliente entregou / recebeu</dt>
            <dd className="sm:text-right">
              {formatEuros(s.cliente.entregou)} / {formatEuros(s.cliente.recebeu)}
              {s.cliente.transitou > 0 ? ` (transitou ${formatEuros(s.cliente.transitou)})` : ''}
            </dd>
            <dt className="text-slate-500">Pintor entregou / recebeu</dt>
            <dd className="sm:text-right">
              {formatEuros(s.pintor.entregou)} / {formatEuros(s.pintor.recebeu)}
            </dd>
            <dt className="text-slate-500">Plataforma recebeu</dt>
            <dd className="sm:text-right">{formatEuros(s.plataforma.recebeu)}</dd>
          </dl>
        </section>
      )}

      {side === 'cliente' && (orders ?? []).length > 0 && (
        <section className={card}>
          <h2 className="font-semibold">Materiais comprometidos</h2>
          <ul className="mt-3 space-y-1 text-sm">
            {(orders ?? []).map((o) => (
              <li key={o.id}>
                {o.embalagens} embalagens · {o.estado === 'entregue' ? 'compra e entrega em obra confirmadas pelo fornecedor' : o.estado === 'confirmada' ? 'compra confirmada pelo fornecedor' : 'encomendado ao fornecedor'}
                {o.delivered_at ? ` (${dt(o.delivered_at)})` : ''}
              </li>
            ))}
          </ul>
        </section>
      )}

      {e.status === 'assinado' && side !== 'plataforma' && (
        <section className={card}>
          <h2 className="font-semibold">Avaliação</h2>
          {review && (
            <div className="mt-3 text-sm">
              <p>
                Qualidade {review.qualidade}/5 · Prazo {review.prazo}/5 · Comunicação {review.comunicacao}/5
              </p>
              {review.comentario && <p className="mt-1 whitespace-pre-line">{review.comentario}</p>}
              {review.resposta && (
                <p className="mt-2 rounded-lg bg-slate-50 p-2">
                  <span className="text-slate-500">Resposta do pintor: </span>
                  {review.resposta}
                </p>
              )}
            </div>
          )}
          <div className="mt-4">
            {side === 'cliente' && manager && (
              <ReviewForm
                engagementId={id}
                initial={review ? { qualidade: review.qualidade, prazo: review.prazo, comunicacao: review.comunicacao, comentario: review.comentario } : null}
              />
            )}
            {side === 'pintor' && manager && review && <AnswerForm engagementId={id} initial={review.resposta} />}
            {side === 'pintor' && !review && <p className="text-sm text-slate-600">O cliente ainda não avaliou.</p>}
          </div>
          <p className="mt-3 text-xs text-slate-500">
            A avaliação entra no histórico do pintor e aparece, sem o nome do cliente, quando o pintor faz novas propostas.
          </p>
        </section>
      )}

      <section className={card}>
        <h2 className="font-semibold">Histórico</h2>
        <ol className="mt-3 space-y-2 text-sm">
          {e.history.map((x, i) => (
            <li key={i} className="flex flex-wrap justify-between gap-2">
              <span>{x.event}</span>
              <span className="text-slate-500">{dt(x.at)}</span>
            </li>
          ))}
        </ol>
        {events.some((v) => (v.payload as { documentHash?: string } | null)?.documentHash) && (
          <div className="mt-4 border-t border-slate-100 pt-3 text-xs text-slate-500">
            {events
              .filter((v) => (v.payload as { documentHash?: string } | null)?.documentHash)
              .map((v) => (
                <p key={v.id} className="break-all">
                  {EVENT_LABELS[v.kind]}
                  {(v.payload as { signatario?: string }).signatario ? ` por ${(v.payload as { signatario?: string }).signatario}` : ''}
                  {(v.payload as { metodo?: string }).metodo === 'cmd_pdf'
                    ? (v.payload as { cadeiaConfiavel?: boolean }).cadeiaConfiavel
                      ? ' (assinatura em PDF, certificado do Estado)'
                      : ' (assinatura em PDF, origem do certificado por confirmar)'
                    : ' (aceitação simples, só em testes)'}
                  : SHA-256{' '}
                  {(v.payload as { documentHash: string }).documentHash}
                </p>
              ))}
          </div>
        )}
        {replay.rejected.length > 0 && (
          <div className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-800">
            <p className="font-medium">Registos sem efeito</p>
            <ul className="mt-1 list-disc pl-5">
              {replay.rejected.map((r) => (
                <li key={r.event.id}>
                  {EVENT_LABELS[r.event.kind]} ({dt(r.event.at)}): {r.reason}
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>
    </div>
  );
}
