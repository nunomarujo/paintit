import Link from 'next/link';
import { AddendaList } from '@/components/AddendaList';
import { AddendaDecision } from './AddendaDecision';
import { notFound } from 'next/navigation';
import { EVENT_LABELS, STATUS_LABELS, availableActions, clientDepositDue, isRevealed, reviewCategory } from '@/domain/contracting';
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
import { PayButton } from './PayButton';
import { stripeConfigured } from '@/lib/stripe';

const card = 'rounded-2xl border border-slate-200 bg-white p-4 sm:p-5';
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

  // Trabalhos a mais: o cliente responde aqui, que é onde já vem ver a contratação. O pintor vê-os
  // nas ferramentas de obra; aqui aparecem-lhe só para acompanhar.
  // A obra é o que agrega os trabalhos a mais; a contratação chega-lhes por aqui.
  const { data: obra } = await supabase.from('worksites').select('id').eq('engagement_id', id).maybeSingle();
  const { data: addendaRows } = obra
    ? await supabase
        .from('worksite_addenda')
        .select('id, descricao, valor_cents, estado, criada_em, respondida_em, foto_path')
        .eq('worksite_id', obra.id)
        .order('criada_em', { ascending: false })
    : { data: [] };
  const addenda = (addendaRows ?? []).map((a) => ({
    id: a.id,
    descricao: a.descricao,
    valorCents: a.valor_cents,
    estado: a.estado,
    criadaEm: a.criada_em,
    respondidaEm: a.respondida_em,
    temFotografia: Boolean(a.foto_path),
  }));

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
  const v2 = e.rules.flow === 'v2';

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
  const category = reviewCategory(e);
  const { data: review } = category ? await supabase.from('reviews').select('*').eq('engagement_id', id).maybeSingle() : { data: null };

  return (
    <div className="space-y-8">
      {addenda.length > 0 && (
        <section className="rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="text-[17px] font-semibold">Trabalhos a mais</h2>
          <p className="mt-1 max-w-[54ch] text-[17px] text-slate-600">
            {side === 'cliente'
              ? 'Trabalho que não estava no orçamento e que a empresa propõe fazer. Só é cobrado depois de o aceitar aqui.'
              : 'O que propôs ao cliente além do orçamento. Só conta para o valor da obra depois de ele aceitar.'}
          </p>
          <div className="mt-4">
            <AddendaList
              addenda={addenda}
              hoje={new Date().toISOString().slice(0, 10)}
              vazio="Sem trabalhos a mais."
              lado={side === 'cliente' ? 'cliente' : 'pintor'}
              acoes={(a) =>
                a.estado === 'proposta' && side === 'cliente' && manager ? (
                  <AddendaDecision engagementId={id} addendaId={a.id} />
                ) : null
              }
            />
          </div>
        </section>
      )}

      <div>
        <Link
          href={side === 'cliente' ? `/app/pedidos/${row.request_id}/propostas` : '/app/contratacoes'}
          className="text-[17px] text-slate-600 hover:underline"
        >
          ← {side === 'cliente' ? 'Propostas do pedido' : 'Contratações'}
        </Link>
        <h1 className="mt-3 text-[26px] leading-tight font-semibold">Contratação {reference}</h1>
        <p className="mt-1 text-[17px] font-medium text-tinta-700">{STATUS_LABELS[e.status]}</p>
        {v2 ? (
          <Steps
            steps={['Caução do cliente', side === 'cliente' ? 'Confirmação do pintor' : 'Comissão do pintor', 'Adiantamento', 'Assinatura do cliente', 'Assinatura do pintor']}
            done={
              (
                { aguarda_deposito: 0, aguarda_fee: 1, aguarda_adiantamento: 2, aguarda_assinatura_cliente: 3, aguarda_assinatura_pintor: 4, em_litigio: 3, assinado: 5 } as Record<
                  string,
                  number
                >
              )[e.status] ?? 0
            }
          />
        ) : (
          <Steps
            steps={['Depósito do cliente', 'Assinatura do cliente', side === 'cliente' ? 'Confirmação do pintor' : 'Comissão do pintor', 'Assinatura do pintor']}
            done={
              ({ aguarda_deposito: 0, aguarda_assinatura_cliente: 1, aguarda_fee: 2, aguarda_assinatura_pintor: 3, em_litigio: 3, assinado: 4 } as Record<string, number>)[
                e.status
              ] ?? 0
            }
          />
        )}
        <div className="mt-2 flex flex-wrap gap-4 text-[17px]">
          <Link href={`/app/contratacoes/${id}/minuta`} className="text-tinta-700 hover:underline">
            Ver {e.status === 'assinado' ? 'contrato' : 'minuta'} →
          </Link>
          {events.some((v) => v.kind === 'pintor_assinou' && (v.payload as { metodo?: string }).metodo === 'cmd_pdf') && (
            <a href={`/app/contratacoes/${id}/pdf?v=pintor`} className="text-tinta-700 hover:underline">
              Descarregar contrato assinado (PDF)
            </a>
          )}
          {side === 'pintor' && e.status === 'assinado' && (
            <Link href={`/app/obras/${obra?.id ?? ''}`} className="text-slate-600 hover:underline">
              Gestão de obra
            </Link>
          )}
        </div>
      </div>

      {addenda.length > 0 && (
        <section className={card}>
          <h2 className="font-semibold">Trabalhos a mais</h2>
          <p className="mt-1 max-w-[54ch] text-[17px] text-slate-600">
            {side === 'cliente'
              ? 'Trabalho que não estava no orçamento e que a empresa propõe fazer. Só é cobrado depois de o aceitar aqui.'
              : 'O que propôs ao cliente além do orçamento. Só conta para o valor da obra depois de ele aceitar.'}
          </p>
          <div className="mt-4">
            <AddendaList
              addenda={addenda}
              hoje={new Date().toISOString().slice(0, 10)}
              vazio="Sem trabalhos a mais."
              lado={side === 'cliente' ? 'cliente' : 'pintor'}
              acoes={(a) =>
                a.estado === 'proposta' && side === 'cliente' && manager ? (
                  <AddendaDecision engagementId={id} addendaId={a.id} />
                ) : null
              }
            />
          </div>
        </section>
      )}

      <section className={card}>
        <h2 className="font-semibold">Valores</h2>
        <dl className="mt-3 grid gap-x-6 gap-y-1 text-[17px] sm:grid-cols-2">
          <dt className="text-slate-500">Valor da obra sem IVA</dt>
          <dd className="font-semibold sm:text-right">{formatEuros(e.base)}</dd>
          <dt className="text-slate-500">Caução do cliente (3%)</dt>
          <dd className="sm:text-right">{formatEuros(e.guarantee)}</dd>
          <dt className="text-slate-500">Adiantamento de adjudicação</dt>
          <dd className="sm:text-right">{e.advance > 0 ? formatEuros(e.advance) : 'Nenhum'}</dd>
          {side !== 'cliente' && (
            <>
              <dt className="text-slate-500">Comissão do pintor (3% + IVA)</dt>
              <dd className="sm:text-right">
                {formatEuros(e.fee.gross)} <span className="text-slate-500">({formatEuros(e.fee.net)} + {formatEuros(e.fee.vat)})</span>
              </dd>
            </>
          )}
          {e.carriedCredit > 0 && (
            <>
              <dt className="text-slate-500">Transitado da contratação anterior</dt>
              <dd className="sm:text-right">{formatEuros(e.carriedCredit)}</dd>
            </>
          )}
          <dt className="text-slate-500">Retido agora no parceiro de pagamentos</dt>
          <dd className="sm:text-right">{formatEuros(h.guarantee + h.advance + (side === 'cliente' ? 0 : h.fee))}</dd>
        </dl>
        {e.feeDue && e.status === 'aguarda_fee' && (
          <p className="mt-3 text-[17px]">
            {side === 'cliente' ? 'Prazo para o pintor confirmar' : 'Prazo para a comissão do pintor entrar'}: <strong>{pt(e.feeDue)}</strong>, até às 23:59 (Lisboa).
          </p>
        )}
        {e.signDue && e.status === 'aguarda_assinatura_pintor' && (
          <p className="mt-3 text-[17px]">
            Prazo para o pintor assinar: <strong>{pt(e.signDue)}</strong>, até às 23:59 (Lisboa).
          </p>
        )}
      </section>

      {(e.status === 'aguarda_deposito' || e.status === 'aguarda_adiantamento') && side === 'cliente' && (
        <section className={`${card} border-tinta-100 bg-tinta-50`}>
          <h2 className="font-semibold">{e.status === 'aguarda_adiantamento' ? 'Adiantamento a depositar' : 'Depósito a fazer'}</h2>
          <p className="mt-2 text-[17px]">
            Deposite <strong>{formatEuros(due)}</strong> com a referência <strong>{reference}</strong>. O dinheiro fica no
            parceiro de pagamentos autorizado, nunca na plataforma.{' '}
            {v2
              ? e.status === 'aguarda_deposito'
                ? 'É a caução, uma garantia de interesse: é-lhe devolvida quando as duas partes assinarem. Se desistir antes de conhecer o pintor, também lhe é devolvida.'
                : `O adiantamento passa para o pintor quando as duas partes assinarem. Prazo para depositar e assinar: ${pt(e.clientDue)}.`
              : 'A caução é-lhe devolvida quando as duas partes assinarem; o adiantamento passa para o pintor nesse momento.'}
          </p>
          {stripeConfigured && e.status === 'aguarda_deposito' && manager ? (
            <>
              <PayButton engagementId={id} side="cliente" label={`Pagar a caução de ${formatEuros(due)}`} />
              <p className="mt-2 text-[15px] text-slate-600">
                Pagamento seguro no Stripe (instituição de pagamento autorizada). A devolução é automática quando as duas partes
                assinarem, ou se desistir antes de conhecer o pintor.
              </p>
            </>
          ) : (
            <p className="mt-2 text-[15px] text-slate-600">A equipa da plataforma combina o depósito consigo.</p>
          )}
        </section>
      )}
      {e.status === 'aguarda_fee' && side === 'pintor' && (
        <section className={`${card} border-tinta-100 bg-tinta-50`}>
          <h2 className="font-semibold">{v2 ? 'A sua proposta foi escolhida' : 'Ganhou esta obra'}</h2>
          <p className="mt-2 text-[17px]">
            {v2 ? 'O cliente depositou a caução.' : 'O cliente já assinou.'} Pague <strong>{formatEuros(e.fee.gross)}</strong> com a referência <strong>{reference}</strong>{' '}
            até <strong>{pt(e.feeDue)}</strong>. Quando o pagamento for confirmado, vê a identidade do cliente e a morada, e
            pode assinar. {e.advance > 0 && `O adiantamento de ${formatEuros(e.advance)} está reservado para si e é libertado quando assinar.`}
          </p>
          {stripeConfigured && manager && (
            <PayButton engagementId={id} side="pintor" label={`Pagar a comissão de ${formatEuros(e.fee.gross)}`} />
          )}
        </section>
      )}

      {revealed && counterpart && (
        <section className={card}>
          <h2 className="font-semibold">{side === 'pintor' ? 'Cliente' : 'Pintor'}</h2>
          <dl className="mt-3 grid gap-x-6 gap-y-1 text-[17px] sm:grid-cols-2">
            <dt className="text-slate-500">Nome</dt>
            <dd>{counterpart.nome}</dd>
            <dt className="text-slate-500">NIF</dt>
            <dd>{counterpart.nif ?? '—'}</dd>
            <dt className="text-slate-500">Morada</dt>
            <dd>
              {counterpart.morada_fiscal ? `${counterpart.morada_fiscal}, ${counterpart.codigo_postal ?? ''} ${counterpart.localidade ?? ''}` : '—'}
            </dd>
            <dt className="text-slate-500">Email</dt>
            <dd>{counterpart.email_contacto ?? 'Não indicado'}</dd>
            <dt className="text-slate-500">Telefone</dt>
            <dd>{counterpart.telefone ?? 'Não indicado'}</dd>
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
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-[17px]">
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
              <div className="space-y-3 rounded-xl border border-slate-200 p-4 text-[17px]">
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

      {['assinado', 'cliente_desistiu', 'litigio_culpa_cliente', 'litigio_culpa_pintor', 'litigio_repartido', 'encerrado_sem_contrato', 'transitado'].includes(e.status) && (
        <section className={card}>
          <h2 className="font-semibold">Acerto final</h2>
          <dl className="mt-3 grid gap-x-6 gap-y-1 text-[17px] sm:grid-cols-2">
            <dt className="text-slate-500">Cliente entregou / recebeu</dt>
            <dd className="sm:text-right">
              {formatEuros(s.cliente.entregou)} / {formatEuros(s.cliente.recebeu)}
              {s.cliente.transitou > 0 ? ` (transitou ${formatEuros(s.cliente.transitou)})` : ''}
            </dd>
            {side !== 'cliente' && (
              <>
                <dt className="text-slate-500">Pintor entregou / recebeu</dt>
                <dd className="sm:text-right">
                  {formatEuros(s.pintor.entregou)} / {formatEuros(s.pintor.recebeu)}
                </dd>
                <dt className="text-slate-500">Plataforma recebeu</dt>
                <dd className="sm:text-right">{formatEuros(s.plataforma.recebeu)}</dd>
              </>
            )}
          </dl>
        </section>
      )}

      {side === 'cliente' && (orders ?? []).length > 0 && (
        <section className={card}>
          <h2 className="font-semibold">Materiais comprometidos</h2>
          <ul className="mt-3 space-y-1 text-[17px]">
            {(orders ?? []).map((o) => (
              <li key={o.id}>
                {o.embalagens} embalagens · {o.estado === 'entregue' ? 'compra e entrega em obra confirmadas pelo fornecedor' : o.estado === 'confirmada' ? 'compra confirmada pelo fornecedor' : 'encomendado ao fornecedor'}
                {o.delivered_at ? ` (${dt(o.delivered_at)})` : ''}
              </li>
            ))}
          </ul>
        </section>
      )}

      {category && side !== 'plataforma' && (
        <section className={card}>
          <h2 className="font-semibold">Avaliação — {category === 'concluida' ? 'obra concluída' : 'obra cancelada'}</h2>
          {review && (
            <div className="mt-3 text-[17px]">
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
            {side === 'pintor' && !review && <p className="text-[17px] text-slate-600">O cliente ainda não avaliou.</p>}
          </div>
          <p className="mt-3 text-[15px] text-slate-500">
            {category === 'concluida'
              ? 'A avaliação entra na nota média do pintor e aparece, sem o nome do cliente, quando o pintor faz novas propostas.'
              : 'Por ser uma obra cancelada, esta avaliação não entra na nota média do pintor; fica visível só nesta contratação, para as duas partes.'}
          </p>
        </section>
      )}

      <section className={card}>
        <h2 className="font-semibold">Histórico</h2>
        <ol className="mt-3 space-y-2 text-[17px]">
          {e.history.map((x, i) => (
            <li key={i} className="flex flex-wrap justify-between gap-2">
              <span>{x.event}</span>
              <span className="text-slate-500">{dt(x.at)}</span>
            </li>
          ))}
        </ol>
        {events.some((v) => (v.payload as { metodo?: string; cadeiaConfiavel?: boolean } | null)?.metodo === 'cmd_pdf' && !(v.payload as { cadeiaConfiavel?: boolean }).cadeiaConfiavel) && (
          <p className="mt-4 rounded-xl border border-red-300 bg-red-50 p-3 text-[17px] text-red-800">
            Há uma assinatura cujo certificado não foi possível ligar ao Cartão de Cidadão ou à Chave Móvel Digital. A plataforma
            não o confirma; se continuarem, as partes assumem a responsabilidade.
          </p>
        )}
        {events.some((v) => (v.payload as { documentHash?: string } | null)?.documentHash) && (
          <div className="mt-4 border-t border-slate-100 pt-3 text-[15px] text-slate-500">
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
          <div className="mt-4 rounded-xl bg-red-50 p-3 text-[17px] text-red-800">
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
