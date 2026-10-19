import type { Cents } from './money';

// Parâmetros comerciais em vigor. Uma alteração cria uma nova versão e nunca
// muda contratações já iniciadas: cada contratação guarda a versão que aplicou.
// Decisões e estado: docs/DECISOES.md.

export interface CommercialRules {
  version: string;
  /** Comissão do pintor, em pontos-base sobre o valor sem IVA. */
  commissionBp: number;
  commissionMinCents: Cents;
  /** Garantia do cliente, em pontos-base sobre o valor sem IVA. */
  guaranteeBp: number;
  /** Em aberto: o promotor ainda não decidiu se o mínimo se aplica à garantia. */
  guaranteeMinCents: Cents;
  /** IVA que acresce à comissão (taxa normal do continente). */
  commissionVatBp: number;
  /** Dias corridos para o fee entrar na conta, contados da notificação ao pintor. */
  feeDeadlineDays: number;
  /** Em aberto (proposta): dias corridos para o pintor assinar depois de pagar. */
  signDeadlineDays: number;
  timeZone: string;
}

export const RULES_2026_10: CommercialRules = {
  version: '2026-10-18',
  commissionBp: 300,
  commissionMinCents: 15_000,
  guaranteeBp: 300,
  guaranteeMinCents: 15_000,
  commissionVatBp: 2_300,
  feeDeadlineDays: 8,
  signDeadlineDays: 8,
  timeZone: 'Europe/Lisbon',
};

export const CURRENT_RULES = RULES_2026_10;

/** Todas as versões, para reconstruir contratações antigas com as regras que aplicaram. */
export const RULES_BY_VERSION: Record<string, CommercialRules> = {
  [RULES_2026_10.version]: RULES_2026_10,
};
