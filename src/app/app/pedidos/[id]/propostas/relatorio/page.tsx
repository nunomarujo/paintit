import { notFound } from 'next/navigation';
import { Voltar } from '@/components/Voltar';
import { MotivoDaEscolha } from './MotivoDaEscolha';
import { guardarMotivoDaEscolha } from '@/app/app/pedidos/actions';
import { BRAND } from '@/config/brand';
import { canManage, myRole } from '@/lib/access';
import { getUser } from '@/lib/supabase/server';
import { toLine } from '@/lib/proposals';
import { compareProposals } from '@/domain/proposal';
import { formatEuros } from '@/domain/money';
import { AREA_SOURCE_LABELS, DESIRED_WORK_LABELS, formatArea, type DesiredWork } from '@/domain/request';
import {
  ESTADO_LABELS,
  ORDEM_LABELS,
  classificar,
  ordenar,
  quantidadeEmPalavras,
  trabalhosDaProposta,
} from '@/domain/comparador';
import { CAUSA_LABELS, diferencaEmPalavras, reconciliar, type LadoDaReconciliacao } from '@/domain/reconciliacao';
import { diferencasRelevantes, leituraImediata, pendenciasQueImportam, sinteseDasPropostas } from '@/domain/sintese';
import { SinteseDasPropostas } from '@/components/SinteseDasPropostas';
import { MatrizDasPropostas } from '@/components/MatrizDasPropostas';
import { indicacoes as calcularIndicacoes } from '@/domain/indicacoes';
import { matrizDasPropostas } from '@/domain/matriz';
import { REGRAS_DAS_INDICACOES, VERSAO_METODOLOGIA, enderecoDaMetodologia, prioridadeEmPalavras } from '@/domain/metodologia';
import { qrCodeSvg } from '@/lib/qrcode';

const pt = (d: string | null) => (d ? d.split('-').reverse().join('/') : '—');
const dataHora = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString('pt-PT', { timeZone: 'Europe/Lisbon', day: '2-digit', month: '2-digit', year: 'numeric' }) : '—';

/**
 * Relatório das propostas, para ler no ecrã e para imprimir.
 *
 * O leitor verdadeiro não é o administrador do condomínio: é a assembleia a quem ele vai ter de
 * justificar a escolha, meses depois, perante quem perguntar porque é que não se escolheu a mais
 * barata. Daí três coisas que este documento faz e um comparador normal não faz:
 *
 *   1. **Mostra a conta inteira**, incluindo o que não fecha. Uma pontuação não se defende numa
 *      assembleia; uma conta defende-se sozinha.
 *   2. **Diz os pressupostos e as versões** que usou. Quem lê daqui a seis meses tem de poder
 *      verificar sobre que propostas é que a análise foi feita.
 *   3. **Separa a decisão da análise.** O motivo da escolha é do cliente, escrito por ele, e
 *      aparece ao lado — nunca misturado com — o que a plataforma calculou.
 */
export default async function RelatorioPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, user } = await getUser();

  const { data: req } = await supabase.from('work_requests').select('*').eq('id', id).maybeSingle();
  if (!req) notFound();
  const [{ data: org }, { data: surfaces }, { data: proposals }] = await Promise.all([
    supabase.from('organizations').select('id, nome, gerida_por').eq('id', req.org_id).single(),
    supabase.from('request_surfaces').select('id, kind, descricao, area_cm2, origem').eq('request_id', id).order('created_at'),
    supabase.from('proposals').select('*').eq('request_id', id).neq('status', 'rascunho').order('submitted_at'),
  ]);
  if (!org) notFound();
  if (!canManage(await myRole(supabase, user!.id, org))) notFound();

  const list = (proposals ?? []).filter((p) => p.status !== 'retirada');
  const ids = list.map((p) => p.id);
  const { data: lines } = ids.length
    ? await supabase.from('proposal_lines').select('*').in('proposal_id', ids).order('created_at')
    : { data: [] };
  const linesOf = (pid: string) => (lines ?? []).filter((l) => l.proposal_id === pid).map(toLine);
  // O histórico de cada pintor, para a matriz. Mostra-se; não ordena nem atribui indicação nenhuma
  // nesta versão da metodologia — o limiar que decidiria entre preço e reputação não está calibrado.
  const ratings = await Promise.all(
    ids.map(async (pid) => [pid, (await supabase.rpc('painter_rating', { p_proposal: pid })).data?.[0] ?? null] as const),
  );
  const ratingOf = new Map(ratings);
  const areaTotal = (surfaces ?? []).reduce((n, s) => n + s.area_cm2, 0);
  const rows = compareProposals(
    list.map((p) => ({
      id: p.id, lines: linesOf(p.id), ivaBps: p.iva_bps, duracaoDias: p.duracao_dias,
      inicioPossivel: p.inicio_possivel, adiantamentoBps: p.adiantamento_bps,
    })),
    { areaTotal, superficies: (surfaces ?? []).map((s) => s.kind), zonas: (surfaces ?? []).map((s) => ({ id: s.id, kind: s.kind })) },
  );
  const byId = new Map(list.map((p) => [p.id, p]));
  const rowOf = new Map(rows.map((r) => [r.id, r]));
  const trabalhos = (req.trabalhos ?? []) as DesiredWork[];
  const porProposta = new Map(rows.map((r) => [r.id, trabalhosDaProposta(trabalhos, linesOf(r.id))]));
  const classificacaoDe = new Map(
    rows.map((r) => [r.id, classificar({
      trabalhos: porProposta.get(r.id)!,
      temCondicionados: r.temCondicionados,
      zonasSemPreco: r.zonasEmFalta.length,
      precoGlobal: byId.get(r.id)!.modo_preco === 'global',
    })]),
  );

  const grupos = ordenar(
    rows.map((r) => {
      const c = classificacaoDe.get(r.id)!;
      const p = byId.get(r.id)!;
      return {
        id: r.id, totalComIva: r.totals.totalComIva, completa: c.cobertura.completa, definido: c.definicao.definido,
        porEsclarecer: c.cobertura.porEsclarecer,
        trabalhosIncluidos: porProposta.get(r.id)!.filter((t) => t.estado === 'incluido').length,
        duracaoDias: p.duracao_dias, inicioPossivel: p.inicio_possivel,
      };
    }),
    'padrao',
  );
  const ordenadas = grupos.flatMap((g) => g.propostas.map((x) => rowOf.get(x.id)!));

  const lado = (r: (typeof rows)[number]): LadoDaReconciliacao => ({
    id: r.id, alias: r.alias, base: r.totals.base, trabalhos: porProposta.get(r.id)!,
    categorias: r.categorias, precoGlobal: byId.get(r.id)!.modo_preco === 'global',
  });

  // A referência das comparações é a primeira da ordenação por omissão — a mais barata entre as que
  // incluem tudo com preço firme. Comparar todos os pares daria N×(N−1)/2 contas e nenhuma leitura;
  // comparar cada uma com a referência responde à pergunta que a assembleia faz: porque é que não
  // se escolheu aquela.
  const referencia = ordenadas[0];
  const contra = ordenadas.slice(1);

  const propostasDaSintese = ordenadas.map((r) => {
      const p = byId.get(r.id)!;
      return {
        id: r.id,
        alias: r.alias,
        totalComIva: r.totals.totalComIva,
        classificacao: classificacaoDe.get(r.id)!,
        trabalhos: porProposta.get(r.id)!,
        garantiaAnos: p.garantia_anos,
        duracaoDias: p.duracao_dias,
        inicioPossivel: p.inicio_possivel,
        adiantamentoBps: p.adiantamento_bps,
      };
  });
  const linhasDaSintese = sinteseDasPropostas(propostasDaSintese, {
      pedidos: trabalhos,
      areaPedidoCm2: areaTotal > 0 ? areaTotal : null,
      formataEuros: formatEuros,
      formataArea: formatArea,
      formataData: pt,
  });
  const leituraDaSintese = leituraImediata(propostasDaSintese, formatEuros);

  // As indicações da fase 1: factos verificáveis na própria matriz, sem valorizar materiais nem
  // tempos. O que não se pode atribuir diz porquê, em vez de ficar calado.
  const indicacoes = calcularIndicacoes(
    ordenadas.map((r) => {
      const c = classificacaoDe.get(r.id)!;
      return {
        id: r.id,
        alias: r.alias,
        totalComIva: r.totals.totalComIva,
        precoFirme: c.cobertura.semPrecoFirme === 0 && c.definicao.definido,
        emFalta: porProposta.get(r.id)!.filter((t) => t.estado === 'nao_indicado' || t.estado === 'excluido').length,
      };
    }),
    formatEuros,
  );
  const linhasDaMatriz = matrizDasPropostas(
    ordenadas.map((r) => {
      const c = classificacaoDe.get(r.id)!;
      const av = ratingOf.get(r.id);
      return {
        id: r.id,
        alias: r.alias,
        totalComIva: r.totals.totalComIva,
        emFalta: porProposta.get(r.id)!.filter((t) => t.estado === 'nao_indicado' || t.estado === 'excluido').length,
        semPrecoFirme: c.cobertura.semPrecoFirme,
        zonasSemPreco: c.definicao.reparos.includes('há zonas do pedido sem preço') ? 1 : 0,
        // `media` vem nula quando ainda não há avaliação nenhuma: isso é «sem obras avaliadas»,
        // e não uma média de zero.
        avaliacao: av && av.media !== null ? { media: av.media, n: av.n } : null,
      };
    }),
    indicacoes,
    formatEuros,
  );
  // O que sobe à primeira página: as pendências das propostas que receberam indicação. Uma pendência
  // numa proposta que ninguém está a ponderar não altera escolha nenhuma, e fica no detalhe.
  const aliasesDaSintese = ordenadas.map((r) => r.alias);
  const pendencias = pendenciasQueImportam(
    linhasDaSintese,
    aliasesDaSintese,
    indicacoes.atribuidas.map((a) => a.alias),
  );
  const diferencas = diferencasRelevantes(linhasDaSintese, aliasesDaSintese);
  const enderecoMetodologia = enderecoDaMetodologia();
  const qrMetodologia = qrCodeSvg(enderecoMetodologia, 'Código QR da metodologia usada neste relatório');

  // Coluna recente; lida à parte para o relatório não cair se a migração ainda não correu.
  const { data: motivo } = await supabase.from('work_requests').select('motivo_escolha, motivo_escolha_em').eq('id', id).maybeSingle();

  return (
    <div className="space-y-5">
      <div className="print:hidden">
        <Voltar href={`/app/pedidos/${id}/propostas`}>Propostas recebidas</Voltar>
        <p className="mt-2 text-[15px] text-slate-600">
          Para levar à assembleia: imprima esta página ou guarde-a em PDF pelo menu de impressão do navegador.
        </p>
      </div>

      <div className="proposal-doc">
        <article className="proposal-sheet doc-relatorio relative bg-white text-slate-900">
          <div className="proposal-watermark" aria-hidden="true">{BRAND.domain}</div>

          <header className="border-b-2 border-slate-900 pb-3">
            <h1 className="leading-tight font-semibold">Propostas recebidas — {req.ref}</h1>
            <p className="mt-1 text-slate-600">
              {org.nome} · {list.length} {list.length === 1 ? 'proposta' : 'propostas'} · prazo até {pt(req.prazo_propostas)} ·
              área do pedido {formatArea(areaTotal)}
            </p>
          </header>

          {list.length === 0 ? (
            <p className="mt-6">Não há propostas submetidas para este pedido.</p>
          ) : (
            <>
              <section className="mt-6">
                <h2 className="font-semibold">1. Síntese e apreciação Quem Pinta</h2>

                {indicacoes.atribuidas.length > 0 && (
                  <dl className="mt-2 space-y-1">
                    {indicacoes.atribuidas.map((a) => (
                      <div key={`${a.indicacao}-${a.propostaId}`}>
                        <dt className="inline font-semibold">
                          {REGRAS_DAS_INDICACOES.find((r) => r.id === a.indicacao)?.nome}:{' '}
                        </dt>
                        <dd className="inline">
                          {a.alias} — {a.justificacao}
                        </dd>
                      </div>
                    ))}
                  </dl>
                )}
                {indicacoes.naoAtribuidas.length > 0 && (
                  <ul className="mt-2 space-y-1 text-slate-600">
                    {indicacoes.naoAtribuidas.map((n) => (
                      <li key={n.indicacao}>
                        Sem «{REGRAS_DAS_INDICACOES.find((r) => r.id === n.indicacao)?.nome.toLocaleLowerCase('pt-PT')}»: {n.motivo}
                      </li>
                    ))}
                  </ul>
                )}

                {pendencias.length > 0 && (
                  <div className="mt-3 break-inside-avoid">
                    <h3 className="font-semibold">O que pode ainda alterar a escolha</h3>
                    <ul className="mt-1 space-y-1">
                      {pendencias.map((x) => (
                        <li key={`${x.alias}-${x.criterio}`}>
                          <span className="font-medium">{x.alias}</span> ·{' '}
                          <span className="text-amber-800">{x.criterio}:</span> {x.motivo}{' '}
                          <span className="text-slate-600">Ver 2. Comparativo detalhado.</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <MatrizDasPropostas linhas={linhasDaMatriz} variante="papel" />

                {/* O bloco que a lei pede e que uma lista de factores não cumpre: a prioridade
                    efectivamente usada, e o endereço da versão exacta que produziu estes números. */}
                <div className="mt-3 border-t border-slate-200 pt-3 break-inside-avoid">
                  <h3 className="font-semibold">Como interpretar esta comparação</h3>
                  <p className="mt-1">{prioridadeEmPalavras()}</p>
                  <ul className="mt-2 list-disc space-y-0.5 pl-5">
                    <li>
                      <strong>Cobertura:</strong> verifica se os trabalhos que pediu estão incluídos. Uma proposta a que
                      falte trabalho fica mais barata por isso, e esse trabalho terá de ser contratado à parte.
                    </li>
                    <li>
                      <strong>Preço:</strong> separa o valor já fechado do que o pintor só fecha depois de ver a obra.
                    </li>
                    <li>
                      <strong>Execução:</strong> produto e demãos declarados assinalam o que falta confirmar; não afirmam
                      adequação ao pedido.
                    </li>
                    <li>
                      <strong>Histórico:</strong> mostra-se, e não ordena nem atribui indicação nesta versão.
                    </li>
                    <li>
                      <strong>Incerteza:</strong> sem base suficiente não se atribui indicação, e diz-se porquê.
                    </li>
                  </ul>
                  <div className="mt-3 flex items-start gap-3">
                    <div className="w-16 shrink-0" dangerouslySetInnerHTML={{ __html: qrMetodologia }} />
                    <p className="doc-nota">
                      <strong>Metodologia utilizada: versão {VERSAO_METODOLOGIA}</strong> · calculado a {dataHora(new Date().toISOString())}
                      <br />
                      Critérios completos: {enderecoMetodologia}
                      <br />
                      O endereço abre a versão usada neste relatório, e não a que estiver em vigor mais tarde. A comissão da
                      plataforma, promoções e relações comerciais não entram em nenhum destes cálculos.
                    </p>
                  </div>
                </div>
              </section>

              <section className="mt-6">
                <h2 className="font-semibold">2. Comparativo detalhado</h2>
                <p className="text-slate-600">
                  O mesmo trabalho na mesma linha, para não ser preciso procurá-lo em cada proposta e compará-lo de
                  memória.
                </p>

                {diferencas.length > 0 && (
                  <div className="mt-3 break-inside-avoid">
                    <h3 className="font-semibold">2.1 Diferenças relevantes</h3>
                    <p className="text-slate-600">
                      Só o que distingue as propostas. A grelha completa vem a seguir, com os critérios em que todas
                      coincidem — é assim que se confirma que a cobertura é a mesma.
                    </p>
                    <dl className="mt-1 space-y-1">
                      {diferencas.map((d) => (
                        <div key={d.criterio}>
                          <dt className="inline font-medium">{d.criterio}: </dt>
                          <dd className="inline">{d.frase}</dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                )}
              </section>

              <div className="mt-4">
                <SinteseDasPropostas
                  linhas={linhasDaSintese}
                  aliases={ordenadas.map((r) => r.alias)}
                  leitura={leituraDaSintese}
                  referencia={referencia?.alias}
                  titulo="2.2 Comparação lado a lado"
                  variante="papel"
                />
                {grupos.length > 1 && (
                  <p className="mt-2 text-slate-600">
                    {grupos.map((g) => `${g.titulo}: ${g.propostas.map((x) => rowOf.get(x.id)!.alias).join(', ')}`).join(' · ')}.
                  </p>
                )}
              </div>

              {trabalhos.length > 0 && (
                <section className="mt-6 break-inside-avoid">
                  <h2 className="font-semibold">2.3 Trabalho a trabalho</h2>
                  <table className="mt-2 w-full text-left">
                    <thead>
                      <tr className="border-b border-slate-300">
                        <th className="py-1 pr-3 font-semibold">O que pediu</th>
                        {ordenadas.map((r) => (
                          <th key={r.id} className="py-1 pr-3 font-semibold">{r.alias}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="align-top">
                      {trabalhos.map((w, i) => (
                        <tr key={w} className="border-b border-slate-100">
                          <td className="py-1.5 pr-3 text-slate-600">{DESIRED_WORK_LABELS[w]}</td>
                          {ordenadas.map((r) => {
                            const t = porProposta.get(r.id)![i]!;
                            const detalhe = [quantidadeEmPalavras(t), t.demaos ? `${t.demaos} ${t.demaos === 1 ? 'demão' : 'demãos'}` : null, ...t.produtos].filter(Boolean).join(' · ');
                            return (
                              <td key={r.id} className="py-1.5 pr-3">
                                {ESTADO_LABELS[t.estado]}
                                {t.precoCents > 0 && <span className="block tabular-nums">{formatEuros(t.precoCents)}</span>}
                                {detalhe && <span className="block text-slate-600">{detalhe}</span>}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </section>
              )}

              <section className="mt-6">
                <h2 className="font-semibold">3. Explicação económica</h2>
                <p className="text-slate-600">
                  De onde vem cada euro de diferença, e o que os orçamentos não permitem separar.
                </p>
              </section>

              {referencia && contra.length > 0 && (
                <section className="mt-6">
                  <h2 className="font-semibold">3.1 Diferenças para {referencia.alias}</h2>
                  <p className="text-slate-600">
                    Referência fixa deste relatório: <strong>{referencia.alias}</strong> — a primeira da ordenação por
                    omissão (&laquo;{ORDEM_LABELS.padrao}&raquo;), que é a usada em todas as contas abaixo e não muda com a
                    ordem em que as propostas sejam vistas no ecrã. Cada euro de diferença é atribuído a uma causa; o que
                    não se consegue atribuir é dito como tal.
                  </p>
                  {contra.map((r) => {
                    const rec = reconciliar(lado(referencia), lado(r));
                    const d = diferencaEmPalavras(referencia.alias, r.alias, rec, formatEuros);
                    const comEuros = (prov: 'declarado' | 'calculado') =>
                      rec.parcelas.filter((x) => x.proveniencia === prov && x.valorCents !== null && x.valorCents !== 0);
                    const grupos = (['declarado', 'calculado'] as const)
                      .map((id) => ({ bloco: d.blocos.find((x) => x.id === id), parcelas: comEuros(id) }))
                      .filter((g) => g.bloco && g.parcelas.length > 0);
                    const naoDecomposto = d.blocos.find((x) => x.id === 'nao_decomposto');
                    const descrito = d.blocos.find((x) => x.id === 'descrito');
                    return (
                      <div key={r.id} className="mt-3 break-inside-avoid">
                        <h3 className="font-semibold">{r.alias}</h3>
                        <p>{d.abertura}</p>
                        {rec.indecomponivel ? (
                          <p className="text-slate-600">{naoDecomposto?.linhas[0]}</p>
                        ) : (
                          <table className="mt-1 w-full text-left">
                            {grupos.map(({ bloco, parcelas }) => (
                              <tbody key={bloco!.id}>
                                <tr>
                                  <th colSpan={2} scope="colgroup" className="pt-2 text-left align-bottom">
                                    <span className="block font-semibold">{bloco!.titulo}</span>
                                    {bloco!.nota && <span className="block font-normal text-slate-600">{bloco!.nota}</span>}
                                  </th>
                                </tr>
                                {parcelas.map((x, i) => (
                                  <tr key={`${x.causa}-${i}`} className="border-b border-slate-100">
                                    <td className="py-1 pr-3">
                                      <span className="font-medium">{CAUSA_LABELS[x.causa]}</span> · {x.descricao}
                                    </td>
                                    <td className="py-1 text-right tabular-nums whitespace-nowrap">
                                      {x.valorCents! > 0 ? '+' : '−'}{formatEuros(Math.abs(x.valorCents!))}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            ))}
                            {naoDecomposto && rec.naoDecompostaCents !== 0 && (
                              <tbody>
                                <tr>
                                  <th colSpan={2} scope="colgroup" className="pt-2 text-left align-bottom">
                                    <span className="block font-semibold">{naoDecomposto.titulo}</span>
                                    {naoDecomposto.nota && <span className="block font-normal text-slate-600">{naoDecomposto.nota}</span>}
                                  </th>
                                </tr>
                                <tr className="border-b border-slate-100">
                                  <td className="py-1 pr-3 font-medium">{CAUSA_LABELS.nao_decomposta}</td>
                                  <td className="py-1 text-right tabular-nums whitespace-nowrap">
                                    {rec.naoDecompostaCents > 0 ? '+' : '−'}{formatEuros(Math.abs(rec.naoDecompostaCents))}
                                  </td>
                                </tr>
                              </tbody>
                            )}
                            <tfoot>
                              <tr className="border-t-2 border-slate-900">
                                <td className="py-1 pr-3 font-semibold">Diferença</td>
                                <td className="py-1 text-right font-semibold tabular-nums whitespace-nowrap">
                                  {rec.diferencaCents > 0 ? '+' : '−'}{formatEuros(Math.abs(rec.diferencaCents))}
                                </td>
                              </tr>
                            </tfoot>
                          </table>
                        )}
                        {descrito && (
                          <p className="mt-1 text-slate-600">
                            {descrito.titulo}: {descrito.linhas.join(' ')} {descrito.nota}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </section>
              )}

              <section className="mt-6 break-inside-avoid">
                <h2 className="font-semibold">3.2 Pressupostos, fontes e versões</h2>
                <ul className="mt-2 list-disc space-y-1 pl-5">
                  <li>
                    Pedido {req.ref}, versão {req.version}. As propostas abaixo responderam à versão indicada; uma versão
                    anterior significa que o pedido mudou depois de ela ser submetida.
                  </li>
                  {ordenadas.map((r) => {
                    const p = byId.get(r.id)!;
                    return (
                      <li key={r.id}>
                        {r.alias}: versão {p.version} da proposta, submetida a {dataHora(p.submitted_at)}, à versão {p.request_version ?? '—'} do pedido.
                        {p.modo_preco === 'global' && ' Preço global: não reparte por trabalho, e por isso não entra na decomposição.'}
                      </li>
                    );
                  })}
                  <li>
                    Áreas usadas: as do pedido ({formatArea(areaTotal)} no total), com a origem declarada em cada zona —{' '}
                    {[...new Set((surfaces ?? []).map((s) => AREA_SOURCE_LABELS[s.origem]))].join(', ').toLocaleLowerCase('pt-PT') || 'não declarada'}.
                    Uma estimativa não tem o mesmo valor de uma medição confirmada.
                  </li>
                  <li>
                    Origem de cada valor: as contas da secção 2 separam o que está <strong>escrito nas propostas</strong> do
                    que é <strong>efeito calculado</strong> pela plataforma, e a convenção de cada cálculo vai escrita junto
                    dos números, não aqui.
                  </li>
                  <li>
                    Ordenação deste documento: &laquo;{ORDEM_LABELS.padrao}&raquo;, fixada na impressão para que duas cópias
                    saiam iguais. Comissões da plataforma, promoções e relações comerciais não a alteram.
                  </li>
                  <li>As empresas aparecem como {ordenadas.map((r) => r.alias).join(', ')}; a identidade é revelada depois da escolha.</li>
                </ul>
              </section>

              <section className="mt-6 break-inside-avoid border-t border-slate-300 pt-3">
                <h2 className="font-semibold">4. A decisão</h2>
                {motivo?.motivo_escolha ? (
                  <>
                    <p className="whitespace-pre-line">{motivo.motivo_escolha}</p>
                    <p className="mt-1 text-slate-600">
                      Escrito por {org.nome}{motivo.motivo_escolha_em ? `, a ${dataHora(motivo.motivo_escolha_em)}` : ''}. Este
                      texto é do cliente; tudo o que está acima é cálculo da plataforma sobre as propostas recebidas.
                    </p>
                  </>
                ) : (
                  <p className="text-slate-600">
                    Por escrever. Este espaço é para o motivo da escolha, nas palavras de quem decide — fica separado da
                    análise, para quem ler saber o que é cálculo e o que é decisão.
                  </p>
                )}
                <MotivoDaEscolha action={guardarMotivoDaEscolha.bind(null, id)} inicial={motivo?.motivo_escolha ?? null} />
              </section>
            </>
          )}
        </article>
      </div>
    </div>
  );
}
