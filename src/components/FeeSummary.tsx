import type { FeeBreakdown } from '@/domain/commission';
import { formatEuros } from '@/domain/money';
import type { PainterDiscountBreakdown } from '@/lib/queries';

export interface FeeSummaryProps {
  /** Comissão já com o desconto do pintor aplicado — o que realmente se paga se a obra for adjudicada. */
  fee: FeeBreakdown;
  /** A mesma comissão sem desconto nenhum, só para calcular quanto cada desconto abate em euros. */
  fullFee: FeeBreakdown | null;
  discount: PainterDiscountBreakdown;
  /** Nomes dos fornecedores cujo código de adesão está ligado (já sem duplicados). */
  linkedSupplierNames: string[];
}

// Ecrã final do orçamento (CMP-04/CMP-13, docs/MODELO.md), último que o pintor vê antes de submeter: a
// comissão só existe se a obra for adjudicada, nunca antes — e o ecrã tem de o dizer antes de dizer o
// número. Por isso: a etiqueta de condição vem primeiro; o único número grande é o total condicionado,
// nunca a comissão isolada; comissão, IVA e descontos (cada um com o nome de quem o dá) vêm por baixo,
// mais pequenos, como uma fatura — nunca escondidos atrás de um "ver detalhe" (decisão de 24/10/2026,
// docs/DECISOES.md: a pesquisa de como vender isto sem pesar nem passar despercebido).
export function FeeSummary({ fee, fullFee, discount, linkedSupplierNames }: FeeSummaryProps) {
  // Desconto total em euros (líquido de IVA), a dividir pelas suas origens proporcionalmente aos pontos-base
  // de cada uma — mantém a soma exata mesmo quando o teto conjunto (MAX_COMBINED_PAINTER_DISCOUNT_BP) corta o
  // desconto bruto: a soma das linhas nunca excede o que `fee` já reflete.
  const totalDiscountNet = fullFee ? fullFee.net - fee.net : 0;
  const rawBpSum = discount.linkedBp + discount.referralsBp;
  const centsFor = (bp: number) => (rawBpSum > 0 ? Math.round((totalDiscountNet * bp) / rawBpSum) : 0);
  const perSupplierBp = linkedSupplierNames.length > 0 ? discount.linkedBp / linkedSupplierNames.length : 0;
  const discountLines = [
    ...linkedSupplierNames.map((nome) => ({ label: `Código de adesão — ${nome}`, cents: centsFor(perSupplierBp) })),
    ...(discount.referralsBp > 0
      ? [{ label: `Fornecedores indicados por si (${discount.eligibleCount})`, cents: centsFor(discount.referralsBp) }]
      : []),
  ].filter((d) => d.cents > 0);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 text-sm">
      <p className="inline-block rounded-full bg-tinta-50 px-3 py-1 text-xs font-semibold text-tinta-800">
        Grátis para orçamentar; comissão só com adjudicação
      </p>
      <p className="mt-4 text-3xl font-semibold text-slate-900">{formatEuros(fee.gross)}</p>
      <p className="text-slate-600">Total, se o cliente escolher esta proposta</p>
      <ul className="mt-4 space-y-1 text-slate-600">
        <li>Comissão: {formatEuros(fee.net)}</li>
        <li>IVA: {formatEuros(fee.vat)}</li>
        {discountLines.map((d) => (
          <li key={d.label} className="text-emerald-700">
            {d.label}: −{formatEuros(d.cents)}
          </li>
        ))}
      </ul>
      <p className="mt-4 text-slate-600">O cliente paga o valor do orçamento; nada se soma a esse valor.</p>
      <p className="mt-1 text-slate-600">A pagar 8 dias após a assinatura, não antes.</p>
      <p className="mt-1 text-xs text-slate-500">Os contactos entre as partes só são trocados depois do pagamento.</p>
    </div>
  );
}
