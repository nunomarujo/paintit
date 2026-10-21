// Validação do NIF português: 9 algarismos, prefixo admissível e dígito de
// controlo (módulo 11). A mesma regra existe na base de dados
// (private.nif_valido) e os dois têm de concordar: ver nif.test.ts.

const VALID_FIRST_DIGITS = new Set(['1', '2', '3', '5', '6', '7', '8', '9']);

export function normalizeNif(input: string): string {
  return input.replace(/\D/g, '');
}

export function isValidNif(input: string): boolean {
  const nif = normalizeNif(input);
  if (!/^\d{9}$/.test(nif)) return false;
  // O prefixo 4 só existe como 45 (pessoas singulares não residentes).
  if (!VALID_FIRST_DIGITS.has(nif[0]!) && !nif.startsWith('45')) return false;
  let sum = 0;
  for (let i = 0; i < 8; i++) sum += Number(nif[i]) * (9 - i);
  const r = sum % 11;
  const check = r < 2 ? 0 : 11 - r;
  return check === Number(nif[8]);
}

/** Pessoa coletiva (NIPC): começa por 5, 6, 8 ou 9. Só nestas o nome é público e comparável. */
export const isCompanyNif = (nif: string) => /^[5689]/.test(normalizeNif(nif));

const LEGAL_WORDS = new Set(['lda', 'limitada', 'unipessoal', 'sa', 'sociedade', 'anonima', 'de', 'do', 'da', 'dos', 'das', 'e', 'the']);

const nameWords = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, ' ')
    .split(/\s+/)
    .filter((w) => w && !LEGAL_WORDS.has(w));

/** O nome escrito corresponde ao oficial? Tolerante: ignora acentos, maiúsculas, "Lda"/"S.A." e preposições; aceita um conter o outro. */
export function nameMatchesOfficial(typed: string, official: string): boolean {
  const a = nameWords(typed);
  const b = nameWords(official);
  if (a.length === 0 || b.length === 0) return false;
  const [short, long] = a.length <= b.length ? [a, b] : [b, a];
  const hits = short.filter((w) => long.includes(w)).length;
  return hits / short.length >= 0.8;
}
