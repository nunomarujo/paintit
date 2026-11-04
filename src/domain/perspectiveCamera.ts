import { gerarQuads, type Quad, type VolumeInput, type FaceKind } from './volume';

/**
 * Câmara de perspetiva real (pinhole), para sobrepor o modelo 3D declarado (`volume.ts`) a uma
 * fotografia e ajustar até encaixar — pedido do promotor, 03/11/2026, depois de se confirmar que
 * medir zona a zona por fotografia dava trabalho sem fim ao avaliador.
 *
 * ## A ideia
 *
 * Em vez de tentar **resolver** a perspetiva de uma fotografia a partir de pontos tocados (o
 * problema inverso, que se confirmou mal-condicionado quando a zona não está centrada com o eixo
 * ótico — ver `retificacao.ts` e `docs/DECISOES.md`, 03/11/2026), projeta-se o modelo declarado
 * (forma, pisos, frente, fundo, pé-direito, janelas, varandas — os mesmos campos já usados em
 * `volume.ts`) sobre a fotografia com uma câmara de perspetiva real, e a pessoa ajusta os parâmetros
 * da câmara (onde estava, para onde olhava, que lente) até o desenho encaixar nas arestas visíveis
 * do prédio. **Isto é o problema direto** — dados os parâmetros, calcular onde cada ponto cai no
 * ecrã — que é geometria simples e sem ambiguidade, ao contrário do problema inverso.
 *
 * Os valores reais (frente, fundo, pé-direito) continuam a vir do formulário do `VolumeInput`
 * (`escala`), tal como já eram usados para desenhar o volume à escala — são a referência que fixa
 * os comprimentos; a câmara só decide COMO esse volume real aparece naquela fotografia.
 */

export interface ParametrosCamera {
  /** Distância horizontal da câmara ao centro do prédio, em metros. */
  distanciaM: number;
  /** Altura do olho de quem fotografou, em metros (acima do solo, z=0). */
  alturaOlhoM: number;
  /** Ângulo de observação em graus, à volta do eixo vertical — a mesma convenção de `VolumeInput.angulo` (0 = de frente). */
  azimuteGraus: number;
  /** Campo de visão vertical da câmara, em graus. Um telemóvel comum ronda os 55-70º. */
  fovVerticalGraus: number;
}

export const CAMERA_OMISSAO: ParametrosCamera = {
  distanciaM: 10,
  alturaOlhoM: 1.6,
  azimuteGraus: 0,
  fovVerticalGraus: 65,
};

type Vetor3 = [number, number, number];

const subtrair = (a: Vetor3, b: Vetor3): Vetor3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const produtoEscalar = (a: Vetor3, b: Vetor3): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const produtoVetorial = (a: Vetor3, b: Vetor3): Vetor3 => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
const norma = (a: Vetor3): number => Math.sqrt(produtoEscalar(a, a));
const normalizar = (a: Vetor3): Vetor3 => {
  const n = norma(a) || 1;
  return [a[0] / n, a[1] / n, a[2] / n];
};

export interface BaseCamera {
  posicao: Vetor3;
  direita: Vetor3;
  cima: Vetor3;
  frente: Vetor3;
}

/**
 * A câmara olha sempre para o centro da implantação, a meia altura do prédio — "olhar para o
 * prédio" é a única forma de posicionar uma câmara que faz sentido aqui; a inclinação (para cima ou
 * para baixo) sai sozinha da altura do olho e da distância, nunca é um parâmetro à parte que possa
 * contradizer o alvo.
 */
export function baseDaCamera(camera: ParametrosCamera, alvo: Vetor3, centroXY: { cx: number; cy: number }): BaseCamera {
  const az = (camera.azimuteGraus * Math.PI) / 180;
  const posicao: Vetor3 = [
    centroXY.cx + camera.distanciaM * Math.sin(az),
    centroXY.cy + camera.distanciaM * Math.cos(az),
    camera.alturaOlhoM,
  ];
  const frente = normalizar(subtrair(alvo, posicao));
  const mundoCima: Vetor3 = [0, 0, 1];
  // A ordem importa: isto tem de bater com a convenção já em volume.ts (a fachada "direita" está no
  // X positivo, vista de quem está de frente para o prédio — FACHADA_LABELS, planos[]). Confirmado
  // por teste: cross(frente, mundoCima) dava o sinal trocado (um ponto a X positivo caía à esquerda
  // da imagem); cross(mundoCima, frente) é o que bate com a convenção do resto do ficheiro.
  let direita = normalizar(produtoVetorial(mundoCima, frente));
  if (!Number.isFinite(direita[0])) direita = [1, 0, 0]; // frente quase vertical (olhar a pino): escolhe um "direita" arbitrário mas estável
  const cima = produtoVetorial(frente, direita);
  return { posicao, direita, cima, frente };
}

/**
 * Projeta um ponto 3D (metros reais) para pixels da fotografia, com uma câmara pinhole: campo de
 * visão vertical fixa a focal, o ponto principal fica no centro da imagem. `null` quando o ponto
 * está atrás da câmara (não pode projetar-se).
 */
export function projetarPonto(p: Vetor3, base: BaseCamera, fovVerticalGraus: number, dimensoesImagem: { largura: number; altura: number }): [number, number] | null {
  const rel = subtrair(p, base.posicao);
  const profundidade = produtoEscalar(rel, base.frente);
  if (profundidade <= 1e-6) return null;
  const x = produtoEscalar(rel, base.direita);
  const y = produtoEscalar(rel, base.cima);
  const focal = dimensoesImagem.altura / 2 / Math.tan((fovVerticalGraus * Math.PI) / 180 / 2);
  return [dimensoesImagem.largura / 2 + (focal * x) / profundidade, dimensoesImagem.altura / 2 - (focal * y) / profundidade];
}

export interface FacePerspetiva {
  kind: FaceKind;
  /** Pontos em pixels da fotografia; omitido o quad inteiro se algum ponto cair atrás da câmara. */
  points: [number, number][];
}

/**
 * Todos os quads do volume declarado, projetados na fotografia com a câmara dada. Não filtra por
 * visibilidade (a normal a apontar para a câmara): ao ajustar a câmara à fotografia, ver as arestas
 * escondidas também ajuda a perceber a profundidade — quem desenha decide o que mostrar.
 */
export function projetarVolume(
  input: VolumeInput,
  camera: ParametrosCamera,
  dimensoesImagem: { largura: number; altura: number },
): FacePerspetiva[] {
  const { quads, px0, py0, px1, front, height } = gerarQuads(input);
  const centroXY = { cx: (px0 + px1) / 2, cy: (py0 + front) / 2 };
  const alvo: Vetor3 = [centroXY.cx, centroXY.cy, height / 2];
  const base = baseDaCamera(camera, alvo, centroXY);

  const faces: FacePerspetiva[] = [];
  for (const q of quads) {
    const pontos: [number, number][] = [];
    let valido = true;
    for (const p of q.pts) {
      const proj = projetarPonto(p, base, camera.fovVerticalGraus, dimensoesImagem);
      if (!proj) {
        valido = false;
        break;
      }
      pontos.push(proj);
    }
    if (valido) faces.push({ kind: q.kind, points: pontos });
  }
  return faces;
}

export type { Quad };
