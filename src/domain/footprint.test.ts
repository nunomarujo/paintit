import { describe, expect, it } from 'vitest';
import { formaDaGrelha, formaPorCantos, formaProvavel, grelhaDaForma, recortar } from './footprint';

const g = (linhas: string[]) => linhas.map((l) => [...l].map((c) => c === '#'));

describe('forma proposta sem perguntar nada', () => {
  it('prédio em banda é barra; isolado é quadrado numa moradia', () => {
    expect(formaProvavel(2, false)).toBe('I');
    expect(formaProvavel(1, false)).toBe('I');
    expect(formaProvavel(4, true)).toBe('quadrado');
    expect(formaProvavel(null, false)).toBe('I');
  });
});

describe('contar os cantos', () => {
  it('quatro cantos: barra se está encostado, quadrado se não', () => {
    expect(formaPorCantos(4, { fachadasLivres: 2 })).toBe('I');
    expect(formaPorCantos(4, { fachadasLivres: 4 })).toBe('quadrado');
  });

  it('seis cantos é sempre L', () => {
    expect(formaPorCantos(6, { fachadasLivres: 4 })).toBe('L');
  });

  it('oito cantos precisa de saber o recorte', () => {
    expect(formaPorCantos(8, { fachadasLivres: 4 })).toBeNull();
    expect(formaPorCantos(8, { fachadasLivres: 4, recorte: 'patio' })).toBe('U');
    expect(formaPorCantos(8, { fachadasLivres: 4, recorte: 'avanco' })).toBe('T');
  });

  it('outra contagem manda desenhar', () => {
    expect(formaPorCantos('outros', { fachadasLivres: 4 })).toBeNull();
  });
});

describe('desenhar a planta numa grelha', () => {
  it('reconhece cada forma a partir do seu próprio desenho', () => {
    for (const forma of ['L', 'U', 'T'] as const) {
      expect(formaDaGrelha(grelhaDaForma(forma, 4, 4))).toBe(forma);
    }
  });

  it('um L virado ao contrário continua a ser um L', () => {
    expect(formaDaGrelha(g(['####', '####', '..##', '..##']))).toBe('L');
    expect(formaDaGrelha(g(['####', '####', '##..', '##..']))).toBe('L');
  });

  it('distingue barra de quadrado pelas proporções', () => {
    expect(formaDaGrelha(g(['####', '####']))).toBe('I');
    expect(formaDaGrelha(g(['###', '###', '###']))).toBe('quadrado');
  });

  it('pátio ao meio é U; corpo que avança é T', () => {
    expect(formaDaGrelha(g(['####', '####', '#..#', '#..#']))).toBe('U');
    expect(formaDaGrelha(g(['####', '####', '.##.', '.##.']))).toBe('T');
  });

  it('grelha vazia não dá forma nenhuma', () => {
    expect(formaDaGrelha(g(['....', '....']))).toBeNull();
    expect(recortar(g(['....']))).toBeNull();
  });

  it('o desenho pode estar em qualquer canto da grelha', () => {
    expect(formaDaGrelha(g(['....', '.###', '.###', '.#..']))).toBe('L');
  });
});
