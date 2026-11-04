/**
 * Homografia de um plano (a fachada) para a fotografia — o motor da medição por fotografia.
 *
 * ## Porque é este o motor, e não os anteriores
 *
 * A 03/11/2026 tentaram-se, por esta ordem, três vias que falharam no teste do promotor (ver
 * `docs/DECISOES.md`): resolver a câmara a partir dos quatro cantos de um retângulo de proporção
 * desconhecida (`retificacao.ts` — mal-condicionado quando a zona não está centrada); medir zona a
 * zona (trabalho sem fim); e ajustar um volume genérico à fotografia com deslizadores (oito
 * parâmetros à mão, nunca encaixa). A 04/11/2026 a pergunta certa foi outra: **um retângulo medido
 * por inteiro** (a porta: quatro cantos + largura e altura reais) fixa os oito graus de liberdade da
 * transformação plano → imagem, sem câmara, sem distância focal, sem suposição de inclinação. É
 * geometria projetiva de manual (DLT), exata para tudo o que estiver no plano dessa referência.
 *
 * Verificado contra a fotografia real do promotor: só com a porta, uma aresta do prédio que o motor
 * nunca viu sai vertical no plano com 7 cm de desvio em 14,5 m de altura.
 *
 * ## A referência curta e a altura do prédio
 *
 * A porta mede 3,77 m e o prédio 20 m: a convergência das verticais estima-se em pouco espaço e
 * extrapola-se cinco vezes. Com ±2 px de erro no toque, a altura total varia ±6 %. Uma ou mais
 * **arestas verticais compridas** (de baixo a cima do prédio) fixam o ponto de fuga vertical com
 * muito mais precisão — qualquer aresta vertical serve, mesmo fora do plano da fachada, porque todas
 * as verticais do mundo vão parar ao mesmo ponto de fuga. Com uma aresta, ±2 px dão ±1,5 % na altura.
 *
 * Funções puras: sem base de dados, sem DOM.
 */

export interface Ponto {
  x: number;
  y: number;
}

/** Matriz 3×3 por linhas. */
export type Matriz3 = [number, number, number, number, number, number, number, number, number];

/** Ponto homogéneo [x, y, w]. */
export type Homogeneo = [number, number, number];

/** Aplica a homografia a um ponto. `null` quando o ponto vai para o infinito (ou para trás). */
export function aplicar(h: Matriz3, p: Ponto): Ponto | null {
  const w = h[6] * p.x + h[7] * p.y + h[8];
  if (!Number.isFinite(w) || Math.abs(w) < 1e-12) return null;
  return { x: (h[0] * p.x + h[1] * p.y + h[2]) / w, y: (h[3] * p.x + h[4] * p.y + h[5]) / w };
}

/** Como `aplicar`, mas exige w > 0 — o lado do plano que a câmara de facto vê. */
export function aplicarVisivel(h: Matriz3, p: Ponto): Ponto | null {
  const w = h[6] * p.x + h[7] * p.y + h[8];
  if (!(w > 1e-12)) return null;
  return { x: (h[0] * p.x + h[1] * p.y + h[2]) / w, y: (h[3] * p.x + h[4] * p.y + h[5]) / w };
}

export function inverter(h: Matriz3): Matriz3 {
  const [a, b, c, d, e, f, g, i, k] = h;
  const A = e * k - f * i;
  const B = -(d * k - f * g);
  const C = d * i - e * g;
  const det = a * A + b * B + c * C;
  if (!Number.isFinite(det) || Math.abs(det) < 1e-18) throw new Error('homografia singular');
  const r: Matriz3 = [
    A / det,
    -(b * k - c * i) / det,
    (b * f - c * e) / det,
    B / det,
    (a * k - c * g) / det,
    -(a * f - c * d) / det,
    C / det,
    -(a * i - b * g) / det,
    (a * e - b * d) / det,
  ];
  return r;
}

function multiplicar(a: Matriz3, b: Matriz3): Matriz3 {
  const r: number[] = new Array(9).fill(0);
  for (let i = 0; i < 3; i++)
    for (let j = 0; j < 3; j++) for (let k = 0; k < 3; k++) r[i * 3 + j] = r[i * 3 + j]! + a[i * 3 + k]! * b[k * 3 + j]!;
  return r as unknown as Matriz3;
}

/**
 * Vetor próprio do menor valor próprio de uma matriz simétrica (método de Jacobi). Chega para as
 * matrizes 9×9 e 3×3 daqui; com coordenadas normalizadas (Hartley), o condicionamento é bom.
 */
function menorVetorProprio(m: number[][]): number[] {
  const n = m.length;
  const a = m.map((linha) => [...linha]);
  const v: number[][] = Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => (i === j ? 1 : 0)));
  for (let varrimento = 0; varrimento < 100; varrimento++) {
    let foraDaDiagonal = 0;
    for (let p = 0; p < n; p++) for (let q = p + 1; q < n; q++) foraDaDiagonal += a[p]![q]! ** 2;
    if (foraDaDiagonal < 1e-30) break;
    for (let p = 0; p < n; p++) {
      for (let q = p + 1; q < n; q++) {
        const apq = a[p]![q]!;
        if (Math.abs(apq) < 1e-300) continue;
        const theta = (a[q]![q]! - a[p]![p]!) / (2 * apq);
        const t = Math.sign(theta || 1) / (Math.abs(theta) + Math.sqrt(theta * theta + 1));
        const c = 1 / Math.sqrt(t * t + 1);
        const s = t * c;
        for (let k = 0; k < n; k++) {
          const akp = a[k]![p]!;
          const akq = a[k]![q]!;
          a[k]![p] = c * akp - s * akq;
          a[k]![q] = s * akp + c * akq;
        }
        for (let k = 0; k < n; k++) {
          const apk = a[p]![k]!;
          const aqk = a[q]![k]!;
          a[p]![k] = c * apk - s * aqk;
          a[q]![k] = s * apk + c * aqk;
        }
        for (let k = 0; k < n; k++) {
          const vkp = v[k]![p]!;
          const vkq = v[k]![q]!;
          v[k]![p] = c * vkp - s * vkq;
          v[k]![q] = s * vkp + c * vkq;
        }
      }
    }
  }
  let menor = 0;
  for (let i = 1; i < n; i++) if (a[i]![i]! < a[menor]![menor]!) menor = i;
  return v.map((linha) => linha[menor]!);
}

/** Mínimos quadrados homogéneos: o vetor x (‖x‖ = 1) que minimiza ‖A·x‖. */
function nucleo(linhas: number[][]): number[] {
  const n = linhas[0]!.length;
  const ata = Array.from({ length: n }, () => new Array(n).fill(0) as number[]);
  for (const r of linhas) for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) ata[i]![j] = ata[i]![j]! + r[i]! * r[j]!;
  return menorVetorProprio(ata);
}

/** Normalização de Hartley: centróide na origem, distância média √2. */
function normalizacao(pontos: Ponto[]): Matriz3 {
  const cx = pontos.reduce((s, p) => s + p.x, 0) / pontos.length;
  const cy = pontos.reduce((s, p) => s + p.y, 0) / pontos.length;
  const media = pontos.reduce((s, p) => s + Math.hypot(p.x - cx, p.y - cy), 0) / pontos.length || 1;
  const s = Math.SQRT2 / media;
  return [s, 0, -s * cx, 0, s, -s * cy, 0, 0, 1];
}

/**
 * Ponto de fuga comum a vários segmentos (as retas que, no mundo, são paralelas), por mínimos
 * quadrados. Cada reta pesa o mesmo, venha de um segmento curto ou comprido.
 */
export function pontoDeFuga(segmentos: [Ponto, Ponto][]): Homogeneo {
  if (segmentos.length < 2) throw new Error('são precisos pelo menos dois segmentos');
  const todos = segmentos.flat();
  const t = normalizacao(todos);
  const norm = (p: Ponto): Homogeneo => [t[0] * p.x + t[2], t[4] * p.y + t[5], 1];
  const linhas = segmentos.map(([p, q]) => {
    const a = norm(p);
    const b = norm(q);
    const l = [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
    const n = Math.hypot(l[0]!, l[1]!) || 1;
    return l.map((x) => x / n);
  });
  const v = nucleo(linhas);
  // Volta às coordenadas da imagem: v_imagem = T⁻¹ · v_normalizado.
  const ti = inverter(t);
  return [
    ti[0] * v[0]! + ti[1] * v[1]! + ti[2] * v[2]!,
    ti[3] * v[0]! + ti[4] * v[1]! + ti[5] * v[2]!,
    ti[6] * v[0]! + ti[7] * v[1]! + ti[8] * v[2]!,
  ];
}

/**
 * Homografia plano → imagem a partir de correspondências de pontos (pelo menos quatro), com uma
 * restrição opcional: a direção vertical do plano (0, 1) tem de ir parar a um ponto de fuga
 * conhecido. DLT normalizado (Hartley); com exatamente quatro pontos e sem ponto de fuga, a solução
 * é exata.
 *
 * `pesoFuga` diz quanto mais vale o ponto de fuga do que cada ponto: arestas compridas medem a
 * convergência das verticais com muito mais precisão do que os cantos de uma referência curta.
 */
export function homografia(plano: Ponto[], imagem: Ponto[], opcoes: { fugaVertical?: Homogeneo; pesoFuga?: number } = {}): Matriz3 {
  if (plano.length !== imagem.length || plano.length < 4) throw new Error('são precisos pelo menos quatro pares de pontos');
  const tp = normalizacao(plano);
  const ti = normalizacao(imagem);
  const linhas: number[][] = [];
  for (let k = 0; k < plano.length; k++) {
    const x = tp[0] * plano[k]!.x + tp[2];
    const y = tp[4] * plano[k]!.y + tp[5];
    const u = ti[0] * imagem[k]!.x + ti[2];
    const v = ti[4] * imagem[k]!.y + ti[5];
    linhas.push([x, y, 1, 0, 0, 0, -u * x, -u * y, -u]);
    linhas.push([0, 0, 0, x, y, 1, -v * x, -v * y, -v]);
  }
  if (opcoes.fugaVertical) {
    // H·(0,1,0) ∥ ponto de fuga. Nas coordenadas normalizadas: Hn·(0,1,0) ∥ Ti·pf (a translação de
    // Tp não mexe numa direção). Duas equações lineares independentes de Hn[:,1] × pf_n = 0.
    const pf = opcoes.fugaVertical;
    const n0 = ti[0] * pf[0] + ti[2] * pf[2];
    const n1 = ti[4] * pf[1] + ti[5] * pf[2];
    const n2 = pf[2];
    const norma = Math.hypot(n0, n1, n2) || 1;
    const [a, b, c] = [n0 / norma, n1 / norma, n2 / norma];
    const peso = opcoes.pesoFuga ?? 30;
    // Coluna 1 de Hn = (h1, h4, h7) nas posições 1, 4, 7.
    const r1 = new Array(9).fill(0) as number[];
    r1[4] = c * peso;
    r1[7] = -b * peso;
    const r2 = new Array(9).fill(0) as number[];
    r2[7] = a * peso;
    r2[1] = -c * peso;
    const r3 = new Array(9).fill(0) as number[];
    r3[1] = b * peso;
    r3[4] = -a * peso;
    linhas.push(r1, r2, r3);
  }
  const hn = nucleo(linhas) as Matriz3;
  const h = multiplicar(multiplicar(inverter(ti), hn), tp);
  const escala = h[8] !== 0 ? h[8] : 1;
  return h.map((x) => x / escala) as Matriz3;
}

export interface ReferenciaRetangular {
  /** Cantos na fotografia, pela ordem: inferior esquerdo, inferior direito, superior direito, superior esquerdo. */
  cantos: [Ponto, Ponto, Ponto, Ponto];
  larguraM: number;
  alturaM: number;
}

export interface Calibracao {
  /** Plano (metros; X para a direita, Y para cima, origem no canto inferior esquerdo da referência) → imagem (píxeis). */
  planoParaImagem: Matriz3;
  imagemParaPlano: Matriz3;
}

/**
 * Por que a referência não serve, numa frase para quem a marcou; `null` quando serve. Não verifica
 * se o retângulo está mesmo no plano da fachada — isso só quem esteve lá sabe.
 */
export function problemaDaReferencia(ref: ReferenciaRetangular): string | null {
  if (!(ref.larguraM > 0) || !(ref.alturaM > 0)) return 'Indique a largura e a altura reais da referência.';
  const [p0, p1, p2, p3] = ref.cantos;
  const pts = [p0, p1, p2, p3];
  const cruz = (a: Ponto, b: Ponto, c: Ponto) => (b.x - a.x) * (c.y - b.y) - (b.y - a.y) * (c.x - b.x);
  const sinais = pts.map((p, i) => Math.sign(cruz(p, pts[(i + 1) % 4]!, pts[(i + 2) % 4]!)));
  if (sinais.some((s) => s === 0) || !sinais.every((s) => s === sinais[0])) {
    return 'Os quatro cantos não formam um retângulo visto em perspetiva — confirme a ordem (inferior esquerdo, inferior direito, superior direito, superior esquerdo).';
  }
  // Na fotografia o eixo y desce. A base (1.º → 2.º) tem de ser mais horizontal do que vertical e ir
  // para a direita; o lado esquerdo (1.º → 4.º) mais vertical do que horizontal e ir para cima. Uma
  // ordem rodada de um canto troca os papéis das arestas e falha aqui (comparar médias não chegava:
  // numa ordem rodada, as médias saem quase iguais).
  const baseHorizontal = Math.abs(p1.x - p0.x) > Math.abs(p1.y - p0.y) && p1.x > p0.x;
  const ladoVertical = Math.abs(p3.y - p0.y) > Math.abs(p3.x - p0.x) && p3.y < p0.y;
  if (!baseHorizontal || !ladoVertical) {
    return 'Os cantos parecem trocados — o primeiro é o inferior esquerdo e segue-se no sentido inferior direito, superior direito, superior esquerdo.';
  }
  return null;
}

/**
 * Calibração métrica do plano da fachada a partir de um retângulo medido e, opcionalmente, de
 * arestas verticais compridas do prédio (cada uma: dois pontos, em baixo e em cima).
 */
export function calibrar(ref: ReferenciaRetangular, arestasVerticais: [Ponto, Ponto][] = []): Calibracao {
  const problema = problemaDaReferencia(ref);
  if (problema) throw new Error(problema);
  const plano: Ponto[] = [
    { x: 0, y: 0 },
    { x: ref.larguraM, y: 0 },
    { x: ref.larguraM, y: ref.alturaM },
    { x: 0, y: ref.alturaM },
  ];
  const [be, bd, td, te] = ref.cantos;
  let fugaVertical: Homogeneo | undefined;
  if (arestasVerticais.length > 0) {
    // As ombreiras da própria referência também são verticais: entram no ponto de fuga com as arestas.
    fugaVertical = pontoDeFuga([[be, te], [bd, td], ...arestasVerticais]);
  }
  const planoParaImagem = homografia(plano, [be, bd, td, te], { fugaVertical });
  return { planoParaImagem, imagemParaPlano: inverter(planoParaImagem) };
}

export const distancia = (a: Ponto, b: Ponto) => Math.hypot(a.x - b.x, a.y - b.y);
