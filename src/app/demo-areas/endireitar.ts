import { aplicar, type Calibracao, type Matriz3, type Ponto } from '@/domain/homografia';
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
 *
 * Na calibração nova os quatro cantos já não fazem um retângulo, e a zona tem de voltar a sê-lo: cada
 * lado fica **a meio** dos dois cantos desse lado (o esquerdo na média dos x dos cantos da esquerda, e
 * assim por diante) — o retângulo mais perto dos quatro cantos, e o que quem desenha poria à mão por
 * cima deles. Com a área do quadrilátero, a menos de um termo de segunda ordem na deformação. Até
 * 04/11/2026 ficava a caixa que envolve os quatro cantos, que é sempre maior: depois de um acerto, o
 * contorno de 6 × 12 m da câmara virtual crescia 5,4 m² (+7,5 %) sem ninguém lhe tocar, cada ida e
 * volta à mesma calibração acrescentava mais 0,45 %, e a margem de erro (`margemDaArea`) não via esse
 * crescimento, já gravado nas zonas. Um canto que não se possa levar (para lá do horizonte) deixa a
 * zona como estava.
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
  const [ie, id, sd, se] = cantos as [Ponto, Ponto, Ponto, Ponto]; // inferior esquerdo, inferior direito, superior direito, superior esquerdo
  const esquerda = (ie.x + se.x) / 2;
  const direita = (id.x + sd.x) / 2;
  const baixo = (ie.y + id.y) / 2;
  const cima = (se.y + sd.y) / 2;
  // Uma calibração que espelhe o plano trocaria os lados: o retângulo fica o mesmo, com largura positiva.
  return {
    ...z,
    x: Math.min(esquerda, direita),
    y: Math.min(baixo, cima),
    largura: Math.abs(direita - esquerda),
    altura: Math.abs(cima - baixo),
  };
}

/** Duas homografias iguais (a mesma calibração recalculada dá os mesmos números, a menos do arredondamento). */
export const mesmaMatriz = (a: Matriz3, b: Matriz3) => a.every((v, i) => Math.abs(v - b[i]!) <= 1e-12 * Math.max(1, Math.abs(v)));

/**
 * De onde veio cada zona que já foi levada a outra calibração: a zona tal como estava desenhada e a
 * calibração (plano → imagem) em que o estava. Por objeto de zona — uma zona mexida à mão é um objeto
 * novo, sem origem, e passa a ser ela a origem; um «Desfazer» devolve os objetos antigos, com as suas.
 */
export type OrigensDasZonas = WeakMap<Zona, { zona: Zona; base: Matriz3 }>;

/**
 * As zonas, escritas na calibração `base`, levadas à calibração `nova` (`remapearZona`) — sempre a
 * partir de como foram desenhadas, e não de como ficaram no acerto anterior. Assim, voltar à
 * calibração em que se desenhou («Retirar o acerto», a referência reposta) devolve as zonas exatamente
 * como estavam, e uma série de acertos leva cada zona uma vez só, sem juntar o desvio de cada passo.
 * Com a caixa que `remapearZona` usava até 04/11/2026, cada ida e volta acrescentava 0,45 % ao
 * contorno da fotografia do promotor; com o retângulo a meio dos cantos sobrava um desvio de segunda
 * ordem (0,2 % por ida e volta entre a porta pequena sozinha e as três arestas), e com isto, nenhum.
 */
export function levarZonas(zonas: Zona[], base: Matriz3, nova: Calibracao, origens: OrigensDasZonas): Zona[] {
  return zonas.map((z) => {
    const origem = origens.get(z) ?? { zona: z, base };
    if (mesmaMatriz(origem.base, nova.planoParaImagem)) return origem.zona;
    const levada = remapearZona(origem.zona, origem.base, nova.imagemParaPlano);
    if (levada !== origem.zona) origens.set(levada, origem);
    return levada;
  });
}
