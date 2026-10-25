import { describe, expect, it } from 'vitest';
import { classeNecessaria, elegibilidade, limiteDe, procedimentoPossivel, type Habilitacao } from './obrasPublicas';

const alvara = (classe: number, subs: Habilitacao['subcategorias'] = ['b']): Habilitacao => ({ titulo: 'alvara', classe, subcategorias: subs });

describe('classes de alvará', () => {
  it('a classe 1 cobre até 200 000 € e a 4 até 1 600 000 €', () => {
    expect(limiteDe(alvara(1))).toBe(20_000_000);
    expect(limiteDe(alvara(4))).toBe(160_000_000);
  });

  it('a classe 9 não tem limite', () => {
    expect(limiteDe(alvara(9))).toBeNull();
  });

  it('o certificado habilita até 40 000 €', () => {
    expect(limiteDe({ titulo: 'certificado', classe: null, subcategorias: ['b'] })).toBe(4_000_000);
  });

  it('diz a classe mínima para um valor', () => {
    expect(classeNecessaria(15_000_000)).toBe(1);
    expect(classeNecessaria(20_000_001)).toBe(2);
    expect(classeNecessaria(100_000_000)).toBe(4);
  });
});

describe('elegibilidade', () => {
  it('a classe mede-se pelo valor global da empreitada, não pela parte de pintura', () => {
    // Reabilitação de 400 000 € em que a pintura são 80 000 €: a classe 1 não chega (artigo 8.º).
    const e = elegibilidade(alvara(1), 40_000_000, ['b']);
    expect(e.veredicto).toBe('falta_classe');
    expect(e.classeNecessaria).toBe(2);
    expect(e.caminho).toContain('subcontratação');
  });

  it('deixa concorrer quando a classe e as subcategorias chegam', () => {
    expect(elegibilidade(alvara(3, ['b', 't']), 70_000_000, ['b', 't']).veredicto).toBe('pode');
  });

  it('aponta a subcategoria em falta', () => {
    const e = elegibilidade(alvara(5, ['b']), 10_000_000, ['b', 't']);
    expect(e.veredicto).toBe('falta_subcategoria');
    expect(e.subcategoriasEmFalta).toEqual(['t']);
  });

  it('sem título não há obra pública', () => {
    expect(elegibilidade({ titulo: 'nenhum', classe: null, subcategorias: [] }, 1_000_000, ['b']).veredicto).toBe('sem_titulo');
  });
});

describe('limiares do CCP desde 1 de Outubro de 2026', () => {
  it('uma empreitada de 120 000 € pode ir a ajuste directo, sem anúncio nenhum', () => {
    expect(procedimentoPossivel(12_000_000)).toEqual({ minimo: 'ajuste_direto', anunciado: false });
  });

  it('até 1 000 000 € basta consulta prévia, que também não é anunciada', () => {
    expect(procedimentoPossivel(80_000_000)).toEqual({ minimo: 'consulta_previa', anunciado: false });
  });

  it('só acima de 2 000 000 € é que o concurso público e o anúncio são inevitáveis', () => {
    expect(procedimentoPossivel(200_000_000)).toEqual({ minimo: 'concurso_publico', anunciado: true });
  });
});
