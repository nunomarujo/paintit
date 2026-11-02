import { formatEuros } from '@/domain/money';
import { ESTADO_LABELS, quantidadeEmPalavras, type TrabalhoNaProposta } from '@/domain/comparador';
import { codigoCompleto, type DocumentoDoPintor, type FichaCongelada, type LinhaResumoCongelada } from '@/domain/relatorioCongelado';

/**
 * A fotografia congelada do relatório de propostas (secção 8 de "Quem Pinta — a oferta"),
 * partilhada entre a página interna (gestor, com sessão) e a página pública (QR/link, sem sessão).
 * As duas mostram exactamente o mesmo — nunca a identidade do pintor, só o número de 1 a N.
 */

const pt = (d: string | null) => (d ? d.split('-').reverse().join('/') : '—');
const dataHora = (iso: string) =>
  new Date(iso).toLocaleDateString('pt-PT', { timeZone: 'Europe/Lisbon', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

export interface RelatorioCongeladoViewProps {
  titulo: string;
  ref: string;
  codigoObra: string;
  numeroDePropostas: number;
  avisoDeIntegridade: string;
  geradoEm: string;
  linhas: LinhaResumoCongelada[];
  fichas: FichaCongelada[];
  /** SVG do QR, já construído do lado do servidor (`qrCodeSvg`) — igual em todas as páginas. */
  qrSvg: string;
  link: string;
}

export function RelatorioCongeladoView({
  titulo,
  ref,
  codigoObra,
  numeroDePropostas,
  avisoDeIntegridade,
  geradoEm,
  linhas,
  fichas,
  qrSvg,
  link,
}: RelatorioCongeladoViewProps) {
  return (
    <div className="proposal-doc">
      {/* Página 1: a tabela-resumo. */}
      <article className="proposal-sheet doc-relatorio relative bg-white text-slate-900">
        <div className="proposal-watermark" aria-hidden="true">Quem Pinta</div>
        <Cabecalho titulo={titulo} ref={ref} pagina={`Resumo · ${numeroDePropostas} propostas`} codigoCompletoDaPagina={null} />
        <AvisoDeIntegridade texto={avisoDeIntegridade} />

        <section className="mt-6">
          <p className="doc-rotulo">Tabela-resumo</p>
          <p className="mt-1 text-slate-600">
            Uma linha por proposta, numerada ao acaso nesta geração — não pela ordem em que chegaram, nem pela ordem em
            que o gestor as analisou. A identidade de cada empresa só se conhece depois da escolha.
          </p>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[40rem] border-collapse text-left">
              <thead>
                <tr className="border-b border-slate-300">
                  {['Proposta', 'Preço', 'Anos de experiência', 'Garantia legal', 'Reputação interna', 'Prazo de execução', 'Material principal sugerido', 'Preço de referência'].map(
                    (h) => (
                      <th key={h} scope="col" className="py-2 pr-3 align-bottom font-semibold">
                        {h}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody className="align-top">
                {linhas.map((l) => (
                  <tr key={l.numero} className="border-b border-slate-100">
                    <th scope="row" className="py-1.5 pr-3 text-left font-semibold">
                      Proposta {l.numero}
                    </th>
                    <td className="py-1.5 pr-3 font-semibold tabular-nums whitespace-nowrap">{formatEuros(l.precoComIvaCents)}</td>
                    <td className="py-1.5 pr-3">{l.anosExperiencia !== null ? `${l.anosExperiencia} anos` : 'Não disponível'}</td>
                    <td className="py-1.5 pr-3">{l.garantiaAnos !== null ? `${l.garantiaAnos} anos` : 'Não indicada'}</td>
                    <td className="py-1.5 pr-3">
                      {l.reputacao && l.reputacao.media !== null && l.reputacao.n >= 3
                        ? `${String(l.reputacao.media).replace('.', ',')}/5 (${l.reputacao.n} obras)`
                        : 'Histórico insuficiente'}
                    </td>
                    <td className="py-1.5 pr-3">{l.prazoExecucaoDias !== null ? `${l.prazoExecucaoDias} dias` : 'Não indicado'}</td>
                    <td className="py-1.5 pr-3">{l.materialPrincipal ?? 'Não identificado'}</td>
                    <td className="py-1.5 pr-3 whitespace-nowrap">{l.precoReferenciaCents !== null ? formatEuros(l.precoReferenciaCents) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="doc-rodape mt-2">
            «Anos de experiência» ainda não é um dado recolhido pela plataforma: aparece em todas as propostas até essa
            decisão ser tomada. «Preço de referência» é o preço do catálogo mais próximo do material principal
            sugerido; sem correspondência clara, mostra-se «—», nunca um valor adivinhado.
          </p>
        </section>

        <RodapeDeVerificacao qrSvg={qrSvg} link={link} geradoEm={geradoEm} />
      </article>

      {/* Uma página por proposta: a ficha independente. */}
      {fichas.map((f) => (
        <article key={f.numero} className="proposal-sheet doc-relatorio relative bg-white text-slate-900">
          <div className="proposal-watermark" aria-hidden="true">Quem Pinta</div>
          <Cabecalho titulo={titulo} ref={ref} pagina={`Proposta ${f.numero} de ${numeroDePropostas}`} codigoCompletoDaPagina={codigoCompleto(codigoObra, f.codigoPagina)} />
          <AvisoDeIntegridade texto={avisoDeIntegridade} />

          <section className="mt-6">
            <p className="doc-destaque">Proposta {f.numero} de {numeroDePropostas}</p>
            <p className="text-slate-600">
              A identidade da empresa não aparece neste documento — só depois da escolha, quando o pintor confirmar.
            </p>

            <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 border-y border-slate-200 py-3 text-[15px]">
              <Campo rotulo="Preço total, com IVA" valor={formatEuros(f.precoComIvaCents)} />
              <Campo rotulo="Prazo de execução" valor={f.prazoExecucaoDias !== null ? `${f.prazoExecucaoDias} dias` : 'Não indicado'} />
              <Campo rotulo="Garantia legal" valor={f.garantiaAnos !== null ? `${f.garantiaAnos} anos` : 'Não indicada'} />
              <Campo
                rotulo="Reputação interna"
                valor={f.reputacao && f.reputacao.media !== null && f.reputacao.n >= 3 ? `${String(f.reputacao.media).replace('.', ',')}/5 (${f.reputacao.n} obras)` : 'Histórico insuficiente'}
              />
              <Campo rotulo="Anos de experiência" valor={f.anosExperiencia !== null ? `${f.anosExperiencia} anos` : 'Não disponível'} />
              <Campo rotulo="Material principal sugerido" valor={f.materialPrincipal ?? 'Não identificado'} />
              <Campo rotulo="Preço de referência" valor={f.precoReferenciaCents !== null ? formatEuros(f.precoReferenciaCents) : '—'} />
              <Campo rotulo="Proposta válida até" valor={pt(f.validaAte)} />
            </dl>

            <h3 className="mt-4 font-semibold">Habilitação e situação regularizada</h3>
            <dl className="mt-1 space-y-1">
              <LinhaDeDocumento rotulo="Habilitação (alvará ou certificado IMPIC) para este valor" doc={f.alvara} />
              <LinhaDeDocumento rotulo="Declaração de não dívida — Autoridade Tributária" doc={f.naoDividaAt} />
              <LinhaDeDocumento rotulo="Declaração de não dívida — Segurança Social" doc={f.naoDividaSs} />
            </dl>

            {f.trabalhos.length > 0 && (
              <>
                <h3 className="mt-4 font-semibold">Trabalhos discriminados</h3>
                <table className="mt-2 w-full text-left">
                  <thead>
                    <tr className="border-b border-slate-300">
                      <th className="py-1 pr-3 font-semibold">Trabalho</th>
                      <th className="py-1 pr-3 font-semibold">Estado</th>
                      <th className="py-1 font-semibold">Quantidade, demãos e produto</th>
                    </tr>
                  </thead>
                  <tbody className="align-top">
                    {f.trabalhos.map((t: TrabalhoNaProposta) => {
                      const detalhe = [quantidadeEmPalavras(t), t.demaos ? `${t.demaos} ${t.demaos === 1 ? 'demão' : 'demãos'}` : null, ...t.produtos]
                        .filter(Boolean)
                        .join(' · ');
                      return (
                        <tr key={t.work} className="border-b border-slate-100">
                          <td className="py-1.5 pr-3">{t.label}</td>
                          <td className="py-1.5 pr-3">
                            {ESTADO_LABELS[t.estado]}
                            {t.precoCents > 0 && <span className="block tabular-nums">{formatEuros(t.precoCents)}</span>}
                          </td>
                          <td className="py-1.5 text-slate-600">{detalhe || '—'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </>
            )}
          </section>

          <RodapeDeVerificacao qrSvg={qrSvg} link={link} geradoEm={geradoEm} />
        </article>
      ))}
    </div>
  );
}

function Cabecalho({ titulo, ref, pagina, codigoCompletoDaPagina }: { titulo: string; ref: string; pagina: string; codigoCompletoDaPagina: string | null }) {
  return (
    <header className="doc-faixa flex items-start justify-between gap-8">
      <div>
        <h1 className="font-semibold">Relatório de propostas — fotografia para a assembleia</h1>
        <p className="mt-1">{titulo}</p>
      </div>
      <div className="shrink-0 text-right text-[8.5pt] leading-snug text-tinta-800">
        <p className="font-semibold tabular-nums">{ref}</p>
        <p>{pagina}</p>
        {codigoCompletoDaPagina && <p className="font-semibold tabular-nums">Código {codigoCompletoDaPagina}</p>}
      </div>
    </header>
  );
}

function AvisoDeIntegridade({ texto }: { texto: string }) {
  return (
    <div className="doc-tema break-inside-avoid">
      <p className="doc-rotulo">Aviso de integridade</p>
      <p className="mt-1">{texto}</p>
    </div>
  );
}

function RodapeDeVerificacao({ qrSvg, link, geradoEm }: { qrSvg: string; link: string; geradoEm: string }) {
  return (
    <div className="doc-tema mt-6 flex items-start gap-3 break-inside-avoid">
      <div className="w-16 shrink-0" dangerouslySetInnerHTML={{ __html: qrSvg }} />
      <p className="doc-nota">
        <strong>Verificação:</strong> o código QR abre a mesma fotografia, sem conta nenhuma. O código impresso só
        confirma a olho, sem telemóvel, que duas páginas pertencem ao mesmo relatório — quem o quiser confirmar de
        facto usa o QR, nunca o código por si só.
        <br />
        {link}
        <br />
        Gerado a {dataHora(geradoEm)}. Esta fotografia não se recalcula depois de gerada.
      </p>
    </div>
  );
}

function Campo({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div>
      <dt className="text-slate-500">{rotulo}</dt>
      <dd className="font-medium text-slate-900">{valor}</dd>
    </div>
  );
}

function LinhaDeDocumento({ rotulo, doc }: { rotulo: string; doc: DocumentoDoPintor }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-slate-600">{rotulo}</dt>
      <dd className={doc.emDia ? 'font-medium text-tinta-700' : 'font-medium text-amber-800'}>
        {doc.emDia ? 'Em dia' : 'Não confirmado'}
        {doc.validoAte && <span className="block text-right text-[15px] text-slate-500">até {pt(doc.validoAte)}</span>}
      </dd>
    </div>
  );
}
