import { describe, expect, it } from 'vitest';
import { cantoMaisProximo } from './cantos';

interface Pixeis {
  data: Uint8ClampedArray;
  width: number;
  height: number;
}
interface Ponto {
  x: number;
  y: number;
}

/** Imagem em tons de cinzento: `f(x, y)` dá o nível (0–255) do píxel (x, y). */
function imagem(w: number, h: number, f: (x: number, y: number) => number): Pixeis {
  const data = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const o = (y * w + x) * 4;
      const v = f(x, y);
      data[o] = v;
      data[o + 1] = v;
      data[o + 2] = v;
      data[o + 3] = 255;
    }
  return { data, width: w, height: h };
}

/** Gerador pseudoaleatório com semente (mulberry32): os testes com ruído dão sempre o mesmo. */
function aleatorio(semente: number): () => number {
  let s = semente | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Ruído inteiro uniforme em [−amplitude, amplitude]. */
function ruido(semente: number, amplitude: number): () => number {
  const r = aleatorio(semente);
  return () => Math.round((r() * 2 - 1) * amplitude);
}

/** O píxel (x, y) está no retângulo de píxeis [x0, x1) × [y0, y1)? Os cantos ficam em (x0, y0), (x1, y0)… */
const dentro = (x0: number, y0: number, x1: number, y1: number) => (x: number, y: number) => x >= x0 && x < x1 && y >= y0 && y < y1;

/** Fração do píxel (x, y) onde `dentroDe` é verdade, por 4×4 amostras: o anti-aliasing de uma fotografia. */
function cobertura(x: number, y: number, dentroDe: (px: number, py: number) => boolean): number {
  let c = 0;
  for (let u = 0; u < 4; u++) for (let v = 0; v < 4; v++) if (dentroDe(x + (u + 0.5) / 4, y + (v + 0.5) / 4)) c++;
  return c / 16;
}

const distancia = (a: Ponto, b: Ponto) => Math.hypot(a.x - b.x, a.y - b.y);

/** Oito pontos a `d` px de `c`, à volta dele. */
function aVolta(c: Ponto, d: number): Ponto[] {
  return Array.from({ length: 8 }, (_, k) => ({ x: c.x + d * Math.cos((k * Math.PI) / 4), y: c.y + d * Math.sin((k * Math.PI) / 4) }));
}

/** Pior distância ao canto verdadeiro, apontando de oito sítios a 6 px dele; null conta como falha. */
function piorErro(pixeis: Pixeis, cantos: Ponto[], raio: number): number {
  let pior = 0;
  for (const c of cantos)
    for (const p of aVolta(c, 6)) {
      const r = cantoMaisProximo(pixeis, p, raio);
      pior = Math.max(pior, r ? distancia(r, c) : Infinity);
    }
  return pior;
}

// Retângulo de píxeis [40, 120) × [30, 90) numa imagem 160×120.
const RETANGULO = dentro(40, 30, 120, 90);
const CANTOS: Ponto[] = [
  { x: 40, y: 30 },
  { x: 120, y: 30 },
  { x: 120, y: 90 },
  { x: 40, y: 90 },
];

describe('cantoMaisProximo — um retângulo', () => {
  it('claro sobre escuro: de 6 px de distância, cada um dos 4 cantos a ≤ 1 px', () => {
    const img = imagem(160, 120, (x, y) => (RETANGULO(x, y) ? 200 : 40));
    expect(piorErro(img, CANTOS, 12)).toBeLessThanOrEqual(1);
  });

  it('escuro sobre claro: o mesmo', () => {
    const img = imagem(160, 120, (x, y) => (RETANGULO(x, y) ? 40 : 200));
    expect(piorErro(img, CANTOS, 12)).toBeLessThanOrEqual(1);
  });

  it('devolve o canto geométrico e não o máximo da resposta, que fica cerca de 1,4 px para dentro', () => {
    const img = imagem(160, 120, (x, y) => (RETANGULO(x, y) ? 200 : 40));
    expect(piorErro(img, CANTOS, 12)).toBeLessThan(0.25);
  });

  it('porta vista de esguelha: retângulo rodado 10°, com anti-aliasing, cantos fora da grelha', () => {
    const a = (10 * Math.PI) / 180;
    const centro = { x: 80, y: 60 };
    const rodar = (p: Ponto): Ponto => ({
      x: centro.x + (p.x - centro.x) * Math.cos(a) - (p.y - centro.y) * Math.sin(a),
      y: centro.y + (p.x - centro.x) * Math.sin(a) + (p.y - centro.y) * Math.cos(a),
    });
    const cantos = CANTOS.map(rodar);
    // Dentro do polígono convexo (cantos no sentido dos ponteiros do relógio, com y para baixo).
    const noPoligono = (x: number, y: number) =>
      cantos.every((p, k) => {
        const q = cantos[(k + 1) % cantos.length]!;
        return (q.x - p.x) * (y - p.y) - (q.y - p.y) * (x - p.x) >= 0;
      });
    const img = imagem(160, 120, (x, y) => 40 + 160 * cobertura(x, y, noPoligono));
    expect(piorErro(img, cantos, 12)).toBeLessThan(0.5);
  });
});

describe('cantoMaisProximo — sem canto, fica o ponto apontado', () => {
  it('só uma aresta reta (meio plano), vertical ou horizontal → null', () => {
    const vertical = imagem(80, 80, (x) => (x < 40 ? 50 : 200));
    const horizontal = imagem(80, 80, (_x, y) => (y < 40 ? 200 : 50));
    for (const t of [20, 40, 60]) {
      expect(cantoMaisProximo(vertical, { x: 41, y: t }, 16)).toBeNull();
      expect(cantoMaisProximo(horizontal, { x: t, y: 38 }, 16)).toBeNull();
    }
  });

  it('aresta inclinada, com anti-aliasing → null', () => {
    for (const graus of [20, 45, 70]) {
      const a = (graus * Math.PI) / 180;
      const img = imagem(80, 80, (x, y) => 50 + 150 * cobertura(x, y, (px, py) => (px - 40) * Math.cos(a) + (py - 40) * Math.sin(a) >= 0));
      expect(cantoMaisProximo(img, { x: 40, y: 40 }, 16)).toBeNull();
      expect(cantoMaisProximo(img, { x: 40 + 10 * Math.sin(a), y: 40 - 10 * Math.cos(a) }, 16)).toBeNull();
    }
  });

  it('parede lisa → null', () => {
    const img = imagem(80, 80, () => 128);
    expect(cantoMaisProximo(img, { x: 40, y: 40 }, 16)).toBeNull();
  });

  it('parede lisa com ruído de ±12 níveis → null (não salta para o grão)', () => {
    for (let semente = 1; semente <= 20; semente++) {
      const n = ruido(semente, 12);
      const img = imagem(80, 80, () => 128 + n());
      expect(cantoMaisProximo(img, { x: 40, y: 40 }, 16)).toBeNull();
    }
  });

  it('aresta reta com ruído de ±12 níveis → null', () => {
    for (let semente = 1; semente <= 20; semente++) {
      const n = ruido(semente, 12);
      const img = imagem(80, 80, (x) => (x < 40 ? 50 : 200) + n());
      for (const y of [30, 50]) expect(cantoMaisProximo(img, { x: 41, y }, 16)).toBeNull();
    }
  });

  it('contorno curvo (disco de 4, 8 e 12 px de raio, contraste 200) → null: curva não é canto', () => {
    for (const R of [4, 8, 12]) {
      const img = imagem(140, 140, (x, y) => 28 + 200 * cobertura(x, y, (px, py) => Math.hypot(px - 70, py - 70) < R));
      for (let k = 0; k < 16; k++) {
        const t = (k * Math.PI) / 8;
        expect(cantoMaisProximo(img, { x: 70 + R * Math.cos(t), y: 70 + R * Math.sin(t) }, 16)).toBeNull();
      }
    }
  });
});

describe('cantoMaisProximo — fotografias imperfeitas', () => {
  it('ruído de ±12 níveis (com semente): cada canto a ≤ 1,5 px', () => {
    for (const semente of [1, 2, 3, 4, 5]) {
      const n = ruido(semente, 12);
      const img = imagem(160, 120, (x, y) => (RETANGULO(x, y) ? 180 : 60) + n());
      expect(piorErro(img, CANTOS, 12)).toBeLessThanOrEqual(1.5);
    }
  });

  it('iluminação em gradiente (porta escura numa parede com sombra): ainda encontra os 4 cantos', () => {
    // Luz de 20 % no canto de cima à esquerda até 100 % no de baixo à direita; parede reflete 80 %,
    // porta 35 %. No canto da porta mais à sombra o contraste é de 43 níveis; no mais claro, 92.
    const W = 240;
    const H = 180;
    const porta = dentro(60, 30, 150, 160);
    const luz = (x: number, y: number) => 0.2 + (0.8 * (x / W + y / H)) / 2;
    const img = imagem(W, H, (x, y) => Math.round(255 * (porta(x, y) ? 0.35 : 0.8) * luz(x, y)));
    const cantos = [
      { x: 60, y: 30 },
      { x: 150, y: 30 },
      { x: 150, y: 160 },
      { x: 60, y: 160 },
    ];
    expect(piorErro(img, cantos, 12)).toBeLessThanOrEqual(1);
    // O gradiente sozinho não faz cantos: na parede, longe da porta, fica o ponto apontado.
    expect(cantoMaisProximo(img, { x: 25, y: 100 }, 16)).toBeNull();
    expect(cantoMaisProximo(img, { x: 200, y: 100 }, 16)).toBeNull();
  });
});

describe('cantoMaisProximo — vários cantos dentro do raio', () => {
  // A: canto de cima à esquerda em (47, 50), contraste 70, a 3 px do ponto (50, 50).
  // B: canto de baixo à esquerda em (56, 42), contraste 140, a 10 px do ponto.
  const A = dentro(47, 50, 77, 80);
  const B = dentro(56, 12, 86, 42);
  const ponto = { x: 50, y: 50 };

  it('escolhe o canto a 3 px e não o mais contrastado a 10 px', () => {
    const img = imagem(120, 100, (x, y) => (A(x, y) ? 110 : B(x, y) ? 180 : 40));
    const r = cantoMaisProximo(img, ponto, 16);
    expect(r).not.toBeNull();
    expect(distancia(r!, { x: 47, y: 50 })).toBeLessThanOrEqual(1);
  });

  it('o canto a 10 px conta: sem o de 3 px, é ele que se encontra', () => {
    const img = imagem(120, 100, (x, y) => (B(x, y) ? 180 : 40));
    const r = cantoMaisProximo(img, ponto, 16);
    expect(r).not.toBeNull();
    expect(distancia(r!, { x: 56, y: 42 })).toBeLessThanOrEqual(1);
  });

  it('fora do raio não conta', () => {
    const img = imagem(120, 100, (x, y) => (B(x, y) ? 180 : 40));
    expect(cantoMaisProximo(img, ponto, 8)).toBeNull();
  });
});

describe('cantoMaisProximo — na borda da fotografia', () => {
  /** Os mesmos píxeis, mas a contar cada leitura fora do array. */
  function vigiado(p: Pixeis): { pixeis: Pixeis; foraDoArray: () => number } {
    let fora = 0;
    const data = new Proxy(p.data, {
      get(alvo, chave) {
        if (typeof chave === 'string' && /^-?\d+$/.test(chave)) {
          const i = Number(chave);
          if (i < 0 || i >= alvo.length) fora++;
          return alvo[i];
        }
        return Reflect.get(alvo, chave, alvo);
      },
    });
    return { pixeis: { data, width: p.width, height: p.height }, foraDoArray: () => fora };
  }

  // Retângulo [3, 30) × [3, 25) numa imagem 40×30: cantos a 3 px da borda.
  const img = imagem(40, 30, (x, y) => (dentro(3, 3, 30, 25)(x, y) ? 200 : 40));

  it('ponto a 2 px da borda (e na própria borda, e fora dela): não rebenta nem lê fora do array', () => {
    const { pixeis, foraDoArray } = vigiado(img);
    for (const p of [
      { x: 2, y: 2 },
      { x: 38, y: 28 },
      { x: 2, y: 15 },
      { x: 20, y: 2 },
      { x: 0, y: 0 },
      { x: 40, y: 30 },
      { x: -5, y: -5 },
      { x: 45, y: 35 },
      { x: 400, y: -300 },
    ]) {
      const r = cantoMaisProximo(pixeis, p, 16);
      if (r) {
        expect(r.x).toBeGreaterThanOrEqual(0);
        expect(r.x).toBeLessThanOrEqual(40);
        expect(r.y).toBeGreaterThanOrEqual(0);
        expect(r.y).toBeLessThanOrEqual(30);
      }
    }
    expect(foraDoArray()).toBe(0);
  });

  it('encontra um canto a 3 px da borda, apontado a 2 px dela; a borda em si não é canto', () => {
    const r = cantoMaisProximo(img, { x: 2, y: 2 }, 16);
    expect(r).not.toBeNull();
    expect(distancia(r!, { x: 3, y: 3 })).toBeLessThanOrEqual(1);
    const lisa = imagem(40, 30, () => 128);
    expect(cantoMaisProximo(lisa, { x: 0, y: 0 }, 16)).toBeNull();
    expect(cantoMaisProximo(lisa, { x: 40, y: 30 }, 16)).toBeNull();
  });

  it('entradas sem sentido → null', () => {
    expect(cantoMaisProximo(img, { x: Number.NaN, y: 2 }, 16)).toBeNull();
    expect(cantoMaisProximo(img, { x: 2, y: 2 }, 0)).toBeNull();
    expect(cantoMaisProximo({ data: new Uint8ClampedArray(0), width: 0, height: 0 }, { x: 0, y: 0 }, 16)).toBeNull();
  });
});

describe('cantoMaisProximo — desempenho', () => {
  it('fotografia 2000×1500: 100 chamadas com raio 16 em menos de 200 ms no total', () => {
    const W = 2000;
    const H = 1500;
    const n = ruido(7, 12);
    // Uma grelha de portas escuras numa parede clara, com grão.
    const img = imagem(W, H, (x, y) => (x % 400 >= 120 && x % 400 < 280 && y % 500 >= 100 && y % 500 < 450 ? 70 : 190) + n());
    const r = aleatorio(11);
    // Metade ao acaso na fotografia, metade perto dos cantos das portas (onde há trabalho a fazer).
    const pontos: Ponto[] = Array.from({ length: 100 }, (_, k) =>
      k % 2 === 0 ? { x: r() * W, y: r() * H } : { x: 120 + 400 * (k % 5) + (r() * 2 - 1) * 8, y: 100 + 500 * (k % 3) + (r() * 2 - 1) * 8 },
    );
    let encontrados = 0;
    const t0 = performance.now();
    for (const p of pontos) if (cantoMaisProximo(img, p, 16)) encontrados++;
    const total = performance.now() - t0;
    expect(total, `${total.toFixed(1)} ms`).toBeLessThan(200);
    // As medidas são de trabalho a sério: os pontos perto das portas encontram o canto (50 em 50, hoje).
    expect(encontrados).toBeGreaterThanOrEqual(40);
  });
});
