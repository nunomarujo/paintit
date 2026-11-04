/**
 * Íman nos cantos, como no Photoshop: quem mede aponta o canto de uma porta na fotografia e o ponteiro
 * salta para o canto verdadeiro da imagem, se houver um à vista. Função pura sobre o array de píxeis,
 * para se testar sem browser.
 *
 * Coordenadas como as do SVG da medição (`viewBox="0 0 largura altura"`): o píxel (i, j) ocupa
 * [i, i + 1) × [j, j + 1) e o seu centro está em (i + 0,5; j + 0,5). O canto de um retângulo que começa
 * no píxel 20 está em x = 20.
 *
 * Como se decide:
 * 1. Só se lê uma janela à volta do ponto — o raio mais `MARGEM` píxeis —, recortada aos limites da
 *    fotografia. Na borda da fotografia repete-se o último píxel: a borda não passa por aresta nem por
 *    canto.
 * 2. Cinzento por luminância (Rec. 709); gradientes de Sobel em níveis por píxel; tensor de estrutura
 *    alisado por uma janela gaussiana 5×5 (binomial 1-4-6-4-1, σ ≈ 1). Gaussiana e não caixa: numa
 *    caixa a resposta faz um patamar à volta do canto e o máximo pode cair em qualquer ponto dele.
 * 3. Resposta de Shi–Tomasi — o menor valor próprio do tensor — e não Harris. O critério pedido (os dois
 *    valores próprios comparáveis e acima de um mínimo) escreve-se diretamente nos valores próprios, e o
 *    menor está em (níveis/píxel)², a mesma unidade em toda a fotografia: o limiar absoluto lê-se como
 *    «um canto com tantos níveis de contraste». A resposta de Harris (det − k·traço²) mistura as duas
 *    perguntas num só número, que cresce com a quarta potência do contraste, e deixa ao k o compromisso
 *    entre canto e aresta.
 * 4. Um píxel é candidato se estiver dentro do raio, for o máximo da resposta na vizinhança 5×5 (um só
 *    candidato por canto, mesmo com ruído), tiver o menor valor próprio acima de `LAMBDA_MINIMO`
 *    (contraste, não ruído de uma parede lisa) e pelo menos `RAZAO_MINIMA` do maior (canto, não aresta
 *    reta: numa aresta o menor valor próprio é só o ruído).
 * 5. Refinamento subpíxel do máximo: quádrica ajustada por mínimos quadrados aos 3×3 à volta dele.
 * 6. Do máximo da resposta ao canto (Förstner; é o `cornerSubPix` do OpenCV). O máximo de Shi–Tomasi não
 *    está no canto: a janela do tensor apanha mais aresta se se meter para dentro do ângulo, e o máximo
 *    fica cerca de 1 px para dentro em cada eixo (medido: 1,41 px num canto reto e nítido, 1,54 px num
 *    de 45°) — numa porta com 80 px de largura, 2 px a menos. Perto do canto q, cada píxel p ou tem
 *    gradiente nulo ou está numa aresta que passa por q, e então o gradiente em p é perpendicular a
 *    q − p. O q que melhor cumpre ∇I(p)·(q − p) = 0, com pesos gaussianos, sai de um sistema 2×2,
 *    repetido até parar. Robusto: cada píxel pesa também pela distância de q à reta da sua aresta
 *    (biweight de Tukey, `CORTE_ROBUSTO`), e uma aresta que passa a 2 px ou mais de q não conta. Sem
 *    isto, o aro escuro de 3 ou 4 px de uma porta puxava o ponto para o canto de fora, o passo era
 *    recusado e ficava o máximo enviesado (revisão de 04/11/2026). Se o passo falhar ou andar mais de
 *    `DESLOCACAO_MAXIMA`, o candidato cai — nunca se devolve o máximo da resposta, que está fora do canto.
 *    Erro medido no fim: até 0,2 px em cantos retos, rodados e de 60°, com e sem ruído de ±12 níveis.
 * 7. Confirmação: um canto são duas arestas retas que passam por q e seguem assim uns 5 px. Contam os
 *    píxeis a entre 3,5 e 5,5 px de q cuja aresta passa a menos de 1 px de q (os «braços»); o menor
 *    valor próprio do tensor só deles tem de valer `BRACOS_MINIMO` vezes a resposta do candidato. Assim
 *    caem as formas mais pequenas do que a janela do tensor, que a resposta toma por cantos: a ponta de
 *    uma barra de 3 ou 4 px de altura (dava o meio da ponta, a quase 2 px dos dois cantos), um quadrado
 *    de 3 ou 4 px (dava o centro) e um disco de 3 a 3,5 px de raio (dava um ponto da orla). O preço: uma
 *    peça com menos de 6 px de lado não tem íman — fica o ponto apontado.
 * 8. Entre os candidatos confirmados ganha o de maior resposta × exp(−d² / 2s²), com d a distância do
 *    canto ao ponto apontado e s = `ESCALA_DISTANCIA`, fixo. Quem aponta está a mirar um canto: um canto
 *    vizinho mais contrastado só ganha se estiver quase à mesma distância — a 3 px contra 10 px, o mais
 *    longe precisaria de uma resposta 17 vezes maior (contraste 4 vezes maior), seja qual for o raio.
 *    Com s proporcional ao raio, a partir de raio 32 ganhava o vizinho.
 *
 * Nada disto convence? Devolve null e a pessoa fica com o ponto que apontou.
 */

/** Raio e σ (píxeis) da janela do passo de Förstner, e o máximo de repetições. */
const RAIO_FORSTNER = 4;
const SIGMA_FORSTNER = 2;
const ITERACOES_FORSTNER = 12;

/**
 * Distância (píxeis) de q à reta da aresta de um píxel a partir da qual esse píxel deixa de contar no
 * passo de Förstner. As duas filas de píxeis de uma aresta nítida ficam a 0,5 px dela, e o máximo da
 * resposta, de onde se parte, a 1,4 px do canto: 2 px apanha-as desde o início e deixa de fora o aro de
 * uma porta (3 px ou mais da aresta de dentro).
 */
const CORTE_ROBUSTO = 2;

/**
 * Quanto o passo de Förstner pode afastar o ponto do máximo da resposta. Num canto limpo anda entre 0,6
 * e 1,4 px; mais do que isto é outra aresta dentro da janela a puxar, e o candidato cai.
 */
const DESLOCACAO_MAXIMA = 2.5;

/** Os braços do canto: píxeis a entre 3,5 e 5,5 px de q, com a aresta a menos de 1 px de q. */
const RAIO_BRACOS = 3.5;
const RAIO_BRACOS_FORA = 5.5;
const TOLERANCIA_BRACOS = 1;

/**
 * Menor valor próprio do tensor dos braços, em múltiplos da resposta do candidato. Medido: um canto
 * reto dá cerca de 18; um de 60°, 7; um canto com 40 níveis de contraste e ruído de ±12, 6. O que não é
 * canto — ponta de barra de 2 a 5 px, quadrado de 2 a 5 px, disco de 3 a 3,5 px de raio, com ou sem
 * ruído — fica abaixo de 0,15.
 */
const BRACOS_MINIMO = 2;

/**
 * Desvio (píxeis) da penalização pela distância ao ponto apontado. Fixo, e não proporcional ao raio:
 * a preferência pelo canto mais próximo não pode depender de quão longe o íman procura.
 */
const ESCALA_DISTANCIA = 4;

/**
 * Píxeis lidos para lá do raio: 1 (Sobel) + 6 (braços, 5,5 arredondado) + 3 (o que o passo de Förstner
 * pode andar, arredondado). Cobre também a janela de Förstner (4) e os 1 + 2 + 2 do Sobel, do tensor 5×5
 * e da vizinhança 5×5 dos máximos.
 */
const MARGEM = 1 + Math.ceil(RAIO_BRACOS_FORA) + 3;

/**
 * Raio máximo (píxeis da fotografia). O íman serve para acertar num canto que a pessoa já está a
 * apontar, não para o procurar: um raio maior só traria cantos alheios e o custo de uma janela grande a
 * cada movimento do ponteiro. Com um raio maior do que este, usa-se este.
 */
export const RAIO_MAXIMO = 64;

/**
 * Menor valor próprio mínimo, em (níveis/píxel)². Um canto reto e nítido com C níveis de contraste dá
 * 0,055·C² (medido), de modo que 60 aceita cantos a partir de uns 33 níveis (em 255). Ruído de ±12
 * níveis, em centenas de sementes: numa parede lisa não passou de 18; a 2 ou 3 px de uma aresta, onde
 * o ruído só pesa numa direção e o menor valor próprio é ele, chegou a 35.
 */
export const LAMBDA_MINIMO = 60;

/**
 * Menor / maior valor próprio, no mínimo. No máximo da resposta, um canto reto com as duas arestas do
 * mesmo contraste dá entre 0,4 e 0,75, e um de 60° dá 0,24 (medidos). O que não é canto fica abaixo:
 * uma aresta reta sem ruído, 0,003; um contorno curvo com contraste para passar o mínimo absoluto (um
 * disco com 4 a 12 px de raio — um candeeiro, uma cabeça de parafuso), 0,09; o ruído de ±12 níveis a
 * 2 ou 3 px de uma aresta, 0,12. Daí 0,15. Ficam de fora um canto de 45° (0,10) e um canto reto em
 * que uma das arestas tenha pouco mais de metade do contraste da outra: sem íman, a pessoa fica com o
 * ponto que apontou. Um disco mais pequeno (3 a 3,5 px de raio) passa este limiar e cai na confirmação
 * dos braços.
 */
export const RAZAO_MINIMA = 0.15;

export function cantoMaisProximo(
  pixeis: { data: Uint8ClampedArray; width: number; height: number },
  ponto: { x: number; y: number },
  raio: number,
): { x: number; y: number } | null {
  const { data, width: W, height: H } = pixeis;
  if (!(W > 0 && H > 0) || data.length < W * H * 4) return null;
  if (!Number.isFinite(ponto.x) || !Number.isFinite(ponto.y) || !(raio > 0)) return null;
  const r = Math.min(raio, RAIO_MAXIMO);

  // Daqui em diante, coordenadas de índice: o centro do píxel i está em i.
  const cx = ponto.x - 0.5;
  const cy = ponto.y - 0.5;
  const alcance = Math.ceil(r) + MARGEM;
  const x0 = Math.max(0, Math.floor(cx) - alcance);
  const x1 = Math.min(W - 1, Math.ceil(cx) + alcance);
  const y0 = Math.max(0, Math.floor(cy) - alcance);
  const y1 = Math.min(H - 1, Math.ceil(cy) + alcance);
  if (x0 > x1 || y0 > y1) return null;
  const w = x1 - x0 + 1;
  const h = y1 - y0 + 1;
  const n = w * h;

  // Cinzento da janela.
  const cinza = new Float64Array(n);
  for (let j = 0; j < h; j++) {
    let o = ((y0 + j) * W + x0) * 4;
    const base = j * w;
    for (let i = 0; i < w; i++, o += 4) {
      cinza[base + i] = 0.2126 * data[o]! + 0.7152 * data[o + 1]! + 0.0722 * data[o + 2]!;
    }
  }

  // Gradientes de Sobel (níveis por píxel) e os produtos do tensor. Na borda da janela repete-se o
  // último píxel; na borda da fotografia é isso que se quer, e no interior fica dentro da margem.
  const gx = new Float64Array(n);
  const gy = new Float64Array(n);
  const ixx = new Float64Array(n);
  const iyy = new Float64Array(n);
  const ixy = new Float64Array(n);
  for (let j = 0; j < h; j++) {
    const lm = (j > 0 ? j - 1 : 0) * w;
    const lc = j * w;
    const lp = (j < h - 1 ? j + 1 : h - 1) * w;
    for (let i = 0; i < w; i++) {
      const im = i > 0 ? i - 1 : 0;
      const ip = i < w - 1 ? i + 1 : w - 1;
      const a = cinza[lm + im]!;
      const b = cinza[lm + i]!;
      const c = cinza[lm + ip]!;
      const d = cinza[lc + im]!;
      const f = cinza[lc + ip]!;
      const g = cinza[lp + im]!;
      const k = cinza[lp + i]!;
      const l = cinza[lp + ip]!;
      const ux = (c + 2 * f + l - a - 2 * d - g) / 8;
      const uy = (g + 2 * k + l - a - 2 * b - c) / 8;
      gx[lc + i] = ux;
      gy[lc + i] = uy;
      ixx[lc + i] = ux * ux;
      iyy[lc + i] = uy * uy;
      ixy[lc + i] = ux * uy;
    }
  }

  // Tensor de estrutura: janela gaussiana 5×5.
  const tmp = new Float64Array(n);
  const sxx = alisar(ixx, w, h, tmp);
  const syy = alisar(iyy, w, h, tmp);
  const sxy = alisar(ixy, w, h, tmp);

  // Resposta de Shi–Tomasi: o menor valor próprio.
  const resposta = new Float64Array(n);
  for (let p = 0; p < n; p++) {
    const a = sxx[p]!;
    const c = syy[p]!;
    const b = sxy[p]!;
    const meio = (a - c) / 2;
    resposta[p] = (a + c) / 2 - Math.sqrt(meio * meio + b * b);
  }

  // Candidatos: máximos locais 5×5, dentro do raio, com contraste e com as duas direções. Cada um
  // vai ao canto (Förstner) e tem de mostrar os braços; dos que ficam, ganha o de maior resposta
  // penalizada pela distância do canto ao ponto apontado.
  const r2 = r * r;
  const s2 = 2 * ESCALA_DISTANCIA * ESCALA_DISTANCIA;
  let melhor: { x: number; y: number } | null = null;
  let melhorNota = 0;
  for (let j = 0; j < h; j++) {
    const dy = y0 + j - cy;
    if (dy * dy > r2) continue;
    for (let i = 0; i < w; i++) {
      const dx = x0 + i - cx;
      if (dx * dx + dy * dy > r2) continue;
      const p = j * w + i;
      const lambdaMin = resposta[p]!;
      if (!(lambdaMin >= LAMBDA_MINIMO)) continue;
      if (!maximoLocal(resposta, w, h, i, j, lambdaMin)) continue;
      const lambdaMax = sxx[p]! + syy[p]! - lambdaMin;
      if (lambdaMin < RAZAO_MINIMA * lambdaMax) continue;
      const canto = aoCanto(gx, gy, w, h, refinar(resposta, w, h, i, j));
      if (!canto || !(bracos(gx, gy, w, h, canto) >= BRACOS_MINIMO * lambdaMin)) continue;
      const ex = x0 + canto.x - cx;
      const ey = y0 + canto.y - cy;
      const nota = lambdaMin * Math.exp(-(ex * ex + ey * ey) / s2);
      if (nota > melhorNota) {
        melhorNota = nota;
        melhor = canto;
      }
    }
  }
  if (!melhor) return null;
  return {
    x: Math.min(W, Math.max(0, x0 + melhor.x + 0.5)),
    y: Math.min(H, Math.max(0, y0 + melhor.y + 0.5)),
  };
}

/** Filtro binomial 1-4-6-4-1 (/16) nas duas direções, para um array novo; repete a borda. */
function alisar(v: Float64Array, w: number, h: number, tmp: Float64Array): Float64Array {
  const out = new Float64Array(v.length);
  for (let j = 0; j < h; j++) {
    const base = j * w;
    for (let i = 0; i < w; i++) {
      const m2 = base + (i > 1 ? i - 2 : 0);
      const m1 = base + (i > 0 ? i - 1 : 0);
      const p1 = base + (i < w - 1 ? i + 1 : w - 1);
      const p2 = base + (i < w - 2 ? i + 2 : w - 1);
      tmp[base + i] = (v[m2]! + 4 * v[m1]! + 6 * v[base + i]! + 4 * v[p1]! + v[p2]!) / 16;
    }
  }
  for (let j = 0; j < h; j++) {
    const m2 = (j > 1 ? j - 2 : 0) * w;
    const m1 = (j > 0 ? j - 1 : 0) * w;
    const c = j * w;
    const p1 = (j < h - 1 ? j + 1 : h - 1) * w;
    const p2 = (j < h - 2 ? j + 2 : h - 1) * w;
    for (let i = 0; i < w; i++) {
      out[c + i] = (tmp[m2 + i]! + 4 * tmp[m1 + i]! + 6 * tmp[c + i]! + 4 * tmp[p1 + i]! + tmp[p2 + i]!) / 16;
    }
  }
  return out;
}

/** Nenhum vizinho 5×5 (dentro da janela) com resposta maior. */
function maximoLocal(resposta: Float64Array, w: number, h: number, i: number, j: number, valor: number): boolean {
  const ja = Math.max(0, j - 2);
  const jb = Math.min(h - 1, j + 2);
  const ia = Math.max(0, i - 2);
  const ib = Math.min(w - 1, i + 2);
  for (let jj = ja; jj <= jb; jj++) {
    for (let ii = ia; ii <= ib; ii++) {
      if (resposta[jj * w + ii]! > valor) return false;
    }
  }
  return true;
}

/**
 * Máximo subpíxel da resposta: f(x, y) = a + bx + cy + dx² + exy + fy² ajustada por mínimos quadrados
 * aos 3×3 à volta de (i, j); o máximo da quádrica está onde o gradiente se anula. Sem os 3×3 dentro da
 * janela (canto encostado à borda da fotografia) ou sem um máximo verdadeiro, fica no píxel.
 */
function refinar(resposta: Float64Array, w: number, h: number, i: number, j: number): { x: number; y: number } {
  if (i < 1 || j < 1 || i > w - 2 || j > h - 2) return { x: i, y: j };
  const v = (di: number, dj: number) => resposta[(j + dj) * w + i + di]!;
  const colE = v(-1, -1) + v(-1, 0) + v(-1, 1);
  const colC = v(0, -1) + v(0, 0) + v(0, 1);
  const colD = v(1, -1) + v(1, 0) + v(1, 1);
  const linC = v(-1, -1) + v(0, -1) + v(1, -1);
  const linM = v(-1, 0) + v(0, 0) + v(1, 0);
  const linB = v(-1, 1) + v(0, 1) + v(1, 1);
  const fx = (colD - colE) / 6;
  const fy = (linB - linC) / 6;
  const fxx = (colD + colE - 2 * colC) / 3;
  const fyy = (linB + linC - 2 * linM) / 3;
  const fxy = (v(1, 1) - v(1, -1) - v(-1, 1) + v(-1, -1)) / 4;
  const det = fxx * fyy - fxy * fxy;
  if (!(fxx < 0 && det > 0)) return { x: i, y: j };
  const dx = (-fx * fyy + fy * fxy) / det;
  const dy = (-fy * fxx + fx * fxy) / det;
  if (!Number.isFinite(dx) || !Number.isFinite(dy)) return { x: i, y: j };
  return { x: i + Math.max(-0.5, Math.min(0.5, dx)), y: j + Math.max(-0.5, Math.min(0.5, dy)) };
}

/**
 * Passo de Förstner a partir do máximo da resposta: q tal que Σ peso·(∇I(p)·(q − p))² seja mínimo, com
 * pesos gaussianos à volta de q vezes o biweight de Tukey da distância de q à reta da aresta de p
 * (|∇I(p)·(q − p)| / |∇I(p)|), que tira as arestas que não passam por q. Repete-se até o passo ficar
 * abaixo de 0,001 px. Devolve null se o sistema for singular (só uma direção) ou se o ponto andar mais
 * do que `DESLOCACAO_MAXIMA`.
 */
function aoCanto(
  gx: Float64Array,
  gy: Float64Array,
  w: number,
  h: number,
  inicio: { x: number; y: number },
): { x: number; y: number } | null {
  let qx = inicio.x;
  let qy = inicio.y;
  const k = 1 / (2 * SIGMA_FORSTNER * SIGMA_FORSTNER);
  const corte2 = CORTE_ROBUSTO * CORTE_ROBUSTO;
  for (let it = 0; it < ITERACOES_FORSTNER; it++) {
    const ci = Math.round(qx);
    const cj = Math.round(qy);
    let a = 0;
    let b = 0;
    let c = 0;
    let bx = 0;
    let by = 0;
    for (let j = Math.max(0, cj - RAIO_FORSTNER); j <= Math.min(h - 1, cj + RAIO_FORSTNER); j++) {
      for (let i = Math.max(0, ci - RAIO_FORSTNER); i <= Math.min(w - 1, ci + RAIO_FORSTNER); i++) {
        const p = j * w + i;
        const ux = gx[p]!;
        const uy = gy[p]!;
        const g2 = ux * ux + uy * uy;
        if (g2 === 0) continue;
        const dx = i - qx;
        const dy = j - qy;
        const proj = ux * dx + uy * dy;
        const reta2 = (proj * proj) / g2;
        if (reta2 >= corte2) continue;
        const tukey = 1 - reta2 / corte2;
        const peso = Math.exp(-(dx * dx + dy * dy) * k) * tukey * tukey;
        const xx = ux * ux * peso;
        const yy = uy * uy * peso;
        const xy = ux * uy * peso;
        a += xx;
        b += xy;
        c += yy;
        bx += xx * dx + xy * dy;
        by += xy * dx + yy * dy;
      }
    }
    const det = a * c - b * b;
    if (!(det > 1e-9 * (a + c) * (a + c))) return null;
    const passoX = (c * bx - b * by) / det;
    const passoY = (a * by - b * bx) / det;
    qx += passoX;
    qy += passoY;
    if (!Number.isFinite(qx) || !Number.isFinite(qy)) return null;
    if (Math.hypot(qx - inicio.x, qy - inicio.y) > DESLOCACAO_MAXIMA) return null;
    if (passoX * passoX + passoY * passoY < 1e-6) break;
  }
  return { x: qx, y: qy };
}

/**
 * Os braços do canto em q: menor valor próprio do tensor dos gradientes dos píxeis a entre
 * `RAIO_BRACOS` e `RAIO_BRACOS_FORA` de q cuja aresta passa a menos de `TOLERANCIA_BRACOS` de q. Num
 * canto são as duas arestas a continuar retas; numa forma mais pequena do que isso, ou curva, a esta
 * distância as arestas já não apontam para q.
 */
function bracos(gx: Float64Array, gy: Float64Array, w: number, h: number, q: { x: number; y: number }): number {
  const ci = Math.round(q.x);
  const cj = Math.round(q.y);
  const alcance = Math.ceil(RAIO_BRACOS_FORA);
  const dentro2 = RAIO_BRACOS * RAIO_BRACOS;
  const fora2 = RAIO_BRACOS_FORA * RAIO_BRACOS_FORA;
  const tol2 = TOLERANCIA_BRACOS * TOLERANCIA_BRACOS;
  let a = 0;
  let b = 0;
  let c = 0;
  for (let j = Math.max(0, cj - alcance); j <= Math.min(h - 1, cj + alcance); j++) {
    for (let i = Math.max(0, ci - alcance); i <= Math.min(w - 1, ci + alcance); i++) {
      const dx = i - q.x;
      const dy = j - q.y;
      const d2 = dx * dx + dy * dy;
      if (d2 < dentro2 || d2 > fora2) continue;
      const p = j * w + i;
      const ux = gx[p]!;
      const uy = gy[p]!;
      const g2 = ux * ux + uy * uy;
      if (g2 === 0) continue;
      const proj = ux * dx + uy * dy;
      if ((proj * proj) / g2 > tol2) continue;
      a += ux * ux;
      b += ux * uy;
      c += uy * uy;
    }
  }
  const meio = (a - c) / 2;
  return (a + c) / 2 - Math.sqrt(meio * meio + b * b);
}
