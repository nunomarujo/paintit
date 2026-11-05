import type { Ponto } from '@/domain/homografia';
import { aleatorio } from './arestasPropostas';
import type { Pixeis } from './endireitar';

/**
 * Uma fachada fotografada por uma câmara virtual, para os testes de `proporArestas` — só para os
 * testes: a aplicação não a usa. Fica num ficheiro à parte para os ensaios poderem pedir variantes
 * (outra câmara, um tubo de queda inclinado, uma rua inclinada) sem repetir o desenho.
 *
 * A fachada, de 12 × 18 m: embasamento, R/C com duas montras e a porta (a referência, 1,20 × 2,40 m),
 * cinco faixas de laje, três colunas de janelas com peitoril, uma coluna de varandas salientes (1,3 m,
 * com os lados perpendiculares à fachada à vista e o fundo), a cimalha, e manchas suaves na parede. À
 * direita, um prédio vizinho rodado 25° (outro ponto de fuga), com janelas e faixas; à volta, céu e um
 * passeio com juntas. A parede lisa (`lisa`) é uma parede só, maior do que a fotografia, com a porta. A
 * empena (`poucas`) é a fachada só com a porta, o embasamento, as lajes e a cimalha — sem janelas, montras,
 * varandas nem vizinho: poucas verticais compridas, as duas esquinas.
 *
 * Coordenadas do mundo em metros: X ao longo da fachada, Y para cima, Z para a câmara; a fachada é Z = 0.
 */

export type V = [number, number, number];
type Cor = [number, number, number];

/** Uma reta do mundo, com o nome para as mensagens dos testes. */
export interface Reta3D {
  nome: string;
  a: V;
  b: V;
}

export const LARGURA = 1500;
export const ALTURA = 2000;
export const FOCAL = 1500;

export const LAJES = [3.5, 6.4, 9.3, 12.2, 15.1];
const VARANDAS = [6.4, 9.3, 12.2, 15.1];
const VARANDA = { x0: 1, x1: 3.4, fundo: 1.3, abaixo: 0.2, acima: 1 };
const COLUNAS: [number, number][] = [
  [4.6, 5.9],
  [7.4, 8.7],
  [9.9, 11.2],
];
const MONTRAS: [number, number][] = [
  [0.6, 4.6],
  [7.4, 11.4],
];
const VIZINHO = { angulo: (25 * Math.PI) / 180, comprimento: 10, altura: 15 };
export const PORTA = { x0: 5.4, x1: 6.6, altura: 2.4 };
/** A câmara dos testes: de lado e de baixo para cima. */
export const CAMARA_DO_TESTE = { centro: [-1.5, 1.6, 17] as V, alvo: [6.5, 9, 0] as V };

export interface OpcoesDaCena {
  /** Uma parede lisa, maior do que a fotografia, só com a porta. */
  lisa?: boolean;
  camara?: { centro: V; alvo: V };
  /**
   * Um tubo de queda de 10 cm encostado à fachada (Z = 0,06), de baixo a cima, com o eixo em X = `x` na
   * base e inclinado `graus` no plano da fachada (positivo: o topo vai para a direita).
   */
  tubo?: { x: number; graus: number };
  /** O embasamento acompanha uma rua inclinada: o topo dele sobe `graus` para a direita. */
  rua?: number;
  /** Uma caleira à frente do beiral (Z = 0,15), por baixo da cimalha, com esta pendente (graus). */
  caleira?: number;
  /** O desvio-padrão do ruído da fotografia, em níveis (3 por omissão). */
  ruido?: number;
  /** A empena: só a porta, o embasamento, as lajes e a cimalha, sem vizinho (ver o comentário do ficheiro). */
  poucas?: boolean;
  /**
   * Riscas verticais escuras de 12 cm, com 12 cm entre elas, de X = 0,3 m para a direita, da base à
   * cimalha: muitas verticais compridas e nítidas todas do mesmo lado.
   */
  riscas?: number;
  /** A parede continua para lá de X = 12 com a mesma cor: a esquina da direita não se vê (e não há vizinho). */
  esquinaEscondida?: boolean;
  /**
   * A esquina da direita em duas arestas quase na mesma reta: em X = 12 até meia altura e, por cima,
   * `esquinaEmDuas` metros mais à direita.
   */
  esquinaEmDuas?: number;
}

const dentroDe = (x: number, y: number, x0: number, x1: number, y0: number, y1: number) => x >= x0 && x < x1 && y >= y0 && y < y1;

/** O gerador com semente dos testes é o mesmo do RANSAC (`arestasPropostas.ts`). */
export { aleatorio };

/**
 * Fotografa a cena com a câmara virtual: f = 1500 px, imagem de 1500 × 2000. Um raio por píxel; onde a
 * cor muda, 3 × 3 raios (anti-aliasing: a aresta fica no sítio certo ao décimo de píxel); depois
 * desfocagem gaussiana (σ = 0,9 px) e ruído gaussiano (σ = 3 níveis, ou `ruido`). Coordenadas como as
 * do ecrã: o píxel (i, j) ocupa [i, i + 1) × [j, j + 1).
 *
 * Devolve também as retas verdadeiras: as que servem para acertar o endireitamento (as horizontais da
 * fachada e as paralelas a ela, e qualquer vertical) e as que não servem (os lados das varandas, as
 * horizontais do vizinho, o tubo inclinado, o embasamento e a caleira inclinados). Com `feitos` (os
 * píxeis de uma chamada anterior com as mesmas opções), não volta a desenhar.
 */
export function fotografar(opcoes: OpcoesDaCena = {}, feitos?: Pixeis) {
  const lisa = !!opcoes.lisa;
  const poucas = !!opcoes.poucas;
  const escondida = !!opcoes.esquinaEscondida;
  const degrau = opcoes.esquinaEmDuas ?? 0;
  // Sem vizinho na empena e com a esquina escondida (a parede continua onde ele estaria).
  const comVizinho = !lisa && !poucas && !escondida;
  const { centro: C, alvo } = opcoes.camara ?? CAMARA_DO_TESTE;
  const menos = (a: V, b: V): V => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const unitario = (a: V): V => {
    const n = Math.hypot(...a);
    return [a[0] / n, a[1] / n, a[2] / n];
  };
  const vetorial = (a: V, b: V): V => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const frente = unitario(menos(alvo, C));
  const direita = unitario(vetorial(frente, [0, 1, 0]));
  const cima = vetorial(direita, frente);
  const projetar = (P: V): Ponto => {
    const d = menos(P, C);
    const z = d[0] * frente[0] + d[1] * frente[1] + d[2] * frente[2];
    return {
      x: LARGURA / 2 + (FOCAL * (d[0] * direita[0] + d[1] * direita[1] + d[2] * direita[2])) / z,
      y: ALTURA / 2 - (FOCAL * (d[0] * cima[0] + d[1] * cima[1] + d[2] * cima[2])) / z,
    };
  };
  const rnd = aleatorio(7);
  const manchas = Array.from({ length: 6 }, () => ({ x: rnd() * 14 - 1, y: rnd() * 18, r: 0.4 + rnd() * 1.4, k: (rnd() - 0.5) * 18 }));
  const [fx0, fx1, fy1] = lisa ? [-40, 60, 60] : [0, escondida ? 30 : 12, 18];
  /** Até onde vai a fachada à altura Y (a esquina em duas arestas: `esquinaEmDuas`). */
  const fimDaFachada = (Y: number) => (degrau && Y >= 9 ? fx1 + degrau : fx1);
  const cos = Math.cos(VIZINHO.angulo);
  const sen = Math.sin(VIZINHO.angulo);
  const tanRua = Math.tan(((opcoes.rua ?? 0) * Math.PI) / 180);
  const tubo = opcoes.tubo ? { x: opcoes.tubo.x, tan: Math.tan((opcoes.tubo.graus * Math.PI) / 180), z: 0.06, meia: 0.05 } : null;
  const caleira = opcoes.caleira !== undefined ? { tan: Math.tan((opcoes.caleira * Math.PI) / 180), z: 0.15, y0: 17.7, y1: 17.82 } : null;
  const cor: Cor = [0, 0, 0];
  const pintar = (c: Cor, k = 1) => {
    cor[0] = c[0] * k;
    cor[1] = c[1] * k;
    cor[2] = c[2] * k;
  };

  const fachada = (X: number, Y: number) => {
    let c: Cor = [232, 228, 216];
    if (dentroDe(X, Y, PORTA.x0, PORTA.x1, 0, PORTA.altura)) c = [92, 64, 48];
    else if (!lisa) {
      if (Y < 0.45 + tanRua * X) c = [128, 124, 118];
      if (!poucas)
        for (const [x0, x1] of MONTRAS)
          if (dentroDe(X, Y, x0, x1, 0.9, 3)) c = dentroDe(X, Y, x0 + 0.08, x1 - 0.08, 0.98, 2.92) ? [72, 86, 102] : [205, 205, 200];
      // As lajes vão de esquina a esquina (com a esquina escondida, a parede segue igual).
      for (const l of LAJES) if (dentroDe(X, Y, 0, escondida ? fx1 : fimDaFachada(Y), l, l + 0.25)) c = [196, 188, 172];
      if (opcoes.riscas && Y < 17.4 && X >= 0.3 && X < 0.3 + 0.24 * opcoes.riscas && (X - 0.3) % 0.24 < 0.12) c = [64, 76, 92];
      if (Y >= 17.4) c = [150, 118, 98];
      if (!poucas) {
        for (const [x0, x1] of COLUNAS)
          for (let k = 0; k < 5; k++) {
            const y0 = 4.65 + 2.9 * k;
            if (dentroDe(X, Y, x0 - 0.05, x1 + 0.05, y0 - 0.06, y0)) c = [214, 214, 208];
            if (dentroDe(X, Y, x0, x1, y0, y0 + 1.4))
              c = dentroDe(X, Y, x0 + 0.06, x1 - 0.06, y0 + 0.06, y0 + 1.34) ? [64, 76, 92] : [210, 210, 206];
          }
        for (const yf of VARANDAS) if (dentroDe(X, Y, 1.5, 2.9, yf, yf + 2.1)) c = [70, 82, 96];
      }
    }
    let mancha = 0;
    for (const s of manchas) {
      const d2 = (X - s.x) ** 2 + (Y - s.y) ** 2;
      if (d2 < 9 * s.r * s.r) mancha += s.k * Math.exp(-d2 / (2 * s.r * s.r));
    }
    const luz = 0.92 + 0.08 * Math.min(1, Math.max(0, X / 12));
    cor[0] = c[0] * luz + mancha;
    cor[1] = c[1] * luz + mancha;
    cor[2] = c[2] * luz + mancha;
  };

  /** Pinta `cor` com o que o raio de direção d vê, e devolve o objeto (para saber onde a cor muda). */
  const raio = (d0: number, d1: number, d2: number): number => {
    let t = Infinity;
    let id = 0;
    let X = 0;
    let Y = 0;
    let Z = 0;
    const acertou = (tt: number, novo: number, x: number, y: number, z: number) => {
      t = tt;
      id = novo;
      X = x;
      Y = y;
      Z = z;
    };
    if (d2 < 0) {
      const tt = -C[2] / d2;
      const x = C[0] + tt * d0;
      const y = C[1] + tt * d1;
      if (x >= fx0 && x <= fimDaFachada(y) && y >= 0 && y <= fy1) acertou(tt, 1, x, y, 0);
    }
    if (!lisa && !poucas) {
      // As varandas: a frente (paralela à fachada), o lado esquerdo e o fundo (perpendiculares).
      const naVaranda = (y: number) => VARANDAS.some((yf) => y >= yf - VARANDA.abaixo && y <= yf + VARANDA.acima);
      if (d2 < 0) {
        const tt = (VARANDA.fundo - C[2]) / d2;
        const x = C[0] + tt * d0;
        const y = C[1] + tt * d1;
        if (tt > 0 && tt < t && x >= VARANDA.x0 && x <= VARANDA.x1 && naVaranda(y)) acertou(tt, 2, x, y, VARANDA.fundo);
      }
      if (d0 > 0) {
        const tt = (VARANDA.x0 - C[0]) / d0;
        const y = C[1] + tt * d1;
        const z = C[2] + tt * d2;
        if (tt > 0 && tt < t && z >= 0 && z <= VARANDA.fundo && naVaranda(y)) acertou(tt, 3, VARANDA.x0, y, z);
      }
      if (d1 > 0)
        for (const yf of VARANDAS) {
          const tt = (yf - VARANDA.abaixo - C[1]) / d1;
          const x = C[0] + tt * d0;
          const z = C[2] + tt * d2;
          if (tt > 0 && tt < t && x >= VARANDA.x0 && x <= VARANDA.x1 && z >= 0 && z <= VARANDA.fundo) acertou(tt, 4, x, yf, z);
        }
    }
    if (!lisa) {
      // O tubo de queda e a caleira: tiras num plano paralelo à fachada, um pouco à frente dela.
      if (tubo && d2 < 0) {
        const tt = (tubo.z - C[2]) / d2;
        const x = C[0] + tt * d0;
        const y = C[1] + tt * d1;
        if (tt > 0 && tt < t && y >= 0 && y <= 18 && Math.abs(x - (tubo.x + tubo.tan * y)) <= tubo.meia) acertou(tt, 8, x, y, tubo.z);
      }
      if (caleira && d2 < 0) {
        const tt = (caleira.z - C[2]) / d2;
        const x = C[0] + tt * d0;
        const y = C[1] + tt * d1;
        const sobe = caleira.tan * x;
        if (tt > 0 && tt < t && x >= 0 && x <= 12 && y >= caleira.y0 + sobe && y <= caleira.y1 + sobe) acertou(tt, 9, x, y, caleira.z);
      }
    }
    if (comVizinho) {
      // O prédio vizinho: o plano que passa por (12, ·, 0) rodado 25° para a câmara.
      const nd = -sen * d0 + cos * d2;
      if (Math.abs(nd) > 1e-9) {
        const tt = -(-sen * (C[0] - 12) + cos * C[2]) / nd;
        const x = C[0] + tt * d0;
        const y = C[1] + tt * d1;
        const s = (x - 12) / cos;
        if (tt > 0 && tt < t && s >= 0 && s <= VIZINHO.comprimento && y >= 0 && y <= VIZINHO.altura) acertou(tt, 5, s, y, 0);
      }
    }
    if (d1 < 0) {
      const tt = -C[1] / d1;
      if (tt < t) acertou(tt, 6, C[0] + tt * d0, 0, C[2] + tt * d2);
    }
    switch (id) {
      case 1:
        fachada(X, Y);
        return 1;
      case 2:
        pintar([214, 134, 104]);
        return 2;
      case 3:
        pintar([168, 98, 78]);
        return 3;
      case 4:
        pintar([120, 92, 80]);
        return 4;
      case 5: {
        const j = (X - 1) / 2.6;
        const k = (Y - 1.6) / 3;
        const janela = X > 0.6 && j - Math.floor(j) < 0.5 && k >= 0 && k - Math.floor(k) < 0.47;
        const faixa = Y > 3.2 && ((Y - 3.2) / 3) % 1 < 0.07;
        pintar(janela ? [66, 74, 90] : faixa ? [170, 150, 120] : [204, 178, 142]);
        return janela ? 51 : faixa ? 52 : 5;
      }
      case 6: {
        const junta = !lisa && (Math.abs(X - Math.round(X)) < 0.02 || Math.abs(Z - Math.round(Z)) < 0.02);
        pintar(junta ? [96, 94, 90] : [132, 130, 126]);
        return junta ? 61 : 6;
      }
      case 8:
        pintar([88, 90, 94]);
        return 8;
      case 9:
        pintar([110, 112, 116]);
        return 9;
      default: {
        const e = Math.max(0, d1);
        pintar([150 - 40 * e, 190 - 30 * e, 232 - 10 * e]);
        return 7;
      }
    }
  };
  const amostrar = (u: number, v: number) => {
    const a = (u - LARGURA / 2) / FOCAL;
    const b = -(v - ALTURA / 2) / FOCAL;
    return raio(
      frente[0] + a * direita[0] + b * cima[0],
      frente[1] + a * direita[1] + b * cima[1],
      frente[2] + a * direita[2] + b * cima[2],
    );
  };

  /** Os píxeis: um raio por píxel, 3 × 3 onde a cor muda, desfocagem e ruído. */
  const desenhar = (): Pixeis => {
    const W = LARGURA;
    const H = ALTURA;
    const rgb = new Float32Array(W * H * 3);
    const ids = new Uint8Array(W * H);
    for (let j = 0; j < H; j++)
      for (let i = 0; i < W; i++) {
        const k = j * W + i;
        ids[k] = amostrar(i + 0.5, j + 0.5);
        rgb.set(cor, k * 3);
      }
    const liso = new Float32Array(rgb);
    for (let j = 1; j < H - 1; j++)
      for (let i = 1; i < W - 1; i++) {
        const k = j * W + i;
        let borda = false;
        for (let dy = -1; dy <= 1 && !borda; dy++)
          for (let dx = -1; dx <= 1 && !borda; dx++) {
            const q = k + dy * W + dx;
            borda = ids[q] !== ids[k] || Math.abs(rgb[q * 3]! - rgb[k * 3]!) + Math.abs(rgb[q * 3 + 2]! - rgb[k * 3 + 2]!) > 6;
          }
        if (!borda) continue;
        const soma = [0, 0, 0];
        for (let sy = 0; sy < 3; sy++)
          for (let sx = 0; sx < 3; sx++) {
            amostrar(i + (sx + 0.5) / 3, j + (sy + 0.5) / 3);
            for (let ch = 0; ch < 3; ch++) soma[ch] = soma[ch]! + cor[ch]! / 9;
          }
        liso.set(soma, k * 3);
      }

    // Desfocagem gaussiana separável, canal a canal, e ruído (de uma tabela, com semente).
    const sigma = 0.9;
    const R = Math.ceil(3 * sigma);
    const pesos = Array.from({ length: 2 * R + 1 }, (_, k) => Math.exp(-((k - R) ** 2) / (2 * sigma * sigma)));
    const somaPesos = pesos.reduce((s, x) => s + x, 0);
    const nucleo = Float32Array.from(pesos.map((x) => x / somaPesos));
    const tabela = new Float32Array(65536);
    const ruido = opcoes.ruido ?? 3;
    for (let k = 0; k < tabela.length; k++) tabela[k] = ruido * Math.sqrt(-2 * Math.log(rnd() + 1e-12)) * Math.cos(2 * Math.PI * rnd());
    let semente = 12345;
    const data = new Uint8ClampedArray(W * H * 4);
    const plano = new Float32Array(W * H);
    const linha = new Float32Array(W + 2 * R);
    for (let ch = 0; ch < 3; ch++) {
      for (let k = 0; k < W * H; k++) plano[k] = liso[k * 3 + ch]!;
      for (let j = 0; j < H; j++) {
        for (let i = -R; i < W + R; i++) linha[i + R] = plano[j * W + Math.min(W - 1, Math.max(0, i))]!;
        for (let i = 0; i < W; i++) {
          let soma = 0;
          for (let k = 0; k <= 2 * R; k++) soma += nucleo[k]! * linha[i + k]!;
          plano[j * W + i] = soma;
        }
      }
      for (let j = 0; j < H; j++) {
        const linhas = Array.from({ length: 2 * R + 1 }, (_, k) => Math.min(H - 1, Math.max(0, j + k - R)) * W);
        for (let i = 0; i < W; i++) {
          let soma = 0;
          for (let k = 0; k <= 2 * R; k++) soma += nucleo[k]! * plano[linhas[k]! + i]!;
          semente = (Math.imul(semente, 1664525) + 1013904223) | 0;
          data[(j * W + i) * 4 + ch] = Math.round(soma + tabela[(semente >>> 16) & 65535]!);
        }
      }
    }
    for (let k = 0; k < W * H; k++) data[k * 4 + 3] = 255;
    return { data, width: W, height: H };
  };
  const pixeis = feitos ?? desenhar();

  const horizontais: Reta3D[] = [];
  const verticais: Reta3D[] = [];
  const naoServem: Reta3D[] = [];
  if (!lisa) {
    const comuns = [0, 17.4, 18, ...LAJES, ...LAJES.map((l) => l + 0.25), ...(opcoes.rua ? [] : [0.45])];
    for (const y of poucas ? comuns : [...comuns, 0.9, 0.98, 2.92, 3])
      horizontais.push({ nome: `fachada a ${y} m`, a: [0, y, 0], b: [12, y, 0] });
    if (!poucas) {
      for (let k = 0; k < 5; k++)
        for (const y of [4.59, 4.65, 4.71, 5.99, 6.05].map((y) => y + 2.9 * k))
          horizontais.push({ nome: `janelas a ${y.toFixed(2)} m`, a: [0, y, 0], b: [12, y, 0] });
      for (const yf of VARANDAS)
        for (const y of [yf - VARANDA.abaixo, yf + VARANDA.acima]) {
          horizontais.push({ nome: `frente da varanda a ${y.toFixed(2)} m`, a: [0, y, VARANDA.fundo], b: [12, y, VARANDA.fundo] });
          naoServem.push({ nome: `lado da varanda a ${y.toFixed(2)} m`, a: [VARANDA.x0, y, 0], b: [VARANDA.x0, y, VARANDA.fundo] });
          naoServem.push({ nome: `fundo da varanda a ${y.toFixed(2)} m`, a: [VARANDA.x1, y, 0], b: [VARANDA.x1, y, VARANDA.fundo] });
        }
    }
    if (comVizinho)
      for (let k = 0; k < 6; k++)
        for (const y of [1.6, 3.01, 3.2, 3.41].map((y) => y + 3 * k))
          naoServem.push({ nome: `vizinho a ${y.toFixed(2)} m`, a: [12, y, 0], b: [12 + 10 * cos, y, 10 * sen] });
    // A esquina da direita: inteira, escondida, ou em duas arestas (que não servem: nenhuma é a esquina inteira).
    const xs = [0, ...(escondida || degrau ? [] : [12]), PORTA.x0, PORTA.x1];
    if (degrau)
      naoServem.push(
        { nome: 'esquina de baixo', a: [12, 0, 0], b: [12, 9, 0] },
        { nome: 'esquina de cima', a: [12 + degrau, 9, 0], b: [12 + degrau, 18, 0] },
      );
    const doResto = poucas ? [] : [1.5, 2.9, ...MONTRAS.flat().flatMap((x) => [x - 0.08, x, x + 0.08])];
    for (let k = 0; k < (opcoes.riscas ?? 0); k++) doResto.push(0.3 + 0.24 * k, 0.42 + 0.24 * k);
    const dasColunas = poucas ? [] : COLUNAS.flat().flatMap((x) => [x - 0.06, x - 0.05, x, x + 0.05, x + 0.06]);
    for (const x of [...xs, ...doResto, ...dasColunas])
      verticais.push({ nome: `vertical em x = ${x.toFixed(2)} m`, a: [x, 0, 0], b: [x, 18, 0] });
    if (!poucas)
      for (const [x, z] of [
        [VARANDA.x0, VARANDA.fundo],
        [VARANDA.x1, VARANDA.fundo],
        [VARANDA.x0, 0],
      ])
        verticais.push({ nome: `varanda em x = ${x} m, z = ${z} m`, a: [x!, 0, z!], b: [x!, 18, z!] });
    if (tubo)
      for (const lado of [-1, 1])
        naoServem.push({
          nome: `tubo inclinado, aresta ${lado < 0 ? 'esquerda' : 'direita'}`,
          a: [tubo.x + lado * tubo.meia, 0, tubo.z],
          b: [tubo.x + lado * tubo.meia + 18 * tubo.tan, 18, tubo.z],
        });
    if (opcoes.rua) naoServem.push({ nome: 'embasamento inclinado', a: [0, 0.45, 0], b: [12, 0.45 + 12 * tanRua, 0] });
    if (caleira)
      for (const y of [caleira.y0, caleira.y1])
        naoServem.push({ nome: `caleira inclinada a ${y} m`, a: [0, y, caleira.z], b: [12, y + 12 * caleira.tan, caleira.z] });
  }
  return { pixeis, projetar, horizontais, verticais, naoServem };
}

export type FotoSintetica = ReturnType<typeof fotografar>;
