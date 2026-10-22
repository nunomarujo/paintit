import { addCalendarMonths, type IsoDate } from './deadline';

/**
 * Elegibilidade e desconto por fornecedores referidos (Algoritmo de determinação de fee, secção 7, v1).
 * Substitui o desconto fixo de 0,25 p.p. por código (src/domain/referral.ts, REFERRAL_BPS) por um desconto que varia
 * com o número de fornecedores *atualmente elegíveis* que o pintor referiu — não com ter "usado um código" numa
 * proposta. Funções puras e sem estado: dão-se as datas de adesão e um instante, e calcula-se tudo de novo.
 *
 * ◆ Em aberto no documento (secção 10, "Pontos ainda a aprovar"): se a data que inicia a janela de 12 meses é a da
 * inscrição ou a da ativação validada. Aqui usa-se a **ativação validada** (registo concluído e validado, catálogo
 * aprovado e publicado), que é a opção que o documento justifica ("não reduzir o período devido ao tempo de
 * validação"). Mudar, se vier a ser outra a decisão.
 */

/** Máximo do desconto por referências, em pontos-base (4 p.p.). */
export const MAX_REFERRAL_DISCOUNT_BP = 400;

/**
 * Q(n): desconto em pontos-base, pelo número de fornecedores atualmente elegíveis.
 * Q(0)=0; Q(1)=1pp; Q(n)=min(4pp, 1,75pp + 0,50pp×(n−2)) para n≥2 — ver Tabela 6 do documento.
 */
export function referralDiscountBp(n: number): number {
  if (!Number.isInteger(n) || n < 0) return 0;
  if (n === 0) return 0;
  if (n === 1) return 100;
  return Math.min(MAX_REFERRAL_DISCOUNT_BP, 175 + 50 * (n - 2));
}

export interface ReferralWindow {
  /** Início da elegibilidade (inclusive): a data de ativação validada do fornecedor referido. */
  from: IsoDate;
  /** Fim da elegibilidade (exclusive): o aniversário, 12 meses depois. */
  until: IsoDate;
}

/** Janela de 12 meses de calendário a partir da ativação validada: inclusive no início, exclusive no fim. */
export function referralWindow(adesaoElegivel: IsoDate): ReferralWindow {
  return { from: adesaoElegivel, until: addCalendarMonths(adesaoElegivel, 12) };
}

/** Elegível no instante `at`? `from` inclusive, `until` exclusive. */
export function isReferralEligible(adesaoElegivel: IsoDate, at: IsoDate): boolean {
  const { from, until } = referralWindow(adesaoElegivel);
  return at >= from && at < until;
}

export interface ReferredSupplier {
  /** Identifica a entidade fiscal referida (um benefício por entidade: ver `oneBenefitPerEntity`). */
  nif: string;
  /** Quando o convite foi aceite e confirmado no registo; null = convite pendente, não conta. */
  conviteConfirmadoEm: IsoDate | null;
  /** Quando o registo ficou concluído e validado, com catálogo aprovado e publicado; null = ainda não elegível. */
  adesaoElegivelEm: IsoDate | null;
}

/** Um benefício por entidade fiscal nova, atribuído ao primeiro convite aceite e confirmado no registo
 * (secção 7, "Atribuição e controlo"). Descarta convites pendentes e entidades ainda não ativadas. */
export function oneBenefitPerEntity(suppliers: ReferredSupplier[]): { nif: string; adesaoElegivelEm: IsoDate }[] {
  const byNif = new Map<string, ReferredSupplier>();
  for (const s of suppliers) {
    if (!s.conviteConfirmadoEm || !s.adesaoElegivelEm) continue;
    const prev = byNif.get(s.nif);
    if (!prev || s.conviteConfirmadoEm < prev.conviteConfirmadoEm!) byNif.set(s.nif, s);
  }
  return [...byNif.values()].map((s) => ({ nif: s.nif, adesaoElegivelEm: s.adesaoElegivelEm! }));
}

/** Quantos fornecedores referidos estão elegíveis no instante `at` ("contam os elegíveis no instante de cálculo"). */
export function countEligibleReferrals(suppliers: ReferredSupplier[], at: IsoDate): number {
  return oneBenefitPerEntity(suppliers).filter((s) => isReferralEligible(s.adesaoElegivelEm, at)).length;
}

/** O desconto do pintor por referências, no instante `at`, em pontos-base. Combina a contagem e Q(n). */
export function referralDiscountFor(suppliers: ReferredSupplier[], at: IsoDate): number {
  return referralDiscountBp(countEligibleReferrals(suppliers, at));
}
