import Link from 'next/link';
import { notFound } from 'next/navigation';
import { MessageThread } from '@/components/MessageThread';
import { ProposalView } from '@/components/ProposalView';
import { parseCapoto } from '@/lib/capoto';
import { clientGuarantee } from '@/domain/commission';
import { formatEuros, percentOf } from '@/domain/money';
import { LINE_CATEGORIES, LINE_CATEGORY_LABELS, compareProposals } from '@/domain/proposal';
import { DESIRED_WORK_LABELS, SURFACE_KIND_LABELS, formatArea, type DesiredWork } from '@/domain/request';
import { localDate } from '@/domain/deadline';
import { estadoDaEntrega } from '@/domain/entrega';
import { CURRENT_RULES } from '@/domain/rules';
import {
  ORDENS,
  ORDEM_LABELS,
  classificar,
  ordenar,
  type Classificacao,
  type Ordem,
  ESTADO_ACCAO,
  ESTADO_LABELS,
  coberturaEmPalavras,
  porEsclarecer,
  quantidadeEmPalavras,
  trabalhosDaProposta,
  type EstadoNoPedido,
  type TrabalhoNaProposta,
} from '@/domain/comparador';
import { canManage, myRole } from '@/lib/access';
import { productsFor } from '@/lib/materials';
import { toLine, toTerms } from '@/lib/proposals';
import { adherence, parsePreferences } from '@/domain/reference';
import { loadReferences, refPerLitre, usedProducts } from '@/lib/reference';
import { getUser } from '@/lib/supabase/server';
import { ChooseButton } from './ChooseButton';
import { Voltar } from '@/components/Voltar';

const card = 'rounded-2xl border border-slate-200 bg-white p-4 sm:p-5';
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
  const criterio: Ordem = (ORDENS as readonly string[]).includes(ordem ?? '') ? (ordem as Ordem) : 'padrao';
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
  // Antes do fim do prazo a lista vem vazia por regra de acesso, não por não haver propostas: o ecrã
  // tem de dizer qual das duas coisas é.
  const entrega = estadoDaEntrega(req.prazo_propostas, localDate(new Date(), CURRENT_RULES.timeZone), req.status === 'publicado');

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
  // O que cada proposta diz sobre cada trabalho pedido — com a quantidade, as demãos, o produto e o
  // preço, que já estavam guardados em cada linha e só apareciam dentro da proposta aberta.
  const trabalhosPorProposta = new Map(list.map((p) => [p.id, trabalhosDaProposta(desiredWorks, linesOf(p.id))]));
  const active = rows.filter((r) => byId.get(r.id)!.status !== 'retirada');

  // As três dimensões, uma por proposta. Nenhuma pontua: cada uma diz o que se passa, em palavras.
  const classificacaoDe = new Map(
    active.map((r) => {
      const p = byId.get(r.id)!;
      const a = prefs.length ? adherenceOf(r.id) : [];
      return [r.id, classificar({
        trabalhos: trabalhosPorProposta.get(r.id)!,
        temCondicionados: r.temCondicionados,
        zonasSemPreco: r.zonasEmFalta.length,
        precoGlobal: p.modo_preco === 'global',
        produtosPedidos: prefs.length
          ? {
              segue: a.filter((x) => x.result.kind === 'segue').length,
              substitui: a.filter((x) => x.result.kind === 'substitui').length,
              semIndicacao: a.filter((x) => x.result.kind === 'sem_indicacao').length,
            }
          : undefined,
      })];
    }),
  );

  const grupos = ordenar(
    active.map((r) => {
      const c = classificacaoDe.get(r.id)!;
      const p = byId.get(r.id)!;
      return {
        id: r.id,
        totalComIva: r.totals.totalComIva,
        completa: c.cobertura.completa,
        definido: c.definicao.definido,
        porEsclarecer: c.cobertura.porEsclarecer,
        trabalhosIncluidos: trabalhosPorProposta.get(r.id)!.filter((t) => t.estado === 'incluido').length,
        duracaoDias: p.duracao_dias,
        inicioPossivel: p.inicio_possivel,
      };
    }),
    criterio,
  );
  // A tabela detalhada segue a mesma ordem dos cartões, para que as colunas não troquem de sítio.
  const ordemDosCartoes = grupos.flatMap((g) => g.propostas.map((x) => x.id));
  const sorted = ordemDosCartoes.map((pid) => active.find((r) => r.id === pid)!);
  const chosen = list.find((p) => p.status === 'selecionada');
  const threadsWithoutProposal = [...new Set((messages ?? []).map((m) => m.proposal_id))].filter((pid) => !byId.has(pid));
  const path = `/app/pedidos/${id}/propostas`;
  const { data: engagement } = chosen
    ? await supabase.from('engagements').select('id').eq('proposal_id', chosen.id).maybeSingle()
    : { data: null };

  return (
    <div className="space-y-8">
      <div>
        <Voltar href={`/app/pedidos/${id}`}>{req.titulo}</Voltar>
        <h1 className="mt-3 text-[26px] leading-tight font-semibold">Propostas recebidas</h1>
        <p className="mt-1 text-[17px] text-slate-600">
          Os pintores aparecem como Pintor A, B, C… pela ordem de chegada. A identidade e os contactos só são revelados
          depois da escolha, quando o pintor confirmar. Área do pedido: {formatArea(areaTotal)}.
        </p>
      </div>

      {engagement && (
        <Link
          href={`/app/contratacoes/${engagement.id}`}
          className={`${card} block border-tinta-100 bg-tinta-50 font-semibold text-tinta-900 hover:bg-tinta-100`}
        >
          Proposta escolhida. Continuar para a contratação (depósito, minuta e assinatura)
        </Link>
      )}

      {sorted.length > 0 && (
        <div className="space-y-6">
          {grupos.map((g) => (
            <section key={g.titulo}>
              {/* O grupo só se anuncia quando há mais do que um: com um grupo só, o título seria
                  ruído por cima da única lista do ecrã. */}
              {grupos.length > 1 && (
                <div className="mb-3">
                  <h2 className="font-semibold">{g.titulo}</h2>
                  <p className="text-[15px] text-slate-600">{g.nota}</p>
                </div>
              )}
              {grupos.length === 1 && <p className="mb-3 text-[15px] text-slate-600">{g.nota}</p>}
              <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {g.propostas.map((o) => {
                  const r = active.find((x) => x.id === o.id)!;
                  const p = byId.get(r.id)!;
                  const rating = ratingOf.get(r.id);
                  const c = classificacaoDe.get(r.id)!;
                  return (
                    <li
                      key={r.id}
                      className={`flex flex-col rounded-2xl bg-white p-6 ${p.status === 'selecionada' ? 'border-2 border-tinta-600' : 'border border-slate-200'}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-sage text-[15px] font-bold text-tinta-600">
                          {r.alias.replace('Pintor ', '')}
                        </span>
                        <span className="flex flex-wrap justify-end gap-1">
                          {p.pintor_verificado && <span className="badge badge-green">Documentos validados</span>}
                          {r.materiaisCertificados > 0 && <span className="badge badge-green">Material comprometido</span>}
                          {p.request_version !== req.version && <span className="badge badge-amber">Versão anterior</span>}
                        </span>
                      </div>
                      <h3 className="mt-4 font-semibold">{r.alias}</h3>
                      {/* O número grande é o que sai da conta bancária: total com IVA. Era o preço
                          sem IVA, que nenhum condomínio paga (DECISOES.md, 28/10/2026). */}
                      <p className="text-[34px] font-semibold leading-tight tracking-tight">{formatEuros(r.totals.totalComIva)}</p>
                      <p className="text-[15px] text-slate-500">
                        total a pagar, com IVA · {formatEuros(r.totals.base)} sem IVA
                        {r.totals.opcionais > 0 && ` · opções à parte: ${formatEuros(r.totals.opcionais)}`}
                      </p>

                      <dl className="my-4 space-y-2 border-y border-slate-200 py-3 text-[15px]">
                        <div>
                          <dt className="text-slate-500">Cobertura do pedido</dt>
                          <dd className="text-slate-900">{c.cobertura.frase}</dd>
                        </div>
                        <div>
                          <dt className="text-slate-500">Definição do orçamento</dt>
                          <dd className="text-slate-900">{c.definicao.frase}</dd>
                        </div>
                        <div>
                          <dt className="text-slate-500">Correspondência técnica</dt>
                          <dd className="text-slate-900">{c.tecnica.frase}</dd>
                        </div>
                      </dl>

                      <div className="divide-y divide-slate-200 border-b border-slate-200 text-[15px]">
                        {[
                          ['Calendário', [p.inicio_possivel ? `desde ${pt(p.inicio_possivel)}` : null, p.duracao_dias ? `${p.duracao_dias} dias` : null].filter(Boolean).join(' · ') || 'Não indicado'],
                          ['Pagamento', p.adiantamento_bps > 0 ? `${p.adiantamento_bps / 100}% de adiantamento` : 'Sem adiantamento'],
                          ['Garantia da obra', p.garantia_anos !== null ? `${p.garantia_anos} anos` : 'Não indicada'],
                          ['Avaliações', rating && rating.n >= 3 ? `${String(rating.media).replace('.', ',')}/5` : 'Histórico insuficiente'],
                        ].map(([k, v]) => (
                          <span key={k} className="flex justify-between gap-3 py-2 text-slate-500">
                            {k}
                            <b className="text-right font-medium text-slate-900">{v}</b>
                          </span>
                        ))}
                      </div>

                      {/* Só os reparos da cobertura: os da definição já estão escritos na frase
                          dela, e juntá-los repetia "zonas sem preço" duas vezes seguidas. */}
                      {c.cobertura.reparos.length > 0 && (
                        <p className="mt-3 text-[15px] text-amber-800">{c.cobertura.reparos.join(' · ')}</p>
                      )}

                      <div className="mt-auto flex gap-2 pt-4">
                        <a href={`#${r.id}`} className="btn-secondary flex-1">
                          Ver proposta e mensagens
                        </a>
                        <Link href={`${path}/${r.id}/documento`} className="btn-secondary" target="_blank">
                          Documento
                        </Link>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      )}

      {active.length === 0 ? (
        <div className={`${card} text-[17px] text-slate-600`}>
          {entrega.entregues ? (
            <p>Ainda não há propostas submetidas.</p>
          ) : (
            <>
              <p className="font-semibold text-slate-900">As propostas abrem a {pt(entrega.abremEm)}.</p>
              <p className="mt-1">
                Chegam todas ao mesmo tempo, no fim do prazo. Até lá ninguém as vê — nem o senhor, nem os pintores uns
                dos outros —, para que quem entrega primeiro não fique com o preço à vista enquanto os outros ainda
                orçamentam.
              </p>
              <p className="mt-1">Depois de abrirem tem três dias para perguntar o que quiser, sem ninguém se identificar.</p>
            </>
          )}
        </div>
      ) : (
        <section className={card}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-semibold">Comparação detalhada</h2>
            <form className="flex items-center gap-2 text-[17px]">
              <label htmlFor="ordem">Ordenar por</label>
              <select id="ordem" name="ordem" defaultValue={criterio} className="campo w-auto">
                {ORDENS.map((k) => (
                  <option key={k} value={k}>
                    {ORDEM_LABELS[k]}
                  </option>
                ))}
              </select>
              <button type="submit" className="rounded-lg border border-slate-300 px-3 py-1 hover:bg-slate-50">
                Aplicar
              </button>
            </form>
          </div>
          <p className="mt-1 text-[15px] text-slate-500">
            A ordenação é só pelo critério escolhido; não é uma recomendação. Valores em falta aparecem como “não indicado”
            e nunca como incluídos.
          </p>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[40rem] text-left text-[17px]">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="py-2 pr-3 font-normal text-slate-500" />
                  {sorted.map((r) => (
                    <th key={r.id} className="py-2 pr-3 font-semibold">
                      {r.alias}
                      <span className="block text-[15px] font-normal text-slate-500">{STATUS[byId.get(r.id)!.status]}</span>
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
                            <span className="block text-[15px]">
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
                    cells={sorted.map((r) => <Trabalho key={r.id} t={trabalhosPorProposta.get(r.id)![i]!} />)}
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
                        <span key={r.id} className="font-medium text-amber-800">
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
              <span className="flex items-center gap-3 text-[17px] text-slate-600">
                {STATUS[p.status]}
                <Link href={`${path}/${r.id}/documento`} className="text-tinta-600 hover:underline" target="_blank">
                  Ver documento
                </Link>
              </span>
            </div>
            <div className="mt-4">
              <ProposalView
                lines={linesOf(p.id)}
                terms={terms}
                zoneNames={zoneNames}
                products={materialProducts}
                capoto={parseCapoto((p as { capoto?: unknown }).capoto)}
              />
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
              <h3 className="text-[17px] font-semibold">Mensagens com {r.alias}</h3>
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
  return <span className="text-slate-600">Não indicado</span>;
}

/**
 * O que uma proposta diz sobre um trabalho pedido: o estado, e por baixo o que a proposta
 * comprometeu — quantidade, demãos, produto e preço.
 *
 * As demãos e o produto estavam guardados em cada linha desde sempre e nunca apareciam aqui; o
 * cliente tinha de abrir cada proposta e guardar de cabeça quem dava duas demãos e com quê.
 *
 * A cor segue a regra 13 do CLAUDE.md: vermelho só para o que fechou (o pintor recusou o trabalho),
 * âmbar para o que ainda se resolve com uma pergunta.
 */
function Trabalho({ t }: { t: TrabalhoNaProposta }) {
  const detalhe = [quantidadeEmPalavras(t), t.demaos ? `${t.demaos} ${t.demaos === 1 ? 'demão' : 'demãos'}` : null, ...t.produtos]
    .filter(Boolean)
    .join(' · ');
  return (
    <span className="block">
      <span className={COR_DO_ESTADO[t.estado]}>{ESTADO_LABELS[t.estado]}</span>
      {t.precoCents > 0 && <span className="ml-2 tabular-nums text-slate-900">{formatEuros(t.precoCents)}</span>}
      {detalhe && <span className="block text-[15px] text-slate-600">{detalhe}</span>}
      {/* "Não indicado" não é exclusão: é uma pergunta por fazer (DECISOES.md, 28/10/2026). */}
      {porEsclarecer(t.estado) && <span className="block text-[15px] text-amber-800">{ESTADO_ACCAO[t.estado]}</span>}
    </span>
  );
}

const COR_DO_ESTADO: Record<EstadoNoPedido, string> = {
  incluido: 'text-tinta-700',
  opcional: 'text-slate-900',
  condicionado: 'text-amber-800',
  excluido: 'text-red-700',
  nao_indicado: 'text-slate-600',
};
