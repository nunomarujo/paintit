import { describe, expect, it } from 'vitest';
import { condicoesDePintura, resumoDaSemana, type DiaDeTempo } from './meteorologia';

/** Um dia de Primavera sem defeito nenhum: é daqui que cada teste afasta uma variável de cada vez. */
const bom: DiaDeTempo = { data: '2026-05-12', tMin: 14, tMax: 23, chuvaMm: 0, chuvaProb: 5, humidade: 60, ventoKmh: 12 };

describe('dá para pintar neste dia?', () => {
  it('um dia bom não precisa de explicação', () => {
    expect(condicoesDePintura(bom)).toEqual({ veredicto: 'sim', razoes: [] });
  });

  it('chuva a sério impede, e a probabilidade alta também', () => {
    expect(condicoesDePintura({ ...bom, chuvaMm: 4 }).veredicto).toBe('nao');
    expect(condicoesDePintura({ ...bom, chuvaProb: 70 }).veredicto).toBe('nao');
    expect(condicoesDePintura({ ...bom, chuvaProb: 40 }).veredicto).toBe('talvez');
  });

  it('o frio conta pela mínima, não pela máxima', () => {
    // Uma demão aplicada às três da tarde ainda cura às seis da manhã seguinte: é aí que se perde.
    const tardeQuenteNoiteFria = { ...bom, tMin: 3, tMax: 22 };
    const r = condicoesDePintura(tardeQuenteNoiteFria);
    expect(r.veredicto).toBe('nao');
    expect(r.razoes.join(' ')).toContain('mínima');
    expect(condicoesDePintura({ ...bom, tMin: 6 }).veredicto).toBe('talvez');
  });

  it('calor a mais seca antes de alastrar', () => {
    expect(condicoesDePintura({ ...bom, tMax: 32 }).veredicto).toBe('talvez');
    expect(condicoesDePintura({ ...bom, tMax: 38 }).veredicto).toBe('nao');
  });

  it('a humidade do ar é a que ninguém olha e estraga a demão', () => {
    expect(condicoesDePintura({ ...bom, humidade: 82 }).veredicto).toBe('talvez');
    expect(condicoesDePintura({ ...bom, humidade: 90 }).veredicto).toBe('nao');
  });

  it('o vento conta por causa do pó, do salpico e dos andaimes', () => {
    expect(condicoesDePintura({ ...bom, ventoKmh: 45 }).veredicto).toBe('talvez');
    expect(condicoesDePintura({ ...bom, ventoKmh: 70 }).veredicto).toBe('nao');
  });

  it('o que impede ganha ao que levanta dúvida, e diz-se tudo', () => {
    const r = condicoesDePintura({ ...bom, humidade: 90, ventoKmh: 45, tMax: 31 });
    expect(r.veredicto).toBe('nao');
    expect(r.razoes.join(' ')).toContain('humidade');
    // O que só levanta dúvida não se mistura com o que impede: a lista é de impedimentos.
    expect(r.razoes.join(' ')).not.toContain('vento');
  });

  it('a razão vem sempre com o número que a justifica', () => {
    expect(condicoesDePintura({ ...bom, humidade: 90 }).razoes[0]).toBe('90% de humidade do ar');
    expect(condicoesDePintura({ ...bom, chuvaMm: 4.25 }).razoes[0]).toBe('4,3 mm de chuva');
  });

  it('chuva medida fala mais alto do que probabilidade: não se diz as duas coisas', () => {
    const r = condicoesDePintura({ ...bom, chuvaMm: 5, chuvaProb: 90 });
    expect(r.razoes.filter((x) => x.includes('chuva'))).toHaveLength(1);
  });
});

describe('a semana em uma frase', () => {
  const mau = { ...bom, chuvaMm: 5 };
  it('conta os dias que servem', () => {
    expect(resumoDaSemana([bom, bom, mau])).toBe('2 de 3 dias dão para pintar; 1 não.');
    expect(resumoDaSemana([bom, bom])).toBe('Os 2 dias dão para pintar.');
    expect(resumoDaSemana([mau, mau])).toBe('Nenhum dos 2 dias dá para pintar no exterior.');
    expect(resumoDaSemana([])).toBe('Sem previsão para já.');
  });

  it('com um só dia bom, o verbo concorda com a contagem e o nome com o total', () => {
    // "1 de 3 dia dá" é o que sai de concordar as duas coisas com o mesmo número.
    expect(resumoDaSemana([bom, mau, mau])).toBe('1 de 3 dias dá para pintar; 2 não.');
  });
});
