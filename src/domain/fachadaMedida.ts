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
 * Tudo por diferença e união de retângulos (compressão de coordenadas), por isso um vão desenhado
 * dentro de um R/C já excluído não se desconta duas vezes.
 */

export type TipoZona = 'fachada' | 'varanda' | 'marquise' | 'rc' | 'vao';

export const TIPO_ZONA_LABELS: Record<TipoZona, string> = {
  fachada: 'Contorno da fachada',
  varanda: 'Varandas abertas',
  marquise: 'Marquises',
  rc: 'R/C comercial',
  vao: 'Vãos (janelas, portas, montras)',
};

export interface Zona {
  id: string;
  tipo: TipoZona;
  /** Canto inferior esquerdo, em metros no plano da fachada (Y para cima). */
  x: number;
  y: number;
  largura: number;
  altura: number;
}

/** Área (m²) a partir da qual um vão se desconta (handoff, secção 3.3: «superior a 1 m²»). */
export const AREA_MINIMA_VAO_M2 = 1;

/** Uma zona a partir de dois cantos opostos arrastados, por qualquer ordem. */
export function zonaDeDoisCantos(id: string, tipo: TipoZona, a: Ponto, b: Ponto): Zona {
  return { id, tipo, x: Math.min(a.x, b.x), y: Math.min(a.y, b.y), largura: Math.abs(b.x - a.x), altura: Math.abs(b.y - a.y) };
}

export const areaDaZona = (z: Zona) => z.largura * z.altura;

interface Ret {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}
const ret = (z: Zona): Ret => ({ x0: z.x, y0: z.y, x1: z.x + z.largura, y1: z.y + z.altura });

/**
 * Área exata das células da grelha (compressão de coordenadas de todos os retângulos dados) que
 * satisfazem o predicado. O predicado recebe o centro de cada célula.
 */
function areaOnde(todos: Ret[], dentro: (cx: number, cy: number) => boolean): number {
  if (todos.length === 0) return 0;
  const xs = [...new Set(todos.flatMap((r) => [r.x0, r.x1]))].sort((a, b) => a - b);
  const ys = [...new Set(todos.flatMap((r) => [r.y0, r.y1]))].sort((a, b) => a - b);
  let area = 0;
  for (let i = 0; i < xs.length - 1; i++) {
    const cx = (xs[i]! + xs[i + 1]!) / 2;
    const w = xs[i + 1]! - xs[i]!;
    for (let j = 0; j < ys.length - 1; j++) {
      const cy = (ys[j]! + ys[j + 1]!) / 2;
      if (dentro(cx, cy)) area += w * (ys[j + 1]! - ys[j]!);
    }
  }
  return area;
}

const contem = (rs: Ret[], x: number, y: number) => rs.some((r) => x > r.x0 && x < r.x1 && y > r.y0 && y < r.y1);

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
  const contorno = zonas.filter((z) => z.tipo === 'fachada').map(ret);
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

  const todos = zonas.map(ret);
  const porTipo = (t: TipoZona) => zonas.filter((z) => z.tipo === t).map(ret);
  /** Área dentro do contorno, que esteja em `rs` e em nenhum de `ja` (já descontado antes). */
  const noContorno = (rs: Ret[], ja: Ret[] = []) =>
    areaOnde(todos, (x, y) => contem(contorno, x, y) && contem(rs, x, y) && !contem(ja, x, y));

  const vaos = zonas.filter((z) => z.tipo === 'vao');
  const vaosGrandes = vaos.filter((z) => areaDaZona(z) > AREA_MINIMA_VAO_M2).map(ret);
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
    const r = ret(z);
    const fora = areaDaZona(z) - areaOnde([...contorno, r], (x, y) => contem([r], x, y) && contem(contorno, x, y));
    if (fora > 0.05 * areaDaZona(z) && fora > 0.01) {
      avisos.push(`Parte de uma zona de ${TIPO_ZONA_LABELS[z.tipo].toLowerCase()} está fora do contorno e não conta (${arred(fora)} m²).`);
    }
  }

  const xs = contorno.flatMap((r) => [r.x0, r.x1]);
  const ys = contorno.flatMap((r) => [r.y0, r.y1]);

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
