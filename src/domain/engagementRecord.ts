import type { EngagementRecord } from './contracting';

/** Os campos de uma linha de `engagements` de que `toEngagementRecord` precisa — não o tipo gerado inteiro,
 * para este mapeamento continuar puro e testável sem um cliente Supabase. */
export interface EngagementRowLike {
  id: string;
  base_cents: number;
  advance_cents: number;
  rules_version: string;
  /** Coluna aditiva (migração 20261022040000): pode não existir ainda na linha devolvida pela base de dados —
   * `undefined`, não `null` — quando a migração não chegou a correr lá. */
  referral_discount_bp?: number | null;
  created_at: string;
}

/**
 * Linha de `engagements` para o registo que `replay()` espera.
 *
 * `referral_discount_bp` é aditivo à tabela: uma base de dados em que a migração correspondente ainda não
 * correu simplesmente não devolve a coluna, não é `null` — chega como `undefined`. A própria coluna nasce
 * `not null default 0` (contratações sem desconto), por isso replicar aqui o mesmo valor por omissão, em vez
 * de deixar passar `undefined` para a matemática de dinheiro adiante: `applyPainterDiscount` fazia
 * `commissionBp - undefined` = `NaN`, e `assertCents` rejeita NaN com um `MoneyError` que `replay()` não
 * apanha (só apanha `EngagementError`, e só à volta de cada acontecimento, não da criação da contratação) —
 * o erro subia sem tratamento até à página do backoffice, que reconstrói todas as contratações a cada visita,
 * e a derrubava inteira com um "server-side exception" (23/10/2026, ver docs/ESTADO.md).
 */
export function toEngagementRecord(row: EngagementRowLike, carried?: EngagementRecord['carried']): EngagementRecord {
  return {
    id: row.id,
    base: row.base_cents,
    advance: row.advance_cents,
    rulesVersion: row.rules_version,
    referralDiscountBp: row.referral_discount_bp ?? 0,
    createdAt: row.created_at,
    carried,
  };
}
