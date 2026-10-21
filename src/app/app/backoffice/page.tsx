import Link from 'next/link';
import { notFound } from 'next/navigation';
import { availableActions } from '@/domain/contracting';
import { isPlatformAdmin } from '@/lib/access';
import { loadReplay } from '@/lib/engagements';
import { serverChecks } from '@/lib/diagnostics';
import { getUser } from '@/lib/supabase/server';
import { InvitePainter } from '@/components/ExtrasForms';
import { formatArea } from '@/domain/request';
import { ResolveReport } from './ReportForms';
import { unblockAccount } from './actions';
import { AppealForm } from './AppealForm';
import { adminClient } from '@/lib/supabase/admin';
import { CreatePromoCode, SupplierPlanForm, TogglePromo } from './PromoForms';
import { PLAN_INFO } from '@/domain/subscription';
import { formatEuros } from '@/domain/money';

const card = 'rounded-2xl border border-slate-200 bg-white p-6';

// Backoffice da equipa da plataforma: o que espera por uma pessoa.
export default async function BackofficePage() {
  const { supabase, user } = await getUser();
  if (!(await isPlatformAdmin(supabase, user!.id))) notFound();

  const [docs, photos, { data: reports }, { data: engagements }] = await Promise.all([
    supabase.from('org_documents').select('id', { count: 'exact', head: true }).in('status', ['submetido', 'em_validacao']),
    supabase.from('request_photos').select('id', { count: 'exact', head: true }).eq('revisao', 'pendente'),
    supabase.from('listing_reports').select('*').eq('status', 'pendente').order('created_at'),
    supabase.from('engagements').select('*'),
  ]);
  const { data: unverified } = await supabase
    .from('engagement_events')
    .select('id, engagement_id, kind, payload, at')
    .eq('payload->>metodo', 'cmd_pdf')
    .eq('payload->>cadeiaConfiavel', 'false');
  const [{ data: promos }, { data: suppliers }, { data: subs }] = await Promise.all([
    supabase.from('promo_codes').select('*').order('created_at', { ascending: false }),
    supabase.from('organizations').select('id, nome').eq('kind', 'fornecedor').order('nome'),
    supabase.from('supplier_subscriptions').select('*'),
  ]);
  const pendingEngagements = (
    await Promise.all((engagements ?? []).map(async (r) => availableActions((await loadReplay(supabase, r)).replay.engagement, 'plataforma').length > 0))
  ).filter(Boolean).length;
  const listings = reports?.length
    ? (await supabase.from('request_listings').select('request_id, ref, concelho, descricao').in('request_id', reports.map((r) => r.request_id))).data ?? []
    : [];

  // ADM-07: pedidos abertos com poucas propostas, para convidar pintores.
  const [{ data: open }, { data: painterList }, { data: submitted }] = await Promise.all([
    supabase.from('request_listings').select('request_id, ref, concelho, area_total_cm2, prazo_propostas').eq('aberto', true).order('prazo_propostas'),
    supabase.from('organizations').select('id, nome').eq('kind', 'pintor').order('nome'),
    supabase.from('proposals').select('request_id').eq('status', 'submetida'),
  ]);
  const proposalsFor = (rid: string) => (submitted ?? []).filter((p) => p.request_id === rid).length;
  const needing = (open ?? []).filter((l) => proposalsFor(l.request_id) < 3);

  const checks = await serverChecks(engagements?.length ?? 0);

  // Avisos por tentativas de partilhar contactos, por conta (src/domain/strikes.ts).
  const [{ data: violations }, { data: blockedRows }] = await Promise.all([
    supabase.from('contact_violations').select('id, user_id, onde, motivos, texto, created_at').is('anulada_em', null).order('created_at', { ascending: false }).limit(100),
    supabase.from('blocked_users').select('user_id, blocked_at, motivo'),
  ]);
  const { data: appeals } = await supabase.from('strike_appeals').select('id, user_id, violation_id, texto, created_at').eq('estado', 'pendente').order('created_at');
  const strikeUsers = [...new Set([...(violations ?? []).map((v) => v.user_id), ...(blockedRows ?? []).map((b) => b.user_id), ...(appeals ?? []).map((a) => a.user_id)])];
  const admin = adminClient();
  const emailOf = new Map<string, string>();
  if (admin) {
    await Promise.all(strikeUsers.map(async (id) => emailOf.set(id, (await admin.auth.admin.getUserById(id)).data.user?.email ?? id)));
  }
  const blockedSet = new Set((blockedRows ?? []).map((b) => b.user_id));

  const tiles = [
    { href: '/app/validacao', label: 'Documentos e fotografias por rever', n: (docs.count ?? 0) + (photos.count ?? 0) },
    { href: '/app/contratacoes', label: 'Contratações à espera da plataforma', n: pendingEngagements },
    { href: '#denuncias', label: 'Denúncias de anúncios', n: reports?.length ?? 0 },
    { href: '#assinaturas', label: 'Assinaturas com certificado por confirmar', n: unverified?.length ?? 0 },
    { href: '#infracoes', label: 'Contas com avisos por contactos', n: strikeUsers.length },
    { href: '#revisoes', label: 'Pedidos de revisão por decidir', n: appeals?.length ?? 0 },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Backoffice</h1>
        <p className="mt-1 text-sm text-slate-600">
          Tudo o que a equipa da plataforma faz fica registado com autor e hora (ver auditoria).
        </p>
      </div>

      <section className={card} aria-labelledby="diagnostico">
        <h2 id="diagnostico" className="font-semibold">Estado do servidor</h2>
        <ul className="mt-3 space-y-2 text-sm">
          {checks.map((c) => (
            <li key={c.label} className="flex gap-3">
              <span className={c.ok ? 'text-tinta-700' : 'font-bold text-red-700'} aria-label={c.ok ? 'Em ordem' : 'Com problema'}>
                {c.ok ? '✓' : '✗'}
              </span>
              <span>
                <b>{c.label}.</b> <span className={c.ok ? 'text-slate-600' : 'text-red-800'}>{c.detail}</span>
              </span>
            </li>
          ))}
        </ul>
      </section>

      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {tiles.map((t) => (
          <li key={t.label}>
            <Link href={t.href} className={`${card} block hover:bg-slate-50`}>
              <span className="text-3xl font-semibold text-tinta-700">{t.n}</span>
              <span className="mt-1 block text-sm text-slate-600">{t.label}</span>
            </Link>
          </li>
        ))}
      </ul>

      <div className="flex flex-wrap gap-3 text-sm">
        <Link href="/app/backoffice/conciliacao" className="rounded-lg border border-slate-300 px-4 py-2 font-semibold hover:bg-slate-50">
          Conciliação de pagamentos
        </Link>
        <Link href="/app/backoffice/auditoria" className="rounded-lg border border-slate-300 px-4 py-2 font-semibold hover:bg-slate-50">
          Auditoria
        </Link>
      </div>

      <section className={card}>
        <h2 className="font-semibold">Pedidos com menos de três propostas</h2>
        <p className="mt-1 text-sm text-slate-600">
          Convide pintores verificados. O convite não garante propostas nem apresenta pintores relacionados como independentes.
        </p>
        {needing.length === 0 ? (
          <p className="mt-2 text-sm text-slate-600">Nenhum.</p>
        ) : (
          <ul className="mt-4 space-y-4">
            {needing.map((l) => (
              <li key={l.request_id} className="text-sm">
                <p>
                  <span className="font-medium">Pedido {l.ref}</span> · {l.concelho} · {formatArea(l.area_total_cm2)} ·{' '}
                  {proposalsFor(l.request_id)} proposta(s) · até {l.prazo_propostas.split('-').reverse().join('/')}
                </p>
                <div className="mt-2">
                  <InvitePainter requestId={l.request_id} painters={painterList ?? []} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {(unverified ?? []).length > 0 && (
        <section id="assinaturas" className={card}>
          <h2 className="font-semibold">Assinaturas com certificado por confirmar</h2>
          <p className="mt-1 text-sm text-slate-600">
            A assinatura é válida, mas o certificado não encadeou numa entidade “Cartão de Cidadão” conhecida. Abra o PDF e
            confirme o certificado na aplicação Autenticação.gov ou no validador da UE.
          </p>
          <ul className="mt-3 space-y-1 text-sm">
            {(unverified ?? []).map((v) => (
              <li key={v.id}>
                <Link href={`/app/contratacoes/${v.engagement_id}`} className="text-tinta-700 hover:underline">
                  {v.engagement_id.slice(0, 8).toUpperCase()}
                </Link>{' '}
                · {(v.payload as { signatario?: string }).signatario ?? 'signatário'} · {v.at.slice(0, 10).split('-').reverse().join('/')}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section id="revisoes" className={card}>
        <h2 className="font-semibold">Pedidos de revisão do segundo aviso</h2>
        <p className="mt-1 text-sm text-slate-600">
          Aceitar anula o 2.º aviso (a conta volta a 1 aviso). Recusar mantém o último aviso: uma nova tentativa bloqueia a conta. Só se pode pedir
          revisão do 2.º aviso, uma vez.
        </p>
        {(appeals ?? []).length === 0 ? (
          <p className="mt-3 text-sm text-slate-600">Sem pedidos por decidir.</p>
        ) : (
          <ul className="mt-3 divide-y divide-slate-100 text-sm">
            {(appeals ?? []).map((a) => {
              const second = (violations ?? []).find((v) => v.id === a.violation_id);
              return (
                <li key={a.id} className="py-3">
                  <b>{emailOf.get(a.user_id) ?? a.user_id}</b> · {new Date(a.created_at).toLocaleString('pt-PT')}
                  <p className="mt-1 whitespace-pre-line rounded bg-slate-50 px-2 py-1">{a.texto}</p>
                  {second && (
                    <p className="mt-1 text-xs text-slate-600">
                      Texto do 2.º aviso ({second.onde}, {second.motivos.join(', ')}): <span className="whitespace-pre-line">{second.texto}</span>
                    </p>
                  )}
                  <AppealForm appealId={a.id} />
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section id="infracoes" className={card}>
        <h2 className="font-semibold">Tentativas de partilhar contactos</h2>
        <p className="mt-1 text-sm text-slate-600">
          1.ª tentativa: aviso. 2.ª: último aviso. 3.ª: conta bloqueada e NIF das entidades impedido de se registar. Desbloquear anula os avisos.
        </p>
        {strikeUsers.length === 0 ? (
          <p className="mt-3 text-sm text-slate-600">Sem tentativas registadas.</p>
        ) : (
          <ul className="mt-3 divide-y divide-slate-100 text-sm">
            {strikeUsers.map((uid) => {
              const mine = (violations ?? []).filter((v) => v.user_id === uid);
              return (
                <li key={uid} className="py-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span>
                      <b>{emailOf.get(uid) ?? uid}</b> · {mine.length} {mine.length === 1 ? 'aviso' : 'avisos'}
                      {blockedSet.has(uid) && <span className="ml-2 rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-800">Bloqueada</span>}
                    </span>
                    {blockedSet.has(uid) && (
                      <form action={unblockAccount.bind(null, uid)}>
                        <button type="submit" className="rounded-lg border border-slate-300 px-3 py-1 text-sm font-semibold hover:bg-slate-50">
                          Desbloquear
                        </button>
                      </form>
                    )}
                  </div>
                  <ul className="mt-1 space-y-1 text-slate-600">
                    {mine.map((v) => (
                      <li key={v.id}>
                        {new Date(v.created_at).toLocaleString('pt-PT')} · {v.onde} · {v.motivos.join(', ')}
                        <span className="block whitespace-pre-line rounded bg-slate-50 px-2 py-1 text-xs text-slate-700">{v.texto}</span>
                      </li>
                    ))}
                  </ul>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section id="denuncias" className={card}>
        <h2 className="font-semibold">Denúncias de anúncios</h2>
        {!reports || reports.length === 0 ? (
          <p className="mt-2 text-sm text-slate-600">Não há denúncias por decidir.</p>
        ) : (
          <ul className="mt-4 space-y-6">
            {reports.map((r) => {
              const l = listings.find((x) => x.request_id === r.request_id);
              return (
                <li key={r.id} className="text-sm">
                  <p className="font-medium">
                    Pedido {l?.ref ?? '—'} · {l?.concelho ?? ''}
                  </p>
                  <p className="mt-1">
                    <span className="text-slate-500">Denúncia: </span>
                    {r.motivo}
                  </p>
                  {l && <p className="mt-1 whitespace-pre-line rounded-lg bg-slate-50 p-2 text-slate-700">{l.descricao}</p>}
                  <ResolveReport reportId={r.id} />
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section id="subscricoes" className={card}>
        <h2 className="font-semibold">Subscrições dos fornecedores</h2>
        <p className="mt-1 text-sm text-slate-600">
          Enquanto o Stripe não está ligado, a equipa ativa o plano aqui depois de receber o pagamento.
        </p>
        <ul className="mt-3 space-y-1 text-sm">
          {(suppliers ?? []).map((s) => {
            const sub = (subs ?? []).find((x) => x.org_id === s.id);
            return (
              <li key={s.id}>
                <strong>{s.nome}</strong>:{' '}
                {sub ? `${PLAN_INFO[sub.plan].label} · ${sub.status} · ${formatEuros(sub.price_cents)}/mês + IVA` : 'sem subscrição'}
              </li>
            );
          })}
        </ul>
        <div className="mt-4">
          <SupplierPlanForm suppliers={suppliers ?? []} />
        </div>
      </section>

      <section id="promocoes" className={card}>
        <h2 className="font-semibold">Códigos promocionais dos fornecedores</h2>
        <p className="mt-1 text-sm text-slate-600">
          Desconto de 1% a 100% na subscrição do catálogo. A plataforma não recebe nada dos fornecedores pelas
          transações, só a subscrição.
        </p>
        <div className="mt-4">
          <CreatePromoCode />
        </div>
        {(promos ?? []).length > 0 && (
          <table className="mt-6 w-full text-left text-sm">
            <thead className="text-slate-500">
              <tr>
                <th className="py-1">Código</th>
                <th>Desconto</th>
                <th>Válido até</th>
                <th>Usos</th>
                <th>Notas</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {promos!.map((p) => (
                <tr key={p.id} className={`border-t border-slate-100 ${p.active ? '' : 'text-slate-400'}`}>
                  <td className="py-2 font-mono">{p.code}</td>
                  <td>{(p.discount_bps / 100).toLocaleString('pt-PT')}%</td>
                  <td>{p.valid_until ?? '—'}</td>
                  <td>
                    {p.uses}
                    {p.max_uses !== null ? ` / ${p.max_uses}` : ''}
                  </td>
                  <td>{p.notas ?? ''}</td>
                  <td className="text-right">
                    <TogglePromo id={p.id} active={p.active} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
