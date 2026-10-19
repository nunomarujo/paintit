import Link from 'next/link';
import { notFound } from 'next/navigation';
import { EVENT_LABELS, STATUS_LABELS, availableActions, clientDepositDue, isRevealed } from '@/domain/contracting';
import { held, settlement } from '@/domain/engagement';
import { formatEuros } from '@/domain/money';
import { alias, proposalTotals } from '@/domain/proposal';
import { canManage, isPlatformAdmin, myRole } from '@/lib/access';
import { loadReplay } from '@/lib/engagements';
import { toLine } from '@/lib/proposals';
import { getUser } from '@/lib/supabase/server';
import { PartyAction, PlatformAction } from './ActionForms';
import { CarryForm } from './CarryForm';

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
        <Link href={`/app/contratacoes/${id}/minuta`} className="mt-2 inline-block text-sm text-tinta-700 hover:underline">
          Ver {e.status === 'assinado' ? 'contrato' : 'minuta'} →
        </Link>
      </div>

      <section className={card}>
        <h2 className="font-semibold">Valores</h2>
        <dl className="mt-3 grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
          <dt className="text-slate-500">Valor da obra sem IVA</dt>
          <dd className="font-semibold sm:text-right">{formatEuros(e.base)}</dd>
          <dt className="text-slate-500">Garantia do cliente (3%)</dt>
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
            parceiro de pagamentos autorizado, nunca na plataforma. A garantia é-lhe devolvida quando as duas partes
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
            {partyActions
              .filter((k) => k !== 'transitar')
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
                  O pintor não cumpriu. Pode passar para outra proposta: a garantia e o adiantamento já depositados transitam
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
                  {EVENT_LABELS[v.kind]}: SHA-256 {(v.payload as { documentHash: string }).documentHash}
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
