import Link from 'next/link';
import { notFound } from 'next/navigation';
import { formatEuros } from '@/domain/money';
import { payoutStatus, supplierBalance } from '@/domain/referral';
import { canManage, myRole } from '@/lib/access';
import { COMPANY } from '@/config/company';
import { getUser } from '@/lib/supabase/server';

const COMPANY_NAME = COMPANY.name;
const COMPANY_NIF = COMPANY.nif;
import { cancelRedemption, setReferralActive } from './actions';
import { InvoiceForm, NewCodeForm, PayoutDetailsForm, RedeemButton } from './Forms';

const card = 'rounded-2xl border border-slate-200 bg-white p-6';
const ptDate = (iso: string | null) => (iso ? iso.slice(0, 10).split('-').reverse().join('/') : '');

export default async function ReferralPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, user } = await getUser();
  const { data: org } = await supabase.from('organizations').select('id, nome, kind, gerida_por').eq('id', id).maybeSingle();
  if (!org || org.kind !== 'fornecedor') notFound();
  const manager = canManage(await myRole(supabase, user!.id, org));
  const [{ data: codes }, { data: details }, { data: activity }, { data: payouts }, { data: redemptions }] = await Promise.all([
    supabase.from('referral_codes').select('id, code, nota, active, painter_org_id, created_at').eq('supplier_org_id', id).order('created_at', { ascending: false }),
    supabase.from('supplier_payout_details').select('iban, titular, cobra_iva, isencao_iva, declaracao_retencao, regime_validado, retencao_bps').eq('org_id', id).maybeSingle(),
    supabase.rpc('referral_activity', { p_org: id }),
    supabase.from('referral_payouts').select('id, amount_cents, estado, fee_recebido_em, redemption_id').eq('supplier_org_id', id),
    supabase.from('referral_redemptions').select('*').eq('supplier_org_id', id).order('created_at', { ascending: false }),
  ]);
  const balance = supplierBalance((payouts ?? []).map((p) => ({ estado: p.estado, feeRecebidoEm: p.fee_recebido_em, redemptionId: p.redemption_id, amount: p.amount_cents })));
  const openRedemption = (redemptions ?? []).some((r) => r.estado === 'pedido' || r.estado === 'fatura_recebida');
  const canRedeem = !!details && details.regime_validado && balance.disponivel > 0 && !openRedemption;
  const why = !details
    ? 'Indique primeiro os dados de pagamento.'
    : !details.regime_validado
      ? 'O regime declarado aguarda validação da plataforma.'
      : openRedemption
        ? 'Já tem um resgate em curso.'
        : balance.disponivel <= 0
          ? 'Ainda não há saldo disponível.'
          : null;

  return (
    <div className="space-y-8">
      <div>
        <Link href={`/app/organizacoes/${id}`} className="text-sm text-slate-600 hover:underline">
          ← {org.nome}
        </Link>
        <h1 className="mt-3 text-2xl font-semibold">Descontos a novos aderentes</h1>
        <p className="mt-1 max-w-3xl text-sm text-slate-600">
          Crie um código e entregue-o a um pintor que ainda não use a plataforma. Quando ele o aplicar a um orçamento, fica ligado à sua empresa: a comissão
          que paga à plataforma desce 0,25 pontos percentuais em todas as obras que ganhar a partir daí, enquanto o código estiver ativo — some com códigos
          de outros fornecedores que também tenha aplicado. A sua empresa recebe 1% do valor de cada obra ganha por um pintor que referenciou (2% a partir
          da 3.ª obra, nos 2 meses anteriores a cada uma), mais IVA se o cobrar, em saldo que pode resgatar quando quiser. O código não se esgota: desative-o
          quando quiser cortar a relação.
        </p>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ['Saldo disponível', formatEuros(balance.disponivel)],
          ['A aguardar o pintor', formatEuros(balance.adjudicada)],
          ['Em resgate', formatEuros(balance.em_resgate)],
          ['Já recebido', formatEuros(balance.paga)],
        ].map(([k, v]) => (
          <div key={k} className={card}>
            <p className="text-sm text-slate-600">{k}</p>
            <p className="mt-1 text-2xl font-semibold">{v}</p>
          </div>
        ))}
      </section>

      <section className={card}>
        <h2 className="font-semibold">Resgatar o saldo</h2>
        <p className="mt-1 max-w-3xl text-sm text-slate-600">
          As comissões acumulam no saldo quando a plataforma recebe a comissão do pintor. Pode resgatá-lo quando quiser: indicamos o valor a faturar (comissão, mais IVA se liquida,
          menos retenção, se houver), envia uma só fatura e a plataforma paga por transferência.
        </p>
        {manager && (
          <div className="mt-4">
            <RedeemButton orgId={id} disabled={!canRedeem} />
            {why && <p className="mt-2 text-sm text-slate-600">{why}</p>}
          </div>
        )}
        {(redemptions ?? []).length > 0 && (
          <ul className="mt-4 divide-y divide-slate-100 text-sm">
            {(redemptions ?? []).map((r) => (
              <li key={r.id} className="py-3">
                <p className="font-medium">
                  Resgate de {ptDate(r.created_at)}:{' '}
                  {r.estado === 'pedido' ? 'a aguardar a sua fatura' : r.estado === 'fatura_recebida' ? 'fatura recebida, a aguardar pagamento' : r.estado === 'paga' ? `pago em ${ptDate(r.paga_em)}${r.referencia_pagamento ? ` (${r.referencia_pagamento})` : ''}` : 'anulado'}
                </p>
                <p className="text-slate-600">
                  Comissão {formatEuros(r.comissao_cents)}
                  {r.iva_cents > 0 ? ` + IVA ${formatEuros(r.iva_cents)}` : r.cobra_iva ? '' : ` (isento${r.isencao_iva ? `: ${r.isencao_iva}` : ''})`}
                  {r.retencao_cents > 0 ? ` − retenção ${formatEuros(r.retencao_cents)} (${r.retencao_bps / 100}%)` : ''} = <strong>{formatEuros(r.liquido_cents)}</strong> a receber.
                  {r.estado === 'pedido' || r.estado === 'fatura_recebida' ? ` A fatura deve ser de ${formatEuros(r.comissao_cents + r.iva_cents)} (comissão${r.iva_cents > 0 ? ' mais IVA' : ''}), emitida à ${COMPANY_NAME}, NIF ${COMPANY_NIF}.` : ''}
                  {r.invoice_numero ? ` Fatura ${r.invoice_numero}.` : ''}
                </p>
                {manager && r.estado === 'pedido' && (
                  <>
                    <InvoiceForm orgId={id} redemptionId={r.id} />
                    <form action={cancelRedemption.bind(null, id, r.id)} className="mt-2">
                      <button type="submit" className="text-sm text-slate-600 hover:underline">
                        Cancelar este resgate
                      </button>
                    </form>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className={card}>
        <h2 className="font-semibold">Dados para receber</h2>
        <p className="mt-1 text-sm text-slate-600">Necessários para lhe pagarmos. Sem IBAN não é possível enviar a fatura.</p>
        <div className="mt-4">
          {manager ? (
            <PayoutDetailsForm
              orgId={id}
              initial={
                details
                  ? {
                      iban: details.iban,
                      titular: details.titular,
                      cobraIva: details.cobra_iva,
                      isencao: details.isencao_iva ?? '',
                      retencao: details.declaracao_retencao ?? '',
                      validado: details.regime_validado,
                      retencaoBps: details.retencao_bps,
                    }
                  : null
              }
            />
          ) : (
            <p className="text-sm">{details ? `${details.titular}, ${details.iban}` : 'Por indicar.'}</p>
          )}
        </div>
      </section>

      <section className={card}>
        <h2 className="font-semibold">Códigos</h2>
        {manager && (
          <div className="mt-4">
            <NewCodeForm orgId={id} />
          </div>
        )}
        {(codes ?? []).length === 0 ? (
          <p className="mt-4 text-sm text-slate-600">Ainda não criou nenhum código.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[34rem] text-left text-sm">
              <thead className="text-slate-500">
                <tr>
                  <th className="py-2 font-normal">Código</th>
                  <th className="py-2 font-normal">Nota</th>
                  <th className="py-2 font-normal">Estado</th>
                  <th />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(codes ?? []).map((c) => (
                  <tr key={c.id}>
                    <td className="py-2 font-mono text-base font-semibold tracking-wider">{c.code}</td>
                    <td className="py-2 text-slate-600">{c.nota ?? ''}</td>
                    <td className="py-2">{!c.active ? 'Desativado' : c.painter_org_id ? 'Ligado a um pintor' : 'Disponível'}</td>
                    <td className="py-2 text-right">
                      {manager && (
                        <form action={setReferralActive.bind(null, id, c.id, !c.active)}>
                          <button type="submit" className="text-sm text-tinta-700 hover:underline">
                            {c.active ? 'Desativar' : 'Reativar'}
                          </button>
                        </form>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className={card}>
        <h2 className="font-semibold">Candidaturas e comissões</h2>
        {(activity ?? []).length === 0 ? (
          <p className="mt-2 text-sm text-slate-600">Quando um pintor submeter um orçamento com um código seu, aparece aqui.</p>
        ) : (
          <ul className="mt-4 divide-y divide-slate-100">
            {(activity ?? []).map((a, i) => {
              const status = a.estado ? payoutStatus({ estado: a.estado, feeRecebidoEm: a.fee_recebido_em, redemptionId: (payouts ?? []).find((p) => p.id === a.payout_id)?.redemption_id ?? null }) : null;
              return (
                <li key={`${a.code}-${i}`} className="py-3 text-sm">
                  <p className="font-medium">
                    {a.pintor} <span className="font-normal text-slate-600">· código {a.code} · obra em {a.concelho ?? '—'} · {ptDate(a.submetida_em)}</span>
                  </p>
                  {status && a.amount_cents !== null ? (
                    <p>
                      Ganhou a obra. Comissão <strong>{formatEuros(a.amount_cents)}</strong> (sem IVA). {status.label}.
                    </p>
                  ) : (
                    <p className="text-slate-600">
                      {a.proposta_estado === 'submetida' ? 'Candidatura em avaliação pelo cliente.' : a.proposta_estado === 'nao_selecionada' ? 'Não foi escolhido.' : a.proposta_estado === 'retirada' ? 'Proposta retirada.' : 'Em curso.'}
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
