import { describe, expect, it } from 'vitest';
import { aplicar, calibrar, inverter, type Calibracao, type Matriz3 } from '@/domain/homografia';
import { endireitar, enquadrarNoContorno, extensaoDoPlano, pixeisPorMetro, remapearZona } from './endireitar';

/** Imagem 200×200 com um gradiente: vermelho = coluna, verde = linha. Bilinear num gradiente é exato. */
function gradiente(): {
  data: Uint8ClampedArray;
  width: number;
  height: number;
} {
  const w = 200;
  const h = 200;
  const data = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const o = (y * w + x) * 4;
      data[o] = x;
      data[o + 1] = y;
      data[o + 2] = 0;
      data[o + 3] = 255;
    }
  return { data, width: w, height: h };
}

// Plano → imagem afim simples: u = 10·X + 50, v = 150 − 10·Y (10 px por metro, Y para cima).
const H: Matriz3 = [10, 0, 50, 0, -10, 150, 0, 0, 1];
const cal: Calibracao = { planoParaImagem: H, imagemParaPlano: inverter(H) };

describe('endireitar', () => {
  it('cada píxel da vista de frente vai buscar a cor ao sítio certo da fotografia', () => {
    const vista = endireitar(gradiente(), H, { x0: 0, x1: 10, y0: 0, y1: 10 }, 1);
    expect(vista.width).toBe(10);
    expect(vista.height).toBe(10);
    // Coluna 3, linha 2 → X = 3,5; Y = 10 − 2,5 = 7,5 → u = 85, v = 75.
    const o = (2 * 10 + 3) * 4;
    expect(vista.data[o]).toBe(85);
    expect(vista.data[o + 1]).toBe(75);
  });

  it('o que fica fora da fotografia sai cinzento-claro, sem rebentar', () => {
    const vista = endireitar(gradiente(), H, { x0: -20, x1: -10, y0: 0, y1: 1 }, 1);
    expect(Array.from(vista.data.slice(0, 4))).toEqual([241, 245, 249, 255]);
  });
});

describe('extensaoDoPlano', () => {
  it('cobre a fotografia inteira quando a transformação é afim', () => {
    // A imagem 200×200 inteira → X de −5 a 15, Y de −5 a 15.
    const e = extensaoDoPlano(cal, 200, 200, { larguraM: 1, alturaM: 1 });
    expect(e.x0).toBeCloseTo(-5, 6);
    expect(e.x1).toBeCloseTo(15, 6);
    expect(e.y0).toBeCloseTo(-3, 6); // limitado a 3 m abaixo do solo
    expect(e.y1).toBeCloseTo(15, 6);
  });

  it('numa fotografia tirada de baixo, o céu acima da linha do horizonte do plano não manda a extensão para o infinito', () => {
    // Porta da fotografia real do promotor: o topo da imagem fica muito acima do prédio.
    const c = calibrar({
      cantos: [
        { x: 767, y: 1591 },
        { x: 955, y: 1592 },
        { x: 916, y: 1162 },
        { x: 763, y: 1168 },
      ],
      larguraM: 1.65,
      alturaM: 3.77,
    });
    const e = extensaoDoPlano(c, 1500, 2000, { larguraM: 1.65, alturaM: 3.77 });
    expect(e.y1).toBeLessThanOrEqual(60);
    expect(e.y1).toBeGreaterThan(20); // o prédio tem ~20 m: tem de caber
    expect(e.x1 - e.x0).toBeGreaterThan(10);
    expect(pixeisPorMetro(e, 900, 1400)).toBeGreaterThan(4);
  });
});

describe('enquadrarNoContorno', () => {
  const total = { x0: -27, x1: 17, y0: -3, y1: 47 };

  it('sem contorno, a vista fica inteira', () => {
    expect(enquadrarNoContorno([{ tipo: 'vao', x: 0, y: 0, largura: 1, altura: 1 }], total)).toEqual(total);
  });

  it('com contorno, enquadra-o com margem — e o prédio ganha píxeis por metro', () => {
    const e = enquadrarNoContorno([{ tipo: 'fachada', x: -6, y: 0, largura: 11, altura: 20 }], total);
    expect(e).toEqual({ x0: -7.1, x1: 6.1, y0: -2, y1: 22 });
    expect(pixeisPorMetro(e, 1000, 1500) / pixeisPorMetro(total, 1000, 1500)).toBeGreaterThan(2.5);
  });

  it('a margem nunca sai da parte do plano que a fotografia mostra', () => {
    const e = enquadrarNoContorno([{ tipo: 'fachada', x: -27, y: -3, largura: 44, altura: 50 }], total);
    expect(e).toEqual(total);
  });
});

describe('remapearZona', () => {
  it('a zona continua no mesmo sítio da fotografia quando a calibração muda', () => {
    // Antes: 10 px/m; depois: 20 px/m (a mesma fotografia, outra escala) → a zona passa a metade.
    const antes: Matriz3 = [10, 0, 50, 0, -10, 150, 0, 0, 1];
    const depois: Matriz3 = [20, 0, 50, 0, -20, 150, 0, 0, 1];
    const z = remapearZona({ id: 'a', tipo: 'vao', x: 2, y: 3, largura: 4, altura: 2, triangulo: 'sup-esq' }, antes, inverter(depois));
    expect(z).toMatchObject({ id: 'a', tipo: 'vao', x: 1, y: 1.5, largura: 2, altura: 1, triangulo: 'sup-esq' });
  });

  it('quando os cantos deixam de fazer um retângulo, fica o retângulo a meio deles — com a área do quadrilátero, e não a caixa', () => {
    // Depois: a mesma fotografia vista com outra perspetiva (um ponto de fuga a ~60 m, inclinado) — os
    // quatro cantos do contorno de 6 × 12 m caem num quadrilátero. A caixa que o envolve ficava 5 %
    // maior do que ele, sem ninguém tocar na zona.
    const antes: Matriz3 = [10, 0, 50, 0, -10, 150, 0, 0, 1];
    const depois: Matriz3 = [10.6, 0.9, 50, 0.4, -9.6, 150, 0.004, 0.002, 1];
    const z = { id: 'c', tipo: 'fachada' as const, x: 2, y: 1, largura: 6, altura: 12 };
    const levada = remapearZona(z, antes, inverter(depois));
    const q = [
      { x: 2, y: 1 },
      { x: 8, y: 1 },
      { x: 8, y: 13 },
      { x: 2, y: 13 },
    ].map((p) => aplicar(inverter(depois), aplicar(antes, p)!)!);
    const doQuadrilatero = Math.abs(q.reduce((s, p, i) => s + p.x * q[(i + 1) % 4]!.y - q[(i + 1) % 4]!.x * p.y, 0)) / 2;
    const xs = q.map((p) => p.x);
    const ys = q.map((p) => p.y);
    const daCaixa = (Math.max(...xs) - Math.min(...xs)) * (Math.max(...ys) - Math.min(...ys));
    expect(daCaixa / doQuadrilatero).toBeGreaterThan(1.04);
    expect(Math.abs((levada.largura * levada.altura) / doQuadrilatero - 1)).toBeLessThan(0.005);
    // Cada lado a meio dos seus dois cantos.
    expect(levada.x).toBeCloseTo((q[0]!.x + q[3]!.x) / 2, 12);
    expect(levada.x + levada.largura).toBeCloseTo((q[1]!.x + q[2]!.x) / 2, 12);
    expect(levada.y).toBeCloseTo((q[0]!.y + q[1]!.y) / 2, 12);
    expect(levada.y + levada.altura).toBeCloseTo((q[2]!.y + q[3]!.y) / 2, 12);
  });
});
