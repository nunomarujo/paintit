import { ACCOUNTS } from './accounts';
import { MoneyError, type Cents } from '../money';
import { SUBSCRIPTION_VAT_BP } from '../subscription';
import { RULES_2026_10_20 } from '../rules';

// Lançamentos em partidas dobradas, em cêntimos, gerados dos acontecimentos de negócio. Funções puras: quem
// grava (src/lib/accounting.ts) só envia o resultado para a base de dados, que volta a confirmar o equilíbrio.
// Regra: nunca se edita um lançamento; corrige-se com estorno (`reverse`).

export interface Line {
  conta: string;
  debito: Cents;
  credito: Cents;
}

export interface Posting {
  /** Tipo de origem e identificador dessa origem: a base de dados recusa repetir o par (idempotência). */
  origem: string;
  origemId: string;
  /** Data contabilística (AAAA-MM-DD, fuso de Lisboa). */
  data: string;
  descricao: string;
  lines: Line[];
}

const dr = (conta: string, debito: Cents): Line => ({ conta, debito, credito: 0 });
const cr = (conta: string, credito: Cents): Line => ({ conta, debito: 0, credito });

export const sum = (lines: Line[], side: 'debito' | 'credito') => lines.reduce((n, l) => n + l[side], 0);

export function assertBalanced(p: Posting): Posting {
  if (p.lines.length < 2) throw new MoneyError(`Lançamento ${p.origem}/${p.origemId} com menos de duas linhas.`);
  if (p.lines.some((l) => !Number.isInteger(l.debito) || !Number.isInteger(l.credito) || l.debito < 0 || l.credito < 0 || (l.debito > 0) === (l.credito > 0))) {
    throw new MoneyError(`Lançamento ${p.origem}/${p.origemId} com uma linha inválida.`);
  }
  if (sum(p.lines, 'debito') !== sum(p.lines, 'credito')) throw new MoneyError(`Lançamento ${p.origem}/${p.origemId} desequilibrado.`);
  return p;
}

/** Separa um valor com IVA incluído: devolve a base e o IVA (arredondado ao cêntimo). */
export function splitGross(gross: Cents, vatBp: number): { net: Cents; vat: Cents } {
  const vat = Math.round((gross * vatBp) / (10_000 + vatBp));
  return { net: gross - vat, vat };
}

const VAT = RULES_2026_10_20.commissionVatBp;

/** Comissão de sucesso paga pelo pintor (com IVA incluído), recebida no Stripe. */
export function commissionReceived(p: { paymentIntent: string; gross: Cents; data: string }): Posting {
  const { net, vat } = splitGross(p.gross, VAT);
  return assertBalanced({
    origem: 'stripe_comissao',
    origemId: p.paymentIntent,
    data: p.data,
    descricao: 'Comissão de sucesso recebida do pintor',
    lines: [dr(ACCOUNTS.stripe.codigo, p.gross), cr(ACCOUNTS.recComissoes.codigo, net), ...(vat > 0 ? [cr(ACCOUNTS.ivaLiquidado.codigo, vat)] : [])],
  });
}

/** Caução do cliente: dinheiro de terceiros, não é rendimento. */
export function depositReceived(p: { paymentIntent: string; gross: Cents; data: string }): Posting {
  return assertBalanced({
    origem: 'stripe_caucao',
    origemId: p.paymentIntent,
    data: p.data,
    descricao: 'Caução do cliente recebida',
    lines: [dr(ACCOUNTS.stripe.codigo, p.gross), cr(ACCOUNTS.caucoesTerceiros.codigo, p.gross)],
  });
}

/** Reembolso feito no Stripe. `cumulative` é o total já reembolsado desse pagamento (torna o lançamento único). */
export function refundIssued(p: { kind: 'comissao' | 'caucao'; paymentIntent: string; cumulative: Cents; delta: Cents; data: string }): Posting {
  const lines =
    p.kind === 'caucao'
      ? [dr(ACCOUNTS.caucoesTerceiros.codigo, p.delta), cr(ACCOUNTS.stripe.codigo, p.delta)]
      : (() => {
          const { net, vat } = splitGross(p.delta, VAT);
          return [dr(ACCOUNTS.recComissoes.codigo, net), ...(vat > 0 ? [dr(ACCOUNTS.ivaLiquidado.codigo, vat)] : []), cr(ACCOUNTS.stripe.codigo, p.delta)];
        })();
  return assertBalanced({
    origem: 'stripe_reembolso',
    origemId: `${p.paymentIntent}:${p.cumulative}`,
    data: p.data,
    descricao: p.kind === 'caucao' ? 'Caução devolvida ao cliente' : 'Comissão devolvida ao pintor',
    lines,
  });
}

/** Caução que a plataforma retém: passa a rendimento, com IVA incluído (decisão de 21/10/2026). */
export function guaranteeRetained(p: { engagementId: string; cumulative: Cents; delta: Cents; data: string }): Posting {
  const { net, vat } = splitGross(p.delta, VAT);
  return assertBalanced({
    origem: 'caucao_retida',
    origemId: `${p.engagementId}:${p.cumulative}`,
    data: p.data,
    descricao: 'Caução retida pela plataforma',
    lines: [dr(ACCOUNTS.caucoesTerceiros.codigo, p.delta), cr(ACCOUNTS.recCaucoes.codigo, net), ...(vat > 0 ? [cr(ACCOUNTS.ivaLiquidado.codigo, vat)] : [])],
  });
}

/** Mensalidade paga por um fornecedor (valor pago e IVA que o Stripe indica, ou 23% se não indicar). */
export function subscriptionReceived(p: { invoiceId: string; gross: Cents; vat: Cents | null; data: string }): Posting {
  const vat = p.vat ?? splitGross(p.gross, SUBSCRIPTION_VAT_BP).vat;
  return assertBalanced({
    origem: 'stripe_subscricao',
    origemId: p.invoiceId,
    data: p.data,
    descricao: 'Mensalidade de fornecedor recebida',
    lines: [dr(ACCOUNTS.stripe.codigo, p.gross), cr(ACCOUNTS.recSubscricoes.codigo, p.gross - vat), ...(vat > 0 ? [cr(ACCOUNTS.ivaLiquidado.codigo, vat)] : [])],
  });
}

/** Comissão de adesão devida ao fornecedor: gasto, a pagar quando ele resgatar. */
export function referralAccrued(p: { payoutId: string; amount: Cents; data: string }): Posting {
  return assertBalanced({
    origem: 'comissao_adesao',
    origemId: p.payoutId,
    data: p.data,
    descricao: 'Comissão de adesão devida a fornecedor',
    lines: [dr(ACCOUNTS.gastoAdesao.codigo, p.amount), cr(ACCOUNTS.fornecedoresTintas.codigo, p.amount)],
  });
}

/** Fatura do fornecedor recebida num resgate: o IVA dedutível aumenta a dívida. Sem IVA, não há lançamento. */
export function redemptionInvoiced(p: { redemptionId: string; vat: Cents; data: string }): Posting | null {
  if (p.vat === 0) return null;
  return assertBalanced({
    origem: 'resgate_fatura',
    origemId: p.redemptionId,
    data: p.data,
    descricao: 'Fatura de fornecedor (resgate de comissões): IVA dedutível',
    lines: [dr(ACCOUNTS.ivaDedutivel.codigo, p.vat), cr(ACCOUNTS.fornecedoresTintas.codigo, p.vat)],
  });
}

/** Pagamento de um resgate: sai do banco o líquido; a retenção fica a pagar ao Estado. */
export function redemptionPaid(p: { redemptionId: string; base: Cents; vat: Cents; retention: Cents; net: Cents; data: string }): Posting {
  if (p.base + p.vat !== p.retention + p.net) throw new MoneyError('Resgate com valores que não fecham.');
  return assertBalanced({
    origem: 'resgate_pago',
    origemId: p.redemptionId,
    data: p.data,
    descricao: 'Pagamento de resgate de comissões ao fornecedor',
    lines: [dr(ACCOUNTS.fornecedoresTintas.codigo, p.base + p.vat), ...(p.retention > 0 ? [cr(ACCOUNTS.retencoes.codigo, p.retention)] : []), cr(ACCOUNTS.banco.codigo, p.net)],
  });
}

/** Estorno: o mesmo lançamento com débitos e créditos trocados, noutra origem. */
export function reverse(p: Posting, data: string): Posting {
  return assertBalanced({
    origem: `${p.origem}_estorno`,
    origemId: p.origemId,
    data,
    descricao: `Estorno: ${p.descricao}`,
    lines: p.lines.map((l) => ({ conta: l.conta, debito: l.credito, credito: l.debito })),
  });
}
