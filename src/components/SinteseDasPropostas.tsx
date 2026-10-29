import type { LinhaDaSintese } from '@/domain/sintese';

/**
 * A síntese, no topo: uma linha por critério, uma coluna por proposta.
 *
 * O detalhe vem depois e serve para confirmar o que isto resume. Três decisões de desenho, todas
 * do promotor (29/10/2026) e nenhuma cosmética:
 *
 * - **Sem fundos de cor e sem verde.** A regra 13 do CLAUDE.md proíbe fundo colorido em linhas
 *   repetidas — trinta células pintadas são uma manta, e deixa de se ver o que é urgente — e proíbe
 *   cor de aviso como destaque, porque pintar o que cumpre ensina a ignorar o que falha. Fica o
 *   âmbar no texto, e só onde há o que resolver.
 * - **A cor nunca carrega a informação sozinha.** O texto da célula já diz o que se passa
 *   («310 m² — diverge», «Não indicada»), e o motivo por extenso sai debaixo da tabela, onde cabe
 *   numa frase inteira e onde o papel da assembleia o leva. Um motivo escondido atrás de um toque
 *   não se imprime.
 * - **A última linha não elege ninguém.**
 *
 * No telemóvel a coluna dos critérios fica fixa e as propostas deslizam ao lado: a 390px vêem-se
 * duas de cada vez, sem nada para configurar.
 */
/**
 * Quantas propostas cabem num quadro da folha A4 — medido, não estimado: com o total a 14pt a
 * largura útil da folha são 681px, e a tabela mede 680px com quatro propostas e 781px com cinco.
 * Daí o quatro. Acima disso divide-se em quadros, e cada um **repete os critérios e a proposta de
 * referência**: sem a referência em todos, os quadros não se comparam entre si.
 */
const MAXIMO_NO_PAPEL = 4;

function gruposDeColunas(total: number, referencia: number): number[][] {
  if (total <= MAXIMO_NO_PAPEL) return [[...Array(total).keys()]];
  const outras = [...Array(total).keys()].filter((i) => i !== referencia);
  const grupos: number[][] = [];
  for (let i = 0; i < outras.length; i += MAXIMO_NO_PAPEL - 1) {
    grupos.push([referencia, ...outras.slice(i, i + MAXIMO_NO_PAPEL - 1)]);
  }
  return grupos;
}

export function SinteseDasPropostas({
  linhas,
  aliases,
  leitura,
  referencia,
  variante = 'ecra',
}: {
  linhas: LinhaDaSintese[];
  aliases: string[];
  /** A frase factual que se lê antes da tabela. Null quando há menos de duas propostas. */
  leitura?: string | null;
  /** A proposta que se repete em todos os quadros, quando é preciso dividir. Por omissão, a primeira. */
  referencia?: string;
  /** No papel não há coluna fixa nem deslize: a folha é o que é, e a tabela tem de caber nela. */
  variante?: 'ecra' | 'papel';
}) {
  if (linhas.length === 0) return null;
  const papel = variante === 'papel';
  const fixa = papel ? '' : 'sticky left-0 z-10 bg-white';
  const iRef = Math.max(0, referencia ? aliases.indexOf(referencia) : 0);
  const quadros = papel ? gruposDeColunas(aliases.length, iRef) : [[...Array(aliases.length).keys()]];
  const atencoes = aliases
    .map((alias, i) => ({
      alias,
      pontos: linhas
        // «O essencial» fica de fora: resume as linhas de cima, e repeti-lo aqui punha a mesma
        // frase genérica debaixo de cada proposta.
        .filter((l) => l.id !== 'essencial')
        .map((l) => ({ criterio: l.criterio, celula: l.celulas[i] }))
        .filter((x) => x.celula?.tom === 'atencao' && x.celula.motivo),
    }))
    .filter((x) => x.pontos.length > 0);

  return (
    <section
      className={papel ? '' : 'rounded-2xl border border-slate-200 bg-white p-5 sm:p-6'}
      // O `globals.css` dá `break-inside: avoid` a toda a `section` dentro da folha A4, e com isso
      // a síntese inteira saltava para a página seguinte, deixando a primeira quase em branco (visto
      // no PDF, 29/10/2026). Aqui a secção **pode** partir: o que não parte é cada quadro e o bloco
      // de atenções, que já o declaram por si.
      style={papel ? { breakInside: 'auto' } : undefined}
    >
      {papel ? (
        <h2 className="text-[20px] font-semibold">1. Resumo das propostas</h2>
      ) : (
        <h2 className="font-semibold">Resumo das propostas</h2>
      )}
      <p className={papel ? 'text-slate-600' : 'mt-1 text-[15px] text-slate-600'}>
        O que distingue cada proposta, critério a critério. O detalhe abaixo confirma o que aqui se resume.
      </p>
      {leitura && <p className={papel ? 'mt-2' : 'mt-2 text-[17px] text-slate-900'}>{leitura}</p>}

      {quadros.map((indices, n) => (
        <div key={`quadro-${n}`} className={papel ? 'mt-2' : '-mx-5 mt-4 overflow-x-auto sm:mx-0'}>
          {quadros.length > 1 && (
            <p className="mt-3 font-semibold" style={papel ? { breakAfter: 'avoid' } : undefined}>
              Comparação {n + 1} de {quadros.length}
              {/* A razão da divisão diz-se uma vez, no primeiro quadro. Repeti-la em cada um era a
                  mesma frase a encher a folha. */}
              {n === 0 && (
                <span className="font-normal text-slate-600">
                  {' '}— {aliases[iRef]} repete-se em todos os quadros, para que se comparem entre si.
                </span>
              )}
            </p>
          )}
          {/* Sem `min-w-max`: isso dava a cada coluna a largura do seu texto mais longo, e a 390px
              via-se uma proposta só. Com larguras fixas e quebra de linha, a 390px vêem-se duas e
              as restantes deslizam — que é o que o promotor pediu. */}
          {/* A folha dá `break-inside: avoid` a qualquer tabela, e com onze critérios isto saltava
              inteiro para a página seguinte, deixando duas páginas quase em branco. Uma tabela
              longa parte — entre linhas, nunca dentro de uma — e o `thead` repete-se sozinho na
              página seguinte. */}
          <table
            className={`w-full border-collapse text-left ${papel ? '' : 'text-[15px]'}`}
            style={papel ? { breakInside: 'auto' } : { minWidth: `${6.5 + aliases.length * 6.875}rem` }}
          >
            <caption className="sr-only">
              Resumo comparativo: cada linha é um critério, cada coluna uma proposta. Os pontos que exigem atenção
              estão identificados no texto e explicados a seguir à tabela.
            </caption>
            <thead>
              <tr className="border-b border-slate-300">
                <th
                  scope="col"
                  className={`${fixa} py-2 pr-3 align-bottom font-semibold ${papel ? '' : 'hyphens-auto pl-5 sm:pl-0'}`}
                  style={papel ? undefined : { width: '6.5rem' }}
                >
                  Critério
                </th>
                {indices.map((i) => (
                  <th
                    key={aliases[i]}
                    scope="col"
                    className="py-2 pr-3 align-bottom font-semibold"
                    style={papel ? undefined : { width: '6.875rem' }}
                  >
                    {aliases[i]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {linhas.map((l) => (
                <tr key={l.id} className="border-b border-slate-100" style={papel ? { breakInside: 'avoid' } : undefined}>
                  <th
                    scope="row"
                    className={`${fixa} py-2 pr-3 text-left align-top font-medium ${papel ? '' : 'hyphens-auto pl-5 sm:pl-0'} ${
                      l.id === 'essencial' ? 'font-semibold' : ''
                    }`}
                  >
                    {l.criterio}
                  </th>
                  {indices.map((i) => {
                    const c = l.celulas[i];
                    if (!c) return null;
                    return (
                      <td
                        key={`${l.id}-${aliases[i]}`}
                        className={[
                          'py-2 pr-3 align-top',
                          // No ecrã: 17px no telemóvel e 20px a partir de sm — destaca-se das
                          // linhas a 15px sem forçar uma largura que empurre a segunda proposta
                          // para fora. No papel o total vai a 14pt pela classe `doc-total`
                          // (globals.css), em pontos: a folha A4 é outro meio, e a regra 14 do
                          // CLAUDE.md isenta-a da escala do ecrã.
                          l.destacada && !papel ? 'font-semibold tabular-nums whitespace-nowrap text-[17px] sm:text-[20px]' : '',
                          l.id === 'essencial' ? 'font-medium' : '',
                          c.tom === 'atencao' ? 'text-amber-800' : '',
                        ]
                          .filter(Boolean)
                          .join(' ')}
                      >
                        {l.destacada && papel ? (
                          <>
                            <span className="doc-total block">{c.texto}</span>
                            <span className="doc-total-nota block">com IVA</span>
                          </>
                        ) : (
                          c.texto
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}

      {atencoes.length > 0 && (
        <div className={`mt-4 border-t border-slate-200 pt-4 ${papel ? 'break-inside-avoid' : ''}`}>
          <h3 className={papel ? 'font-semibold' : 'text-[17px] font-semibold'}>O que exige atenção</h3>
          <dl className={`mt-2 space-y-3 ${papel ? '' : 'text-[15px]'}`}>
            {atencoes.map((a) => (
              <div key={a.alias}>
                <dt className="font-medium">{a.alias}</dt>
                <dd className="mt-1 space-y-1 text-slate-700">
                  {a.pontos.map((p) => (
                    <p key={`${a.alias}-${p.criterio}`}>
                      <span className="text-amber-800">{p.criterio}:</span> {p.celula!.motivo}
                    </p>
                  ))}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      )}
    </section>
  );
}
