import { describe, expect, it } from 'vitest';
import { euros, formatEuros, formatEurosCurto, percentOf } from './money';

// O Intl separa milhares e moeda com espaços inquebráveis, não com o espaço normal. Comparar com
// espaços normais falha por caracteres que não se vêem no ecrã nem na mensagem de erro.
const legivel = (s: string) => s.replace(/[\u00a0\u202f]/g, ' ');

describe('formatEuros', () => {
  it('agrupa os milhares, que o Intl em pt-PT não faz a partir de quatro dígitos', () => {
    expect(legivel(formatEuros(3_690_00))).toBe('3 690,00 €');
  });
});

describe('formatEurosCurto', () => {
  it('passa a milhões a partir de um milhão', () => {
    expect(legivel(formatEurosCurto(22_099_629_62))).toBe('22,1 M€');
    expect(legivel(formatEurosCurto(2_357_085_87))).toBe('2,4 M€');
  });

  it('abaixo do milhão são euros inteiros, agrupados', () => {
    expect(legivel(formatEurosCurto(880_062_04))).toBe('880 062 €');
    expect(legivel(formatEurosCurto(3_690_00))).toBe('3 690 €');
    expect(legivel(formatEurosCurto(0))).toBe('0 €');
  });

  it('arredonda para cima ao chegar ao milhão', () => {
    expect(legivel(formatEurosCurto(999_999_99))).toBe('1 000 000 €');
    expect(legivel(formatEurosCurto(1_000_000_00))).toBe('1,0 M€');
  });
});

describe('euros e percentOf', () => {
  it('converte para cêntimos inteiros', () => {
    expect(euros(12.34)).toBe(1234);
  });

  it('a percentagem vem em pontos-base', () => {
    expect(percentOf(10_000_00, 1800)).toBe(1_800_00);
  });
});
