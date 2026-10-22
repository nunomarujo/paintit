import { describe, expect, it } from 'vitest';
import { commissionCreditNote, commissionInvoice, FINAL_CONSUMER, invoiceTotal, retainedGuaranteeInvoice, subscriptionInvoice } from './invoicing';

const D = '2026-10-22';
const painter = { nome: 'Pinturas X Lda', nif: '509442013', morada: 'Rua A', codigoPostal: '1000-001', localidade: 'Lisboa' };

describe('faturação: o que cada acontecimento exige', () => {
  it('comissão: a base é extraída do valor com IVA já recebido', () => {
    const d = commissionInvoice({ paymentIntent: 'pi_1', gross: 18_450, data: D, pintor: painter });
    expect(d.tipo).toBe('FT');
    expect(d.lines[0]!.precoUnitario).toBe(15_000);
    expect(d.lines[0]!.ivaBp).toBe(2_300);
    expect(invoiceTotal(d.lines)).toBe(15_000);
    expect(d.originType).toBe('stripe_payment');
  });

  it('devolução da comissão gera nota de crédito ligada ao documento original', () => {
    const nc = commissionCreditNote({ paymentIntent: 'pi_1', refundCumulative: 18_450, data: D, pintor: painter });
    expect(nc.tipo).toBe('NC');
    expect(nc.referencia).toEqual({ originType: 'stripe_payment', originId: 'pi_1' });
    expect(nc.originId).toBe('pi_1:18450');
  });

  it('subscrição: usa o IVA real do Stripe quando o tem, senão 23%', () => {
    const a = subscriptionInvoice({ stripeInvoiceId: 'in_1', planLabel: 'Catálogo de produtos', gross: 4_797, vat: 897, data: D, fornecedor: painter });
    expect(a.lines[0]!.precoUnitario).toBe(3_900);
    const b = subscriptionInvoice({ stripeInvoiceId: 'in_2', planLabel: 'Catálogo de produtos', gross: 4_797, vat: null, data: D, fornecedor: painter });
    expect(b.lines[0]!.precoUnitario).toBe(3_900);
    expect(b.lines[0]!.ivaBp).toBe(2_300);
  });

  it('caução retida: sempre com IVA, e consumidor final sem NIF nunca leva um NIF fictício', () => {
    const withNif = retainedGuaranteeInvoice({ engagementId: 'e1', cumulative: 15_000, data: D, cliente: { nome: 'Condomínio', nif: '501234560', morada: null, codigoPostal: null, localidade: null } });
    expect(withNif.customer.nif).toBe('501234560');
    const noNif = retainedGuaranteeInvoice({ engagementId: 'e2', cumulative: 15_000, data: D, cliente: { nome: 'Particular', nif: null, morada: null, codigoPostal: null, localidade: null } });
    expect(noNif.customer).toEqual(FINAL_CONSUMER);
    expect(noNif.lines[0]!.ivaBp).toBe(2_300);
  });
});
