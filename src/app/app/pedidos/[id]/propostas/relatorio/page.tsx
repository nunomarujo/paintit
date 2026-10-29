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
import { quadroEconomico, type LadoDaReconciliacao } from '@/domain/reconciliacao';
import { alternativaProxima, leituraImediata, pendenciasQueImportam, sinteseDasPropostas } from '@/domain/sintese';
import { SinteseDasPropostas } from '@/components/SinteseDasPropostas';
import { MatrizDasPropostas } from '@/components/MatrizDasPropostas';
import { indicacoes as calcularIndicacoes } from '@/domain/indicacoes';
import { matrizDasPropostas } from '@/domain/matriz';
import { REGRAS_DAS_INDICACOES, VERSAO_METODOLOGIA, enderecoDaMetodologia, prioridadeEmPalavras } from '@/domain/metodologia';
import { qrCodeSvg } from '@/lib/qrcode';

const pt = (d: string | null) => (d ? d.split('-').reverse().join('/') : '—');
/** Um valor com o seu sinal, e um travessão quando é zero: «+0,00 €» não é informação. */
const comSinal = (c: number) => (c === 0 ? '—' : `${c > 0 ? '+' : '−'}${formatEuros(Math.abs(c))}`);
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
/**
 * O título da janela é o que o Chrome escreve no cabeçalho da impressão, e ao lado dele escreve
 * «X/Y». Um rodapé «página X de Y» em CSS não existe no caminho que o cliente usa — o navegador não
 * expõe contador de páginas a uma folha que parte —, e portanto a referência e a versão da
 * metodologia vão por aqui, onde o navegador já as imprime em todas as páginas.
 */
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase } = await getUser();
  const { data } = await supabase.from('work_requests').select('ref').eq('id', id).maybeSingle();
  return { title: `Propostas recebidas — ${data?.ref ?? ''} · metodologia ${VERSAO_METODOLOGIA}` };
}

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
        naoIndicados: porProposta.get(r.id)!.filter((t) => t.estado === 'nao_indicado').length,
        excluidos: porProposta.get(r.id)!.filter((t) => t.estado === 'excluido').length,
      };
    }),
    formatEuros,
    trabalhos.length,
  );
  const linhasDaMatriz = matrizDasPropostas(
    ordenadas.map((r) => {
      const c = classificacaoDe.get(r.id)!;
      const av = ratingOf.get(r.id);
      return {
        id: r.id,
        alias: r.alias,
        totalComIva: r.totals.totalComIva,
        naoIndicados: porProposta.get(r.id)!.filter((t) => t.estado === 'nao_indicado').length,
        excluidos: porProposta.get(r.id)!.filter((t) => t.estado === 'excluido').length,
        trabalhosPedidos: trabalhos.length,
        semPrecoFirme: c.cobertura.semPrecoFirme,
        zonasSemPreco: c.definicao.reparos.includes('há zonas do pedido sem preço') ? 1 : 0,
        // `media` vem nula quando ainda não há avaliação nenhuma: isso é «sem obras avaliadas»,
        // e não uma média de zero.
        avaliacao: av && av.media !== null ? { media: av.media, n: av.n } : null,
      };
    }),
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
  // A alternativa mais próxima em preço da proposta indicada, e o que traz de diferente. Sem isto, a
  // primeira página destacava a mais barata e escondia que a seguinte, por 2%, trazia mais.
  const indicadaCompleta = indicacoes.atribuidas.find((a) => a.indicacao === 'menor_preco_completo');
  const alternativa = indicadaCompleta
    ? alternativaProxima(
        linhasDaSintese,
        aliasesDaSintese,
        indicadaCompleta.alias,
        formatEuros,
        new Map(ordenadas.map((r) => [r.alias, r.totals.totalComIva])),
      )
    : null;
  // O quadro económico: uma linha por proposta comparada com a referência, em vez de um bloco por
  // par. A decomposição par a par produzia nove secções todas numeradas «3.1».
  const economico = referencia ? quadroEconomico(lado(referencia), contra.map(lado), formatEuros) : [];
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

          {/*
            Cabeçalho baixo, e a única banda com fundo de cor do documento (CLAUDE.md, regra 13). À
            esquerda o que se lê de longe; à direita, em pequeno, o que se confere: referência, data
            e quantas propostas. A marca fica discreta — quem recebe este papel sabe de onde vem.
          */}
          <header className="doc-faixa flex items-start justify-between gap-8">
            <div>
              <p className="doc-rotulo text-tinta-700">{BRAND.name}</p>
              <h1 className="mt-1 font-semibold">Propostas recebidas</h1>
              <p className="mt-1">{org.nome}</p>
            </div>
            <dl className="shrink-0 text-right text-[8.5pt] leading-snug text-tinta-800">
              <dt className="sr-only">Referência do pedido</dt>
              <dd className="font-semibold tabular-nums">{req.ref}</dd>
              <dt className="sr-only">Propostas recebidas</dt>
              <dd>{list.length} {list.length === 1 ? 'proposta' : 'propostas'}</dd>
              <dt className="sr-only">Prazo para propostas</dt>
              <dd>Prazo até {pt(req.prazo_propostas)}</dd>
              <dt className="sr-only">Área do pedido</dt>
              <dd>{formatArea(areaTotal)}</dd>
              <dt className="sr-only">Emitido a</dt>
              <dd>{dataHora(new Date().toISOString())}</dd>
            </dl>
          </header>

          {list.length === 0 ? (
            <p className="mt-6">Não há propostas submetidas para este pedido.</p>
          ) : (
            <>
              {/*
                A primeira página é um documento de decisão: quatro áreas e nada mais — o cabeçalho,
                duas conclusões, a matriz de todas as propostas e uma observação. Tudo o que explica
                como se chegou aqui passou para 1.1, numa folha nova: posto a seguir à matriz,
                empurrava-a para fora da página, que é exactamente o defeito que o promotor apontou.
              */}
              <section className="mt-6">
                <p className="doc-rotulo">1 · Síntese e apreciação {BRAND.name}</p>

                {/*
                  Dois blocos, sempre os dois, com um rótulo pequeno e um valor grande. Sem fundo de
                  aviso, sem medalha e sem anúncio a um vencedor: apresentam um facto lido das
                  propostas. Quando não há indicação, o bloco fica e diz porquê — é informação, e o
                  silêncio lia-se como desinteresse.
                */}
                <div className="mt-3 grid grid-cols-2 gap-x-8">
                  {REGRAS_DAS_INDICACOES.map((regra) => {
                    const atribuida = indicacoes.atribuidas.find((x) => x.indicacao === regra.id);
                    const sem = indicacoes.naoAtribuidas.find((x) => x.indicacao === regra.id);
                    return (
                      <div key={regra.id} className="doc-conclusao break-inside-avoid">
                        <p className="doc-rotulo">{regra.rotulo}</p>
                        {atribuida ? (
                          <>
                            <p className="doc-destaque mt-1">{atribuida.valor}</p>
                            <p className="mt-1">
                              <strong>{atribuida.alias}</strong> — {atribuida.nota}
                            </p>
                          </>
                        ) : (
                          <p className="mt-1 text-slate-600">Não se atribui: {sem?.motivo}</p>
                        )}
                      </div>
                    );
                  })}
                </div>
                <p className="doc-rodape mt-2">
                  São factos lidos das propostas, e não uma escolha da plataforma. O que cada indicação não quer
                  dizer, e a metodologia que a produziu, estão em 1.1.
                </p>

                <MatrizDasPropostas linhas={linhasDaMatriz} variante="papel" />

                {/* Uma observação editorial, e uma só: a seguinte em preço, e o que traz de diferente. */}
                {alternativa && indicadaCompleta && (
                  <div className="doc-tema break-inside-avoid">
                    <p className="doc-rotulo">Uma alternativa próxima</p>
                    <p className="mt-1">
                      Por mais {formatEuros(alternativa.diferencaCents)} (
                      {alternativa.percentagem.toLocaleString('pt-PT', { maximumFractionDigits: 1 })}%) do que{' '}
                      {indicadaCompleta.alias}, <strong>{alternativa.alias}</strong>{' '}
                      {alternativa.pontos.length > 0
                        ? `apresenta ${alternativa.pontos.join('; ')}.`
                        : 'apresenta as mesmas condições declaradas.'}{' '}
                      Isto não demonstra que seja a melhor escolha: confirme a adequação dos sistemas propostos.
                    </p>
                  </div>
                )}

                <p className="doc-rodape mt-4">Diferenças e pontos a confirmar nas páginas seguintes.</p>
              </section>

              {/* O bloco que a lei pede e que uma lista de factores não cumpre: a prioridade
                  efectivamente usada, o que cada indicação não diz, e o endereço da versão exacta
                  que produziu estes números. */}
              <section className="doc-quebra mt-6">
                <h2 className="font-semibold">1.1 Como se comparou</h2>
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

                <h3 className="mt-4 font-semibold">O que as duas indicações da primeira página não dizem</h3>
                <dl className="mt-1 space-y-1">
                  {REGRAS_DAS_INDICACOES.map((regra) => (
                    <div key={regra.id} className="break-inside-avoid">
                      <dt className="inline font-medium">{regra.nome}: </dt>
                      <dd className="inline text-slate-600">{regra.limite}</dd>
                    </div>
                  ))}
                </dl>

                <div className="doc-tema flex items-start gap-3 break-inside-avoid">
                  <div className="w-16 shrink-0" dangerouslySetInnerHTML={{ __html: qrMetodologia }} />
                  <p className="doc-nota">
                    <strong>Metodologia utilizada: versão {VERSAO_METODOLOGIA}</strong> · calculado a {dataHora(new Date().toISOString())}
                    <br />
                    Critérios completos: {enderecoMetodologia}
                    <br />
                    O endereço abre a versão usada neste relatório, e não a que estiver em vigor mais tarde. A comissão e as
                    restantes condições comerciais com a plataforma {BRAND.domain} não são usadas como critérios de
                    ordenação ou recomendação. O preço apresentado pelo pintor é considerado na comparação.
                  </p>
                </div>
              </section>

              {/* As pendências como lista de acção: de quem é, o que falta, e o que fazer antes de decidir. */}
              {pendencias.length > 0 && (
                <section className="mt-6">
                  <h2 className="font-semibold">1.2 O que pode ainda alterar a escolha</h2>
                  <table className="mt-2 w-full border-collapse text-left">
                    <thead>
                      <tr className="border-b border-slate-300">
                        <th scope="col" className="w-[18%] py-2 pr-3 align-bottom font-semibold">Proposta</th>
                        <th scope="col" className="w-[22%] py-2 pr-3 align-bottom font-semibold">O que falta confirmar</th>
                        <th scope="col" className="py-2 align-bottom font-semibold">O que fazer antes de decidir</th>
                      </tr>
                    </thead>
                    <tbody className="align-top">
                      {pendencias.map((x, i) => {
                        // O alias escreve-se uma vez por proposta: com seis pendências da mesma, seis
                        // repetições do nome eram a coluna inteira a dizer o mesmo. Fica no `th` para
                        // quem ouve a tabela, e desaparece do papel.
                        const repetido = i > 0 && pendencias[i - 1]!.alias === x.alias;
                        return (
                        <tr key={`${x.alias}-${x.criterio}`} className="border-b border-slate-100">
                          <th scope="row" className="py-1.5 pr-3 text-left font-medium">
                            <span className={repetido ? 'sr-only' : undefined}>{x.alias}</span>
                          </th>
                          <td className="py-1.5 pr-3 text-amber-800">{x.criterio}</td>
                          <td className="py-1.5">{x.motivo}</td>
                        </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  {/* A remissão dizia-se em cada linha, e com seis pendências aparecia seis vezes. */}
                  <p className="mt-1 text-slate-600">Todos estes pontos estão desenvolvidos em 2. Comparativo detalhado.</p>
                </section>
              )}

              {/* Páginas de consulta: uma folha por grupo de três, com as suas diferenças ao pé. */}
              <section className="doc-quebra mt-6">
                <h2 className="font-semibold">2. Comparativo detalhado</h2>
                <p className="text-slate-600">
                  O mesmo trabalho na mesma linha, para não ser preciso procurá-lo em cada proposta e compará-lo de
                  memória.
                </p>

                <SinteseDasPropostas
                  linhas={linhasDaSintese}
                  aliases={ordenadas.map((r) => r.alias)}
                  leitura={leituraDaSintese}
                  referencia={referencia?.alias}
                  titulo="2.1 Comparação lado a lado"
                  jaExplicadas={pendencias.map((x) => x.alias)}
                  remissao="1.2 O que pode ainda alterar a escolha"
                  variante="papel"
                />
                {grupos.length > 1 && (
                  <p className="mt-2 text-slate-600">
                    {grupos.map((g) => `${g.titulo}: ${g.propostas.map((x) => rowOf.get(x.id)!.alias).join(', ')}`).join(' · ')}.
                  </p>
                )}
              </section>

              {trabalhos.length > 0 && (
                <section className="mt-6 break-inside-avoid">
                  <h2 className="font-semibold">2.2 Trabalho a trabalho</h2>
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
                    Referência fixa deste relatório: <strong>{referencia.alias}</strong> — a proposta de menor total entre
                    as que cobrem o pedido e não declaram custos por fechar, que é a primeira da ordenação por omissão
                    (&laquo;{ORDEM_LABELS.padrao}&raquo;). Compara-se cada proposta com ela, e não todas entre si: assim são{' '}
                    {contra.length} comparações que respondem à pergunta da assembleia — porque é que não se escolheu
                    aquela —, e não as {(ordenadas.length * (ordenadas.length - 1)) / 2} que ninguém lê. As contas são
                    sobre a base sem IVA, e a referência não muda com a ordem em que as propostas sejam vistas no ecrã.
                  </p>

                  <table className="mt-3 w-full border-collapse text-left">
                    <thead>
                      <tr className="border-b border-slate-300">
                        <th scope="col" className="py-2 pr-3 align-bottom font-semibold">Proposta</th>
                        <th scope="col" className="py-2 pr-3 text-right align-bottom font-semibold">
                          Diferença para {referencia.alias}
                        </th>
                        <th scope="col" className="py-2 pr-3 text-right align-bottom font-semibold">Parcela identificada</th>
                        <th scope="col" className="py-2 text-right align-bottom font-semibold">Por decompor</th>
                      </tr>
                    </thead>
                    <tbody>
                      {economico.map((l) => (
                        <tr key={l.alias} className="border-b border-slate-100">
                          <th scope="row" className="py-1.5 pr-3 text-left font-medium">{l.alias}</th>
                          <td className="py-1.5 pr-3 text-right font-semibold tabular-nums whitespace-nowrap">
                            {comSinal(l.diferencaCents)}
                          </td>
                          <td className="py-1.5 pr-3 text-right tabular-nums whitespace-nowrap">
                            {l.identificadaCents === null ? '—' : comSinal(l.identificadaCents)}
                          </td>
                          <td className="py-1.5 text-right tabular-nums whitespace-nowrap">{comSinal(l.porDecomporCents)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {/* A nota de método, uma vez. Repetida em cada par, ocupava uma página inteira a
                      dizer nove vezes a mesma coisa. */}
                  <p className="doc-nota mt-2 text-slate-600">
                    <strong>Parcela identificada</strong> é a parte da diferença cuja causa se consegue atribuir — âmbito,
                    quantidade, execução, condições ou preço unitário — a partir do que as propostas declaram.{' '}
                    <strong>Por decompor</strong> é o resto: pode ser produtividade, equipamento, transporte, estrutura de
                    custos ou risco assumido, e dizer qual exigiria saber o custo de cada empresa, que não se conhece. Uma
                    proposta a preço global não reparte por trabalho, e nesse caso só o total se compara.
                  </p>

                  {/*
                    Só as propostas com parcela identificada. Para as outras, a coluna já diz «—» e a
                    nota de método diz porquê; as diferenças técnicas sem euros estão na grelha de
                    2.1, e repeti-las aqui era contá-las uma terceira vez — sete linhas a dizer, com
                    palavras diferentes, «uma demão contra duas».
                  */}
                  {economico.some((l) => l.detalhe.length > 0) && (
                    <div className="doc-tema">
                      <h3 className="font-semibold">Onde está cada diferença identificada</h3>
                      <dl className="mt-1 space-y-1">
                        {economico
                          .filter((l) => l.detalhe.length > 0)
                          .map((l) => (
                            <div key={l.alias} className="break-inside-avoid">
                              <dt className="inline font-medium">{l.alias}: </dt>
                              <dd className="inline">
                                {l.detalhe.join('; ')}
                                {l.detalhe.length > 0 && l.notasTecnicas.length > 0 ? '. ' : ''}
                                {l.notasTecnicas.length > 0 && (
                                  <span className="text-slate-600">
                                    Sem valor separado: {l.notasTecnicas.join('; ')}.
                                  </span>
                                )}
                              </dd>
                            </div>
                          ))}
                      </dl>
                      {economico.some((l) => l.detalhe.length === 0) && (
                        <p className="mt-1 text-slate-600">
                          Nas restantes, nenhuma parcela da diferença tem causa atribuível com o que as propostas
                          declaram. O que as distingue tecnicamente está em 2.1.
                        </p>
                      )}
                    </div>
                  )}
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
