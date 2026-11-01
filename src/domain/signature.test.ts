import { describe, expect, it } from 'vitest';
import { semEnchimento } from './signature';

describe('o valor da assinatura dentro do espaço reservado', () => {
  it('tira o enchimento de zeros a seguir ao DER', () => {
    // SEQUENCE de 3 bytes: 30 03 01 02 03, depois enchimento.
    expect(semEnchimento('3003010203' + '00'.repeat(20))).toBe('3003010203');
  });

  it('guarda um último byte 0x00 que é da assinatura, e não do enchimento', () => {
    // Era isto que falhava uma vez em 256: o DER acaba em 00 e o enchimento também.
    expect(semEnchimento('3003010200' + '00'.repeat(20))).toBe('3003010200');
  });

  it('lê comprimentos longos (forma com 2 bytes)', () => {
    const corpo = 'ab'.repeat(300);
    const der = '3082012c' + corpo; // 300 = 0x012c
    expect(semEnchimento(der + '00'.repeat(10))).toBe(der);
  });

  it('sem um SEQUENCE à cabeça, volta à regra antiga', () => {
    expect(semEnchimento('abcd0000')).toBe('abcd');
  });
});
