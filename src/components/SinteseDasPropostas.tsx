import { BLOCOS, diferencasRelevantes, textoDaCelula, type LinhaDaSintese } from '@/domain/sintese';
// A aritmética dos quadros vive à parte, e testada: é uma regra, não um detalhe de desenho.
import { gruposDeColunas } from './quadros';

/** Quantas diferenças se escrevem ao pé de cada quadro. Mais do que três deixa de ser um resumo. */
const MAXIMO_DE_DIFERENCAS = 3;

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
export function SinteseDasPropostas({
  linhas,
  aliases,
  leitura,
  referencia,
  titulo,
  jaExplicadas,
  remissao,
  variante = 'ecra',
}: {
  linhas: LinhaDaSintese[];
  aliases: string[];
  /** A frase factual que se lê antes da tabela. Null quando há menos de duas propostas. */
  leitura?: string | null;
  /** A proposta que se repete em todos os quadros, quando é preciso dividir. Por omissão, a primeira. */
  referencia?: string;
  /** O título no papel, que leva o número da secção do relatório onde a tabela entrar. */
  titulo?: string;
  /**
   * As propostas cujas pendências já foram escritas antes, por extenso. No relatório, as das
   * propostas indicadas sobem à secção 1.2; repeti-las aqui era a mesma lista palavra por palavra
   * duas vezes no mesmo documento. Remete-se para onde estão, em vez de as calar.
   */
  jaExplicadas?: string[];
  /** Onde estão as que não se repetem. Sem isto, não se remete — cala-se, e isso seria pior. */
  remissao?: string;
  /** No papel não há coluna fixa nem deslize: a folha é o que é, e a tabela tem de caber nela. */
  variante?: 'ecra' | 'papel';
}) {
  if (linhas.length === 0) return null;
  const papel = variante === 'papel';
  const fixa = papel ? '' : 'sticky left-0 z-10 bg-white';
  const iRef = Math.max(0, referencia ? aliases.indexOf(referencia) : 0);
  const quadros = papel ? gruposDeColunas(aliases.length, iRef) : [[...Array(aliases.length).keys()]];
  // «O essencial» repetido igual em três colunas acrescenta pouco e ocupa três linhas de altura. Se
  // todas as do **quadro** disserem o mesmo, diz-se uma vez por baixo dele (promotor, 29/10/2026).
  // Antes isto media-se sobre as dez propostas, e bastava uma diferir para a frase genérica voltar
  // a aparecer três vezes em cada folha.
  const essencial = linhas.find((l) => l.id === 'essencial');
  const essencialIgualEm = (indices: number[]): string | null => {
    if (!essencial || indices.length < 2) return null;
    const textos = new Set(indices.map((i) => essencial.celulas[i]?.texto));
    return textos.size === 1 ? essencial.celulas[indices[0]!]!.texto : null;
  };

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
  const ja = new Set(jaExplicadas ?? []);
  const repetidas = atencoes.filter((x) => ja.has(x.alias)).map((x) => x.alias);
  const porDizer = remissao ? atencoes.filter((x) => !ja.has(x.alias)) : atencoes;

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
        <h2 className="font-semibold">{titulo ?? 'Resumo das propostas'}</h2>
      ) : (
        <h2 className="font-semibold">Resumo das propostas</h2>
      )}
      {/* No papel, a secção que acolhe a tabela já escreveu a sua própria entrada: duas frases
          seguidas a dizer o mesmo eram a primeira coisa que se lia em cada folha de consulta. */}
      {!papel && (
        <p className="mt-1 text-[15px] text-slate-600">
          O que distingue cada proposta, critério a critério. O detalhe abaixo confirma o que aqui se resume.
        </p>
      )}
      {leitura && <p className={papel ? 'mt-2' : 'mt-2 text-[17px] text-slate-900'}>{leitura}</p>}

      {quadros.map((indices, n) => {
        // As diferenças deste quadro, e só deste: com dez propostas, uma lista única no início
        // nomeava nove aliases por critério e não se seguia. Ao pé da página, e sobre as três
        // propostas que estão acima, cada diferença tem onde ser confirmada (promotor, 29/10/2026).
        const generico = essencialIgualEm(indices);
        const linhasVisiveis = generico ? linhas.filter((l) => l.id !== 'essencial') : linhas;
        const sub = linhasVisiveis.map((l) => ({ ...l, celulas: indices.map((i) => l.celulas[i]!) }));
        const difs = diferencasRelevantes(sub, indices.map((i) => aliases[i]!)).slice(0, MAXIMO_DE_DIFERENCAS);
        return (
        <div
          key={`quadro-${n}`}
          className={papel ? 'mt-2' : '-mx-5 mt-4 overflow-x-auto sm:mx-0'}
          // Um quadro por folha: três propostas, os seus critérios e as suas diferenças, sem nada
          // de outro quadro pelo meio.
          style={papel && n > 0 ? { breakBefore: 'page' } : undefined}
        >
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
            className={`w-full border-collapse text-left ${papel ? '' : 'text-[13px]'}`}
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
              {linhasVisiveis.map((l, k) => (
                <Fragmento key={l.id}>
                {l.bloco && (k === 0 || linhasVisiveis[k - 1]!.bloco !== l.bloco) && (
                  <tr>
                    <th
                      colSpan={indices.length + 1}
                      scope="colgroup"
                      className={`doc-rotulo text-left ${k === 0 ? 'pt-3' : 'pt-5'} pb-1`}
                      style={papel ? undefined : { fontSize: '11px' }}
                    >
                      {BLOCOS[l.bloco]}
                    </th>
                  </tr>
                )}
                <tr className="border-b border-slate-100" style={papel ? { breakInside: 'avoid' } : undefined}>
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
                          // No ecrã: 17px sobre células a 13px — dois degraus da escala, que
                          // chegam. Os 20px que aqui estavam davam um salto desproporcionado
                          // depois de a tabela descer. No papel o total vai a 14pt por `doc-total`
                          // (globals.css), em pontos: a folha A4 é outro meio, e a regra 14 do
                          // CLAUDE.md isenta-a da escala do ecrã.
                          l.destacada && !papel ? 'font-semibold tabular-nums whitespace-nowrap text-[17px]' : '',
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
                        ) : papel && c.segunda ? (
                          <>
                            <span className="block">{c.texto}</span>
                            <span className="block text-slate-600">{c.segunda}</span>
                          </>
                        ) : (
                          textoDaCelula(c)
                        )}
                      </td>
                    );
                  })}
                </tr>
                </Fragmento>
              ))}
            </tbody>
          </table>
          {generico && (
            <p className={`mt-2 ${papel ? '' : 'text-[15px]'}`}>
              <span className="font-medium">O essencial:</span> {generico} — nas {indices.length} propostas deste quadro.
            </p>
          )}
          {difs.length > 0 && (
            <div className={papel ? 'doc-tema break-inside-avoid' : 'mt-4 border-t border-slate-200 pt-3'}>
              <p className="doc-rotulo">O que distingue estas {indices.length}</p>
              <dl className={`mt-1 space-y-0.5 ${papel ? '' : 'text-[15px]'}`}>
                {difs.map((d) => (
                  <div key={d.criterio}>
                    <dt className="inline font-medium">{d.criterio}: </dt>
                    <dd className="inline">{d.frase}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}
        </div>
        );
      })}

      {(porDizer.length > 0 || repetidas.length > 0) && (
        <div className={`mt-4 border-t border-slate-200 pt-4 ${papel ? 'break-inside-avoid' : ''}`}>
          <h3 className={papel ? 'font-semibold' : 'text-[17px] font-semibold'}>O que exige atenção</h3>
          {repetidas.length > 0 && remissao && (
            <p className={`mt-1 text-slate-600 ${papel ? '' : 'text-[15px]'}`}>
              {repetidas.length === 1
                ? `A de ${repetidas[0]} está em «${remissao}», e não se repete aqui.`
                : `As de ${repetidas.join(', ')} estão em «${remissao}», e não se repetem aqui.`}
            </p>
          )}
          <dl className={`mt-2 space-y-3 ${papel ? '' : 'text-[15px]'}`}>
            {porDizer.map((a) => (
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

/** Duas linhas irmãs — o título do bloco e o critério — sem um elemento entre elas. */
function Fragmento({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
