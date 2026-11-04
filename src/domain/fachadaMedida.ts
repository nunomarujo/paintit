import { corrigirParalaxe, type Ponto } from './homografia';

/**
 * Áreas de uma fachada desenhada sobre a fotografia endireitada (`homografia.ts`): cada zona é um
 * retângulo em metros reais, no plano da fachada — por isso as áreas são exatas, sem perspetiva.
 *
 * Regras (handoff de 03/11/2026, secção 3, e decisões pendentes da secção 8):
 * - **Contorno**: um ou mais retângulos (prédios com recuos ou cotas diferentes); conta a união,
 *   nunca a soma — dois contornos sobrepostos não contam duas vezes.
 * - **Vãos** (janelas, portas, montras): com mais de 1 m² descontam-se; com 1 m² ou menos, não
 *   (secção 3.3).
 * - **Marquises**: caixas salientes com parede própria (promotor, 04/11/2026, corrigindo a secção 3.4
 *   do handoff, que as dava por "fechadas, não pintadas"): a frente pinta-se e só os vidros se
 *   descontam — desenhados como vãos, como qualquer janela; e acrescentam as **paredes laterais**,
 *   altura × saliência, que é medida à fita (a fotografia de frente não a mostra). Sem saliência, as
 *   laterais ficam por medir, nunca estimadas. Um lado encostado a outra marquise não é exterior.
 * - **Varandas abertas**: a frente faz parte da fachada pintada (não desconta). As faces interiores
 *   (laje de baixo, paredes laterais) precisam da profundidade, que ainda não tem valor decidido
 *   (decisão 8.2): ficam **por medir**, nunca estimadas.
 * - **R/C**: pinta-se por omissão (promotor, 04/11/2026: "o R/C de um prédio é para pintar em
 *   princípio" — fecha a decisão 8.3, que propunha o contrário); pode excluir-se, por exemplo quando
 *   as lojas tratam da sua frente. As montras e portas do R/C descontam-se como vãos.
 * - Só conta o que está dentro do contorno; o resto avisa-se.
 *
 * Tudo por diferença e união de formas (retângulos e, desde 04/11/2026, triângulos retângulos —
 * a parede por cima do telhado do vizinho), por isso um vão desenhado dentro de um R/C já excluído
 * não se desconta duas vezes. As contas fazem-se por faixas verticais limitadas por retas: em cada
 * faixa, cada pedaço é um trapézio, e a área é exata — não há amostragem.
 */

export type TipoZona = 'fachada' | 'varanda' | 'marquise' | 'rc' | 'vao';

export const TIPO_ZONA_LABELS: Record<TipoZona, string> = {
  fachada: 'Contorno da fachada',
  varanda: 'Varandas abertas',
  marquise: 'Marquises',
  rc: 'R/C comercial',
  vao: 'Vãos (janelas, portas, montras)',
};

/** O canto onde fica o ângulo reto de uma zona triangular (metade do retângulo, cortado na diagonal). */
export type CantoReto = 'sup-esq' | 'sup-dir' | 'inf-esq' | 'inf-dir';

export interface Zona {
  id: string;
  tipo: TipoZona;
  /** Canto inferior esquerdo do retângulo que envolve a zona, em metros no plano da fachada (Y para cima). */
  x: number;
  y: number;
  largura: number;
  altura: number;
  /**
   * Sem isto, a zona é o retângulo. Com isto, é a metade do retângulo com o ângulo reto neste canto —
   * a parede que fica por cima de um telhado inclinado, uma empena (promotor, 04/11/2026: "tendo que
   * se colocar uma forma triangular, meti o retângulo a meio termo, a olho").
   */
  triangulo?: CantoReto;
}

/** Área (m²) a partir da qual um vão se desconta (handoff, secção 3.3: «superior a 1 m²»). */
export const AREA_MINIMA_VAO_M2 = 1;

/** Uma zona a partir de dois cantos opostos arrastados, por qualquer ordem. */
export function zonaDeDoisCantos(id: string, tipo: TipoZona, a: Ponto, b: Ponto, triangulo?: CantoReto): Zona {
  const z: Zona = {
    id,
    tipo,
    x: Math.min(a.x, b.x),
    y: Math.min(a.y, b.y),
    largura: Math.abs(b.x - a.x),
    altura: Math.abs(b.y - a.y),
  };
  return triangulo ? { ...z, triangulo } : z;
}

export const areaDaZona = (z: Zona) => z.largura * z.altura * (z.triangulo ? 0.5 : 1);

/** Os vértices da zona em metros, no sentido contrário aos ponteiros do relógio (3 num triângulo). */
export function verticesDaZona(z: Zona): Ponto[] {
  const [x0, x1, y0, y1] = [z.x, z.x + z.largura, z.y, z.y + z.altura];
  switch (z.triangulo) {
    case 'sup-esq':
      return [
        { x: x0, y: y0 },
        { x: x1, y: y1 },
        { x: x0, y: y1 },
      ];
    case 'sup-dir':
      return [
        { x: x1, y: y0 },
        { x: x1, y: y1 },
        { x: x0, y: y1 },
      ];
    case 'inf-esq':
      return [
        { x: x0, y: y0 },
        { x: x1, y: y0 },
        { x: x0, y: y1 },
      ];
    case 'inf-dir':
      return [
        { x: x0, y: y0 },
        { x: x1, y: y0 },
        { x: x1, y: y1 },
      ];
    default:
      return [
        { x: x0, y: y0 },
        { x: x1, y: y0 },
        { x: x1, y: y1 },
        { x: x0, y: y1 },
      ];
  }
}

/**
 * Desenhar em série (04/11/2026, depois do primeiro teste a sério do promotor: 29 janelas desenhadas
 * uma a uma, "dá muito trabalho"). Desenha-se o primeiro e o último elemento de uma coluna ou de uma
 * linha e diz-se quantos são ao todo; os do meio ficam igualmente espaçados, com posição e tamanho
 * interpolados — o último pode ser ligeiramente diferente do primeiro (perspetiva mal corrigida,
 * mão menos firme), e a série reparte essa diferença em vez de a copiar.
 */
export function zonasEmSerie(primeira: Zona, ultima: Zona, total: number, id: (i: number) => string): Zona[] {
  const n = Math.max(2, Math.round(total));
  return Array.from({ length: n }, (_, i) => {
    const t = i / (n - 1);
    const mistura = (a: number, b: number) => a + (b - a) * t;
    return {
      id: id(i),
      tipo: primeira.tipo,
      x: mistura(primeira.x, ultima.x),
      y: mistura(primeira.y, ultima.y),
      largura: mistura(primeira.largura, ultima.largura),
      altura: mistura(primeira.altura, ultima.altura),
      ...(primeira.triangulo ? { triangulo: primeira.triangulo } : {}),
    };
  });
}

/** Pé-direito usado só para sugerir quantos elementos tem uma coluna; a pessoa corrige o número. */
export const PE_DIREITO_SUGERIDO_M = 2.9;

/**
 * Quantos elementos sugerir para uma série: numa coluna, um por piso; numa linha, um por cada duas
 * larguras do elemento (janela, parede, janela). É só o número inicial do campo.
 */
export function contagemSugerida(primeira: Zona, ultima: Zona): number {
  const dx = Math.abs(ultima.x - primeira.x);
  const dy = Math.abs(ultima.y - primeira.y);
  const passo = dy >= dx ? PE_DIREITO_SUGERIDO_M : Math.max(1, 2 * primeira.largura);
  return Math.max(2, Math.round(Math.max(dx, dy) / passo) + 1);
}

export type Aresta = 'esquerda' | 'direita' | 'baixo' | 'cima';

/** Tamanho mínimo de uma zona (metros) — abaixo disto um arrasto é tomado por engano. */
export const LADO_MINIMO_M = 0.2;

/**
 * As arestas de uma zona que ficam a menos de `tolerancia` de um ponto (no máximo duas — um canto).
 * Serve para acertar um retângulo arrastando a aresta, em vez de o apagar e desenhar de novo.
 */
export function arestasPerto(z: Zona, p: Ponto, tolerancia: number): Aresta[] {
  const [x0, x1, y0, y1] = [z.x, z.x + z.largura, z.y, z.y + z.altura];
  // Numa zona pequena, a faixa de cada aresta não passa de um terço do lado: o meio de uma janela de
  // 1,2 m nunca agarra a aresta de lado (no telemóvel, 14 px chegam a ser 0,8 m — revisão de 04/11/2026).
  const tol = Math.min(tolerancia, Math.min(z.largura, z.altura) / 3);
  const dentroX = p.x >= x0 - tol && p.x <= x1 + tol;
  const dentroY = p.y >= y0 - tol && p.y <= y1 + tol;
  const [de, dd, db, dc] = [Math.abs(p.x - x0), Math.abs(p.x - x1), Math.abs(p.y - y0), Math.abs(p.y - y1)];
  const vertical: [Aresta, number] | null = dentroY && Math.min(de, dd) <= tol ? (de <= dd ? ['esquerda', de] : ['direita', dd]) : null;
  const horizontalA: [Aresta, number] | null = dentroX && Math.min(db, dc) <= tol ? (db <= dc ? ['baixo', db] : ['cima', dc]) : null;
  if (vertical && horizontalA) {
    // Um canto só quando o dedo está mesmo no canto; senão, a aresta mais próxima.
    if (Math.hypot(vertical[1], horizontalA[1]) <= tol) return [vertical[0], horizontalA[0]];
    return [vertical[1] <= horizontalA[1] ? vertical[0] : horizontalA[0]];
  }
  if (vertical) return [vertical[0]];
  if (horizontalA) return [horizontalA[0]];
  return [];
}

/**
 * As arestas indicadas deslocadas de `d` (o arrasto do dedo, em metros) — e não levadas à posição do
 * dedo: assim um tremor ao pousar o dedo mexe a aresta o mesmo que o tremor, e não a faz saltar.
 */
export function deslocarArestas(z: Zona, arestas: Aresta[], d: Ponto): Zona {
  const alvo = {
    x: arestas.includes('esquerda') ? z.x + d.x : z.x + z.largura + d.x,
    y: arestas.includes('baixo') ? z.y + d.y : z.y + z.altura + d.y,
  };
  return moverArestas(z, arestas, alvo);
}

/** A zona com as arestas indicadas levadas ao ponto `p`, sem nunca ficar com menos de `LADO_MINIMO_M`. */
export function moverArestas(z: Zona, arestas: Aresta[], p: Ponto): Zona {
  let x0 = z.x;
  let x1 = z.x + z.largura;
  let y0 = z.y;
  let y1 = z.y + z.altura;
  if (arestas.includes('esquerda')) x0 = Math.min(p.x, x1 - LADO_MINIMO_M);
  if (arestas.includes('direita')) x1 = Math.max(p.x, x0 + LADO_MINIMO_M);
  if (arestas.includes('baixo')) y0 = Math.min(p.y, y1 - LADO_MINIMO_M);
  if (arestas.includes('cima')) y1 = Math.max(p.y, y0 + LADO_MINIMO_M);
  return { ...z, x: x0, y: y0, largura: x1 - x0, altura: y1 - y0 };
}

/** Reta y = a + b·x. */
interface Reta {
  a: number;
  b: number;
}
const emX = (r: Reta, x: number) => r.a + r.b * x;
const horizontal = (y: number): Reta => ({ a: y, b: 0 });

/** Uma zona vista como faixa vertical: entre `x0` e `x1`, de `baixo(x)` a `cima(x)`. */
interface Forma {
  x0: number;
  x1: number;
  baixo: Reta;
  cima: Reta;
}

function forma(z: Zona): Forma {
  const [x0, x1, y0, y1] = [z.x, z.x + z.largura, z.y, z.y + z.altura];
  if (!z.triangulo || z.largura <= 0) return { x0, x1, baixo: horizontal(y0), cima: horizontal(y1) };
  const declive = z.altura / z.largura;
  const sobe: Reta = { a: y0 - declive * x0, b: declive }; // de (x0, y0) a (x1, y1)
  const desce: Reta = { a: y1 + declive * x0, b: -declive }; // de (x0, y1) a (x1, y0)
  switch (z.triangulo) {
    case 'sup-esq':
      return { x0, x1, baixo: sobe, cima: horizontal(y1) };
    case 'sup-dir':
      return { x0, x1, baixo: desce, cima: horizontal(y1) };
    case 'inf-esq':
      return { x0, x1, baixo: horizontal(y0), cima: desce };
    case 'inf-dir':
      return { x0, x1, baixo: horizontal(y0), cima: sobe };
  }
}

const contem = (fs: Forma[], x: number, y: number) => fs.some((f) => x > f.x0 && x < f.x1 && y > emX(f.baixo, x) && y < emX(f.cima, x));

/** Se o ponto está dentro da zona (retângulo ou triângulo) — para tocar numa zona e a escolher. */
export const zonaContem = (z: Zona, p: Ponto) => contem([forma(z)], p.x, p.y);

/**
 * Área exata do que satisfaz o predicado, dentro das formas dadas. Corta-se o plano em faixas
 * verticais nos x de todas as formas e nos cruzamentos de todas as retas; dentro de cada faixa as
 * retas não se cruzam, por isso cada pedaço entre duas retas seguidas é um trapézio, todo dentro ou
 * todo fora de cada forma — basta perguntar ao predicado pelo centro. Só com retângulos, as faixas
 * são as da compressão de coordenadas de sempre.
 */
function areaOnde(todas: Forma[], dentro: (x: number, y: number) => boolean): number {
  if (todas.length === 0) return 0;
  const xmin = Math.min(...todas.map((f) => f.x0));
  const xmax = Math.max(...todas.map((f) => f.x1));
  const cortes = new Set(todas.flatMap((f) => [f.x0, f.x1]));
  const retas = todas.flatMap((f) => [f.baixo, f.cima]);
  for (let i = 0; i < retas.length; i++) {
    for (let j = i + 1; j < retas.length; j++) {
      const db = retas[i]!.b - retas[j]!.b;
      if (Math.abs(db) < 1e-12) continue;
      const x = (retas[j]!.a - retas[i]!.a) / db;
      if (x > xmin && x < xmax) cortes.add(x);
    }
  }
  const xs = [...cortes].sort((a, b) => a - b);
  let area = 0;
  for (let k = 0; k < xs.length - 1; k++) {
    const [xa, xb] = [xs[k]!, xs[k + 1]!];
    if (xb - xa < 1e-12) continue;
    const xm = (xa + xb) / 2;
    const ativas = todas.filter((f) => f.x0 < xm && f.x1 > xm);
    const rs = ativas.flatMap((f) => [f.baixo, f.cima]).sort((p, q) => emX(p, xm) - emX(q, xm));
    for (let n = 0; n < rs.length - 1; n++) {
      const [yb, yc] = [emX(rs[n]!, xm), emX(rs[n + 1]!, xm)];
      // Num trapézio, a altura a meio da faixa é a média das duas bases: área = altura a meio × largura.
      if (yc - yb > 1e-12 && dentro(xm, (yb + yc) / 2)) area += (yc - yb) * (xb - xa);
    }
  }
  return area;
}

export interface LinhaArea {
  tipo: TipoZona;
  rotulo: string;
  /** Área dentro do contorno, em m², com duas casas. */
  areaM2: number;
  /** O que esta categoria faz ao total pintável. */
  efeito: 'base' | 'pinta' | 'desconta' | 'fora' | 'acrescenta';
  nota?: string;
  /** A área não se pode calcular sem uma medida que falta (a saliência das marquises): mostra-se "por medir". */
  porMedir?: boolean;
}

export interface ResultadoFachada {
  temContorno: boolean;
  /** Caixa envolvente do contorno — a frente e a altura que alimentam o volume 3D. */
  frenteM: number;
  alturaM: number;
  contornoM2: number;
  linhas: LinhaArea[];
  vaosDescontados: number;
  vaosPequenos: number;
  /** Área a pintar desta fachada: contorno − vãos > 1 m² (− R/C, se excluído) + laterais, tecto e cobertura das marquises. */
  pintavelM2: number;
  avisos: string[];
  /**
   * Há marquises com cobertura à vista (corpos salientes sem telha): a impermeabilização tem de se
   * perguntar (promotor, 04/11/2026). Área em m², ou nula se ainda falta a saliência.
   */
  coberturasSalientes: { existem: boolean; areaM2: number | null };
}

const arred = (n: number) => Math.round(n * 100) / 100;

export interface OpcoesFachada {
  /** Por omissão, sim (promotor, 04/11/2026). */
  incluirRC?: boolean;
  /** Quanto as marquises saem da parede, em metros, medido à fita. Sem valor: laterais por medir. */
  salienciaMarquisesM?: number | null;
  /** Vidro nas paredes laterais das marquises, ao todo (m²) — não se vê de frente, mede-se no local. */
  vidrosLateraisMarquisesM2?: number | null;
}

/** Intervalos [a, b] em y, ordenados e sem sobreposição. */
type Intervalos = [number, number][];

function uniao(is: Intervalos): Intervalos {
  const ordenados = is.filter(([a, b]) => b - a > 1e-12).sort((p, q) => p[0] - q[0]);
  const r: Intervalos = [];
  for (const [a, b] of ordenados) {
    const ultimo = r[r.length - 1];
    if (ultimo && a <= ultimo[1] + 1e-12) ultimo[1] = Math.max(ultimo[1], b);
    else r.push([a, b]);
  }
  return r;
}
function intersecao(a: Intervalos, b: Intervalos): Intervalos {
  const r: Intervalos = [];
  for (const [a0, a1] of a)
    for (const [b0, b1] of b) if (Math.min(a1, b1) - Math.max(a0, b0) > 1e-12) r.push([Math.max(a0, b0), Math.min(a1, b1)]);
  return uniao(r);
}
function menos(a: Intervalos, b: Intervalos): Intervalos {
  let r = a;
  for (const [b0, b1] of b) {
    r = r.flatMap(([a0, a1]): Intervalos => {
      if (b1 <= a0 || b0 >= a1) return [[a0, a1]];
      return [...(b0 > a0 ? ([[a0, b0]] as Intervalos) : []), ...(b1 < a1 ? ([[b1, a1]] as Intervalos) : [])];
    });
  }
  return uniao(r);
}
const medida = (is: Intervalos) => is.reduce((s, [a, b]) => s + (b - a), 0);
/** O que as formas cobrem na vertical x = `x` (avaliado em x, só formas que atravessam x). */
const naVertical = (fs: Forma[], x: number): Intervalos =>
  uniao(fs.filter((f) => f.x0 < x && f.x1 > x).map((f): [number, number] => [emX(f.baixo, x), emX(f.cima, x)]));

/** Folga até à qual duas marquises desenhadas à mão se consideram encostadas (a parede do meio é interior). */
export const FOLGA_ENCOSTADAS_M = 0.25;

/**
 * As marquises por colunas (as de pisos seguidos, umas sobre as outras): o tecto de baixo é só o da
 * mais baixa e a cobertura só a da mais alta (promotor, 04/11/2026), e as paredes laterais vão de baixo
 * a cima da coluna — os intervalos entre marquises desenhadas piso a piso são parede da coluna, não ar.
 */
function colunasDeMarquises(marquises: Zona[]): Zona[][] {
  const colunas: Zona[][] = [];
  for (const m of [...marquises].sort((a, b) => a.y - b.y)) {
    const coluna = m.triangulo
      ? undefined
      : colunas.find((c) => {
          const u = c[c.length - 1]!;
          if (u.triangulo) return false;
          const sobre = Math.min(u.x + u.largura, m.x + m.largura) - Math.max(u.x, m.x);
          const razao = Math.max(u.largura, m.largura) / Math.max(1e-9, Math.min(u.largura, m.largura));
          return sobre >= 0.5 * Math.min(u.largura, m.largura) && razao <= 1.6;
        });
    if (coluna) coluna.push(m);
    else colunas.push([m]);
  }
  return colunas;
}

interface GeometriaMarquises {
  /** Comprimento vertical das paredes laterais à vista, dentro do contorno e fora de um R/C excluído. */
  lateraisM: number;
  /** Comprimento horizontal do tecto à vista (por baixo da mais baixa de cada coluna). */
  tectoM: number;
  /** Comprimento da cobertura (por cima da mais alta de cada coluna; a hipotenusa num triângulo). */
  coberturaM: number;
}

function geometriaDasMarquises(marquises: Zona[], contorno: Forma[], rcFora: Forma[]): GeometriaMarquises {
  if (marquises.length === 0) return { lateraisM: 0, tectoM: 0, coberturaM: 0 };
  const colunas = colunasDeMarquises(marquises);
  // A caixa de cada coluna (os triângulos ficam como estão: uma marquise triangular é a sua própria coluna).
  const caixas: Zona[] = colunas.map((c) => {
    if (c.length === 1 && c[0]!.triangulo) return c[0]!;
    const x0 = Math.min(...c.map((m) => m.x));
    const y0 = Math.min(...c.map((m) => m.y));
    return {
      ...c[0]!,
      x: x0,
      y: y0,
      largura: Math.max(...c.map((m) => m.x + m.largura)) - x0,
      altura: Math.max(...c.map((m) => m.y + m.altura)) - y0,
    };
  });
  // Colunas desenhadas à mão quase encostadas (folga ou sobreposição pequena): encostam de facto.
  for (const a of caixas) {
    if (a.triangulo) continue;
    for (const b of caixas) {
      if (a === b || b.triangulo) continue;
      const folga = a.x - (b.x + b.largura);
      const sobreV = Math.min(a.y + a.altura, b.y + b.altura) - Math.max(a.y, b.y);
      if (folga > 0 && folga <= FOLGA_ENCOSTADAS_M && sobreV > 0) {
        a.largura += folga;
        a.x = b.x + b.largura;
      }
    }
  }
  const formas = caixas.map(forma);
  const valido = (x: number) => menos(naVertical(contorno, x), naVertical(rcFora, x));
  const eps = 1e-7;
  // Paredes laterais: a fronteira vertical da união das colunas, onde um lado é marquise e o outro não.
  let lateraisM = 0;
  for (const x of new Set(formas.flatMap((f) => [f.x0, f.x1]))) {
    const esquerda = naVertical(formas, x - eps);
    const direita = naVertical(formas, x + eps);
    lateraisM += medida(intersecao(menos(esquerda, direita), valido(x - eps)));
    lateraisM += medida(intersecao(menos(direita, esquerda), valido(x + eps)));
  }
  // Tecto da mais baixa e cobertura da mais alta, de cada coluna — se esse ponto contar (no contorno, fora de R/C excluído).
  const conta = (x: number, y: number) => contem(contorno, x, y) && !contem(rcFora, x, y);
  let tectoM = 0;
  let coberturaM = 0;
  for (const c of colunas) {
    const baixo = c[0]!;
    const cima = c[c.length - 1]!;
    const hipotenusa = (m: Zona) => Math.hypot(m.largura, m.altura);
    const meio = (m: Zona) => m.x + m.largura / 2;
    if (baixo.triangulo) {
      const emBaixo = baixo.triangulo.startsWith('inf');
      const yb = emBaixo ? baixo.y + eps : baixo.y + baixo.altura / 2;
      if (conta(meio(baixo), yb)) {
        tectoM += emBaixo ? baixo.largura : hipotenusa(baixo);
        coberturaM += emBaixo ? hipotenusa(baixo) : baixo.largura;
      }
      continue;
    }
    if (conta(meio(baixo), baixo.y + 0.01)) tectoM += baixo.largura;
    if (conta(meio(cima), cima.y + cima.altura - 0.01)) coberturaM += cima.largura;
  }
  return { lateraisM, tectoM, coberturaM };
}

export function areasDaFachada(zonas: Zona[], opcoes: OpcoesFachada = {}): ResultadoFachada {
  const incluirRC = opcoes.incluirRC ?? true;
  const saliencia = opcoes.salienciaMarquisesM && opcoes.salienciaMarquisesM > 0 ? opcoes.salienciaMarquisesM : null;
  const vidrosLaterais = opcoes.vidrosLateraisMarquisesM2 && opcoes.vidrosLateraisMarquisesM2 > 0 ? opcoes.vidrosLateraisMarquisesM2 : 0;
  const contornoZonas = zonas.filter((z) => z.tipo === 'fachada');
  const contorno = contornoZonas.map(forma);
  const avisos: string[] = [];
  if (contorno.length === 0) {
    return {
      temContorno: false,
      frenteM: 0,
      alturaM: 0,
      contornoM2: 0,
      linhas: [],
      vaosDescontados: 0,
      vaosPequenos: 0,
      pintavelM2: 0,
      avisos: ['Falta desenhar o contorno da fachada.'],
      coberturasSalientes: { existem: zonas.some((z) => z.tipo === 'marquise'), areaM2: null },
    };
  }

  const todos = zonas.map(forma);
  const porTipo = (t: TipoZona) => zonas.filter((z) => z.tipo === t).map(forma);
  /** Área dentro do contorno, que esteja em `fs` e em nenhum de `ja` (já descontado antes). */
  const noContorno = (fs: Forma[], ja: Forma[] = []) =>
    areaOnde(todos, (x, y) => contem(contorno, x, y) && contem(fs, x, y) && !contem(ja, x, y));

  const vaos = zonas.filter((z) => z.tipo === 'vao');
  const vaosGrandes = vaos.filter((z) => areaDaZona(z) > AREA_MINIMA_VAO_M2).map(forma);
  const marquises = porTipo('marquise');
  const rc = porTipo('rc');
  const varandas = porTipo('varanda');

  // Desconta-se por esta ordem, e cada linha só leva o que as anteriores não levaram: assim as linhas
  // somam exatamente (contorno − R/C excluído − vãos + laterais das marquises = pintável), sem nada
  // descontado duas vezes. As marquises já não descontam: a frente delas é parede pintada.
  const rcFora = incluirRC ? [] : rc;
  const rcForaM2 = noContorno(rcFora);
  const vaosM2 = noContorno(vaosGrandes, rcFora);
  const excluidas = [...rcFora, ...vaosGrandes];
  const marquisesM2 = noContorno(marquises, excluidas);
  const geo = geometriaDasMarquises(
    zonas.filter((z) => z.tipo === 'marquise'),
    contorno,
    rcFora,
  );
  const lateraisM2 = saliencia ? Math.max(0, geo.lateraisM * saliencia - vidrosLaterais) : 0;
  const tectoM2 = saliencia ? geo.tectoM * saliencia : 0;
  const coberturaM2 = saliencia ? geo.coberturaM * saliencia : 0;
  const contornoM2 = areaOnde(todos, (x, y) => contem(contorno, x, y));
  const pintavelM2 = contornoM2 - rcForaM2 - vaosM2 + lateraisM2 + tectoM2 + coberturaM2;

  for (const z of zonas) {
    if (z.tipo === 'fachada') continue;
    const f = forma(z);
    const fora = areaDaZona(z) - areaOnde([...contorno, f], (x, y) => contem([f], x, y) && contem(contorno, x, y));
    if (fora > 0.05 * areaDaZona(z) && fora > 0.01) {
      avisos.push(
        `Parte de uma zona de ${TIPO_ZONA_LABELS[z.tipo].toLowerCase()} está fora do contorno e não conta (${String(arred(fora)).replace('.', ',')} m²).`,
      );
    }
  }

  const xs = contornoZonas.flatMap((z) => [z.x, z.x + z.largura]);
  const ys = contornoZonas.flatMap((z) => [z.y, z.y + z.altura]);

  const linhas: LinhaArea[] = [{ tipo: 'fachada', rotulo: 'Fachada (contorno)', areaM2: arred(contornoM2), efeito: 'base' }];
  if (rc.length > 0) {
    linhas.push({
      tipo: 'rc',
      rotulo: TIPO_ZONA_LABELS.rc,
      areaM2: arred(noContorno(rc)),
      efeito: incluirRC ? 'pinta' : 'fora',
      nota: incluirRC ? 'incluído; as montras e portas descontam-se desenhadas como vãos' : 'excluído da área a pintar',
    });
  }
  if (vaos.length > 0) {
    const pequenos = vaos.length - vaosGrandes.length;
    linhas.push({
      tipo: 'vao',
      rotulo: TIPO_ZONA_LABELS.vao,
      areaM2: arred(vaosM2),
      efeito: 'desconta',
      nota: pequenos > 0 ? `${pequenos} com 1 m² ou menos não descontam` : undefined,
    });
  }
  if (marquises.length > 0) {
    linhas.push({
      tipo: 'marquise',
      rotulo: 'Marquises — frente',
      areaM2: arred(marquisesM2),
      efeito: 'pinta',
      nota: 'incluída na fachada; os vidros descontam-se desenhados como vãos',
    });
    const s = saliencia ? String(saliencia).replace('.', ',') : '';
    linhas.push({
      tipo: 'marquise',
      rotulo: 'Marquises — paredes laterais',
      areaM2: arred(lateraisM2),
      efeito: 'acrescenta',
      porMedir: !saliencia,
      nota: !saliencia
        ? 'por medir: indicar quanto as marquises saem da parede'
        : vidrosLaterais > 0
          ? `lados à vista × ${s} m de saliência, menos ${String(arred(vidrosLaterais)).replace('.', ',')} m² de vidros laterais`
          : `lados à vista × ${s} m de saliência; vidros nas laterais não descontados`,
    });
    linhas.push({
      tipo: 'marquise',
      rotulo: 'Marquises — tecto da mais baixa',
      areaM2: arred(tectoM2),
      efeito: 'acrescenta',
      porMedir: !saliencia,
      nota: saliencia ? `a face de baixo, à vista da rua × ${s} m` : 'por medir: falta a saliência',
    });
    linhas.push({
      tipo: 'marquise',
      rotulo: 'Marquises — cobertura da mais alta',
      areaM2: arred(coberturaM2),
      efeito: 'acrescenta',
      porMedir: !saliencia,
      nota: saliencia ? `sem telha × ${s} m — perguntar a impermeabilização` : 'por medir: falta a saliência',
    });
  }
  if (varandas.length > 0) {
    linhas.push({
      tipo: 'varanda',
      rotulo: TIPO_ZONA_LABELS.varanda,
      areaM2: arred(noContorno(varandas, excluidas)),
      efeito: 'pinta',
      nota: 'frente incluída na fachada; faces interiores por medir (profundidade por decidir, decisão 8.2)',
    });
  }

  return {
    temContorno: true,
    frenteM: arred(Math.max(...xs) - Math.min(...xs)),
    alturaM: arred(Math.max(...ys) - Math.min(...ys)),
    contornoM2: arred(contornoM2),
    linhas,
    vaosDescontados: vaosGrandes.length,
    vaosPequenos: vaos.length - vaosGrandes.length,
    pintavelM2: arred(pintavelM2),
    avisos,
    coberturasSalientes: { existem: marquises.length > 0, areaM2: saliencia ? arred(coberturaM2) : null },
  };
}

/** Distância habitual entre pisos em habitação (pé-direito livre de ~2,5–2,9 m mais a laje). */
export const ENTRE_PISOS_HABITUAL_M = { min: 2.7, max: 3.2 } as const;

export interface LeituraDeAlturas {
  /** Mediana da distância vertical entre elementos que se repetem de piso para piso, na mesma coluna. */
  entrePisosM: number;
  /** Quantas distâncias entraram na mediana. */
  medicoes: number;
  /** Elementos na coluna mais comprida — os pisos com janelas, marquises ou varandas. */
  pisos: number;
  /** Do chão (base do contorno) ao topo do R/C desenhado; sem R/C, nulo. */
  rcM: number | null;
}

/**
 * Uma leitura das alturas que não depende da referência só por si: a distância entre janelas de
 * pisos seguidos é a altura entre pisos, e essa tem um valor habitual. Se a referência tiver sido mal
 * medida ou mal tocada, aparece aqui fora do habitual. Nasceu de uma dúvida do promotor (04/11/2026):
 * "se o R/C tem 3,77 m e o prédio R/C + 5 andares, não pode ter 20 m" — tinha: R/C de 4 m, 5 pisos de
 * ~3 m (com a laje) e ~1 m de platibanda.
 */
export function leituraDeAlturas(zonas: Zona[]): LeituraDeAlturas | null {
  const contornoZ = zonas.filter((z) => z.tipo === 'fachada');
  const rcZ = zonas.filter((z) => z.tipo === 'rc');
  const chaoZ = contornoZ.length > 0 ? Math.min(...contornoZ.map((z) => z.y)) : 0;
  const topoRC = rcZ.length > 0 ? Math.max(...rcZ.map((z) => z.y + z.altura)) : null;
  // Fica de fora o que não se repete de piso para piso: o que está no R/C (montras, a porta — que a
  // regra das montras manda desenhar como vãos) e o que nasce no chão.
  const repetidas = zonas
    .filter((z) => z.tipo === 'vao' || z.tipo === 'marquise' || z.tipo === 'varanda')
    .filter((z) => z.y > chaoZ + 0.5 && (topoRC === null || z.y >= topoRC - 0.1))
    .sort((a, b) => a.y - b.y);
  const colunas: Zona[][] = [];
  for (const z of repetidas) {
    // Compara com o último da coluna (e larguras parecidas): uma zona larga não junta duas colunas.
    const coluna = colunas.find((c) => {
      const r = c[c.length - 1]!;
      const sobreposicao = Math.min(r.x + r.largura, z.x + z.largura) - Math.max(r.x, z.x);
      const razao = Math.max(r.largura, z.largura) / Math.max(1e-9, Math.min(r.largura, z.largura));
      return r.tipo === z.tipo && sobreposicao >= 0.5 * Math.min(r.largura, z.largura) && razao <= 1.6;
    });
    if (coluna) coluna.push(z);
    else colunas.push([z]);
  }
  const passos: number[] = [];
  for (const c of colunas) {
    for (let i = 1; i < c.length; i++) {
      const d = c[i]!.y - c[i - 1]!.y;
      if (d >= 2.2 && d <= 4.5) passos.push(d);
    }
  }
  if (passos.length === 0) return null;
  passos.sort((a, b) => a - b);
  const meio = Math.floor(passos.length / 2);
  const mediana = passos.length % 2 ? passos[meio]! : (passos[meio - 1]! + passos[meio]!) / 2;
  return {
    entrePisosM: arred(mediana),
    medicoes: passos.length,
    pisos: Math.max(...colunas.map((c) => c.length)),
    rcM: topoRC !== null ? arred(topoRC - chaoZ) : null,
  };
}

/**
 * A frente de uma marquise (ou de uma coluna de varandas) está mais perto da câmara do que a parede: na
 * vista endireitada (que põe tudo no plano da parede) aparece maior e deslocada — à volta de 10 % numa fotografia tirada a 10 m
 * com 1,2 m de saliência. Desenha-se a frente tal como se vê (é o que está à vista), e aqui corrige-se:
 * as marquises e os vãos que estão nelas (os vidros) levam-se ao seu tamanho verdadeiro, com a posição
 * da câmara tirada da própria fotografia (`camaraDaHomografia`). Sem câmara ou sem saliência, fica tudo
 * como foi desenhado.
 */
export function corrigirSaliencias(
  zonas: Zona[],
  centro: { x: number; y: number; z: number } | null,
  saliencias: { marquise?: number | null; varanda?: number | null },
): Zona[] {
  if (!centro) return zonas;
  const valida = (s: number | null | undefined) => (s && s > 0 && s < centro.z ? s : null);
  const sm = valida(saliencias.marquise);
  const sv = valida(saliencias.varanda);
  if (!sm && !sv) return zonas;
  const marquises = zonas.filter((z) => z.tipo === 'marquise');
  const naMarquise = (z: Zona) => {
    const meio = { x: z.x + z.largura / 2, y: z.y + z.altura / 2 };
    return marquises.some((m) => zonaContem(m, meio));
  };
  const corrigir = (z: Zona, s: number) => {
    const a = corrigirParalaxe({ x: z.x, y: z.y }, centro, s);
    const b = corrigirParalaxe({ x: z.x + z.largura, y: z.y + z.altura }, centro, s);
    return { ...z, x: a.x, y: a.y, largura: b.x - a.x, altura: b.y - a.y };
  };
  return zonas.map((z) => {
    if (sm && (z.tipo === 'marquise' || (z.tipo === 'vao' && naMarquise(z)))) return corrigir(z, sm);
    // A frente de uma coluna de varandas (guardas e topos das lajes) também está à frente da parede.
    // Os vãos das varandas não: as portas de varanda estão na parede, lá atrás.
    if (sv && z.tipo === 'varanda') return corrigir(z, sv);
    return z;
  });
}
