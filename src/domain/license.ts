import type { Cents } from './money';

// Habilitação do empreiteiro consoante o valor da obra sem IVA (parecer jurídico
// de 19/10/2026, pergunta C1). Até 40 000 € basta o certificado de empreiteiro de
// obras particulares; acima, alvará com classe suficiente. Os títulos de obras
// particulares não discriminam categorias. Prestadores estrangeiros e outros
// regimes ficam para verificação manual da equipa.

export const LICENSE_CLASS_LIMITS: Cents[] = [
  20_000_000, // classe 1: até 200 000 €
  40_000_000, // classe 2: até 400 000 €
  80_000_000, // classe 3: até 800 000 €
];
export const CERTIFICATE_LIMIT: Cents = 4_000_000; // 40 000 €

export type LicenseNeed = { kind: 'certificado' } | { kind: 'alvara'; classe: number };

export function requiredLicense(base: Cents): LicenseNeed {
  if (base <= CERTIFICATE_LIMIT) return { kind: 'certificado' };
  const i = LICENSE_CLASS_LIMITS.findIndex((limit) => base <= limit);
  return { kind: 'alvara', classe: i === -1 ? LICENSE_CLASS_LIMITS.length + 1 : i + 1 };
}

export interface HeldLicense {
  kind: 'certificado' | 'alvara';
  classe: number | null;
}

/** O pintor tem habilitação validada suficiente para este valor. */
export function hasLicenseFor(base: Cents, held: HeldLicense[]): boolean {
  const need = requiredLicense(base);
  if (need.kind === 'certificado') return held.length > 0;
  return held.some((h) => h.kind === 'alvara' && (h.classe ?? 0) >= need.classe);
}

export function licenseLabel(need: LicenseNeed): string {
  return need.kind === 'certificado'
    ? 'certificado de empreiteiro de obras particulares (ou alvará)'
    : `alvará de classe ${need.classe} ou superior`;
}
