import { percentOf, type Cents } from './money';
import { RULES_2026_10_20, RULES_2026_10_20_REF } from './rules';

export { RULES_2026_10_20_REF };

// Códigos de adesão dos fornecedores (decisão de 21/10/2026): o pintor que aplica o código de um fornecedor e ganha a obra
// paga menos 0,25 pontos de comissão à plataforma, e o fornecedor recebe 0,25% do valor da obra (+ IVA, se aplicável) quando
// a plataforma receber a comissão. Os valores ficam aqui; a base de dados repete o 0,25% (referral_payouts) e há um teste que os confirma.

/** Desconto na comissão do pintor e comissão do fornecedor, ambos em pontos-base do valor sem IVA (0,25%). */
export const REFERRAL_BPS = 25;

/** Sufixo da versão das regras de uma contratação com código aplicado (ver `private.proposal_selected`). */
export const REFERRAL_SUFFIX = '+ref';

/** O que o fornecedor recebe (sem IVA) pela obra de um pintor que usou o seu código. */
export const supplierCommission = (base: Cents): Cents => percentOf(base, REFERRAL_BPS);

/** IVA da comissão do fornecedor, se este o cobrar (taxa normal). */
export const supplierCommissionVat = (net: Cents, chargesVat: boolean, vatBp = RULES_2026_10_20.commissionVatBp): Cents => (chargesVat ? percentOf(net, vatBp) : 0);

export const REFERRAL_STATES = ['adjudicada', 'fatura_recebida', 'paga', 'sem_efeito'] as const;
export type ReferralState = (typeof REFERRAL_STATES)[number];

/** Estado de uma comissão vista pelo fornecedor: adjudicada → disponível (saldo) → em resgate → paga. */
export function payoutStatus(p: { estado: ReferralState; feeRecebidoEm: string | null; redemptionId?: string | null }): { key: 'sem_efeito' | 'paga' | 'em_resgate' | 'disponivel' | 'adjudicada'; label: string } {
  if (p.estado === 'sem_efeito') return { key: 'sem_efeito', label: 'Sem efeito' };
  if (p.estado === 'paga') return { key: 'paga', label: 'Paga' };
  if (p.redemptionId) return { key: 'em_resgate', label: 'Em resgate' };
  if (p.feeRecebidoEm) return { key: 'disponivel', label: 'No saldo, disponível para resgatar' };
  return { key: 'adjudicada', label: 'Obra adjudicada, a aguardar a comissão do pintor' };
}

/** Saldo de um fornecedor, em cêntimos. */
export function supplierBalance(payouts: { estado: ReferralState; feeRecebidoEm: string | null; redemptionId: string | null; amount: number }[]) {
  const by = { disponivel: 0, adjudicada: 0, em_resgate: 0, paga: 0 };
  for (const p of payouts) {
    const k = payoutStatus(p).key;
    if (k !== 'sem_efeito') by[k] += p.amount;
  }
  return by;
}

/** Valores de um resgate: comissão + IVA (se cobra) − retenção. Igual à função da base de dados (referral_request_redemption). */
export function redemptionAmounts(total: Cents, cobraIva: boolean, retencaoBps: number, vatBp = RULES_2026_10_20.commissionVatBp) {
  const iva = cobraIva ? percentOf(total, vatBp) : 0;
  const retencao = percentOf(total, retencaoBps);
  return { iva, retencao, liquido: total + iva - retencao };
}

/** Código novo: 8 caracteres sem os ambíguos (0, O, 1, I). */
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export function newReferralCode(random: (n: number) => number = (n) => Math.floor(Math.random() * n)): string {
  return Array.from({ length: 8 }, () => ALPHABET[random(ALPHABET.length)]).join('');
}

export const normalizeCode = (s: string) => s.replace(/[\s-]/g, '').toUpperCase();

/** IBAN português: PT50 + 21 algarismos, com o dígito de controlo (módulo 97) certo. */
export function isValidPtIban(input: string): boolean {
  const iban = input.replace(/\s/g, '').toUpperCase();
  if (!/^PT50\d{21}$/.test(iban)) return false;
  const rearranged = iban.slice(4) + iban.slice(0, 4);
  const digits = rearranged.replace(/[A-Z]/g, (c) => String(c.charCodeAt(0) - 55));
  let rem = 0;
  for (const ch of digits) rem = (rem * 10 + Number(ch)) % 97;
  return rem === 1;
}
