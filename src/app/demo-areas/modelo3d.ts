import { FOLGA_ENCOSTADAS_M, PE_DIREITO_SUGERIDO_M, verticesDaZona, zonaContem, type TipoZona, type Zona } from '@/domain/fachadaMedida';

/**
 * O volume do prédio montado a partir do que se mediu (04/11/2026): paredes à escala, e em cada
 * parede medida as zonas desenhadas no sítio exato — vãos e R/C como manchas na parede, marquises
 * como caixas salientes com os seus vidros na frente, varandas piso a piso (laje e guarda). Nada é
 * inventado: uma parede que não se mediu fica lisa e marcada como tal.
 *
 * Projeção ortogonal (axonométrica) a rodar à volta do eixo vertical — paralelas continuam
 * paralelas e uma medida no desenho não muda com a distância. Ordem de desenho por camadas, não por
 * profundidade do centro das faces: uma varanda do 1.º andar tem o centro "mais longe" do que o
 * centro da parede onde está, e seria tapada por ela. Dentro de cada camada, os elementos salientes
 * ordenam-se por planos de separação (`porOrdemDeDesenho`).
 *
 * Funções puras, para se testarem sem browser.
 */

export type Lado = 'frente' | 'direita' | 'tras' | 'esquerda';

export interface FaceMedida {
  lado: Lado;
  zonas: Zona[];
  /** A saliência medida das marquises desta fachada; sem ela, a ilustrativa de `SALIENCIA_M`. */
  salienciaMarquiseM?: number;
  /** A saliência medida das varandas desta fachada; sem ela, a ilustrativa de `SALIENCIA_M`. */
  salienciaVarandaM?: number;
  /** Altura entre pisos lida nas janelas (`leituraDeAlturas`) — para desenhar uma varanda por piso. */
  entrePisosM?: number;
}

export type TipoPoligono = TipoZona | 'parede' | 'parede-por-medir' | 'topo';

/** As peças de uma varanda desenhada piso a piso. */
export type Elemento = 'laje' | 'guarda';

export interface Poligono {
  pontos: { x: number; y: number }[];
  tipo: TipoPoligono;
  /** Face lateral de uma caixa saliente (mais escura, para dar volume). */
  sombra?: boolean;
  /** Numa varanda piso a piso: a laje (cheia) ou a guarda (meio transparente, deixa ver a parede atrás). */
  elemento?: Elemento;
}

/**
 * Quanto sai da parede cada elemento saliente (metros) quando não se mediu — ilustrativo. Com a
 * saliência medida (`salienciaMarquiseM`, `salienciaVarandaM`), manda a medida.
 * Uma marquise ou varanda triangular sai como a caixa que a envolve (são raras; a área conta-se certa
 * em `fachadaMedida.ts`, isto é só o desenho). Uma varanda triangular não se reparte por pisos: uma
 * laje cortada na diagonal não corresponde a nada que se construa, e fica a caixa.
 */
export const SALIENCIA_M: Partial<Record<TipoZona, number>> = { marquise: 1.0, varanda: 1.2 };

/**
 * Uma varanda desenhada piso a piso (04/11/2026, promotor: "podia ter de imediato o desenho de
 * varandas"). O avaliador desenha a coluna inteira de uma vez, de baixo a cima (`repartirColuna`), e
 * cada varanda leva uma laje na base e uma guarda à frente e dos lados. A guarda tem 1 m, ou menos
 * num troço baixo: entre varandas fica sempre `folgaAoPisoDeCima` livre até ao troço seguinte; no
 * último troço (ou numa varanda sozinha) não há troço acima, e a guarda vai até 1 m. Valores
 * habituais, não medidos na foto — só servem o desenho.
 */
export const VARANDA_DESENHO_M = { laje: 0.18, guarda: 1.0, folgaAoPisoDeCima: 0.3 } as const;

/** Tolerância numérica (metros, ou unidades de ecrã). */
const E = 1e-9;

/**
 * Quantas varandas tem uma coluna de altura `h` e a que distância ficam as lajes. A coluna pode ter
 * sido desenhada de duas maneiras, e as duas cabem aqui:
 * - tal como se vê (o que o ecrã pede): da base da primeira laje ao topo da última guarda, ou seja
 *   (n − 1) pisos mais laje e guarda — `round(h / entrePisos)` cortava esse topo (1,18 m, menos de meio
 *   piso) e saía uma varanda a menos (cético, 04/11/2026);
 * - por pisos inteiros: n troços iguais, até ao piso de cima.
 * Fica a repartição cuja distância entre lajes é a mais parecida com a altura entre pisos
 * (`entrePisos`, lida nas janelas ou a sugerida). A distância ajusta-se à coluna desenhada: a primeira
 * laje assenta na base e a última varanda acaba no topo, como no desenho.
 */
function repartirColuna(h: number, entrePisos: number): { varandas: number; passo: number } {
  const topo = VARANDA_DESENHO_M.laje + VARANDA_DESENHO_M.guarda;
  let melhor = { varandas: 1, passo: h };
  for (let n = 1; n <= Math.ceil(h / entrePisos) + 1; n++) {
    // Pisos inteiros; e, de duas varandas para cima, tal como se vê.
    for (const passo of n > 1 ? [h / n, (h - topo) / (n - 1)] : [h]) {
      if (passo > 0 && Math.abs(passo - entrePisos) < Math.abs(melhor.passo - entrePisos) - E) melhor = { varandas: n, passo };
    }
  }
  return melhor;
}

type V3 = [number, number, number];

interface Referencial {
  origem: V3;
  /** Ao longo da parede, da esquerda para a direita de quem está de fora a olhar para ela. */
  u: V3;
  /** Normal para fora. */
  n: V3;
  comprimento: number;
}

function referencial(lado: Lado, W: number, D: number): Referencial {
  switch (lado) {
    case 'frente':
      return { origem: [0, 0, 0], u: [1, 0, 0], n: [0, 0, 1], comprimento: W };
    case 'direita':
      return { origem: [W, 0, 0], u: [0, 0, -1], n: [1, 0, 0], comprimento: D };
    case 'tras':
      return { origem: [W, 0, -D], u: [-1, 0, 0], n: [0, 0, -1], comprimento: W };
    case 'esquerda':
      return { origem: [0, 0, -D], u: [0, 0, 1], n: [-1, 0, 0], comprimento: D };
  }
}

const ponto = (r: Referencial, s: number, y: number, t: number): V3 => [
  r.origem[0] + s * r.u[0] + t * r.n[0],
  y,
  r.origem[2] + s * r.u[2] + t * r.n[2],
];

export interface Vista {
  /** Graus, à volta do eixo vertical. 0 = de frente; positivo roda para mostrar a parede esquerda. */
  azimute: number;
  /** Graus acima do horizonte. */
  elevacao: number;
}

function projetor(v: Vista) {
  const t = (v.azimute * Math.PI) / 180;
  const f = (v.elevacao * Math.PI) / 180;
  const [ct, st, cf, sf] = [Math.cos(t), Math.sin(t), Math.cos(f), Math.sin(f)];
  const rodar = (p: V3): V3 => [p[0] * ct + p[2] * st, p[1], -p[0] * st + p[2] * ct];
  /** Quanto uma direção aponta para quem vê: positivo, para cá; zero, de perfil. */
  const voltada = (n: V3) => {
    const [, y, z] = rodar(n);
    return y * sf + z * cf;
  };
  return {
    /** Coordenadas de ecrã com y para baixo (SVG). */
    ecra(p: V3) {
      const [x, y, z] = rodar(p);
      return { x, y: -(y * cf - z * sf) };
    },
    /** Maior = mais perto de quem vê. */
    profundidade: voltada,
    voltada,
    visivel: (n: V3) => voltada(n) > 1e-9,
  };
}

/** Desloca as zonas de uma fachada para que o contorno comece em s = 0 (o canto do prédio). */
function aoCanto(zonas: Zona[]): Zona[] {
  const contornos = zonas.filter((z) => z.tipo === 'fachada');
  const base = contornos.length > 0 ? contornos : zonas;
  if (base.length === 0) return zonas;
  const x0 = Math.min(...base.map((z) => z.x));
  const y0 = Math.min(...base.map((z) => z.y));
  return zonas.map((z) => ({ ...z, x: z.x - x0, y: z.y - y0 }));
}

/**
 * Colunas salientes (marquises, varandas) desenhadas à mão que se sobrepõem de lado até
 * `FOLGA_ENCOSTADAS_M` encostam de facto — o critério do domínio para as colunas quase encostadas: a
 * sobreposição corta-se a meio. Duas caixas que se cruzam não têm ordem de desenho certa: com 2 cm, a
 * guarda do lado de lá de uma varanda ficava dentro da marquise ao lado e era pintada por cima dela, e a
 * frente da varanda (que sai mais) ficava tapada pela marquise (cético, 04/11/2026). Devolve, para cada
 * zona saliente, a cópia a desenhar; as outras zonas não mudam.
 */
function encostarColunas(zonas: Zona[]): Map<Zona, Zona> {
  const ajustadas = new Map(zonas.filter((z) => z.tipo === 'marquise' || z.tipo === 'varanda').map((z) => [z, { ...z }]));
  const salientes = [...ajustadas.values()];
  for (const a of salientes) {
    for (const b of salientes) {
      // `a` à esquerda de `b`, nenhuma dentro da outra, e as duas à mesma altura em algum troço.
      const [fimA, fimB] = [a.x + a.largura, b.x + b.largura];
      const sobre = fimA - b.x;
      const aMesmaAltura = Math.min(a.y + a.altura, b.y + b.altura) - Math.max(a.y, b.y) > 1e-6;
      if (a === b || !(a.x < b.x && fimA < fimB && sobre > 0 && sobre <= FOLGA_ENCOSTADAS_M && aMesmaAltura)) continue;
      // Só encolhem: um acerto nunca cria outra sobreposição.
      const meio = b.x + sobre / 2;
      a.largura = meio - a.x;
      b.largura = fimB - meio;
      b.x = meio;
    }
  }
  return ajustadas;
}

/** Uma medida que se pode usar: um número positivo. Zero, negativo ou NaN contam como "não medido". */
const medida = (v: number | undefined) => (v !== undefined && Number.isFinite(v) && v > 0 ? v : undefined);

const entre = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

interface Face {
  pts: V3[];
  n: V3;
  sombra: boolean;
}

/** As cinco faces de uma caixa encostada à parede (a sexta é a parede): de s0 a s1, de y0 a y1, de t = 0 a p. */
function facesDaCaixa(r: Referencial, s0: number, s1: number, y0: number, y1: number, p: number) {
  const c = (s: number, y: number, t: number) => ponto(r, s, y, t);
  const face = (pts: V3[], n: V3, sombra: boolean): Face => ({ pts, n, sombra });
  return {
    frente: face([c(s0, y0, p), c(s1, y0, p), c(s1, y1, p), c(s0, y1, p)], r.n, false),
    inicio: face([c(s0, y0, 0), c(s0, y0, p), c(s0, y1, p), c(s0, y1, 0)], [-r.u[0], 0, -r.u[2]], true),
    fim: face([c(s1, y0, p), c(s1, y0, 0), c(s1, y1, 0), c(s1, y1, p)], r.u, true),
    cima: face([c(s0, y1, p), c(s1, y1, p), c(s1, y1, 0), c(s0, y1, 0)], [0, 1, 0], true),
    baixo: face([c(s0, y0, 0), c(s1, y0, 0), c(s1, y0, p), c(s0, y0, p)], [0, -1, 0], true),
  };
}

const todas = (f: ReturnType<typeof facesDaCaixa>) => [f.frente, f.inicio, f.fim, f.cima, f.baixo];

/** Um objeto saliente (uma caixa, ou uma varanda de um piso) e os polígonos que dele se veem, já pela ordem certa entre si. */
interface Grupo {
  pols: Poligono[];
  /** A caixa alinhada com os eixos que envolve o objeto em 3D — para procurar um plano de separação. */
  min: V3;
  max: V3;
  /** Profundidade do centro — só desempata. */
  prof: number;
  /** A caixa que envolve o desenho no ecrã: dois grupos que não se sobrepõem no ecrã não pedem ordem. */
  ecra: { x0: number; x1: number; y0: number; y1: number };
}

/**
 * 1 se `a` fica à frente de `b` (desenha-se depois), -1 se ao contrário, 0 se a ordem não importa.
 * Dois objetos que não se cruzam e são caixas alinhadas com os eixos (as paredes são-no) têm um
 * plano alinhado com os eixos entre eles; o que fica do lado de quem vê não pode ser tapado pelo outro.
 *
 * Caixas que se cruzam não têm plano. As sobreposições pequenas de lado já foram cortadas a meio
 * (`encostarColunas`); para as que sobram (maiores, ou de cima a baixo) conta o eixo em que menos se
 * cruzam, como se estivessem encostadas por ele — erra menos do que a profundidade do centro, que era
 * o que decidia. Se esse eixo estiver de perfil para quem vê, a ordem não importa.
 */
function aFrente(a: Grupo, b: Grupo, d: V3): number {
  if (a.ecra.x1 <= b.ecra.x0 + E || b.ecra.x1 <= a.ecra.x0 + E || a.ecra.y1 <= b.ecra.y0 + E || b.ecra.y1 <= a.ecra.y0 + E) return 0;
  const eixos = [0, 1, 2] as const;
  let veredito = 0;
  let separados = false;
  for (const k of eixos) {
    const lado = a.min[k] >= b.max[k] - E ? 1 : a.max[k] <= b.min[k] + E ? -1 : 0;
    if (lado === 0) continue;
    separados = true;
    if (Math.abs(d[k]) <= E) continue;
    const v = lado * Math.sign(d[k]);
    // Dois planos com respostas opostas: nenhum tapa o outro.
    if (veredito !== 0 && v !== veredito) return 0;
    veredito = v;
  }
  if (separados) return veredito;
  const cruzam = (k: 0 | 1 | 2) => Math.min(a.max[k], b.max[k]) - Math.max(a.min[k], b.min[k]);
  const k = eixos.reduce((m, j) => (cruzam(j) < cruzam(m) ? j : m));
  if (Math.abs(d[k]) <= E) return 0;
  return Math.sign(a.min[k] + a.max[k] - b.min[k] - b.max[k]) * Math.sign(d[k]);
}

/**
 * Pintor com planos de separação: cada grupo desenha-se depois de todos os que pode tapar; entre os
 * que estão livres, o mais longe primeiro. Ordenar só pelo centro, como se fazia, falha numa coluna
 * de varandas ao lado de uma coluna de marquises: a varanda do último piso está mais alta, vista de
 * cima tem o centro mais perto do que o da marquise inteira ao lado, e passava por cima da frente
 * dela. Caixas que se cruzam ordenam-se pelo eixo em que menos se cruzam (`aFrente`); se mesmo assim
 * houver um ciclo, sai o mais longe.
 */
function porOrdemDeDesenho(grupos: Grupo[], d: V3): Poligono[] {
  const n = grupos.length;
  const seguintes: number[][] = grupos.map(() => []);
  const faltam = grupos.map(() => 0);
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const v = aFrente(grupos[i]!, grupos[j]!, d);
      if (v === 0) continue;
      const [atras, aFrenteDele] = v > 0 ? [j, i] : [i, j];
      seguintes[atras]!.push(aFrenteDele);
      faltam[aFrenteDele]!++;
    }
  }
  const feito = grupos.map(() => false);
  const ordem: Poligono[] = [];
  for (let k = 0; k < n; k++) {
    let escolhido = -1;
    for (const soLivres of [true, false]) {
      for (let i = 0; i < n; i++) {
        if (feito[i] || (soLivres && faltam[i]! > 0)) continue;
        if (escolhido < 0 || grupos[i]!.prof < grupos[escolhido]!.prof) escolhido = i;
      }
      if (escolhido >= 0) break;
    }
    feito[escolhido] = true;
    for (const j of seguintes[escolhido]!) faltam[j]!--;
    ordem.push(...grupos[escolhido]!.pols);
  }
  return ordem;
}

export function montarModelo(faces: FaceMedida[], dim: { larguraM: number; fundoM: number; alturaM: number }, vista: Vista): Poligono[] {
  const { larguraM: W, fundoM: D, alturaM: H } = dim;
  const proj = projetor(vista);
  const porLado = new Map(faces.map((f) => [f.lado, f]));
  const quad = (pts: V3[], tipo: TipoPoligono, sombra = false, elemento?: Elemento): Poligono => ({
    pontos: pts.map((p) => proj.ecra(p)),
    tipo,
    sombra,
    ...(elemento ? { elemento } : {}),
  });
  const grupo = (solido: V3[], pols: Poligono[]): Grupo | null => {
    if (pols.length === 0) return null;
    const eixo = (k: 0 | 1 | 2) => solido.map((p) => p[k]);
    const min: V3 = [Math.min(...eixo(0)), Math.min(...eixo(1)), Math.min(...eixo(2))];
    const max: V3 = [Math.max(...eixo(0)), Math.max(...eixo(1)), Math.max(...eixo(2))];
    const xs = pols.flatMap((p) => p.pontos.map((q) => q.x));
    const ys = pols.flatMap((p) => p.pontos.map((q) => q.y));
    return {
      pols,
      min,
      max,
      prof: proj.profundidade([(min[0] + max[0]) / 2, (min[1] + max[1]) / 2, (min[2] + max[2]) / 2]),
      ecra: { x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys) },
    };
  };

  const antes: Poligono[] = [];
  const caixa: Poligono[] = [];
  const depois: Grupo[] = [];
  const escondidas: Grupo[] = [];

  for (const lado of ['frente', 'direita', 'tras', 'esquerda'] as Lado[]) {
    const r = referencial(lado, W, D);
    const face = porLado.get(lado);
    const zonas = face ? aoCanto(face.zonas) : undefined;
    const paredeVisivel = proj.visivel(r.n);
    const L = r.comprimento;
    const dentro = (z: Zona) => ({
      s0: entre(z.x, 0, L),
      s1: entre(z.x + z.largura, 0, L),
      y0: entre(z.y, 0, H),
      y1: entre(z.y + z.altura, 0, H),
    });
    const salienciaDe = (tipo: TipoZona) =>
      tipo === 'marquise'
        ? (medida(face?.salienciaMarquiseM) ?? SALIENCIA_M.marquise)
        : tipo === 'varanda'
          ? (medida(face?.salienciaVarandaM) ?? SALIENCIA_M.varanda)
          : undefined;
    const entrePisos = medida(face?.entrePisosM) ?? PE_DIREITO_SUGERIDO_M;
    const juntar = (g: Grupo | null) => {
      if (g) (paredeVisivel ? depois : escondidas).push(g);
    };
    const ajustadas = zonas ? encostarColunas(zonas) : new Map<Zona, Zona>();

    // Os vidros das marquises: o avaliador desenha-os como vãos por cima da frente da marquise. Um
    // vão com o centro dentro de uma marquise é dela (o mesmo critério de `corrigirSaliencias`) e
    // desenha-se na frente da marquise, não na parede — na parede ficava escondido atrás da caixa.
    const marquises = zonas?.filter((q) => q.tipo === 'marquise') ?? [];
    const vidros = new Map<Zona, Zona[]>();
    for (const v of zonas ?? []) {
      if (v.tipo !== 'vao') continue;
      const m = marquises.find((q) => zonaContem(q, { x: v.x + v.largura / 2, y: v.y + v.altura / 2 }));
      if (m) vidros.set(m, [...(vidros.get(m) ?? []), v]);
    }
    const naMarquise = new Set([...vidros.values()].flat());

    if (paredeVisivel) {
      caixa.push(quad([ponto(r, 0, 0, 0), ponto(r, L, 0, 0), ponto(r, L, H, 0), ponto(r, 0, H, 0)], zonas ? 'parede' : 'parede-por-medir'));
      // Manchas na parede: R/C primeiro, vãos por cima.
      for (const tipo of ['rc', 'vao'] as TipoZona[]) {
        for (const z of zonas?.filter((q) => q.tipo === tipo && !naMarquise.has(q)) ?? []) {
          const { s0, s1, y0, y1 } = dentro(z);
          if (s1 - s0 < 1e-6 || y1 - y0 < 1e-6) continue;
          // A forma desenhada (retângulo ou triângulo), com cada vértice preso à parede.
          const vertices = verticesDaZona(z).map((v) => ponto(r, entre(v.x, 0, L), entre(v.y, 0, H), 0));
          caixa.push(quad(vertices, tipo));
        }
      }
    }

    for (const original of zonas ?? []) {
      const z = ajustadas.get(original) ?? original;
      const p = salienciaDe(z.tipo);
      if (!p) continue;
      const { s0, s1, y0, y1 } = dentro(z);
      if (s1 - s0 < 1e-6 || y1 - y0 < 1e-6) continue;

      if (z.tipo === 'varanda' && !z.triangulo) {
        const { varandas, passo } = repartirColuna(y1 - y0, entrePisos);
        for (let i = 0; i < varandas; i++) {
          const base = y0 + i * passo;
          const ultima = i === varandas - 1;
          // O troço desta varanda: até à laje seguinte, ou, na última, até ao topo da coluna.
          const troco = ultima ? y1 - base : passo;
          const laje = Math.min(VARANDA_DESENHO_M.laje, troco);
          const folga = ultima ? 0 : VARANDA_DESENHO_M.folgaAoPisoDeCima;
          const guarda = Math.min(VARANDA_DESENHO_M.guarda, troco - laje - folga);
          const facesLaje = todas(facesDaCaixa(r, s0, s1, base, base + laje, p));
          const pols = facesLaje.filter((f) => proj.visivel(f.n)).map((f) => quad(f.pts, 'varanda', f.sombra, 'laje'));
          const solido = facesLaje.flatMap((f) => f.pts);
          if (guarda > 1e-6) {
            // A guarda é um plano sem espessura e vê-se dos dois lados. A que se vê por dentro (a do
            // lado de lá) fica atrás da laje e desenha-se antes dela; a que se vê por fora fica à
            // frente da laje e desenha-se depois. Entre si não se sobrepõem: são faces da mesma caixa.
            const g = facesDaCaixa(r, s0, s1, base + laje, base + laje + guarda, p);
            const deDentro: Poligono[] = [];
            const deFora: Poligono[] = [];
            for (const f of [g.frente, g.inicio, g.fim]) {
              solido.push(...f.pts);
              const v = proj.voltada(f.n);
              if (Math.abs(v) <= E) continue; // de perfil seria só uma risca
              (v > 0 ? deFora : deDentro).push(quad(f.pts, 'varanda', f.sombra, 'guarda'));
            }
            pols.unshift(...deDentro);
            pols.push(...deFora);
          }
          juntar(grupo(solido, pols));
        }
        continue;
      }

      const facesCaixa = todas(facesDaCaixa(r, s0, s1, y0, y1, p));
      const pols = facesCaixa.filter((f) => proj.visivel(f.n)).map((f) => quad(f.pts, z.tipo, f.sombra));
      // Os vidros só se veem quando se vê a frente da marquise, e por cima dela (no mesmo grupo,
      // depois da frente): presos ao retângulo da frente, à distância da saliência.
      if (z.tipo === 'marquise' && proj.visivel(r.n)) {
        for (const v of vidros.get(original) ?? []) {
          if (Math.min(s1, v.x + v.largura) - Math.max(s0, v.x) < 1e-6 || Math.min(y1, v.y + v.altura) - Math.max(y0, v.y) < 1e-6) continue;
          const vertices = verticesDaZona(v).map((q) => ponto(r, entre(q.x, s0, s1), entre(q.y, y0, y1), p));
          pols.push(quad(vertices, 'vao'));
        }
      }
      juntar(
        grupo(
          facesCaixa.flatMap((f) => f.pts),
          pols,
        ),
      );
    }
  }

  if (proj.visivel([0, 1, 0])) {
    antes.push(
      quad(
        [
          [0, H, 0],
          [W, H, 0],
          [W, H, -D],
          [0, H, -D],
        ],
        'topo',
      ),
    );
  }

  const direcao: V3 = [proj.voltada([1, 0, 0]), proj.voltada([0, 1, 0]), proj.voltada([0, 0, 1])];
  return [...porOrdemDeDesenho(escondidas, direcao), ...antes, ...caixa, ...porOrdemDeDesenho(depois, direcao)];
}

/** Caixa que envolve os polígonos, para o `viewBox`. */
export function enquadramento(pols: Poligono[], margem: number) {
  const xs = pols.flatMap((p) => p.pontos.map((q) => q.x));
  const ys = pols.flatMap((p) => p.pontos.map((q) => q.y));
  if (xs.length === 0) return { x: 0, y: 0, largura: 1, altura: 1 };
  const x0 = Math.min(...xs) - margem;
  const y0 = Math.min(...ys) - margem;
  return { x: x0, y: y0, largura: Math.max(...xs) + margem - x0, altura: Math.max(...ys) + margem - y0 };
}
