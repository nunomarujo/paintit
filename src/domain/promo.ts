import { assertCents, type Cents } from './money';

// Códigos promocionais para a subscrição dos fornecedores no catálogo. A plataforma
// não recebe nada dos fornecedores pelas transações; só a subscrição (decisão de 20/10/2026).

export const PROMO_MIN_BPS = 100;
export const PROMO_MAX_BPS = 10_000;

export interface PromoCode {
  code: string;
  discountBps: number;
  validUntil: string | null;
  maxUses: number | null;
  uses: number;
  active: boolean;
}

/** Normaliza o código: maiúsculas, só letras, dígitos e hífen, 4 a 32 caracteres. */
export function normalizeCode(raw: string): string | null {
  const c = raw.trim().toUpperCase();
  return /^[A-Z0-9-]{4,32}$/.test(c) ? c : null;
}

/** Desconto entre 1% e 100%, em pontos-base inteiros. */
export function parseDiscountPercent(raw: string): number | null {
  const n = Number(raw.replace(',', '.'));
  if (!Number.isFinite(n)) return null;
  const bps = Math.round(n * 100);
  return bps >= PROMO_MIN_BPS && bps <= PROMO_MAX_BPS ? bps : null;
}

/** Porque é que o código não se pode usar hoje, ou null se pode. */
export function promoBlocker(p: PromoCode, today: string): string | null {
  if (!p.active) return 'Código desativado.';
  if (p.validUntil && p.validUntil < today) return 'Código expirado.';
  if (p.maxUses !== null && p.uses >= p.maxUses) return 'Código esgotado.';
  return null;
}

/** Preço com desconto, arredondado ao cêntimo a favor do fornecedor. */
export function discountedPrice(price: Cents, discountBps: number): Cents {
  assertCents(price, 'preço');
  if (discountBps < PROMO_MIN_BPS || discountBps > PROMO_MAX_BPS) throw new Error('Desconto fora de 1% a 100%.');
  return price - Math.ceil((price * discountBps) / 10_000);
}
