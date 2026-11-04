import type { Extensao, Pixeis } from './endireitar';

/**
 * Propor os vãos da fachada endireitada — janelas, portas de varanda, as montras do R/C que forem
 * claras —, para quem mede não os desenhar um a um: aceita os que estão bem e acerta à mão os outros
 * (promotor, 04/11/2026: «dispensar identificar onde estão cada janela… poupam-se minutos longos,
 * alguns casos horas»). Função pura sobre os píxeis da vista de `endireitar`, para se testar sem
 * browser.
 *
 * Coordenadas como as das zonas (`Zona`): metros no plano da fachada, Y para cima, (x, y) o canto
 * inferior esquerdo. A vista tem `ppm` píxeis por metro e a linha 0 é o Y mais alto (`ext.y1`).
 *
 * Na vista endireitada as janelas são retângulos direitos e repetem-se em colunas — é nisso que tudo
 * assenta. Como se decide:
 * 1. Grelha de trabalho: a vista reduzida a cerca de 20 células por metro (média de f × f píxeis), em
 *    luminância (Rec. 709) e dois canais de cor (R − G e B − (R + G)/2), alisada 3 × 3. Só contam as
 *    células dentro de um contorno e que não sejam o cinzento com que `endireitar` pinta o que fica
 *    fora da fotografia.
 * 2. A parede. Primeira passagem: em blocos de 0,5 m, a mediana de cada canal; a parede de um bloco é
 *    a mediana dos blocos vizinhos num raio de 2,5 m, só da metade mais lisa (onde não há janelas).
 *    Segunda passagem: a média das células que a primeira deu como parede (com 0,1 m de folga) numa
 *    caixa de 0,6 m à volta de cada célula — ou de 2,5 m, se ali quase não houver parede. A segunda
 *    segue o sombreado: na fotografia do promotor a parede escurece 25 níveis no metro e meio antes do
 *    pilar, e só com a primeira essa faixa colava-se às janelas da coluna da direita.
 * 3. Diferença da parede, em limiares: 3,5 × o ruído (a dispersão mediana dentro dos blocos), e nunca
 *    menos de 12 níveis de luminância ou 9 de cor. Uma célula a 1 ou mais limiares está marcada.
 * 4. Limpeza: fecho de 0,1 m (junta caixilho e vidro), buracos até 1,5 m² cheios (o vidro que reflete
 *    o céu ou a parede), abertura de 0,24 m (corta tubos de queda, escorrências e pontes finas).
 * 5. Manchas e corte recursivo em X e Y: uma mancha maior do que uma janela, ou com menos de 60 % de
 *    enchimento, parte-se pela coluna ou linha com menos marcas (até 30 %). Separa a janela do último
 *    piso do beiral, e uma coluna de janelas da sombra que a liga às outras.
 * 6. Arestas. Em cada fronteira entre células, o degrau de cor entre as duas de um lado e as duas do
 *    outro, em limiares. A força de um lado é o degrau médio ao longo dele vezes a fração do
 *    comprimento em que há aresta, com inclinações até ±15° — o endireitamento nunca é perfeito: na
 *    fotografia do promotor, calibrada só com a porta e uma vertical, as arestas de cima das janelas
 *    do último piso saem 15° inclinadas. A caixa continua direita, com o lado à cota média da aresta.
 *    Junto ao fim do contorno (0,12 m) não há arestas: lá está a esquina do prédio ou o beiral, não o
 *    lado de uma janela.
 * 7. Cada peça vai às arestas: cada lado à mais forte entre 30 % para dentro e 0,1 m para fora, e daí
 *    ao aro de fora se houver outra quase tão forte (60 %) a menos de 0,12 m. Estores enrolados contam
 *    como parte da janela: se as ombreiras continuam acima do topo (até 0,7 m), a caixa é da janela.
 * 8. Nota de 0 a 1: as arestas dos lados (pesa o mais fraco, a dobrar) e o enchimento (a fração da
 *    caixa diferente da parede).
 * 9. Repetição. Colunas: caixas que se sobrepõem em X em 60 % da mais estreita. Numa coluna de três
 *    ou mais, cada janela é posta à prova contra a medida da coluna (`consenso`) e a que falta entre
 *    duas, ou a seguir à última, só entra se a imagem a confirmar (`preencher`). Confiança = nota ×
 *    (0,6 + 0,4 × repetição); a que não se repete nem em coluna nem em fila só fica com nota ≥ 0,8.
 *
 * Fora do âmbito: varandas e marquises. Não se propõem quando se reconhecem como blocos grandes —
 * tudo o que, depois do corte e das arestas, passa de 3,5 m de largura ou de 3 m de altura (a laje, a
 * guarda, a sombra e o envidraçado de uma varanda leem-se como uma mancha só) — nem um vão assente num
 * parapeito: por baixo dele, em 0,8 m e em toda a largura, 75 % ou mais diferente da parede (a guarda
 * da varanda; debaixo de uma janela há parede e o peitoril). O envidraçado de uma marquise com o
 * tamanho e a regularidade de uma janela pode ser proposto: é o que se vê, e quem mede tira-o. Uma
 * guarda da cor da parede também não se reconhece. A porta principal fica de fora pela altura (passa
 * dos 3 m, e é a referência).
 *
 * Corre em 55 a 180 ms numa vista de 1000 × 1500 em Node, depois de compilada; a primeira chamada,
 * com a compilação, fica abaixo de 300 ms. O pedido era menos de 400 ms no browser.
 */

export interface Retangulo {
  x: number;
  y: number;
  largura: number;
  altura: number;
}

export interface JanelaDetetada extends Retangulo {
  /** De 0 a 1: as arestas e o enchimento da caixa, e se se repete em coluna ou em fila. */
  confianca: number;
}

export interface OpcoesDeteccao {
  /** Metros; por omissão 0,4. */
  larguraMinima?: number;
  /** Metros; por omissão 3,5. */
  larguraMaxima?: number;
  /** Metros; por omissão 0,4. */
  alturaMinima?: number;
  /** Metros; por omissão 3. */
  alturaMaxima?: number;
  /** Abaixo disto não se propõe; por omissão 0,3. */
  confiancaMinima?: number;
}

/** Células por metro da grelha de trabalho, no mínimo (a redução é por um número inteiro de píxeis). */
const PPM_TRABALHO = 20;
/** Lado dos blocos da primeira passagem da parede, e raio da vizinhança (m). */
const TAMANHO_BLOCO_M = 0.5;
const RAIO_PAREDE_M = 2.5;
/** Raio da caixa da segunda passagem (m) e folga à volta do que a primeira marcou. */
const RAIO_PAREDE_FINO_M = 0.6;
const FOLGA_PAREDE_M = 0.1;
/** Limiar = `K_RUIDO` × ruído, nunca abaixo dos mínimos (níveis de 0 a 255). */
const K_RUIDO = 3.5;
const LIMIAR_L_MINIMO = 12;
const LIMIAR_C_MINIMO = 9;
/** Limpeza da máscara. */
const RAIO_FECHO_M = 0.1;
const RAIO_ABERTURA_M = 0.12;
const AREA_BURACO_MAXIMA_M2 = 1.5;
/** Corte recursivo: uma peça do tamanho de uma janela com este enchimento já não se corta. */
const ENCHIMENTO_ACEITE = 0.6;
/** … e corta-se por uma coluna ou linha com no máximo esta fração marcada, a esta distância das pontas. */
const DENSIDADE_DE_CORTE = 0.3;
const MARGEM_DE_CORTE_M = 0.2;
/** Lados: até onde um lado anda para dentro (fração do lado) e para fora (m). */
const RECUO_MAXIMO = 0.3;
const AVANCO_M = 0.1;
/** Uma aresta com pelo menos `FRACAO_DO_MAXIMO` da mais forte, a menos disto para fora, é o aro. */
const MOLDURA_M = 0.12;
const FRACAO_DO_MAXIMO = 0.6;
/** Abaixo desta força (limiares) não há aresta a que ir. */
const FORCA_MINIMA_LADO = 0.6;
/** Sem arestas a menos disto do fim do contorno. */
const BORDA_M = 0.12;
/** Um lado com esta força vale nota cheia. */
const FORCA_BOA_LADO = 1.5;
/** Cada degrau conta no máximo isto; um lado tem aresta onde o degrau passa `DEGRAU_COBERTURA`. */
const DEGRAU_MAXIMO = 3;
const DEGRAU_COBERTURA = 0.5;
/** Inclinações dos lados experimentadas (células por célula): até ±15,6°. */
const INCLINACOES = [-0.28, -0.2, -0.13, -0.07, 0, 0.07, 0.13, 0.2, 0.28];
/** Estore: até onde a caixa sobe, e quanto da força das ombreiras tem de continuar. */
const EXTENSAO_MAXIMA_M = 0.7;
const CONTINUACAO_MINIMA = 0.35;
/** Duas caixas na mesma coluna: sobreposição em X, em fração da mais estreita. */
const SOBREPOSICAO_COLUNA = 0.6;
/** Raio do acerto de cada lado das hipóteses do consenso e do preenchimento (m). */
const AJUSTE_LOCAL_M = 0.15;
/** Nota a partir da qual uma caixa entra na medida da coluna. */
const NOTA_TIPICA = 0.3;
/** Muito mais alta do que a coluna e com esta nota: é outra coisa (uma montra), fica como está. */
const NOTA_PROPRIA = 0.6;
/** Nota mínima de uma janela que não se repete. */
const NOTA_ISOLADA = 0.8;
/** Nota mínima de uma janela preenchida pela coluna (e pelo menos metade da nota típica da coluna). */
const NOTA_PREENCHER = 0.35;
/** Variação máxima da altura das janelas de uma coluna com a cota (células por célula). */
const DECLIVE_ALTURA_MAXIMO = 0.06;
/** Para o enchimento conta também o que está a esta fração do limiar. */
const DIFERENCA_ENCHIMENTO = 0.6;
/** Parapeito de varanda: altura verificada por baixo do vão e fração diferente da parede. */
const PARAPEITO_M = 0.8;
const ENCHIMENTO_PARAPEITO = 0.75;

/** A cor com que `endireitar` pinta o que fica fora da fotografia. */
const FUNDO = [241, 245, 249] as const;

export function detetarJanelas(
  vista: Pixeis,
  ext: Extensao,
  ppm: number,
  contornos: Retangulo[],
  opcoes: OpcoesDeteccao = {},
): JanelaDetetada[] {
  const lim: Limites = {
    lMin: opcoes.larguraMinima ?? 0.4,
    lMax: opcoes.larguraMaxima ?? 3.5,
    aMin: opcoes.alturaMinima ?? 0.4,
    aMax: opcoes.alturaMaxima ?? 3,
  };
  const confMin = opcoes.confiancaMinima ?? 0.3;
  if (contornos.length === 0 || !(ppm > 0) || vista.data.length < vista.width * vista.height * 4) return [];
  const g = grelhaDeTrabalho(vista, ext, ppm, contornos);
  if (g.w < 8 || g.h < 8) return [];
  const par = diferencaDaParede(g);
  const d = diferencaNormalizada(g, par);
  const m = limpar(g, d);
  const { sx, sy } = degraus(g, par);
  const ctx: Contexto = { g, sx, sy, enchido: integralDoEnchimento(g, m, d) };
  const s = g.s;
  const tamanhoAceitavel = (c: Caixa, folga: number) => {
    const l = (c.i1 - c.i0) / s;
    const a = (c.j1 - c.j0) / s;
    return l >= lim.lMin / folga && l <= lim.lMax * folga && a >= lim.aMin / folga && a <= lim.aMax * folga;
  };

  const { rotulo, comps } = componentes(m, g.w, g.h);
  const pecas: Componente[] = [];
  comps.forEach((c, k) => cortar(rotulo, k + 1, g.w, s, c, lim, pecas));
  // Até as fracas entram: uma peça mal recortada (colada ao beiral) acerta-se no consenso da coluna.
  const candidatas: Candidata[] = [];
  for (const p of pecas) {
    if (!tamanhoAceitavel(p, 1.5)) continue;
    const c = refinar(ctx, p);
    if (tamanhoAceitavel(c, 1.5)) candidatas.push(c);
  }
  let finais: Candidata[] = [];
  for (const col of colunas(semDuplicados(candidatas))) finais.push(...consenso(ctx, col));
  finais = semDuplicados(finais);
  for (const col of colunas(finais)) finais.push(...preencher(ctx, regulares(col), finais));
  finais = finais.filter((c) => tamanhoAceitavel(c, 1) && !assenteEmParapeito(ctx, c));

  // Repetição: quantas outras na mesma coluna (das regulares) e na mesma fila (à mesma cota, com
  // altura parecida, sem se sobreporem em X).
  const naColuna = new Map<Candidata, number>();
  for (const col of colunas(finais)) {
    const r = regulares(col);
    for (const c of r) naColuna.set(c, r.length - 1);
  }
  const out: JanelaDetetada[] = [];
  for (const c of finais) {
    const a = c.j1 - c.j0;
    const naFila = finais.filter(
      (o) =>
        o !== c &&
        Math.abs((o.j0 + o.j1) / 2 - (c.j0 + c.j1) / 2) <= 0.35 * a &&
        Math.abs(o.j1 - o.j0 - a) <= 0.3 * a &&
        Math.min(o.i1, c.i1) <= Math.max(o.i0, c.i0),
    ).length;
    const repete = (naColuna.get(c) ?? 0) + naFila;
    if (repete === 0 && c.nota < NOTA_ISOLADA) continue;
    const conf = c.nota * (0.6 + 0.4 * Math.min(1, repete / 2)) * (c.preenchida ? 0.85 : 1);
    if (conf < confMin) continue;
    const janela = noContorno({ x: g.x0 + c.i0 / s, y: g.y1 - c.j1 / s, largura: (c.i1 - c.i0) / s, altura: (c.j1 - c.j0) / s }, contornos);
    if (janela) out.push({ ...janela, confianca: Math.round(conf * 100) / 100 });
  }
  return out.sort((a, b) => b.y - a.y || a.x - b.x);
}

/** A caixa recortada ao contorno onde está o seu centro; `null` se o centro não estiver em nenhum. */
function noContorno(r: Retangulo, contornos: Retangulo[]): Retangulo | null {
  const cx = r.x + r.largura / 2;
  const cy = r.y + r.altura / 2;
  const c = contornos.find((k) => cx >= k.x && cx <= k.x + k.largura && cy >= k.y && cy <= k.y + k.altura);
  if (!c) return null;
  const x0 = Math.max(r.x, c.x);
  const x1 = Math.min(r.x + r.largura, c.x + c.largura);
  const y0 = Math.max(r.y, c.y);
  const y1 = Math.min(r.y + r.altura, c.y + c.altura);
  return { x: x0, y: y0, largura: x1 - x0, altura: y1 - y0 };
}

// ——— Grelha de trabalho ———

interface Grelha {
  w: number;
  h: number;
  /** Células por metro. */
  s: number;
  x0: number;
  y1: number;
  valido: Uint8Array;
  L: Float32Array;
  ca: Float32Array;
  cb: Float32Array;
}

function grelhaDeTrabalho(vista: Pixeis, ext: Extensao, ppm: number, contornos: Retangulo[]): Grelha {
  const f = Math.max(1, Math.floor(ppm / PPM_TRABALHO));
  const s = ppm / f;
  const w = Math.floor(vista.width / f);
  const h = Math.floor(vista.height / f);
  const n = w * h;
  const L = new Float32Array(n);
  const ca = new Float32Array(n);
  const cb = new Float32Array(n);
  const valido = new Uint8Array(n);
  const d = vista.data;
  const W = vista.width;
  const f2 = f * f;
  // Células cujo centro está dentro de um dos contornos.
  const dentro = new Uint8Array(n);
  for (const c of contornos) {
    const ia = Math.max(0, Math.ceil((c.x - ext.x0) * s - 0.5));
    const ib = Math.min(w - 1, Math.floor((c.x + c.largura - ext.x0) * s - 0.5));
    const ja = Math.max(0, Math.ceil((ext.y1 - c.y - c.altura) * s - 0.5));
    const jb = Math.min(h - 1, Math.floor((ext.y1 - c.y) * s - 0.5));
    for (let j = ja; j <= jb; j++) if (ib >= ia) dentro.fill(1, j * w + ia, j * w + ib + 1);
  }
  // A cor de todas (as de fora também entram no alisamento das da borda).
  for (let j = 0; j < h; j++) {
    for (let i = 0; i < w; i++) {
      const p = j * w + i;
      let r = 0;
      let g = 0;
      let b = 0;
      let fundo = 0;
      for (let v = 0; v < f; v++) {
        let o = ((j * f + v) * W + i * f) * 4;
        for (let u = 0; u < f; u++, o += 4) {
          const R = d[o]!;
          const G = d[o + 1]!;
          const B = d[o + 2]!;
          if (R === FUNDO[0] && G === FUNDO[1] && B === FUNDO[2]) fundo++;
          r += R;
          g += G;
          b += B;
        }
      }
      r /= f2;
      g /= f2;
      b /= f2;
      L[p] = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      ca[p] = r - g;
      cb[p] = b - (r + g) / 2;
      valido[p] = dentro[p] && fundo * 2 < f2 ? 1 : 0;
    }
  }
  return { w, h, s, x0: ext.x0, y1: ext.y1, valido, L: caixa3(L, w, h), ca: caixa3(ca, w, h), cb: caixa3(cb, w, h) };
}

/** Caixa 3×3 (repete a borda). */
function caixa3(v: Float32Array, w: number, h: number): Float32Array {
  const tmp = new Float32Array(v.length);
  const out = new Float32Array(v.length);
  for (let j = 0; j < h; j++) {
    const b = j * w;
    for (let i = 0; i < w; i++) {
      tmp[b + i] = (v[b + (i > 0 ? i - 1 : 0)]! + v[b + i]! + v[b + (i < w - 1 ? i + 1 : w - 1)]!) / 3;
    }
  }
  for (let j = 0; j < h; j++) {
    const m = (j > 0 ? j - 1 : 0) * w;
    const c = j * w;
    const p = (j < h - 1 ? j + 1 : h - 1) * w;
    for (let i = 0; i < w; i++) out[c + i] = (tmp[m + i]! + tmp[c + i]! + tmp[p + i]!) / 3;
  }
  return out;
}

/** Mediana dos primeiros n valores (reordena-os): seleção rápida de Hoare. */
function mediana(a: Float32Array | number[], n: number): number {
  if (n === 0) return 0;
  const k = (n - 1) >> 1;
  let lo = 0;
  let hi = n - 1;
  while (hi > lo) {
    const piv = a[(lo + hi) >> 1]!;
    let i = lo;
    let j = hi;
    while (i <= j) {
      while (a[i]! < piv) i++;
      while (a[j]! > piv) j--;
      if (i <= j) {
        const t = a[i]!;
        a[i] = a[j]!;
        a[j] = t;
        i++;
        j--;
      }
    }
    if (k <= j) hi = j;
    else if (k >= i) lo = i;
    else break;
  }
  return a[k]!;
}

const medianaDe = (v: number[]) => mediana(v.slice(), v.length);

// ——— A parede ———

interface Parede {
  /** Diferença da parede, célula a célula: luminância (com sinal) e cor (distância). */
  dL: Float32Array;
  dC: Float32Array;
  limiarL: number;
  limiarC: number;
}

function diferencaDaParede(g: Grelha): Parede {
  const { w, h, s, valido, L, ca, cb } = g;
  const n = w * h;
  // Primeira passagem: mediana e dispersão de cada bloco.
  const tb = Math.max(4, Math.round(TAMANHO_BLOCO_M * s));
  const bw = Math.ceil(w / tb);
  const bh = Math.ceil(h / tb);
  const nb = bw * bh;
  const bL = new Float32Array(nb);
  const bA = new Float32Array(nb);
  const bB = new Float32Array(nb);
  const bDisp = new Float32Array(nb);
  const bDispC = new Float32Array(nb);
  const bOk = new Uint8Array(nb);
  const tL = new Float32Array(tb * tb);
  const tA = new Float32Array(tb * tb);
  const tB = new Float32Array(tb * tb);
  const tC = new Float32Array(tb * tb);
  for (let by = 0; by < bh; by++) {
    for (let bx = 0; bx < bw; bx++) {
      let k = 0;
      for (let j = by * tb; j < Math.min(h, (by + 1) * tb); j++) {
        for (let i = bx * tb; i < Math.min(w, (bx + 1) * tb); i++) {
          const p = j * w + i;
          if (!valido[p]) continue;
          tL[k] = L[p]!;
          tA[k] = ca[p]!;
          tB[k] = cb[p]!;
          k++;
        }
      }
      if (k * 2 < tb * tb) continue;
      const q = by * bw + bx;
      tC.set(tL.subarray(0, k));
      const mL = mediana(tC, k);
      tC.set(tA.subarray(0, k));
      const mA = mediana(tC, k);
      tC.set(tB.subarray(0, k));
      const mB = mediana(tC, k);
      bL[q] = mL;
      bA[q] = mA;
      bB[q] = mB;
      for (let t = 0; t < k; t++) tC[t] = Math.abs(tL[t]! - mL);
      bDisp[q] = mediana(tC, k);
      for (let t = 0; t < k; t++) {
        const da = tA[t]! - mA;
        const db = tB[t]! - mB;
        tC[t] = Math.sqrt(da * da + db * db);
      }
      bDispC[q] = mediana(tC, k);
      bOk[q] = 1;
    }
  }
  // O ruído: a dispersão mediana dos blocos (quase todos são parede) — daí os limiares.
  let nd = 0;
  const dispL = new Float32Array(nb);
  const dispC = new Float32Array(nb);
  for (let q = 0; q < nb; q++)
    if (bOk[q]) {
      dispL[nd] = bDisp[q]!;
      dispC[nd] = bDispC[q]!;
      nd++;
    }
  const limiarL = Math.max(LIMIAR_L_MINIMO, K_RUIDO * 1.4826 * mediana(dispL, nd));
  const limiarC = Math.max(LIMIAR_C_MINIMO, K_RUIDO * 1.4826 * mediana(dispC, nd));

  // A parede de cada bloco: mediana dos blocos vizinhos, só da metade mais lisa.
  const rb = Math.max(1, Math.round(RAIO_PAREDE_M / TAMANHO_BLOCO_M));
  const pL = new Float32Array(nb);
  const pA = new Float32Array(nb);
  const pB = new Float32Array(nb);
  const viz = new Float32Array((2 * rb + 1) * (2 * rb + 1));
  const vizQ = new Int32Array(viz.length);
  for (let by = 0; by < bh; by++) {
    for (let bx = 0; bx < bw; bx++) {
      let nv = 0;
      for (let yy = Math.max(0, by - rb); yy <= Math.min(bh - 1, by + rb); yy++)
        for (let xx = Math.max(0, bx - rb); xx <= Math.min(bw - 1, bx + rb); xx++) {
          const q = yy * bw + xx;
          if (bOk[q]) vizQ[nv++] = q;
        }
      if (nv === 0) continue;
      for (let k = 0; k < nv; k++) viz[k] = bDisp[vizQ[k]!]!;
      const corte = mediana(viz, nv);
      let nl = 0;
      for (let k = 0; k < nv; k++) if (bDisp[vizQ[k]!]! <= corte) vizQ[nl++] = vizQ[k]!;
      const q0 = by * bw + bx;
      for (let k = 0; k < nl; k++) viz[k] = bL[vizQ[k]!]!;
      pL[q0] = mediana(viz, nl);
      for (let k = 0; k < nl; k++) viz[k] = bA[vizQ[k]!]!;
      pA[q0] = mediana(viz, nl);
      for (let k = 0; k < nl; k++) viz[k] = bB[vizQ[k]!]!;
      pB[q0] = mediana(viz, nl);
    }
  }
  // Diferença da primeira passagem, por interpolação bilinear entre os centros dos blocos.
  const dL = new Float32Array(n);
  const dC = new Float32Array(n);
  const m0 = new Uint8Array(n);
  for (let j = 0; j < h; j++) {
    const v = Math.max(0, Math.min(bh - 1, (j + 0.5) / tb - 0.5));
    const by0 = Math.min(bh - 1, Math.floor(v));
    const by1 = Math.min(bh - 1, by0 + 1);
    const fv = v - by0;
    for (let i = 0; i < w; i++) {
      const p = j * w + i;
      if (!valido[p]) continue;
      const u = Math.max(0, Math.min(bw - 1, (i + 0.5) / tb - 0.5));
      const bx0 = Math.min(bw - 1, Math.floor(u));
      const bx1 = Math.min(bw - 1, bx0 + 1);
      const fu = u - bx0;
      const q00 = by0 * bw + bx0;
      const q10 = by0 * bw + bx1;
      const q01 = by1 * bw + bx0;
      const q11 = by1 * bw + bx1;
      const w00 = (1 - fu) * (1 - fv);
      const w10 = fu * (1 - fv);
      const w01 = (1 - fu) * fv;
      const w11 = fu * fv;
      dL[p] = L[p]! - (pL[q00]! * w00 + pL[q10]! * w10 + pL[q01]! * w01 + pL[q11]! * w11);
      const da = ca[p]! - (pA[q00]! * w00 + pA[q10]! * w10 + pA[q01]! * w01 + pA[q11]! * w11);
      const db = cb[p]! - (pB[q00]! * w00 + pB[q10]! * w10 + pB[q01]! * w01 + pB[q11]! * w11);
      dC[p] = Math.sqrt(da * da + db * db);
      if (Math.abs(dL[p]!) > limiarL || dC[p]! > limiarC) m0[p] = 1;
    }
  }

  // Segunda passagem: a média das células de parede numa caixa à volta de cada célula (imagens
  // integrais), de 0,6 m — ou de 2,5 m, se na pequena houver menos de 20 % de parede. Se nem na
  // grande houver, fica a primeira.
  const m0d = morfologia(m0, w, h, Math.max(1, Math.round(FOLGA_PAREDE_M * s)), true);
  const peso = new Float32Array(n);
  for (let p = 0; p < n; p++) peso[p] = valido[p] && !m0d[p] ? 1 : 0;
  const iW = integral(peso, null, w, h);
  const iL = integral(L, peso, w, h);
  const iA = integral(ca, peso, w, h);
  const iB = integral(cb, peso, w, h);
  const r1 = Math.max(2, Math.round(RAIO_PAREDE_FINO_M * s));
  const r2 = Math.max(r1 + 1, Math.round(RAIO_PAREDE_M * s));
  const W1 = w + 1;
  for (let j = 0; j < h; j++) {
    for (let i = 0; i < w; i++) {
      const p = j * w + i;
      if (!valido[p]) continue;
      for (let k = 0; k < 2; k++) {
        const r = k === 0 ? r1 : r2;
        const a0 = (j - r < 0 ? 0 : j - r) * W1;
        const a1 = (j + r + 1 > h ? h : j + r + 1) * W1;
        const b0 = i - r < 0 ? 0 : i - r;
        const b1 = i + r + 1 > w ? w : i + r + 1;
        const a = iW[a1 + b1]! - iW[a0 + b1]! - iW[a1 + b0]! + iW[a0 + b0]!;
        if (a < 0.2 * (2 * r + 1) * (2 * r + 1)) continue;
        dL[p] = L[p]! - (iL[a1 + b1]! - iL[a0 + b1]! - iL[a1 + b0]! + iL[a0 + b0]!) / a;
        const da = ca[p]! - (iA[a1 + b1]! - iA[a0 + b1]! - iA[a1 + b0]! + iA[a0 + b0]!) / a;
        const db = cb[p]! - (iB[a1 + b1]! - iB[a0 + b1]! - iB[a1 + b0]! + iB[a0 + b0]!) / a;
        dC[p] = Math.sqrt(da * da + db * db);
        break;
      }
    }
  }
  return { dL, dC, limiarL, limiarC };
}

/** Imagem integral de v·peso (ou só de v), com uma linha e uma coluna de zeros à frente. */
function integral(v: Float32Array, peso: Float32Array | null, w: number, h: number): Float64Array {
  const W1 = w + 1;
  const out = new Float64Array(W1 * (h + 1));
  for (let j = 0; j < h; j++) {
    let linha = 0;
    for (let i = 0; i < w; i++) {
      const p = j * w + i;
      linha += peso ? v[p]! * peso[p]! : v[p]!;
      out[(j + 1) * W1 + i + 1] = out[j * W1 + i + 1]! + linha;
    }
  }
  return out;
}

/** Diferença da parede em limiares: 1 é o limiar, na luminância ou na cor. */
function diferencaNormalizada(g: Grelha, par: Parede): Float32Array {
  const n = g.w * g.h;
  const d = new Float32Array(n);
  for (let p = 0; p < n; p++) {
    if (!g.valido[p]) continue;
    d[p] = Math.max(Math.abs(par.dL[p]!) / par.limiarL, par.dC[p]! / par.limiarC);
  }
  return d;
}

// ——— Máscara e manchas ———

/** Dilatação (ou erosão) binária com um quadrado de lado 2r + 1, separável. */
function morfologia(m: Uint8Array, w: number, h: number, r: number, dilatar: boolean): Uint8Array {
  if (r <= 0) return m.slice();
  const tmp = new Uint8Array(m.length);
  const out = new Uint8Array(m.length);
  const alvo = dilatar ? 1 : 0;
  for (let j = 0; j < h; j++) {
    const b = j * w;
    // Contagem móvel das células iguais a `alvo` em [i − r, i + r].
    let conta = 0;
    for (let i = 0; i <= Math.min(w - 1, r); i++) if (m[b + i] === alvo) conta++;
    for (let i = 0; i < w; i++) {
      tmp[b + i] = conta > 0 ? alvo : 1 - alvo;
      if (i - r >= 0 && m[b + i - r] === alvo) conta--;
      if (i + r + 1 < w && m[b + i + r + 1] === alvo) conta++;
    }
  }
  for (let i = 0; i < w; i++) {
    let conta = 0;
    for (let j = 0; j <= Math.min(h - 1, r); j++) if (tmp[j * w + i] === alvo) conta++;
    for (let j = 0; j < h; j++) {
      out[j * w + i] = conta > 0 ? alvo : 1 - alvo;
      if (j - r >= 0 && tmp[(j - r) * w + i] === alvo) conta--;
      if (j + r + 1 < h && tmp[(j + r + 1) * w + i] === alvo) conta++;
    }
  }
  return out;
}

/** Caixa de células, meio-aberta: colunas [i0, i1), linhas [j0, j1) (a linha 0 é a de cima). */
interface Caixa {
  i0: number;
  i1: number;
  j0: number;
  j1: number;
}

interface Componente extends Caixa {
  area: number;
}

/** Componentes ligadas (vizinhança de 4), com o rótulo de cada célula (0 = nenhuma). */
function componentes(m: Uint8Array, w: number, h: number): { rotulo: Int32Array; comps: Componente[] } {
  const rotulo = new Int32Array(m.length);
  const pilha = new Int32Array(m.length);
  const comps: Componente[] = [];
  for (let p0 = 0; p0 < m.length; p0++) {
    if (!m[p0] || rotulo[p0]) continue;
    const id = comps.length + 1;
    let topo = 0;
    pilha[topo++] = p0;
    rotulo[p0] = id;
    const c: Componente = { i0: w, i1: 0, j0: h, j1: 0, area: 0 };
    while (topo > 0) {
      const p = pilha[--topo]!;
      const i = p % w;
      const j = (p - i) / w;
      c.area++;
      if (i < c.i0) c.i0 = i;
      if (i + 1 > c.i1) c.i1 = i + 1;
      if (j < c.j0) c.j0 = j;
      if (j + 1 > c.j1) c.j1 = j + 1;
      if (i > 0 && m[p - 1] && !rotulo[p - 1]) {
        rotulo[p - 1] = id;
        pilha[topo++] = p - 1;
      }
      if (i < w - 1 && m[p + 1] && !rotulo[p + 1]) {
        rotulo[p + 1] = id;
        pilha[topo++] = p + 1;
      }
      if (j > 0 && m[p - w] && !rotulo[p - w]) {
        rotulo[p - w] = id;
        pilha[topo++] = p - w;
      }
      if (j < h - 1 && m[p + w] && !rotulo[p + w]) {
        rotulo[p + w] = id;
        pilha[topo++] = p + w;
      }
    }
    comps.push(c);
  }
  return { rotulo, comps };
}

/** Máscara limpa: marcada, fechada, sem buracos pequenos, aberta. */
function limpar(g: Grelha, d: Float32Array): Uint8Array {
  const { w, h, s, valido } = g;
  const n = w * h;
  let r: Uint8Array = new Uint8Array(n);
  for (let p = 0; p < n; p++) if (d[p]! >= 1) r[p] = 1;
  const rf = Math.max(1, Math.round(RAIO_FECHO_M * s));
  const ra = Math.max(1, Math.round(RAIO_ABERTURA_M * s));
  r = morfologia(morfologia(r, w, h, rf, true), w, h, rf, false);
  for (let p = 0; p < n; p++) if (!valido[p]) r[p] = 0;
  // Buracos: zonas sem marca, mais pequenas do que o limite, que não tocam na borda nem em células inválidas.
  const inv = new Uint8Array(n);
  for (let p = 0; p < n; p++) inv[p] = r[p] ? 0 : 1;
  const { rotulo, comps } = componentes(inv, w, h);
  const aberto = new Uint8Array(comps.length + 1);
  const areaMaxima = AREA_BURACO_MAXIMA_M2 * s * s;
  comps.forEach((c, k) => {
    if (c.area > areaMaxima || c.i0 === 0 || c.j0 === 0 || c.i1 === w || c.j1 === h) aberto[k + 1] = 1;
  });
  for (let p = 0; p < n; p++) if (inv[p] && !valido[p]) aberto[rotulo[p]!] = 1;
  for (let p = 0; p < n; p++) if (inv[p] && !aberto[rotulo[p]!]) r[p] = 1;
  return morfologia(morfologia(r, w, h, ra, false), w, h, ra, true);
}

interface Limites {
  lMin: number;
  lMax: number;
  aMin: number;
  aMax: number;
}

/** A mais pequena caixa que contém as células com o rótulo `id` dentro de `c`, e quantas são. */
function apertar(rotulo: Int32Array, id: number, w: number, c: Caixa): Componente | null {
  let i0 = c.i1;
  let i1 = c.i0;
  let j0 = c.j1;
  let j1 = c.j0;
  let area = 0;
  for (let j = c.j0; j < c.j1; j++) {
    const base = j * w;
    for (let i = c.i0; i < c.i1; i++) {
      if (rotulo[base + i] !== id) continue;
      area++;
      if (i < i0) i0 = i;
      if (i + 1 > i1) i1 = i + 1;
      if (j < j0) j0 = j;
      if (j + 1 > j1) j1 = j + 1;
    }
  }
  return area > 0 ? { i0, i1, j0, j1, area } : null;
}

/**
 * Corte recursivo em X e Y: uma mancha que junta várias janelas (pelo beiral, por um tubo de queda,
 * por uma varanda) parte-se pela coluna ou linha com menos marcas, enquanto não for uma peça do
 * tamanho de uma janela e bem cheia.
 */
function cortar(rotulo: Int32Array, id: number, w: number, s: number, c0: Caixa, lim: Limites, out: Componente[], fundo = 0): void {
  const c = apertar(rotulo, id, w, c0);
  if (!c) return;
  const wc = c.i1 - c.i0;
  const hc = c.j1 - c.j0;
  const cabe = wc <= lim.lMax * s && hc <= lim.aMax * s;
  if ((cabe && c.area >= ENCHIMENTO_ACEITE * wc * hc) || fundo > 12) {
    out.push(c);
    return;
  }
  const col = new Float32Array(wc);
  const lin = new Float32Array(hc);
  for (let j = c.j0; j < c.j1; j++) {
    const base = j * w;
    for (let i = c.i0; i < c.i1; i++) {
      if (rotulo[base + i] !== id) continue;
      col[i - c.i0]!++;
      lin[j - c.j0]!++;
    }
  }
  const margem = Math.max(2, Math.round(MARGEM_DE_CORTE_M * s));
  let melhor = Infinity;
  let onde = -1;
  let vertical = true;
  for (let k = margem; k < wc - margem; k++) {
    const v = (col[k - 1]! + col[k]! + col[k + 1]!) / (3 * hc);
    if (v < melhor) [melhor, onde, vertical] = [v, k, true];
  }
  for (let k = margem; k < hc - margem; k++) {
    const v = (lin[k - 1]! + lin[k]! + lin[k + 1]!) / (3 * wc);
    if (v < melhor) [melhor, onde, vertical] = [v, k, false];
  }
  if (onde < 0 || melhor > DENSIDADE_DE_CORTE) {
    out.push(c);
    return;
  }
  const [a, b]: [Caixa, Caixa] = vertical
    ? [
        { ...c, i1: c.i0 + onde },
        { ...c, i0: c.i0 + onde },
      ]
    : [
        { ...c, j1: c.j0 + onde },
        { ...c, j0: c.j0 + onde },
      ];
  cortar(rotulo, id, w, s, a, lim, out, fundo + 1);
  cortar(rotulo, id, w, s, b, lim, out, fundo + 1);
}

// ——— Arestas ———

/**
 * Degraus: em cada fronteira entre duas colunas (sx) ou duas linhas (sy) de células, a distância entre
 * a cor média das duas células de um lado e das duas do outro, em limiares (1 = o contraste mínimo de
 * uma janela). `sx[j·w + b]` é a fronteira entre as colunas b − 1 e b, na linha j.
 */
function degraus(g: Grelha, par: Parede): { sx: Float32Array; sy: Float32Array } {
  const { w, h, valido, L, ca: A, cb: B } = g;
  const kL = 0.5 / par.limiarL;
  const kC = 0.5 / par.limiarC;
  const sx = new Float32Array(w * h);
  const sy = new Float32Array(w * h);
  const dist = (p0: number, p1: number, q0: number, q1: number) => {
    const dl = (L[p0]! + L[p1]! - L[q0]! - L[q1]!) * kL;
    const da = (A[p0]! + A[p1]! - A[q0]! - A[q1]!) * kC;
    const db = (B[p0]! + B[p1]! - B[q0]! - B[q1]!) * kC;
    return Math.sqrt(dl * dl + da * da + db * db);
  };
  // Perto do fim do contorno (ou da fotografia) não há lado de janela: lá está a esquina do prédio,
  // o beiral, o que o contorno cortou. Uma fronteira só conta com `k` células válidas de cada lado.
  const k = Math.max(2, Math.round(BORDA_M * g.s));
  const pref = new Int32Array(Math.max(w, h) + 1);
  for (let j = 0; j < h; j++) {
    const base = j * w;
    for (let i = 0; i < w; i++) pref[i + 1] = pref[i]! + (valido[base + i] ? 0 : 1);
    for (let b = k; b <= w - k; b++) {
      if (pref[b + k]! - pref[b - k]! > 0) continue;
      const p = base + b;
      sx[p] = dist(p - 2, p - 1, p, p + 1);
    }
  }
  for (let i = 0; i < w; i++) {
    for (let j = 0; j < h; j++) pref[j + 1] = pref[j]! + (valido[j * w + i] ? 0 : 1);
    for (let r = k; r <= h - k; r++) {
      if (pref[r + k]! - pref[r - k]! > 0) continue;
      const p = r * w + i;
      sy[p] = dist(p - 2 * w, p - w, p, p + w);
    }
  }
  return { sx, sy };
}

/**
 * Força de um lado vertical na fronteira b, ao longo das linhas [j0, j1): o degrau médio (cada um
 * limitado a `DEGRAU_MAXIMO`, para uma aresta muito forte num bocado não valer por um lado inteiro)
 * vezes a fração do comprimento onde há aresta (degrau ≥ `DEGRAU_COBERTURA`, com uma célula de folga).
 * Um lado que só é aresta em metade do comprimento — meia caixa no vidro, meia na parede — vale metade.
 * Fica a melhor das `INCLINACOES`.
 */
function forcaVertical(sx: Float32Array, w: number, b: number, j0: number, j1: number): number {
  if (b < 2 || b > w - 3 || j1 <= j0) return 0;
  let melhor = 0;
  const jc = (j0 + j1 - 1) / 2;
  for (const inc of INCLINACOES) {
    let t = 0;
    let cob = 0;
    for (let j = j0; j < j1; j++) {
      const bb = b + Math.round(inc * (j - jc));
      if (bb < 1 || bb > w - 2) continue;
      const p = j * w + bb;
      const v = sx[p]!;
      t += v < DEGRAU_MAXIMO ? v : DEGRAU_MAXIMO;
      if (v >= DEGRAU_COBERTURA || sx[p - 1]! >= DEGRAU_COBERTURA || sx[p + 1]! >= DEGRAU_COBERTURA) cob++;
    }
    const n = j1 - j0;
    const f = (t / n) * (cob / n);
    if (f > melhor) melhor = f;
  }
  return melhor;
}

/** Força de um lado horizontal na fronteira r, ao longo das colunas [i0, i1) (como `forcaVertical`). */
function forcaHorizontal(sy: Float32Array, w: number, h: number, r: number, i0: number, i1: number): number {
  if (r < 2 || r > h - 3 || i1 <= i0) return 0;
  let melhor = 0;
  const ic = (i0 + i1 - 1) / 2;
  for (const inc of INCLINACOES) {
    let t = 0;
    let cob = 0;
    for (let i = i0; i < i1; i++) {
      const rr = r + Math.round(inc * (i - ic));
      if (rr < 1 || rr > h - 2) continue;
      const p = rr * w + i;
      const v = sy[p]!;
      t += v < DEGRAU_MAXIMO ? v : DEGRAU_MAXIMO;
      if (v >= DEGRAU_COBERTURA || sy[p - w]! >= DEGRAU_COBERTURA || sy[p + w]! >= DEGRAU_COBERTURA) cob++;
    }
    const n = i1 - i0;
    const f = (t / n) * (cob / n);
    if (f > melhor) melhor = f;
  }
  return melhor;
}

/**
 * Onde fica um lado: entre `lo` e `hi`, a fronteira mais forte; se para fora dela, a menos de
 * `moldura` células, houver outro máximo local com pelo menos `FRACAO_DO_MAXIMO` dessa força, fica o
 * mais de fora (a aresta de fora do aro, e não a do vidro). Sem aresta que chegue, fica onde estava.
 */
function melhorLado(forca: (b: number) => number, atual: number, lo: number, hi: number, foraEMenor: boolean, moldura: number): number {
  const vals: number[] = [];
  let max = 0;
  let kMax = -1;
  for (let b = lo; b <= hi; b++) {
    const v = forca(b);
    vals.push(v);
    if (v > max) [max, kMax] = [v, b - lo];
  }
  if (max < FORCA_MINIMA_LADO || kMax < 0) return atual;
  const passo = foraEMenor ? -1 : 1;
  let escolha = kMax;
  for (let k = kMax + passo, d = 1; k >= 0 && k < vals.length && d <= moldura; k += passo, d++) {
    const v = vals[k]!;
    if (v < FRACAO_DO_MAXIMO * max) continue;
    if ((k > 0 && vals[k - 1]! > v) || (k < vals.length - 1 && vals[k + 1]! > v)) continue;
    escolha = k;
  }
  return lo + escolha;
}

// ——— Caixas candidatas ———

interface Candidata extends Caixa {
  lados: [number, number, number, number];
  enchimento: number;
  nota: number;
  preenchida?: boolean;
}

interface Contexto {
  g: Grelha;
  sx: Float32Array;
  sy: Float32Array;
  /** Imagem integral das células diferentes da parede (máscara limpa, ou ≥ `DIFERENCA_ENCHIMENTO`). */
  enchido: Float64Array;
}

function integralDoEnchimento(g: Grelha, m: Uint8Array, d: Float32Array): Float64Array {
  const e = new Float32Array(m.length);
  for (let p = 0; p < m.length; p++) e[p] = m[p] || d[p]! >= DIFERENCA_ENCHIMENTO ? 1 : 0;
  return integral(e, null, g.w, g.h);
}

function enchidas(ctx: Contexto, i0: number, i1: number, j0: number, j1: number): number {
  const W1 = ctx.g.w + 1;
  const e = ctx.enchido;
  return e[j1 * W1 + i1]! - e[j0 * W1 + i1]! - e[j1 * W1 + i0]! + e[j0 * W1 + i0]!;
}

/** Força dos quatro lados, enchimento e nota de uma caixa. */
function medir(ctx: Contexto, c: Caixa): Candidata {
  const { g, sx, sy } = ctx;
  const { w, h } = g;
  const i0 = Math.max(0, Math.min(w - 1, Math.round(c.i0)));
  const i1 = Math.max(i0 + 1, Math.min(w, Math.round(c.i1)));
  const j0 = Math.max(0, Math.min(h - 1, Math.round(c.j0)));
  const j1 = Math.max(j0 + 1, Math.min(h, Math.round(c.j1)));
  const enchimento = enchidas(ctx, i0, i1, j0, j1) / ((i1 - i0) * (j1 - j0));
  const lados: [number, number, number, number] = [
    forcaVertical(sx, w, i0, j0, j1),
    forcaVertical(sx, w, i1, j0, j1),
    forcaHorizontal(sy, w, h, j0, i0, i1),
    forcaHorizontal(sy, w, h, j1, i0, i1),
  ];
  return { i0, i1, j0, j1, lados, enchimento, nota: notaDe(lados, enchimento) };
}

/**
 * Nota de 0 a 1: os lados têm de ser arestas — pesa o mais fraco, a dobrar, porque uma caixa com um
 * lado no meio do vidro ou da parede não é uma janela — e o interior tem de ser diferente da parede.
 */
function notaDe(lados: number[], enchimento: number): number {
  const o = [...lados].sort((a, b) => a - b);
  const aresta = Math.min(1, (2 * o[0]! + o[1]!) / 3 / FORCA_BOA_LADO);
  const ench = Math.max(0, Math.min(1, (enchimento - 0.2) / 0.5));
  return Math.sqrt(aresta * ench);
}

/** Cada lado vai à aresta mais forte a menos de `raio` células de onde está. */
function ajustarLocal(ctx: Contexto, c: Caixa, raio: number): Candidata {
  const { g, sx, sy } = ctx;
  const { w, h } = g;
  const moldura = Math.max(1, Math.round(MOLDURA_M * g.s));
  let { i0, i1, j0, j1 } = c;
  const fv = (b: number) => forcaVertical(sx, w, b, j0, j1);
  i0 = melhorLado(fv, i0, Math.max(2, i0 - raio), Math.min(i1 - 2, i0 + raio), true, moldura);
  i1 = melhorLado(fv, i1, Math.max(i0 + 2, i1 - raio), Math.min(w - 2, i1 + raio), false, moldura);
  const fh = (r: number) => forcaHorizontal(sy, w, h, r, i0, i1);
  j0 = melhorLado(fh, j0, Math.max(2, j0 - raio), Math.min(j1 - 2, j0 + raio), true, moldura);
  j1 = melhorLado(fh, j1, Math.max(j0 + 2, j1 - raio), Math.min(h - 2, j1 + raio), false, moldura);
  return medir(ctx, { i0, i1, j0, j1 });
}

/** Uma peça da máscara levada às arestas, com a caixa do estore se as ombreiras continuarem acima. */
function refinar(ctx: Contexto, c: Caixa): Candidata {
  const { g, sx, sy } = ctx;
  const { w, h, s } = g;
  const avanco = Math.max(2, Math.round(AVANCO_M * s));
  const moldura = Math.max(1, Math.round(MOLDURA_M * s));
  let { i0, i1, j0, j1 } = c;
  const recX = Math.max(2, Math.round(RECUO_MAXIMO * (i1 - i0)));
  const fv = (b: number) => forcaVertical(sx, w, b, j0, j1);
  i0 = melhorLado(fv, i0, Math.max(2, i0 - avanco), Math.min(i1 - 2, i0 + recX), true, moldura);
  i1 = melhorLado(fv, i1, Math.max(i0 + 2, i1 - recX), Math.min(w - 2, i1 + avanco), false, moldura);
  const recY = Math.max(2, Math.round(RECUO_MAXIMO * (j1 - j0)));
  const fh = (r: number) => forcaHorizontal(sy, w, h, r, i0, i1);
  j0 = melhorLado(fh, j0, Math.max(2, j0 - avanco), Math.min(j1 - 2, j0 + recY), true, moldura);
  j1 = melhorLado(fh, j1, Math.max(j0 + 2, j1 - recY), Math.min(h - 2, j1 + avanco), false, moldura);
  // Estore enrolado: as ombreiras continuam acima do topo encontrado — a caixa do estore é da janela.
  const minimoE = Math.max(DEGRAU_COBERTURA, Math.min(1, CONTINUACAO_MINIMA * forcaVertical(sx, w, i0, j0, j1)));
  const minimoD = Math.max(DEGRAU_COBERTURA, Math.min(1, CONTINUACAO_MINIMA * forcaVertical(sx, w, i1, j0, j1)));
  const ladoEm = (b: number, r: number) => Math.max(sx[r * w + b - 1] ?? 0, sx[r * w + b] ?? 0, sx[r * w + b + 1] ?? 0);
  const ombreira = (b: number, r: number) => (ladoEm(b, r - 1) + ladoEm(b, r) + ladoEm(b, r + 1)) / 3;
  let topo = j0;
  const extMax = Math.round(EXTENSAO_MAXIMA_M * s);
  while (topo > 3 && j0 - topo < extMax && ombreira(i0, topo - 1) >= minimoE && ombreira(i1, topo - 1) >= minimoD) topo--;
  if (j0 - topo >= 2) j0 = melhorLado(fh, topo, Math.max(2, topo - 2), Math.min(j0, topo + 2), true, moldura);
  return medir(ctx, { i0, i1, j0, j1 });
}

const iou = (a: Caixa, b: Caixa) => {
  const ix = Math.max(0, Math.min(a.i1, b.i1) - Math.max(a.i0, b.i0));
  const iy = Math.max(0, Math.min(a.j1, b.j1) - Math.max(a.j0, b.j0));
  const inter = ix * iy;
  return inter / ((a.i1 - a.i0) * (a.j1 - a.j0) + (b.i1 - b.i0) * (b.j1 - b.j0) - inter);
};

/** Duas caixas sobre a mesma janela: fica a de melhor nota. */
function semDuplicados(cs: Candidata[]): Candidata[] {
  const out: Candidata[] = [];
  for (const c of [...cs].sort((a, b) => b.nota - a.nota)) if (!out.some((o) => iou(o, c) > 0.3)) out.push(c);
  return out;
}

/**
 * Varanda, não janela: o vão assenta num parapeito — por baixo dele, em toda a largura e numa altura de
 * `PARAPEITO_M`, quase tudo é diferente da parede (a guarda, maciça ou gradeada). Debaixo de uma janela
 * há parede, o peitoril e quando muito umas escorrências.
 */
function assenteEmParapeito(ctx: Contexto, c: Caixa): boolean {
  const { g } = ctx;
  const j0 = c.j1;
  const j1 = Math.min(g.h, c.j1 + Math.round(PARAPEITO_M * g.s));
  if (j1 - j0 < 2) return false;
  let validas = 0;
  for (let j = j0; j < j1; j++) for (let i = c.i0; i < c.i1; i++) validas += g.valido[j * g.w + i]!;
  if (validas < 0.7 * (j1 - j0) * (c.i1 - c.i0)) return false;
  return enchidas(ctx, c.i0, c.i1, j0, j1) >= ENCHIMENTO_PARAPEITO * validas;
}

// ——— Repetição ———

const gauss = (x: number, sigma: number) => Math.exp(-(x * x) / (2 * sigma * sigma));

/** Colunas: caixas cujos intervalos em X se sobrepõem em `SOBREPOSICAO_COLUNA` do mais estreito. */
function colunas(cs: Candidata[]): Candidata[][] {
  const pai = cs.map((_, k) => k);
  const raiz = (k: number): number => (pai[k] === k ? k : (pai[k] = raiz(pai[k]!)));
  for (let a = 0; a < cs.length; a++)
    for (let b = a + 1; b < cs.length; b++) {
      const A = cs[a]!;
      const B = cs[b]!;
      const sob = Math.min(A.i1, B.i1) - Math.max(A.i0, B.i0);
      if (sob >= SOBREPOSICAO_COLUNA * Math.min(A.i1 - A.i0, B.i1 - B.i0)) pai[raiz(a)] = raiz(b);
    }
  const grupos = new Map<number, Candidata[]>();
  cs.forEach((c, k) => {
    const r = raiz(k);
    const gr = grupos.get(r);
    if (gr) gr.push(c);
    else grupos.set(r, [c]);
  });
  return [...grupos.values()];
}

/**
 * As janelas de uma coluna que se repetem de facto: com a largura da coluna (±20 %), a altura (±40 %)
 * e a distância à vizinha num múltiplo do passo da coluna. A pala por cima da porta da fotografia real,
 * mais larga e fora do passo, cai na mesma coluna mas não conta como repetição.
 */
function regulares(col: Candidata[]): Candidata[] {
  if (col.length < 2) return [];
  const boas = col.filter((c) => c.nota >= NOTA_TIPICA);
  const base = boas.length >= 2 ? boas : col;
  const mL = medianaDe(base.map((c) => c.i1 - c.i0));
  const mA = medianaDe(base.map((c) => c.j1 - c.j0));
  const coerentes = col
    .filter((c) => Math.abs(c.i1 - c.i0 - mL) <= 0.2 * mL && Math.abs(c.j1 - c.j0 - mA) <= 0.4 * mA)
    .sort((a, b) => a.j0 + a.j1 - b.j0 - b.j1);
  if (coerentes.length < 3) return coerentes.length === 2 ? coerentes : [];
  const centros = coerentes.map((c) => (c.j0 + c.j1) / 2);
  const passo = medianaDe(centros.slice(1).map((c, k) => c - centros[k]!));
  const noPasso = (d: number) => d / passo >= 0.8 && Math.abs(d / passo - Math.round(d / passo)) <= 0.2;
  return coerentes.filter(
    (_, k) => (k > 0 && noPasso(centros[k]! - centros[k - 1]!)) || (k < centros.length - 1 && noPasso(centros[k + 1]! - centros[k]!)),
  );
}

/**
 * Altura esperada das janelas de uma coluna em função da cota do centro: uma reta de Theil–Sen,
 * robusta a uma ou duas erradas. Numa fotografia real a altura das janelas endireitadas muda um pouco
 * de piso para piso, com o erro da calibração (na do promotor, medidas à mão, de 1,2 m no 1.º andar a
 * 1,5 m no 5.º).
 */
function alturaDaColuna(col: Caixa[]): (centro: number) => number {
  const cs = col.map((c) => (c.j0 + c.j1) / 2);
  const hs = col.map((c) => c.j1 - c.j0);
  const hMed = medianaDe(hs);
  const declives: number[] = [];
  for (let a = 0; a < col.length; a++)
    for (let b = a + 1; b < col.length; b++) {
      const dc = cs[b]! - cs[a]!;
      if (Math.abs(dc) > hMed) declives.push((hs[b]! - hs[a]!) / dc);
    }
  const declive = declives.length ? Math.max(-DECLIVE_ALTURA_MAXIMO, Math.min(DECLIVE_ALTURA_MAXIMO, medianaDe(declives))) : 0;
  const base = medianaDe(hs.map((hh, k) => hh - declive * cs[k]!));
  return (centro: number) => Math.max(hMed * 0.5, base + declive * centro);
}

/** Máximos locais (com pelo menos `minimo`) de um perfil entre `lo` e `hi`. */
function picos(f: (k: number) => number, lo: number, hi: number, minimo: number): number[] {
  const v: number[] = [];
  for (let k = lo - 1; k <= hi + 1; k++) v.push(f(k));
  const out: number[] = [];
  for (let k = 1; k < v.length - 1; k++) if (v[k]! >= minimo && v[k]! >= v[k - 1]! && v[k]! > v[k + 1]!) out.push(lo - 1 + k);
  return out;
}

/**
 * Numa coluna de três ou mais janelas, cada uma é posta à prova contra a medida da coluna: a esquerda
 * e a direita medianas e a altura esperada àquela cota. As hipóteses são todos os pares topo/base entre
 * as arestas horizontais à volta dela (na largura da coluna e na sua); ganha a de maior nota ×
 * (0,4 + 0,6 × coerência com a coluna). A janela que só mostrou o vidro (o estore descido parecia
 * parede) ganha o estore; a do último piso que se colou ao beiral perde-o; a tapada pela roupa volta
 * ao tamanho das outras. Nenhuma hipótese passa sem a imagem a confirmar: a nota é a das arestas e do
 * enchimento, como as outras. Fica como está quem é muito mais alto do que a coluna e tem arestas
 * próprias (uma montra do R/C por baixo das janelas).
 */
function consenso(ctx: Contexto, col: Candidata[]): Candidata[] {
  if (col.length < 3) return col;
  const { g, sy } = ctx;
  const raio = Math.max(2, Math.round(AJUSTE_LOCAL_M * g.s));
  const boas = col.filter((c) => c.nota >= NOTA_TIPICA);
  if (boas.length < 3) return col;
  const hMed = medianaDe(boas.map((c) => c.j1 - c.j0));
  const tipicas = boas.filter((c) => c.j1 - c.j0 >= 0.6 * hMed && c.j1 - c.j0 <= 1.6 * hMed);
  if (tipicas.length < 3) return col;
  const mE = medianaDe(tipicas.map((c) => c.i0));
  const mD = medianaDe(tipicas.map((c) => c.i1));
  const mL = mD - mE;
  const alturaEm = alturaDaColuna(tipicas);
  const valor = (c: Candidata) => {
    const a = alturaEm((c.j0 + c.j1) / 2);
    const coerencia = gauss((c.i0 - mE) / mL, 0.1) * gauss((c.i1 - mD) / mL, 0.1) * gauss((c.j1 - c.j0 - a) / a, 0.2);
    return c.nota * (0.4 + 0.6 * coerencia);
  };
  return col.map((c) => {
    if (c.j1 - c.j0 > 1.7 * hMed && c.nota >= NOTA_PROPRIA) return c;
    const a = alturaEm((c.j0 + c.j1) / 2);
    let melhor = c;
    let melhorValor = valor(c);
    for (const [e, d] of [
      [mE, mD],
      [c.i0, c.i1],
    ] as const) {
      const fh = (r: number) => forcaHorizontal(sy, g.w, g.h, r, e, d);
      const ps = picos(fh, Math.max(2, Math.round(c.j0 - 0.6 * a)), Math.min(g.h - 3, Math.round(c.j1 + 0.6 * a)), FORCA_MINIMA_LADO);
      for (const t of ps)
        for (const b of ps) {
          if (b - t < 0.6 * a || b - t > 1.5 * a) continue;
          const hip = ajustarLocal(ctx, { i0: e, i1: d, j0: t, j1: b }, raio);
          const v = valor(hip);
          if (v > melhorValor) [melhor, melhorValor] = [hip, v];
        }
    }
    return melhor;
  });
}

/**
 * Numa coluna regular (três ou mais, todas no mesmo passo), a janela em falta entre duas — ou a
 * seguir à primeira ou à última — só entra se a imagem a confirmar: nota acima de `NOTA_PREENCHER` e
 * de metade da nota típica da coluna, toda dentro do contorno e sem tocar noutra caixa. Nada se
 * inventa: é a hipótese que a coluna sugere, medida como as outras.
 */
function preencher(ctx: Contexto, col: Candidata[], todas: Candidata[]): Candidata[] {
  if (col.length < 3) return [];
  const { g } = ctx;
  const centros = col.map((c) => (c.j0 + c.j1) / 2).sort((a, b) => a - b);
  const passos = centros.slice(1).map((c, k) => c - centros[k]!);
  const passo = medianaDe(passos);
  if (!(passo > 0) || passos.some((p) => Math.abs(p / passo - Math.round(p / passo)) >= 0.15)) return [];
  const mE = medianaDe(col.map((c) => c.i0));
  const mD = medianaDe(col.map((c) => c.i1));
  const alturaEm = alturaDaColuna(col);
  const notaTipica = medianaDe(col.map((c) => c.nota));
  const alvos: number[] = [centros[0]! - passo, centros[centros.length - 1]! + passo];
  passos.forEach((p, k) => {
    for (let q = 1; q < Math.round(p / passo); q++) alvos.push(centros[k]! + q * passo);
  });
  const raio = Math.max(2, Math.round(AJUSTE_LOCAL_M * g.s));
  const novas: Candidata[] = [];
  for (const yc of alvos) {
    const a = alturaEm(yc);
    const hip = { i0: mE, i1: mD, j0: Math.round(yc - a / 2), j1: Math.round(yc + a / 2) };
    if (hip.j0 < 2 || hip.j1 > g.h - 2) continue;
    let validas = 0;
    for (let j = hip.j0; j < hip.j1; j++) for (let i = hip.i0; i < hip.i1; i++) validas += g.valido[j * g.w + i]!;
    if (validas < (hip.j1 - hip.j0) * (hip.i1 - hip.i0)) continue;
    const t = ajustarLocal(ctx, hip, raio);
    if (t.nota < Math.max(NOTA_PREENCHER, 0.5 * notaTipica)) continue;
    if ([...todas, ...novas].some((o) => iou(o, t) > 0.1)) continue;
    novas.push({ ...t, preenchida: true });
  }
  return novas;
}
