import { describe, expect, it } from 'vitest';
import { resumoDaAssinaturaAceite, semEnchimento } from './signature';

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

describe('resumoDaAssinaturaAceite: que PDF assinado se lê (05/11/2026)', () => {
  const h = (c: string) => c.repeat(64);
  const ev = (id: string, kind: string, payload: object) => ({ id, kind, payload });
  const nenhum = new Set<string>();

  it('a assinatura em PDF mais recente do lado pedido', () => {
    const eventos = [
      ev('1', 'cliente_assinou', { metodo: 'cmd_pdf', documentHash: h('a') }),
      ev('2', 'litigio_aberto', {}),
      ev('3', 'cliente_assinou', { metodo: 'cmd_pdf', documentHash: h('b') }),
      ev('4', 'pintor_assinou', { metodo: 'cmd_pdf', documentHash: h('c') }),
    ];
    // Depois de um litígio retomado, o cliente assinou de novo: vale a segunda.
    expect(resumoDaAssinaturaAceite(eventos, nenhum, 'cliente_assinou')).toBe(h('b'));
    expect(resumoDaAssinaturaAceite(eventos, nenhum, 'pintor_assinou')).toBe(h('c'));
  });

  it('uma assinatura que a reconstrução recusou não conta, por mais recente que seja', () => {
    const eventos = [
      ev('1', 'cliente_assinou', { metodo: 'cmd_pdf', documentHash: h('a') }),
      ev('2', 'cliente_assinou', { metodo: 'cmd_pdf', documentHash: h('f') }),
    ];
    expect(resumoDaAssinaturaAceite(eventos, new Set(['2']), 'cliente_assinou')).toBe(h('a'));
  });

  it('sem assinatura em PDF não há ficheiro; um resumo malformado não vira caminho', () => {
    expect(resumoDaAssinaturaAceite([ev('1', 'cliente_assinou', { metodo: 'aceitacao', documentHash: h('a') })], nenhum, 'cliente_assinou')).toBeNull();
    expect(resumoDaAssinaturaAceite([], nenhum, 'pintor_assinou')).toBeNull();
    for (const mau of ['../x', h('A'), 'a'.repeat(63), 42]) {
      expect(resumoDaAssinaturaAceite([ev('1', 'cliente_assinou', { metodo: 'cmd_pdf', documentHash: mau })], nenhum, 'cliente_assinou')).toBeNull();
    }
  });
});
