import { describe, expect, it } from 'vitest';
import { gruposDeColunas, tamanhosDosQuadros } from './quadros';

describe('a repartição das propostas pelos quadros da folha', () => {
  it('o exemplo do promotor: cinco candidatos saem 3 + 2, e não 2 + 2 + 1', () => {
    // «Se são cinco candidatos mais uma referência repetida, referência + 3 e referência + 2, em
    // vez de deixar um candidato isolado» (29/10/2026).
    expect(tamanhosDosQuadros(5)).toEqual([3, 2]);
  });

  it('nenhum quadro fica com um candidato sozinho', () => {
    for (let n = 2; n <= 30; n++) {
      const t = tamanhosDosQuadros(n);
      expect(t.every((x) => x >= 2)).toBe(true);
    }
  });

  it('a conta fecha: a soma dos quadros são os candidatos todos', () => {
    for (let n = 1; n <= 30; n++) {
      expect(tamanhosDosQuadros(n).reduce((a, b) => a + b, 0)).toBe(n);
    }
  });

  it('nunca mais de três por quadro: acima disso a folha deixa de os aguentar', () => {
    for (let n = 1; n <= 30; n++) {
      expect(Math.max(...tamanhosDosQuadros(n), 0)).toBeLessThanOrEqual(3);
    }
  });

  it('dois e quatro candidatos não mudam: a norma já não deixava ninguém sozinho', () => {
    expect(tamanhosDosQuadros(2)).toEqual([2]);
    expect(tamanhosDosQuadros(4)).toEqual([2, 2]);
    expect(tamanhosDosQuadros(6)).toEqual([2, 2, 2]);
  });

  it('três candidatos cabem num quadro só, em vez de 2 + 1', () => {
    expect(tamanhosDosQuadros(3)).toEqual([3]);
  });

  it('sete candidatos: aperta-se um quadro, não três', () => {
    expect(tamanhosDosQuadros(7)).toEqual([3, 2, 2]);
  });

  it('nove candidatos — as dez propostas da demonstração — dão quatro quadros e não cinco', () => {
    expect(tamanhosDosQuadros(9)).toEqual([3, 2, 2, 2]);
  });

  it('com treze, dois quadros de três cheios não impedem um quadro novo', () => {
    // Aqui não há como evitar apertar: 13 não é par. O que não pode acontecer é um quadro de um.
    const t = tamanhosDosQuadros(13);
    expect(t.reduce((a, b) => a + b, 0)).toBe(13);
    expect(Math.min(...t)).toBeGreaterThanOrEqual(2);
  });

  it('os quadros maiores vêm primeiro: a comparação da frente é a que mais interessa', () => {
    const t = tamanhosDosQuadros(5);
    expect([...t].sort((a, b) => b - a)).toEqual(t);
  });
});

describe('os índices de cada quadro', () => {
  it('a referência repete-se em todos, à cabeça', () => {
    const g = gruposDeColunas(6, 0);
    expect(g).toHaveLength(2);
    for (const q of g) expect(q[0]).toBe(0);
    expect(g).toEqual([
      [0, 1, 2, 3],
      [0, 4, 5],
    ]);
  });

  it('a referência não se repete dentro do mesmo quadro', () => {
    for (const q of gruposDeColunas(10, 3)) {
      expect(new Set(q).size).toBe(q.length);
    }
  });

  it('cada proposta aparece exactamente uma vez, fora a referência', () => {
    const g = gruposDeColunas(10, 2);
    const vistos = g.flatMap((q) => q.slice(1));
    expect(new Set(vistos).size).toBe(9);
    expect(vistos).not.toContain(2);
  });

  it('a referência pode ser outra que não a primeira', () => {
    expect(gruposDeColunas(5, 2)).toEqual([
      [2, 0, 1],
      [2, 3, 4],
    ]);
  });

  it('até três propostas não há divisão nenhuma', () => {
    expect(gruposDeColunas(3, 0)).toEqual([[0, 1, 2]]);
    expect(gruposDeColunas(2, 0)).toEqual([[0, 1]]);
    expect(gruposDeColunas(1, 0)).toEqual([[0]]);
  });
});
