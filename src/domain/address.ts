// Validação de moradas portuguesas contra a lista oficial de arruamentos de cada código
// postal (CTT, servida pelo geoapi.pt). A morada escrita tem de começar pelo nome de uma
// das ruas desse código postal; o número de porta e o andar vêm depois.

const ABBREVIATIONS: [RegExp, string][] = [
  [/^r\.?\s/, 'rua '],
  [/^av\.?\s/, 'avenida '],
  [/^tv\.?\s|^trav\.?\s/, 'travessa '],
  [/^lg\.?\s/, 'largo '],
  [/^pc\.?\s|^pç\.?\s|^pr\.?\s/, 'praca '],
  [/^estr?\.?\s/, 'estrada '],
  [/^calc?\.?\s|^cç\.?\s/, 'calcada '],
  [/^al\.?\s/, 'alameda '],
  [/^bc\.?\s/, 'beco '],
  [/^qta\.?\s/, 'quinta '],
  [/^urb\.?\s/, 'urbanizacao '],
];

/** Minúsculas, sem acentos nem pontuação, com as abreviaturas por extenso. */
export function normalizeStreet(s: string): string {
  let t = s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[.,;:º°ª"'()]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  for (const [re, full] of ABBREVIATIONS) t = t.replace(re, full);
  return t.replace(/\b(de|da|do|das|dos|e)\b/g, ' ').replace(/\s+/g, ' ').trim();
}

/** A parte da morada antes do número de porta (ou da vírgula). */
export function streetPart(morada: string): string {
  const beforeComma = morada.split(',')[0] ?? morada;
  return beforeComma.replace(/\s+(n\.?º?|nº|numero|número)?\s*\d+.*$/i, '').trim();
}

/** A morada escrita corresponde a uma das ruas do código postal? */
export function matchesStreet(morada: string, ruas: string[]): string | null {
  const input = normalizeStreet(streetPart(morada));
  if (input.length < 3) return null;
  for (const rua of ruas) {
    const n = normalizeStreet(rua);
    if (input === n || input.startsWith(n + ' ') || (n.startsWith(input) && input.length >= n.length * 0.8)) return rua;
  }
  return null;
}

export interface PostalCodeInfo {
  cp: string;
  localidade: string;
  concelho: string;
  distrito: string;
  ruas: string[];
}

/** Porque é que a morada não serve, ou null se serve. `info` null = código postal inexistente. */
export function addressProblem(morada: string, cp: string, info: PostalCodeInfo | null): string | null {
  if (!info) return `O código postal ${cp} não existe.`;
  if (info.ruas.length === 0) return null; // códigos postais de localidade, sem ruas discriminadas
  if (matchesStreet(morada, info.ruas)) return null;
  const sugestoes = info.ruas.slice(0, 4).join('; ');
  return `A rua não corresponde ao código postal ${cp}. Ruas deste código: ${sugestoes}${info.ruas.length > 4 ? '…' : ''}`;
}
