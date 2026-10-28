import Link from 'next/link';
import { notFound } from 'next/navigation';
import { formatEuros } from '@/domain/money';
import { getUser } from '@/lib/supabase/server';
import { CoverageForm, RedeemButton, SurveyInvoiceForm } from './Forms';
import { ReserveButton } from './ReserveButton';

const card = 'rounded-2xl border border-slate-200 bg-white p-4 sm:p-5';
const dt = (iso: string | null) => (iso ? new Date(iso).toLocaleString('pt-PT', { timeZone: 'Europe/Lisbon' }) : '—');

const STATUS_LABEL: Record<string, string> = {
  aberto: 'Por reservar',
  reservado: 'Reservado por si',
  concluido: 'Concluído',
  expirado: 'Expirou (ninguém reservou a tempo)',
  cancelado: 'O cliente desistiu do pedido',
};

export default async function SurveysPage() {
  const { supabase, user } = await getUser();
  const { data: memberships } = await supabase
    .from('org_members')
    .select('role, organizations!inner(id, kind, nome)')
    .eq('user_id', user!.id)
    .eq('organizations.kind', 'fornecedor');
  const eligible = (memberships ?? []).filter((m) => ['proprietario', 'gestor', 'vendedor'].includes(m.role));
  if (eligible.length === 0) notFound();
  const org = eligible[0]!.organizations;
  const manager = eligible.some((m) => ['proprietario', 'gestor'].includes(m.role));

  const [{ data: open }, { data: mine }, { data: coverage }, { data: payouts }, { data: redemptions }, { data: payoutDetails }] = await Promise.all([
    supabase.from('request_surveys').select('id, created_at').eq('status', 'aberto').order('created_at'),
    supabase.from('request_surveys').select('*').eq('vendedor_org_id', org.id).order('reserved_at', { ascending: false }),
    supabase.from('supplier_survey_coverage').select('concelhos').eq('org_id', org.id).maybeSingle(),
    supabase.from('survey_payouts').select('*').eq('supplier_org_id', org.id),
    supabase.from('survey_redemptions').select('*').eq('supplier_org_id', org.id).order('created_at', { ascending: false }),
    supabase.from('supplier_payout_details').select('iban, regime_validado').eq('org_id', org.id).maybeSingle(),
  ]);
  const previews = await Promise.all(
    (open ?? []).map(async (s) => ({ ...s, preview: (await supabase.rpc('survey_preview', { p_survey_id: s.id })).data?.[0] ?? null })),
  );

  const disponivel = (payouts ?? []).filter((p) => p.estado === 'adjudicada' && !p.redemption_id).reduce((n, p) => n + p.amount_cents, 0);
  const openRedemption = (redemptions ?? []).some((r) => r.estado === 'pedido' || r.estado === 'fatura_recebida');
  const canRedeem = !!payoutDetails?.regime_validado && disponivel > 0 && !openRedemption;
  const why = !payoutDetails
    ? 'Indique primeiro os dados de pagamento, em "Comissões de adesão".'
    : !payoutDetails.regime_validado
      ? 'O regime declarado aguarda validação da plataforma.'
      : openRedemption
        ? 'Já tem um resgate em curso.'
        : disponivel <= 0
          ? 'Ainda não há saldo disponível.'
          : null;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-[26px] leading-tight font-semibold">Levantamentos</h1>
        <p className="mt-1 max-w-3xl text-[17px] text-slate-600">
          Um cliente que não queira medir a obra sozinho pode pedir a visita de um avaliador. Reserve, agende e
          registe o levantamento (superfícies e fotografias) — sem custo para o cliente. A sua empresa recebe uma
          percentagem do valor adjudicado da obra, seja qual for o pintor escolhido, e a margem normal se o pintor
          escolher os seus produtos.
        </p>
      </div>

      <section className={card}>
        <h2 className="font-semibold">Pedidos por reservar na sua zona</h2>
        {previews.length === 0 ? (
          <p className="mt-2 text-[17px] text-slate-600">Nenhum pedido à espera, de momento.</p>
        ) : (
          <ul className="mt-4 divide-y divide-slate-100 text-[17px]">
            {previews.map((s) => (
              <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                <span>
                  {s.preview ? `${s.preview.concelho} · ${s.preview.tipo_obra}` : 'Fora da sua zona'} ·{' '}
                  <span className="text-slate-500">pedido em {dt(s.created_at)}</span>
                </span>
                {manager && s.preview && <ReserveButton surveyId={s.id} orgId={org.id} />}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className={card}>
        <h2 className="font-semibold">Os seus levantamentos</h2>
        {(mine ?? []).length === 0 ? (
          <p className="mt-2 text-[17px] text-slate-600">Ainda não reservou nenhum.</p>
        ) : (
          <ul className="mt-4 divide-y divide-slate-100 text-[17px]">
            {(mine ?? []).map((s) => (
              <li key={s.id} className="py-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-medium">{STATUS_LABEL[s.status] ?? s.status}</span>
                  {s.reserve_deadline && s.status === 'reservado' && <span className="text-slate-500">Prazo: {dt(s.reserve_deadline)}</span>}
                </div>
                {(s.status === 'reservado' || s.status === 'concluido') && (
                  <Link href={`/app/levantamentos/${s.id}`} className="mt-1 inline-block font-medium text-tinta-700 hover:underline">
                    Abrir o levantamento
                  </Link>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {manager && (
        <section className={card}>
          <h2 className="font-semibold">Zonas cobertas</h2>
          <p className="mt-1 text-[17px] text-slate-600">Concelhos em que tem avaliadores disponíveis. Vazio: todo o país.</p>
          <div className="mt-4">
            <CoverageForm orgId={org.id} initial={coverage?.concelhos ?? []} />
          </div>
        </section>
      )}

      <section className={card}>
        <h2 className="font-semibold">Comissões dos levantamentos</h2>
        <p className="mt-1 text-[17px] text-slate-600">
          Os dados de pagamento (IBAN, regime de IVA e de retenção) são os mesmos de &ldquo;Comissões de
          adesão&rdquo; — não precisa de os indicar duas vezes.
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-[17px] text-slate-600">Saldo disponível</p>
            <p className="text-[26px] leading-tight font-semibold">{formatEuros(disponivel)}</p>
          </div>
        </div>
        {manager && (
          <div className="mt-4">
            <RedeemButton orgId={org.id} disabled={!canRedeem} />
            {why && <p className="mt-2 text-[17px] text-slate-600">{why}</p>}
          </div>
        )}
        {(redemptions ?? []).length > 0 && (
          <ul className="mt-4 divide-y divide-slate-100 text-[17px]">
            {(redemptions ?? []).map((r) => (
              <li key={r.id} className="py-3">
                <p className="font-medium">
                  Resgate de {dt(r.created_at)}:{' '}
                  {r.estado === 'pedido'
                    ? 'a aguardar a sua fatura'
                    : r.estado === 'fatura_recebida'
                      ? 'fatura recebida, a aguardar pagamento'
                      : r.estado === 'paga'
                        ? `pago em ${dt(r.paga_em)}${r.referencia_pagamento ? ` (${r.referencia_pagamento})` : ''}`
                        : 'anulado'}
                </p>
                <p className="text-slate-600">
                  Comissão {formatEuros(r.comissao_cents)}
                  {r.iva_cents > 0 ? ` + IVA ${formatEuros(r.iva_cents)}` : ''}
                  {r.retencao_cents > 0 ? ` − retenção ${formatEuros(r.retencao_cents)}` : ''} = <strong>{formatEuros(r.liquido_cents)}</strong> a receber.
                </p>
                {manager && r.estado === 'pedido' && <SurveyInvoiceForm orgId={org.id} redemptionId={r.id} />}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
