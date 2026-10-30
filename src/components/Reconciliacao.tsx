import { CAUSA_LABELS, diferencaEmPalavras, perguntas, reconciliar, type LadoDaReconciliacao, type Parcela } from '@/domain/reconciliacao';
import { formatEuros } from '@/domain/money';
import { PerguntasASeguir } from '@/components/PerguntasASeguir';

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
 *
 * **As parcelas agrupam-se pela origem do valor** (29/10/2026). A conta fecha sempre ao cêntimo,
 * porque o que sobra é definido como o resto — fechar não prova que cada atribuição esteja certa.
 * Um valor escrito na proposta e um valor que a plataforma calculou por convenção não podem ter a
 * mesma aparência, e a convenção lê-se aqui, antes dos números, e não num anexo.
 */
export function Reconciliacao({
  a,
  b,
  caminho,
}: {
  a: LadoDaReconciliacao;
  b: LadoDaReconciliacao;
  /** Onde esta secção vive, para a página se redesenhar depois de as perguntas seguirem. */
  caminho: string;
}) {
  const r = reconciliar(a, b);
  const d = diferencaEmPalavras(a.alias, b.alias, r, formatEuros);
  const qs = perguntas(a, b, r);
  const temEuros = (p: Parcela) => p.valorCents !== null && p.valorCents !== 0;
  const grupos = (['declarado', 'calculado'] as const)
    .map((id) => ({ bloco: d.blocos.find((x) => x.id === id), parcelas: r.parcelas.filter((p) => p.proveniencia === id && temEuros(p)) }))
    .filter((g) => g.bloco && g.parcelas.length > 0);
  const descrito = d.blocos.find((x) => x.id === 'descrito');
  const naoDecomposto = d.blocos.find((x) => x.id === 'nao_decomposto');
  const sinal = (c: number) => (c > 0 ? '+' : '−');

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
      <h2 className="font-semibold">
        O que distingue {a.alias} de {b.alias}
      </h2>
      <p className="mt-2 text-[20px] leading-snug text-slate-900">{d.abertura}</p>

      {grupos.length > 0 && (
        <table className="mt-4 w-full text-left text-[17px]">
          <caption className="sr-only">Parcelas da diferença de preço, agrupadas pela origem do valor</caption>
          {grupos.map(({ bloco, parcelas }) => (
            <tbody key={bloco!.id}>
              <tr>
                <th colSpan={2} scope="colgroup" className="pt-3 pb-1 text-left align-bottom">
                  <span className="block font-semibold">{bloco!.titulo}</span>
                  {bloco!.nota && <span className="mt-1 block text-[15px] font-normal text-slate-600">{bloco!.nota}</span>}
                </th>
              </tr>
              {parcelas.map((p, i) => (
                <tr key={`${p.causa}-${i}`} className="border-t border-slate-100">
                  <td className="py-2 pr-3 align-top">
                    <span className="block font-medium">{CAUSA_LABELS[p.causa]}</span>
                    <span className="block text-[15px] text-slate-600">{p.descricao}</span>
                  </td>
                  <td className="py-2 text-right align-top tabular-nums font-medium">
                    {sinal(p.valorCents!)}
                    {formatEuros(Math.abs(p.valorCents!))}
                  </td>
                </tr>
              ))}
            </tbody>
          ))}

          {naoDecomposto && r.naoDecompostaCents !== 0 && (
            <tbody>
              <tr>
                <th colSpan={2} scope="colgroup" className="pt-3 pb-1 text-left align-bottom">
                  <span className="block font-semibold">{naoDecomposto.titulo}</span>
                  {naoDecomposto.nota && <span className="mt-1 block text-[15px] font-normal text-slate-600">{naoDecomposto.nota}</span>}
                </th>
              </tr>
              <tr className="border-t border-slate-100">
                <td className="py-2 pr-3 align-top font-medium">{CAUSA_LABELS.nao_decomposta}</td>
                <td className="py-2 text-right align-top tabular-nums font-medium">
                  {sinal(r.naoDecompostaCents)}
                  {formatEuros(Math.abs(r.naoDecompostaCents))}
                </td>
              </tr>
            </tbody>
          )}

          <tfoot>
            <tr className="border-t-2 border-slate-900">
              <th scope="row" className="py-2 pr-3 text-left font-semibold">
                Diferença
              </th>
              <td className="py-2 text-right tabular-nums font-semibold">
                {sinal(r.diferencaCents)}
                {formatEuros(Math.abs(r.diferencaCents))}
              </td>
            </tr>
          </tfoot>
        </table>
      )}

      {r.indecomponivel && naoDecomposto && <p className="mt-3 text-[17px] text-slate-700">{naoDecomposto.linhas[0]}</p>}

      {descrito && (
        <div className="mt-4">
          <h3 className="text-[17px] font-semibold">{descrito.titulo}</h3>
          <ul className="mt-1 space-y-1 text-[17px] text-slate-700">
            {descrito.linhas.map((n) => (
              <li key={n}>{n}</li>
            ))}
          </ul>
          {descrito.nota && <p className="mt-1 text-[15px] text-slate-500">{descrito.nota}</p>}
        </div>
      )}

      {qs.length > 0 && (
        <div className="mt-4 border-t border-slate-200 pt-4">
          <h3 className="text-[17px] font-semibold">Perguntas que valem a pena fazer</h3>
          <PerguntasASeguir perguntas={qs} caminho={caminho} />
        </div>
      )}
    </section>
  );
}
