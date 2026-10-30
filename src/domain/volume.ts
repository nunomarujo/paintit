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

export type FaceKind = 'frente' | 'lado' | 'empena' | 'topo' | 'varanda' | 'vizinho' | 'janela' | 'porta' | 'grade' | 'muro' | 'beiral' | 'pala';
export interface Face {
  kind: FaceKind;
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

interface Quad {
  kind: FaceKind;
  /** Vizinhos: x da empena (contacto) e x do extremo oposto, por rodar. */
  fade?: { contacto: number; fim: number };
  /** Pontos em 3D, por rodar. */
  pts: [number, number, number][];
  /** Normal exterior em 3D, por rodar. */
  n: [number, number, number];
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

export function buildingVolume(input: VolumeInput): Volume {
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

  // Beirais: a pala de remate em todo o topo da fachada.
  if (el.beirais) quads.push(...box(px0 - 0.6, front - 0.6, height, px1 + 0.6, front + 0.8, height + 0.4, 'beiral'));
  // Muro à frente do prédio, à altura de um muro de vedação.
  if (el.muro) quads.push(...box(px0 - 1, front + 3, 0, px1 + 1, front + 3.8, 1.6, 'muro'));

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
  for (const q of quads) {
    // A normal roda com o corpo (rotação sobre o eixo vertical, sem translação).
    const ny = q.n[0] * sin + q.n[1] * cos;
    if (ny * COS_E + q.n[2] * SIN_E <= 1e-9) continue;
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
      face: { kind: q.kind, points: pts.map(({ rx, ry, z }) => iso(rx, ry, z)), ...(fade ? { fade } : {}) },
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
  const CORPO: FaceKind[] = ['frente', 'lado', 'empena', 'topo', 'vizinho'];
  const camada = (k: FaceKind) => (CORPO.includes(k) ? 0 : 1);
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
  };
}
