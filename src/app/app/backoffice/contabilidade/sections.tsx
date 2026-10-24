import { ACCOUNTS, accountName } from '@/domain/accounting/accounts';
import { formatEuros } from '@/domain/money';
import { getUser } from '@/lib/supabase/server';
import { reconcile } from '@/domain/accounting/reconcile';
import { BankImportForm, BankLineForm, PeriodForms, RedemptionForm, RematchButton, StripeReviewForm, SyncButton, SyncStripeButton, VoidPayoutForm } from './Forms';

const card = 'rounded-2xl border border-slate-200 bg-white p-6';

const ORIGINS: Record<string, string> = {
  stripe_comissao: 'Comissão do pintor',
  stripe_caucao: 'Caução recebida',
  stripe_reembolso: 'Reembolso',
  caucao_retida: 'Caução retida',
  stripe_subscricao: 'Mensalidade de fornecedor',
  comissao_adesao: 'Comissão de adesão',
  comissao_adesao_estorno: 'Estorno de comissão de adesão',
  resgate_fatura: 'Fatura de resgate (IVA)',
  resgate_fatura_estorno: 'Estorno de fatura de resgate',
  resgate_pago: 'Resgate pago',
};

const ptDate = (iso: string | null) => (iso ? iso.slice(0, 10).split('-').reverse().join('/') : '');
/**
 * Saldo de uma linha do balancete. Os campos chegam de uma **vista**: o Postgres não garante colunas
 * não nulas numa vista, por isso os tipos gerados marcam-nas como podendo ser nulas. Na prática nunca
 * são — a vista soma movimentos — e um valor em falta conta como zero.
 */
const balance = (r: { natureza: string | null; debito_cents: number | null; credito_cents: number | null }) => {
  const debito = r.debito_cents ?? 0;
  const credito = r.credito_cents ?? 0;
  return r.natureza === 'devedora' ? debito - credito : credito - debito;
};
const nextMonth = (m: string) => {
  const [y, mo] = m.split('-').map(Number) as [number, number];
  return mo === 12 ? `${y + 1}-01` : `${y}-${String(mo + 1).padStart(2, '0')}`;
};

export async function Reconciliation() {
  const { supabase } = await getUser();
  const [{ data: bts }, { data: payments }, { data: subs }, { data: payouts }, { data: snap }, { data: ledger }, { data: reviews }] = await Promise.all([
    supabase.from('stripe_bt').select('*').eq('currency', 'eur').order('created_at', { ascending: false }),
    supabase.from('stripe_payments').select('payment_intent, kind, amount_cents, refunded_cents'),
    supabase.from('subscription_payments').select('stripe_invoice_id, amount_cents'),
    supabase.from('stripe_payouts').select('*').eq('currency', 'eur').order('created_at', { ascending: false }),
    supabase.from('stripe_balance_snapshots').select('*').order('taken_at', { ascending: false }).limit(1),
    supabase.from('acc_balancete').select('*').eq('conta', ACCOUNTS.stripe.codigo),
    supabase.from('stripe_bt_review').select('bt_id, nota, em'),
  ]);
  const reviewed = new Set((reviews ?? []).map((r) => r.bt_id));
  const ledgerCents = ledger?.[0] ? balance(ledger[0]) : 0;
  const snapshot = snap?.[0] ?? null;
  const r = reconcile({
    lines: (bts ?? []).map((b) => ({ id: b.id, type: b.type, category: b.reporting_category, amountCents: b.amount_cents, feeCents: b.fee_cents, currency: b.currency, createdAt: b.created_at, paymentIntent: b.payment_intent, invoiceId: b.invoice_id, description: b.description })),
    payments: (payments ?? []).map((p) => ({ paymentIntent: p.payment_intent, kind: p.kind === 'comissao' ? 'comissao' : 'caucao', amountCents: p.amount_cents, refundedCents: p.refunded_cents })),
    subscriptions: (subs ?? []).map((s) => ({ invoiceId: s.stripe_invoice_id, amountCents: s.amount_cents })),
    payouts: (payouts ?? []).map((o) => ({ id: o.id, amountCents: o.amount_cents, status: o.status })),
    ledgerCents,
    stripeCents: snapshot ? snapshot.available_cents + snapshot.pending_cents : null,
    reviewed,
  });
  const dash = process.env.STRIPE_SECRET_KEY?.startsWith('sk_live') ? 'https://dashboard.stripe.com' : 'https://dashboard.stripe.com/test';
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <SyncStripeButton />
        <p className="text-sm text-slate-600">{snapshot ? `Última leitura: ${new Date(snapshot.taken_at).toLocaleString('pt-PT', { timeZone: 'Europe/Lisbon' })}.` : 'Ainda não se leu a Stripe.'}</p>
      </div>
      <section className={`${card} ${r.reconciled ? 'border-tinta-600' : ''}`}>
        <h2 className="font-semibold">{r.reconciled ? 'Reconciliado' : snapshot ? 'Há diferenças por tratar' : 'Por reconciliar'}</h2>
        <dl className="mt-3 grid max-w-xl grid-cols-[1fr_auto] gap-x-6 gap-y-1 text-sm">
          <dt className="text-slate-600">Saldo do livro (conta 13.1)</dt>
          <dd className="text-right">{formatEuros(r.ledgerCents)}</dd>
          <dt className="text-slate-600">Saldo da Stripe (disponível + pendente)</dt>
          <dd className="text-right">{r.stripeCents === null ? '—' : formatEuros(r.stripeCents)}</dd>
          <dt className="font-medium">Diferença (livro − Stripe)</dt>
          <dd className="text-right font-medium">{r.difference === null ? '—' : formatEuros(r.difference)}</dd>
          {r.explained.map((e) => (
            <div key={e.label} className="contents">
              <dt className="pl-4 text-slate-600">explicada por: {e.label}</dt>
              <dd className="text-right text-slate-600">{formatEuros(e.cents)}</dd>
            </div>
          ))}
          <dt className="font-medium">Por explicar</dt>
          <dd className={`text-right font-medium ${r.unexplainedCents ? 'text-red-700' : ''}`}>{r.unexplainedCents === null ? '—' : formatEuros(r.unexplainedCents)}</dd>
        </dl>
        <p className="mt-3 text-xs text-slate-500">{r.matchedCharges} cobranças da Stripe batem com o que a plataforma registou. A Stripe é lida só para consulta: nada se move daqui.</p>
      </section>
      {r.discrepancies.length > 0 && (
        <section className={card}>
          <h2 className="font-semibold">Diferenças a tratar ({r.discrepancies.length})</h2>
          <ul className="mt-3 divide-y divide-slate-100 text-sm">
            {r.discrepancies.map((d, i) => (
              <li key={`${d.ref}-${i}`} className="py-3">
                <p className="font-medium">
                  {KIND_LABELS[d.kind]} · <span className="font-mono text-xs">{d.ref}</span>
                  {d.ref.startsWith('pi_') && (
                    <>
                      {' '}
                      <a href={`${dash}/payments/${d.ref}`} target="_blank" rel="noopener noreferrer" className="font-normal text-tinta-700 underline">
                        Abrir na Stripe
                      </a>
                    </>
                  )}
                </p>
                <p className="text-slate-600">
                  {d.detail} {d.stripeCents !== null && `Stripe: ${formatEuros(d.stripeCents)}. `}
                  {d.platformCents !== null && `Plataforma: ${formatEuros(d.platformCents)}.`}
                </p>
                <p className="text-xs text-slate-500">{KIND_HELP[d.kind]}</p>
                {d.lineId && (d.kind === 'movimento_a_rever' || d.kind === 'cobranca_nao_registada') && <StripeReviewForm btId={d.lineId} reviewed={false} />}
              </li>
            ))}
          </ul>
        </section>
      )}
      {(reviews ?? []).length > 0 && (
        <section className={card}>
          <h2 className="font-semibold">Movimentos revistos e deixados fora do livro</h2>
          <ul className="mt-3 divide-y divide-slate-100 text-sm">
            {(reviews ?? []).map((v) => {
              const b = (bts ?? []).find((x) => x.id === v.bt_id);
              return (
                <li key={v.bt_id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                  <span>
                    {b ? `${ptDate(b.created_at)} · ${formatEuros(b.amount_cents)} · ` : ''}
                    <span className="font-mono text-xs">{v.bt_id}</span> · {v.nota}
                  </span>
                  <StripeReviewForm btId={v.bt_id} reviewed />
                </li>
              );
            })}
          </ul>
        </section>
      )}
      <section className={card}>
        <h2 className="font-semibold">Transferências da Stripe para o banco</h2>
        <p className="mt-1 text-sm text-slate-600">Lançam-se no livro quando chegam ao banco. A conferência com o extrato do EuroBic faz-se quando a importação do extrato estiver ligada.</p>
        {(payouts ?? []).length === 0 ? (
          <p className="mt-3 text-sm text-slate-600">Ainda sem transferências.</p>
        ) : (
          <ul className="mt-3 divide-y divide-slate-100 text-sm">
            {(payouts ?? []).slice(0, 15).map((o) => (
              <li key={o.id} className="flex flex-wrap justify-between gap-2 py-2">
                <span>
                  {ptDate(o.arrival_at)} · <span className="font-mono text-xs">{o.id}</span>
                </span>
                <span>
                  {formatEuros(o.amount_cents)} · {o.status === 'paid' ? 'chegou ao banco' : o.status === 'in_transit' ? 'a caminho' : o.status === 'pending' ? 'pendente' : o.status}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}

const CLASS_LABELS: Record<string, string> = { por_classificar: 'Por classificar', stripe_payout: 'Transferência da Stripe', resgate: 'Pagamento de resgate', outro: 'Outro movimento da empresa', ignorada: 'Ignorado' };

export async function Bank() {
  const { supabase } = await getUser();
  const [{ data: pending }, { data: done }, { data: imports }, { data: payouts }, { data: reds }, { data: linked }, { data: last }] = await Promise.all([
    supabase.from('bank_lines').select('*').eq('classificacao', 'por_classificar').order('data', { ascending: false }).limit(200),
    supabase.from('bank_lines').select('*').neq('classificacao', 'por_classificar').order('data', { ascending: false }).limit(30),
    supabase.from('bank_imports').select('*').order('created_at', { ascending: false }).limit(5),
    supabase.from('stripe_payouts').select('id, amount_cents, arrival_at, status').eq('currency', 'eur').eq('status', 'paid').order('arrival_at', { ascending: false }),
    supabase.from('referral_redemptions').select('id, liquido_cents, paga_em, titular').eq('estado', 'paga').order('paga_em', { ascending: false }),
    supabase.from('bank_lines').select('stripe_payout_id, redemption_id').or('stripe_payout_id.not.is.null,redemption_id.not.is.null'),
    supabase.from('bank_lines').select('data, saldo_cents').not('saldo_cents', 'is', null).order('data', { ascending: false }).limit(1),
  ]);
  const usedPayouts = new Set((linked ?? []).flatMap((l) => (l.stripe_payout_id ? [l.stripe_payout_id] : [])));
  const usedReds = new Set((linked ?? []).flatMap((l) => (l.redemption_id ? [l.redemption_id] : [])));
  const missingPayouts = (payouts ?? []).filter((p) => !usedPayouts.has(p.id));
  const missingReds = (reds ?? []).filter((r) => !usedReds.has(r.id));
  const optionsFor = (valor: number) => [
    ...missingPayouts.filter((p) => p.amount_cents === valor).map((p) => ({ value: `payout:${p.id}`, label: `Stripe ${p.id} (${ptDate(p.arrival_at)})` })),
    ...missingReds.filter((r) => -r.liquido_cents === valor).map((r) => ({ value: `resgate:${r.id}`, label: `Resgate de ${r.titular} (${ptDate(r.paga_em)})` })),
  ];
  const nameOf = (l: { classificacao: string; stripe_payout_id: string | null; redemption_id: string | null; notas: string | null }) =>
    `${CLASS_LABELS[l.classificacao]}${l.stripe_payout_id ? ` ${l.stripe_payout_id}` : ''}${l.notas ? `: ${l.notas}` : ''}`;
  return (
    <>
      <section className={card}>
        <h2 className="font-semibold">Importar extrato</h2>
        <p className="mt-1 max-w-3xl text-sm text-slate-600">
          Exporte o extrato no Web Banking do EuroBic (CSV, ou CAMT.053 se o houver) e carregue-o aqui. O extrato é da conta da empresa inteira: casamos só o que é da plataforma (transferências da Stripe e pagamentos de resgates);
          o resto classifica-se como «outro movimento» para o contabilista.
        </p>
        <div className="mt-4">
          <BankImportForm />
        </div>
        {(imports ?? []).length > 0 && (
          <ul className="mt-4 space-y-1 text-sm text-slate-600">
            {(imports ?? []).map((i) => (
              <li key={i.id}>
                {ptDate(i.created_at)} · {i.ficheiro} ({i.formato === 'camt053' ? 'CAMT.053' : 'CSV'}) · {i.de ? `${ptDate(i.de)} a ${ptDate(i.ate)}` : ''} · {i.novas} novos, {i.duplicadas} repetidos
              </li>
            ))}
          </ul>
        )}
        {last?.[0]?.saldo_cents != null && <p className="mt-2 text-sm text-slate-600">Último saldo do extrato: {formatEuros(last[0].saldo_cents)} ({ptDate(last[0].data)}).</p>}
      </section>

      <section className={card}>
        <h2 className="font-semibold">Conferência com a plataforma</h2>
        <p className="mt-1 text-sm text-slate-600">O que a plataforma diz que aconteceu e ainda não se viu no extrato.</p>
        <div className="mt-3 grid gap-6 md:grid-cols-2">
          <div>
            <h3 className="text-sm font-semibold">Transferências da Stripe chegadas ({missingPayouts.length} por ver no banco)</h3>
            <ul className="mt-2 space-y-1 text-sm text-slate-600">
              {missingPayouts.slice(0, 12).map((p) => (
                <li key={p.id}>
                  {formatEuros(p.amount_cents)} · chegada {ptDate(p.arrival_at)} · <span className="font-mono text-xs">{p.id}</span>
                </li>
              ))}
              {missingPayouts.length === 0 && <li>Todas conferidas.</li>}
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-semibold">Resgates pagos ({missingReds.length} por ver no banco)</h3>
            <ul className="mt-2 space-y-1 text-sm text-slate-600">
              {missingReds.slice(0, 12).map((r) => (
                <li key={r.id}>
                  {formatEuros(r.liquido_cents)} · {r.titular} · pago {ptDate(r.paga_em)}
                </li>
              ))}
              {missingReds.length === 0 && <li>Todos conferidos.</li>}
            </ul>
          </div>
        </div>
        <div className="mt-4">
          <RematchButton />
        </div>
      </section>

      <section className={card}>
        <h2 className="font-semibold">Movimentos por classificar ({(pending ?? []).length})</h2>
        {(pending ?? []).length === 0 ? (
          <p className="mt-2 text-sm text-slate-600">Nada por classificar.</p>
        ) : (
          <ul className="mt-3 divide-y divide-slate-100 text-sm">
            {(pending ?? []).map((l) => (
              <li key={l.id} className="py-3">
                <p className="flex flex-wrap justify-between gap-2">
                  <span>
                    {ptDate(l.data)} · {l.descricao}
                  </span>
                  <span className={`font-semibold ${l.valor_cents < 0 ? 'text-red-700' : 'text-tinta-700'}`}>{formatEuros(l.valor_cents)}</span>
                </p>
                <BankLineForm lineId={l.id} options={optionsFor(l.valor_cents)} classified={false} />
              </li>
            ))}
          </ul>
        )}
      </section>

      {(done ?? []).length > 0 && (
        <section className={card}>
          <h2 className="font-semibold">Últimos movimentos classificados</h2>
          <ul className="mt-3 divide-y divide-slate-100 text-sm">
            {(done ?? []).map((l) => (
              <li key={l.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <span>
                  {ptDate(l.data)} · {l.descricao} · <span className="text-slate-600">{nameOf(l)}{l.automatica ? ' (automático)' : ''}</span>
                </span>
                <span className="flex items-center gap-3">
                  <span>{formatEuros(l.valor_cents)}</span>
                  <BankLineForm lineId={l.id} options={[]} classified />
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
