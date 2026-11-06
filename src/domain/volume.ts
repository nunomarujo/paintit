// Volume 3D genérico do prédio, para o anúncio. É gerado só a partir dos dados
// declarados (forma em planta, pisos, fachadas, varandas, pormenores) e com proporções
// fixas: dois prédios com as mesmas declarações dão exatamente o mesmo desenho, por isso o
// volume não permite reconhecer o prédio. Nunca usa fotografias.
//
// O ângulo de observação é um parâmetro puro: o mesmo prédio visto de 40° dá sempre o mesmo
// desenho. É isso que permite rodar o volume no cliente (PIN-06, MOD-06, ECR-C04) sem quebrar
// o anonimato nem precisar de biblioteca 3D.

export type Forma = 'quadrado' | 'I' | 'L' | 'U' | 'T';

/** Formas canónicas de implantação, para o avaliador escolher a mais próxima (pedido do promotor, 24/10/2026). */
export const FORMA_LABELS: Record<Forma, string> = {
  quadrado: 'Quadrado ou quase',
  I: 'Em banda (barra)',
  L: 'Em L',
  U: 'Em U',
  T: 'Em T',
};
export const FORMAS = Object.keys(FORMA_LABELS) as Forma[];
export const isForma = (v: unknown): v is Forma => typeof v === 'string' && (FORMAS as string[]).includes(v);

export interface VolumeInput {
  pisos: number | null;
  fachadas: number | null;
  temVarandas: boolean;
  /**
   * Marquises (varandas fechadas, não pintadas por dentro — handoff de 03/11/2026, secção 3.4):
   * desenham-se em vez das varandas abertas, nunca ao mesmo tempo (um prédio não tem as duas ao
   * mesmo nível por omissão; para isso, declararia zonas próprias, fora deste modelo genérico).
   */
  temMarquises?: boolean;
  moradia: boolean;
  /** Forma em planta escolhida de entre as canónicas. Omitida: barra, como antes. */
  forma?: Forma | null;
  /** Ângulo de observação em graus, a rodar sobre o eixo vertical. 0 = fachada principal de frente. */
  angulo?: number;
  /**
   * Pormenores a desenhar, tal como foram **caracterizados** na obra (pedido do promotor, 24/10/2026:
   * "sejam adicionados os pormenores ao desenho tal como caracterizados — grades nas varandas, palas
   * sobre janelas, etc").
   *
   * Vêm das superfícies que o cliente ou o avaliador declararam (`request_surfaces.kind`), não de
   * fotografia nenhuma — e por isso o volume continua a não identificar o prédio: **dois prédios com as
   * mesmas declarações continuam a dar exatamente o mesmo desenho**.
   */
  /**
   * Janelas **por piso** em cada fachada, tal como declaradas na descrição da obra.
   *
   * Desenham-se em ritmo regular, igualmente espaçadas: o número é fiel, a arrumação não. É o
   * número que o pintor precisa (área de vãos a descontar, trabalho de protecção), e é a
   * arrumação que identificaria o prédio — dois prédios com quatro janelas por piso continuam a
   * dar exactamente o mesmo desenho, que é o que a regra 6 do CLAUDE.md exige.
   *
   * Omitido: {@link JANELAS_POR_OMISSAO} em cada fachada à vista.
   */
  janelas?: Partial<Record<Fachada, number | null>>;
  /**
   * Medidas reais do prédio, em metros. Com elas o volume deixa de ter proporções canónicas e passa
   * a ter as do prédio — a unidade do desenho sempre foi o metro (um piso são 3, uma janela 1,30 de
   * altura), por isso é só substituir a implantação.
   *
   * **Sem profundidade declarada, a profundidade não se inventa:** mantém-se a proporção canónica e
   * quem desenha diz que aquele eixo está por medir (`porqueNaoTemEscala`, em `geometria.ts`).
   *
   * Isto é para os ecrãs do cliente e do levantamento, onde o prédio é de quem está a olhar. O
   * anúncio continua a mostrar o volume genérico, sem medidas — a regra 6 não muda aqui.
   */
  escala?: { larguraM: number; profundidadeM: number | null; peDireitoM: number } | null;
  /**
   * O desenho por alçados (passo 2 do pedido, 06/11/2026). Com ele, o prédio deixa de ser um volume
   * genérico com janelas em todo o lado: só os lados da planta que alguém entregou levam parede, vãos e
   * cor; os outros ficam só com o traço (`por_entregar`). Sem ele, o desenho é o de sempre (o anúncio).
   */
  alcados?: { face: string; tipo: 'fachada' | 'empena' }[];
  /**
   * Antes de haver dois alçados a planta ainda não existe: o prédio é uma laje fina — um painel com
   * pouca profundidade — e só a frente conta. Só no desenho por alçados.
   */
  laje?: boolean;
  /** O lado da planta onde assentam as varandas e as marquises. Omitido: a frente. */
  varandasEm?: string | null;
  elementos?: {
    /** Superfície `elementos_metalicos` declarada: grades, portões, guardas. */
    metalicos?: boolean;
    /** Superfície `muro` declarada. */
    muro?: boolean;
    /** Superfície `beirais_cobertura` declarada. */
    beirais?: boolean;
    /** Palas sobre as janelas. */
    palas?: boolean;
  };
}

/**
 * As quatro fachadas, pelos nomes que o cliente e o avaliador usam (pedido do promotor,
 * 28/10/2026). "Frente" é a que dá para a via principal; as laterais são vistas de quem está de
 * frente para ela.
 */
export const FACHADAS = ['frente', 'esquerda', 'direita', 'tras'] as const;
export type Fachada = (typeof FACHADAS)[number];
export const FACHADA_LABELS: Record<Fachada, string> = {
  frente: 'Fachada principal',
  esquerda: 'Lateral esquerda',
  direita: 'Lateral direita',
  tras: 'Tardoz (traseiras)',
};

/** Janelas por piso em cada fachada. Mais do que isto não se distingue no desenho. */
export const MAX_JANELAS_POR_PISO = 8;

/** Quantas janelas se desenham por omissão, quando ninguém declarou nada. */
export const JANELAS_POR_OMISSAO = 2;

export type FaceKind =
  | 'frente'
  | 'lado'
  | 'empena'
  | 'topo'
  | 'varanda'
  | 'marquise'
  | 'vizinho'
  | 'janela'
  | 'porta'
  | 'grade'
  | 'muro'
  | 'beiral'
  | 'pala'
  /** Um alçado do contorno da planta que ainda ninguém entregou: só o traço, sem enchimento. */
  | 'por_entregar';
export interface Face {
  kind: FaceKind;
  /** O lado da planta a que a face pertence (`LadoDaPlanta.id`), quando o desenho é por alçados. */
  face?: string;
  /**
   * Quão de frente a face está para a câmara, de 0 (de perfil) a 1 (de frente): o cosseno do ângulo, no
   * plano horizontal, entre a normal da parede e a direção da câmara. Só nas paredes; as horizontais
   * (coberturas) veem-se sempre de cima e não levam o campo.
   */
  vista?: number;
  /** Pontos já rodados e projetados (axonometria), em unidades do desenho. */
  points: [number, number][];
  /**
   * Só nos prédios vizinhos: direção em que o volume se desvanece, já projetada. Começa na empena
   * (onde encosta ao prédio da obra) e acaba no extremo oposto. Serve para o vizinho se representar
   * sem esconder a empena, que é a face que o pintor precisa de ver (pedido do promotor, 24/10/2026).
   */
  fade?: { de: [number, number]; ate: [number, number] };
}
export interface Volume {
  faces: Face[];
  viewBox: [number, number, number, number];
  /** Pisos desenhados (o real pode ser maior; o desenho limita-se a 20). */
  pisosDesenhados: number;
  /** Quantas fachadas livres o desenho mostra (0 a 4). */
  fachadasLivres: number;
  /** Ângulo efetivamente desenhado, já normalizado a [0,360). */
  angulo: number;
  /**
   * As três arestas onde se põem as cotas, já projetadas: a frente em baixo, o fundo do lado
   * direito e a altura na aresta vertical entre as duas. Quem desenha decide se as mostra — e só as
   * deve mostrar para os eixos que alguém mediu.
   */
  cotas: { largura: [[number, number], [number, number]]; profundidade: [[number, number], [number, number]]; altura: [[number, number], [number, number]] };
  /** Altura desenhada, em metros do desenho. */
  alturaDesenhada: number;
  /**
   * Tudo o que o prédio tem, vejam-se ou não nesta vista: o tipo de cada peça e, nas que pertencem a
   * um lado da planta, qual. Não depende do ângulo — é daqui que se sabe se uma zona tem sítio no
   * desenho, para os números não mudarem ao rodar.
   */
  pecas: { kind: FaceKind; face?: string }[];
  /** Os lados da planta (o contorno), pela ordem de `ladosDaPlanta`. Só nos desenhos por alçados. */
  lados: LadoDaPlanta[];
  /** O desenho é a laje (ainda sem planta). */
  laje: boolean;
  /**
   * Onde a prancheta põe as cotas nesta vista, já projetadas: a largura na aresta do telhado mais afastada
   * da câmara, o fundo na aresta do telhado mais à esquerda no ecrã, a altura na esquina mais à direita.
   * Seguem o ângulo; a 25° são as de sempre (por cima, à esquerda e à direita do prédio).
   * `foraDoFundo` é a normal à aresta do fundo, no ecrã, virada para longe do centro do prédio.
   *
   * `candidatas` são, por eixo, as arestas onde a cota pode assentar, da preferida para a última (a primeira
   * é a de `largura`, `fundo` e `altura`): quando a preferida não tem sítio livre, quem desenha tenta as outras
   * e, se nenhuma serve, não desenha a cota (06/11/2026: a cota que atravessa o prédio é pior do que nenhuma).
   * `fora` é a normal à aresta, unitária, virada para longe do centro do prédio no ecrã.
   */
  cotasDaPrancheta: {
    largura: [[number, number], [number, number]];
    fundo: [[number, number], [number, number]];
    altura: [[number, number], [number, number]];
    foraDoFundo: [number, number];
    candidatas: Record<'largura' | 'fundo' | 'altura', ArestaDaCota[]>;
  };
}

/** Uma aresta do prédio, já projetada, onde se pode pôr uma cota. */
export interface ArestaDaCota {
  a: [number, number];
  b: [number, number];
  /** A normal à aresta, unitária, virada para longe do centro do prédio no ecrã. */
  fora: [number, number];
}

const FLOOR = 3;
const MAX_DRAWN_FLOORS = 20;
/** Elevação da câmara: fixa, como um prato giratório. O ângulo só muda o azimute. */
const ELEV = Math.PI / 6;
const SIN_E = Math.sin(ELEV);
const COS_E = Math.cos(ELEV);

/** Retângulos em planta por forma. O primeiro é o corpo da fachada principal (frente em y máximo). */
const FOOTPRINTS: Record<Forma, [number, number, number, number][]> = {
  quadrado: [[0, 0, 10, 10]],
  I: [[0, 6, 14, 13]],
  L: [
    [0, 6, 14, 13],
    [0, 0, 6, 6],
  ],
  U: [
    [0, 6, 14, 13],
    [0, 0, 5, 6],
    [9, 0, 14, 6],
  ],
  T: [
    [0, 6, 14, 13],
    [5, 0, 9, 6],
  ],
};

/**
 * A implantação canónica esticada até às medidas reais, mantendo a forma.
 *
 * Escala-se o conjunto, e não cada retângulo por si: assim um L continua a ser um L, com os braços
 * na mesma proporção entre eles, e é a caixa que o envolve que passa a medir o que o prédio mede.
 */
function comEscala(
  plan: [number, number, number, number][],
  escala: { larguraM: number; profundidadeM: number | null; peDireitoM: number } | null,
): [number, number, number, number][] {
  if (!escala || !(escala.larguraM > 0)) return plan;
  const x0 = Math.min(...plan.map((r) => r[0]));
  const x1 = Math.max(...plan.map((r) => r[2]));
  const y0 = Math.min(...plan.map((r) => r[1]));
  const y1 = Math.max(...plan.map((r) => r[3]));
  const fx = escala.larguraM / (x1 - x0);
  // Sem fundo medido, o fundo acompanha a largura: é a proporção canónica, não uma medida.
  const fy = escala.profundidadeM && escala.profundidadeM > 0 ? escala.profundidadeM / (y1 - y0) : fx;
  return plan.map(
    ([a, b, c, d]) =>
      [round(x0 + (a - x0) * fx), round(y0 + (b - y0) * fy), round(x0 + (c - x0) * fx), round(y0 + (d - y0) * fy)] as [
        number,
        number,
        number,
        number,
      ],
  );
}

/** Retângulos em planta de uma forma, para desenhar a escolha ao avaliador (vista de cima). */
export function footprintPlan(forma: Forma): [number, number, number, number][] {
  return FOOTPRINTS[forma].map((r) => [...r] as [number, number, number, number]);
}

const round = (n: number) => Math.round(n * 100) / 100;

// --- Os lados da planta --------------------------------------------------------------------------

/**
 * Um lado do contorno da planta: uma parede do prédio vista de fora. É o sítio de um alçado — cada
 * alçado entregue ocupa um lado — e a sua identidade guarda-se no pedido (`request_surfaces.face_do_predio`).
 */
export interface LadoDaPlanta {
  /**
   * `frente`, `esquerda`, `direita` ou `tras` para o lado mais exterior nessa direção; `tras-2`, `tras-3`…
   * para os outros que olham para o mesmo lado (a asa de um L, o pátio de um U). Estável: só depende da forma.
   */
  id: string;
  direcao: Fachada;
  /** Se o lado se estende ao longo de x (`x`: frente e tardoz) ou de y (`y`: as laterais). */
  eixo: 'x' | 'y';
  /** A coordenada fixa do plano do lado (y para o eixo x; x para o eixo y). */
  plano: number;
  /** De onde a onde, ao longo do eixo, por ordem crescente. */
  de: number;
  ate: number;
  /** Normal exterior, no plano horizontal. */
  n: [number, number, number];
  /** Para o avaliador e para o cliente: «Fachada principal», «Tardoz (ala direita)». */
  label: string;
}

const DIRECAO_DA_NORMAL = (nx: number, ny: number): Fachada => (ny > 0 ? 'frente' : ny < 0 ? 'tras' : nx > 0 ? 'direita' : 'esquerda');

/**
 * O contorno de uma implantação em retângulos, lado a lado. Um retângulo por lado exterior, já fundidos
 * os troços na mesma reta (o lado direito de um L é um só). Funciona com coordenadas quaisquer — a
 * implantação escalada às medidas do prédio dá os mesmos lados que a canónica, pela mesma ordem.
 */
export function ladosDoPlano(plan: readonly [number, number, number, number][]): LadoDaPlanta[] {
  const xs = [...new Set(plan.flatMap((r) => [r[0], r[2]]))].sort((a, b) => a - b);
  const ys = [...new Set(plan.flatMap((r) => [r[1], r[3]]))].sort((a, b) => a - b);
  const cheia = (i: number, j: number) => {
    if (i < 0 || j < 0 || i >= xs.length - 1 || j >= ys.length - 1) return false;
    const cx = (xs[i]! + xs[i + 1]!) / 2;
    const cy = (ys[j]! + ys[j + 1]!) / 2;
    return plan.some((r) => cx > r[0] && cx < r[2] && cy > r[1] && cy < r[3]);
  };
  type Troco = { direcao: Fachada; eixo: 'x' | 'y'; plano: number; de: number; ate: number; n: [number, number, number] };
  const trocos: Troco[] = [];
  for (let i = 0; i < xs.length - 1; i++) {
    for (let j = 0; j < ys.length - 1; j++) {
      if (!cheia(i, j)) continue;
      if (!cheia(i, j + 1)) trocos.push({ direcao: 'frente', eixo: 'x', plano: ys[j + 1]!, de: xs[i]!, ate: xs[i + 1]!, n: [0, 1, 0] });
      if (!cheia(i, j - 1)) trocos.push({ direcao: 'tras', eixo: 'x', plano: ys[j]!, de: xs[i]!, ate: xs[i + 1]!, n: [0, -1, 0] });
      if (!cheia(i + 1, j)) trocos.push({ direcao: 'direita', eixo: 'y', plano: xs[i + 1]!, de: ys[j]!, ate: ys[j + 1]!, n: [1, 0, 0] });
      if (!cheia(i - 1, j)) trocos.push({ direcao: 'esquerda', eixo: 'y', plano: xs[i]!, de: ys[j]!, ate: ys[j + 1]!, n: [-1, 0, 0] });
    }
  }
  // Fundir os troços contíguos na mesma reta e do mesmo lado.
  const fundidos: Troco[] = [];
  for (const t of [...trocos].sort((a, b) => a.direcao.localeCompare(b.direcao) || a.plano - b.plano || a.de - b.de)) {
    const ultimo = fundidos[fundidos.length - 1];
    if (ultimo && ultimo.direcao === t.direcao && ultimo.plano === t.plano && Math.abs(ultimo.ate - t.de) < 1e-9) ultimo.ate = t.ate;
    else fundidos.push({ ...t });
  }
  const x0 = xs[0]!;
  const x1 = xs[xs.length - 1]!;
  const y0 = ys[0]!;
  const y1 = ys[ys.length - 1]!;
  const lados: LadoDaPlanta[] = [];
  for (const direcao of FACHADAS) {
    // O mais exterior primeiro (o que fica mais longe do centro nessa direção), e, no mesmo plano, da esquerda para a direita
    // (ou da frente para trás nas laterais).
    const fora = (t: Troco) => (direcao === 'frente' || direcao === 'direita' ? -t.plano : t.plano);
    const doLado = fundidos
      .filter((t) => t.direcao === direcao)
      .sort((a, b) => fora(a) - fora(b) || (a.eixo === 'x' ? a.de - b.de : b.de - a.de));
    const planoExterior = doLado[0]?.plano;
    const noMesmoPlano = doLado.filter((t) => t.plano === planoExterior).length;
    doLado.forEach((t, k) => {
      const meio = (t.de + t.ate) / 2;
      // Onde fica, dentro da caixa da planta: terços.
      const terco =
        t.eixo === 'x'
          ? meio < x0 + (x1 - x0) / 3
            ? 'ala esquerda'
            : meio > x0 + ((x1 - x0) * 2) / 3
              ? 'ala direita'
              : 'ao centro'
          : meio > y0 + ((y1 - y0) * 2) / 3
            ? 'ala da frente'
            : meio < y0 + (y1 - y0) / 3
              ? 'ala de trás'
              : 'ao centro';
      const unico = doLado.length === 1 || (k === 0 && noMesmoPlano === 1);
      lados.push({
        id: k === 0 ? direcao : `${direcao}-${k + 1}`,
        direcao: DIRECAO_DA_NORMAL(t.n[0], t.n[1]),
        eixo: t.eixo,
        plano: t.plano,
        de: t.de,
        ate: t.ate,
        n: t.n,
        label: unico ? FACHADA_LABELS[direcao] : `${FACHADA_LABELS[direcao].replace(/ \(.*\)$/, '')} (${terco})`,
      });
    });
  }
  return lados;
}

/** A implantação de uma forma, em retângulos, para as formas canónicas. */
export const ladosDaPlanta = (forma: Forma): LadoDaPlanta[] => ladosDoPlano(FOOTPRINTS[forma]);

/**
 * O lado do prédio que um formulário enviou, ou nulo («o desenho atribui»). Só passa um identificador de lado
 * (`frente`, `esquerda`, `direita`, `tras`, e `tras-2`…`tras-9`): o que vem do navegador não manda, e a base de dados
 * repete a verificação (`request_surfaces_face_do_predio_formato`).
 */
export function lerFaceDoPredio(v: unknown): string | null {
  return typeof v === 'string' && /^(frente|esquerda|direita|tras)(-[2-9])?$/.test(v) ? v : null;
}

/** A laje: o painel do primeiro alçado, enquanto a planta não existe. Pouca profundidade, de propósito. */
const LAJE: [number, number, number, number][] = [[0, 11, 14, 13]];
/** Os lados da laje — os quatro, mas só a frente é um alçado. */
export const LADOS_DA_LAJE: LadoDaPlanta[] = ladosDoPlano(LAJE);

/** Quão de frente está um lado para a câmara a `angulo` graus: -1 (de costas) a 1 (de frente). */
export const vistaDoLado = (n: readonly [number, number, number], angulo: number): number => {
  const a = (angulo * Math.PI) / 180;
  return n[0] * Math.sin(a) + n[1] * Math.cos(a);
};

export interface Quad {
  kind: FaceKind;
  /** Vizinhos: x da empena (contacto) e x do extremo oposto, por rodar. */
  fade?: { contacto: number; fim: number };
  /** Pontos em 3D, em metros reais (ou nas proporções canónicas, sem `escala`) — por rodar. */
  pts: [number, number, number][];
  /** Normal exterior em 3D, por rodar. */
  n: [number, number, number];
  /** O lado da planta a que pertence (só no desenho por alçados). */
  face?: string;
}

/** Caixa entre (x0,y0,z0) e (x1,y1,z1): as seis faces, para a rotação poder mostrar qualquer uma. */
function box(
  x0: number,
  y0: number,
  z0: number,
  x1: number,
  y1: number,
  z1: number,
  kind?: FaceKind,
  frente = false,
): Quad[] {
  const lado = kind ?? 'lado';
  return [
    { kind: kind ?? (frente ? 'frente' : 'lado'), n: [0, 1, 0], pts: [[x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]] },
    { kind: lado, n: [0, -1, 0], pts: [[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1]] },
    { kind: lado, n: [1, 0, 0], pts: [[x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [x1, y0, z1]] },
    { kind: lado, n: [-1, 0, 0], pts: [[x0, y0, z0], [x0, y1, z0], [x0, y1, z1], [x0, y0, z1]] },
    { kind: kind ?? 'topo', n: [0, 0, 1], pts: [[x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]] },
    { kind: kind ?? 'topo', n: [0, 0, -1], pts: [[x0, y0, z0], [x1, y0, z0], [x1, y1, z0], [x0, y1, z0]] },
  ];
}

/** O que `gerarQuads` devolve, além dos quads: as medidas da implantação, para quem projeta e para
 *  quem só quer somar área sem desenhar nada. */
export interface GeometriaGerada {
  quads: Quad[];
  pisos: number;
  piso: number;
  height: number;
  px0: number;
  py0: number;
  px1: number;
  py1: number;
  width: number;
  front: number;
  livres: number;
  /** Os lados da planta (só no desenho por alçados; no outro, vazio). */
  lados: LadoDaPlanta[];
}

/**
 * Os quads do prédio, em metros reais (ou nas proporções canónicas, sem `escala`) — antes de rodar e
 * projetar. Extraído de `buildingVolume` (31/10→03/11/2026) para `volumeAreas.ts` poder somar área
 * real por categoria sem duplicar esta geometria: a mesma declaração tem de dar o mesmo desenho E a
 * mesma área, sempre a partir desta única função.
 */
export function gerarQuads(input: VolumeInput): GeometriaGerada {
  if (input.alcados) return gerarQuadsDosAlcados(input, input.alcados);
  const declared = input.pisos ?? (input.moradia ? 2 : 4);
  // "pisos" conta os pisos acima do solo; um rés-do-chão sozinho é 1.
  const pisos = Math.min(MAX_DRAWN_FLOORS, Math.max(1, declared));
  const livres = Math.min(4, Math.max(1, input.fachadas ?? 4));
  const piso = input.escala?.peDireitoM && input.escala.peDireitoM > 0 ? input.escala.peDireitoM : FLOOR;
  const height = pisos * piso;
  const forma = input.forma ?? 'I';
  const plan: [number, number, number, number][] = comEscala(FOOTPRINTS[forma], input.escala ?? null);
  const main: [number, number, number, number] = plan[0] ?? [0, 6, 14, 13];
  const [px0, py0, px1, py1] = main;
  const width = px1 - px0;
  const front = py1;

  const quads: Quad[] = [];
  const el = input.elementos ?? {};

  // Corpos da implantação. O primeiro leva a fachada principal.
  const corpo: Quad[][] = plan.map(([x0, y0, x1, y1], i) => box(x0, y0, 0, x1, y1, height, undefined, i === 0));

  // Empenas: as faces do próprio prédio que encostam a um vizinho. Desenham-se noutra cor, porque
  // existem e têm área, mas não são fachada à vista (pedido do promotor, 24/10/2026).
  const empena = (q: Quad, lado: -1 | 1) => {
    if (q.n[0] === lado && q.n[1] === 0 && q.n[2] === 0) q.kind = 'empena';
  };
  const principal = corpo[0] ?? [];
  if (livres <= 3) principal.forEach((q) => empena(q, -1));
  if (livres <= 2) principal.forEach((q) => empena(q, 1));
  corpo.forEach((qs) => quads.push(...qs));

  // Prédios encostados: com 3 fachadas livres há um vizinho; com 1 ou 2, dois (prédio em banda).
  const encostado = (qs: Quad[], contacto: number, fim: number) =>
    quads.push(...qs.map((q) => ({ ...q, fade: { contacto, fim } })));
  if (livres <= 3) encostado(box(px0 - 6, py0, 0, px0, front, height * 0.8, 'vizinho'), px0, px0 - 6);
  if (livres <= 2) encostado(box(px1, py0, 0, px1 + 6, front, height * 0.7, 'vizinho'), px1, px1 + 6);

  // Vãos. Até 28/10/2026 só existiam na fachada da frente, e por isso desapareciam e reapareciam ao
  // rodar o volume — o promotor leu isso como avaria, e tinha razão: um prédio tem janelas de todos
  // os lados. Agora desenham-se nas quatro fachadas, pelo número declarado em cada uma.
  //
  // **Ritmo regular, de propósito.** O número é fiel; a arrumação não. É o número que o pintor
  // precisa (vãos a descontar, protecções a montar) e seria a arrumação a identificar o prédio.
  // Dois prédios com quatro janelas por piso dão o mesmo desenho — regra 6 do CLAUDE.md.
  const quantas = (f: Fachada) => {
    const v = input.janelas?.[f];
    const n = v === null || v === undefined ? JANELAS_POR_OMISSAO : v;
    return Math.max(0, Math.min(MAX_JANELAS_POR_PISO, Math.floor(n)));
  };

  /** Os vãos de uma fachada, igualmente espaçados ao longo do seu comprimento. */
  const vaos = (de: number, ate: number, n: number): [number, number][] => {
    if (n <= 0) return [];
    const passo = (ate - de) / n;
    const largura = Math.min(1.8, passo * 0.55);
    return Array.from({ length: n }, (_, i) => {
      const meio = de + passo * (i + 0.5);
      return [round(meio - largura / 2), round(meio + largura / 2)] as [number, number];
    });
  };

  const depth = front - py0;
  // Cada fachada: onde fica o plano, para que lado olha, e ao longo de que eixo se espalham os vãos.
  const planos: { f: Fachada; plano: number; eixo: 'x' | 'y'; de: number; ate: number; n: [number, number, number] }[] = [
    { f: 'frente', plano: front, eixo: 'x', de: px0, ate: px1, n: [0, 1, 0] },
    { f: 'tras', plano: py0, eixo: 'x', de: px0, ate: px1, n: [0, -1, 0] },
    { f: 'direita', plano: px1, eixo: 'y', de: py0, ate: front, n: [1, 0, 0] },
    { f: 'esquerda', plano: px0, eixo: 'y', de: py0, ate: front, n: [-1, 0, 0] },
  ];

  for (const { f, plano, eixo, de, ate, n } of planos) {
    const lista = vaos(de, ate, quantas(f));
    for (let p = 0; p < pisos; p++) {
      const z = p * piso + 0.9;
      for (const [a0, a1] of lista) {
        // No rés-do-chão da fachada principal o primeiro vão é a entrada, não uma janela: sem ela o
        // volume não se lê como prédio, e com ela percebe-se de que lado se entra.
        const entrada = p === 0 && f === 'frente' && a0 === lista[0]![0];
        const kind: FaceKind = entrada ? 'porta' : 'janela';
        const zb = entrada ? p * piso : z;
        const zt = entrada ? p * piso + 2.1 : z + 1.3;
        const pts: [number, number, number][] =
          eixo === 'x'
            ? [[a0, plano, zb], [a1, plano, zb], [a1, plano, zt], [a0, plano, zt]]
            : [[plano, a0, zb], [plano, a1, zb], [plano, a1, zt], [plano, a0, zt]];
        quads.push({ kind, n, pts });
        // Pala: uma aba estreita por cima do vão, saliente da fachada. Só na frente, como antes.
        if (el.palas && f === 'frente' && !entrada) {
          quads.push(...box(a0 - 0.3, front, zt, a1 + 0.3, front + 0.6, zt + 0.2, 'pala'));
        }
      }
    }
  }

  if (input.temVarandas) {
    for (let p = 1; p < pisos; p++) {
      const z = p * piso;
      quads.push(...box(px0 + width * 0.2, front, z, px0 + width * 0.8, front + 1.2, z + 0.25, 'varanda'));
      // Grades na varanda: a guarda sobre o bordo da laje. Desenha-se sempre que há varandas — uma
      // varanda sem guarda não existe — e muda o que o pintor tem de orçamentar.
      quads.push({
        kind: 'grade',
        n: [0, 1, 0],
        pts: [
          [px0 + width * 0.2, front + 1.2, z + 0.25],
          [px0 + width * 0.8, front + 1.2, z + 0.25],
          [px0 + width * 0.8, front + 1.2, z + 1.25],
          [px0 + width * 0.2, front + 1.2, z + 1.25],
        ],
      });
    }
  }

  // Marquises: a mesma caixa das varandas, fechada — sem grade (o fecho substitui a guarda) e numa
  // cor própria no desenho (handoff de 03/11/2026, secção 3.4: "marquise: fechada, não pintada").
  // Nunca ao mesmo tempo que varandas abertas no mesmo volume genérico (ver VolumeInput.temMarquises).
  if (input.temMarquises) {
    for (let p = 1; p < pisos; p++) {
      const z = p * piso;
      quads.push(...box(px0 + width * 0.2, front, z, px0 + width * 0.8, front + 1.2, z + 1.25, 'marquise'));
    }
  }

  // Beirais: a pala de remate em todo o topo da fachada.
  if (el.beirais) quads.push(...box(px0 - 0.6, front - 0.6, height, px1 + 0.6, front + 0.8, height + 0.4, 'beiral'));
  // Muro à frente do prédio, à altura de um muro de vedação.
  if (el.muro) quads.push(...box(px0 - 1, front + 3, 0, px1 + 1, front + 3.8, 1.6, 'muro'));

  return { quads, pisos, piso, height, px0, py0, px1, py1, width, front, livres, lados: [] };
}

/** Uma caixa que assenta num lado da planta e sai dele `prof` metros, de `u0` a `u1` ao longo do lado. */
function caixaNoLado(
  l: LadoDaPlanta,
  u0: number,
  u1: number,
  prof: number,
  z0: number,
  z1: number,
  kind: FaceKind,
): Quad[] {
  const s = l.eixo === 'x' ? l.n[1] : l.n[0];
  const fora = l.plano + s * prof;
  const [p0, p1] = s > 0 ? [l.plano, fora] : [fora, l.plano];
  const qs = l.eixo === 'x' ? box(u0, p0, z0, u1, p1, z1, kind) : box(p0, u0, z0, p1, u1, z1, kind);
  return qs.map((q) => ({ ...q, face: l.id }));
}

/**
 * O prédio por alçados: as paredes são os lados do contorno da planta, e cada lado é um alçado que
 * alguém entregou ou ainda não. Sem paredes internas (as caixas da implantação partilhavam planos que, com
 * lados só a traço, se viam por dentro): uma parede por lado exterior e uma cobertura por corpo.
 *
 * - Um lado **entregue** leva parede e vãos: uma fachada tem as janelas declaradas para o seu lado (e a
 *   entrada, na frente); uma empena é parede cega.
 * - Um lado **por entregar** só tem o traço (`por_entregar`).
 * - Sem planta (menos de dois alçados) o prédio é a **laje**: um painel com pouca profundidade.
 * - Varandas e marquises assentam no lado `varandasEm`; muro e beirais ficam à frente, como sempre.
 */
function gerarQuadsDosAlcados(input: VolumeInput, alcados: NonNullable<VolumeInput['alcados']>): GeometriaGerada {
  const declared = input.pisos ?? (input.moradia ? 2 : 4);
  const pisos = Math.min(MAX_DRAWN_FLOORS, Math.max(1, declared));
  const livres = Math.min(4, Math.max(1, input.fachadas ?? 4));
  const piso = input.escala?.peDireitoM && input.escala.peDireitoM > 0 ? input.escala.peDireitoM : FLOOR;
  const height = pisos * piso;
  const base = input.laje ? LAJE : FOOTPRINTS[input.forma ?? 'I'];
  // A laje não tem profundidade medida: o fundo do prédio não é o dela.
  const escala = input.escala ? (input.laje ? { ...input.escala, profundidadeM: null } : input.escala) : null;
  const plan = comEscala(base, escala);
  const lados = ladosDoPlano(plan);
  const [px0, py0, px1, py1] = plan[0] ?? [0, 11, 14, 13];
  const width = px1 - px0;
  const front = py1;
  const quads: Quad[] = [];
  const el = input.elementos ?? {};
  const entregue = new Map(alcados.map((a) => [a.face, a.tipo]));

  // Paredes.
  for (const l of lados) {
    const tipo = entregue.get(l.id);
    const kind: FaceKind = !tipo ? 'por_entregar' : tipo === 'empena' ? 'empena' : l.id === 'frente' ? 'frente' : 'lado';
    const a = l.eixo === 'x' ? ([l.de, l.plano] as const) : ([l.plano, l.de] as const);
    const b = l.eixo === 'x' ? ([l.ate, l.plano] as const) : ([l.plano, l.ate] as const);
    quads.push({
      kind,
      face: l.id,
      n: l.n,
      pts: [[a[0], a[1], 0], [b[0], b[1], 0], [b[0], b[1], height], [a[0], a[1], height]],
    });
  }
  // Coberturas: uma por corpo da implantação.
  for (const [x0, y0, x1, y1] of plan) {
    quads.push({ kind: 'topo', n: [0, 0, 1], pts: [[x0, y0, height], [x1, y0, height], [x1, y1, height], [x0, y1, height]] });
  }

  // Prédios encostados, como no desenho genérico.
  const encostado = (qs: Quad[], contacto: number, fim: number) => quads.push(...qs.map((q) => ({ ...q, fade: { contacto, fim } })));
  if (livres <= 3) encostado(box(px0 - 6, py0, 0, px0, front, height * 0.8, 'vizinho'), px0, px0 - 6);
  if (livres <= 2) encostado(box(px1, py0, 0, px1 + 6, front, height * 0.7, 'vizinho'), px1, px1 + 6);

  // Vãos: só nos alçados entregues que são fachada, pelo número declarado para a direção do lado. Ritmo
  // regular, de propósito (regra 6): o número é fiel, a arrumação não identifica o prédio.
  const quantas = (f: Fachada) => {
    const v = input.janelas?.[f];
    const n = v === null || v === undefined ? JANELAS_POR_OMISSAO : v;
    return Math.max(0, Math.min(MAX_JANELAS_POR_PISO, Math.floor(n)));
  };
  for (const l of lados) {
    if (entregue.get(l.id) !== 'fachada') continue;
    const n = quantas(l.direcao);
    if (n <= 0) continue;
    const passo = (l.ate - l.de) / n;
    const largura = Math.min(1.8, passo * 0.55);
    const vaos = Array.from({ length: n }, (_, i) => {
      const meio = l.de + passo * (i + 0.5);
      return [round(meio - largura / 2), round(meio + largura / 2)] as [number, number];
    });
    const principal = l.id === 'frente';
    for (let p = 0; p < pisos; p++) {
      for (const [a0, a1] of vaos) {
        const entrada = p === 0 && principal && a0 === vaos[0]![0];
        const zb = entrada ? 0 : p * piso + 0.9;
        const zt = entrada ? 2.1 : p * piso + 0.9 + 1.3;
        const pts: [number, number, number][] =
          l.eixo === 'x'
            ? [[a0, l.plano, zb], [a1, l.plano, zb], [a1, l.plano, zt], [a0, l.plano, zt]]
            : [[l.plano, a0, zb], [l.plano, a1, zb], [l.plano, a1, zt], [l.plano, a0, zt]];
        quads.push({ kind: entrada ? 'porta' : 'janela', n: l.n, pts, face: l.id });
        if (el.palas && principal && !entrada) quads.push(...caixaNoLado(l, a0 - 0.3, a1 + 0.3, 0.6, zt, zt + 0.2, 'pala'));
      }
    }
  }

  // Varandas e marquises, no lado que lhes cabe.
  const lVaranda = lados.find((l) => l.id === (input.varandasEm ?? 'frente')) ?? lados.find((l) => l.id === 'frente');
  if (lVaranda) {
    const de = lVaranda.de + (lVaranda.ate - lVaranda.de) * 0.2;
    const ate = lVaranda.de + (lVaranda.ate - lVaranda.de) * 0.8;
    const s = lVaranda.eixo === 'x' ? lVaranda.n[1] : lVaranda.n[0];
    const fora = lVaranda.plano + s * 1.2;
    for (let p = 1; p < pisos; p++) {
      const z = p * piso;
      if (input.temVarandas) {
        quads.push(...caixaNoLado(lVaranda, de, ate, 1.2, z, z + 0.25, 'varanda'));
        const pts: [number, number, number][] =
          lVaranda.eixo === 'x'
            ? [[de, fora, z + 0.25], [ate, fora, z + 0.25], [ate, fora, z + 1.25], [de, fora, z + 1.25]]
            : [[fora, de, z + 0.25], [fora, ate, z + 0.25], [fora, ate, z + 1.25], [fora, de, z + 1.25]];
        quads.push({ kind: 'grade', n: lVaranda.n, pts, face: lVaranda.id });
      }
      if (input.temMarquises) quads.push(...caixaNoLado(lVaranda, de, ate, 1.2, z, z + 1.25, 'marquise'));
    }
  }

  // O muro e os beirais são da frente: de costas, o prédio tapa-os (ver `buildingVolume`).
  if (el.beirais) quads.push(...box(px0 - 0.6, front - 0.6, height, px1 + 0.6, front + 0.8, height + 0.4, 'beiral').map((q) => ({ ...q, face: 'frente' })));
  if (el.muro) quads.push(...box(px0 - 1, front + 3, 0, px1 + 1, front + 3.8, 1.6, 'muro').map((q) => ({ ...q, face: 'frente' })));

  return { quads, pisos, piso, height, px0, py0, px1, py1, width, front, livres, lados };
}

export function buildingVolume(input: VolumeInput): Volume {
  const { quads, pisos, px0, py0, px1, front, height, livres, lados } = gerarQuads(input);

  // Rotação sobre o eixo vertical, em torno do centro da implantação, e projeção axonométrica.
  const angulo = ((input.angulo ?? 0) % 360 + 360) % 360;
  const a = (angulo * Math.PI) / 180;
  const cos = Math.cos(a);
  const sin = Math.sin(a);
  const cx = (px0 + px1) / 2;
  const cy = (py0 + front) / 2;
  const rot = (x: number, y: number): [number, number] => {
    const dx = x - cx;
    const dy = y - cy;
    return [cx + dx * cos - dy * sin, cy + dx * sin + dy * cos];
  };
  const iso = (x: number, y: number, z: number): [number, number] => [round(x), round(y * SIN_E - z * COS_E)];

  // A câmara está sempre à mesma altura e olha na horizontal, de frente para o azimute pedido: uma face
  // vê-se quando a sua normal aponta para a câmara. É o que torna a rotação correta em todos os ângulos,
  // sem nunca desenhar o que está escondido e sem o volume achatar de perfil.
  const visible: { face: Face; depth: number }[] = [];
  // O que assenta num lado da planta (vãos, varandas, grades, palas, o muro, os beirais) não se vê quando esse
  // lado está de costas: o prédio tapa-o. Sem isto, as varandas da frente pairavam por cima da cobertura num
  // prédio visto por trás (o pintor desenha o corpo e depois os pormenores, sem saber o que está tapado).
  const DO_CORPO: FaceKind[] = ['frente', 'lado', 'empena', 'topo', 'vizinho', 'por_entregar'];
  const nDoLado = new Map(lados.map((l) => [l.id, l.n]));
  for (const q of quads) {
    // A normal roda com o corpo (rotação sobre o eixo vertical, sem translação).
    const ny = q.n[0] * sin + q.n[1] * cos;
    if (ny * COS_E + q.n[2] * SIN_E <= 1e-9) continue;
    const apoio = q.face && !DO_CORPO.includes(q.kind) ? nDoLado.get(q.face) : undefined;
    if (apoio && apoio[0] * sin + apoio[1] * cos <= 0.02) continue;
    const pts = q.pts.map(([x, y, z]) => {
      const [rx, ry] = rot(x, y);
      return { rx, ry, z };
    });
    let fade: Face['fade'];
    if (q.fade) {
      // A direção do esbatimento é a mesma face, do lado da empena para o lado de fora.
      const cy2 = q.pts.reduce((n, p) => n + p[1], 0) / q.pts.length;
      const cz2 = q.pts.reduce((n, p) => n + p[2], 0) / q.pts.length;
      const ponto = (x: number): [number, number] => {
        const [rx, ry] = rot(x, cy2);
        return iso(rx, ry, cz2);
      };
      fade = { de: ponto(q.fade.contacto), ate: ponto(q.fade.fim) };
    }
    visible.push({
      face: {
        kind: q.kind,
        ...(q.face ? { face: q.face } : {}),
        // Só nas paredes: as horizontais veem-se sempre de cima.
        ...(q.n[2] === 0 ? { vista: round(Math.max(0, ny)) } : {}),
        points: pts.map(({ rx, ry, z }) => iso(rx, ry, z)),
        ...(fade ? { fade } : {}),
      },
      depth: pts.reduce((n, p) => n + p.ry * COS_E + p.z * SIN_E, 0) / pts.length,
    });
  }
  // Pintor, em duas camadas: primeiro o corpo, depois o que assenta nele.
  //
  // Com uma só ordenação por profundidade média, um vão coplanar com a parede perdia para a
  // própria parede. A média da parede fica a meia altura; uma janela abaixo dessa cota tinha
  // profundidade menor, era desenhada antes e a parede tapava-a. Era isto que o promotor via como
  // avaria a 28/10/2026 — ao rodar, mudava a cota média de cada face e mudava o conjunto de
  // janelas que sobrevivia, pelo que pareciam mudar de sítio e de número.
  //
  // Os pormenores assentam sempre na face que os sustenta e são ocultados pelo mesmo critério que
  // ela (a normal é a mesma), por isso desenhá-los todos depois do corpo é correcto. Entre si
  // continuam ordenados por profundidade — é o que põe o muro à frente da porta, e a guarda à
  // frente da laje da varanda.
  // Os vizinhos (os fantasmas que se esbatem) vão **por baixo de tudo**: uma sombra desenhada por cima da parede, num
  // prédio visto de lado, sujava-a (revisão, 06/11/2026). Não tapam nada — são só o lembrete de que há prédio ao lado.
  const CORPO = DO_CORPO;
  const camada = (k: FaceKind) => (k === 'vizinho' ? -1 : CORPO.includes(k) ? 0 : 1);
  visible.sort((a2, b2) => camada(a2.face.kind) - camada(b2.face.kind) || a2.depth - b2.depth);
  const faces = visible.map((v) => v.face);

  // As arestas das cotas, pelas mesmas contas de rotação e projeção das faces.
  const proj = (x: number, y: number, z: number): [number, number] => {
    const [rx, ry] = rot(x, y);
    return iso(rx, ry, z);
  };
  const cotas = {
    largura: [proj(px0, front, 0), proj(px1, front, 0)] as [[number, number], [number, number]],
    profundidade: [proj(px1, py0, 0), proj(px1, front, 0)] as [[number, number], [number, number]],
    altura: [proj(px1, front, 0), proj(px1, front, height)] as [[number, number], [number, number]],
  };

  // As cotas da prancheta seguem o ângulo (as arestas que ficam por cima e à esquerda e à direita do prédio
  // mudam ao rodar): a largura na aresta do telhado mais afastada da câmara (a mais alta no ecrã), o fundo na
  // aresta do telhado mais à esquerda, a altura na esquina mais à direita. A 25° são as de sempre.
  const [yFundo, yFrente] = [py0, front];
  const alta = (y: number) => (proj(px0, y, height)[1] + proj(px1, y, height)[1]) / 2;
  const yLonge = alta(yFundo) <= alta(yFrente) ? yFundo : yFrente;
  const esquerda = (x: number) => (proj(x, yFundo, height)[0] + proj(x, yFrente, height)[0]) / 2;
  const xEsq = esquerda(px0) <= esquerda(px1) ? px0 : px1;
  const perto = (x: number): [number, number] => {
    const a = proj(x, yFrente, height);
    const b = proj(x, yFundo, height);
    return a[1] >= b[1] ? [yFrente, yFundo] : [yFundo, yFrente];
  };
  const [yPerto, yAlem] = perto(xEsq);
  const cantos: [number, number][] = [[px0, yFundo], [px1, yFundo], [px0, yFrente], [px1, yFrente]];
  const direito = cantos.reduce((m, c) => (proj(c[0], c[1], 0)[0] > proj(m[0], m[1], 0)[0] ? c : m), cantos[0]!);

  // As arestas candidatas de cada cota. «Fora» é a normal à aresta virada para longe do centro do prédio: afastar
  // por ela afasta do prédio, o que não acontecia com o vetor entre duas esquinas (perto de 100–130° ficava quase
  // paralelo à aresta e o afastamento não saía de cima das paredes).
  const centroDoEcra = proj(cx, cy, height / 2);
  const aresta = (a: [number, number], b: [number, number]): ArestaDaCota => {
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const n = Math.hypot(dx, dy) || 1;
    let nx = dy / n;
    let ny = -dx / n;
    const lado = nx * ((a[0] + b[0]) / 2 - centroDoEcra[0]) + ny * ((a[1] + b[1]) / 2 - centroDoEcra[1]);
    if (lado < -1e-9 || (Math.abs(lado) <= 1e-9 && (ny > 1e-9 || (Math.abs(ny) <= 1e-9 && nx > 0)))) {
      nx = -nx;
      ny = -ny;
    }
    return { a, b, fora: [nx, ny] };
  };
  const doX = (y: number, z: number) => aresta(proj(px0, y, z), proj(px1, y, z));
  const doY = (x: number, z: number) => {
    const [yP, yA] = perto(x);
    return aresta(proj(x, yP, z), proj(x, yA, z));
  };
  const outroY = yLonge === yFundo ? yFrente : yFundo;
  const outroX = xEsq === px0 ? px1 : px0;
  // As esquinas verticais do contorno **da planta** (e não do retângulo que a envolve, que num L ou U pode ser ar),
  // da mais à direita no ecrã para a mais à esquerda.
  const vertices = new Map<string, [number, number]>();
  for (const l of lados) {
    const pts: [number, number][] = l.eixo === 'x' ? [[l.de, l.plano], [l.ate, l.plano]] : [[l.plano, l.de], [l.plano, l.ate]];
    for (const p of pts) vertices.set(p.join(','), p);
  }
  const esquinas = [...vertices.values()].sort((p, q) => proj(q[0], q[1], 0)[0] - proj(p[0], p[1], 0)[0]);
  if (esquinas.length === 0) esquinas.push(direito);
  const candidatas = {
    largura: [doX(yLonge, height), doX(outroY, height), doX(outroY, 0), doX(yLonge, 0)],
    fundo: [doY(xEsq, height), doY(outroX, height), doY(xEsq, 0), doY(outroX, 0)],
    altura: esquinas.map((c) => aresta(proj(c[0], c[1], 0), proj(c[0], c[1], height))),
  };
  const cotasDaPrancheta = {
    largura: [proj(px0, yLonge, height), proj(px1, yLonge, height)] as [[number, number], [number, number]],
    fundo: [proj(xEsq, yPerto, height), proj(xEsq, yAlem, height)] as [[number, number], [number, number]],
    altura: [proj(direito[0], direito[1], 0), proj(direito[0], direito[1], height)] as [[number, number], [number, number]],
    foraDoFundo: candidatas.fundo[0]!.fora,
    candidatas,
  };

  const pecas: Volume['pecas'] = [];
  for (const q of quads) {
    if (q.fade) continue;
    if (!pecas.some((x) => x.kind === q.kind && x.face === q.face)) pecas.push({ kind: q.kind, ...(q.face ? { face: q.face } : {}) });
  }

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
    angulo,
    cotas,
    alturaDesenhada: round(height),
    pecas,
    lados,
    laje: !!input.laje,
    cotasDaPrancheta,
  };
}
