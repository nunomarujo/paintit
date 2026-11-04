import { aplicar, type Calibracao, type Matriz3 } from '@/domain/homografia';
import type { Zona } from '@/domain/fachadaMedida';

/**
 * Desenhar a fachada "endireitada": cada píxel da vista de frente (em metros, à escala) vai buscar a
 * cor à fotografia através da homografia plano → imagem. Funções puras sobre arrays de píxeis, para
 * se testarem sem browser.
 */

export interface Extensao {
  x0: number;
  x1: number;
  y0: number;
  y1: number;
}

export interface Pixeis {
  data: Uint8ClampedArray;
  width: number;
  height: number;
}

/** Margem à volta da referência para lá da qual não se desenha (metros), por mais que a fotografia mostre. */
const MARGEM_LATERAL_M = 40;
const ALTURA_MAXIMA_M = 60;

/**
 * A parte do plano da fachada que a fotografia mostra, em metros. Percorre o contorno da fotografia,
 * leva cada ponto ao plano e fica com a caixa que os envolve — ignorando o que está para lá da linha
 * do horizonte do plano (céu acima da fachada, que iria para o infinito) e limitando a uma caixa
 * razoável à volta da referência.
 */
export function extensaoDoPlano(
  cal: Calibracao,
  larguraImg: number,
  alturaImg: number,
  ref: { larguraM: number; alturaM: number },
): Extensao {
  const xs: number[] = [];
  const ys: number[] = [];
  const N = 32;
  const [, , , , , , g, i, k] = cal.planoParaImagem;
  for (let n = 0; n <= N; n++) {
    const t = n / N;
    for (const q of [
      { x: t * larguraImg, y: 0 },
      { x: t * larguraImg, y: alturaImg },
      { x: 0, y: t * alturaImg },
      { x: larguraImg, y: t * alturaImg },
    ]) {
      const p = aplicar(cal.imagemParaPlano, q);
      if (!p || !Number.isFinite(p.x) || !Number.isFinite(p.y)) continue;
      // Do lado visível do plano, w (plano → imagem) é positivo; do outro lado do horizonte, não.
      if (!(g * p.x + i * p.y + k > 0)) continue;
      xs.push(p.x);
      ys.push(p.y);
    }
  }
  const limite = {
    x0: -MARGEM_LATERAL_M,
    x1: ref.larguraM + MARGEM_LATERAL_M,
    y0: -3,
    y1: ALTURA_MAXIMA_M,
  };
  if (xs.length === 0) return { x0: -5, x1: ref.larguraM + 5, y0: -1, y1: ref.alturaM + 10 };
  return {
    x0: Math.max(limite.x0, Math.min(0, ...xs)),
    x1: Math.min(limite.x1, Math.max(ref.larguraM, ...xs)),
    y0: Math.max(limite.y0, Math.min(0, ...ys)),
    y1: Math.min(limite.y1, Math.max(ref.alturaM, ...ys)),
  };
}

/**
 * A vista de frente: `ppm` píxeis por metro, Y para cima (a linha 0 da imagem é o Y mais alto).
 * Interpolação bilinear; o que fica fora da fotografia sai cinzento-claro.
 */
export function endireitar(origem: Pixeis, planoParaImagem: Matriz3, ext: Extensao, ppm: number): Pixeis {
  const largura = Math.max(1, Math.round((ext.x1 - ext.x0) * ppm));
  const altura = Math.max(1, Math.round((ext.y1 - ext.y0) * ppm));
  const out = new Uint8ClampedArray(largura * altura * 4);
  const [a, b, c, d, e, f, g, i, k] = planoParaImagem;
  const W = origem.width;
  const H = origem.height;
  const src = origem.data;
  for (let lin = 0; lin < altura; lin++) {
    const Y = ext.y1 - (lin + 0.5) / ppm;
    for (let col = 0; col < largura; col++) {
      const X = ext.x0 + (col + 0.5) / ppm;
      const o = (lin * largura + col) * 4;
      const w = g * X + i * Y + k;
      if (w > 0) {
        const u = (a * X + b * Y + c) / w;
        const v = (d * X + e * Y + f) / w;
        if (u >= 0 && v >= 0 && u < W - 1 && v < H - 1) {
          const u0 = Math.floor(u);
          const v0 = Math.floor(v);
          const fu = u - u0;
          const fv = v - v0;
          const p00 = (v0 * W + u0) * 4;
          const p10 = p00 + 4;
          const p01 = p00 + W * 4;
          const p11 = p01 + 4;
          for (let ch = 0; ch < 3; ch++) {
            out[o + ch] =
              src[p00 + ch]! * (1 - fu) * (1 - fv) +
              src[p10 + ch]! * fu * (1 - fv) +
              src[p01 + ch]! * (1 - fu) * fv +
              src[p11 + ch]! * fu * fv;
          }
          out[o + 3] = 255;
          continue;
        }
      }
      out[o] = 241;
      out[o + 1] = 245;
      out[o + 2] = 249;
      out[o + 3] = 255;
    }
  }
  return { data: out, width: largura, height: altura };
}

/** Píxeis por metro para a vista caber em `larguraMax` × `alturaMax` píxeis. */
export function pixeisPorMetro(ext: Extensao, larguraMax: number, alturaMax: number): number {
  return Math.max(4, Math.min(larguraMax / (ext.x1 - ext.x0), alturaMax / (ext.y1 - ext.y0)));
}

/**
 * Enquadramento da vista depois de desenhado o contorno: a caixa dos contornos (`fachada`) com uma
 * margem de 10 % (no mínimo 1 m), sem sair da parte do plano que a fotografia mostra. Sem contorno,
 * a vista inteira. Com o prédio a ocupar a vista toda, cada metro ganha cerca de três vezes mais
 * píxeis — e no telemóvel deixa de ser impossível desenhar uma janela.
 */
export function enquadrarNoContorno(
  zonas: {
    tipo: string;
    x: number;
    y: number;
    largura: number;
    altura: number;
  }[],
  total: Extensao,
): Extensao {
  const contornos = zonas.filter((z) => z.tipo === 'fachada');
  if (contornos.length === 0) return total;
  const x0 = Math.min(...contornos.map((z) => z.x));
  const x1 = Math.max(...contornos.map((z) => z.x + z.largura));
  const y0 = Math.min(...contornos.map((z) => z.y));
  const y1 = Math.max(...contornos.map((z) => z.y + z.altura));
  const mx = Math.max(1, (x1 - x0) * 0.1);
  const my = Math.max(1, (y1 - y0) * 0.1);
  return {
    x0: Math.max(total.x0, x0 - mx),
    x1: Math.min(total.x1, x1 + mx),
    y0: Math.max(total.y0, y0 - my),
    y1: Math.min(total.y1, y1 + my),
  };
}

/**
 * Uma zona desenhada com uma calibração, levada para outra (depois de "acertar o endireitamento"):
 * os cantos vão à fotografia pela calibração antiga e voltam ao plano pela nova. A zona fica no mesmo
 * sítio da fotografia — a janela continua em cima da janela.
 */
export function remapearZona(z: Zona, planoParaImagemAntes: Matriz3, imagemParaPlanoDepois: Matriz3): Zona {
  const cantos = [
    { x: z.x, y: z.y },
    { x: z.x + z.largura, y: z.y },
    { x: z.x + z.largura, y: z.y + z.altura },
    { x: z.x, y: z.y + z.altura },
  ].map((p) => {
    const q = aplicar(planoParaImagemAntes, p);
    return q ? aplicar(imagemParaPlanoDepois, q) : null;
  });
  if (cantos.some((c) => !c || !Number.isFinite(c.x) || !Number.isFinite(c.y))) return z;
  const xs = cantos.map((c) => c!.x);
  const ys = cantos.map((c) => c!.y);
  const [x0, y0] = [Math.min(...xs), Math.min(...ys)];
  return { ...z, x: x0, y: y0, largura: Math.max(...xs) - x0, altura: Math.max(...ys) - y0 };
}
