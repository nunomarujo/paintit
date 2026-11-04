import { describe, expect, it } from 'vitest';
import { zonaContem } from '@/domain/fachadaMedida';
import { detetarJanelas, type Contorno, type JanelaDetetada, type Retangulo } from './deteccao';
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

/**
 * O melhor de 3 tempos, depois de uma chamada que compila. Com os testes todos a correr em paralelo,
 * uma só medida passou dos 400 ms (427) numa deteção que sozinha leva 160; o melhor de 3 aguenta a
 * carga e continua a apanhar o que este teste existe para apanhar (o degrau para 1,1–1,4 s).
 */
function melhorTempo(f: () => unknown): number {
  f();
  let melhor = Infinity;
  for (let i = 0; i < 3; i++) {
    const t0 = performance.now();
    f();
    melhor = Math.min(melhor, performance.now() - t0);
  }
  return melhor;
}

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
  /** A fachada pintada; por omissão `FACHADA`, de 12 × 18 m. */
  fachada?: Retangulo;
  /** Os contornos que enquadram a vista, como na ferramenta; por omissão a fachada. */
  contornos?: Contorno[];
  /** A vista inteira em vez do enquadramento no contorno («Ver a fotografia inteira»). */
  extensao?: Extensao;
  /** A cor da parede em cada ponto (placas de revestimento, um telhado à frente). */
  parede?: (X: number, Y: number) => Cor;
  /** Pintado por cima do resto da fachada (claraboias, manchas): `null` deixa o que lá está. */
  sobre?: (X: number, Y: number) => Cor | null;
}

/**
 * A vista endireitada como a ferramenta a desenha: o contorno da fachada com a margem de
 * `enquadrarNoContorno`, à escala de `pixeisPorMetro(ext, 1000, 1500)` — 1000 × 1500 píxeis. À volta
 * da fachada, céu, chão e um prédio vizinho com as suas janelas (fora do contorno).
 */
function vistaSintetica(cena: Cena): { vista: Pixeis; ext: Extensao; ppm: number } {
  const F = cena.fachada ?? FACHADA;
  const ext =
    cena.extensao ??
    enquadrarNoContorno(
      (cena.contornos ?? [F]).map((c) => ({ tipo: 'fachada', ...c })),
      { x0: -30, x1: 60, y0: -3, y1: 60 },
    );
  const ppm = pixeisPorMetro(ext, 1000, 1500);
  const W = Math.round((ext.x1 - ext.x0) * ppm);
  const H = Math.round((ext.y1 - ext.y0) * ppm);
  const data = new Uint8ClampedArray(W * H * 4);
  const rnd = aleatorio(cena.semente ?? 1);
  const amp = cena.ruido ?? 0;
  const vizinhas: Retangulo[] = [];
  for (let k = 0; k < 6; k++)
    vizinhas.push(
      { x: F.x - 1.15, y: 1.2 + 3 * k, largura: 0.9, altura: 1.4 },
      { x: F.x + F.largura + 0.3, y: 2 + 3 * k, largura: 0.8, altura: 1.3 },
    );
  // As janelas de cada metro em X, para não as percorrer todas em cada píxel.
  const porMetro = new Map<number, Retangulo[]>();
  for (const j of cena.janelas)
    for (let k = Math.floor(j.x - 0.1); k <= Math.floor(j.x + j.largura + 0.1); k++) porMetro.set(k, [...(porMetro.get(k) ?? []), j]);
  for (let lin = 0; lin < H; lin++) {
    const Y = ext.y1 - (lin + 0.5) / ppm;
    for (let col = 0; col < W; col++) {
      const X = ext.x0 + (col + 0.5) / ppm;
      let cor: Cor;
      if (dentro(F, X, Y)) {
        cor = cena.parede ? cena.parede(X, Y) : PAREDE;
        for (const j of porMetro.get(Math.floor(X)) ?? []) {
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
        cor = cena.sobre?.(X, Y) ?? cor;
      } else if (Y < 0) cor = CHAO;
      else if (X < F.x || X > F.x + F.largura) {
        cor = Y < F.altura + 2 ? VIZINHO : CEU;
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

/** Placas de revestimento de `pl` × `pa` m com juntas escuras de 5 cm, em fiadas desencontradas. */
function placas(pl: number, pa: number): (X: number, Y: number) => Cor {
  return (X, Y) => {
    const fiada = Math.floor(Y / pa);
    const xo = X + (fiada % 2 ? pl / 2 : 0);
    const junta = Y - fiada * pa < 0.05 || xo - Math.floor(xo / pl) * pl < 0.05;
    return junta ? [120, 118, 112] : [215, 210, 198];
  };
}

/** Quarenta manchas elípticas (1 : 1,5), de 20 a 60 níveis mais escuras, com a orla nítida. */
function manchas(semente: number): (X: number, Y: number) => Cor | null {
  const r = aleatorio(semente * 101);
  const ms = Array.from({ length: 40 }, () => {
    const a = 0.3 + 1.2 * r();
    return { cx: 12 * r(), cy: 18 * r(), a, b: a / 1.5, ang: Math.PI * r(), esc: 20 + 40 * r() };
  });
  return (X, Y) => {
    let esc = 0;
    for (const m of ms) {
      const dx = X - m.cx;
      const dy = Y - m.cy;
      if (Math.abs(dx) > m.a || Math.abs(dy) > m.a) continue;
      const u = (dx * Math.cos(m.ang) + dy * Math.sin(m.ang)) / m.a;
      const v = (-dx * Math.sin(m.ang) + dy * Math.cos(m.ang)) / m.b;
      if (u * u + v * v < 1) esc = Math.max(esc, m.esc);
    }
    return esc ? [PAREDE[0] - esc, PAREDE[1] - esc, PAREDE[2] - esc] : null;
  };
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
    expect(melhorTempo(() => detetarJanelas(vista, ext, ppm, [FACHADA]))).toBeLessThan(400);
  });
  it('contorno triangular: nada com o centro fora do triângulo, nem as claraboias do telhado do vizinho', () => {
    // Uma empena de 10 × 8 m por cima do telhado de telha do vizinho, contornada com o triângulo de
    // ângulo reto em cima à direita; no telhado, abaixo da diagonal, duas claraboias escuras.
    const empena: Retangulo = { x: 0, y: 0, largura: 10, altura: 8 };
    const contorno: Contorno = { ...empena, triangulo: 'sup-dir' };
    const claraboias: Retangulo[] = [
      { x: 1, y: 1, largura: 1, altura: 1.2 },
      { x: 3, y: 1, largura: 1, altura: 1.2 },
    ];
    const janelas: Retangulo[] = [
      { x: 6, y: 5, largura: 1.2, altura: 1.4 },
      { x: 8, y: 5, largura: 1.2, altura: 1.4 },
    ];
    const { vista, ext, ppm } = vistaSintetica({
      janelas,
      fachada: empena,
      contornos: [contorno],
      parede: (X, Y) => (Y >= 8 - 0.8 * X ? PAREDE : (Y * 4) % 1 < 0.15 ? [120, 55, 40] : [175, 85, 62]),
      sobre: (X, Y) => (claraboias.some((c) => dentro(c, X, Y)) ? [40, 48, 60] : null),
      ruido: 6,
    });
    const propostas = detetarJanelas(vista, ext, ppm, [contorno]);
    for (const p of propostas)
      expect(zonaContem({ id: '', tipo: 'fachada', ...contorno }, { x: p.x + p.largura / 2, y: p.y + p.altura / 2 })).toBe(true);
    expect(propostas.some((p) => claraboias.some((c) => iou(c, p) > 0.1))).toBe(false);
    expect(avaliar(janelas, propostas, 0.6).recall).toBe(1);

    // Uma grelha de 4 × 5 janelas e o contorno com o ângulo reto em cima à esquerda: as que estão
    // abaixo da diagonal ficam de fora; as que estão todas dentro, saem.
    const grelha: Retangulo[] = [];
    for (const x of [1.5, 4.2, 7.5, 10]) for (let k = 0; k < 5; k++) grelha.push({ x, y: 1.6 + 3.3 * k, largura: 1.2, altura: 1.4 });
    const triangulo: Contorno = { ...FACHADA, triangulo: 'sup-esq' };
    const v2 = vistaSintetica({ janelas: grelha, contornos: [triangulo] });
    const p2 = detetarJanelas(v2.vista, v2.ext, v2.ppm, [triangulo]);
    const zona = { id: '', tipo: 'fachada' as const, ...triangulo };
    for (const p of p2) expect(zonaContem(zona, { x: p.x + p.largura / 2, y: p.y + p.altura / 2 })).toBe(true);
    const inteiras = grelha.filter((j) => zonaContem(zona, { x: j.x + j.largura, y: j.y }));
    expect(inteiras.length).toBe(8);
    expect(avaliar(inteiras, p2, 0.6).recall).toBe(1);
  });

  it('uma janela por cima da junta de dois contornos encostados sai inteira', () => {
    const janelas: Retangulo[] = [];
    for (const x of [5.3, 9]) for (let k = 0; k < 5; k++) janelas.push({ x, y: 1.6 + 3.3 * k, largura: 1.5, altura: 1.6 });
    const contornos: Contorno[] = [
      { x: 0, y: 0, largura: 6, altura: 18 },
      { x: 6, y: 0, largura: 6, altura: 18 },
    ];
    const { vista, ext, ppm } = vistaSintetica({ janelas, contornos });
    const r = avaliar(janelas, detetarJanelas(vista, ext, ppm, contornos), 0.6);
    expect(r.recall).toBe(1);
    expect(r.precisao).toBe(1);
  });

  it('placas de revestimento: as juntas e a borda do contorno não fecham painéis em janelas', () => {
    const parede = placas(2, 1.2);
    // O contorno em cima da fachada e 0,3 m para fora dela (apanha uma faixa do prédio vizinho).
    for (const contorno of [FACHADA, { x: -0.3, y: -0.3, largura: 12.6, altura: 18.6 }]) {
      const { vista, ext, ppm } = vistaSintetica({ janelas: [], parede, ruido: 6, contornos: [contorno] });
      expect(detetarJanelas(vista, ext, ppm, [contorno])).toEqual([]);
    }
    const janelas = janelasDaFachada();
    const { vista, ext, ppm } = vistaSintetica({ janelas, parede, ruido: 6 });
    const r = avaliar(janelas, detetarJanelas(vista, ext, ppm, [FACHADA]), 0.6);
    expect(r.recall).toBe(1);
    expect(r.precisao).toBe(1);
  });

  it('placas mais pequenas do que um buraco de vidro (1,2 × 1,0 m): a parede não fica toda marcada', () => {
    const janelas = janelasDaFachada();
    const { vista, ext, ppm } = vistaSintetica({ janelas, parede: placas(1.2, 1), ruido: 6 });
    const r = avaliar(janelas, detetarJanelas(vista, ext, ppm, [FACHADA]), 0.6);
    expect(r.recall).toBeGreaterThanOrEqual(0.9);
    expect(r.precisao).toBeGreaterThanOrEqual(0.9);
  });

  it('manchas de humidade e remendos de orla nítida não saem como janelas', () => {
    for (const semente of [6, 8]) {
      const { vista, ext, ppm } = vistaSintetica({ janelas: [], sobre: manchas(semente), ruido: 6, semente });
      for (const p of detetarJanelas(vista, ext, ppm, [FACHADA])) expect(p.confianca).toBeLessThan(0.5);
    }
  });

  it('com menos de 40 píxeis por metro (fachada grande, ou a fotografia inteira) continua abaixo de 400 ms', () => {
    // Fachada de 20 × 32 m com 6 × 10 janelas: 39 píxeis por metro, uma vista de 942 × 1500.
    const grande: Retangulo = { x: 0, y: 0, largura: 20, altura: 32 };
    const janelas: Retangulo[] = [];
    for (let a = 0; a < 6; a++) for (let b = 0; b < 10; b++) janelas.push({ x: 1.5 + 3 * a, y: 1.5 + 3 * b, largura: 1.2, altura: 1.4 });
    const { vista, ext, ppm } = vistaSintetica({ janelas, fachada: grande, gradiente: true, ruido: 15, semente: 3 });
    expect(ppm).toBeLessThan(40);
    expect(melhorTempo(() => detetarJanelas(vista, ext, ppm, [grande]))).toBeLessThan(400);
    let r = avaliar(janelas, detetarJanelas(vista, ext, ppm, [grande]), 0.6);
    expect(r.recall).toBeGreaterThanOrEqual(0.9);
    expect(r.precisao).toBeGreaterThanOrEqual(0.9);

    // A fachada de 12 × 18 m numa vista de 40 × 36 m («Ver a fotografia inteira»): 25 píxeis por metro.
    const tudo = vistaSintetica({
      janelas: janelasDaFachada(),
      extensao: { x0: -14, x1: 26, y0: -3, y1: 33 },
      gradiente: true,
      ruido: 15,
      semente: 4,
    });
    expect(tudo.ppm).toBeLessThan(40);
    expect(melhorTempo(() => detetarJanelas(tudo.vista, tudo.ext, tudo.ppm, [FACHADA]))).toBeLessThan(400);
    r = avaliar(janelasDaFachada(), detetarJanelas(tudo.vista, tudo.ext, tudo.ppm, [FACHADA]), 0.6);
    expect(r.recall).toBeGreaterThanOrEqual(0.9);
    expect(r.precisao).toBeGreaterThanOrEqual(0.9);
  });
});
