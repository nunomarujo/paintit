// Fotografias de um pedido. Regras (decisão do promotor, 18/10/2026):
// - as fotografias gerais nunca saem da entidade: servem só para a equipa da
//   plataforma confirmar o pedido e nunca chegam aos pintores;
// - as fotografias de pormenor (uma fissura, um teto de varanda) chegam aos
//   pintores só depois de uma pessoa da equipa da plataforma confirmar que não
//   identificam o prédio;
// - o volume 3D do anúncio é gerado a partir dos dados do prédio, nunca das
//   fotografias (ver volume.ts).
// Antes de guardar, os metadados da imagem (EXIF com GPS, data, aparelho) são
// retirados, para que nem a cópia original revele onde foi tirada.

export const PHOTO_KINDS = ['geral', 'pormenor'] as const;
export type PhotoKind = (typeof PHOTO_KINDS)[number];
export const PHOTO_KIND_LABELS: Record<PhotoKind, string> = {
  geral: 'Geral (fica privada)',
  pormenor: 'Pormenor (pode ir para o anúncio)',
};

export const PHOTO_REVIEW_LABELS = {
  pendente: 'À espera de revisão',
  aprovada: 'Aprovada para o anúncio',
  rejeitada: 'Não vai para o anúncio',
} as const;
export type PhotoReview = keyof typeof PHOTO_REVIEW_LABELS;

export const MAX_PHOTO_BYTES = 10 * 1024 * 1024;
export const MAX_PHOTOS_PER_REQUEST = 20;

export type ImageType = 'image/jpeg' | 'image/png';

/** Tipo real da imagem pelos primeiros bytes (não confia na extensão nem no navegador). */
export function sniffImage(bytes: Uint8Array): ImageType | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg';
  const png = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  if (bytes.length >= 8 && png.every((b, i) => bytes[i] === b)) return 'image/png';
  return null;
}

const ascii = (bytes: Uint8Array, start: number, length: number) =>
  String.fromCharCode(...bytes.subarray(start, start + length));

function concat(parts: Uint8Array[]): Uint8Array {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let at = 0;
  for (const p of parts) {
    out.set(p, at);
    at += p.length;
  }
  return out;
}

/**
 * JPEG sem metadados: retira APP1 (EXIF e XMP, onde estão o GPS e o aparelho),
 * APP3–APP15 e comentários. Mantém JFIF (APP0) e o perfil de cor (APP2 ICC).
 * Devolve null se o ficheiro não for um JPEG bem formado.
 */
export function stripJpegMetadata(bytes: Uint8Array): Uint8Array | null {
  if (sniffImage(bytes) !== 'image/jpeg') return null;
  const parts: Uint8Array[] = [bytes.subarray(0, 2)];
  let i = 2;
  while (i + 4 <= bytes.length) {
    if (bytes[i] !== 0xff) return null;
    const marker = bytes[i + 1]!;
    // Início dos dados da imagem: o resto copia-se tal como está.
    if (marker === 0xda) {
      parts.push(bytes.subarray(i));
      return concat(parts);
    }
    const length = (bytes[i + 2]! << 8) | bytes[i + 3]!;
    if (length < 2 || i + 2 + length > bytes.length) return null;
    const segment = bytes.subarray(i, i + 2 + length);
    const isApp = marker >= 0xe1 && marker <= 0xef;
    const isIcc = marker === 0xe2 && ascii(bytes, i + 4, 11) === 'ICC_PROFILE';
    if (!((isApp && !isIcc) || marker === 0xfe)) parts.push(segment);
    i += 2 + length;
  }
  return null;
}

const PNG_DROPPED = new Set(['tEXt', 'zTXt', 'iTXt', 'eXIf', 'tIME']);

/** PNG sem blocos de texto, EXIF e data. Devolve null se não for um PNG bem formado. */
export function stripPngMetadata(bytes: Uint8Array): Uint8Array | null {
  if (sniffImage(bytes) !== 'image/png') return null;
  const parts: Uint8Array[] = [bytes.subarray(0, 8)];
  let i = 8;
  while (i + 12 <= bytes.length) {
    const length = ((bytes[i]! << 24) | (bytes[i + 1]! << 16) | (bytes[i + 2]! << 8) | bytes[i + 3]!) >>> 0;
    const type = ascii(bytes, i + 4, 4);
    const end = i + 12 + length;
    if (end > bytes.length) return null;
    if (!PNG_DROPPED.has(type)) parts.push(bytes.subarray(i, end));
    if (type === 'IEND') return concat(parts);
    i = end;
  }
  return null;
}

/** Valida e limpa uma imagem enviada. */
export function cleanPhoto(bytes: Uint8Array): { type: ImageType; bytes: Uint8Array } | { error: string } {
  if (bytes.length === 0) return { error: 'Escolha uma fotografia.' };
  if (bytes.length > MAX_PHOTO_BYTES) return { error: 'A fotografia tem mais de 10 MB.' };
  const type = sniffImage(bytes);
  if (!type) return { error: 'Só fotografias JPG ou PNG.' };
  const clean = type === 'image/jpeg' ? stripJpegMetadata(bytes) : stripPngMetadata(bytes);
  if (!clean) return { error: 'A fotografia parece danificada. Tente exportá-la de novo.' };
  return { type, bytes: clean };
}
