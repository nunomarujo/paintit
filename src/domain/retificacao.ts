/**
 * Medição de uma zona por quatro cantos e dois pontos (A, B) com distância real conhecida.
 *
 * Handoff de 03/11/2026 ("medição de zonas por retângulo e dois pontos"), passo 1 da ordem de
 * construção (`docs/EM_ABERTO.md`): só `retificarZona`, com os testes 1 e 2 do handoff. Os passos
 * seguintes (confirmação/revisão, vãos, varandas, cores, ecrã) ficam por fazer — ver `docs/DECISOES.md`,
 * entrada de 03/11/2026.
 *
 * ## O método
 *
 * A premissa (handoff, secção 2) é que a zona fotografada é um retângulo real com ângulos de 90º,
 * fotografada de frente (a câmara pode estar inclinada para cima ou para baixo — a "inclinação" do
 * caso real do handoff — mas não rodada de lado nem deslocada para um dos lados). Os quatro cantos
 * tocados na fotografia formam um trapézio: o lado de cima e o lado de baixo continuam horizontais
 * na imagem, só a distância entre eles no mundo real é que a perspetiva encurta de forma diferente
 * acima e abaixo. Dois passos:
 *
 * 1. **Proporção largura/altura** do retângulo real, por um fecho algébrico derivado diretamente
 *    das quatro posições dos cantos (ver ficheiro de testes para a derivação): a diferença de
 *    largura entre a linha de cima e a de baixo, e a posição vertical de cada uma face ao centro da
 *    fotografia, chegam para calcular a inclinação da câmara e, com ela, a proporção real — sem
 *    precisar de saber a distância focal.
 * 2. **Homografia** do quadrado unitário (0,0)-(1,0)-(1,1)-(0,1) para os quatro cantos na imagem
 *    (fórmula de Heckbert, "Fundamentals of Texture Mapping and Image Warping", 1989) — dá a
 *    transformação exacta que leva qualquer ponto da imagem (incluindo A e B) para coordenadas no
 *    quadrado unitário. Combinada com a proporção do passo 1, esse ponto fica em coordenadas com a
 *    forma certa do retângulo, só por escalar.
 *
 * **Limite conhecido, e a correção aproximada (decisão do promotor, 03/11/2026).** A fórmula do
 * passo 1 só resolve sozinha a inclinação da câmara quando a zona está centrada verticalmente com o
 * eixo ótico; quando não está — o caso comum de uma fotografia tirada do chão para cima, sem o
 * avaliador aos pés da zona — o sistema de equações fica indeterminado (ver `retificacao.test.ts`
 * para a verificação numérica). Confirmado nesse caso real: erro de ~9% na altura.
 *
 * A saída, a pedido do promotor: quando se passa `inclinacaoAssumidaGraus`, a conta deixa de tentar
 * resolver a inclinação a partir dos cantos e usa o valor dado diretamente — a equação que relaciona
 * largura/altura com a inclinação (`H cosθ = W·R`, ver `razaoLarguraAltura`) **não depende do
 * deslocamento vertical da zona**, por isso o resultado fica exato se a inclinação dada for a
 * inclinação real, e erra proporcionalmente ao erro dessa suposição (confirmado numericamente: 5º de
 * erro na suposição dão 3-4,5% de erro na proporção — um erro que cresce devagar, ao contrário do
 * erro do sistema indeterminado, que pode ser grande e imprevisível). `INCLINACAO_TIPICA_GRAUS_PROPOSTA`
 * é um valor de partida — **não confirmado pelo promotor** — para quando ninguém sabe a inclinação
 * real; o piloto (secção 7 do handoff) é que deve confirmar ou corrigir este número.
 *
 * A distância real A–B fixa a escala: mede-se a distância entre A e B nessas coordenadas e o rácio
 * `distanciaRealCm / distância-em-coordenadas` dá os centímetros por unidade.
 *
 * ## O que este ficheiro não verifica
 *
 * Não valida que A e B estão na mesma linha horizontal da zona (isso é o ecrã, não o domínio) nem
 * faz as medições de confirmação (secção 3.2 do handoff) — ficam para o passo 2 da ordem de
 * construção.
 */

export interface Ponto {
  x: number;
  y: number;
}

export interface CantosZona {
  topoEsquerdo: Ponto;
  topoDireito: Ponto;
  baseDireita: Ponto;
  baseEsquerda: Ponto;
}

export interface DimensoesImagem {
  largura: number;
  altura: number;
}

/**
 * Tolerância angular proposta (secção 8.1 do handoff de 03/11/2026) — **não confirmada pelo
 * promotor**. Enquanto não houver decisão, usa-se este valor; mudar aqui não corrige a dívida de
 * ainda não estar fechada (`docs/EM_ABERTO.md`).
 */
export const TOLERANCIA_ANGULAR_GRAUS_PROPOSTA = 2;

/**
 * Inclinação típica da câmara, usada em `retificarZona` só quando se passa
 * `usarInclinacaoAssumida: true` (correção aproximada, decisão do promotor de 03/11/2026, para o
 * caso em que a zona não está centrada verticalmente com o eixo ótico — ver o aviso na descrição do
 * ficheiro). **Valor de partida, não confirmado pelo promotor** — falta o piloto (secção 7 do
 * handoff) para o corrigir.
 */
export const INCLINACAO_TIPICA_GRAUS_PROPOSTA = 20;

export interface ResultadoRetificacao {
  /** Largura real da zona, em centímetros inteiros. */
  larguraCm: number;
  /** Altura real da zona, em centímetros inteiros. */
  alturaCm: number;
  /** Área real da zona, em centímetros quadrados inteiros. */
  areaCm2: number;
  /** Maior desvio, em graus, de um canto do quadrilátero fotografado face a 90º. */
  desvioAngularGraus: number;
  estado: 'ok' | 'revisao';
  motivo: string | null;
  /** true quando a proporção veio de uma inclinação assumida, não calculada a partir dos cantos. */
  aproximado: boolean;
}

function vetor(p: Ponto, origem: Ponto): [number, number] {
  return [p.x - origem.x, p.y - origem.y];
}

function anguloEm(anterior: Ponto, canto: Ponto, seguinte: Ponto): number {
  const [v1x, v1y] = vetor(anterior, canto);
  const [v2x, v2y] = vetor(seguinte, canto);
  const n1 = Math.hypot(v1x, v1y);
  const n2 = Math.hypot(v2x, v2y);
  const cos = (v1x * v2x + v1y * v2y) / (n1 * n2);
  const clamped = Math.max(-1, Math.min(1, cos));
  return (Math.acos(clamped) * 180) / Math.PI;
}

/** Maior desvio face a 90º entre os quatro cantos do quadrilátero fotografado. */
export function desvioAngularDosCantos(cantos: CantosZona): number {
  const { topoEsquerdo: te, topoDireito: td, baseDireita: bd, baseEsquerda: be } = cantos;
  const angulos = [
    anguloEm(be, te, td),
    anguloEm(te, td, bd),
    anguloEm(td, bd, be),
    anguloEm(bd, be, te),
  ];
  return Math.max(...angulos.map((a) => Math.abs(a - 90)));
}

function homogenea(p: Ponto): [number, number, number] {
  return [p.x, p.y, 1];
}

function distancia(p: Ponto, q: Ponto): number {
  return Math.hypot(p.x - q.x, p.y - q.y);
}

/**
 * Razão largura/altura do retângulo real, a partir dos quatro cantos tocados na fotografia e do
 * centro ótico assumido (centro da imagem). Deriva-se de duas medidas da fotografia: a diferença
 * entre a largura da linha de cima e a de baixo (dá a inclinação da câmara) e a posição vertical de
 * cada linha face ao centro (dá, com a inclinação, a proporção real) — ver `retificacao.test.ts`
 * para a derivação passo a passo e a verificação numérica.
 *
 * Quando `inclinacaoAssumidaGraus` é dado, salta o cálculo da inclinação (que fica indeterminado
 * quando a zona não está centrada verticalmente — ver aviso na descrição do ficheiro) e usa esse
 * valor diretamente: `H cosθ = W·R` não depende do deslocamento vertical da zona, por isso o
 * resultado é exato se a inclinação dada for a real.
 */
function razaoLarguraAltura(cantos: CantosZona, centro: Ponto, inclinacaoAssumidaGraus?: number): number {
  const { topoEsquerdo: te, topoDireito: td, baseEsquerda: be, baseDireita: bd } = cantos;

  const larguraTopo = distancia(te, td);
  const larguraBase = distancia(be, bd);
  const yTopo = centro.y - (te.y + td.y) / 2;
  const yBase = centro.y - (be.y + bd.y) / 2;

  const a = yTopo / larguraTopo;
  const b = yBase / larguraBase;
  const r = a - b;

  if (r === 0) return larguraTopo / larguraBase; // sem indício de inclinação: a proporção já é a da imagem

  if (inclinacaoAssumidaGraus !== undefined) {
    const thetaAssumida = (inclinacaoAssumidaGraus * Math.PI) / 180;
    return Math.cos(thetaAssumida) / r;
  }

  const rho = larguraTopo / larguraBase;
  const q = (1 - rho) / (1 + rho);
  const tan2Theta = Math.max(0, (-(a + b) * q) / r);
  const theta = Math.atan(Math.sqrt(tan2Theta));
  return Math.cos(theta) / r;
}

type Matriz3x3 = [[number, number, number], [number, number, number], [number, number, number]];

function inverter3x3(m: Matriz3x3): Matriz3x3 {
  const [[a, b, c], [d, e, f], [g, h, i]] = m;
  const det = a * (e * i - f * h) - b * (d * i - f * g) + c * (d * h - e * g);
  const inv = 1 / det;
  return [
    [(e * i - f * h) * inv, (c * h - b * i) * inv, (b * f - c * e) * inv],
    [(f * g - d * i) * inv, (a * i - c * g) * inv, (c * d - a * f) * inv],
    [(d * h - e * g) * inv, (b * g - a * h) * inv, (a * e - b * d) * inv],
  ];
}

/**
 * Homografia (fórmula de Heckbert) do quadrado unitário (0,0)-(1,0)-(1,1)-(0,1) para os cantos
 * topo-esquerdo/topo-direito/base-direita/base-esquerda, na imagem.
 */
function homografiaDoQuadradoUnitario(cantos: CantosZona): Matriz3x3 {
  const { topoEsquerdo: p0, topoDireito: p1, baseDireita: p2, baseEsquerda: p3 } = cantos;

  const dx1 = p1.x - p2.x;
  const dx2 = p3.x - p2.x;
  const dx3 = p0.x - p1.x + p2.x - p3.x;
  const dy1 = p1.y - p2.y;
  const dy2 = p3.y - p2.y;
  const dy3 = p0.y - p1.y + p2.y - p3.y;

  let g: number;
  let h: number;
  if (dx3 === 0 && dy3 === 0) {
    g = 0;
    h = 0;
  } else {
    const den = dx1 * dy2 - dx2 * dy1;
    g = (dx3 * dy2 - dx2 * dy3) / den;
    h = (dx1 * dy3 - dx3 * dy1) / den;
  }

  const a = p1.x - p0.x + g * p1.x;
  const b = p3.x - p0.x + h * p3.x;
  const cc = p0.x;
  const dd = p1.y - p0.y + g * p1.y;
  const ee = p3.y - p0.y + h * p3.y;
  const ff = p0.y;

  return [
    [a, b, cc],
    [dd, ee, ff],
    [g, h, 1],
  ];
}

function aplicarMatriz(m: Matriz3x3, p: [number, number, number]): [number, number] {
  const x = m[0][0] * p[0] + m[0][1] * p[1] + m[0][2] * p[2];
  const y = m[1][0] * p[0] + m[1][1] * p[1] + m[1][2] * p[2];
  const w = m[2][0] * p[0] + m[2][1] * p[1] + m[2][2] * p[2];
  return [x / w, y / w];
}

/**
 * Corrige a perspetiva de uma zona retangular a partir dos quatro cantos tocados na fotografia e
 * da distância real entre dois pontos A e B. Devolve largura, altura e área reais, e o desvio
 * angular dos cantos face a 90º.
 *
 * Sem chamadas à base de dados, sem leitura de ficheiros — só cálculo (regra 8 dos testes
 * obrigatórios, secção 6 do handoff).
 */
export function retificarZona(
  cantos: CantosZona,
  pontoA: Ponto,
  pontoB: Ponto,
  distanciaRealCm: number,
  dimensoesImagem: DimensoesImagem,
  toleranciaAngularGraus: number = TOLERANCIA_ANGULAR_GRAUS_PROPOSTA,
  inclinacaoAssumidaGraus?: number
): ResultadoRetificacao {
  const desvioAngularGraus = desvioAngularDosCantos(cantos);

  const centro: Ponto = { x: dimensoesImagem.largura / 2, y: dimensoesImagem.altura / 2 };
  const whRatio = razaoLarguraAltura(cantos, centro, inclinacaoAssumidaGraus);
  const aproximado = inclinacaoAssumidaGraus !== undefined;

  const homografia = homografiaDoQuadradoUnitario(cantos);
  const inversa = inverter3x3(homografia);

  const paraUnidade = (p: Ponto): [number, number] => aplicarMatriz(inversa, homogenea(p));
  const [uA, vA] = paraUnidade(pontoA);
  const [uB, vB] = paraUnidade(pontoB);

  const distanciaEmUnidades = Math.hypot(whRatio * (uA - uB), vA - vB);
  const escala = distanciaRealCm / distanciaEmUnidades;

  const larguraCm = Math.round(whRatio * escala);
  const alturaCm = Math.round(escala);
  const areaCm2 = Math.round(larguraCm * alturaCm);

  if (desvioAngularGraus > toleranciaAngularGraus) {
    return {
      larguraCm,
      alturaCm,
      areaCm2,
      desvioAngularGraus,
      estado: 'revisao',
      motivo: 'a zona não parece retangular',
      aproximado,
    };
  }

  return { larguraCm, alturaCm, areaCm2, desvioAngularGraus, estado: 'ok', motivo: null, aproximado };
}
