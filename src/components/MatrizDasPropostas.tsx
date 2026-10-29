import type { LinhaDaMatriz } from '@/domain/matriz';

/**
 * Todas as propostas, uma por linha — a peça principal da primeira página.
 *
 * **Redesenhada a 29/10/2026**, a pedido do promotor, e as mudanças não são cosméticas:
 *
 * - **A coluna das indicações saiu.** Os dois destaques estão em blocos no topo da página, e
 *   repeti-los aqui gastava a largura de uma coluna inteira em frases longas que diziam o mesmo.
 * - **O âmbito e o que falta esclarecer separam-se em duas colunas.** «Incluído» ou «Por confirmar»
 *   numa, a contagem — «2 trabalhos», «1 preço» — na outra. Cada célula é uma palavra ou dois
 *   números, nunca um parágrafo.
 * - **Dois grupos, com um pequeno título.** As propostas sem pendências primeiro, as que precisam
 *   de esclarecimento depois, separadas por um fio e não por fundos coloridos em cada linha.
 * - **O preço desceu de 14pt para 12,5pt.** Com dez linhas, dez números a 14pt disputavam a atenção
 *   uns com os outros; o destaque está nos blocos de cima, e aqui basta que se leiam.
 *
 * Mantém-se a regra 13 do CLAUDE.md: nenhum fundo de cor nas linhas, nenhum verde a assinalar
 * cumprimento, e o âmbar apenas no texto do que exige atenção.
 */
export function MatrizDasPropostas({
  linhas,
  variante = 'ecra',
}: {
  linhas: LinhaDaMatriz[];
  variante?: 'ecra' | 'papel';
}) {
  if (linhas.length === 0) return null;
  const papel = variante === 'papel';
  const cel = (c: { texto: string; atencao: boolean }) => (
    <span className={c.atencao ? 'text-amber-800' : undefined}>{c.texto}</span>
  );
  // Um título só quando o grupo muda, e só se houver mais do que um: com um grupo só, o título
  // seria um rótulo por cima da única lista da página.
  const grupos = [...new Set(linhas.map((l) => l.grupo))];
  const abreGrupo = (l: LinhaDaMatriz, i: number) => grupos.length > 1 && (i === 0 || linhas[i - 1]!.grupo !== l.grupo);

  return (
    <div className={papel ? 'mt-4' : '-mx-5 mt-4 overflow-x-auto sm:mx-0'}>
      <table
        className={`w-full border-collapse text-left ${papel ? '' : 'text-[13px]'}`}
        style={papel ? { breakInside: 'auto' } : { minWidth: '36rem' }}
      >
        <caption className="sr-only">
          Todas as propostas recebidas, uma por linha: total, cobertura do pedido, o que falta esclarecer e o histórico
          do pintor.
        </caption>
        <thead>
          <tr className="border-b border-slate-300">
            <th scope="col" className={`py-2 pr-3 align-bottom font-semibold ${papel ? '' : 'pl-5 sm:pl-0'}`}>
              Proposta
            </th>
            <th scope="col" className="py-2 pr-3 text-right align-bottom font-semibold whitespace-nowrap">
              Total com IVA
            </th>
            <th scope="col" className="py-2 pr-3 align-bottom font-semibold">
              Pedido
            </th>
            <th scope="col" className="py-2 pr-3 align-bottom font-semibold">
              A esclarecer
            </th>
            <th scope="col" className="py-2 align-bottom font-semibold">
              Clientes
            </th>
          </tr>
        </thead>
        <tbody>
          {linhas.map((l, i) => (
            <Fragmento key={l.propostaId}>
              {abreGrupo(l, i) && (
                <tr>
                  <th
                    colSpan={5}
                    scope="colgroup"
                    className={`doc-rotulo text-left ${i === 0 ? 'pt-3' : 'pt-5'} pb-1`}
                    style={papel ? undefined : { fontSize: '11px' }}
                  >
                    {l.grupo}
                  </th>
                </tr>
              )}
              <tr className="border-b border-slate-100" style={papel ? { breakInside: 'avoid' } : undefined}>
                <th scope="row" className={`py-1.5 pr-3 text-left align-baseline font-medium ${papel ? '' : 'pl-5 sm:pl-0'}`}>
                  {l.alias}
                </th>
                <td
                  className="py-1.5 pr-3 text-right align-baseline font-semibold tabular-nums whitespace-nowrap"
                  style={papel ? { fontSize: '12.5pt' } : undefined}
                >
                  {l.total}
                </td>
                <td className="py-1.5 pr-3 align-baseline">{cel(l.pedido)}</td>
                <td className="py-1.5 pr-3 align-baseline">{cel(l.aEsclarecer)}</td>
                <td className="py-1.5 align-baseline">{cel(l.reputacao)}</td>
              </tr>
            </Fragmento>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Duas linhas irmãs por proposta — o título do grupo e a linha — sem um elemento entre elas. */
function Fragmento({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
