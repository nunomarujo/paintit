import { gerarQuads, type Quad, type VolumeInput } from './volume';

/**
 * Área real (m²) por categoria, a partir do volume declarado — não de fotografia nenhuma.
 *
 * `gerarQuads` (`volume.ts`) já constrói o prédio em metros reais, antes de rodar e projetar; este
 * ficheiro só soma área sobre essa mesma geometria, por categoria, sem a desenhar. A mesma
 * declaração dá sempre o mesmo desenho (regra 6 do CLAUDE.md) e agora também sempre a mesma área —
 * as duas vêm da mesma função, nunca duas contas separadas que possam divergir.
 *
 * **Vãos (handoff de 03/11/2026, secção 3.3):** um vão com mais de 1 m² desconta-se à área bruta das
 * fachadas; um vão de 1 m² ou menos não desconta. A área líquida é exata: soma das fachadas brutas
 * menos a soma dos vãos que descontam.
 *
 * **Marquises (handoff, secção 3.4):** mostram-se com a sua área, mas nunca entram no total a
 * pintar — são fechadas, não pintadas por dentro.
 */

/** Área de um quadrilátero plano em 3D, pelo módulo do produto vetorial de duas arestas. */
function areaDoQuad(pts: readonly [number, number, number][]): number {
  if (pts.length < 4) return 0;
  const [p0, p1, , p3] = pts;
  const e1 = [p1![0] - p0![0], p1![1] - p0![1], p1![2] - p0![2]] as const;
  const e2 = [p3![0] - p0![0], p3![1] - p0![1], p3![2] - p0![2]] as const;
  const cx = e1[1] * e2[2] - e1[2] * e2[1];
  const cy = e1[2] * e2[0] - e1[0] * e2[2];
  const cz = e1[0] * e2[1] - e1[1] * e2[0];
  return Math.sqrt(cx * cx + cy * cy + cz * cz);
}

/** Vão a partir do qual se desconta à área bruta da fachada (handoff, secção 3.3). */
export const AREA_MINIMA_DO_VAO_QUE_DESCONTA_M2 = 1;

export interface AreaPorCategoria {
  categoria: 'fachadas' | 'empenas' | 'varandas' | 'marquises';
  rotulo: string;
  /** Área líquida (fachadas: já descontados os vãos > 1 m²). Em m², com duas casas. */
  areaM2: number;
  /** false para marquises: mostram-se, mas não entram no total a pintar (secção 3.4 do handoff). */
  pintavel: boolean;
}

export interface ResultadoAreasDoVolume {
  categorias: AreaPorCategoria[];
  /** Soma das categorias pintáveis — nunca inclui marquises. */
  totalPintavelM2: number;
  /** Área bruta das fachadas, antes de descontar vãos. */
  fachadasBrutoM2: number;
  /** Quantos vãos (janelas + portas) ultrapassam 1 m² e por isso descontaram. */
  vaosDescontadosCount: number;
  /** Soma da área desses vãos — é o que se subtraiu ao bruto das fachadas. */
  vaosDescontadosM2: number;
}

const arred = (n: number) => Math.round(n * 100) / 100;

function somaArea(quads: readonly Quad[], kinds: readonly string[]): number {
  return quads.filter((q) => kinds.includes(q.kind)).reduce((total, q) => total + areaDoQuad(q.pts), 0);
}

/**
 * Área real por categoria (fachadas, empenas, varandas, marquises), calculada sobre a mesma
 * geometria 3D que desenha o volume — nunca a partir de pixels de uma fotografia.
 */
export function areasDoVolume(input: VolumeInput): ResultadoAreasDoVolume {
  const { quads } = gerarQuads(input);

  const fachadasBruto = somaArea(quads, ['frente', 'lado']);
  const vaos = quads.filter((q) => q.kind === 'janela' || q.kind === 'porta');
  const vaosQueDescontam = vaos.map((q) => areaDoQuad(q.pts)).filter((a) => a > AREA_MINIMA_DO_VAO_QUE_DESCONTA_M2);
  const vaosDescontadosM2 = vaosQueDescontam.reduce((a, b) => a + b, 0);
  const fachadasLiquido = Math.max(0, fachadasBruto - vaosDescontadosM2);

  const empenas = somaArea(quads, ['empena']);
  const varandas = somaArea(quads, ['varanda']);
  const marquises = somaArea(quads, ['marquise']);

  const categorias: AreaPorCategoria[] = [
    { categoria: 'fachadas', rotulo: 'Fachadas', areaM2: arred(fachadasLiquido), pintavel: true },
    { categoria: 'empenas', rotulo: 'Empenas', areaM2: arred(empenas), pintavel: true },
    { categoria: 'varandas', rotulo: 'Varandas', areaM2: arred(varandas), pintavel: true },
    { categoria: 'marquises', rotulo: 'Marquises (fechadas, não pintadas)', areaM2: arred(marquises), pintavel: false },
  ];

  return {
    categorias,
    totalPintavelM2: arred(categorias.filter((c) => c.pintavel).reduce((a, c) => a + c.areaM2, 0)),
    fachadasBrutoM2: arred(fachadasBruto),
    vaosDescontadosCount: vaosQueDescontam.length,
    vaosDescontadosM2: arred(vaosDescontadosM2),
  };
}
