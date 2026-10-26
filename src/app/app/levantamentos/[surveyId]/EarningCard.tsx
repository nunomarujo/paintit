import { formatEuros } from '@/domain/money';
import { SURVEYOR_SHARE_OF_VALUE_BP_MAX, SURVEYOR_SHARE_OF_VALUE_BP_MIN, surveyorPayoutAmount } from '@/domain/survey';
import type { SurveyorEarningView } from '@/lib/surveys';

const card = 'rounded-2xl border border-tinta-200 bg-tinta-50 p-6';
const pct = (bp: number) => `${(bp / 100).toFixed(2).replace('.', ',')}%`;
const stars = (n: number | null) => (n === null ? 'ainda sem notas' : `${n.toFixed(1).replace('.', ',')}★`);

/** Exemplos de valor de obra, só para traduzir a percentagem em euros. Não são previsões desta obra. */
const EXEMPLOS = [10_000_00, 25_000_00, 50_000_00];

/**
 * Ganho previsto do avaliador, no ecrã do próprio levantamento (pedido do promotor, 24/10/2026: "onde
 * refere o ganho previsto se a obra for adjudicada").
 *
 * O que **não** se faz aqui: inventar um valor para esta obra. Quando o levantamento se faz, ainda não
 * há proposta escolhida — o valor adjudicado não existe. Mostrar um número inventado seria prometer o
 * que a plataforma não sabe. Mostra-se a percentagem real a que este avaliador tem direito hoje, o que a
 * compõe, e a tradução em euros para valores de obra à escolha.
 */
export function EarningCard({ earning }: { earning: SurveyorEarningView }) {
  const e = earning;
  return (
    <section className={card}>
      <h2 className="font-semibold">O que ganha se esta obra for adjudicada</h2>
      <p className="mt-1 text-[17px] text-slate-700">
        A sua fração hoje é <strong className="text-tinta-800">{pct(e.shareBp)}</strong> do valor adjudicado (sem IVA),
        dentro de uma banda de {pct(SURVEYOR_SHARE_OF_VALUE_BP_MIN)} a {pct(SURVEYOR_SHARE_OF_VALUE_BP_MAX)}.
        {e.temBonus && (
          <>
            {' '}
            Inclui <strong>+{pct(e.shareBp - e.shareBpSemBonus)}</strong> do bónus de adesão, por um convite seu que foi
            aceite — gasto nesta obra, por uma vez.
          </>
        )}
      </p>

      <table className="mt-4 w-full text-[17px]">
        <caption className="sr-only">O que compõe a sua fração</caption>
        <tbody className="divide-y divide-tinta-200/60">
          <Row peso="40%" nome="A sua qualificação geral" valor={stars(e.componentes.qualificacaoGeral)} />
          <Row peso="30%" nome="Nota dos pintores à informação desta obra" valor={stars(e.componentes.notaInformacao)} />
          <Row
            peso="15%"
            nome="Resposta a tempo a pedidos de esclarecimento"
            valor={e.componentes.respostaAtempada === null ? 'sem pedidos nesta obra' : e.componentes.respostaAtempada ? 'respondeu a tempo' : 'falhou o prazo'}
          />
          <Row peso="15%" nome="Nota do cliente a esta obra" valor={stars(e.componentes.notaCliente)} />
        </tbody>
      </table>
      <p className="mt-2 text-[15px] text-slate-600">
        Cada parcela ainda sem notas conta pelo meio da banda — não prejudica nem beneficia.
      </p>

      <div className="mt-5 border-t border-tinta-200 pt-4">
        <p className="text-[17px] font-medium text-slate-700">À percentagem de hoje, isso daria:</p>
        <ul className="mt-2 space-y-1 text-[17px] text-slate-700">
          {EXEMPLOS.map((valor) => (
            <li key={valor}>
              Obra de {formatEuros(valor)} → <strong>{formatEuros(surveyorPayoutAmount(valor, e.shareBp, valor))}</strong>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-[15px] text-slate-600">
          Exemplos para dar escala, não previsões desta obra: o valor só se sabe quando o cliente escolher uma proposta.
          O pagamento nunca excede a comissão que a plataforma receber do pintor nesta obra, e só é devido depois de essa
          comissão entrar.
        </p>
      </div>
    </section>
  );
}

function Row({ peso, nome, valor }: { peso: string; nome: string; valor: string }) {
  return (
    <tr>
      <th scope="row" className="py-2 pr-3 text-left font-normal text-slate-700">
        {nome}
      </th>
      <td className="py-2 pr-3 text-right text-slate-500">{peso}</td>
      <td className="py-2 text-right font-medium text-slate-800">{valor}</td>
    </tr>
  );
}
