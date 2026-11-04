import { verticesDaZona, type TipoZona, type Zona } from '@/domain/fachadaMedida';

/**
 * O volume do prédio montado a partir do que se mediu (04/11/2026): paredes à escala, e em cada
 * parede medida as zonas desenhadas no sítio exato — vãos e R/C como manchas na parede, marquises e
 * varandas como caixas salientes. Nada é inventado: uma parede que não se mediu fica lisa e marcada
 * como tal.
 *
 * Projeção ortogonal (axonométrica) a rodar à volta do eixo vertical — paralelas continuam
 * paralelas e uma medida no desenho não muda com a distância. Ordem de desenho por camadas, não por
 * profundidade do centro das faces: uma varanda do 1.º andar tem o centro "mais longe" do que o
 * centro da parede onde está, e seria tapada por ela.
 *
 * Funções puras, para se testarem sem browser.
 */

export type Lado = 'frente' | 'direita' | 'tras' | 'esquerda';

export interface FaceMedida {
  lado: Lado;
  zonas: Zona[];
}

export type TipoPoligono = TipoZona | 'parede' | 'parede-por-medir' | 'topo';

export interface Poligono {
  pontos: { x: number; y: number }[];
  tipo: TipoPoligono;
  /** Face lateral de uma caixa saliente (mais escura, para dar volume). */
  sombra?: boolean;
}

/**
 * Quanto sai da parede cada elemento saliente (metros) — ilustrativo: a profundidade não se mede na foto.
 * Uma marquise ou varanda triangular sai como a caixa que a envolve (são raras; a área conta-se certa
 * em `fachadaMedida.ts`, isto é só o desenho).
 */
export const SALIENCIA_M: Partial<Record<TipoZona, number>> = { marquise: 1.0, varanda: 1.2 };

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
  return {
    /** Coordenadas de ecrã com y para baixo (SVG). */
    ecra(p: V3) {
      const [x, y, z] = rodar(p);
      return { x, y: -(y * cf - z * sf) };
    },
    profundidade(p: V3) {
      const [, y, z] = rodar(p);
      return y * sf + z * cf;
    },
    visivel(n: V3) {
      const [, y, z] = rodar(n);
      return y * sf + z * cf > 1e-9;
    },
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

export function montarModelo(faces: FaceMedida[], dim: { larguraM: number; fundoM: number; alturaM: number }, vista: Vista): Poligono[] {
  const { larguraM: W, fundoM: D, alturaM: H } = dim;
  const proj = projetor(vista);
  const medidas = new Map(faces.map((f) => [f.lado, aoCanto(f.zonas)]));
  const quad = (pts: V3[], tipo: TipoPoligono, sombra = false): Poligono => ({ pontos: pts.map((p) => proj.ecra(p)), tipo, sombra });

  const antes: Poligono[] = [];
  const caixa: Poligono[] = [];
  const depois: { prof: number; pols: Poligono[] }[] = [];
  const escondidas: { prof: number; pols: Poligono[] }[] = [];

  for (const lado of ['frente', 'direita', 'tras', 'esquerda'] as Lado[]) {
    const r = referencial(lado, W, D);
    const zonas = medidas.get(lado);
    const paredeVisivel = proj.visivel(r.n);
    const L = r.comprimento;
    const dentro = (z: Zona) => ({
      s0: Math.max(0, Math.min(L, z.x)),
      s1: Math.max(0, Math.min(L, z.x + z.largura)),
      y0: Math.max(0, Math.min(H, z.y)),
      y1: Math.max(0, Math.min(H, z.y + z.altura)),
    });

    if (paredeVisivel) {
      caixa.push(quad([ponto(r, 0, 0, 0), ponto(r, L, 0, 0), ponto(r, L, H, 0), ponto(r, 0, H, 0)], zonas ? 'parede' : 'parede-por-medir'));
      // Manchas na parede: R/C primeiro, vãos por cima.
      for (const tipo of ['rc', 'vao'] as TipoZona[]) {
        for (const z of zonas?.filter((q) => q.tipo === tipo) ?? []) {
          const { s0, s1, y0, y1 } = dentro(z);
          if (s1 - s0 < 1e-6 || y1 - y0 < 1e-6) continue;
          // A forma desenhada (retângulo ou triângulo), com cada vértice preso à parede.
          const vertices = verticesDaZona(z).map((v) => ponto(r, Math.max(0, Math.min(L, v.x)), Math.max(0, Math.min(H, v.y)), 0));
          caixa.push(quad(vertices, tipo));
        }
      }
    }

    for (const z of zonas ?? []) {
      const p = SALIENCIA_M[z.tipo];
      if (!p) continue;
      const { s0, s1, y0, y1 } = dentro(z);
      if (s1 - s0 < 1e-6 || y1 - y0 < 1e-6) continue;
      const c = (s: number, y: number, t: number) => ponto(r, s, y, t);
      const lados: { pts: V3[]; n: V3; sombra: boolean }[] = [
        { pts: [c(s0, y0, p), c(s1, y0, p), c(s1, y1, p), c(s0, y1, p)], n: r.n, sombra: false },
        { pts: [c(s0, y0, 0), c(s0, y0, p), c(s0, y1, p), c(s0, y1, 0)], n: [-r.u[0], 0, -r.u[2]], sombra: true },
        { pts: [c(s1, y0, p), c(s1, y0, 0), c(s1, y1, 0), c(s1, y1, p)], n: r.u, sombra: true },
        { pts: [c(s0, y1, p), c(s1, y1, p), c(s1, y1, 0), c(s0, y1, 0)], n: [0, 1, 0], sombra: true },
        { pts: [c(s0, y0, 0), c(s1, y0, 0), c(s1, y0, p), c(s0, y0, p)], n: [0, -1, 0], sombra: true },
      ];
      const pols = lados.filter((f) => proj.visivel(f.n)).map((f) => quad(f.pts, z.tipo, f.sombra));
      const prof = proj.profundidade(c((s0 + s1) / 2, (y0 + y1) / 2, p / 2));
      (paredeVisivel ? depois : escondidas).push({ prof, pols });
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

  const porProfundidade = (a: { prof: number }, b: { prof: number }) => a.prof - b.prof;
  return [
    ...escondidas.sort(porProfundidade).flatMap((e) => e.pols),
    ...antes,
    ...caixa,
    ...depois.sort(porProfundidade).flatMap((e) => e.pols),
  ];
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
