import { describe, expect, it } from 'vitest';
import type { TipoZona, Zona } from '@/domain/fachadaMedida';
import { enquadramento, montarModelo, type FaceMedida } from './modelo3d';

let n = 0;
const z = (tipo: TipoZona, x: number, y: number, largura: number, altura: number): Zona => ({
  id: String(n++),
  tipo,
  x,
  y,
  largura,
  altura,
});
const dim = { larguraM: 10, fundoM: 8, alturaM: 20 };
const frente: FaceMedida = { lado: 'frente', zonas: [z('fachada', 0, 0, 10, 20), z('vao', 2, 6, 2, 1.5), z('varanda', 6, 3.5, 3, 3)] };

describe('montarModelo', () => {
  it('de frente: a parede da frente à escala (10 m de largo, 20 m de alto no ecrã), sem paredes laterais', () => {
    const pols = montarModelo([frente], dim, { azimute: 0, elevacao: 0 });
    const parede = pols.find((p) => p.tipo === 'parede')!;
    const xs = parede.pontos.map((p) => p.x);
    const ys = parede.pontos.map((p) => p.y);
    expect(Math.max(...xs) - Math.min(...xs)).toBeCloseTo(10, 9);
    expect(Math.max(...ys) - Math.min(...ys)).toBeCloseTo(20, 9);
    expect(pols.filter((p) => p.tipo === 'parede-por-medir')).toHaveLength(0);
  });

  it('o vão fica no sítio medido da parede (2 m do canto, 6 m do chão)', () => {
    const pols = montarModelo([frente], dim, { azimute: 0, elevacao: 0 });
    const vao = pols.find((p) => p.tipo === 'vao')!;
    expect(Math.min(...vao.pontos.map((p) => p.x))).toBeCloseTo(2, 9);
    expect(Math.max(...vao.pontos.map((p) => p.y))).toBeCloseTo(-6, 9); // y do ecrã para baixo
  });

  it('a varanda do 1.º andar desenha-se depois da parede onde está — não fica tapada', () => {
    const pols = montarModelo([frente], dim, { azimute: -30, elevacao: 18 });
    const parede = pols.findIndex((p) => p.tipo === 'parede');
    const varanda = pols.findIndex((p) => p.tipo === 'varanda');
    expect(varanda).toBeGreaterThan(parede);
  });

  it('rodado de lado, aparece a parede lateral — tracejada, porque não foi medida', () => {
    const pols = montarModelo([frente], dim, { azimute: -30, elevacao: 18 });
    expect(pols.filter((p) => p.tipo === 'parede-por-medir')).toHaveLength(1);
    expect(pols.filter((p) => p.tipo === 'topo')).toHaveLength(1);
  });

  it('uma lateral medida vai para a sua parede, com as suas zonas', () => {
    const lateral: FaceMedida = { lado: 'direita', zonas: [z('fachada', 3, 0, 8, 20), z('vao', 4, 2, 2, 2)] };
    const pols = montarModelo([frente, lateral], dim, { azimute: -30, elevacao: 18 });
    expect(pols.filter((p) => p.tipo === 'parede')).toHaveLength(2);
    expect(pols.filter((p) => p.tipo === 'vao')).toHaveLength(2);
  });

  it('de costas: a frente e o vão não se veem, e a varanda desenha-se antes do prédio que a tapa', () => {
    const pols = montarModelo([frente], dim, { azimute: 180, elevacao: 18 });
    expect(pols.some((p) => p.tipo === 'vao')).toBe(false);
    const primeiraParede = pols.findIndex((p) => p.tipo.startsWith('parede'));
    const varandas = pols.map((p, i) => (p.tipo === 'varanda' ? i : -1)).filter((i) => i >= 0);
    for (const i of varandas) expect(i).toBeLessThan(primeiraParede);
  });

  it('um vão triangular desenha-se como triângulo na parede', () => {
    const comTriangulo: FaceMedida = {
      lado: 'frente',
      zonas: [z('fachada', 0, 0, 10, 20), { ...z('vao', 2, 6, 2, 2), triangulo: 'sup-dir' }],
    };
    const pols = montarModelo([comTriangulo], dim, { azimute: 0, elevacao: 0 });
    expect(pols.find((p) => p.tipo === 'vao')!.pontos).toHaveLength(3);
  });

  it('o enquadramento envolve tudo, com margem', () => {
    const pols = montarModelo([frente], dim, { azimute: 0, elevacao: 0 });
    const c = enquadramento(pols, 1);
    expect(c.largura).toBeCloseTo(12, 9);
    expect(c.altura).toBeCloseTo(22, 9);
  });
});
