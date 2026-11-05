/**
 * As chamadas do passo 2: os cartões das zonas à volta do desenho do prédio, cada um ligado ao seu
 * número por uma linha. Tudo em píxeis, numa prancheta de `largura` px.
 *
 * ## A regra, e porque é uma função
 *
 * Na maqueta B (05/11/2026) as linhas iam em diagonal do cartão ao número: atravessavam a cota da
 * altura e cortavam as faces do prédio de viés, e o juiz pediu que nunca o fizessem. Uma regra destas
 * escrita num comentário dura até ao primeiro prédio com outra forma; por isso é uma função pura, com
 * testes (`chamadas.test.ts`), e o ecrã só desenha chamadas que ela aceite:
 *
 * - **nenhuma ligação corta uma face na diagonal**: as ligações só têm troços horizontais e
 *   verticais, e os verticais ficam no corredor entre a coluna dos cartões e o desenho;
 * - **nenhuma ligação cruza uma cota** — nem a linha, nem as linhas de chamada, nem o texto;
 * - **nenhuma ligação atravessa a zona de outro número**: só pode passar por cima de outra zona o
 *   bocado que leva a uma zona assente nela (as varandas estão por cima da fachada) — `travessia`
 *   px, e nunca mais de um terço da largura dessa zona. O cético (05/11/2026) viu, num prédio em L,
 *   a ligação da empena correr 280 px por cima da fachada inteira, por janelas e varandas, até ao
 *   número: cumpria as três regras acima;
 * - nenhuma ligação passa por cima de outro número, nem cruza outra ligação.
 *
 * Quando não há disposição que cumpra tudo, a resposta é `null` e o ecrã fica no modo lista (o
 * desenho de um lado, os cartões empilhados do outro), que é a base e nunca falha. As chamadas são um
 * extra, só para pranchetas largas e prédios que as comportam.
 */

export type Ponto = [number, number];

export interface Caixa {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Obstaculos {
  /** Linhas que nenhuma ligação pode cruzar: as cotas e as suas linhas de chamada. */
  segmentos: [Ponto, Ponto][];
  /** Retângulos por onde nenhuma ligação pode passar: os textos das cotas. */
  caixas: Caixa[];
}

export interface EntradaDasChamadas {
  /** Largura da prancheta. */
  largura: number;
  /** Altura mínima da prancheta (a do desenho). Cresce se os cartões precisarem. */
  altura: number;
  /** Largura de cada coluna de cartões, encostada a cada lado. */
  coluna: number;
  /** O espaço entre a coluna e o desenho, onde vão os troços verticais das ligações. */
  corredor: number;
  /** O x do meio do prédio: o que está à esquerda dele chama-se pela esquerda, e vice-versa. */
  centroX: number;
  pinos: { id: string; p: Ponto }[];
  /** A altura de cada cartão, em px. */
  alturas: Record<string, number>;
  obstaculos: Obstaculos;
  /** Entre dois cartões da mesma coluna. */
  intervalo?: number;
  /**
   * Quanto da borda do cartão, em cima e em baixo, a ligação não pode tocar: liga-se ao lado do cartão
   * entre `topo + margem` e `topo + altura − margem`, nunca a um canto.
   */
  margem?: number;
  /** O raio do número da zona: nenhuma ligação passa a menos disto de outro número. */
  raio?: number;
  /** Números que estão no desenho sem cartão à volta (as zonas fora do pedido): nenhuma ligação lhes passa por cima. */
  outrosPinos?: { id: string; p: Ponto }[];
  /**
   * As faces do desenho, pela ordem em que se pintam (a última fica por cima), com a zona de cada uma
   * (nula: uma face de ninguém, que se pode atravessar). Sem elas, a regra das zonas não se verifica.
   */
  faces?: FaceDaPrancheta[];
  /** Quanto, em px, uma ligação pode correr por cima de outras zonas antes do seu número. */
  travessia?: number;
  /**
   * A altura do bloco «Fora do pedido» (as zonas excluídas, sem ligação), quando há: vai para o fundo
   * da coluna que tiver lugar, por baixo dos cartões — ou, se nenhuma tiver, para debaixo da prancheta.
   */
  rodape?: number;
}

export interface FaceDaPrancheta {
  zona: string | null;
  pontos: Ponto[];
}

export type Lado = 'esq' | 'dir';

export interface Chamada {
  id: string;
  lado: Lado;
  /** O topo do cartão. */
  topo: number;
  /** A ligação, do cartão ao número: dois pontos (uma linha horizontal) ou quatro (com um degrau no corredor). */
  pontos: Ponto[];
}

export interface Disposicao {
  altura: number;
  chamadas: Chamada[];
  /** Onde fica o bloco «Fora do pedido», quando cabe numa coluna; nulo: vai para debaixo da prancheta. */
  rodape: { lado: Lado; topo: number } | null;
}

/** Mais do que isto, à volta de um desenho, deixa de se ler: o modo lista trata do resto. */
export const MAX_ZONAS_COM_CHAMADAS = 6;

/**
 * O bocado de outra zona que uma ligação pode atravessar, em px: o que separa a esquina da fachada
 * das varandas (um quinto da largura da frente, ~40 px numa prancheta de 1100) e mais uma margem. Uma
 * fachada atravessada de lado a lado são 150 px ou mais.
 */
export const TRAVESSIA = 56;

const EPS = 1e-6;

/** Os dois segmentos têm algum ponto em comum? (Tocar conta.) */
export function segmentosCruzam(a: Ponto, b: Ponto, c: Ponto, d: Ponto): boolean {
  const orient = (p: Ponto, q: Ponto, r: Ponto) => {
    const v = (q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0]);
    return Math.abs(v) < EPS ? 0 : v > 0 ? 1 : -1;
  };
  const noSegmento = (p: Ponto, q: Ponto, r: Ponto) =>
    Math.min(p[0], r[0]) - EPS <= q[0] &&
    q[0] <= Math.max(p[0], r[0]) + EPS &&
    Math.min(p[1], r[1]) - EPS <= q[1] &&
    q[1] <= Math.max(p[1], r[1]) + EPS;
  const o1 = orient(a, b, c);
  const o2 = orient(a, b, d);
  const o3 = orient(c, d, a);
  const o4 = orient(c, d, b);
  if (o1 !== o2 && o3 !== o4) return true;
  if (o1 === 0 && noSegmento(a, c, b)) return true;
  if (o2 === 0 && noSegmento(a, d, b)) return true;
  if (o3 === 0 && noSegmento(c, a, d)) return true;
  if (o4 === 0 && noSegmento(c, b, d)) return true;
  return false;
}

/** O segmento passa por dentro (ou pela borda) do retângulo? */
export function segmentoTocaCaixa(a: Ponto, b: Ponto, k: Caixa): boolean {
  const dentro = (p: Ponto) => p[0] >= k.x && p[0] <= k.x + k.w && p[1] >= k.y && p[1] <= k.y + k.h;
  if (dentro(a) || dentro(b)) return true;
  const c: Ponto[] = [
    [k.x, k.y],
    [k.x + k.w, k.y],
    [k.x + k.w, k.y + k.h],
    [k.x, k.y + k.h],
  ];
  return c.some((p, i) => segmentosCruzam(a, b, p, c[(i + 1) % 4]!));
}

/** A distância de um ponto a um segmento. */
function distancia(p: Ponto, a: Ponto, b: Ponto): number {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const l2 = dx * dx + dy * dy;
  const t = l2 === 0 ? 0 : Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / l2));
  return Math.hypot(p[0] - (a[0] + t * dx), p[1] - (a[1] + t * dy));
}

const trocos = (pts: readonly Ponto[]): [Ponto, Ponto][] => pts.slice(1).map((p, i) => [pts[i]!, p]);

/** O ponto está dentro do polígono? (Par-ímpar: serve para as faces do volume, que são convexas.) */
export function dentroDoPoligono(p: Ponto, q: readonly Ponto[]): boolean {
  let dentro = false;
  for (let i = 0, j = q.length - 1; i < q.length; j = i++) {
    const [xi, yi] = q[i]!;
    const [xj, yj] = q[j]!;
    if (yi > p[1] !== yj > p[1] && p[0] < ((xj - xi) * (p[1] - yi)) / (yj - yi) + xi) dentro = !dentro;
  }
  return dentro;
}

/** A zona que se vê num ponto: a da face de cima, ou nula. */
export function zonaNoPonto(p: Ponto, faces: readonly FaceDaPrancheta[]): string | null {
  for (let i = faces.length - 1; i >= 0; i--) if (dentroDoPoligono(p, faces[i]!.pontos)) return faces[i]!.zona;
  return null;
}

/**
 * Quanto uma ligação pode correr por cima da zona `z`: `travessia` px, e nunca mais de um terço da
 * largura que a zona ocupa no desenho — num prédio alto e estreito, 50 px já são a fachada de lado a
 * lado.
 */
export function travessiaPermitida(z: string, faces: readonly FaceDaPrancheta[], travessia = TRAVESSIA): number {
  const xs = faces.filter((f) => f.zona === z).flatMap((f) => f.pontos.map((p) => p[0]));
  if (xs.length === 0) return travessia;
  return Math.min(travessia, (Math.max(...xs) - Math.min(...xs)) / 3);
}

/**
 * Quanto de uma ligação corre por cima de cada uma das outras zonas, em px. Mede-se até ao número da
 * zona menos o raio dele: o bocado debaixo do próprio círculo não se vê.
 */
export function travessiasDaLigacao(
  c: Pick<Chamada, 'id' | 'pontos'>,
  faces: readonly FaceDaPrancheta[],
  raio: number,
): Record<string, number> {
  const fim = c.pontos[c.pontos.length - 1]!;
  const por: Record<string, number> = {};
  for (const [a, b] of trocos(c.pontos)) {
    const comp = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const passos = Math.max(1, Math.ceil(comp));
    for (let k = 0; k < passos; k++) {
      const t = (k + 0.5) / passos;
      const p: Ponto = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
      if (Math.hypot(p[0] - fim[0], p[1] - fim[1]) < raio) continue;
      const z = zonaNoPonto(p, faces);
      if (z !== null && z !== c.id) por[z] = (por[z] ?? 0) + comp / passos;
    }
  }
  return por;
}

/**
 * O que está mal numa disposição — vazio quando cumpre tudo. É o que o ecrã e os testes perguntam:
 * uma lista de frases, para um teste que falha dizer qual ligação e porquê.
 */
export function problemasDasLigacoes(
  chamadas: readonly Chamada[],
  e: EntradaDasChamadas,
  { todos = true }: { todos?: boolean } = {},
): string[] {
  const raio = e.raio ?? 13;
  const problemas: string[] = [];
  const caixas = e.obstaculos.caixas.map((k) => ({ x: k.x - 2, y: k.y - 2, w: k.w + 4, h: k.h + 4 }));
  for (const c of chamadas) {
    const segs = trocos(c.pontos);
    for (const [a, b] of segs) {
      const horizontal = Math.abs(a[1] - b[1]) < EPS;
      const vertical = Math.abs(a[0] - b[0]) < EPS;
      if (!horizontal && !vertical) problemas.push(`${c.id}: troço na diagonal`);
      if (vertical && !horizontal) {
        const noCorredor =
          c.lado === 'esq'
            ? a[0] >= e.coluna - EPS && a[0] <= e.coluna + e.corredor + EPS
            : a[0] <= e.largura - e.coluna + EPS && a[0] >= e.largura - e.coluna - e.corredor - EPS;
        if (!noCorredor) problemas.push(`${c.id}: troço vertical fora do corredor`);
      }
      if (e.obstaculos.segmentos.some(([p, q]) => segmentosCruzam(a, b, p, q))) problemas.push(`${c.id}: cruza uma cota`);
      if (caixas.some((k) => segmentoTocaCaixa(a, b, k))) problemas.push(`${c.id}: passa pelo texto de uma cota`);
      for (const o of [...e.pinos, ...(e.outrosPinos ?? [])]) {
        if (o.id !== c.id && distancia(o.p, a, b) < raio + 2) problemas.push(`${c.id}: passa pelo número de ${o.id}`);
      }
    }
    // A verificação das zonas é a mais cara (amostra a ligação píxel a píxel): quem só quer saber se a
    // disposição serve (`todos: false`) não a faz quando já há outro problema.
    if (e.faces && (todos || problemas.length === 0)) {
      for (const [z, px] of Object.entries(travessiasDaLigacao(c, e.faces, raio))) {
        if (px > travessiaPermitida(z, e.faces, e.travessia)) problemas.push(`${c.id}: atravessa a zona ${z} (${Math.round(px)} px)`);
      }
    }
    for (const d of chamadas) {
      if (d.id <= c.id) continue;
      const cruza = segs.some(([a, b]) => trocos(d.pontos).some(([p, q]) => segmentosCruzam(a, b, p, q)));
      if (cruza) problemas.push(`${c.id} e ${d.id}: as ligações cruzam-se`);
    }
  }
  // Os cartões de uma coluna não se tocam.
  for (const lado of ['esq', 'dir'] as const) {
    const col = chamadas.filter((c) => c.lado === lado).sort((a, b) => a.topo - b.topo);
    for (let i = 1; i < col.length; i++) {
      if (col[i]!.topo < col[i - 1]!.topo + (e.alturas[col[i - 1]!.id] ?? 0)) problemas.push(`${col[i]!.id}: cartão por cima de outro`);
    }
  }
  return problemas;
}

/**
 * Os cartões de uma coluna, pela ordem dos números de cima para baixo. Cada um quer ficar centrado na
 * altura do seu número; os que se tocariam empurram-se, e a coluna arruma-se dentro da altura do
 * desenho (empurrando para cima o que passaria do fundo) — antes, um cartão empurrado para baixo
 * esticava a prancheta e deixava um vazio por cima de outro (cético, 05/11/2026). A ligação vai direita
 * ao lado do cartão quando o número está à altura dele, e faz um degrau no corredor quando não está.
 *
 * `carris`: por que ordem os degraus ocupam o corredor — o cartão de cima perto da coluna (`'fora'`)
 * ou perto do desenho (`'dentro'`). Qual das duas não se cruza depende de os números estarem acima ou
 * abaixo dos cartões; a disposição experimenta as duas.
 */
const RODAPE = '\u0000rodape';

function dispor(
  lado: Lado,
  pinosDoLado: EntradaDasChamadas['pinos'],
  e: EntradaDasChamadas,
  carris: 'fora' | 'dentro',
  rodape = 0,
): { chamadas: Chamada[]; rodape: number | null } {
  const intervalo = e.intervalo ?? 12;
  const margem = e.margem ?? 16;
  const borda = lado === 'esq' ? e.coluna : e.largura - e.coluna;
  const sentido = lado === 'esq' ? 1 : -1;
  // O bloco «Fora do pedido», quando vai nesta coluna, é mais um cartão: o último, encostado ao fundo.
  const pinos = rodape > 0 ? [...pinosDoLado, { id: RODAPE, p: [borda, Number.MAX_SAFE_INTEGER] as Ponto }] : pinosDoLado;
  const ordem = [...pinos].sort((a, b) => a.p[1] - b.p[1]);
  const h = ordem.map(({ id }) => (id === RODAPE ? rodape : (e.alturas[id] ?? 0)));
  const ocupada = h.reduce((n, x) => n + x, 0) + intervalo * Math.max(0, ordem.length - 1);
  const fundo = Math.max(e.altura, ocupada);
  const topos = ordem.map(({ p }, i) => Math.min(Math.max(0, p[1] - h[i]! / 2), fundo - h[i]!));
  for (let i = 1; i < topos.length; i++) topos[i] = Math.max(topos[i]!, topos[i - 1]! + h[i - 1]! + intervalo);
  for (let i = topos.length - 1, limite = fundo; i >= 0; i--) {
    topos[i] = Math.min(topos[i]!, limite - h[i]!);
    limite = topos[i]! - intervalo;
  }
  for (let i = 0; i < topos.length; i++) topos[i] = Math.max(topos[i]!, i === 0 ? 0 : topos[i - 1]! + h[i - 1]! + intervalo);

  const iRodape = ordem.findIndex((o) => o.id === RODAPE);
  const cartoes = ordem.map((o, i) => ({ ...o, topo: topos[i]!, altura: h[i]! })).filter((o) => o.id !== RODAPE);
  const yDe = (c: (typeof cartoes)[number]) => Math.min(Math.max(c.p[1], c.topo + margem), c.topo + Math.max(margem, c.altura - margem));
  const degraus = cartoes.filter((c) => Math.abs(yDe(c) - c.p[1]) >= 0.5);
  const chamadas = cartoes.map((c): Chamada => {
    const { id, p, topo } = c;
    const y = yDe(c);
    if (Math.abs(y - p[1]) < 0.5) return { id, lado, topo, pontos: [[borda, p[1]], p] };
    // O degrau fica no corredor, um carril por cartão.
    const k = degraus.indexOf(c);
    const j = carris === 'fora' ? k : degraus.length - 1 - k;
    const carril = borda + sentido * Math.min(e.corredor - 4, 8 + 6 * j);
    return { id, lado, topo, pontos: [[borda, y], [carril, y], [carril, p[1]], p] };
  });
  return { chamadas, rodape: iRodape >= 0 ? topos[iRodape]! : null };
}

const CARRIS = ['fora', 'dentro'] as const;

/**
 * A disposição das chamadas, ou `null` quando nenhuma cumpre a regra.
 *
 * Cada número vai para o lado do prédio em que está; se assim não houver disposição boa, tentam-se
 * as trocas de lado, primeiro as dos números mais perto do meio, e as duas ordens dos carris do
 * corredor de cada lado. São no máximo seis números, 64 × 4 combinações: procura-se a primeira que
 * cumpra tudo.
 *
 * O bloco «Fora do pedido» (`rodape`) vai para o fundo de uma coluna, por baixo dos cartões, quando
 * lá cabe sem esticar a prancheta: é o espaço que ficava vazio por baixo da empena, e poupa uma linha
 * inteira por baixo do desenho. Nenhuma ligação passa por lá: as ligações saem dos cartões para
 * dentro, e os degraus ficam no corredor. Quando não cabe, vai para debaixo da prancheta.
 */
export function disporChamadas(e: EntradaDasChamadas): Disposicao | null {
  if (e.pinos.length === 0) return { altura: e.altura, chamadas: [], rodape: null };
  if (e.pinos.length > MAX_ZONAS_COM_CHAMADAS) return null;
  const preferido = (p: Ponto): Lado => (p[0] < e.centroX ? 'esq' : 'dir');
  const n = e.pinos.length;
  const custo = (mascara: number) => {
    let trocas = 0;
    let distancia = 0;
    for (let i = 0; i < n; i++) {
      if (mascara & (1 << i)) {
        trocas++;
        distancia += Math.abs(e.pinos[i]!.p[0] - e.centroX);
      }
    }
    return trocas * 1e6 + distancia;
  };
  const mascaras = Array.from({ length: 1 << n }, (_, m) => m).sort((a, b) => custo(a) - custo(b));
  // Primeiro, com o bloco «Fora do pedido» no fundo de uma coluna sem esticar a prancheta; depois, sem
  // ele (fica por baixo da prancheta).
  const ondeORodape: (Lado | null)[] = e.rodape ? ['dir', 'esq', null] : [null];
  for (const r of ondeORodape) {
    for (const mascara of mascaras) {
      const lado = (i: number): Lado => {
        const p = preferido(e.pinos[i]!.p);
        return mascara & (1 << i) ? (p === 'esq' ? 'dir' : 'esq') : p;
      };
      const esq = e.pinos.filter((_, i) => lado(i) === 'esq');
      const dir = e.pinos.filter((_, i) => lado(i) === 'dir');
      for (const ce of CARRIS) {
        for (const cd of CARRIS) {
          const de = dispor('esq', esq, e, ce, r === 'esq' ? e.rodape : 0);
          const dd = dispor('dir', dir, e, cd, r === 'dir' ? e.rodape : 0);
          const chamadas = [...de.chamadas, ...dd.chamadas];
          const altura = Math.max(e.altura, ...chamadas.map((c) => c.topo + (e.alturas[c.id] ?? 0)));
          const topoDoRodape = r === 'esq' ? de.rodape : r === 'dir' ? dd.rodape : null;
          // O bloco numa coluna só vale se couber na altura do desenho; se esticasse, ia por baixo.
          if (r && (topoDoRodape === null || topoDoRodape + e.rodape! > e.altura + 0.5)) continue;
          if (problemasDasLigacoes(chamadas, e, { todos: false }).length === 0) {
            return { altura, chamadas, rodape: r && topoDoRodape !== null ? { lado: r, topo: topoDoRodape } : null };
          }
        }
      }
    }
  }
  return null;
}
