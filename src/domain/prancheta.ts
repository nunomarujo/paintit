import { facesDaZona } from './geometria';
import { dentroDoPoligono, disporChamadas, segmentosCruzam, type Disposicao, type FaceDaPrancheta, type Obstaculos } from './chamadas';
import type { Participacao, SurfaceKind } from './request';
import { buildingVolume, type FaceKind, type Forma, type Volume, type VolumeInput } from './volume';

/**
 * O desenho do passo 2 do pedido (proposta B, «o prédio ao centro», escolhida pelo promotor a
 * 05/11/2026): o volume do prédio com as zonas pintadas por cima, o número de cada zona no sítio
 * dela e as cotas das medidas que alguém deu.
 *
 * O volume é o de sempre (`buildingVolume`, em `volume.ts`); o que este ficheiro acrescenta é a
 * ligação às zonas — que faces pinta cada uma, onde fica o seu número, que número tem — e o sítio
 * das cotas. Tudo em unidades do desenho, sem nada de ecrã: quem desenha converte para píxeis.
 *
 * ## Uma zona, um sítio — ou nenhum
 *
 * O sítio de uma zona sai de `facesDaZona` (`geometria.ts`), a ligação única entre zonas e desenho.
 * Uma face só pode ser de uma zona: a primeira fachada fica com a frente (e com as laterais à vista,
 * porque o pedido não diz qual das fachadas é); uma segunda fachada já não tem onde ficar. Em vez de
 * escolher uma face à sorte e o cliente julgar que a plataforma sabe qual é, a zona vai para o grupo
 * **«Fora do desenho»**, sem número. O mesmo para as zonas que o volume não tem (escadas e átrio,
 * paredes interiores, tetos, outra superfície).
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
}

export interface LugarDaZona {
  /** As faces do volume (índices em `volume.faces`) que a zona pinta. */
  faces: number[];
  /** Onde fica o número da zona, em unidades do desenho. Nulo: a zona não se vê no volume. */
  pino: Ponto | null;
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

/** O sítio do número de uma zona, dentro das faces que ela pinta. */
function pinoDaZona(kind: SurfaceKind, faces: { kind: FaceKind; points: Ponto[] }[]): Ponto | null {
  const maior = (k: FaceKind) =>
    faces.filter((f) => f.kind === k).sort((a, b) => areaDoPoligono(b.points) - areaDoPoligono(a.points))[0]?.points ?? null;
  /** A do meio, de cima para baixo, entre as maiores de um tipo (as lajes das varandas, as guardas). */
  const doMeio = (k: FaceKind) => {
    const todas = faces.filter((f) => f.kind === k);
    const max = Math.max(0, ...todas.map((f) => areaDoPoligono(f.points)));
    const grandes = todas.filter((f) => areaDoPoligono(f.points) > max * 0.5).sort((a, b) => centro(a.points)[1] - centro(b.points)[1]);
    return grandes[Math.floor(grandes.length / 2)]?.points ?? null;
  };
  switch (kind) {
    case 'fachada': {
      // No alto da frente, junto à esquina da esquerda: a ligação chega pela esquerda sem atravessar a fachada.
      const frente = maior('frente');
      if (frente) return naFace(frente, 0.12, 0.8);
      const lado = maior('lado');
      return lado ? naFace(lado, 0.75, 0.22) : null;
    }
    case 'empena': {
      // A meio da empena, um pouco acima: a ligação chega pela direita, onde nada mais está. (Ficava em
      // baixo, no canto da frente, para fugir à cota da altura; as chamadas deixaram de a desenhar.)
      const e = maior('empena');
      return e ? naFace(e, 0.5, 0.6) : null;
    }
    case 'varandas': {
      // A laje do meio, na ponta da esquerda: a ligação chega pela esquerda e passa o mínimo por cima
      // da fachada, onde as varandas assentam.
      const laje = doMeio('varanda');
      return laje ? naFace(laje, 0.06, 0.5) : null;
    }
    case 'muro': {
      const m = maior('muro');
      return m ? naFace(m, 0.86, 0.55) : null;
    }
    case 'beirais_cobertura': {
      const topo = maior('topo');
      if (topo) return centro(topo);
      const b = maior('beiral');
      return b ? centro(b) : null;
    }
    case 'elementos_metalicos': {
      const g = doMeio('grade');
      return g ? centro(g) : null;
    }
    default:
      return null;
  }
}

/** Que faces pinta cada zona e onde fica o seu número. Uma face é de uma zona só: a primeira que a pede. */
export function lugaresDasZonas(v: Volume, zonas: readonly ZonaParaDesenho[]): Record<string, LugarDaZona> {
  const haMetalicos = zonas.some((z) => z.kind === 'elementos_metalicos');
  const tomadas = new Set<number>();
  const lugares: Record<string, LugarDaZona> = {};
  for (const z of zonas) {
    const possiveis = facesPossiveis(z.kind, haMetalicos);
    const faces: number[] = [];
    v.faces.forEach((f, i) => {
      if (!f.fade && possiveis.has(f.kind) && !tomadas.has(i)) faces.push(i);
    });
    for (const i of faces) tomadas.add(i);
    lugares[z.id] = {
      faces,
      pino:
        faces.length > 0
          ? pinoDaZona(
              z.kind,
              faces.map((i) => ({ kind: v.faces[i]!.kind, points: v.faces[i]!.points })),
            )
          : null,
    };
  }
  return lugares;
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

/** O ângulo a que o passo 2 vê o prédio: a frente e a lateral direita, como em todo o lado. */
export const ANGULO_DO_DESENHO = 25;

/**
 * A entrada do volume a partir do prédio e das zonas. Uma função só, para o desenho (no navegador) e
 * para a numeração das fotografias (no servidor) darem os mesmos números.
 *
 * O que o prédio **tem** deduz-se do que foi declarado: não há sítio nenhum onde alguém diga «este
 * prédio tem muro», e uma zona de muro é a melhor pista. A participação não conta — uma zona deixada
 * de fora continua a existir no prédio.
 */
export function entradaDoVolume(
  predio: PredioParaDesenho,
  zonas: readonly Pick<ZonaParaDesenho, 'kind'>[],
  escala: VolumeInput['escala'] = null,
): VolumeInput {
  const tem = (k: SurfaceKind) => zonas.some((z) => z.kind === k);
  return {
    pisos: predio.pisos,
    fachadas: predio.fachadas,
    temVarandas: predio.temVarandas || tem('varandas'),
    moradia: predio.moradia,
    forma: predio.forma,
    janelas: predio.janelas,
    angulo: ANGULO_DO_DESENHO,
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
  const comSitio = (z: ZonaParaDesenho) => !!lugares[z.id]?.pino;
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
const menos = (a: Ponto, b: Ponto): Ponto => [a[0] - b[0], a[1] - b[1]];
const vezes = (a: Ponto, k: number): Ponto => [a[0] * k, a[1] * k];
const unitario = (a: Ponto): Ponto => {
  const l = Math.hypot(a[0], a[1]) || 1;
  return [a[0] / l, a[1] / l];
};

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
  const [fl, fr] = v.cotas.largura;
  const br = v.cotas.profundidade[0];
  const altura = menos(v.cotas.altura[1], v.cotas.altura[0]); // da base ao topo, na projeção
  const fundo = menos(br, fr); // da frente para trás
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
    // Na aresta de trás do telhado: o mesmo comprimento da frente, por cima de tudo.
    const a = mais(mais(fl, fundo), altura);
    const b = mais(mais(fr, fundo), altura);
    cotas.push(afastada('frente', a, b, [0, -1], textos.frente, 'centro', (a2, b2) => mais(lerp(a2, b2, 0.5), [0, -letra * 0.7])));
  }

  if (textos.fundo) {
    // Na aresta esquerda do telhado, afastada ao longo do eixo da frente, para fora.
    const a = mais(fl, altura);
    const b = mais(a, fundo);
    const fora = unitario(menos(fl, fr));
    cotas.push(afastada('fundo', a, b, fora, textos.fundo, 'direita', (a2, b2) => mais(lerp(a2, b2, 0.5), vezes(fora, letra * 0.4))));
  }

  if (textos.altura) {
    // Na aresta vertical de trás, à direita.
    const a = br;
    const b = mais(br, altura);
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
  const x0 = Math.min(...xs) - m;
  const y0 = Math.min(...ys) - m;
  return { zonaDaFace, pinos, cotas, caixa: [x0, y0, Math.max(...xs) + m - x0, Math.max(...ys) + m - y0] };
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
  }: { largura: number; alturas: Record<string, number>; alturaMaxima?: number; rodape?: number },
): PranchetaLarga {
  const semAltura: Partial<Record<EixoDaCota, string>> = { ...textos, altura: undefined };
  const coluna = colunaDasChamadas(largura);
  const corredor = 32;
  const x0 = coluna + corredor;
  const w = Math.max(1, largura - 2 * x0);
  let escala = 15;
  let desenho = desenharZonas(v, zonas, semAltura, escala);
  for (let i = 0; i < 3; i++) {
    const [, , cw, ch] = desenho.caixa;
    escala = Math.min(w / cw, alturaMaxima / ch);
    desenho = desenharZonas(v, zonas, semAltura, escala);
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
  const disposicao = disporChamadas({
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
  });
  return { desenho, escala, dx, dy, coluna, corredor, alturaDoDesenho, faces, disposicao };
}
