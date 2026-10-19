import type { Cents } from './money';

// Parâmetros comerciais em vigor. Uma alteração cria uma nova versão e nunca
// muda contratações já iniciadas: cada contratação guarda a versão que aplicou.
// Decisões e estado: docs/DECISOES.md.

export interface CommercialRules {
  version: string;
  /** Comissão do pintor, em pontos-base sobre o valor sem IVA. */
  commissionBp: number;
  commissionMinCents: Cents;
  /** Caução do cliente, em pontos-base sobre o valor sem IVA. */
  guaranteeBp: number;
  /** Mínimo da caução (150 €, igual ao da comissão). */
  guaranteeMinCents: Cents;
  /** IVA que acresce à comissão (taxa normal do continente). */
  commissionVatBp: number;
  /** Dias corridos para o fee entrar na conta, contados da notificação ao pintor. */
  feeDeadlineDays: number;
  /** Em aberto (proposta): dias corridos para o pintor assinar depois de pagar. */
  signDeadlineDays: number;
  timeZone: string;
  /** Percurso: v1 (cliente assina antes da apresentação) ou v2 (apresentação antes das assinaturas). */
  flow?: 'v1' | 'v2';
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

/**
 * 19/10/2026: percurso v2, decidido pelo promotor depois do parecer jurídico. A
 * caução é garantia de interesse, depositada antes da apresentação e devolvida na
 * assinatura. Os valores mantêm-se.
 */
export const RULES_2026_10_19: CommercialRules = { ...RULES_2026_10, version: '2026-10-19', flow: 'v2' };

/** 20/10/2026: o promotor mantém o mínimo de 150 € também na caução (garante contra desistência fraudulenta e contorno da plataforma). Valores iguais aos de 19/10. */
export const RULES_2026_10_20: CommercialRules = { ...RULES_2026_10_19, version: '2026-10-20', guaranteeMinCents: 15_000 };

export const CURRENT_RULES = RULES_2026_10_20;

/** Todas as versões, para reconstruir contratações antigas com as regras que aplicaram. */
export const RULES_BY_VERSION: Record<string, CommercialRules> = {
  [RULES_2026_10.version]: RULES_2026_10,
  [RULES_2026_10_19.version]: RULES_2026_10_19,
  [RULES_2026_10_20.version]: RULES_2026_10_20,
};
