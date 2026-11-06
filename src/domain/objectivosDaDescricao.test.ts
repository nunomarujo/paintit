import { describe, expect, it } from 'vitest';
import { objectivosNaDescricao } from './objectivosDaDescricao';

const de = (t: string) => [...objectivosNaDescricao(t)].sort();

describe('objetivos lidos da descrição (06/11/2026)', () => {
  it('o texto do promotor acende renovar, fissuras e humidade', () => {
    const t =
      'Pintar de branco, há faixas azuis. Há fissuras e pedaços  quebrados.  Acho que tem salitre e partes com bolor, caruncho. Se for possível queremos tinta que auxilie a melhorar a permeabilidade.';
    expect(de(t)).toEqual(['fissuras', 'humidade', 'renovar']);
  });
  it('sem acentos, maiúsculas ou a palavra exata', () => {
    expect(de('HUMIDADE na parede')).toEqual(['humidade']);
    expect(de('a parede está rachada')).toEqual(['fissuras']);
    expect(de('tem infiltrações quando chove')).toEqual(['humidade']);
    expect(de('queremos fazer capoto')).toEqual(['isolamento']);
    expect(de('não sabemos o que fazer, precisamos de aconselhamento')).toEqual(['nao_sei']);
  });
  it('as frases que as pastilhas escrevem continuam a acender a sua', () => {
    expect(de('Queremos renovar a pintura.')).toContain('renovar');
    expect(de('Há fissuras e tinta a descascar.')).toContain('fissuras');
    expect(de('Há sinais de humidade.')).toContain('humidade');
    expect(de('Gostaríamos de melhorar o isolamento.')).toContain('isolamento');
    expect(de('Ainda não sabemos qual é a solução e precisamos de aconselhamento.')).toContain('nao_sei');
  });
  it('texto vazio ou sem nada disto: nada', () => {
    expect(de('')).toEqual([]);
    expect(de('Prédio de quatro andares em Viana.')).toEqual([]);
  });
  it('«cor» só como palavra, não dentro de outra (corrimão, corredor)', () => {
    expect(de('o corrimão e o corredor')).toEqual([]);
    expect(de('mudar a cor')).toEqual(['renovar']);
  });
});
