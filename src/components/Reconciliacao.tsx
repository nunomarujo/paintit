import { CAUSA_EXPLICACOES, CAUSA_LABELS, emPalavras, perguntas, reconciliar, type LadoDaReconciliacao } from '@/domain/reconciliacao';
import { formatEuros } from '@/domain/money';

/**
 * Porque é que uma proposta custa mais do que a outra.
 *
 * A peça que faltava: a tabela punha os números lado a lado e deixava a conta ao cliente. Aqui cada
 * euro de diferença é atribuído a uma causa com nome — ou dito, com todas as letras, que não se
 * consegue atribuir.
 *
 * O leitor verdadeiro disto não é o administrador do condomínio: é a assembleia a quem ele vai ter
 * de justificar a escolha, meses depois, perante quem perguntar porque é que não se escolheu a mais
 * barata. Por isso a secção mostra a conta inteira, incluindo o que não fecha, e não um veredicto.
 */
export function Reconciliacao({ a, b }: { a: LadoDaReconciliacao; b: LadoDaReconciliacao }) {
  const r = reconciliar(a, b);
  const frases = emPalavras(a.alias, b.alias, r, formatEuros);
  const qs = perguntas(a, b, r);
  const comEuros = r.parcelas.filter((p) => p.valorCents !== null && p.valorCents !== 0);

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
      <h2 className="font-semibold">
        O que distingue {a.alias} de {b.alias}
      </h2>
      <p className="mt-2 text-[20px] leading-snug text-slate-900">{frases[0]}</p>

      {comEuros.length > 0 && (
        <table className="mt-4 w-full text-left text-[17px]">
          <caption className="sr-only">Parcelas da diferença de preço</caption>
          <tbody className="divide-y divide-slate-100">
            {comEuros.map((p, i) => (
              <tr key={`${p.causa}-${i}`}>
                <td className="py-2 pr-3 align-top">
                  <span className="block font-medium">{CAUSA_LABELS[p.causa]}</span>
                  <span className="block text-[15px] text-slate-600">{p.descricao}</span>
                </td>
                <td className="py-2 text-right align-top tabular-nums font-medium">
                  {p.valorCents! > 0 ? '+' : '−'}
                  {formatEuros(Math.abs(p.valorCents!))}
                </td>
              </tr>
            ))}
            {r.naoDecompostaCents !== 0 && (
              <tr>
                <td className="py-2 pr-3 align-top">
                  <span className="block font-medium">{CAUSA_LABELS.nao_decomposta}</span>
                  <span className="block text-[15px] text-slate-600">{CAUSA_EXPLICACOES.nao_decomposta}</span>
                </td>
                <td className="py-2 text-right align-top tabular-nums font-medium">
                  {r.naoDecompostaCents > 0 ? '+' : '−'}
                  {formatEuros(Math.abs(r.naoDecompostaCents))}
                </td>
              </tr>
            )}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-slate-900">
              <th scope="row" className="py-2 pr-3 text-left font-semibold">
                Diferença
              </th>
              <td className="py-2 text-right tabular-nums font-semibold">
                {r.diferencaCents > 0 ? '+' : '−'}
                {formatEuros(Math.abs(r.diferencaCents))}
              </td>
            </tr>
          </tfoot>
        </table>
      )}

      {r.indecomponivel && <p className="mt-3 text-[17px] text-slate-700">{frases[1]}</p>}

      {r.notasTecnicas.length > 0 && (
        <div className="mt-4">
          <h3 className="text-[17px] font-semibold">Diferenças sem preço separado</h3>
          <ul className="mt-1 space-y-1 text-[17px] text-slate-700">
            {r.notasTecnicas.map((n) => (
              <li key={n}>{n}.</li>
            ))}
          </ul>
          <p className="mt-1 text-[15px] text-slate-500">
            Separar quanto destas diferenças é preço exigiria saber o custo de cada pintor. O valor está na
            diferença não decomposta, acima.
          </p>
        </div>
      )}

      {qs.length > 0 && (
        <div className="mt-4 border-t border-slate-200 pt-4">
          <h3 className="text-[17px] font-semibold">Perguntas que valem a pena fazer</h3>
          <ul className="mt-1 space-y-3 text-[17px] text-slate-700">
            {qs.map((q) => (
              <li key={`${q.propostaId}-${q.texto}`}>
                <span className="block text-[15px] font-medium text-slate-500">A perguntar a {q.alias}</span>
                {q.texto}
              </li>
            ))}
          </ul>
          <p className="mt-2 text-[15px] text-slate-500">
            Pode enviá-las nas mensagens de cada proposta, sem se identificar.
          </p>
        </div>
      )}
    </section>
  );
}
