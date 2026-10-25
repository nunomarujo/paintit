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

const semCentimos = new Intl.NumberFormat('pt-PT', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
  useGrouping: 'always',
});
const milhoes = new Intl.NumberFormat('pt-PT', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

/**
 * Montante para ler de relance, não para conferir: 22,1 M€ em vez de 22 099 629,62 €.
 *
 * Para somas de muitos contratos, os cêntimos são ruído — ninguém confere um total de distrito ao
 * cêntimo, e a precisão falsa rouba atenção ao número que interessa. Onde o valor é de um contrato
 * ou de uma factura, usa-se `formatEuros`, que mostra tudo.
 */
export function formatEurosCurto(amount: Cents): string {
  const euros = amount / 100;
  return Math.abs(euros) >= 1_000_000 ? `${milhoes.format(euros / 1_000_000)} M€` : semCentimos.format(euros);
}
