import type { Ponto } from './homografia';

/**
 * Áreas de uma fachada desenhada sobre a fotografia endireitada (`homografia.ts`): cada zona é um
 * retângulo em metros reais, no plano da fachada — por isso as áreas são exatas, sem perspetiva.
 *
 * Regras (handoff de 03/11/2026, secção 3, e decisões pendentes da secção 8):
 * - **Contorno**: um ou mais retângulos (prédios com recuos ou cotas diferentes); conta a união,
 *   nunca a soma — dois contornos sobrepostos não contam duas vezes.
 * - **Vãos** (janelas, portas, montras): com mais de 1 m² descontam-se; com 1 m² ou menos, não
 *   (secção 3.3).
 * - **Marquises**: fechadas, não pintadas — descontam-se (secção 3.4).
 * - **Varandas abertas**: a frente faz parte da fachada pintada (não desconta). As faces interiores
 *   (laje de baixo, paredes laterais) precisam da profundidade, que ainda não tem valor decidido
 *   (decisão 8.2): ficam **por medir**, nunca estimadas.
 * - **R/C comercial**: fica fora por omissão (decisão 8.3, proposta ainda por confirmar), e pode
 *   incluir-se.
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
   * a parede que fica por cima de um telhado inclinado, um empena (promotor, 04/11/2026: "tendo que
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
  const { x0, y0, x1, y1 } = { x0: z.x, y0: z.y, x1: z.x + z.largura, y1: z.y + z.altura };
  const dentroX = p.x >= x0 - tolerancia && p.x <= x1 + tolerancia;
  const dentroY = p.y >= y0 - tolerancia && p.y <= y1 + tolerancia;
  const achadas: Aresta[] = [];
  if (dentroY && Math.abs(p.x - x0) <= tolerancia) achadas.push('esquerda');
  else if (dentroY && Math.abs(p.x - x1) <= tolerancia) achadas.push('direita');
  if (dentroX && Math.abs(p.y - y0) <= tolerancia) achadas.push('baixo');
  else if (dentroX && Math.abs(p.y - y1) <= tolerancia) achadas.push('cima');
  return achadas;
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
  efeito: 'base' | 'pinta' | 'desconta' | 'fora';
  nota?: string;
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
  /** Área a pintar desta fachada: contorno menos vãos > 1 m², marquises e (por omissão) R/C. */
  pintavelM2: number;
  avisos: string[];
}

const arred = (n: number) => Math.round(n * 100) / 100;

export function areasDaFachada(zonas: Zona[], opcoes: { incluirRC: boolean } = { incluirRC: false }): ResultadoFachada {
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
  // somam exatamente (contorno − R/C − marquises − vãos = pintável), sem nada descontado duas vezes.
  const rcFora = opcoes.incluirRC ? [] : rc;
  const rcForaM2 = noContorno(rcFora);
  const marquisesM2 = noContorno(marquises, rcFora);
  const vaosM2 = noContorno(vaosGrandes, [...rcFora, ...marquises]);
  const excluidas = [...rcFora, ...marquises, ...vaosGrandes];
  const contornoM2 = areaOnde(todos, (x, y) => contem(contorno, x, y));
  const pintavelM2 = contornoM2 - rcForaM2 - marquisesM2 - vaosM2;

  for (const z of zonas) {
    if (z.tipo === 'fachada') continue;
    const f = forma(z);
    const fora = areaDaZona(z) - areaOnde([...contorno, f], (x, y) => contem([f], x, y) && contem(contorno, x, y));
    if (fora > 0.05 * areaDaZona(z) && fora > 0.01) {
      avisos.push(`Parte de uma zona de ${TIPO_ZONA_LABELS[z.tipo].toLowerCase()} está fora do contorno e não conta (${arred(fora)} m²).`);
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
      efeito: opcoes.incluirRC ? 'pinta' : 'fora',
      nota: opcoes.incluirRC ? undefined : 'fora por omissão (decisão 8.3, por confirmar)',
    });
  }
  if (marquises.length > 0) {
    linhas.push({
      tipo: 'marquise',
      rotulo: TIPO_ZONA_LABELS.marquise,
      areaM2: arred(marquisesM2),
      efeito: 'desconta',
      nota: 'fechadas, não pintadas',
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
  const repetidas = zonas.filter((z) => z.tipo === 'vao' || z.tipo === 'marquise' || z.tipo === 'varanda').sort((a, b) => a.y - b.y);
  const colunas: Zona[][] = [];
  for (const z of repetidas) {
    const coluna = colunas.find((c) => {
      const r = c[0]!;
      const sobreposicao = Math.min(r.x + r.largura, z.x + z.largura) - Math.max(r.x, z.x);
      return r.tipo === z.tipo && sobreposicao >= 0.5 * Math.min(r.largura, z.largura);
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
  const contorno = zonas.filter((z) => z.tipo === 'fachada');
  const rc = zonas.filter((z) => z.tipo === 'rc');
  const chao = contorno.length > 0 ? Math.min(...contorno.map((z) => z.y)) : 0;
  return {
    entrePisosM: arred(mediana),
    medicoes: passos.length,
    pisos: Math.max(...colunas.map((c) => c.length)),
    rcM: rc.length > 0 ? arred(Math.max(...rc.map((z) => z.y + z.altura)) - chao) : null,
  };
}
