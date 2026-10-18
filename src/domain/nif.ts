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
