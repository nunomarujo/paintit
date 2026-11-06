import { facesDaZona } from './geometria';
import {
  dentroDoPoligono,
  disporChamadas,
  segmentosCruzam,
  type Disposicao,
  type EntradaDasChamadas,
  type FaceDaPrancheta,
  type Obstaculos,
} from './chamadas';
import type { Participacao, SurfaceKind } from './request';
import {
  buildingVolume,
  ladosDaPlanta,
  type Fachada,
  LADOS_DA_LAJE,
  type FaceKind,
  type Forma,
  type LadoDaPlanta,
  type Volume,
  type VolumeInput,
} from './volume';

/**
 * O desenho do passo 2 do pedido (proposta B, «o prédio ao centro», escolhida pelo promotor a
 * 05/11/2026): o volume do prédio com as zonas pintadas por cima, o número de cada zona no sítio
 * dela e as cotas das medidas que alguém deu.
 *
 * O volume é o de sempre (`buildingVolume`, em `volume.ts`); o que este ficheiro acrescenta é a
 * ligação às zonas — que faces pinta cada uma, onde fica o seu número, que número tem — e o sítio
 * das cotas. Tudo em unidades do desenho, sem nada de ecrã: quem desenha converte para píxeis.
 *
 * ## O desenho é dos alçados (06/11/2026)
 *
 * Um **alçado** é uma zona de fachada ou de empena. O desenho só tem a forma dos alçados que se foram
 * entregando: com um (ou nenhum) é uma **laje** — um painel com pouca profundidade, visto a três
 * dimensões —; ao entrar o segundo, pergunta-se a **planta** (quadrado, I, L, U, T, a do cadastro do
 * prédio quando já existe) e cada alçado passa a ocupar um **lado** dessa planta (`LadoDaPlanta`,
 * em `volume.ts`: frente, esquerda, direita, tardoz, e os lados das asas de um L, U ou T). O lado de cada
 * alçado guarda-se no pedido (`face_do_predio`); sem ele, atribui-se pela ordem em que os alçados foram
 * registados (`atribuirFaces`). Os lados por entregar ficam só a traço.
 *
 * ## Uma zona, um sítio — ou nenhum
 *
 * O sítio de uma zona sai do volume, e **não depende do ângulo**: uma zona tem sítio se o prédio tem a
 * peça que ela pinta (o lado do alçado, as varandas, o muro, a cobertura…). Por isso a numeração
 * não muda ao rodar. Fica «Fora do desenho», sem número, o que o volume não tem — escadas e átrio,
 * paredes interiores, tetos, outra superfície — e um alçado a mais do que a planta tem lados.
 *
 * ## O número segue o ângulo (a regra dos pinos)
 *
 * Ao rodar, as faces que se veem mudam, e o número de uma zona tem de estar numa face dela que se vê e se
 * lê **nessa vista**:
 *
 * 1. a face tem de estar virada para a câmara com `vista ≥ LEGIBILIDADE_DO_NUMERO` (0,35: a menos de ~70°
 *    de frente; uma parede de perfil não leva número);
 * 2. o ponto do número não pode estar tapado por nenhuma face desenhada depois dela (só as janelas e a porta não
 *    tapam: estão na parede; um lado por entregar tapa, tem enchimento) — procura-se, a começar pelo sítio preferido
 *    do tipo de zona, o primeiro ponto de uma grelha que esteja livre;
 * 3. se nenhuma face da zona cumpre, a zona fica **oculta nesta vista**: continua com o seu número e o seu
 *    cartão, sem pino. `vistaParaVer` diz o ângulo mais próximo onde ela se vê de frente (`vista ≥ 0,7`),
 *    e o ecrã oferece «Ver no desenho», que roda até lá.
 *
 * ## As cotas ficam onde as ligações não passam
 *
 * As ligações das zonas chegam ao desenho pela esquerda (as da frente) e pela direita (a empena, o
 * muro). Na maqueta B as cotas estavam à esquerda e em baixo, e as ligações atravessavam-nas: o juiz
 * apontou a da varanda a cortar a cota da altura. Aqui a frente mede-se por cima (na aresta de trás
 * do telhado, que tem o mesmo comprimento), o fundo na aresta esquerda do telhado e a altura na
 * aresta de trás da direita — tudo por cima e atrás do prédio, onde nenhuma ligação precisa de ir.
 * A garantia, essa, não é a disposição: é `chamadas.ts`, que recusa qualquer ligação que cruze uma
 * cota.
 */

export type Ponto = [number, number];

export interface ZonaParaDesenho {
  id: string;
  kind: SurfaceKind;
  participacao: Participacao;
  /** O lado da planta a que a zona pertence (`request_surfaces.face_do_predio`); nulo: atribui-se pelo nome ou pela ordem. */
  face?: string | null;
  /** O nome que lhe deram («Tardoz», «Lateral esquerda»): diz o lado quando a zona não o guardou (`ladoPeloNome`). */
  descricao?: string | null;
}

export interface LugarDaZona {
  /** As faces do volume (índices em `volume.faces`) que a zona pinta, **nesta vista**. */
  faces: number[];
  /** Onde fica o número da zona, em unidades do desenho. Nulo: a zona não se vê nesta vista (ver `temSitio`). */
  pino: Ponto | null;
  /** O prédio tem a peça que a zona pinta, vejam-se ou não nesta vista. Não depende do ângulo: é o que numera. */
  temSitio: boolean;
  /** Quão de frente está a face do número (0 a 1). Nulo sem pino. */
  vista: number | null;
}

/** Abaixo disto, uma parede está de perfil demais para levar um número (cosseno do ângulo, no plano horizontal). */
export const LEGIBILIDADE_DO_NUMERO = 0.35;
/** A vista que `vistaParaVer` procura: a face do número de frente (≈ 45°). */
export const LEGIBILIDADE_PARA_VER = 0.7;

// --- Os alçados e o seu lado da planta ---------------------------------------------------------------

/** Uma zona de fachada ou de empena é um alçado: ocupa um lado da planta. */
export const ehAlcado = (kind: SurfaceKind) => kind === 'fachada' || kind === 'empena';

/** Menos de dois alçados não têm planta: o desenho é uma laje. */
export const ALCADOS_PARA_TER_PLANTA = 2;

export interface PlantaDoDesenho {
  /** Ainda sem planta: um painel com pouca profundidade. */
  laje: boolean;
  /** A forma desenhada. Sem forma no prédio, a banda (I) — presume-se enquanto ninguém responde. */
  forma: Forma;
  lados: LadoDaPlanta[];
  /** Há planta a desenhar, mas o prédio ainda não diz qual: é altura de perguntar. */
  porEscolher: boolean;
}

export function plantaDoDesenho(forma: Forma | null, zonas: readonly Pick<ZonaParaDesenho, 'kind'>[]): PlantaDoDesenho {
  const laje = zonas.filter((z) => ehAlcado(z.kind)).length < ALCADOS_PARA_TER_PLANTA;
  const usada: Forma = forma ?? 'I';
  return { laje, forma: usada, lados: laje ? LADOS_DA_LAJE : ladosDaPlanta(usada), porEscolher: !laje && forma === null };
}

/**
 * O lado que o nome de uma zona diz: «Tardoz» e «Traseiras» são o tardoz; «Fachada principal» e «Frente», a frente;
 * «Lateral esquerda», o lado esquerdo; «Empena direita», o direito. Só quando o nome diz **um** lado: «esquerda e direita»
 * não diz nenhum, e «Empena lado norte» também não. É um palpite para o desenho não pôr o «Tardoz» onde o cliente
 * escreveu «Lateral» — o lado guardado na zona manda sempre, e o editor deixa mudá-lo.
 */
export function ladoPeloNome(nome: string | null | undefined): Fachada | null {
  if (!nome) return null;
  const t = nome.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const diz: Record<Fachada, boolean> = {
    frente: /\b(frente|principal)\b/.test(t),
    tras: /\b(tardoz|traseiras?|posterior|tras)\b/.test(t),
    esquerda: /\besquerd[oa]s?\b/.test(t),
    direita: /\bdireit[oa]s?\b/.test(t),
  };
  const lados = (Object.keys(diz) as Fachada[]).filter((k) => diz[k]);
  return lados.length === 1 ? lados[0]! : null;
}

/** Os lados por que se tenta, pela ordem, quando um alçado não diz o seu: primeiro os que se veem na vista inicial. */
const ORDEM_DA_FACHADA = ['frente', 'direita', 'esquerda', 'tras'];
const ORDEM_DA_EMPENA = ['direita', 'esquerda', 'tras', 'frente'];

function ordemDosLados(kind: SurfaceKind, lados: readonly LadoDaPlanta[]): string[] {
  const pref = kind === 'empena' ? ORDEM_DA_EMPENA : ORDEM_DA_FACHADA;
  const ids = lados.map((l) => l.id);
  const primeiros = pref.filter((p) => ids.includes(p));
  // Depois os das asas, na ordem de direção e número (direita-2 antes de tras-2…).
  const resto = ids
    .filter((id) => !primeiros.includes(id))
    .sort((a, b) => pref.indexOf(a.split('-')[0]!) - pref.indexOf(b.split('-')[0]!) || a.localeCompare(b));
  return [...primeiros, ...resto];
}

/**
 * O lado da planta de cada alçado (e das varandas). O que a zona guardou vale, desde que o lado exista na
 * planta de agora e ninguém o tenha tomado primeiro; os outros alçados ficam com o primeiro lado livre pela
 * ordem acima. Sem planta (a laje) o único alçado é a frente. Um alçado sem lado (a planta não tem mais
 * lados) fica nulo — «Fora do desenho».
 *
 * As varandas assentam no lado que guardaram; sem ele, no primeiro alçado de fachada, ou na frente.
 */
export function atribuirFaces(
  zonas: readonly ZonaParaDesenho[],
  lados: readonly LadoDaPlanta[],
  laje: boolean,
): Record<string, string | null> {
  const res: Record<string, string | null> = {};
  const ids = new Set(lados.map((l) => l.id));
  const alcados = zonas.filter((z) => ehAlcado(z.kind));
  if (laje) {
    alcados.forEach((z, i) => (res[z.id] = i === 0 ? 'frente' : null));
  } else {
    const tomadas = new Set<string>();
    for (const z of alcados) {
      if (z.face && ids.has(z.face) && !tomadas.has(z.face)) {
        res[z.id] = z.face;
        tomadas.add(z.face);
      }
    }
    // Sem lado guardado: o que o nome diz, se estiver livre…
    for (const z of alcados) {
      if (z.id in res) continue;
      const pelaNome = ladoPeloNome(z.descricao);
      if (pelaNome && ids.has(pelaNome) && !tomadas.has(pelaNome)) {
        res[z.id] = pelaNome;
        tomadas.add(pelaNome);
      }
    }
    // …e os outros, pela ordem.
    for (const z of alcados) {
      if (z.id in res) continue;
      const livre = ordemDosLados(z.kind, lados).find((id) => !tomadas.has(id));
      res[z.id] = livre ?? null;
      if (livre) tomadas.add(livre);
    }
  }
  const primeira = alcados.find((a) => a.kind === 'fachada' && res[a.id]);
  for (const z of zonas) {
    if (z.kind !== 'varandas') continue;
    res[z.id] = laje ? 'frente' : z.face && ids.has(z.face) ? z.face : primeira ? res[primeira.id]! : 'frente';
  }
  return res;
}

const lerp = (a: Ponto, b: Ponto, t: number): Ponto => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
/**
 * Um ponto dentro de uma face de quatro cantos, pela ordem de `buildingVolume`: base-a, base-b,
 * topo-b, topo-a. `u` corre ao longo da base, `v` de baixo para cima (ou de trás para a frente, num
 * plano horizontal).
 */
export const naFace = (q: readonly Ponto[], u: number, v: number): Ponto => lerp(lerp(q[0]!, q[1]!, u), lerp(q[3]!, q[2]!, u), v);
const centro = (q: readonly Ponto[]): Ponto => [q.reduce((n, p) => n + p[0], 0) / q.length, q.reduce((n, p) => n + p[1], 0) / q.length];
export const areaDoPoligono = (q: readonly Ponto[]) =>
  Math.abs(q.reduce((n, p, i) => n + p[0] * q[(i + 1) % q.length]![1] - q[(i + 1) % q.length]![0] * p[1], 0)) / 2;

/**
 * As faces que uma zona pode pintar no desenho. É `facesDaZona`, com uma exceção: as guardas das
 * varandas (`grade`) são das varandas — a zona chama-se «Varandas (tetos e guardas)» — a não ser que
 * haja uma zona própria de elementos metálicos, que é então quem as pinta.
 */
function facesPossiveis(kind: SurfaceKind, haMetalicos: boolean): Set<FaceKind> {
  const k = new Set<FaceKind>(facesDaZona(kind));
  if (kind === 'varandas' && !haMetalicos) k.add('grade');
  return k;
}

type FaceProj = Volume['faces'][number];

/** O ponto não está tapado por nenhum polígono desenhado depois da face `i` (e que não seja da mesma zona)? */
function livreDeOutras(v: Volume, i: number, p: Ponto, daZona: ReadonlySet<number>): boolean {
  for (let j = i + 1; j < v.faces.length; j++) {
    const f = v.faces[j]!;
    // As janelas e a porta estão na parede, e o vizinho esbate-se. Um lado por entregar **tapa**: tem o enchimento
    // leve de um alçado que ainda não existe, e um número por trás dele leria-se como uma zona vista através de uma
    // parede.
    if (f.fade || f.kind === 'janela' || f.kind === 'porta') continue;
    if (daZona.has(j)) continue;
    if (dentroDoPoligono(p, f.points)) return false;
  }
  return true;
}

/** A grelha de pontos de uma face, do preferido para os mais afastados dele. */
function amostras(pref: [number, number]): [number, number][] {
  const grelha: [number, number][] = [];
  for (const v of [0.8, 0.6, 0.4, 0.2]) for (const u of [0.12, 0.3, 0.5, 0.7, 0.88]) grelha.push([u, v]);
  return [pref, ...grelha.sort((a, b) => Math.hypot(a[0] - pref[0], a[1] - pref[1]) - Math.hypot(b[0] - pref[0], b[1] - pref[1]))];
}

/**
 * Onde, numa face, o número prefere ficar. As ligações chegam ao desenho pela esquerda (as da fachada e das
 * varandas) e pela direita (a empena, o muro), por isso o número fica do lado do ecrã de onde a ligação vem —
 * à esquerda ou à direita **no ecrã**, qualquer que seja o ângulo a que a face está.
 */
function preferido(kind: SurfaceKind, f: FaceProj): [number, number] {
  // Em que extremo da face (u = 0 ou u = 1) o x do ecrã é menor.
  const uEsquerda = f.points[0]![0] + f.points[3]![0] <= f.points[1]![0] + f.points[2]![0] ? 0 : 1;
  const aEsquerda = (u: number) => (uEsquerda === 0 ? u : 1 - u);
  const aDireita = (u: number) => (uEsquerda === 0 ? 1 - u : u);
  switch (kind) {
    case 'fachada':
      // No alto, junto à esquina da esquerda.
      return [aEsquerda(0.12), 0.8];
    case 'empena':
      return [0.5, 0.6];
    case 'varandas':
      return [aEsquerda(0.06), 0.5];
    case 'muro':
      return [aDireita(0.14), 0.55];
    default:
      return [0.5, 0.5];
  }
}

/** A ordem por que se tentam as faces de uma zona: as maiores primeiro; nas varandas e nas guardas, a do meio. */
function ordemDeFaces(kind: SurfaceKind, idx: number[], v: Volume): number[] {
  const area = (i: number) => areaDoPoligono(v.faces[i]!.points);
  if (kind === 'varandas' || kind === 'elementos_metalicos') {
    const dosTipos = (k: FaceKind) =>
      idx.filter((i) => v.faces[i]!.kind === k).sort((a, b) => centro(v.faces[a]!.points)[1] - centro(v.faces[b]!.points)[1]);
    const doMeio = (xs: number[]) => {
      if (xs.length === 0) return xs;
      const max = Math.max(...xs.map(area));
      const grandes = xs.filter((i) => area(i) > max * 0.5);
      const m = Math.floor(grandes.length / 2);
      // Do meio para fora, alternando.
      return grandes.map((_, k) => grandes[m + (k % 2 === 0 ? k / 2 : -(k + 1) / 2)]).filter((x): x is number => x !== undefined);
    };
    return [...doMeio(dosTipos('varanda')), ...doMeio(dosTipos('grade'))];
  }
  return [...idx].sort((a, b) => area(b) - area(a));
}

/**
 * Que faces pinta cada zona **nesta vista** e onde fica o seu número (a regra dos pinos, no cabeçalho do
 * ficheiro). Uma face é de uma zona só: a primeira que a pede. Os lados dos alçados vêm de `atribuirFaces`.
 */
export function lugaresDasZonas(v: Volume, zonas: readonly ZonaParaDesenho[]): Record<string, LugarDaZona> {
  const haMetalicos = zonas.some((z) => z.kind === 'elementos_metalicos');
  const faces = atribuirFaces(zonas, v.lados, v.laje);
  const tomadas = new Set<number>();
  const lugares: Record<string, LugarDaZona> = {};
  // Primeiro tudo o que cada zona pinta, para o teste do «tapado» saber o que é da própria zona.
  const dasZonas = zonas.map((z) => {
    const possiveis = facesPossiveis(z.kind, haMetalicos);
    const lado = ehAlcado(z.kind) || z.kind === 'varandas' ? (faces[z.id] ?? null) : undefined;
    const sitio = lado === null ? false : v.pecas.some((p) => possiveis.has(p.kind) && (lado === undefined || p.face === lado));
    const idx: number[] = [];
    v.faces.forEach((f, i) => {
      if (f.fade || !possiveis.has(f.kind) || tomadas.has(i)) return;
      if (lado !== undefined && f.face !== lado) return;
      idx.push(i);
      tomadas.add(i);
    });
    return { z, idx, sitio };
  });
  for (const { z, idx, sitio } of dasZonas) {
    const daZona = new Set(idx);
    let pino: Ponto | null = null;
    let vista: number | null = null;
    const legiveis = idx.filter((i) => (v.faces[i]!.vista ?? 1) >= LEGIBILIDADE_DO_NUMERO);
    procura: for (const i of ordemDeFaces(z.kind, legiveis, v)) {
      const f = v.faces[i]!;
      for (const [u, w] of amostras(preferido(z.kind, f))) {
        const p = naFace(f.points, u, w);
        if (livreDeOutras(v, i, p, daZona)) {
          pino = p;
          vista = f.vista ?? 1;
          break procura;
        }
      }
    }
    lugares[z.id] = { faces: idx, pino, temSitio: sitio, vista };
  }
  return lugares;
}

/**
 * O ângulo mais próximo de `atual`, em passos de `passo` graus, onde a zona se vê de frente (o número
 * numa face com `vista ≥ LEGIBILIDADE_PARA_VER`). Nulo se nenhum ângulo serve (a zona não tem sítio no
 * desenho). Em empate roda-se para o lado positivo. `volumeEm` desenha o prédio a um ângulo.
 */
export function vistaParaVer(
  volumeEm: (angulo: number) => Volume,
  zonas: readonly ZonaParaDesenho[],
  id: string,
  atual: number,
  passo = 5,
): number | null {
  const norm = (a: number) => ((a % 360) + 360) % 360;
  for (let d = 0; d <= 180; d += passo) {
    for (const a of d === 0 ? [0] : [d, -d]) {
      const angulo = norm(atual + a);
      const l = lugaresDasZonas(volumeEm(angulo), zonas)[id];
      if (l?.pino && (l.vista ?? 1) >= LEGIBILIDADE_PARA_VER) return angulo;
    }
  }
  return null;
}

/** Os tipos de zona que o pedido vazio oferece em cima do próprio desenho. */
export type TipoNoDesenho = 'fachada' | 'empena' | 'varandas';

/**
 * Onde pôr, no pedido ainda sem zonas, o «+ Fachada», o «+ Empena» e o «+ Varandas»: no meio da
 * face que cada um pintaria (proposta B, 05/11/2026: tocar na parte do prédio). Só os que o desenho
 * tem — sem empena à vista (um prédio isolado), não há «+ Empena» no desenho, só na lista.
 */
export function sitiosParaAcrescentar(v: Volume): { tipo: TipoNoDesenho; p: Ponto }[] {
  const tipos: TipoNoDesenho[] = ['fachada', 'empena', 'varandas'];
  const lugares = lugaresDasZonas(
    v,
    tipos.map((t) => ({ id: t, kind: t, participacao: 'incluida' as const })),
  );
  const faces = (t: TipoNoDesenho, k: FaceKind) =>
    (lugares[t]?.faces ?? [])
      .map((i) => v.faces[i]!)
      .filter((f) => f.kind === k)
      .map((f) => f.points as Ponto[]);
  const maior = (qs: Ponto[][]) => [...qs].sort((a, b) => areaDoPoligono(b) - areaDoPoligono(a))[0] ?? null;
  const sitios: { tipo: TipoNoDesenho; p: Ponto }[] = [];
  const frente = maior(faces('fachada', 'frente'));
  if (frente) sitios.push({ tipo: 'fachada', p: naFace(frente, 0.5, 0.82) });
  const empena = maior(faces('empena', 'empena'));
  if (empena) sitios.push({ tipo: 'empena', p: naFace(empena, 0.5, 0.45) });
  // As lajes, de cima para baixo: a do meio.
  const lajes = faces('varandas', 'varanda');
  const max = Math.max(0, ...lajes.map(areaDoPoligono));
  const grandes = lajes.filter((q) => areaDoPoligono(q) > max * 0.5).sort((a, b) => centro(a)[1] - centro(b)[1]);
  const laje = grandes[Math.floor(grandes.length / 2)];
  if (laje) sitios.push({ tipo: 'varandas', p: centro(laje) });
  return sitios;
}

/** O prédio, tal como foi declarado: o que o desenho precisa de saber dele. */
export interface PredioParaDesenho {
  pisos: number | null;
  fachadas: number | null;
  temVarandas: boolean;
  moradia: boolean;
  forma: Forma | null;
  janelas?: Partial<Record<'frente' | 'esquerda' | 'direita' | 'tras', number | null>>;
}

/** O ângulo a que o passo 2 vê o prédio, à partida: a frente e a lateral direita, como em todo o lado. */
export const ANGULO_DO_DESENHO = 25;

/**
 * A entrada do volume a partir do prédio e das zonas. Uma função só, para o desenho (no navegador) e
 * para a numeração das fotografias (no servidor) darem os mesmos números.
 *
 * O que o prédio **tem** deduz-se do que foi declarado: não há sítio nenhum onde alguém diga «este
 * prédio tem muro», e uma zona de muro é a melhor pista. A participação não conta — uma zona deixada
 * de fora continua a existir no prédio.
 *
 * O desenho é por alçados: cada alçado entregue dá um lado da planta com parede e vãos. Sem nenhum, a
 * frente desenha-se como painel genérico, para o pedido vazio ter onde se tocar (`+ Fachada`).
 */
export function entradaDoVolume(
  predio: PredioParaDesenho,
  zonas: readonly ZonaParaDesenho[],
  escala: VolumeInput['escala'] = null,
  angulo: number = ANGULO_DO_DESENHO,
): VolumeInput {
  const tem = (k: SurfaceKind) => zonas.some((z) => z.kind === k);
  const planta = plantaDoDesenho(predio.forma, zonas);
  const faces = atribuirFaces(zonas, planta.lados, planta.laje);
  const alcados = zonas.flatMap((z) =>
    ehAlcado(z.kind) && faces[z.id] ? [{ face: faces[z.id]!, tipo: z.kind as 'fachada' | 'empena' }] : [],
  );
  const varandas = zonas.find((z) => z.kind === 'varandas');
  return {
    pisos: predio.pisos,
    fachadas: predio.fachadas,
    temVarandas: predio.temVarandas || tem('varandas'),
    moradia: predio.moradia,
    forma: planta.forma,
    laje: planta.laje,
    alcados: alcados.length > 0 ? alcados : [{ face: 'frente', tipo: 'fachada' }],
    varandasEm: varandas ? faces[varandas.id] : null,
    janelas: predio.janelas,
    angulo,
    escala,
    elementos: { muro: tem('muro'), metalicos: tem('elementos_metalicos'), beirais: tem('beirais_cobertura') },
  };
}

/** Os números das zonas de um pedido, sem desenhar nada: para quem só precisa deles (as fotografias). */
export function numeracaoDoPedido(predio: PredioParaDesenho, zonas: readonly ZonaParaDesenho[]): ZonaNumerada[] {
  const v = buildingVolume(entradaDoVolume(predio, zonas));
  return numerarZonas(zonas, lugaresDasZonas(v, zonas));
}

export type GrupoDaZona = 'no_desenho' | 'fora_do_desenho' | 'fora_do_pedido';

export interface ZonaNumerada {
  id: string;
  /** O número que liga o cartão, o desenho e as fotografias. Nulo: a zona não tem sítio no desenho. */
  n: number | null;
  grupo: GrupoDaZona;
}

/**
 * A ordem da lista e os números. Primeiro as zonas do pedido com sítio no desenho, numeradas pela
 * ordem em que foram registadas; depois as que o desenho não mostra («Fora do desenho», sem número);
 * no fim as excluídas («Fora do pedido»), que continuam numeradas quando têm sítio — o muro continua
 * lá, só não vai ser pintado.
 */
export function numerarZonas(zonas: readonly ZonaParaDesenho[], lugares: Record<string, LugarDaZona>): ZonaNumerada[] {
  const comSitio = (z: ZonaParaDesenho) => !!lugares[z.id]?.temSitio;
  const fora = (z: ZonaParaDesenho) => z.participacao === 'excluida';
  const ordem: { z: ZonaParaDesenho; grupo: GrupoDaZona }[] = [
    ...zonas.filter((z) => !fora(z) && comSitio(z)).map((z) => ({ z, grupo: 'no_desenho' as const })),
    ...zonas.filter((z) => !fora(z) && !comSitio(z)).map((z) => ({ z, grupo: 'fora_do_desenho' as const })),
    ...zonas.filter(fora).map((z) => ({ z, grupo: 'fora_do_pedido' as const })),
  ];
  let n = 0;
  return ordem.map(({ z, grupo }) => ({ id: z.id, grupo, n: comSitio(z) ? ++n : null }));
}

// --- As cotas ------------------------------------------------------------------------------------

export type EixoDaCota = 'frente' | 'fundo' | 'altura';

export interface CotaDoDesenho {
  eixo: EixoDaCota;
  /** A linha da cota, afastada do prédio. */
  linha: [Ponto, Ponto];
  /** As linhas de chamada, da aresta do prédio à linha da cota. */
  chamadas: [Ponto, Ponto][];
  texto: string;
  /** Onde fica o texto, e para que lado cresce: sempre para longe do prédio. */
  rotulo: Ponto;
  alinhar: 'centro' | 'esquerda' | 'direita';
}

const mais = (a: Ponto, b: Ponto): Ponto => [a[0] + b[0], a[1] + b[1]];
const vezes = (a: Ponto, k: number): Ponto => [a[0] * k, a[1] * k];

/**
 * As cotas dos eixos com texto (só se passam os eixos que alguém mediu ou estimou: um eixo por medir
 * não leva linha nenhuma). `afastamento` é a distância da aresta à linha; `letra`, a altura do texto —
 * ambos em unidades do desenho, para quem desenha os poder dar em píxeis à escala que vai usar.
 */
export function cotasDoDesenho(
  v: Volume,
  textos: Partial<Record<EixoDaCota, string>>,
  { afastamento, letra, caracter = letra * 0.37 }: { afastamento: number; letra: number; caracter?: number },
): CotaDoDesenho[] {
  const cotasNaVista = v.cotasDaPrancheta;
  const cotas: CotaDoDesenho[] = [];

  // As faces do prédio (sem os vizinhos, que se esbatem): uma cota afasta-se até a linha e o texto
  // ficarem fora delas. Num prédio em L, a asa de trás fica por cima do telhado, e o «12 m» assentava
  // nela (cético, 05/11/2026).
  const corpo = v.faces.filter((f) => !f.fade).map((f) => f.points as Ponto[]);
  const livre = (linha: [Ponto, Ponto], c: Pick<CotaDoDesenho, 'rotulo' | 'alinhar' | 'texto'>) => {
    const k = caixaDoRotulo(c, { letra, caracter });
    const cantos: Ponto[] = [
      [k.x, k.y],
      [k.x + k.w, k.y],
      [k.x + k.w, k.y + k.h],
      [k.x, k.y + k.h],
    ];
    return corpo.every(
      (q) =>
        !cantos.some((p) => dentroDoPoligono(p, q)) &&
        !q.some((p) => dentroDoPoligono(p, cantos)) &&
        !q.some((p, i) => segmentosCruzam(linha[0], linha[1], p, q[(i + 1) % q.length]!)) &&
        !cantos.some((p, i) => q.some((r, j) => segmentosCruzam(p, cantos[(i + 1) % 4]!, r, q[(j + 1) % q.length]!))),
    );
  };
  /** A cota a `d` da aresta [a, b], para o lado `fora` (unitário). */
  const cotaA = (a: Ponto, b: Ponto, fora: Ponto, d: number, texto: string, rotulo: (a2: Ponto, b2: Ponto) => Ponto) => {
    const a2 = mais(a, vezes(fora, d));
    const b2 = mais(b, vezes(fora, d));
    return { linha: [a2, b2] as [Ponto, Ponto], chamadas: [[a, a2] as [Ponto, Ponto], [b, b2] as [Ponto, Ponto]], rotulo: rotulo(a2, b2) };
  };
  /** Afasta-se em passos de meia letra, até estar livre (ou até dez letras: aí fica onde está). */
  const afastada = (
    eixo: EixoDaCota,
    a: Ponto,
    b: Ponto,
    fora: Ponto,
    texto: string,
    alinhar: CotaDoDesenho['alinhar'],
    rotulo: (a2: Ponto, b2: Ponto) => Ponto,
  ): CotaDoDesenho => {
    let c = cotaA(a, b, fora, afastamento, texto, rotulo);
    for (let d = afastamento; d <= afastamento + letra * 10; d += letra / 2) {
      c = cotaA(a, b, fora, d, texto, rotulo);
      if (livre(c.linha, { rotulo: c.rotulo, alinhar, texto })) break;
    }
    return { eixo, ...c, texto, alinhar };
  };

  if (textos.frente) {
    // Na aresta do telhado mais afastada da câmara: por cima de tudo, qualquer que seja o ângulo.
    const [a, b] = cotasNaVista.largura;
    cotas.push(afastada('frente', a, b, [0, -1], textos.frente, 'centro', (a2, b2) => mais(lerp(a2, b2, 0.5), [0, -letra * 0.7])));
  }

  if (textos.fundo) {
    // Na aresta do telhado mais à esquerda no ecrã, afastada para a esquerda.
    const [a, b] = cotasNaVista.fundo;
    const fora = cotasNaVista.foraDoFundo;
    cotas.push(afastada('fundo', a, b, fora, textos.fundo, 'direita', (a2, b2) => mais(lerp(a2, b2, 0.5), vezes(fora, letra * 0.4))));
  }

  if (textos.altura) {
    // Na esquina vertical mais à direita no ecrã.
    const [a, b] = cotasNaVista.altura;
    const a2 = mais(a, [afastamento, 0]);
    const b2 = mais(b, [afastamento, 0]);
    cotas.push({
      eixo: 'altura',
      linha: [a2, b2],
      chamadas: [
        [a, a2],
        [b, b2],
      ],
      texto: textos.altura,
      rotulo: mais(lerp(a2, b2, 0.5), [letra * 0.4, 0]),
      alinhar: 'esquerda',
    });
  }
  return cotas;
}

export interface CaixaDoTexto {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** O retângulo que o texto de uma cota ocupa, para quem não quer que nada lhe passe por cima. */
export function caixaDoRotulo(
  c: Pick<CotaDoDesenho, 'rotulo' | 'alinhar' | 'texto'>,
  medida: { letra: number; caracter: number },
): CaixaDoTexto {
  const w = c.texto.length * medida.caracter + medida.caracter;
  const h = medida.letra;
  const x = c.alinhar === 'centro' ? c.rotulo[0] - w / 2 : c.alinhar === 'direita' ? c.rotulo[0] - w : c.rotulo[0];
  return { x, y: c.rotulo[1] - h / 2, w, h };
}

export interface DesenhoDasZonas {
  /** Para cada face do volume, a zona que a pinta (ou nula). */
  zonaDaFace: (string | null)[];
  pinos: { id: string; p: Ponto }[];
  cotas: CotaDoDesenho[];
  /** O que o desenho ocupa, cotas e textos incluídos: [x, y, largura, altura]. */
  caixa: [number, number, number, number];
}

/**
 * O desenho todo, para uma escala (`pxPorUnidade`): as distâncias e os textos das cotas medem-se em
 * píxeis no ecrã, e é a escala que os converte. Quem desenha a outra escala chama outra vez.
 */
export function desenharZonas(
  v: Volume,
  zonas: readonly ZonaParaDesenho[],
  textos: Partial<Record<EixoDaCota, string>>,
  pxPorUnidade: number,
  caixaMinima?: readonly [number, number, number, number],
): DesenhoDasZonas {
  const s = pxPorUnidade > 0 ? pxPorUnidade : 1;
  const medida = { letra: 20 / s, caracter: 7.4 / s };
  const lugares = lugaresDasZonas(v, zonas);
  const zonaDaFace: (string | null)[] = v.faces.map(() => null);
  for (const z of zonas) for (const i of lugares[z.id]?.faces ?? []) zonaDaFace[i] = z.id;
  const pinos = zonas.flatMap((z) => (lugares[z.id]?.pino ? [{ id: z.id, p: lugares[z.id]!.pino! }] : []));
  const cotas = cotasDoDesenho(v, textos, { afastamento: 22 / s, letra: medida.letra, caracter: medida.caracter });

  // A caixa: o prédio (sem os vizinhos, que se esbatem para fora e não precisam de caber), as cotas e os
  // seus textos, e uma margem do tamanho de meio número de zona.
  const pts = v.faces.filter((f) => !f.fade).flatMap((f) => f.points as Ponto[]);
  for (const c of cotas) {
    pts.push(...c.linha);
    const r = caixaDoRotulo(c, medida);
    pts.push([r.x, r.y], [r.x + r.w, r.y + r.h]);
  }
  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  const m = 16 / s;
  let x0 = Math.min(...xs) - m;
  let y0 = Math.min(...ys) - m;
  let x1 = Math.max(...xs) + m;
  let y1 = Math.max(...ys) + m;
  // A caixa de todas as vistas (`caixaDaVolta`): rodar não muda a moldura nem a escala do desenho.
  if (caixaMinima) {
    x0 = Math.min(x0, caixaMinima[0]);
    y0 = Math.min(y0, caixaMinima[1]);
    x1 = Math.max(x1, caixaMinima[0] + caixaMinima[2]);
    y1 = Math.max(y1, caixaMinima[1] + caixaMinima[3]);
  }
  return { zonaDaFace, pinos, cotas, caixa: [x0, y0, x1 - x0, y1 - y0] };
}

/** Os ângulos por que se mede a moldura de uma volta inteira: de 30° em 30°, e a vista inicial. */
const VISTAS_DA_VOLTA = [...Array.from({ length: 12 }, (_, i) => i * 30), ANGULO_DO_DESENHO];

/**
 * A caixa que cabe o prédio, com as cotas, **em qualquer vista**: a união das caixas de treze vistas (de 30° em
 * 30°, e a inicial). O desenho usa-a como mínima, e por isso a moldura e a escala não mexem enquanto se roda — como um
 * prato giratório, e não um prédio que respira. `pxPorUnidade` é a escala a que se medem as cotas (o seu
 * tamanho em unidades do desenho depende dela); as vistas são medidas sem zonas, só o prédio e as cotas.
 */
export function caixaDaVolta(
  volumeEm: (angulo: number) => Volume,
  textos: Partial<Record<EixoDaCota, string>>,
  pxPorUnidade = 16,
): [number, number, number, number] {
  let caixa: [number, number, number, number] | null = null;
  for (const a of VISTAS_DA_VOLTA) {
    const [x, y, w, h] = desenharZonas(volumeEm(a), [], textos, pxPorUnidade).caixa;
    caixa = caixa
      ? [Math.min(caixa[0], x), Math.min(caixa[1], y), Math.max(caixa[0] + caixa[2], x + w) - Math.min(caixa[0], x), Math.max(caixa[1] + caixa[3], y + h) - Math.min(caixa[1], y)]
      : [x, y, w, h];
  }
  return caixa!;
}

// --- A prancheta larga: o desenho ao centro e os cartões à volta ---------------------------------

export interface PranchetaLarga {
  desenho: DesenhoDasZonas;
  /** De unidades do desenho para píxeis da prancheta: x·escala + dx, y·escala + dy. */
  escala: number;
  dx: number;
  dy: number;
  coluna: number;
  corredor: number;
  /** A altura do desenho, em px. A prancheta pode ser mais alta, se os cartões o pedirem. */
  alturaDoDesenho: number;
  /** As faces do desenho em px, com a zona de cada uma: o que a regra das ligações verificou. */
  faces: FaceDaPrancheta[];
  /** Nula quando as ligações não cumprem a regra (`chamadas.ts`): fica-se no modo lista. */
  disposicao: Disposicao | null;
  /** O que se perguntou a `disporChamadas`, para quem quer verificar a regra (`problemasDasLigacoes`). */
  entrada: EntradaDasChamadas;
}

/** A largura de cada coluna de cartões das chamadas, para uma prancheta de `largura` px. */
export const colunaDasChamadas = (largura: number) => Math.round(Math.min(330, Math.max(270, largura * 0.27)));

/**
 * A prancheta com chamadas, para uma `largura` em px: a coluna dos cartões de cada lado, o desenho
 * no meio à maior escala que lá cabe (até `alturaMaxima`), e a disposição das chamadas. A escala
 * decide o tamanho dos textos das cotas em unidades do desenho, e esses decidem a caixa — por isso
 * se acerta duas vezes.
 *
 * Três diferenças para o desenho do modo lista, todas para as ligações terem por onde passar:
 *
 * - **sem a cota da altura**: ficava na aresta de trás, à direita, e obrigava o número da empena a
 *   descer para o canto de baixo, longe do cartão (a altura está na linha do prédio, logo por baixo);
 * - **só as zonas do pedido têm cartão à volta**: as excluídas ficam com o número no desenho e o
 *   cartão no grupo «Fora do pedido», por baixo — como no modo lista (cético, 05/11/2026);
 * - as faces vão para a verificação, para nenhuma ligação atravessar a zona de outro número.
 */
export function pranchetaLarga(
  v: Volume,
  zonas: readonly ZonaParaDesenho[],
  textos: Partial<Record<EixoDaCota, string>>,
  {
    largura,
    alturas,
    alturaMaxima = 400,
    rodape,
    caixaMinima,
  }: {
    largura: number;
    alturas: Record<string, number>;
    alturaMaxima?: number;
    rodape?: number;
    /** A caixa de todas as vistas (`caixaDaVolta`), para a moldura não mexer ao rodar. */
    caixaMinima?: readonly [number, number, number, number];
  },
): PranchetaLarga {
  const semAltura: Partial<Record<EixoDaCota, string>> = { ...textos, altura: undefined };
  const coluna = colunaDasChamadas(largura);
  const corredor = 32;
  const x0 = coluna + corredor;
  const w = Math.max(1, largura - 2 * x0);
  let escala = 15;
  let desenho = desenharZonas(v, zonas, semAltura, escala, caixaMinima);
  for (let i = 0; i < 3; i++) {
    const [, , cw, ch] = desenho.caixa;
    escala = Math.min(w / cw, alturaMaxima / ch);
    desenho = desenharZonas(v, zonas, semAltura, escala, caixaMinima);
  }
  const [cx, cy, cw, ch] = desenho.caixa;
  const dx = x0 + (w - cw * escala) / 2 - cx * escala;
  const dy = -cy * escala;
  const px = (p: Ponto): Ponto => [p[0] * escala + dx, p[1] * escala + dy];

  const medida = { letra: 20 / escala, caracter: 7.4 / escala };
  const obstaculos: Obstaculos = { segmentos: [], caixas: [] };
  for (const c of desenho.cotas) {
    obstaculos.segmentos.push([px(c.linha[0]), px(c.linha[1])], ...c.chamadas.map(([a, b]) => [px(a), px(b)] as [Ponto, Ponto]));
    const r = caixaDoRotulo(c, medida);
    obstaculos.caixas.push({ x: r.x * escala + dx, y: r.y * escala + dy, w: r.w * escala, h: r.h * escala });
  }
  // As faces, pela ordem em que se pintam. As janelas e as portas ficam de fora: estão na parede, e
  // a parede é de quem a pinta.
  const faces: FaceDaPrancheta[] = v.faces.flatMap((f, i) =>
    f.fade || f.kind === 'janela' || f.kind === 'porta' ? [] : [{ zona: desenho.zonaDaFace[i] ?? null, pontos: f.points.map(px) }],
  );
  const fora = new Set(zonas.filter((z) => z.participacao === 'excluida').map((z) => z.id));
  const xs = v.faces.filter((f) => !f.fade).flatMap((f) => f.points.map((p) => p[0]));
  const centroX = ((Math.min(...xs) + Math.max(...xs)) / 2) * escala + dx;
  const alturaDoDesenho = ch * escala;
  const pinos = desenho.pinos.map(({ id, p }) => ({ id, p: px(p) }));
  const entrada: EntradaDasChamadas = {
    largura,
    altura: alturaDoDesenho,
    coluna,
    corredor,
    centroX,
    pinos: pinos.filter((p) => !fora.has(p.id)),
    outrosPinos: pinos.filter((p) => fora.has(p.id)),
    alturas,
    obstaculos,
    faces,
    rodape,
  };
  const disposicao = disporChamadas(entrada);
  return { desenho, escala, dx, dy, coluna, corredor, alturaDoDesenho, faces, disposicao, entrada };
}
