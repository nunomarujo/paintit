import Link from 'next/link';
import { notFound } from 'next/navigation';
import { formatEuros } from '@/domain/money';
import { payoutStatus, supplierCommissionVat } from '@/domain/referral';
import { canManage, myRole } from '@/lib/access';
import { getUser } from '@/lib/supabase/server';
import { setReferralActive } from './actions';
import { InvoiceForm, NewCodeForm, PayoutDetailsForm } from './Forms';

const card = 'rounded-2xl border border-slate-200 bg-white p-6';
const ptDate = (iso: string | null) => (iso ? iso.slice(0, 10).split('-').reverse().join('/') : '');

export default async function ReferralPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, user } = await getUser();
  const { data: org } = await supabase.from('organizations').select('id, nome, kind, gerida_por').eq('id', id).maybeSingle();
  if (!org || org.kind !== 'fornecedor') notFound();
  const manager = canManage(await myRole(supabase, user!.id, org));
  const [{ data: codes }, { data: details }, { data: activity }] = await Promise.all([
    supabase.from('referral_codes').select('id, code, nota, active, painter_org_id, created_at').eq('supplier_org_id', id).order('created_at', { ascending: false }),
    supabase.from('supplier_payout_details').select('iban, titular, cobra_iva').eq('org_id', id).maybeSingle(),
    supabase.rpc('referral_activity', { p_org: id }),
  ]);
  const used = new Set((activity ?? []).filter((a) => a.estado && a.estado !== 'sem_efeito').map((a) => a.code));
  const toReceive = (activity ?? []).filter((a) => a.estado === 'adjudicada' || a.estado === 'fatura_recebida').reduce((n, a) => n + (a.amount_cents ?? 0), 0);
  const paid = (activity ?? []).filter((a) => a.estado === 'paga').reduce((n, a) => n + (a.amount_cents ?? 0), 0);

  return (
    <div className="space-y-8">
      <div>
        <Link href={`/app/organizacoes/${id}`} className="text-sm text-slate-600 hover:underline">
          ← {org.nome}
        </Link>
        <h1 className="mt-3 text-2xl font-semibold">Descontos a novos aderentes</h1>
        <p className="mt-1 max-w-3xl text-sm text-slate-600">
          Crie um código e entregue-o a um pintor que ainda não use a plataforma. Quando ele o aplicar ao orçamento e ganhar a obra, a comissão que paga à
          plataforma desce 0,25 pontos percentuais (de 3% para 2,75% do valor sem IVA) e a sua empresa recebe 0,25% desse valor, mais IVA se o cobrar.
          É paga por transferência depois de a plataforma receber a comissão do pintor, contra a sua fatura.
        </p>
      </div>

      <section className="grid gap-4 sm:grid-cols-3">
        {[
          ['Candidaturas', String((activity ?? []).length)],
          ['A receber', formatEuros(toReceive)],
          ['Já recebido', formatEuros(paid)],
        ].map(([k, v]) => (
          <div key={k} className={card}>
            <p className="text-sm text-slate-600">{k}</p>
            <p className="mt-1 text-2xl font-semibold">{v}</p>
          </div>
        ))}
      </section>

      <section className={card}>
        <h2 className="font-semibold">Dados para receber</h2>
        <p className="mt-1 text-sm text-slate-600">Necessários para lhe pagarmos. Sem IBAN não é possível enviar a fatura.</p>
        <div className="mt-4">
          {manager ? (
            <PayoutDetailsForm orgId={id} initial={details ? { iban: details.iban, titular: details.titular, cobraIva: details.cobra_iva } : null} />
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
                    <td className="py-2">
                      {!c.active ? 'Desativado' : used.has(c.code) ? 'Utilizado' : c.painter_org_id ? 'Em uso por um pintor' : 'Disponível'}
                    </td>
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
              const status = a.estado ? payoutStatus({ estado: a.estado, feeRecebidoEm: a.fee_recebido_em }) : null;
              const vat = a.amount_cents ? supplierCommissionVat(a.amount_cents, details?.cobra_iva ?? true) : 0;
              return (
                <li key={`${a.code}-${i}`} className="py-3 text-sm">
                  <p className="font-medium">
                    {a.pintor} <span className="font-normal text-slate-600">· código {a.code} · obra em {a.concelho ?? '—'} · {ptDate(a.submetida_em)}</span>
                  </p>
                  {status && a.amount_cents !== null ? (
                    <>
                      <p>
                        Ganhou a obra. Comissão: <strong>{formatEuros(a.amount_cents)}</strong>
                        {vat > 0 ? ` + IVA ${formatEuros(vat)} = ${formatEuros(a.amount_cents + vat)}` : ''}. {status.label}.
                        {a.estado === 'paga' && a.paga_em ? ` Paga em ${ptDate(a.paga_em)}${a.referencia_pagamento ? ` (${a.referencia_pagamento})` : ''}.` : ''}
                      </p>
                      {status.action && <p className="mt-1 font-medium text-amber-900">{status.action}</p>}
                      {manager && a.estado === 'adjudicada' && a.fee_recebido_em && a.payout_id && <InvoiceForm orgId={id} payoutId={a.payout_id} />}
                    </>
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
