import { describe, expect, it } from 'vitest';
import { detetarJanelas, type JanelaDetetada, type Retangulo } from './deteccao';
import { enquadrarNoContorno, pixeisPorMetro, type Extensao, type Pixeis } from './endireitar';

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

type Cor = [number, number, number];

const dentro = (r: Retangulo, X: number, Y: number) => X >= r.x && X < r.x + r.largura && Y >= r.y && Y < r.y + r.altura;

const PAREDE: Cor = [236, 234, 226];
const VIDRO: Cor = [55, 66, 82];
const CAIXA_ESTORE: Cor = [214, 203, 178];
const CAIXILHO: Cor = [190, 190, 186];
const PEITORIL: Cor = [214, 214, 208];
const CEU: Cor = [140, 182, 228];
const CHAO: Cor = [104, 104, 100];
const VIZINHO: Cor = [196, 168, 140];

/** O contorno da fachada sintética: 12 × 18 m. */
const FACHADA: Retangulo = { x: 0, y: 0, largura: 12, altura: 18 };

/** Duas colunas × cinco pisos: 1,5 × 1,6 m, com os últimos 0,3 m de caixa de estore clara. */
function janelasDaFachada(): Retangulo[] {
  const out: Retangulo[] = [];
  for (const x of [2.6, 7.9]) for (let k = 0; k < 5; k++) out.push({ x, y: 1.6 + 3.3 * k, largura: 1.5, altura: 1.6 });
  return out;
}

interface Cena {
  janelas: Retangulo[];
  /** Roupa estendida à frente das janelas: retângulos com a sua cor. */
  roupa?: { r: Retangulo; cor: Cor }[];
  /** Iluminação de 0,6 a 1 ao longo da fachada, mais ruído de ±`ruido` níveis por canal. */
  gradiente?: boolean;
  ruido?: number;
  semente?: number;
}

/**
 * A vista endireitada como a ferramenta a desenha: o contorno da fachada com a margem de
 * `enquadrarNoContorno`, à escala de `pixeisPorMetro(ext, 1000, 1500)` — 1000 × 1500 píxeis. À volta
 * da fachada, céu, chão e um prédio vizinho com as suas janelas (fora do contorno).
 */
function vistaSintetica(cena: Cena): { vista: Pixeis; ext: Extensao; ppm: number } {
  const ext = enquadrarNoContorno([{ tipo: 'fachada', ...FACHADA }], { x0: -30, x1: 40, y0: -3, y1: 50 });
  const ppm = pixeisPorMetro(ext, 1000, 1500);
  const W = Math.round((ext.x1 - ext.x0) * ppm);
  const H = Math.round((ext.y1 - ext.y0) * ppm);
  const data = new Uint8ClampedArray(W * H * 4);
  const rnd = aleatorio(cena.semente ?? 1);
  const amp = cena.ruido ?? 0;
  const vizinhas: Retangulo[] = [];
  for (let k = 0; k < 6; k++)
    vizinhas.push({ x: -1.15, y: 1.2 + 3 * k, largura: 0.9, altura: 1.4 }, { x: 12.3, y: 2 + 3 * k, largura: 0.8, altura: 1.3 });
  for (let lin = 0; lin < H; lin++) {
    const Y = ext.y1 - (lin + 0.5) / ppm;
    for (let col = 0; col < W; col++) {
      const X = ext.x0 + (col + 0.5) / ppm;
      let cor: Cor;
      if (dentro(FACHADA, X, Y)) {
        cor = PAREDE;
        for (const j of cena.janelas) {
          const peitoril = { x: j.x - 0.05, y: j.y - 0.06, largura: j.largura + 0.1, altura: 0.06 };
          if (dentro(peitoril, X, Y)) cor = PEITORIL;
          if (!dentro(j, X, Y)) continue;
          if (Y >= j.y + j.altura - 0.3) {
            // Caixa de estore: réguas de 5 cm, ligeiramente mais escuras na junta.
            cor = (Y * 20) % 1 < 0.15 ? [CAIXA_ESTORE[0] - 14, CAIXA_ESTORE[1] - 14, CAIXA_ESTORE[2] - 14] : CAIXA_ESTORE;
          } else if (Math.abs(X - (j.x + j.largura / 2)) < 0.03 || X < j.x + 0.04 || X >= j.x + j.largura - 0.04 || Y < j.y + 0.04) {
            cor = CAIXILHO;
          } else cor = VIDRO;
        }
        for (const r of cena.roupa ?? []) if (dentro(r.r, X, Y)) cor = r.cor;
      } else if (Y < 0) cor = CHAO;
      else if (X < 0 || X > 12) {
        cor = Y < 20 ? VIZINHO : CEU;
        for (const v of vizinhas) if (dentro(v, X, Y)) cor = VIDRO;
      } else cor = CEU;
      const luz = cena.gradiente ? 0.6 + 0.4 * ((0.5 * (X - ext.x0)) / (ext.x1 - ext.x0) + (0.5 * (Y - ext.y0)) / (ext.y1 - ext.y0)) : 1;
      const o = (lin * W + col) * 4;
      for (let c = 0; c < 3; c++) data[o + c] = cor[c]! * luz + (amp ? Math.round((rnd() * 2 - 1) * amp) : 0);
      data[o + 3] = 255;
    }
  }
  return { vista: { data, width: W, height: H }, ext, ppm };
}

function iou(a: Retangulo, b: Retangulo): number {
  const ix = Math.max(0, Math.min(a.x + a.largura, b.x + b.largura) - Math.max(a.x, b.x));
  const iy = Math.max(0, Math.min(a.y + a.altura, b.y + b.altura) - Math.max(a.y, b.y));
  const i = ix * iy;
  return i / (a.largura * a.altura + b.largura * b.altura - i);
}

/** Recall e precisão com correspondência um-para-um a partir de `minimo` de IoU. */
function avaliar(verdade: Retangulo[], propostas: JanelaDetetada[], minimo: number) {
  const usadas = new Set<number>();
  const encontradas: boolean[] = [];
  for (const v of verdade) {
    let melhor = -1;
    let melhorIou = minimo;
    propostas.forEach((p, k) => {
      const q = iou(v, p);
      if (!usadas.has(k) && q >= melhorIou) {
        melhor = k;
        melhorIou = q;
      }
    });
    if (melhor >= 0) usadas.add(melhor);
    encontradas.push(melhor >= 0);
  }
  return {
    recall: usadas.size / verdade.length,
    precisao: propostas.length ? usadas.size / propostas.length : 1,
    encontradas,
  };
}

describe('detetarJanelas', () => {
  it('fachada branca com 2 colunas × 5 pisos de janelas escuras e caixa de estore clara', () => {
    const janelas = janelasDaFachada();
    const { vista, ext, ppm } = vistaSintetica({ janelas });
    const propostas = detetarJanelas(vista, ext, ppm, [FACHADA]);
    const r = avaliar(janelas, propostas, 0.6);
    expect(r.recall).toBeGreaterThanOrEqual(0.9);
    expect(r.precisao).toBeGreaterThanOrEqual(0.9);
    for (const p of propostas) {
      expect(p.confianca).toBeGreaterThan(0);
      expect(p.confianca).toBeLessThanOrEqual(1);
    }
  });

  it('com gradiente de iluminação e ruído de ±15 níveis, o mesmo', () => {
    const janelas = janelasDaFachada();
    const { vista, ext, ppm } = vistaSintetica({ janelas, gradiente: true, ruido: 15, semente: 7 });
    const propostas = detetarJanelas(vista, ext, ppm, [FACHADA]);
    const r = avaliar(janelas, propostas, 0.6);
    expect(r.recall).toBeGreaterThanOrEqual(0.9);
    expect(r.precisao).toBeGreaterThanOrEqual(0.9);
  });

  it('parede lisa: nenhuma proposta', () => {
    const { vista, ext, ppm } = vistaSintetica({ janelas: [], gradiente: true, ruido: 15, semente: 3 });
    expect(detetarJanelas(vista, ext, ppm, [FACHADA])).toEqual([]);
  });

  it('janelas fora do contorno ficam de fora (a outra coluna, o prédio vizinho)', () => {
    const janelas = janelasDaFachada();
    const { vista, ext, ppm } = vistaSintetica({ janelas, gradiente: true, ruido: 15, semente: 11 });
    const metade: Retangulo = { x: 0, y: 0, largura: 6, altura: 18 };
    const propostas = detetarJanelas(vista, ext, ppm, [metade]);
    for (const p of propostas) {
      expect(p.x).toBeGreaterThanOrEqual(metade.x - 0.01);
      expect(p.x + p.largura).toBeLessThanOrEqual(metade.x + metade.largura + 0.01);
    }
    const r = avaliar(
      janelas.filter((j) => j.x < 6),
      propostas,
      0.6,
    );
    expect(r.recall).toBeGreaterThanOrEqual(0.8);
    expect(r.precisao).toBeGreaterThanOrEqual(0.9);
  });

  it('uma janela tapada em parte pela roupa estendida não faz desaparecer a coluna', () => {
    const janelas = janelasDaFachada();
    const tapada = janelas[2]!; // coluna da esquerda, 3.º piso
    const cores: Cor[] = [
      [200, 40, 50],
      [40, 90, 180],
      [240, 200, 60],
      [250, 250, 250],
      [30, 150, 90],
    ];
    const roupa = cores.map((cor, k) => ({
      r: { x: tapada.x - 0.1 + k * 0.36, y: tapada.y - 0.35 - (k % 2) * 0.15, largura: 0.3, altura: 0.9 + (k % 2) * 0.15 },
      cor,
    }));
    const { vista, ext, ppm } = vistaSintetica({ janelas, roupa, gradiente: true, ruido: 15, semente: 5 });
    const propostas = detetarJanelas(vista, ext, ppm, [FACHADA]);
    const r = avaliar(janelas, propostas, 0.6);
    const colunaEsquerda = r.encontradas.slice(0, 5);
    // As outras quatro da coluna continuam lá, e a tapada também, ainda que com a roupa a puxá-la.
    expect(colunaEsquerda.filter((e, k) => e && k !== 2).length).toBe(4);
    expect(Math.max(...propostas.map((p) => iou(tapada, p)))).toBeGreaterThanOrEqual(0.5);
    expect(r.recall).toBeGreaterThanOrEqual(0.9);
    expect(r.precisao).toBeGreaterThanOrEqual(0.9);
  });

  it('numa coluna regular, uma janela que não existe não se inventa', () => {
    const todas = janelasDaFachada();
    const falta = todas[2]!; // coluna da esquerda, 3.º piso: só parede
    const janelas = todas.filter((j) => j !== falta);
    const { vista, ext, ppm } = vistaSintetica({ janelas, gradiente: true, ruido: 15, semente: 13 });
    const propostas = detetarJanelas(vista, ext, ppm, [FACHADA]);
    expect(propostas.some((p) => iou(falta, p) > 0.1)).toBe(false);
    const r = avaliar(janelas, propostas, 0.6);
    expect(r.recall).toBeGreaterThanOrEqual(0.9);
    expect(r.precisao).toBeGreaterThanOrEqual(0.9);
  });

  it('corre em menos de 400 ms numa vista de 1000 × 1500', () => {
    const { vista, ext, ppm } = vistaSintetica({ janelas: janelasDaFachada(), gradiente: true, ruido: 15, semente: 9 });
    expect(vista.width * vista.height).toBeGreaterThanOrEqual(1000 * 1499);
    detetarJanelas(vista, ext, ppm, [FACHADA]); // a primeira chamada também compila
    const t0 = performance.now();
    detetarJanelas(vista, ext, ppm, [FACHADA]);
    expect(performance.now() - t0).toBeLessThan(400);
  });
});
