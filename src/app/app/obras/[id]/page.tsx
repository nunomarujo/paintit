import Link from 'next/link';
import { AddendaList } from '@/components/AddendaList';
import { ProposeAddenda, WithdrawAddenda } from './AddendaForms';
import { notFound } from 'next/navigation';
import {
  addEntry,
  addMember,
  addPhase,
  deleteWorksiteRow,
  markTrancheReceived,
  orderMaterial,
  reviewSupplier,
  setOrderState,
  setPhaseState,
} from '@/app/app/obras/actions';
import { MiniForm } from '@/components/MiniForm';
import { consumption, discounted, productLabel } from '@/domain/catalog';
import { localDate } from '@/domain/deadline';
import { formatEuros } from '@/domain/money';
import { CURRENT_RULES } from '@/domain/rules';
import {
  COST_CATEGORIES,
  COST_LABELS,
  CREW_ROLE_LABELS,
  MEMBER_ROLES,
  PAYMENT_LABELS,
  PAYMENT_METHODS,
  summarize,
  type CostCategory,
  type CrewRole,
  type PaymentMethod,
} from '@/domain/worksite';
import { canManage, myRole } from '@/lib/access';
import { getUser } from '@/lib/supabase/server';

const card = 'rounded-2xl border border-slate-200 bg-white p-6';
const pt = (d: string | null) => (d ? d.split('-').reverse().join('/') : '—');
const del = 'text-xs text-red-700 hover:underline';
const ORDER: Record<string, string> = { pedida: 'Pedida', confirmada: 'Venda confirmada', entregue: 'Entregue em obra', cancelada: 'Cancelada' };
const SCORES = [1, 2, 3, 4, 5].map((n) => ({ value: String(n), label: String(n) }));
const PHASE: Record<string, string> = { por_iniciar: 'Por iniciar', em_curso: 'Em curso', concluida: 'Concluída' };

// Ferramentas de obra: internas do pintor, opcionais. O cliente não as vê.
export default async function WorksitePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ s?: string }> }) {
  const { id } = await params;
  const { s: section = 'resumo' } = await searchParams;
  const { supabase, user } = await getUser();
  // O identificador da rota é o da obra. Uma obra pode ter contratação da plataforma por trás, ou ser
  // uma obra própria do pintor, ganha por fora — as ferramentas são as mesmas (decisão de 25/10/2026).
  const { data: w } = await supabase.from('worksites').select('*').eq('id', id).maybeSingle();
  if (!w) notFound();
  const { data: org } = await supabase.from('organizations').select('id, nome, gerida_por').eq('id', w.org_id).maybeSingle();
  const role = org ? await myRole(supabase, user!.id, org) : null;
  if (!org || !role) notFound();
  const manager = canManage(role);

  const { data: e } = w.engagement_id
    ? await supabase.from('engagements').select('*').eq('id', w.engagement_id).maybeSingle()
    : { data: null };

  const [{ data: lines }, { data: members }, { data: phases }, { data: entries }, { data: orders }, { data: listing }] =
    await Promise.all([
      e ? supabase.from('proposal_lines').select('*').eq('proposal_id', e.proposal_id).order('created_at') : Promise.resolve({ data: [] }),
      supabase.from('worksite_members').select('*').eq('worksite_id', id).order('created_at'),
      supabase.from('worksite_phases').select('*').eq('worksite_id', id).order('inicio', { nullsFirst: false }),
      supabase.from('worksite_entries').select('*').eq('worksite_id', id).order('data', { ascending: false }),
      e ? supabase.from('material_orders').select('*').eq('engagement_id', e.id).order('created_at', { ascending: false }) : Promise.resolve({ data: [] }),
      e ? supabase.from('request_listings').select('ref, concelho').eq('request_id', e.request_id).maybeSingle() : Promise.resolve({ data: null }),
    ]);
  const { data: addendaRows } = await supabase
    .from('worksite_addenda')
    .select('id, descricao, valor_cents, estado, criada_em, respondida_em, foto_path')
    .eq('worksite_id', id)
    .order('criada_em', { ascending: false });
  const addenda = (addendaRows ?? []).map((a) => ({
    id: a.id,
    descricao: a.descricao,
    valorCents: a.valor_cents,
    estado: a.estado,
    criadaEm: a.criada_em,
    respondidaEm: a.respondida_em,
    temFotografia: Boolean(a.foto_path),
  }));
  const productIds = [...new Set((lines ?? []).map((l) => l.product_id).filter((x): x is string => Boolean(x)))];
  const { data: products } = productIds.length ? await supabase.from('products').select('*').in('id', productIds) : { data: [] };
  const supplierIds = [...new Set((products ?? []).map((p) => p.org_id))];
  const [{ data: suppliers }, { data: myReviews }] = await Promise.all([
    supplierIds.length ? supabase.from('organizations').select('id, nome, email_contacto, telefone').in('id', supplierIds) : Promise.resolve({ data: [] }),
    supabase.from('supplier_reviews').select('*').eq('painter_org_id', org.id),
  ]);

  const today = localDate(new Date(), CURRENT_RULES.timeZone);
  const list = entries ?? [];
  const sum = summarize({
    contrato: w.valor_cents ?? e?.base_cents ?? 0,
    tranches: list.filter((x) => x.tipo === 'tranche').map((x) => ({ valor: x.valor_cents ?? 0, prevista: x.prevista, recebidaEm: x.recebida_em })),
    costs: list.filter((x) => x.tipo === 'custo').map((x) => ({ categoria: x.categoria as CostCategory, valor: x.valor_cents ?? 0 })),
    hours: list
      .filter((x) => x.tipo === 'horas')
      .map((x) => ({ horas: x.horas ?? 0, custoHora: (members ?? []).find((m) => m.id === x.member_id)?.custo_hora_cents ?? null })),
    today,
  });
  const memberOptions = (members ?? []).map((m) => ({ value: m.id, label: m.nome }));
  const tabs = [
    ['resumo', 'Resumo'],
    ['materiais', 'Materiais'],
    ['equipa', 'Equipa e horas'],
    ['cronograma', 'Cronograma'],
    ['financeiro', 'Custos e tranches'],
    ['adendas', 'Trabalhos a mais'],
  ] as const;

  return (
    <div className="space-y-6">
      <div>
        <Link href={`/app/contratacoes/${id}`} className="text-sm text-slate-600 hover:underline">
          ← Contratação
        </Link>
        <h1 className="mt-3 text-2xl font-semibold">Ferramentas de obra</h1>
        <p className="mt-1 text-sm text-slate-600">
          Obra {listing?.ref ?? id.slice(0, 8).toUpperCase()} · {listing?.concelho ?? ''}. Só a sua equipa vê esta página; a
          plataforma não intervém na execução.
        </p>
      </div>

      <nav className="flex flex-wrap gap-2 border-b border-slate-200 text-sm">
        {tabs.map(([k, label]) => (
          <Link
            key={k}
            href={`/app/obras/${id}?s=${k}`}
            className={`-mb-px border-b-2 px-3 py-2 ${section === k ? 'border-tinta-600 font-semibold text-tinta-900' : 'border-transparent text-slate-600 hover:text-slate-900'}`}
          >
            {label}
          </Link>
        ))}
      </nav>

      {section === 'resumo' && (
        <section className={card}>
          <dl className="grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
            <dt className="text-slate-500">Valor do contrato (sem IVA)</dt>
            <dd className="font-semibold sm:text-right">{formatEuros(sum.contrato)}</dd>
            <dt className="text-slate-500">Recebido</dt>
            <dd className="sm:text-right">{formatEuros(sum.recebido)}</dd>
            <dt className="text-slate-500">Por receber</dt>
            <dd className="sm:text-right">{formatEuros(sum.porReceber)}</dd>
            {sum.emAtraso > 0 && (
              <>
                <dt className="text-red-700">Tranches em atraso</dt>
                <dd className="text-red-700 sm:text-right">{formatEuros(sum.emAtraso)}</dd>
              </>
            )}
            <dt className="text-slate-500">Custos registados</dt>
            <dd className="sm:text-right">{formatEuros(sum.custos)}</dd>
            <dt className="text-slate-500">dos quais mão de obra ({(sum.horas / 100).toLocaleString('pt-PT')} h)</dt>
            <dd className="sm:text-right">{formatEuros(sum.maoDeObra)}</dd>
            <dt className="text-slate-500">Margem prevista</dt>
            <dd className={`font-semibold sm:text-right ${sum.margem < 0 ? 'text-red-700' : ''}`}>
              {formatEuros(sum.margem)}
              {sum.margemBps !== null ? ` (${(sum.margemBps / 100).toLocaleString('pt-PT')}%)` : ''}
            </dd>
            {sum.semPlano > 0 && (
              <>
                <dt className="text-slate-500">Valor ainda sem tranche planeada</dt>
                <dd className="sm:text-right">{formatEuros(sum.semPlano)}</dd>
              </>
            )}
          </dl>
          {Object.keys(sum.porCategoria).length > 0 && (
            <ul className="mt-4 border-t border-slate-100 pt-3 text-sm">
              {Object.entries(sum.porCategoria).map(([k, v]) => (
                <li key={k} className="flex justify-between">
                  <span className="text-slate-500">{COST_LABELS[k as CostCategory]}</span>
                  <span>{formatEuros(v)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {section === 'adendas' && (
        <section className={card}>
          <h2 className="text-base font-semibold">Trabalhos a mais</h2>
          <p className="mt-1 max-w-[70ch] text-sm text-slate-600">
            O que o cliente pediu a mais durante a obra, com preço e aceitação registados. Sem isto escrito, ou não se
            cobra ou cobra-se e discute-se — e só conta para o valor da obra depois de o cliente aceitar.
          </p>
          <div className="mt-4">
            <AddendaList
              addenda={addenda}
              hoje={today}
              vazio="Ainda não há trabalhos a mais registados nesta obra."
              acoes={(a) => (a.estado === 'proposta' && manager ? <WithdrawAddenda engagementId={id} addendaId={a.id} /> : null)}
            />
          </div>
          {manager && (
            <div className="mt-5 border-t border-slate-200 pt-4">
              <p className="eyebrow mb-2">Registar um trabalho a mais</p>
              <ProposeAddenda engagementId={id} />
            </div>
          )}
        </section>
      )}

      {section === 'materiais' && (
        <section className={`${card} space-y-6 text-sm`}>
          <p className="text-slate-600">
            Materiais comprometidos do contrato. A quantidade sugerida usa a área da linha, as demãos e o rendimento do
            produto. O fornecedor confirma a venda e a entrega, e o cliente vê essa confirmação.{' '}
            <Link href="/app/catalogo" className="text-tinta-700 hover:underline">
              Procurar outros produtos e preços
            </Link>
          </p>
          {(lines ?? []).filter((l) => l.product_id).length === 0 && <p>Esta proposta não tem materiais comprometidos.</p>}
          {(lines ?? [])
            .filter((l) => l.product_id)
            .map((l) => {
              const p = (products ?? []).find((x) => x.id === l.product_id);
              if (!p) return null;
              const s = (suppliers ?? []).find((x) => x.id === p.org_id);
              const c = l.unidade === 'm2' ? consumption(l.quantidade, l.demaos ?? p.demaos_recomendadas ?? 2, {
                rendimento: p.rendimento,
                embalagemMl: p.embalagem_ml,
                precoReferencia: l.preco_fornecedor_cents,
              }) : null;
              return (
                <div key={l.id} className="rounded-xl border border-slate-200 p-4">
                  <p className="font-semibold">{productLabel(p)}</p>
                  <p className="text-slate-600">
                    {l.descricao} · {s?.nome}
                    {s?.telefone ? ` · ${s.telefone}` : ''}
                    {s?.email_contacto ? ` · ${s.email_contacto}` : ''}
                  </p>
                  {c && (
                    <p className="mt-1">
                      Sugestão: {(c.ml / 1000).toLocaleString('pt-PT', { maximumFractionDigits: 1 })} {p.unidade}
                      {c.embalagens !== null ? `, ${c.embalagens} embalagens` : ''}
                      {l.preco_fornecedor_cents !== null && c.embalagens !== null
                        ? `, cerca de ${formatEuros(c.embalagens * discounted(l.preco_fornecedor_cents, l.desconto_bps ?? 0))} com desconto`
                        : ''}
                    </p>
                  )}
                  {manager && (
                    <div className="mt-3">
                      <MiniForm
                        action={orderMaterial.bind(null, id, p.id)}
                        submit="Encomendar ao fornecedor"
                        fields={[
                          { name: 'embalagens', label: 'Embalagens', placeholder: c?.embalagens ? String(c.embalagens) : '' },
                          { name: 'nota', label: 'Nota (data e local de entrega)', wide: true },
                        ]}
                      />
                    </div>
                  )}
                </div>
              );
            })}

          {(orders ?? []).length > 0 && (
            <div>
              <h3 className="font-semibold">Encomendas</h3>
              <ul className="mt-2 divide-y divide-slate-100">
                {(orders ?? []).map((o) => {
                  const p = (products ?? []).find((x) => x.id === o.product_id);
                  return (
                    <li key={o.id} className="flex flex-wrap items-center justify-between gap-2 py-1.5">
                      <span>
                        {o.embalagens} × {p ? productLabel(p) : 'produto'} · {ORDER[o.estado]}
                        {o.delivered_at ? ` a ${pt(o.delivered_at.slice(0, 10))}` : ''}
                      </span>
                      {manager && o.estado === 'pedida' && (
                        <form action={setOrderState.bind(null, o.id, 'cancelada', `/app/obras/${id}`)}>
                          <button type="submit" className={del}>
                            Cancelar
                          </button>
                        </form>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {manager &&
            supplierIds
              .filter((sid) => (orders ?? []).some((o) => o.supplier_org_id === sid && ['confirmada', 'entregue'].includes(o.estado)))
              .map((sid) => {
                const r = (myReviews ?? []).find((x) => x.supplier_org_id === sid);
                return (
                  <div key={sid} className="rounded-xl border border-slate-200 p-4">
                    <h3 className="font-semibold">Avaliar {(suppliers ?? []).find((x) => x.id === sid)?.nome}</h3>
                    {r && (
                      <p className="text-slate-600">
                        A sua avaliação: produto {r.produto}/5 · entrega {r.entrega}/5 · atendimento {r.atendimento}/5. Pode alterá-la.
                      </p>
                    )}
                    {r?.resposta && (
                      <p className="mt-1 rounded-lg bg-slate-50 p-2 text-slate-700">
                        <span className="text-slate-500">Resposta do fornecedor: </span>
                        {r.resposta}
                      </p>
                    )}
                    <div className="mt-2">
                      <MiniForm
                        action={reviewSupplier.bind(null, id, sid, org.id)}
                        submit={r ? 'Atualizar avaliação' : 'Avaliar'}
                        fields={[
                          { name: 'produto', label: 'Produto', options: SCORES },
                          { name: 'entrega', label: 'Entrega', options: SCORES },
                          { name: 'atendimento', label: 'Atendimento', options: SCORES },
                          { name: 'comentario', label: 'Comentário', type: 'textarea' },
                        ]}
                      />
                    </div>
                  </div>
                );
              })}
        </section>
      )}

      {section === 'equipa' && (
        <section className={`${card} space-y-6 text-sm`}>
          <ul className="divide-y divide-slate-100">
            {(members ?? []).map((m) => {
              const h = list.filter((x) => x.tipo === 'horas' && x.member_id === m.id).reduce((n, x) => n + (x.horas ?? 0), 0);
              return (
                <li key={m.id} className="flex flex-wrap items-center justify-between gap-2 py-1.5">
                  <span>
                    <span className="font-medium">{m.nome}</span> · {CREW_ROLE_LABELS[m.funcao as CrewRole]}
                    {m.telefone ? ` · ${m.telefone}` : ''}
                    {m.custo_hora_cents !== null ? ` · ${formatEuros(m.custo_hora_cents)}/h` : ''} · {(h / 100).toLocaleString('pt-PT')} h
                  </span>
                  {manager && (
                    <form action={deleteWorksiteRow.bind(null, id, 'worksite_members', m.id)}>
                      <button type="submit" className={del}>
                        Remover
                      </button>
                    </form>
                  )}
                </li>
              );
            })}
          </ul>
          {manager && (
            <>
              <MiniForm
                action={addMember.bind(null, id)}
                submit="Acrescentar pessoa"
                fields={[
                  { name: 'nome', label: 'Nome' },
                  { name: 'funcao', label: 'Função', options: MEMBER_ROLES.map((r) => ({ value: r, label: CREW_ROLE_LABELS[r] })) },
                  { name: 'telefone', label: 'Telefone' },
                  { name: 'custoHora', label: 'Custo por hora (€)' },
                ]}
              />
              <div className="border-t border-slate-100 pt-6">
                <h3 className="mb-2 font-semibold">Registar horas</h3>
                <MiniForm
                  action={addEntry.bind(null, id, 'horas')}
                  submit="Registar"
                  fields={[
                    { name: 'member', label: 'Pessoa', options: memberOptions },
                    { name: 'data', label: 'Dia', type: 'date' },
                    { name: 'horas', label: 'Horas', placeholder: '7,5' },
                    { name: 'descricao', label: 'Trabalho feito' },
                  ]}
                />
              </div>
            </>
          )}
        </section>
      )}

      {section === 'cronograma' && (
        <section className={`${card} space-y-6 text-sm`}>
          <ol>
            {(phases ?? []).map((ph, i, all) => (
              <li key={ph.id} className="relative flex flex-wrap items-start justify-between gap-2 pb-6 pl-12">
                {i < all.length - 1 && <span className="absolute bottom-0 left-[15px] top-8 w-px bg-slate-200" aria-hidden="true" />}
                <span
                  className={`absolute left-0 top-0 inline-flex h-8 w-8 items-center justify-center rounded-full border text-[11px] ${
                    ph.estado === 'concluida' ? 'border-tinta-600 bg-tinta-600 text-white' : ph.estado === 'em_curso' ? 'border-tinta-600 bg-sage' : 'border-slate-200 bg-slate-100'
                  }`}
                  aria-hidden="true"
                >
                  {ph.estado === 'concluida' ? '✓' : i + 1}
                </span>
                <span>
                  <span className="font-medium">{ph.nome}</span> · {pt(ph.inicio)} a {pt(ph.fim)} · {PHASE[ph.estado]}
                  {ph.estado !== 'concluida' && ph.fim && ph.fim < today && <span className="ml-2 text-red-700">atrasada</span>}
                </span>
                {manager && (
                  <span className="flex gap-3">
                    {ph.estado === 'por_iniciar' && (
                      <form action={setPhaseState.bind(null, id, ph.id, 'em_curso')}>
                        <button type="submit" className="text-xs text-tinta-700 hover:underline">
                          Iniciar
                        </button>
                      </form>
                    )}
                    {ph.estado === 'em_curso' && (
                      <form action={setPhaseState.bind(null, id, ph.id, 'concluida')}>
                        <button type="submit" className="text-xs text-tinta-700 hover:underline">
                          Concluir
                        </button>
                      </form>
                    )}
                    <form action={deleteWorksiteRow.bind(null, id, 'worksite_phases', ph.id)}>
                      <button type="submit" className={del}>
                        Remover
                      </button>
                    </form>
                  </span>
                )}
              </li>
            ))}
          </ol>
          {manager && (
            <MiniForm
              action={addPhase.bind(null, id)}
              submit="Acrescentar fase"
              fields={[
                { name: 'nome', label: 'Fase', placeholder: 'Ex.: montagem de andaimes' },
                { name: 'inicio', label: 'Início', type: 'date' },
                { name: 'fim', label: 'Fim', type: 'date' },
              ]}
            />
          )}
        </section>
      )}

      {section === 'financeiro' && (
        <section className={`${card} space-y-6 text-sm`}>
          <div>
            <h3 className="font-semibold">Tranches do cliente</h3>
            <ul className="mt-2 divide-y divide-slate-100">
              {list
                .filter((x) => x.tipo === 'tranche')
                .map((x) => (
                  <li key={x.id} className="flex flex-wrap items-center justify-between gap-2 py-1.5">
                    <span>
                      {formatEuros(x.valor_cents ?? 0)} · {x.descricao || 'tranche'} · prevista {pt(x.prevista)}
                      {x.meio ? ` · ${PAYMENT_LABELS[x.meio as PaymentMethod]}` : ''}
                      {x.recebida_em ? (
                        <span className="text-tinta-700"> · recebida a {pt(x.recebida_em)}</span>
                      ) : x.prevista && x.prevista < today ? (
                        <span className="text-red-700"> · em atraso</span>
                      ) : null}
                    </span>
                    {manager && !x.recebida_em && (
                      <form action={markTrancheReceived.bind(null, id, x.id)}>
                        <button type="submit" className="text-xs text-tinta-700 hover:underline">
                          Marcar recebida
                        </button>
                      </form>
                    )}
                  </li>
                ))}
            </ul>
            {manager && (
              <div className="mt-3">
                <MiniForm
                  action={addEntry.bind(null, id, 'tranche')}
                  submit="Acrescentar tranche"
                  fields={[
                    { name: 'descricao', label: 'Descrição', placeholder: 'Ex.: 40% a meio da obra' },
                    { name: 'valor', label: 'Valor (€)' },
                    { name: 'prevista', label: 'Data prevista', type: 'date' },
                    { name: 'meio', label: 'Meio de pagamento', options: PAYMENT_METHODS.map((m) => ({ value: m, label: PAYMENT_LABELS[m] })) },
                  ]}
                />
              </div>
            )}
          </div>
          <div className="border-t border-slate-100 pt-6">
            <h3 className="font-semibold">Custos</h3>
            <ul className="mt-2 divide-y divide-slate-100">
              {list
                .filter((x) => x.tipo === 'custo')
                .map((x) => (
                  <li key={x.id} className="flex flex-wrap items-center justify-between gap-2 py-1.5">
                    <span>
                      {pt(x.data)} · {COST_LABELS[x.categoria as CostCategory]} · {x.descricao} · {formatEuros(x.valor_cents ?? 0)}
                    </span>
                    {manager && (
                      <form action={deleteWorksiteRow.bind(null, id, 'worksite_entries', x.id)}>
                        <button type="submit" className={del}>
                          Remover
                        </button>
                      </form>
                    )}
                  </li>
                ))}
            </ul>
            {manager && (
              <div className="mt-3">
                <MiniForm
                  action={addEntry.bind(null, id, 'custo')}
                  submit="Registar custo"
                  fields={[
                    { name: 'categoria', label: 'Categoria', options: COST_CATEGORIES.map((c) => ({ value: c, label: COST_LABELS[c] })) },
                    { name: 'valor', label: 'Valor (€)' },
                    { name: 'data', label: 'Data', type: 'date' },
                    { name: 'descricao', label: 'Descrição' },
                  ]}
                />
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
