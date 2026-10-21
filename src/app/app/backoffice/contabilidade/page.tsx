import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ACCOUNTS, accountName } from '@/domain/accounting/accounts';
import { formatEuros } from '@/domain/money';
import { isPlatformAdmin } from '@/lib/access';
import { getUser } from '@/lib/supabase/server';
import { PeriodForms, RedemptionForm, RegimeForm, SyncButton, VoidPayoutForm } from './Forms';

const card = 'rounded-2xl border border-slate-200 bg-white p-6';
const TABS = [
  ['painel', 'Painel'],
  ['movimentos', 'Movimentos'],
  ['pagar', 'A pagar'],
  ['periodos', 'Períodos'],
] as const;
type Tab = (typeof TABS)[number][0];

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
const balance = (r: { natureza: string; debito_cents: number; credito_cents: number }) => (r.natureza === 'devedora' ? r.debito_cents - r.credito_cents : r.credito_cents - r.debito_cents);
const nextMonth = (m: string) => {
  const [y, mo] = m.split('-').map(Number) as [number, number];
  return mo === 12 ? `${y + 1}-01` : `${y}-${String(mo + 1).padStart(2, '0')}`;
};

export default async function AccountingPage({ searchParams }: { searchParams: Promise<{ v?: string; mes?: string; origem?: string }> }) {
  const q = await searchParams;
  const { supabase, user } = await getUser();
  if (!(await isPlatformAdmin(supabase, user!.id))) notFound();
  const tab: Tab = TABS.some(([k]) => k === q.v) ? (q.v as Tab) : 'painel';

  return (
    <div className="space-y-6">
      <div>
        <Link href="/app/backoffice" className="text-sm text-slate-600 hover:underline">
          ← Backoffice
        </Link>
        <h1 className="mt-3 text-2xl font-semibold">Contabilidade</h1>
        <p className="mt-1 max-w-3xl text-sm text-slate-600">
          Livro de movimentos em partidas dobradas, em euros e cêntimos. Nada se altera nem se apaga: corrige-se com estorno. Os lançamentos fazem-se sozinhos todos os dias; «Sincronizar agora» faz-os já.
        </p>
      </div>
      <nav className="flex flex-wrap gap-2" aria-label="Contabilidade">
        {TABS.map(([k, label]) => (
          <Link key={k} href={`/app/backoffice/contabilidade?v=${k}`} aria-current={k === tab ? 'page' : undefined} className={`rounded-xl px-4 py-2 text-sm font-semibold ${k === tab ? 'bg-tinta-600 text-white' : 'bg-slate-100 hover:bg-slate-200'}`}>
            {label}
          </Link>
        ))}
      </nav>
      {tab === 'painel' && <Dashboard />}
      {tab === 'movimentos' && <Movements mes={q.mes} origem={q.origem} />}
      {tab === 'pagar' && <ToPay />}
      {tab === 'periodos' && <Periods />}
    </div>
  );
}

async function Dashboard() {
  const { supabase } = await getUser();
  const [{ data: rows }, { data: monthly }, { data: last }] = await Promise.all([
    supabase.from('acc_balancete').select('*'),
    supabase.from('acc_balancete_mensal').select('*').like('conta', '72%'),
    supabase.from('acc_entries').select('id, data, descricao, origem').order('data', { ascending: false }).order('created_at', { ascending: false }).limit(8),
  ]);
  const by = new Map((rows ?? []).map((r) => [r.conta, r]));
  const bal = (c: string) => (by.get(c) ? balance(by.get(c)!) : 0);
  const debit = (rows ?? []).reduce((n, r) => n + r.debito_cents, 0);
  const credit = (rows ?? []).reduce((n, r) => n + r.credito_cents, 0);
  const incomeTotal = ['72.1', '72.2', '72.3'].reduce((n, c) => n + bal(c), 0);
  const tiles: [string, number, string][] = [
    ['Saldo na Stripe', bal(ACCOUNTS.stripe.codigo), 'Recebido e ainda não transferido para o banco.'],
    ['Cauções de clientes', bal(ACCOUNTS.caucoesTerceiros.codigo), 'Dinheiro de terceiros: não é receita.'],
    ['IVA a entregar', bal(ACCOUNTS.ivaLiquidado.codigo) - bal(ACCOUNTS.ivaDedutivel.codigo), 'IVA liquidado menos dedutível (acumulado).'],
    ['Devido a fornecedores', bal(ACCOUNTS.fornecedoresTintas.codigo), 'Saldos de comissões de adesão ainda por pagar.'],
    ['Retenções por entregar', bal(ACCOUNTS.retencoes.codigo), 'Retidas nos resgates.'],
    ['Rendimentos acumulados', incomeTotal, 'Comissões, mensalidades e cauções retidas (sem IVA).'],
  ];
  const months = [...new Set((monthly ?? []).map((m) => m.mes))].sort().reverse().slice(0, 6);
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <SyncButton />
        <p className={`text-sm font-medium ${debit === credit ? 'text-tinta-700' : 'text-red-700'}`}>
          {debit === credit ? `Livro equilibrado: débitos = créditos (${formatEuros(debit)}).` : `ATENÇÃO: o livro não fecha. Débitos ${formatEuros(debit)}, créditos ${formatEuros(credit)}.`}
        </p>
      </div>
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {tiles.map(([k, v, hint]) => (
          <li key={k} className={card}>
            <p className="text-sm text-slate-600">{k}</p>
            <p className="mt-1 text-2xl font-semibold">{formatEuros(v)}</p>
            <p className="mt-1 text-xs text-slate-500">{hint}</p>
          </li>
        ))}
      </ul>
      <section className={card}>
        <h2 className="font-semibold">Rendimentos por mês</h2>
        {months.length === 0 ? (
          <p className="mt-2 text-sm text-slate-600">Ainda sem lançamentos.</p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[32rem] text-left text-sm">
              <thead className="text-slate-500">
                <tr>
                  <th className="py-2 font-normal">Mês</th>
                  <th className="py-2 text-right font-normal">Comissões</th>
                  <th className="py-2 text-right font-normal">Mensalidades</th>
                  <th className="py-2 text-right font-normal">Cauções retidas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {months.map((m) => {
                  const v = (c: string) => (monthly ?? []).filter((x) => x.mes === m && x.conta === c).reduce((n, x) => n + x.credito_cents - x.debito_cents, 0);
                  return (
                    <tr key={m}>
                      <td className="py-2">{m}</td>
                      <td className="py-2 text-right">{formatEuros(v('72.1'))}</td>
                      <td className="py-2 text-right">{formatEuros(v('72.2'))}</td>
                      <td className="py-2 text-right">{formatEuros(v('72.3'))}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
      <section className={card}>
        <h2 className="font-semibold">Últimos lançamentos</h2>
        <ul className="mt-2 divide-y divide-slate-100 text-sm">
          {(last ?? []).map((e) => (
            <li key={e.id} className="py-2">
              {ptDate(e.data)} · {ORIGINS[e.origem] ?? e.origem}: {e.descricao}
            </li>
          ))}
          {(last ?? []).length === 0 && <li className="py-2 text-slate-600">Ainda sem lançamentos: use «Sincronizar agora».</li>}
        </ul>
      </section>
    </>
  );
}

async function Movements({ mes, origem }: { mes?: string; origem?: string }) {
  const { supabase } = await getUser();
  let query = supabase.from('acc_entries').select('*').order('data', { ascending: false }).order('created_at', { ascending: false }).limit(200);
  if (mes && /^\d{4}-\d{2}$/.test(mes)) query = query.gte('data', `${mes}-01`).lt('data', `${nextMonth(mes)}-01`);
  if (origem && origem in ORIGINS) query = query.eq('origem', origem);
  const { data: entries } = await query;
  const ids = (entries ?? []).map((e) => e.id);
  const { data: lines } = ids.length ? await supabase.from('acc_lines').select('*').in('entry_id', ids) : { data: [] };
  return (
    <>
      <form className="flex flex-wrap items-end gap-3 text-sm" autoComplete="off">
        <input type="hidden" name="v" value="movimentos" />
        <label className="font-medium">
          Mês
          <input type="month" name="mes" defaultValue={mes ?? ''} className="mt-1 block rounded-lg border border-slate-300 px-3 py-2" />
        </label>
        <label className="font-medium">
          Origem
          <select name="origem" defaultValue={origem ?? ''} className="mt-1 block rounded-lg border border-slate-300 bg-white px-3 py-2">
            <option value="">Todas</option>
            {Object.entries(ORIGINS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" className="btn-secondary">
          Filtrar
        </button>
      </form>
      {(entries ?? []).length === 0 ? (
        <p className="text-sm text-slate-600">Sem lançamentos com este filtro.</p>
      ) : (
        <ul className="space-y-3">
          {(entries ?? []).map((e) => (
            <li key={e.id} className={`${card} p-4 text-sm`}>
              <p className="font-medium">
                {ptDate(e.data)} · {ORIGINS[e.origem] ?? e.origem}
              </p>
              <p className="text-slate-600">{e.descricao}</p>
              <table className="mt-2 w-full text-left">
                <tbody className="divide-y divide-slate-100">
                  {(lines ?? [])
                    .filter((l) => l.entry_id === e.id)
                    .sort((a, b) => b.debito_cents - a.debito_cents)
                    .map((l) => (
                      <tr key={l.id}>
                        <td className="py-1 pr-3 font-mono text-xs">{l.conta}</td>
                        <td className="py-1">{accountName(l.conta)}</td>
                        <td className="w-28 py-1 text-right">{l.debito_cents ? formatEuros(l.debito_cents) : ''}</td>
                        <td className="w-28 py-1 text-right">{l.credito_cents ? formatEuros(l.credito_cents) : ''}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
              <p className="mt-1 text-xs text-slate-500">
                Origem: {e.origem} · {e.origem_id}
              </p>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

async function ToPay() {
  const { supabase } = await getUser();
  const [{ data: open }, { data: recent }, { data: unvalidated }, { data: pending }] = await Promise.all([
    supabase.from('referral_redemptions').select('*').in('estado', ['pedido', 'fatura_recebida']).order('created_at'),
    supabase.from('referral_redemptions').select('*').in('estado', ['paga', 'anulado']).order('created_at', { ascending: false }).limit(10),
    supabase.from('supplier_payout_details').select('*').eq('regime_validado', false),
    supabase.from('referral_payouts').select('id, supplier_org_id, amount_cents, fee_recebido_em, created_at').eq('estado', 'adjudicada').is('redemption_id', null).order('created_at').limit(50),
  ]);
  const orgIds = [...new Set([...(open ?? []), ...(recent ?? []), ...(unvalidated ?? []).map((u) => ({ supplier_org_id: u.org_id })), ...(pending ?? [])].map((x) => x.supplier_org_id))];
  const { data: orgs } = orgIds.length ? await supabase.from('organizations').select('id, nome, nif').in('id', orgIds) : { data: [] };
  const name = (id: string) => (orgs ?? []).find((o) => o.id === id)?.nome ?? id;
  const links = new Map<string, string>();
  for (const r of open ?? []) {
    if (!r.invoice_path) continue;
    const { data: signed } = await supabase.storage.from('faturas-adesao').createSignedUrl(r.invoice_path, 600);
    if (signed?.signedUrl) links.set(r.id, signed.signedUrl);
  }
  return (
    <>
      <section className={card}>
        <h2 className="font-semibold">Resgates de fornecedores</h2>
        <p className="mt-1 text-sm text-slate-600">
          Pague por transferência o valor líquido, depois de confirmar a fatura (emitida à empresa, no valor de comissão mais IVA). Marcar como pago avisa o fornecedor e lança o pagamento no livro.
        </p>
        {(open ?? []).length === 0 ? (
          <p className="mt-3 text-sm text-slate-600">Nada por pagar.</p>
        ) : (
          <ul className="mt-3 divide-y divide-slate-100 text-sm">
            {(open ?? []).map((r) => (
              <li key={r.id} className="py-3">
                <b>{name(r.supplier_org_id)}</b> · pedido em {ptDate(r.created_at)} · {r.estado === 'pedido' ? 'a aguardar a fatura' : 'fatura recebida'}
                <p>
                  Comissão {formatEuros(r.comissao_cents)}
                  {r.iva_cents > 0 ? ` + IVA ${formatEuros(r.iva_cents)}` : r.cobra_iva ? '' : ` (isento${r.isencao_iva ? `: ${r.isencao_iva}` : ''})`}
                  {r.retencao_cents > 0 ? ` − retenção ${formatEuros(r.retencao_cents)} (${r.retencao_bps / 100}%)` : ''} → <strong>transferir {formatEuros(r.liquido_cents)}</strong>
                </p>
                <p className="text-xs text-slate-600">
                  {r.titular} · {r.iban}
                  {r.invoice_numero ? ` · fatura ${r.invoice_numero}` : ''}
                  {links.get(r.id) && (
                    <>
                      {' '}
                      <a href={links.get(r.id)} target="_blank" rel="noopener noreferrer" className="text-tinta-700 underline">
                        Abrir PDF
                      </a>
                    </>
                  )}
                </p>
                <RedemptionForm id={r.id} canPay={r.estado === 'fatura_recebida'} />
              </li>
            ))}
          </ul>
        )}
        {(recent ?? []).length > 0 && (
          <details className="mt-4 text-sm">
            <summary className="cursor-pointer font-medium">Últimos resgates encerrados</summary>
            <ul className="mt-2 space-y-1 text-slate-600">
              {(recent ?? []).map((r) => (
                <li key={r.id}>
                  {name(r.supplier_org_id)} · {formatEuros(r.liquido_cents)} · {r.estado === 'paga' ? `pago em ${ptDate(r.paga_em)}${r.referencia_pagamento ? ` (${r.referencia_pagamento})` : ''}` : `anulado${r.motivo ? `: ${r.motivo}` : ''}`}
                </li>
              ))}
            </ul>
          </details>
        )}
      </section>

      <section className={card}>
        <h2 className="font-semibold">Regimes de fornecedores por validar</h2>
        <p className="mt-1 text-sm text-slate-600">Confirme com o contabilista o regime de IVA e a retenção antes de o fornecedor poder resgatar.</p>
        {(unvalidated ?? []).length === 0 ? (
          <p className="mt-3 text-sm text-slate-600">Nenhum por validar.</p>
        ) : (
          <ul className="mt-3 divide-y divide-slate-100 text-sm">
            {(unvalidated ?? []).map((u) => (
              <li key={u.org_id} className="py-3">
                <b>{name(u.org_id)}</b> (NIF {(orgs ?? []).find((o) => o.id === u.org_id)?.nif ?? '—'}) · {u.cobra_iva ? 'liquida IVA' : `isento: ${u.isencao_iva ?? '—'}`} · retenção declarada:{' '}
                {u.declaracao_retencao === 'sujeito' ? 'sujeito' : u.declaracao_retencao === 'dispensa' ? 'dispensado' : u.declaracao_retencao === 'nao_sujeito' ? 'não sujeito' : 'não declarada'}
                <RegimeForm orgId={u.org_id} current={u.retencao_bps} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className={card}>
        <h2 className="font-semibold">Comissões de adesão ainda fora de resgate</h2>
        <p className="mt-1 text-sm text-slate-600">À espera da comissão do pintor, ou já no saldo do fornecedor. Só se põe sem efeito se a obra caiu e a comissão do pintor foi devolvida.</p>
        {(pending ?? []).length === 0 ? (
          <p className="mt-3 text-sm text-slate-600">Nenhuma.</p>
        ) : (
          <ul className="mt-3 divide-y divide-slate-100 text-sm">
            {(pending ?? []).map((p) => (
              <li key={p.id} className="py-3">
                <b>{name(p.supplier_org_id)}</b> · {formatEuros(p.amount_cents)} · {p.fee_recebido_em ? `no saldo desde ${ptDate(p.fee_recebido_em)}` : 'a aguardar a comissão do pintor'}
                <VoidPayoutForm id={p.id} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}

async function Periods() {
  const { supabase } = await getUser();
  const [{ data: periods }, { data: log }, { data: first }] = await Promise.all([
    supabase.from('acc_periods').select('*').eq('fechado', true).order('mes', { ascending: false }),
    supabase.from('acc_period_log').select('*').order('em', { ascending: false }).limit(10),
    supabase.from('acc_entries').select('data').order('data').limit(1),
  ]);
  const lastClosed = periods?.[0]?.mes?.slice(0, 7) ?? null;
  const now = new Date().toISOString().slice(0, 7);
  const next = lastClosed ? nextMonth(lastClosed) : (first?.[0]?.data?.slice(0, 7) ?? now);
  return (
    <section className={card}>
      <h2 className="font-semibold">Períodos</h2>
      <p className="mt-1 max-w-3xl text-sm text-slate-600">
        Fechar um mês impede novos lançamentos nele (um acontecimento tardio entra no primeiro mês aberto). Fecham-se por ordem e só meses terminados; só se reabre o último fechado, e fica registado. Antes de fechar o trimestre, confira o IVA com o contabilista.
      </p>
      <p className="mt-3 text-sm">
        Meses fechados: {(periods ?? []).length === 0 ? 'nenhum' : (periods ?? []).map((p) => p.mes.slice(0, 7)).join(', ')}. Próximo a fechar: <b>{next}</b>
        {next >= now ? ' (ainda não terminou)' : ''}.
      </p>
      <PeriodForms next={next} canClose={next < now} canReopen={(periods ?? []).length > 0} />
      {(log ?? []).length > 0 && (
        <details className="mt-4 text-sm">
          <summary className="cursor-pointer font-medium">Registo de fechos e reaberturas</summary>
          <ul className="mt-2 space-y-1 text-slate-600">
            {(log ?? []).map((l) => (
              <li key={l.id}>
                {l.acao === 'fechar' ? 'Fechado' : 'Reaberto'} {l.mes.slice(0, 7)} em {ptDate(l.em)}
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}
