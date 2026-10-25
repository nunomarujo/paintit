import { describe, expect, it } from 'vitest';
import { contarEm, mensagemDeFuga } from './pwned';

const corpo = ['003D68EB55068C33ACE09247EE4C639306B:3', '012C192B2357C8E62C42A1E1ACAE1B33F0A:0', '01330C689E5D64F660D6947A93AD634EF8F:9'].join('\n');

describe('resposta do Have I Been Pwned', () => {
  it('encontra o resumo e devolve quantas vezes apareceu', () => {
    expect(contarEm(corpo, '01330C689E5D64F660D6947A93AD634EF8F')).toBe(9);
  });

  it('uma palavra-passe que não está na lista dá zero', () => {
    expect(contarEm(corpo, 'FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF')).toBe(0);
  });

  it('as linhas de enchimento vêm a zero e contam como ausência', () => {
    expect(contarEm(corpo, '012C192B2357C8E62C42A1E1ACAE1B33F0A')).toBe(0);
  });

  it('aguenta espaços e fim de linha do Windows', () => {
    expect(contarEm('  01330C689E5D64F660D6947A93AD634EF8F:9  \r\n', '01330C689E5D64F660D6947A93AD634EF8F')).toBe(9);
  });

  it('uma contagem que não é número não rebenta nada', () => {
    expect(contarEm('ABC:x', 'ABC')).toBe(0);
  });

  it('a mensagem muda de tom quando a fuga é muito comum', () => {
    expect(mensagemDeFuga(1)).toContain('numa fuga');
    expect(mensagemDeFuga(50_000)).toContain('muitas vezes');
  });
});
