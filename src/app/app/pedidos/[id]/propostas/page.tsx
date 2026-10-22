import Link from 'next/link';
import { notFound } from 'next/navigation';
import { MessageThread } from '@/components/MessageThread';
import { ProposalView } from '@/components/ProposalView';
import { clientGuarantee } from '@/domain/commission';
import { formatEuros, percentOf } from '@/domain/money';
import { LINE_CATEGORIES, LINE_CATEGORY_LABELS, SORT_LABELS, compareProposals, sortRows, type SortKey } from '@/domain/proposal';
import { DESIRED_WORK_LABELS, SURFACE_KIND_LABELS, formatArea, type DesiredWork } from '@/domain/request';
import { CURRENT_RULES } from '@/domain/rules';
import { WORK_STATE_LABELS, requestedCoverage } from '@/domain/works';
import { canManage, myRole } from '@/lib/access';
import { productsFor } from '@/lib/materials';
import { toLine, toTerms } from '@/lib/proposals';
import { adherence, parsePreferences } from '@/domain/reference';
import { loadReferences, refPerLitre, usedProducts } from '@/lib/reference';
import { getUser } from '@/lib/supabase/server';
import { ChooseButton } from './ChooseButton';

const card = 'rounded-2xl border border-slate-200 bg-white p-6';
const pt = (d: string | null) => (d ? d.split('-').reverse().join('/') : 'Não indicado');
const STATUS: Record<string, string> = {
  submetida: 'Em análise',
  retirada: 'Retirada pelo pintor',
  selecionada: 'Escolhida',
  nao_selecionada: 'Não escolhida',
  falhada: 'Escolhida, mas o pintor não cumpriu',
};

// Comparador do cliente (CLI-14, CLI-15): propostas lado a lado, sem identificar os pintores.
export default async function ProposalsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ordem?: string }>;
}) {
  const { id } = await params;
  const { ordem } = await searchParams;
  const sortKey: SortKey = ordem === 'prazo' || ordem === 'completude' ? ordem : 'preco';
  const { supabase, user } = await getUser();

  const { data: req } = await supabase.from('work_requests').select('*').eq('id', id).maybeSingle();
  if (!req) notFound();
  const [{ data: org }, { data: surfaces }, { data: proposals }, { data: messages }] = await Promise.all([
    supabase.from('organizations').select('id, nome, gerida_por').eq('id', req.org_id).single(),
    supabase.from('request_surfaces').select('id, kind, descricao, area_cm2').eq('request_id', id).order('created_at'),
    supabase.from('proposals').select('*').eq('request_id', id).neq('status', 'rascunho').order('submitted_at'),
    supabase.from('proposal_messages').select('id, proposal_id, lado, texto, created_at').eq('request_id', id).order('created_at'),
  ]);
  if (!org) notFound();
  const manager = canManage(await myRole(supabase, user!.id, org));

  const list = proposals ?? [];
  const ids = list.map((p) => p.id);
  const { data: lines } = ids.length
    ? await supabase.from('proposal_lines').select('*').in('proposal_id', ids).order('created_at')
    : { data: [] };
  const committedProductIds = [...new Set((lines ?? []).map((l) => l.product_id).filter((x): x is string => !!x))];
  const materialProducts = Object.fromEntries(await productsFor(supabase, committedProductIds));
  const [ratings, { data: versions }] = await Promise.all([
    Promise.all(ids.map(async (pid) => [pid, (await supabase.rpc('painter_rating', { p_proposal: pid })).data?.[0] ?? null] as const)),
    ids.length ? supabase.from('proposal_versions').select('proposal_id, version').in('proposal_id', ids) : Promise.resolve({ data: [] }),
  ]);
  const ratingOf = new Map(ratings);
  const versionsOf = (pid: string) => (versions ?? []).filter((v) => v.proposal_id === pid).length;
  const linesOf = (pid: string) => (lines ?? []).filter((l) => l.proposal_id === pid).map((l) => ({ id: l.id, ...toLine(l) }));
  const areaTotal = (surfaces ?? []).reduce((n, s) => n + s.area_cm2, 0);
  const rows = compareProposals(
    list.map((p) => ({
      id: p.id,
      lines: linesOf(p.id),
      ivaBps: p.iva_bps,
      duracaoDias: p.duracao_dias,
      inicioPossivel: p.inicio_possivel,
      adiantamentoBps: p.adiantamento_bps,
    })),
    { areaTotal, superficies: (surfaces ?? []).map((s) => s.kind), zonas: (surfaces ?? []).map((s) => ({ id: s.id, kind: s.kind })) },
  );
  const zoneNames = Object.fromEntries(
    (surfaces ?? []).map((s) => [s.id, `${s.descricao?.trim() || SURFACE_KIND_LABELS[s.kind]} (${formatArea(s.area_cm2)})`]),
  );
  const missing = (r: { zonasEmFalta: string[]; superficiesEmFalta: (keyof typeof SURFACE_KIND_LABELS)[] }) =>
    r.zonasEmFalta.length ? r.zonasEmFalta.map((z) => zoneNames[z] ?? 'zona').join(', ') : r.superficiesEmFalta.map((x) => SURFACE_KIND_LABELS[x]).join(', ');
  const byId = new Map(list.map((p) => [p.id, p]));
  const prefs = parsePreferences(req.produtos_preferidos);
  const prefRefs = await loadReferences(supabase, prefs.map((p) => p.id));
  const allRefs = prefs.length ? await loadReferences(supabase) : [];
  const used = prefs.length ? await usedProducts(supabase, lines ?? [], allRefs) : new Map();
  const refInfo = new Map(prefRefs.map((r) => [r.id, { tipo: r.tipo, perLitre: refPerLitre(r) }]));
  const refName = new Map(prefRefs.map((r) => [r.id, `${r.marca} ${r.nome}`]));
  const adherenceOf = (pid: string) => adherence(prefs, refInfo, used.get(pid) ?? []);
  const desiredWorks = (req.trabalhos ?? []) as DesiredWork[];
  const coverageOf = (pid: string) => requestedCoverage(desiredWorks, linesOf(pid));
  const active = rows.filter((r) => byId.get(r.id)!.status !== 'retirada');
  const sorted = sortRows(active, sortKey, Object.fromEntries(list.map((p) => [p.id, p.duracao_dias])));
  const chosen = list.find((p) => p.status === 'selecionada');
  const threadsWithoutProposal = [...new Set((messages ?? []).map((m) => m.proposal_id))].filter((pid) => !byId.has(pid));
  const path = `/app/pedidos/${id}/propostas`;
  const { data: engagement } = chosen
    ? await supabase.from('engagements').select('id').eq('proposal_id', chosen.id).maybeSingle()
    : { data: null };

  return (
    <div className="space-y-8">
      <div>
        <Link href={`/app/pedidos/${id}`} className="text-sm text-slate-600 hover:underline">
          ← {req.titulo}
        </Link>
        <h1 className="mt-3 text-2xl font-semibold">Propostas recebidas</h1>
        <p className="mt-1 text-sm text-slate-600">
          Os pintores aparecem como Pintor A, B, C… pela ordem de chegada. A identidade e os contactos só são revelados
          depois da escolha, quando o pintor confirmar. Área do pedido: {formatArea(areaTotal)}.
        </p>
      </div>

      {engagement && (
        <Link
          href={`/app/contratacoes/${engagement.id}`}
          className={`${card} block border-tinta-100 bg-tinta-50 font-semibold text-tinta-900 hover:bg-tinta-100`}
        >
          Proposta escolhida. Continuar para a contratação (depósito, minuta e assinatura) →
        </Link>
      )}

      {sorted.length > 0 && (
        <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {sorted.map((r) => {
            const p = byId.get(r.id)!;
            const rating = ratingOf.get(r.id);
            return (
              <li
                key={r.id}
                className={`flex flex-col rounded-2xl bg-white p-6 ${p.status === 'selecionada' ? 'border-2 border-tinta-600' : 'border border-slate-200'}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-[11px] bg-sage text-xs font-bold text-tinta-600">
                    {r.alias.replace('Pintor ', '')}
                  </span>
                  <span className="flex flex-wrap justify-end gap-1">
                    {p.pintor_verificado && <span className="badge badge-green">Documentos validados</span>}
                    {r.materiaisCertificados > 0 && <span className="badge badge-green">Material comprometido</span>}
                    {p.request_version !== req.version && <span className="badge badge-amber">Versão anterior</span>}
                  </span>
                </div>
                <h3 className="mt-4 font-semibold">{r.alias}</h3>
                <p className="text-[30px] font-semibold leading-tight tracking-tight">{formatEuros(r.totals.base)}</p>
                <p className="text-[11px] text-slate-500">sem IVA · {formatEuros(r.totals.totalComIva)} com IVA</p>
                <div className="my-4 divide-y divide-slate-200 border-y border-slate-200 text-[12px]">
                  {[
                    ['Preço por m²', r.precoM2 !== null ? formatEuros(r.precoM2) : '—'],
                    ['Duração', p.duracao_dias ? `${p.duracao_dias} dias` : 'Não indicada'],
                    ['Adiantamento', p.adiantamento_bps > 0 ? `${p.adiantamento_bps / 100}%` : 'Nenhum'],
                    ['Garantia da obra', p.garantia_anos !== null ? `${p.garantia_anos} anos` : 'Não indicada'],
                    ['Avaliações', rating && rating.n >= 3 ? `${String(rating.media).replace('.', ',')}/5` : 'Histórico insuficiente'],
                  ].map(([k, v]) => (
                    <span key={k} className="flex justify-between gap-3 py-2 text-slate-500">
                      {k}
                      <b className="text-right font-medium text-slate-900">{v}</b>
                    </span>
                  ))}
                  <span className="flex justify-between gap-3 py-2 text-slate-500">
                    Superfícies
                    <b className={`text-right font-medium ${r.superficiesEmFalta.length ? 'text-amber-700' : 'text-slate-900'}`}>
                      {r.superficiesEmFalta.length ? `Falta ${missing(r)}` : 'Todas com preço'}
                    </b>
                  </span>
                </div>
                <a href={`#${r.id}`} className="btn-secondary mt-auto">
                  Ver proposta e mensagens
                </a>
              </li>
            );
          })}
        </ul>
      )}

      {active.length === 0 ? (
        <p className={`${card} text-sm text-slate-600`}>Ainda não há propostas submetidas.</p>
      ) : (
        <section className={card}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-semibold">Comparação detalhada</h2>
            <form className="flex items-center gap-2 text-sm">
              <label htmlFor="ordem">Ordenar por</label>
              <select id="ordem" name="ordem" defaultValue={sortKey} className="rounded-lg border border-slate-300 bg-white px-2 py-1">
                {(Object.keys(SORT_LABELS) as SortKey[]).map((k) => (
                  <option key={k} value={k}>
                    {SORT_LABELS[k]}
                  </option>
                ))}
              </select>
              <button type="submit" className="rounded-lg border border-slate-300 px-3 py-1 hover:bg-slate-50">
                Aplicar
              </button>
            </form>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            A ordenação é só pelo critério escolhido; não é uma recomendação. Valores em falta aparecem como “não indicado”
            e nunca como incluídos.
          </p>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[40rem] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="py-2 pr-3 font-normal text-slate-500" />
                  {sorted.map((r) => (
                    <th key={r.id} className="py-2 pr-3 font-semibold">
                      {r.alias}
                      <span className="block text-xs font-normal text-slate-500">{STATUS[byId.get(r.id)!.status]}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <Row label="Preço sem IVA" cells={sorted.map((r) => <strong key={r.id}>{formatEuros(r.totals.base)}</strong>)} />
                <Row label="Total com IVA" cells={sorted.map((r) => formatEuros(r.totals.totalComIva))} />
                <Row label="Preço por m²" cells={sorted.map((r) => (r.precoM2 !== null ? formatEuros(r.precoM2) : '—'))} />
                {prefs.map((pref, i) => (
                  <Row
                    key={pref.id}
                    label={`${refName.get(pref.id) ?? 'Produto pedido'}${pref.fixo ? ' (fixo)' : ''}`}
                    cells={sorted.map((r) => {
                      const a = adherenceOf(r.id)[i]!.result;
                      if (a.kind === 'segue') return <span key={r.id} className="text-tinta-700">Segue o pedido</span>;
                      if (a.kind === 'sem_indicacao') return <span key={r.id} className="text-slate-500">Não indica o produto</span>;
                      return (
                        <span key={r.id} className={pref.fixo ? 'text-red-700' : 'text-amber-700'}>
                          {pref.fixo ? 'Substitui, apesar de fixo: ' : 'Substitui por '}
                          {a.por}
                          {a.diffPct !== null && (
                            <span className="block text-xs">
                              {a.diffPct === 0 ? 'mesmo preço por litro' : `${Math.abs(a.diffPct)}% ${a.diffPct > 0 ? 'mais caro' : 'mais barato'} por litro`} (referência de mercado)
                            </span>
                          )}
                        </span>
                      );
                    })}
                  />
                ))}
                {desiredWorks.map((w, i) => (
                  <Row
                    key={w}
                    label={`${DESIRED_WORK_LABELS[w]} (pedido)`}
                    cells={sorted.map((r) => {
                      const state = coverageOf(r.id)[i]!.state;
                      if (!state) return <Missing key={r.id} />;
                      return (
                        <span key={r.id} className={state === 'nao_incluido' ? 'text-red-700' : state === 'base' ? 'text-tinta-700' : 'text-amber-700'}>
                          {WORK_STATE_LABELS[state]}
                        </span>
                      );
                    })}
                  />
                ))}
                {LINE_CATEGORIES.map((c) => (
                  <Row
                    key={c}
                    label={LINE_CATEGORY_LABELS[c]}
                    cells={sorted.map((r) => (r.categorias[c] !== null ? formatEuros(r.categorias[c]!) : <Missing key={r.id} />))}
                  />
                ))}
                <Row
                  label="Superfícies sem preço"
                  cells={sorted.map((r) =>
                    r.superficiesEmFalta.length === 0 ? (
                      'Todas cobertas'
                    ) : (
                      <span key={r.id} className="text-amber-800">
                        {missing(r)}
                      </span>
                    ),
                  )}
                />
                <Row
                  label="Preços condicionados"
                  cells={sorted.map((r) => (r.temCondicionados ? <span key={r.id} className="text-amber-800">Sim, ver detalhe</span> : 'Não'))}
                />
                <Row
                  label="Materiais comprometidos"
                  cells={sorted.map((r) =>
                    r.materiaisCertificados > 0 ? (
                      <span key={r.id} className="font-medium text-tinta-700">
                        Sim, em {r.materiaisCertificados} linha{r.materiaisCertificados > 1 ? 's' : ''}
                      </span>
                    ) : (
                      'Não'
                    ),
                  )}
                />
                <Row label="Opcionais" cells={sorted.map((r) => (r.totals.opcionais > 0 ? formatEuros(r.totals.opcionais) : '—'))} />
                <Row label="Duração" cells={sorted.map((r) => byId.get(r.id)!.duracao_dias ? `${byId.get(r.id)!.duracao_dias} dias` : <Missing key={r.id} />)} />
                <Row label="Início possível" cells={sorted.map((r) => pt(byId.get(r.id)!.inicio_possivel))} />
                <Row
                  label="Adiantamento"
                  cells={sorted.map((r) => {
                    const p = byId.get(r.id)!;
                    return p.adiantamento_bps > 0 ? `${p.adiantamento_bps / 100}% (${formatEuros(percentOf(r.totals.base, p.adiantamento_bps))})` : 'Nenhum';
                  })}
                />
                <Row label="Garantia da obra" cells={sorted.map((r) => { const g = byId.get(r.id)!.garantia_anos; return g !== null ? `${g} anos` : <Missing key={r.id} />; })} />
                <Row label="Válida até" cells={sorted.map((r) => pt(byId.get(r.id)!.validade))} />
                <Row
                  label="Documentos do pintor"
                  cells={sorted.map((r) => {
                    const p = byId.get(r.id)!;
                    return p.habilitacao_ok
                      ? 'Habilitação IMPIC para este valor e documentos validados à data da proposta'
                      : (
                        <span key={r.id} className="font-medium text-red-700">
                          Sem habilitação IMPIC validada para este valor{p.pintor_verificado ? ' (outros documentos validados)' : ''}. Se continuar, as partes assumem a responsabilidade.
                        </span>
                      );
                  })}
                />
                <Row
                  label="Versão do pedido"
                  cells={sorted.map((r) => {
                    const v = byId.get(r.id)!.request_version;
                    return v === req.version ? 'Atual' : <span key={r.id} className="text-amber-800">Versão {v} (anterior)</span>;
                  })}
                />
                <Row
                  label="Avaliações do pintor"
                  cells={sorted.map((r) => {
                    const x = ratingOf.get(r.id);
                    // CMP-10: com poucas avaliações, dizer isso, e não mostrar uma média enganadora.
                    return x && x.n >= 3 ? (
                      `${String(x.media).replace('.', ',')}/5 (${x.n} obras)`
                    ) : (
                      <span key={r.id} className="text-slate-500">
                        Histórico insuficiente{x && x.n > 0 ? ` (${x.n} obra${x.n > 1 ? 's' : ''})` : ''}
                      </span>
                    );
                  })}
                />
                <Row label="Revisões da proposta" cells={sorted.map((r) => (versionsOf(r.id) > 1 ? `${versionsOf(r.id)} versões` : 'Nenhuma'))} />
              </tbody>
            </table>
          </div>
        </section>
      )}

      {rows.map((r) => {
        const p = byId.get(r.id)!;
        const terms = toTerms(p);
        const guarantee = clientGuarantee(r.totals.base, CURRENT_RULES);
        const advance = percentOf(r.totals.base, p.adiantamento_bps);
        return (
          <section key={r.id} className={card} id={r.id}>
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="font-semibold">{r.alias}</h2>
              <span className="text-sm text-slate-600">{STATUS[p.status]}</span>
            </div>
            <div className="mt-4">
              <ProposalView lines={linesOf(p.id)} terms={terms} zoneNames={zoneNames} products={materialProducts} />
            </div>
            {manager && !chosen && p.status === 'submetida' && (
              <div className="mt-4">
                <ChooseButton
                  proposalId={p.id}
                  requestId={id}
                  summary={[
                    'É uma escolha preliminar: o pedido deixa de receber propostas e as outras ficam em espera.',
                    `Quando quiser, deposita no parceiro de pagamentos uma caução de ${formatEuros(guarantee)} (3% sem IVA), como garantia de interesse. É esse depósito que torna a escolha efetiva e avisa o pintor; é-lhe devolvida quando as duas partes assinarem.`,
                    'O pintor tem 8 dias para confirmar a escolha. Se não confirmar, escolhe outra proposta e a caução passa para ela, ou é-lhe devolvida.',
                    'Quando o pintor confirma, ficam a conhecer-se: nome, NIF, habilitação e contactos.',
                    `Assina o contrato completo com Chave Móvel Digital e depois assina o pintor.${advance > 0 ? ` O adiantamento de ${formatEuros(advance)} paga-se diretamente ao pintor depois da assinatura.` : ''}`,
                    'Antes de conhecer o pintor pode desistir sem perder nada. Depois de o conhecer, se desistir ou não assinar no prazo, perde a caução.',
                    'Num condomínio, precisa da ata de nomeação do administrador e da ata que aprova a obra.',
                  ]}
                />
              </div>
            )}
            <div className="mt-6 border-t border-slate-100 pt-4">
              <h3 className="text-sm font-semibold">Mensagens com {r.alias}</h3>
              <div className="mt-3">
                <MessageThread
                  proposalId={p.id}
                  side="cliente"
                  path={path}
                  messages={(messages ?? []).filter((m) => m.proposal_id === p.id)}
                  canWrite={manager && ['submetida', 'selecionada'].includes(p.status)}
                  otherLabel={r.alias}
                />
              </div>
            </div>
          </section>
        );
      })}

      {threadsWithoutProposal.map((pid, i) => (
        <section key={pid} className={card}>
          <h2 className="font-semibold">Pergunta de um pintor {threadsWithoutProposal.length > 1 ? i + 1 : ''} (proposta ainda por submeter)</h2>
          <div className="mt-3">
            <MessageThread
              proposalId={pid}
              side="cliente"
              path={path}
              messages={(messages ?? []).filter((m) => m.proposal_id === pid)}
              canWrite={manager && !chosen}
              otherLabel="Pintor"
            />
          </div>
        </section>
      ))}
    </div>
  );
}

function Row({ label, cells }: { label: string; cells: React.ReactNode[] }) {
  return (
    <tr>
      <th className="py-1.5 pr-3 font-normal text-slate-500">{label}</th>
      {cells.map((c, i) => (
        <td key={i} className="py-1.5 pr-3">
          {c}
        </td>
      ))}
    </tr>
  );
}

function Missing() {
  return <span className="text-slate-400">Não indicado</span>;
}
