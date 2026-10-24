import { addCalendarMonths, type IsoDate } from './deadline';
import { percentOf, type Cents } from './money';
import { RULES_2026_10_20, RULES_2026_10_20_REF, type CommercialRules } from './rules';

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

// Decisão de 22/10/2026 (docs/DECISOES.md): o código de adesão deixa de ser "um código, uma obra" para passar a
// desconto em vigor em todas as propostas futuras do pintor, enquanto tiver fornecedores com código ligado. O
// desconto do pintor não cresce com o volume do fornecedor — isso só muda o que o fornecedor recebe.

/** Desconto do pintor: os mesmos 0,25 p.p. de sempre, um por fornecedor com código ligado, somados (ex.: dois
 * fornecedores ligados dão 0,5 p.p.). Sem teto próprio — só o teto conjunto com as referências de fornecedores
 * (`combinedPainterDiscountBp`) limita isto. */
export function linkedSupplierDiscountBp(linkedSupplierCount: number): number {
  if (!Number.isInteger(linkedSupplierCount) || linkedSupplierCount < 0) return 0;
  return REFERRAL_BPS * linkedSupplierCount;
}

/** Teto conjunto dos dois descontos do pintor (códigos de adesão + referências de fornecedores, Q(n) em
 * `referralEligibility.ts`) — decisão de 22/10/2026, "dá margem": não se espera atingir-se na prática. */
export const MAX_COMBINED_PAINTER_DISCOUNT_BP = 800;

/** Soma os dois descontos do pintor e aplica o teto conjunto. */
export function combinedPainterDiscountBp(linkedCodesBp: number, referralsBp: number): number {
  return Math.min(linkedCodesBp + referralsBp, MAX_COMBINED_PAINTER_DISCOUNT_BP);
}

/** As regras comerciais com o desconto do pintor já aplicado à comissão, nunca abaixo de zero (o mínimo em euros,
 * `commissionMinCents`, continua a proteger a plataforma de uma comissão ínfima — ver `commission.ts`). */
export function applyPainterDiscount(rules: CommercialRules, discountBp: number): CommercialRules {
  // O piso é da versão das regras: nenhum desconto, nem todos empilhados, o atravessa (24/10/2026).
  // Versões antigas não tinham piso e continuam a descer até zero, para que contratações já
  // iniciadas se reconstruam exatamente como foram.
  const piso = rules.commissionFloorBp ?? 0;
  return { ...rules, commissionBp: Math.max(piso, rules.commissionBp - discountBp) };
}

// Comissão do fornecedor nos códigos de adesão: sobe de 1% para 2% ao alcançar a 3.ª obra — de qualquer pintor que
// referenciou, não só deste código — nos 2 meses anteriores a esta. Janela corrida (não bimestre de calendário) e
// nunca retroativa: cada vitória resolve a sua própria taxa a partir só das vitórias anteriores, gravada uma vez
// (como já acontece com `amount_cents`) e nunca recalculada depois.

export const SUPPLIER_TIER_WINDOW_MONTHS = 2;
export const SUPPLIER_TIER_WIN_THRESHOLD = 3;
export const SUPPLIER_BASE_COMMISSION_BP = 100;
export const SUPPLIER_TIER_COMMISSION_BP = 200;

/** Quantas das vitórias anteriores (de qualquer pintor referenciado por este fornecedor) caem na janela corrida
 * de `SUPPLIER_TIER_WINDOW_MONTHS` meses que termina em `at`, inclusive nos dois limites. */
export function priorWinsInSupplierWindow(priorWinDates: IsoDate[], at: IsoDate): number {
  const from = addCalendarMonths(at, -SUPPLIER_TIER_WINDOW_MONTHS);
  return priorWinDates.filter((w) => w >= from && w <= at).length;
}

/** A taxa desta vitória (em pontos-base), a partir só das vitórias já registadas antes dela. */
export function supplierCommissionBpAt(priorWinDates: IsoDate[], at: IsoDate): number {
  const priorInWindow = priorWinsInSupplierWindow(priorWinDates, at);
  return priorInWindow + 1 >= SUPPLIER_TIER_WIN_THRESHOLD ? SUPPLIER_TIER_COMMISSION_BP : SUPPLIER_BASE_COMMISSION_BP;
}
