// Todos os montantes são inteiros em cêntimos de euro. Nunca se usam decimais
// para dinheiro: um arredondamento feito cedo demais muda o valor cobrado.

export type Cents = number;

export class MoneyError extends Error {}

export function assertCents(value: number, label = 'montante'): Cents {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new MoneyError(`${label} inválido: ${value}`);
  }
  return value;
}

export function euros(value: number): Cents {
  return assertCents(Math.round(value * 100));
}

/** Percentagem em pontos-base (300 = 3%), arredondada ao cêntimo, metade para cima. */
export function percentOf(amount: Cents, basisPoints: number): Cents {
  assertCents(amount);
  return Math.floor((amount * basisPoints + 5000) / 10000);
}

const formatter = new Intl.NumberFormat('pt-PT', {
  style: 'currency',
  currency: 'EUR',
  // Em pt-PT o Intl não agrupa números de 4 dígitos (3690,00 €); queremos 3 690,00 €.
  useGrouping: 'always',
});

export function formatEuros(amount: Cents): string {
  return formatter.format(amount / 100);
}
