import { describe, expect, it } from 'vitest';
import { GRAUS_POR_PX, PASSO_DA_ROTACAO, anguloDoArrasto, normalizarAngulo, peloCaminhoMaisCurto, rodarUmPasso, suavizar } from './rotacao';
import { ANGULO_DO_DESENHO } from './prancheta';

describe('rodar o desenho', () => {
  it('normaliza a [0, 360)', () => {
    expect(normalizarAngulo(-10)).toBe(350);
    expect(normalizarAngulo(725)).toBe(5);
    expect(normalizarAngulo(360)).toBe(0);
  });

  it('o caminho mais curto nunca passa de meia volta, e é contínuo (sem saltar de 350° para 10°)', () => {
    expect(peloCaminhoMaisCurto(350, 10)).toBe(370);
    expect(peloCaminhoMaisCurto(10, 350)).toBe(-10);
    expect(Math.abs(peloCaminhoMaisCurto(0, 180))).toBe(180);
    for (let de = -400; de <= 400; de += 37) {
      for (let para = 0; para < 360; para += 23) {
        const a = peloCaminhoMaisCurto(de, para);
        expect(Math.abs(a - de)).toBeLessThanOrEqual(180 + 1e-9);
        expect(normalizarAngulo(a)).toBeCloseTo(normalizarAngulo(para), 9);
      }
    }
  });

  it('os botões andam de paragem em paragem, a partir da vista inicial', () => {
    const i = ANGULO_DO_DESENHO;
    expect(rodarUmPasso(i, 'esquerda', i)).toBe(i + PASSO_DA_ROTACAO);
    expect(rodarUmPasso(i, 'direita', i)).toBe(i - PASSO_DA_ROTACAO);
    // Duas voltas dos botões voltam ao sítio: esquerda e direita são inversas.
    expect(rodarUmPasso(rodarUmPasso(i, 'esquerda', i), 'direita', i)).toBe(i);
  });

  it('depois de um arrasto livre, o botão vai à paragem seguinte nesse sentido, e não a ±45°', () => {
    const i = ANGULO_DO_DESENHO;
    expect(rodarUmPasso(40, 'esquerda', i)).toBe(70);
    expect(rodarUmPasso(40, 'direita', i)).toBe(25);
    expect(rodarUmPasso(69.9, 'esquerda', i)).toBe(70);
    expect(rodarUmPasso(70, 'esquerda', i)).toBe(115);
    expect(rodarUmPasso(-100, 'direita', i)).toBeLessThan(-100);
  });

  it('oito paragens, e uma volta completa passa por todas as faces de frente', () => {
    const i = ANGULO_DO_DESENHO;
    let a = i;
    const vistos = new Set<number>();
    for (let k = 0; k < 8; k++) {
      vistos.add(normalizarAngulo(a));
      a = rodarUmPasso(a, 'esquerda', i);
    }
    expect(vistos.size).toBe(8);
    expect(normalizarAngulo(a)).toBe(i);
  });

  it('arrastar para a direita diminui o ângulo (a frente vai com o ponteiro), para a esquerda aumenta', () => {
    expect(anguloDoArrasto(25, 100)).toBeCloseTo(25 - 100 * GRAUS_POR_PX);
    expect(anguloDoArrasto(25, -100)).toBeGreaterThan(25);
    expect(anguloDoArrasto(25, 0)).toBe(25);
  });

  it('a suavização começa e acaba parada, e cresce sempre', () => {
    expect(suavizar(0)).toBe(0);
    expect(suavizar(1)).toBe(1);
    expect(suavizar(-1)).toBe(0);
    expect(suavizar(2)).toBe(1);
    let antes = 0;
    for (let t = 0.05; t <= 1; t += 0.05) {
      expect(suavizar(t)).toBeGreaterThanOrEqual(antes);
      antes = suavizar(t);
    }
  });
});
