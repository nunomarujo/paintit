import { splitGross } from './accounting/entries';
import type { Cents } from './money';
import { RULES_2026_10_20 } from './rules';
import { SUBSCRIPTION_VAT_BP } from './subscription';

// Faturação certificada (Moloni): que documento fiscal cada acontecimento de negócio exige, e os valores que leva.
// Funções puras e testadas; a chamada à API e a gravação estão em src/lib/moloni.ts e nas ações do backoffice.
// A plataforma emite faturas por três motivos: comissão de sucesso (pintor), subscrição (fornecedor) e caução retida
// (cliente). As comissões de adesão são o inverso: o fornecedor fatura a plataforma (ver docs/CONTABILIDADE.md).

export const INVOICE_REASONS = ['comissao', 'subscricao', 'caucao_retida'] as const;
export type InvoiceReason = (typeof INVOICE_REASONS)[number];

export const DOCUMENT_TYPES = ['FT', 'NC'] as const;
export type DocumentType = (typeof DOCUMENT_TYPES)[number];

export interface InvoiceCustomer {
  nome: string;
  nif: string | null;
  morada: string | null;
  codigoPostal: string | null;
  localidade: string | null;
}

export interface InvoiceLine {
  descricao: string;
  quantidade: number;
  precoUnitario: Cents;
  /** Código de isenção da AT (M01–M99), ou null quando há IVA. */
  isencao: string | null;
  ivaBp: number;
}

export interface InvoiceDraft {
  reason: InvoiceReason;
  /** Tipo de origem (stripe_payment, subscription_payment, engagement) e o seu id: a chave de idempotência. */
  originType: string;
  originId: string;
  tipo: DocumentType;
  data: string;
  customer: InvoiceCustomer;
  lines: InvoiceLine[];
  /** Documento a que esta nota de crédito se refere (só quando tipo = NC). */
  referencia?: { originType: string; originId: string };
}

const lineTotal = (l: InvoiceLine) => Math.round((l.quantidade * l.precoUnitario) / 100);
export const invoiceTotal = (lines: InvoiceLine[]) => lines.reduce((n, l) => n + lineTotal(l), 0);

/** Consumidor final sem NIF: a Moloni (e a AT) tratam-no por omissão de NIF, nunca com um NIF fictício. */
export const FINAL_CONSUMER: InvoiceCustomer = { nome: 'Consumidor final', nif: null, morada: null, codigoPostal: null, localidade: null };

const VAT = RULES_2026_10_20.commissionVatBp;

/** Fatura da comissão de sucesso ao pintor: o valor (com IVA) já entrou na conta Stripe. */
export function commissionInvoice(p: { paymentIntent: string; gross: Cents; data: string; pintor: InvoiceCustomer }): InvoiceDraft {
  const { net } = splitGross(p.gross, VAT);
  return {
    reason: 'comissao',
    originType: 'stripe_payment',
    originId: p.paymentIntent,
    tipo: 'FT',
    data: p.data,
    customer: p.pintor,
    lines: [{ descricao: 'Comissão de sucesso — apresentação de cliente', quantidade: 100, precoUnitario: net, isencao: null, ivaBp: VAT }],
  };
}

/** Nota de crédito quando a comissão é devolvida (ex.: o cliente desistiu sem culpa do pintor). */
export function commissionCreditNote(p: { paymentIntent: string; refundCumulative: Cents; data: string; pintor: InvoiceCustomer }): InvoiceDraft {
  const { net } = splitGross(p.refundCumulative, VAT);
  return {
    reason: 'comissao',
    originType: 'stripe_refund',
    originId: `${p.paymentIntent}:${p.refundCumulative}`,
    tipo: 'NC',
    data: p.data,
    customer: p.pintor,
    lines: [{ descricao: 'Devolução da comissão de sucesso', quantidade: 100, precoUnitario: net, isencao: null, ivaBp: VAT }],
    referencia: { originType: 'stripe_payment', originId: p.paymentIntent },
  };
}

/** Fatura da mensalidade ao fornecedor. */
export function subscriptionInvoice(p: { stripeInvoiceId: string; planLabel: string; gross: Cents; vat: Cents | null; data: string; fornecedor: InvoiceCustomer }): InvoiceDraft {
  const vat = p.vat ?? splitGross(p.gross, SUBSCRIPTION_VAT_BP).vat;
  const net = p.gross - vat;
  const ivaBp = net > 0 ? Math.round((vat * 10_000) / net) : SUBSCRIPTION_VAT_BP;
  return {
    reason: 'subscricao',
    originType: 'subscription_payment',
    originId: p.stripeInvoiceId,
    tipo: 'FT',
    data: p.data,
    customer: p.fornecedor,
    lines: [{ descricao: `Subscrição — ${p.planLabel}`, quantidade: 100, precoUnitario: net, isencao: null, ivaBp }],
  };
}

/** Fatura da caução retida ao cliente (sempre com IVA, extraído do valor retido: decisão de 21/10/2026). */
export function retainedGuaranteeInvoice(p: { engagementId: string; cumulative: Cents; data: string; cliente: InvoiceCustomer }): InvoiceDraft {
  const { net } = splitGross(p.cumulative, VAT);
  return {
    reason: 'caucao_retida',
    originType: 'engagement',
    originId: `${p.engagementId}:${p.cumulative}`,
    tipo: 'FT',
    data: p.data,
    customer: p.cliente.nif ? p.cliente : FINAL_CONSUMER,
    lines: [{ descricao: 'Caução retida — não conclusão da contratação', quantidade: 100, precoUnitario: net, isencao: null, ivaBp: VAT }],
  };
}
