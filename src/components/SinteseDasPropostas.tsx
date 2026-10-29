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
export function SinteseDasPropostas({
  linhas,
  aliases,
  leitura,
  variante = 'ecra',
}: {
  linhas: LinhaDaSintese[];
  aliases: string[];
  /** A frase factual que se lê antes da tabela. Null quando há menos de duas propostas. */
  leitura?: string | null;
  /** No papel não há coluna fixa nem deslize: a folha é o que é, e a tabela tem de caber nela. */
  variante?: 'ecra' | 'papel';
}) {
  if (linhas.length === 0) return null;
  const papel = variante === 'papel';
  const fixa = papel ? '' : 'sticky left-0 z-10 bg-white';
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
    <section className={papel ? '' : 'rounded-2xl border border-slate-200 bg-white p-5 sm:p-6'}>
      {papel ? (
        <h2 className="text-[20px] font-semibold">1. Resumo das propostas</h2>
      ) : (
        <h2 className="font-semibold">Resumo das propostas</h2>
      )}
      <p className={papel ? 'text-slate-600' : 'mt-1 text-[15px] text-slate-600'}>
        O que distingue cada proposta, critério a critério. O detalhe abaixo confirma o que aqui se resume.
      </p>
      {leitura && <p className={papel ? 'mt-2' : 'mt-2 text-[17px] text-slate-900'}>{leitura}</p>}

      <div className={papel ? 'mt-2' : '-mx-5 mt-4 overflow-x-auto sm:mx-0'}>
        {/* Sem `min-w-max`: isso dava a cada coluna a largura do seu texto mais longo, e a 390px
            via-se uma proposta só. Com larguras fixas e quebra de linha, a 390px vêem-se duas e as
            restantes deslizam — que é o que o promotor pediu. */}
        <table
          className={`w-full border-collapse text-left ${papel ? '' : 'text-[15px]'}`}
          style={papel ? undefined : { minWidth: `${6.5 + aliases.length * 6.875}rem` }}
        >
          <caption className="sr-only">
            Resumo comparativo: cada linha é um critério, cada coluna uma proposta. Os pontos que exigem atenção estão
            identificados no texto e explicados a seguir à tabela.
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
              {aliases.map((a) => (
                <th key={a} scope="col" className={`py-2 pr-3 align-bottom font-semibold`}
                  style={papel ? undefined : { width: '6.875rem' }}>
                  {a}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {linhas.map((l) => (
              <tr key={l.id} className="border-b border-slate-100">
                <th
                  scope="row"
                  className={`${fixa} py-2 pr-3 text-left align-top font-medium ${papel ? '' : 'hyphens-auto pl-5 sm:pl-0'} ${
                    l.id === 'essencial' ? 'font-semibold' : ''
                  }`}
                >
                  {l.criterio}
                </th>
                {l.celulas.map((c, i) => (
                  <td
                    key={`${l.id}-${aliases[i] ?? i}`}
                    className={[
                      'py-2 pr-3 align-top',
                      // 17px no telemóvel e 20px a partir de sm: continua a destacar-se das linhas
                      // a 15px sem forçar a coluna a uma largura que empurra a segunda proposta
                      // para fora do ecrã.
                      l.destacada ? `font-semibold tabular-nums whitespace-nowrap ${papel ? '' : 'text-[17px] sm:text-[20px]'}` : '',
                      l.id === 'essencial' ? 'font-medium' : '',
                      c.tom === 'atencao' ? 'text-amber-800' : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                  >
                    {c.texto}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

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
