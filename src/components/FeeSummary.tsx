import type { FeeBreakdown } from '@/domain/commission';
import { formatEuros, type Cents } from '@/domain/money';
import { CURRENT_RULES } from '@/domain/rules';
import type { PainterDiscountBreakdown } from '@/lib/queries';

export interface FeeSummaryProps {
  /** Valor da obra sem IVA — a base sobre a qual a comissão é calculada. */
  base: Cents;
  /** Comissão já com o desconto do pintor aplicado — o que realmente se paga se a obra for adjudicada. */
  fee: FeeBreakdown;
  /** A mesma comissão sem desconto nenhum, só para calcular quanto cada desconto abate em euros. */
  fullFee: FeeBreakdown | null;
  discount: PainterDiscountBreakdown;
  /** Nomes dos fornecedores cujo código de adesão está ligado (já sem duplicados). */
  linkedSupplierNames: string[];
}

// Ecrã final do orçamento (CMP-04/CMP-13, docs/MODELO.md), último que o pintor vê antes de submeter.
//
// Reescrito a 24/10/2026 porque a versão anterior escondia o custo sem o querer esconder (docs/DECISOES.md).
// O que mudou e porque é que não se volta atrás:
//
//  - O número grande é a **comissão sem IVA**. O IVA não é custo para o pintor (deduz-o), por isso pôr
//    o total com IVA em corpo grande sobredimensionava o custo real em 23% — imprecisão por excesso é
//    imprecisão. Mas o desembolso é o total, e isso é tesouraria: aparece na mesma caixa, a seguir.
//  - A comissão aparece **sempre ao lado do valor da obra e do líquido**. Um número isolado não tem
//    escala e o leitor inventa-lhe uma.
//  - A condição vem na **mesma frase** do valor, afirmativa e sem minimizadores. "Grátis", "só" e
//    "apenas" apagam o número que acompanham; era por isso que a etiqueta "Grátis para orçamentar"
//    ancorava primeiro e tudo o que vinha depois se lia como detalhe administrativo.
//  - Nada essencial atrás de "ver detalhe", acordeão ou tooltip.
//  - O momento de pagamento diz-se por inteiro, incluindo a parte incómoda: paga-se antes de assinar e
//    antes de receber qualquer valor do cliente (MODELO.md §4 e §67). Omitir isto era o único custo
//    verdadeiramente disfarçado deste ecrã.
export function FeeSummary({ base, fee, fullFee, discount, linkedSupplierNames }: FeeSummaryProps) {
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

  // Taxa realmente aplicada a esta obra: com desconto, ou puxada para cima pelo mínimo em obras pequenas.
  const taxa = base > 0 ? (fee.net / base) * 100 : 0;
  const taxaTexto = taxa.toLocaleString('pt-PT', { minimumFractionDigits: 1, maximumFractionDigits: 2 });
  const fica = base - fee.net;

  return (
    <div className="rounded-2xl border border-slate-300 bg-white text-sm">
      <div className="border-b border-slate-200 px-5 py-4">
        <p className="eyebrow">O que paga à Quem Pinta</p>
        <p className="mt-2 text-[15px] leading-snug text-slate-900">
          Se o cliente escolher esta proposta, paga <strong className="font-semibold">{formatEuros(fee.net)} + IVA</strong>{' '}
          à Quem Pinta. Se escolher outra, não paga nada.
        </p>
      </div>

      <div className="grid gap-px bg-slate-200 sm:grid-cols-2">
        <div className="bg-white px-5 py-4">
          <p className="text-[34px] font-semibold leading-none tracking-tight text-slate-900">{formatEuros(fee.net)}</p>
          <p className="mt-2 text-slate-600">
            Comissão — {taxaTexto}% de {formatEuros(base)}
          </p>
        </div>
        <div className="bg-white px-5 py-4">
          <p className="text-[26px] font-semibold leading-none tracking-tight text-slate-700">{formatEuros(fica)}</p>
          <p className="mt-2 text-slate-600">Fica para a sua empresa, dos {formatEuros(base)} da obra</p>
        </div>
      </div>

      <ul className="border-t border-slate-200 px-5 py-4 text-slate-700">
        {discountLines.length > 0 && fullFee ? (
          <>
            <li className="flex justify-between gap-4 py-0.5">
              <span>Comissão à taxa base</span>
              <span className="tabular-nums">{formatEuros(fullFee.net)}</span>
            </li>
            {discountLines.map((d) => (
              <li key={d.label} className="flex justify-between gap-4 py-0.5 text-emerald-700">
                <span>{d.label}</span>
                <span className="tabular-nums">−{formatEuros(d.cents)}</span>
              </li>
            ))}
          </>
        ) : null}
        <li className="flex justify-between gap-4 py-0.5 font-semibold text-slate-900">
          <span>Comissão</span>
          <span className="tabular-nums">{formatEuros(fee.net)}</span>
        </li>
        <li className="flex justify-between gap-4 py-0.5">
          <span>IVA, que depois deduz</span>
          <span className="tabular-nums">{formatEuros(fee.vat)}</span>
        </li>
        <li className="mt-1 flex justify-between gap-4 border-t border-slate-200 pt-2 font-semibold text-slate-900">
          <span>A transferir</span>
          <span className="tabular-nums">{formatEuros(fee.gross)}</span>
        </li>
      </ul>

      <div className="border-t border-slate-200 px-5 py-4 text-slate-700">
        <p className="font-semibold text-slate-900">Quando</p>
        <p className="mt-1">
          8 dias corridos depois de o cliente confirmar a caução — ou seja, antes de assinar o contrato e antes de
          receber dele qualquer valor da obra. Só depois do pagamento é que as duas partes trocam contactos.
        </p>
        <p className="mt-2">O cliente paga o valor do orçamento; a comissão não se soma a esse valor.</p>
      </div>

      <p className="border-t border-slate-200 px-5 py-3 text-xs text-slate-500">
        Taxa base {(CURRENT_RULES.commissionBp / 100).toLocaleString('pt-PT')}% do valor sem IVA
        {discountLines.length > 0 ? ', já com os descontos acima' : ''}; nunca abaixo de{' '}
        {((CURRENT_RULES.commissionFloorBp ?? 0) / 100).toLocaleString('pt-PT')}%, com um mínimo de{' '}
        {formatEuros(CURRENT_RULES.commissionMinCents)}. Condições da versão {CURRENT_RULES.version}, fixadas nesta
        proposta.
      </p>
    </div>
  );
}
