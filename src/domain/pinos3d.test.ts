import { describe, expect, it } from 'vitest';
import { dentroDoPoligono } from './chamadas';
import { entradaDoVolume, lugaresDasZonas, type ZonaParaDesenho } from './prancheta';
import { buildingVolume, gerarQuads, type Forma, type Quad } from './volume';

/**
 * A verdade em 3D (06/11/2026): os testes de `prancheta.test.ts` confirmam os números pela ordem em que as faces se
 * pintam; estes confirmam-nos contra o que realmente tapa o quê, lançando raios do prédio para a câmara e sem
 * olhar para a ordem do pintor. Se a ordem de pintura estivesse errada num prédio em U ou em T — as faces das asas
 * tapam-se umas às outras —, o desenho mostraria uma coisa e o número outra, e só aqui se via.
 *
 * A câmara está sempre à mesma altura (30°) e roda sobre o eixo vertical (`volume.ts`); depois de rodar o
 * prédio, olha-se de +y e de cima, ou seja, na direção v = (0, cos 30°, sen 30°).
 */

const ELEV = Math.PI / 6;
const V: [number, number, number] = [0, Math.cos(ELEV), Math.sin(ELEV)];

type P3 = [number, number, number];
const sub = (a: P3, b: P3): P3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a: P3, b: P3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

/** O prédio em coordenadas já rodadas (o que o `buildingVolume` faz antes de projetar). */
function rodar(quads: Quad[], centro: [number, number], angulo: number) {
  const a = (angulo * Math.PI) / 180;
  const c = Math.cos(a);
  const s = Math.sin(a);
  const r = (p: P3): P3 => {
    const dx = p[0] - centro[0];
    const dy = p[1] - centro[1];
    return [centro[0] + dx * c - dy * s, centro[1] + dx * s + dy * c, p[2]];
  };
  return quads.map((q) => ({ ...q, pts: q.pts.map(r), n: [q.n[0] * c - q.n[1] * s, q.n[0] * s + q.n[1] * c, q.n[2]] as P3 }));
}

/** O primeiro ponto onde o raio P + t·V (t > 0) bate num dos quadriláteros; `t` e o quad. */
function primeiroQueBate(origem: P3, quads: ReturnType<typeof rodar>, ignorar: (q: Quad) => boolean): { t: number; q: Quad } | null {
  let melhor: { t: number; q: Quad } | null = null;
  for (const q of quads) {
    if (ignorar(q)) continue;
    const [p0, p1, , p3] = q.pts as [P3, P3, P3, P3];
    const e1 = sub(p1, p0);
    const e2 = sub(p3, p0);
    const denom = dot(q.n as P3, V);
    if (Math.abs(denom) < 1e-9) continue;
    const t = dot(q.n as P3, sub(p0, origem)) / denom;
    if (t <= 1e-6) continue;
    const p: P3 = [origem[0] + V[0] * t, origem[1] + V[1] * t, origem[2] + V[2] * t];
    const d = sub(p, p0);
    const u = dot(d, e1) / dot(e1, e1);
    const w = dot(d, e2) / dot(e2, e2);
    if (u < -1e-6 || u > 1 + 1e-6 || w < -1e-6 || w > 1 + 1e-6) continue;
    if (!melhor || t < melhor.t) melhor = { t, q };
  }
  return melhor;
}

const DETALHES = ['janela', 'porta'];
// Um lado por entregar tapa (tem enchimento leve); o vizinho esbate-se e não conta.
const TRANSPARENTES = ['vizinho'];

const casos: { nome: string; forma: Forma | null; zonas: ZonaParaDesenho[] }[] = [
  {
    nome: 'banda',
    forma: 'I',
    zonas: [
      { id: 'a', kind: 'fachada', participacao: 'incluida' },
      { id: 'b', kind: 'fachada', participacao: 'incluida', face: 'tras' },
      { id: 'c', kind: 'empena', participacao: 'incluida' },
      { id: 'v', kind: 'varandas', participacao: 'incluida' },
    ],
  },
  {
    nome: 'L',
    forma: 'L',
    zonas: [
      { id: 'a', kind: 'fachada', participacao: 'incluida' },
      { id: 'b', kind: 'fachada', participacao: 'incluida', face: 'tras-2' },
      { id: 'c', kind: 'fachada', participacao: 'incluida', face: 'direita-2' },
      { id: 'd', kind: 'fachada', participacao: 'incluida', face: 'esquerda' },
      { id: 'v', kind: 'varandas', participacao: 'incluida' },
    ],
  },
  {
    nome: 'U',
    forma: 'U',
    zonas: [
      { id: 'a', kind: 'fachada', participacao: 'incluida' },
      { id: 'b', kind: 'fachada', participacao: 'incluida', face: 'tras-3' },
      { id: 'c', kind: 'fachada', participacao: 'incluida', face: 'esquerda-2' },
      { id: 'd', kind: 'fachada', participacao: 'incluida', face: 'direita-2' },
      { id: 'e', kind: 'fachada', participacao: 'incluida', face: 'tras' },
      { id: 'v', kind: 'varandas', participacao: 'incluida' },
    ],
  },
  {
    nome: 'T',
    forma: 'T',
    zonas: [
      { id: 'a', kind: 'fachada', participacao: 'incluida' },
      { id: 'b', kind: 'fachada', participacao: 'incluida', face: 'tras' },
      { id: 'c', kind: 'fachada', participacao: 'incluida', face: 'esquerda-2' },
      { id: 'd', kind: 'fachada', participacao: 'incluida', face: 'direita-2' },
      { id: 'e', kind: 'fachada', participacao: 'incluida', face: 'tras-2' },
    ],
  },
];

const PREDIO = { pisos: 4, fachadas: 4, temVarandas: true, moradia: false, janelas: { frente: 4, esquerda: 3, direita: 3, tras: 4 } };
const ESCALA = { larguraM: 12, profundidadeM: 10, peDireitoM: 2.8 };

/**
 * O ponto 3D de um quadrilátero que se projeta em (X, Y) no ecrã. Nas coordenadas rodadas, o ecrã é
 * (X, Y) = (rx, ry·sen − z·cos); o ponto é p0 + u·e1 + w·e2, e resolvem-se u e w por um sistema 2×2 —
 * serve a paredes e a lajes.
 */
function pontoNoQuad(q: ReturnType<typeof rodar>[number], X: number, Y: number): P3 | null {
  const [p0, p1, , p3] = q.pts as [P3, P3, P3, P3];
  const e1 = sub(p1, p0);
  const e2 = sub(p3, p0);
  const sx = (e: P3) => e[0];
  const sy = (e: P3) => e[1] * Math.sin(ELEV) - e[2] * Math.cos(ELEV);
  const det = sx(e1) * sy(e2) - sx(e2) * sy(e1);
  if (Math.abs(det) < 1e-6) return null; // de perfil: não se lê
  const bx = X - p0[0];
  const by = Y - (p0[1] * Math.sin(ELEV) - p0[2] * Math.cos(ELEV));
  const u = (bx * sy(e2) - sx(e2) * by) / det;
  const w = (sx(e1) * by - bx * sy(e1)) / det;
  return [p0[0] + u * e1[0] + w * e2[0], p0[1] + u * e1[1] + w * e2[1], p0[2] + u * e1[2] + w * e2[2]];
}

/** A que distância (no ecrã) está o ponto da aresta mais próxima de uma face do corpo? */
function distanciaDaAresta(p: [number, number], faces: readonly { points: [number, number][] }[]): number {
  let d = Infinity;
  for (const f of faces) {
    f.points.forEach((a, i) => {
      const b = f.points[(i + 1) % f.points.length]!;
      const dx = b[0] - a[0];
      const dy = b[1] - a[1];
      const l2 = dx * dx + dy * dy;
      const t = l2 === 0 ? 0 : Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / l2));
      d = Math.min(d, Math.hypot(p[0] - (a[0] + t * dx), p[1] - (a[1] + t * dy)));
    });
  }
  return d;
}

describe('os números contra a verdade em 3D: nenhum número está atrás de uma parede', () => {
  for (const { nome, forma, zonas } of casos) {
    it(`${nome}: um raio do número para a câmara não bate em nenhuma parede, de 10° em 10°`, () => {
      let verificados = 0;
      for (let angulo = 0; angulo < 360; angulo += 10) {
        const entrada = entradaDoVolume({ ...PREDIO, forma }, zonas, ESCALA, angulo);
        const v = buildingVolume(entrada);
        const g = gerarQuads(entrada);
        const centro: [number, number] = [(g.px0 + g.px1) / 2, (g.py0 + g.front) / 2];
        const rodados = rodar(g.quads, centro, angulo);
        const lugares = lugaresDasZonas(v, zonas);
        for (const z of zonas) {
          const pino = lugares[z.id]?.pino;
          if (!pino) continue;
          // A face da zona que contém o número.
          const i = lugares[z.id]!.faces.find((k) => dentroDoPoligono(pino, v.faces[k]!.points));
          expect(i, `${nome} ${angulo}° ${z.id}`).toBeDefined();
          const f = v.faces[i!]!;
          // O quad desta face: o mesmo tipo e o mesmo lado, e (para as varandas) o que se projeta no mesmo sítio.
          const candidatos = rodados.filter((q) => q.kind === f.kind && q.face === f.face);
          const dono = candidatos.find((q) => {
            const proj = q.pts.map((p) => [
              Math.round(p[0] * 100) / 100,
              Math.round((p[1] * Math.sin(ELEV) - p[2] * Math.cos(ELEV)) * 100) / 100,
            ]);
            return proj.every((pp, k) => Math.abs(pp[0]! - f.points[k]![0]) < 0.02 && Math.abs(pp[1]! - f.points[k]![1]) < 0.02);
          });
          expect(dono, `${nome} ${angulo}° ${z.id}: quad da face`).toBeDefined();
          const p3 = pontoNoQuad(dono!, pino[0], pino[1]);
          expect(p3, `${nome} ${angulo}° ${z.id}: ponto 3D`).not.toBeNull();
          // Um pouco à frente da parede, para o raio não bater nela própria.
          const origem: P3 = [p3![0] + dono!.n[0] * 0.01, p3![1] + dono!.n[1] * 0.01, p3![2] + dono!.n[2] * 0.01];
          // O que é da própria zona não a tapa: a guarda de uma varanda está à frente da laje que a zona também pinta.
          const daZona = (q: Quad) => z.kind === 'varandas' && (q.kind === 'grade' || q.kind === 'varanda');
          const bate = primeiroQueBate(
            origem,
            rodados,
            (q) => DETALHES.includes(q.kind) || TRANSPARENTES.includes(q.kind) || !!q.fade || daZona(q),
          );
          expect(bate, `${nome} ${angulo}° ${z.id}: tapado por ${bate?.q.kind} ${bate?.q.face ?? ''}`).toBeNull();
          verificados++;
        }
      }
      expect(verificados).toBeGreaterThan(30);
    });
  }
});

describe('a ordem de pintura contra a verdade em 3D', () => {
  for (const { nome, forma, zonas } of casos) {
    it(`${nome}: em cada ponto do ecrã, a parede de cima é a que está mais perto da câmara`, () => {
      let comparados = 0;
      let diferentes = 0;
      const exemplos: string[] = [];
      for (let angulo = 0; angulo < 360; angulo += 5) {
        const entrada = entradaDoVolume(
          { ...PREDIO, forma, temVarandas: false },
          zonas.filter((z) => z.kind !== 'varandas'),
          ESCALA,
          angulo,
        );
        const v = buildingVolume(entrada);
        const g = gerarQuads(entrada);
        const centro: [number, number] = [(g.px0 + g.px1) / 2, (g.py0 + g.front) / 2];
        const rodados = rodar(g.quads, centro, angulo);
        // Só o corpo: paredes e coberturas (sem os pormenores, os vãos, o traço dos lados por entregar nem os vizinhos).
        const corpo = rodados.filter((q) => ['frente', 'lado', 'empena', 'topo'].includes(q.kind));
        const [x0, y0, w, h] = v.viewBox;
        for (let k = 0; k < 400; k++) {
          const X = x0 + ((k * 0.6180339887) % 1) * w;
          const Y = y0 + ((k * 0.7548776662) % 1) * h;
          // O raio que se projeta em (X, Y): em coordenadas rodadas, rx = X, e (ry·sen − z·cos) = Y.
          const origem: P3 = [X, 0, -Y / Math.cos(ELEV)];
          // O que está mais perto da câmara: o maior t em ambos os sentidos.
          let melhor: { t: number; q: Quad } | null = null;
          for (const q of corpo) {
            const [p0, p1, , p3] = q.pts as [P3, P3, P3, P3];
            const e1 = sub(p1, p0);
            const e2 = sub(p3, p0);
            const denom = dot(q.n as P3, V);
            if (denom <= 1e-9) continue; // de costas
            const t = dot(q.n as P3, sub(p0, origem)) / denom;
            const p: P3 = [origem[0] + V[0] * t, origem[1] + V[1] * t, origem[2] + V[2] * t];
            const d = sub(p, p0);
            const u = dot(d, e1) / dot(e1, e1);
            const ww = dot(d, e2) / dot(e2, e2);
            if (u < 0 || u > 1 || ww < 0 || ww > 1) continue;
            if (!melhor || t > melhor.t) melhor = { t, q };
          }
          // O que o pintor pôs por cima: a última face do corpo que contém o ponto.
          let pintada: (typeof v.faces)[number] | null = null;
          for (const f of v.faces) {
            if (f.fade || !['frente', 'lado', 'empena', 'topo'].includes(f.kind)) continue;
            if (dentroDoPoligono([X, Y], f.points)) pintada = f;
          }
          if (!melhor && !pintada) continue;
          // Nas arestas, onde duas faces se encontram, «dentro» de uma ou da outra é ruído de vírgula flutuante.
          if (
            distanciaDaAresta(
              [X, Y],
              v.faces.filter((f) => !f.fade && ['frente', 'lado', 'empena', 'topo'].includes(f.kind)),
            ) < 0.08
          )
            continue;
          comparados++;
          const igual = !!melhor && !!pintada && melhor.q.kind === pintada.kind && (melhor.q.face ?? '') === (pintada.face ?? '');
          if (!igual) {
            diferentes++;
            if (exemplos.length < 4)
              exemplos.push(
                `${angulo}° (${X.toFixed(1)}, ${Y.toFixed(1)}): 3D ${melhor?.q.kind}/${melhor?.q.face} ≠ pintado ${pintada?.kind}/${pintada?.face}`,
              );
          }
        }
      }
      expect(comparados).toBeGreaterThan(1000);
      expect(diferentes, exemplos.join(' | ')).toBe(0);
    });
  }
});
