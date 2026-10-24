// Volume 3D genérico do prédio, para o anúncio. É gerado só a partir dos dados
// declarados (tipo, pisos, fachadas, varandas) e com proporções fixas: dois
// prédios com os mesmos dados dão exatamente o mesmo desenho, por isso o
// volume não permite reconhecer o prédio. Nunca usa fotografias.

export interface VolumeInput {
  pisos: number | null;
  fachadas: number | null;
  temVarandas: boolean;
  moradia: boolean;
  /**
   * Pormenores a desenhar, tal como foram **caracterizados** na obra (pedido do promotor, 24/10/2026:
   * "sejam adicionados os pormenores ao desenho tal como caracterizados — grades nas varandas, palas
   * sobre janelas, etc").
   *
   * Vêm das superfícies que o cliente ou o avaliador declararam (`request_surfaces.kind`), não de
   * fotografia nenhuma — e por isso o volume continua a não identificar o prédio: **dois prédios com as
   * mesmas declarações continuam a dar exatamente o mesmo desenho**. É essa indistinguibilidade que o
   * torna anónimo, e nada aqui a quebra.
   */
  elementos?: {
    /** Superfície `elementos_metalicos` declarada: grades, portões, guardas. */
    metalicos?: boolean;
    /** Superfície `muro` declarada. */
    muro?: boolean;
    /** Superfície `beirais_cobertura` declarada. */
    beirais?: boolean;
    /** Palas sobre as janelas. Ainda **nenhum campo da aplicação a declara** — fica pronto para o dia em
     * que se decidir onde se caracteriza (ver docs/FOTOGRAFIAS.md). */
    palas?: boolean;
  };
}

export type FaceKind = 'frente' | 'lado' | 'topo' | 'varanda' | 'vizinho' | 'janela' | 'grade' | 'muro' | 'beiral' | 'pala';
export interface Face {
  kind: FaceKind;
  /** Pontos já projetados (isométrico), em unidades do desenho. */
  points: [number, number][];
}
export interface Volume {
  faces: Face[];
  viewBox: [number, number, number, number];
  /** Pisos desenhados (o real pode ser maior; o desenho limita-se a 20). */
  pisosDesenhados: number;
  /** Quantas fachadas livres o desenho mostra (0 a 4). */
  fachadasLivres: number;
}

const WIDTH = 12;
const DEPTH = 9;
const FLOOR = 3;
const MAX_DRAWN_FLOORS = 20;
const COS30 = Math.cos(Math.PI / 6);
/** Vãos da fachada principal, em ritmo fixo: iguais em todos os prédios, por isso não identificam nenhum. */
const WINDOW_BAYS: [number, number][] = [
  [WIDTH * 0.1, WIDTH * 0.32],
  [WIDTH * 0.68, WIDTH * 0.9],
];

const iso = (x: number, y: number, z: number): [number, number] => [
  round((x - y) * COS30),
  round((x + y) * 0.5 - z),
];
const round = (n: number) => Math.round(n * 100) / 100;

/** Caixa entre (x0,y0,z0) e (x1,y1,z1): só as três faces visíveis (frente, lado direito, topo). */
function box(x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, kind?: FaceKind): Face[] {
  return [
    // frente (y = y1)
    { kind: kind ?? 'frente', points: [iso(x0, y1, z0), iso(x1, y1, z0), iso(x1, y1, z1), iso(x0, y1, z1)] },
    // lado (x = x1)
    { kind: kind ?? 'lado', points: [iso(x1, y0, z0), iso(x1, y1, z0), iso(x1, y1, z1), iso(x1, y0, z1)] },
    // topo (z = z1)
    { kind: kind ?? 'topo', points: [iso(x0, y0, z1), iso(x1, y0, z1), iso(x1, y1, z1), iso(x0, y1, z1)] },
  ];
}

export function buildingVolume(input: VolumeInput): Volume {
  const declared = input.pisos ?? (input.moradia ? 2 : 4);
  // "pisos" conta os pisos acima do solo; um rés-do-chão sozinho é 1.
  const pisos = Math.min(MAX_DRAWN_FLOORS, Math.max(1, declared));
  const livres = Math.min(4, Math.max(1, input.fachadas ?? 4));
  const height = pisos * FLOOR;
  const faces: Face[] = [];

  // Prédios encostados: com 3 fachadas livres há um vizinho; com 1 ou 2, dois
  // (prédio em banda). O vizinho da esquerda fica atrás e desenha-se primeiro;
  // o da direita tapa a fachada lateral, por isso desenha-se no fim.
  const leftNeighbour = livres <= 3;
  const rightNeighbour = livres <= 2;
  if (leftNeighbour) faces.push(...box(-6, 0, 0, 0, DEPTH, height * 0.8, 'vizinho'));

  faces.push(...box(0, 0, 0, WIDTH, DEPTH, height));

  const el = input.elementos ?? {};

  // Janelas: duas por piso acima do rés-do-chão, em ritmo fixo. Não identificam nada (são iguais em
  // todos os prédios com o mesmo número de pisos) e dão escala ao desenho — sem elas, o volume é um
  // paralelepípedo e o pintor não percebe de que altura se está a falar.
  for (let p = 1; p < pisos; p++) {
    const z = p * FLOOR + 0.9;
    for (const [x0, x1] of WINDOW_BAYS) {
      faces.push({
        kind: 'janela',
        points: [iso(x0, DEPTH, z), iso(x1, DEPTH, z), iso(x1, DEPTH, z + 1.3), iso(x0, DEPTH, z + 1.3)],
      });
      // Pala: uma aba estreita por cima do vão, saliente da fachada.
      if (el.palas) faces.push(...box(x0 - 0.3, DEPTH, z + 1.3, x1 + 0.3, DEPTH + 0.6, z + 1.5, 'pala'));
    }
  }

  if (input.temVarandas) {
    // Uma laje saliente por piso acima do rés-do-chão, a meio da fachada principal.
    for (let p = 1; p < pisos; p++) {
      faces.push(...box(WIDTH * 0.2, DEPTH, p * FLOOR, WIDTH * 0.8, DEPTH + 1.2, p * FLOOR + 0.25, 'varanda'));
      // Grades na varanda: a guarda, desenhada como um plano vertical sobre o bordo da laje. Desenha-se
      // sempre que há varandas — uma varanda sem guarda não existe — e é o pormenor que o promotor
      // nomeou primeiro. Muda o que o pintor tem de orçamentar: uma guarda é trabalho à parte da
      // fachada, e com `elementos_metalicos` declarado sabe-se que é metálica e leva tratamento próprio.
      const zGuarda = p * FLOOR + 0.25;
      faces.push({
        kind: 'grade',
        points: [
          iso(WIDTH * 0.2, DEPTH + 1.2, zGuarda),
          iso(WIDTH * 0.8, DEPTH + 1.2, zGuarda),
          iso(WIDTH * 0.8, DEPTH + 1.2, zGuarda + 1),
          iso(WIDTH * 0.2, DEPTH + 1.2, zGuarda + 1),
        ],
      });
    }
  }

  // Beirais: a pala de remate em todo o topo da fachada.
  if (el.beirais) faces.push(...box(-0.6, DEPTH - 0.6, height, WIDTH + 0.6, DEPTH + 0.8, height + 0.4, 'beiral'));

  if (rightNeighbour) faces.push(...box(WIDTH, 0, 0, WIDTH + 6, DEPTH, height * 0.7, 'vizinho'));

  // Muro à frente do prédio, à altura de um muro de vedação.
  if (el.muro) faces.push(...box(-1, DEPTH + 3, 0, WIDTH + 1, DEPTH + 3.8, 1.6, 'muro'));

  const xs = faces.flatMap((f) => f.points.map((p) => p[0]));
  const ys = faces.flatMap((f) => f.points.map((p) => p[1]));
  const pad = 1;
  const minX = Math.min(...xs) - pad;
  const minY = Math.min(...ys) - pad;
  return {
    faces,
    viewBox: [round(minX), round(minY), round(Math.max(...xs) + pad - minX), round(Math.max(...ys) + pad - minY)],
    pisosDesenhados: pisos,
    fachadasLivres: livres,
  };
}
