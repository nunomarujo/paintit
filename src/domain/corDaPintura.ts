// A cor escolhida para a pintura (adenda 2 do promotor, 06/11/2026).
//
// Guarda-se uma **referência em texto** — sistema + código + nome («QP-014 · Branco gelo», «RAL 9010»,
// «Barbot · Casca de Ovo») — e, só para mostrar no ecrã, um hex aproximado. A cor real é sempre a da
// amostra do fabricante: o contrato e o orçamento dizem-no.
//
// **Não se embutem as paletas RAL, NCS ou Pantone**: são proprietárias, e a reprodução (também digital)
// exige autorização. A grelha usa a paleta própria da Quem Pinta (`paleta_cores`, códigos `QP-nnn`, nomes
// e hex nossos). Quem já souber um código de outro sistema escreve-o no campo — escrever um código não é
// reproduzir a paleta — e guarda-se o texto, sem quadrado de cor. As cores de fabricante
// (`reference_products.cores`) aparecem só com nome e marca, sem quadrado.

export const AVISO_DA_COR = 'A cor final é a da amostra do fabricante; a cor no ecrã é aproximada.';

export interface CorDaPaleta {
  codigo: string;
  nome: string;
  hex: string;
  familia: string;
}

/** «QP-014 · Branco gelo». */
export const referenciaDaPaleta = (c: Pick<CorDaPaleta, 'codigo' | 'nome'>) => `${c.codigo} · ${c.nome}`;
/** «Barbot · Casca de Ovo». */
export const referenciaDeFabricante = (marca: string, cor: string) => `${marca.trim()} · ${cor.trim()}`;

export const isHex = (v: unknown): v is string => typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v);
export const isCodigoQP = (v: unknown): v is string => typeof v === 'string' && /^QP-\d{3}$/.test(v);

/**
 * A referência que o campo guarda: texto livre, aparado, até 120 caracteres, sem quebras de linha.
 * O hex só se aceita quando a referência é da paleta própria e bate com ela — nunca um hex inventado
 * para um código de outro sistema.
 */
export function lerReferenciaDeCor(texto: unknown, hex: unknown, paleta: readonly CorDaPaleta[]): { referencia: string | null; hex: string | null } {
  const ref = String(texto ?? '').replace(/\s+/g, ' ').trim().slice(0, 120);
  if (!ref) return { referencia: null, hex: null };
  const daPaleta = paleta.find((c) => referenciaDaPaleta(c) === ref);
  return { referencia: ref, hex: daPaleta && isHex(hex) && hex.toLowerCase() === daPaleta.hex.toLowerCase() ? daPaleta.hex : null };
}

/** As cores de fabricante de um produto: o campo `cores` é texto («Branco, Marfim; Areia»). */
export function coresDoFabricante(cores: string | null): string[] {
  if (!cores) return [];
  return [...new Set(cores.split(/[,;\n]/).map((c) => c.trim()).filter((c) => c.length > 1 && c.length <= 60))];
}

/** Pastilhas por família, pela ordem da paleta. */
export function porFamilia<T extends { familia: string }>(cores: readonly T[]): [string, T[]][] {
  const m = new Map<string, T[]>();
  for (const c of cores) m.set(c.familia, [...(m.get(c.familia) ?? []), c]);
  return [...m.entries()];
}
