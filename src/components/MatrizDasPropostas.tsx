import type { LinhaDaMatriz } from '@/domain/matriz';

/**
 * Todas as propostas, uma por linha.
 *
 * A síntese transposta lê-se melhor, mas pára nas quatro colunas: o total a 14pt impõe uma largura
 * mínima a cada uma e a quinta sai da folha. A matriz muda de forma em vez de encolher a letra —
 * dez candidatos são dez linhas, e altura é o que uma A4 tem.
 *
 * As regras de cor são as da síntese e da regra 13 do CLAUDE.md: nenhum fundo colorido, nenhum verde
 * a assinalar cumprimento, e o âmbar só no texto do que exige atenção. Uma indicação **não** é
 * destaque de cor: é uma palavra numa coluna, com a razão escrita por baixo da tabela.
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

  return (
    <div className={papel ? 'mt-2' : '-mx-5 mt-4 overflow-x-auto sm:mx-0'}>
      <table
        className={`w-full border-collapse text-left ${papel ? '' : 'text-[13px]'}`}
        style={papel ? { breakInside: 'auto' } : { minWidth: '44rem' }}
      >
        <caption className="sr-only">
          Todas as propostas recebidas, uma por linha: total, cobertura do pedido, custos por fechar, histórico do pintor
          e as indicações atribuídas.
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
              Custos por fechar
            </th>
            <th scope="col" className="py-2 pr-3 align-bottom font-semibold">
              Histórico
            </th>
            <th scope="col" className="py-2 align-bottom font-semibold">
              Indicação
            </th>
          </tr>
        </thead>
        <tbody>
          {linhas.map((l) => (
            <tr
              key={l.propostaId}
              className="border-b border-slate-100"
              style={papel ? { breakInside: 'avoid' } : undefined}
            >
              <th scope="row" className={`py-2 pr-3 text-left align-top font-medium ${papel ? '' : 'pl-5 sm:pl-0'}`}>
                {l.alias}
              </th>
              <td
                className={`py-2 pr-3 text-right align-top font-semibold tabular-nums whitespace-nowrap ${
                  papel ? '' : 'text-[15px]'
                }`}
              >
                {papel ? <span className="doc-total">{l.total}</span> : l.total}
              </td>
              <td className="py-2 pr-3 align-top">{cel(l.pedido)}</td>
              <td className="py-2 pr-3 align-top">{cel(l.custosPorFechar)}</td>
              <td className="py-2 pr-3 align-top">{cel(l.reputacao)}</td>
              <td className="py-2 align-top">
                {l.indicacoes.length === 0 ? (
                  <span className="text-slate-500">—</span>
                ) : (
                  l.indicacoes.map((i) => (
                    <span key={i} className="block font-medium">
                      {i}
                    </span>
                  ))
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
