/**
 * Homografia de um plano (a fachada) para a fotografia — o motor da medição por fotografia.
 *
 * ## Porque é este o motor, e não os anteriores
 *
 * A 03/11/2026 tentaram-se, por esta ordem, três vias que falharam no teste do promotor (ver
 * `docs/DECISOES.md`): resolver a câmara a partir dos quatro cantos de um retângulo de proporção
 * desconhecida (`retificacao.ts` — mal-condicionado quando a zona não está centrada); medir zona a
 * zona (trabalho sem fim); e ajustar um volume genérico à fotografia com deslizadores (oito
 * parâmetros à mão, nunca encaixa). A 04/11/2026 a pergunta certa foi outra: **um retângulo medido
 * por inteiro** (a porta: quatro cantos + largura e altura reais) fixa os oito graus de liberdade da
 * transformação plano → imagem, sem câmara, sem distância focal, sem suposição de inclinação. É
 * geometria projetiva de manual (DLT), exata para tudo o que estiver no plano dessa referência.
 *
 * Verificado contra a fotografia real do promotor: só com a porta, uma aresta do prédio que o motor
 * nunca viu sai vertical no plano com 7 cm de desvio em 14,5 m de altura.
 *
 * ## A referência curta e a altura do prédio
 *
 * A porta mede 3,77 m e o prédio 20 m: a convergência das verticais estima-se em pouco espaço e
 * extrapola-se cinco vezes. Com ±2 px de erro no toque, a altura total varia ±6 %. Uma ou mais
 * **arestas verticais compridas** (de baixo a cima do prédio) fixam o ponto de fuga vertical com
 * muito mais precisão — qualquer aresta vertical serve, mesmo fora do plano da fachada, porque todas
 * as verticais do mundo vão parar ao mesmo ponto de fuga. Com uma aresta, ±2 px dão ±1,5 % na altura.
 *
 * ## O que está fora do plano da fachada
 *
 * A homografia só é exata no plano da referência. A frente de uma marquise ou de um corpo saliente
 * está mais perto da câmara e sai maior na vista endireitada. Da homografia tira-se também a câmara
 * (`camaraDaHomografia`: focal e posição, supondo um telemóvel comum) e, com ela, a frente saliente
 * volta à medida verdadeira (`corrigirParalaxe`), desde que se saiba quanto sai da fachada.
 *
 * Funções puras: sem base de dados, sem DOM.
 */

export interface Ponto {
  x: number;
  y: number;
}

/** Matriz 3×3 por linhas. */
export type Matriz3 = [number, number, number, number, number, number, number, number, number];

/** Ponto homogéneo [x, y, w]. */
export type Homogeneo = [number, number, number];

/** Aplica a homografia a um ponto. `null` quando o ponto vai para o infinito (ou para trás). */
export function aplicar(h: Matriz3, p: Ponto): Ponto | null {
  const w = h[6] * p.x + h[7] * p.y + h[8];
  if (!Number.isFinite(w) || Math.abs(w) < 1e-12) return null;
  return { x: (h[0] * p.x + h[1] * p.y + h[2]) / w, y: (h[3] * p.x + h[4] * p.y + h[5]) / w };
}

/** Como `aplicar`, mas exige w > 0 — o lado do plano que a câmara de facto vê. */
export function aplicarVisivel(h: Matriz3, p: Ponto): Ponto | null {
  const w = h[6] * p.x + h[7] * p.y + h[8];
  if (!(w > 1e-12)) return null;
  return { x: (h[0] * p.x + h[1] * p.y + h[2]) / w, y: (h[3] * p.x + h[4] * p.y + h[5]) / w };
}

export function inverter(h: Matriz3): Matriz3 {
  const [a, b, c, d, e, f, g, i, k] = h;
  const A = e * k - f * i;
  const B = -(d * k - f * g);
  const C = d * i - e * g;
  const det = a * A + b * B + c * C;
  if (!Number.isFinite(det) || Math.abs(det) < 1e-18) throw new Error('homografia singular');
  const r: Matriz3 = [
    A / det,
    -(b * k - c * i) / det,
    (b * f - c * e) / det,
    B / det,
    (a * k - c * g) / det,
    -(a * f - c * d) / det,
    C / det,
    -(a * i - b * g) / det,
    (a * e - b * d) / det,
  ];
  return r;
}

function multiplicar(a: Matriz3, b: Matriz3): Matriz3 {
  const r: number[] = new Array(9).fill(0);
  for (let i = 0; i < 3; i++)
    for (let j = 0; j < 3; j++) for (let k = 0; k < 3; k++) r[i * 3 + j] = r[i * 3 + j]! + a[i * 3 + k]! * b[k * 3 + j]!;
  return r as unknown as Matriz3;
}

/**
 * Vetor próprio do menor valor próprio de uma matriz simétrica (método de Jacobi). Chega para as
 * matrizes 9×9 e 3×3 daqui; com coordenadas normalizadas (Hartley), o condicionamento é bom.
 */
function menorVetorProprio(m: number[][]): number[] {
  const n = m.length;
  const a = m.map((linha) => [...linha]);
  const v: number[][] = Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => (i === j ? 1 : 0)));
  for (let varrimento = 0; varrimento < 100; varrimento++) {
    let foraDaDiagonal = 0;
    for (let p = 0; p < n; p++) for (let q = p + 1; q < n; q++) foraDaDiagonal += a[p]![q]! ** 2;
    if (foraDaDiagonal < 1e-30) break;
    for (let p = 0; p < n; p++) {
      for (let q = p + 1; q < n; q++) {
        const apq = a[p]![q]!;
        if (Math.abs(apq) < 1e-300) continue;
        const theta = (a[q]![q]! - a[p]![p]!) / (2 * apq);
        const t = Math.sign(theta || 1) / (Math.abs(theta) + Math.sqrt(theta * theta + 1));
        const c = 1 / Math.sqrt(t * t + 1);
        const s = t * c;
        for (let k = 0; k < n; k++) {
          const akp = a[k]![p]!;
          const akq = a[k]![q]!;
          a[k]![p] = c * akp - s * akq;
          a[k]![q] = s * akp + c * akq;
        }
        for (let k = 0; k < n; k++) {
          const apk = a[p]![k]!;
          const aqk = a[q]![k]!;
          a[p]![k] = c * apk - s * aqk;
          a[q]![k] = s * apk + c * aqk;
        }
        for (let k = 0; k < n; k++) {
          const vkp = v[k]![p]!;
          const vkq = v[k]![q]!;
          v[k]![p] = c * vkp - s * vkq;
          v[k]![q] = s * vkp + c * vkq;
        }
      }
    }
  }
  let menor = 0;
  for (let i = 1; i < n; i++) if (a[i]![i]! < a[menor]![menor]!) menor = i;
  return v.map((linha) => linha[menor]!);
}

/** Mínimos quadrados homogéneos: o vetor x (‖x‖ = 1) que minimiza ‖A·x‖. */
function nucleo(linhas: number[][]): number[] {
  const n = linhas[0]!.length;
  const ata = Array.from({ length: n }, () => new Array(n).fill(0) as number[]);
  for (const r of linhas) for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) ata[i]![j] = ata[i]![j]! + r[i]! * r[j]!;
  return menorVetorProprio(ata);
}

/** Normalização de Hartley: centróide na origem, distância média √2. */
function normalizacao(pontos: Ponto[]): Matriz3 {
  const cx = pontos.reduce((s, p) => s + p.x, 0) / pontos.length;
  const cy = pontos.reduce((s, p) => s + p.y, 0) / pontos.length;
  const media = pontos.reduce((s, p) => s + Math.hypot(p.x - cx, p.y - cy), 0) / pontos.length || 1;
  const s = Math.SQRT2 / media;
  return [s, 0, -s * cx, 0, s, -s * cy, 0, 0, 1];
}

/**
 * Ponto de fuga comum a vários segmentos (as retas que, no mundo, são paralelas), por mínimos
 * quadrados. Por omissão, cada reta pesa o mesmo, venha de um segmento curto ou comprido.
 *
 * Com `pesarPeloComprimento`, cada reta pesa proporcionalmente ao comprimento do segmento: o mesmo
 * erro de toque nas pontas inclina um segmento curto muito mais do que um comprido, e o lado de uma
 * porta (150 px) não deve valer o mesmo que uma cimalha (1200 px). Sem isto, duas retas curtas
 * erradas puxam o ponto de fuga tanto como duas compridas certas (medido nos testes: com a base e o
 * topo da porta inclinados 2 px, duas horizontais compridas só corrigem a sério com este peso).
 */
export function pontoDeFuga(segmentos: [Ponto, Ponto][], opcoes: { pesarPeloComprimento?: boolean } = {}): Homogeneo {
  if (segmentos.length < 2) throw new Error('são precisos pelo menos dois segmentos');
  const todos = segmentos.flat();
  const t = normalizacao(todos);
  const norm = (p: Ponto): Homogeneo => [t[0] * p.x + t[2], t[4] * p.y + t[5], 1];
  const linhas = segmentos.map(([p, q]) => {
    const a = norm(p);
    const b = norm(q);
    const l = [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
    // hypot(l₀, l₁) é o comprimento do segmento (em coordenadas normalizadas).
    const n = opcoes.pesarPeloComprimento ? 1 : Math.hypot(l[0]!, l[1]!) || 1;
    return l.map((x) => x / n);
  });
  const v = nucleo(linhas);
  // Volta às coordenadas da imagem: v_imagem = T⁻¹ · v_normalizado.
  const ti = inverter(t);
  return [
    ti[0] * v[0]! + ti[1] * v[1]! + ti[2] * v[2]!,
    ti[3] * v[0]! + ti[4] * v[1]! + ti[5] * v[2]!,
    ti[6] * v[0]! + ti[7] * v[1]! + ti[8] * v[2]!,
  ];
}

/**
 * As equações lineares de Hn[:, coluna] × pf_n = 0: a coluna `coluna` da homografia normalizada (0 =
 * direção horizontal do plano, 1 = vertical) tem de apontar para o ponto de fuga. Nas coordenadas
 * normalizadas, Hn·eₖ ∥ Ti·pf (a translação de Tp não mexe numa direção). Das três equações só duas
 * são independentes; entram as três para não ter de escolher qual largar quando uma componente do
 * ponto de fuga é zero — o caso de um ponto de fuga no infinito (retas paralelas na imagem), que
 * assim funciona como qualquer outro, sem divisão nenhuma por w.
 */
function restricoesDeFuga(coluna: 0 | 1, pf: Homogeneo, ti: Matriz3, peso: number): number[][] {
  const n0 = ti[0] * pf[0] + ti[2] * pf[2];
  const n1 = ti[4] * pf[1] + ti[5] * pf[2];
  const n2 = pf[2];
  const norma = Math.hypot(n0, n1, n2) || 1;
  const [a, b, c] = [n0 / norma, n1 / norma, n2 / norma];
  // A coluna k de Hn = (h_k, h_{3+k}, h_{6+k}).
  const [i0, i1, i2] = [coluna, 3 + coluna, 6 + coluna];
  const r1 = new Array(9).fill(0) as number[];
  r1[i1] = c * peso;
  r1[i2] = -b * peso;
  const r2 = new Array(9).fill(0) as number[];
  r2[i2] = a * peso;
  r2[i0] = -c * peso;
  const r3 = new Array(9).fill(0) as number[];
  r3[i0] = b * peso;
  r3[i1] = -a * peso;
  return [r1, r2, r3];
}

/**
 * Homografia plano → imagem a partir de correspondências de pontos (pelo menos quatro), com duas
 * restrições opcionais: a direção vertical do plano (0, 1) e a horizontal (1, 0) têm de ir parar a
 * pontos de fuga conhecidos. DLT normalizado (Hartley); com exatamente quatro pontos e sem ponto de
 * fuga, a solução é exata. Os pontos de fuga são homogéneos e podem estar no infinito (w = 0).
 *
 * `pesoFuga` diz quanto mais vale cada ponto de fuga do que cada ponto: arestas compridas medem a
 * convergência das retas com muito mais precisão do que os cantos de uma referência curta.
 */
export function homografia(
  plano: Ponto[],
  imagem: Ponto[],
  opcoes: { fugaVertical?: Homogeneo; fugaHorizontal?: Homogeneo; pesoFuga?: number } = {},
): Matriz3 {
  if (plano.length !== imagem.length || plano.length < 4) throw new Error('são precisos pelo menos quatro pares de pontos');
  const tp = normalizacao(plano);
  const ti = normalizacao(imagem);
  const linhas: number[][] = [];
  for (let k = 0; k < plano.length; k++) {
    const x = tp[0] * plano[k]!.x + tp[2];
    const y = tp[4] * plano[k]!.y + tp[5];
    const u = ti[0] * imagem[k]!.x + ti[2];
    const v = ti[4] * imagem[k]!.y + ti[5];
    linhas.push([x, y, 1, 0, 0, 0, -u * x, -u * y, -u]);
    linhas.push([0, 0, 0, x, y, 1, -v * x, -v * y, -v]);
  }
  const peso = opcoes.pesoFuga ?? 30;
  // H·(0,1,0) ∥ ponto de fuga vertical; H·(1,0,0) ∥ ponto de fuga horizontal.
  if (opcoes.fugaVertical) linhas.push(...restricoesDeFuga(1, opcoes.fugaVertical, ti, peso));
  if (opcoes.fugaHorizontal) linhas.push(...restricoesDeFuga(0, opcoes.fugaHorizontal, ti, peso));
  const hn = nucleo(linhas) as Matriz3;
  const h = multiplicar(multiplicar(inverter(ti), hn), tp);
  const escala = h[8] !== 0 ? h[8] : 1;
  return h.map((x) => x / escala) as Matriz3;
}

export interface ReferenciaRetangular {
  /** Cantos na fotografia, pela ordem: inferior esquerdo, inferior direito, superior direito, superior esquerdo. */
  cantos: [Ponto, Ponto, Ponto, Ponto];
  larguraM: number;
  alturaM: number;
}

export interface Calibracao {
  /** Plano (metros; X para a direita, Y para cima, origem no canto inferior esquerdo da referência) → imagem (píxeis). */
  planoParaImagem: Matriz3;
  imagemParaPlano: Matriz3;
}

/**
 * Por que a referência não serve, numa frase para quem a marcou; `null` quando serve. Não verifica
 * se o retângulo está mesmo no plano da fachada — isso só quem esteve lá sabe.
 */
export function problemaDaReferencia(ref: ReferenciaRetangular): string | null {
  if (!(ref.larguraM > 0) || !(ref.alturaM > 0)) return 'Indique a largura e a altura reais da referência.';
  const [p0, p1, p2, p3] = ref.cantos;
  const pts = [p0, p1, p2, p3];
  const cruz = (a: Ponto, b: Ponto, c: Ponto) => (b.x - a.x) * (c.y - b.y) - (b.y - a.y) * (c.x - b.x);
  const sinais = pts.map((p, i) => Math.sign(cruz(p, pts[(i + 1) % 4]!, pts[(i + 2) % 4]!)));
  if (sinais.some((s) => s === 0) || !sinais.every((s) => s === sinais[0])) {
    return 'Os quatro cantos não formam um retângulo visto em perspetiva — confirme a ordem (inferior esquerdo, inferior direito, superior direito, superior esquerdo).';
  }
  // Na fotografia o eixo y desce. A base (1.º → 2.º) tem de ser mais horizontal do que vertical e ir
  // para a direita; o lado esquerdo (1.º → 4.º) mais vertical do que horizontal e ir para cima. Uma
  // ordem rodada de um canto troca os papéis das arestas e falha aqui (comparar médias não chegava:
  // numa ordem rodada, as médias saem quase iguais).
  const baseHorizontal = Math.abs(p1.x - p0.x) > Math.abs(p1.y - p0.y) && p1.x > p0.x;
  const ladoVertical = Math.abs(p3.y - p0.y) > Math.abs(p3.x - p0.x) && p3.y < p0.y;
  if (!baseHorizontal || !ladoVertical) {
    return 'Os cantos parecem trocados — o primeiro é o inferior esquerdo e segue-se no sentido inferior direito, superior direito, superior esquerdo.';
  }
  return null;
}

/**
 * Calibração métrica do plano da fachada a partir de um retângulo medido e, opcionalmente, de
 * arestas verticais compridas do prédio (cada uma: dois pontos, em baixo e em cima) e de arestas
 * horizontais compridas da fachada (uma cimalha, um friso, a linha de um peitoril corrido — cada
 * uma: dois pontos, à esquerda e à direita).
 *
 * As horizontais servem para o erro que as verticais não apanham: a base e o topo de uma porta têm
 * pouco mais de um metro e meio, e dois píxeis de erro num canto inclinam a direção horizontal
 * inteira — a vista endireitada sai ligeiramente rodada e um ponto a 10 m para o lado cai à altura
 * errada. Ao contrário das verticais, só servem horizontais **do plano da fachada** (ou paralelas a
 * ele): horizontais de outras paredes vão para outro ponto de fuga.
 *
 * As arestas entram pesadas pelo comprimento (`pontoDeFuga`, `pesarPeloComprimento`): senão a base e
 * o topo da porta, curtos e errados, valeriam tanto como as horizontais compridas, e as ombreiras tanto
 * como uma esquina de baixo a cima. É o peso certo para o mesmo erro nas pontas de cada segmento (o
 * ângulo erra ~1/comprimento). Até 04/11/2026 as verticais pesavam por igual; com as arestas propostas
 * pela fotografia (`arestasPropostas.ts`, ao centésimo de píxel) isso deitava fora a precisão delas. Na
 * fotografia do promotor, com a porta tocada no e2e (as ombreiras apontam a um ponto de fuga 3° ao lado
 * do das esquinas), a vertical do passo 2, uma vertical proposta e duas horizontais, o mesmo quadrilátero
 * da fotografia: por igual, a esquina esquerda do prédio ficava 1,3° inclinada na vista e o contorno
 * media 224,4 m² (214,7 com a esquina como terceira vertical); pelo comprimento, 0,46° e 218,1 m² (214,8).
 *
 * **Uma só horizontal não chega para a fachada toda, e longe dela pode piorar.** Uma reta só diz
 * que o ponto de fuga está algures nela; onde, ao longo dela, continuam a decidir a base e o topo da
 * referência, curtos e com o erro do toque. A altura da própria aresta fica certa; as outras ficam
 * entre a aresta e a referência, e o resultado depende do erro que a referência traz. Medido nos
 * testes (16 m, 20° de lado, ponto a 10 m para o lado da porta):
 * - referência marcada rodada (os dois cantos da direita 2 px acima): a aresta certa a uma altura e a
 *   referência rodada a outra abrem um leque. Uma cimalha a 9 m deixa o passeio pior do que sem ela
 *   (0,117 → 0,139 m); uma **soleira** ao nível do passeio põe o erro a 9 m de altura a dobrar
 *   (0,154 → 0,332 m) — está à altura da base da porta e pouco lhe acrescenta;
 * - erros independentes nos cantos e nas pontas da aresta (±2 px, o caso normal): uma só horizontal
 *   melhora a média da fachada, mas piora-a num caso em cada cinco com a cimalha e em dois em cada
 *   cinco com a soleira.
 * Duas horizontais compridas a alturas diferentes (a cimalha e um friso, a linha dos peitoris de um
 * piso) fixam o ponto de fuga sozinhas, e aí a correção vale para a fachada toda (ainda piora cerca
 * de um caso em sete, pelo erro nas pontas das próprias arestas). Quem marca uma só horizontal deve
 * ser avisado: `avisoDasHorizontais`.
 *
 * Porque não se corrige só a inclinação. Com uma só horizontal, rodar todas as horizontais pelo
 * mesmo ângulo, sem mexer no resto da perspetiva que a referência deu (um cisalhamento da vista
 * endireitada), acerta a fachada toda quando a referência foi marcada rodada — mas, com erros
 * independentes nos cantos, piora a fachada em seis casos de cada dez e piora a média. Os dois
 * modelos de erro pedem correções opostas, e nenhuma serve aos dois; ficou a do ponto de fuga, que é
 * a que os dados dão quando os cantos foram tocados cada um por si.
 */
export function calibrar(
  ref: ReferenciaRetangular,
  arestasVerticais: [Ponto, Ponto][] = [],
  arestasHorizontais: [Ponto, Ponto][] = [],
): Calibracao {
  const problema = problemaDaReferencia(ref);
  if (problema) throw new Error(problema);
  const plano: Ponto[] = [
    { x: 0, y: 0 },
    { x: ref.larguraM, y: 0 },
    { x: ref.larguraM, y: ref.alturaM },
    { x: 0, y: ref.alturaM },
  ];
  const [be, bd, td, te] = ref.cantos;
  let fugaVertical: Homogeneo | undefined;
  if (arestasVerticais.length > 0) {
    // As ombreiras da própria referência também são verticais: entram no ponto de fuga com as arestas,
    // pesadas pelo comprimento como elas.
    fugaVertical = pontoDeFuga([[be, te], [bd, td], ...arestasVerticais], { pesarPeloComprimento: true });
  }
  let fugaHorizontal: Homogeneo | undefined;
  if (arestasHorizontais.length > 0) {
    // A base e o topo da referência também são horizontais da fachada, mas curtas: pesam pelo comprimento.
    fugaHorizontal = pontoDeFuga([[be, bd], [te, td], ...arestasHorizontais], { pesarPeloComprimento: true });
  }
  const planoParaImagem = homografia(plano, [be, bd, td, te], { fugaVertical, fugaHorizontal });
  return { planoParaImagem, imagemParaPlano: inverter(planoParaImagem) };
}

/**
 * O aviso para quem marcou uma só aresta horizontal (ver `calibrar`): endireita as alturas perto
 * dela, mas longe dela pode deixar a fachada pior do que estava. `null` sem horizontais ou com duas
 * ou mais.
 */
export function avisoDasHorizontais(arestasHorizontais: readonly (readonly [Ponto, Ponto])[]): string | null {
  if (arestasHorizontais.length !== 1) return null;
  return (
    'Uma só horizontal endireita as alturas perto dela, mas longe dela pode piorar. Marcar uma segunda horizontal ' +
    'comprida a outra altura — a cimalha e a linha das janelas de um piso, por exemplo.'
  );
}

/** Onde estava a câmara e que lente tinha, tirados da homografia (`camaraDaHomografia`). */
export interface CamaraDaFotografia {
  /** Distância focal em píxeis da fotografia. */
  focalPx: number;
  /**
   * Centro ótico em coordenadas do plano da fachada, em metros: x para a direita, y para cima (a
   * origem é a da calibração, o canto inferior esquerdo da referência), z a distância à fachada,
   * sempre positiva — do lado da câmara, à frente da fachada.
   */
  centro: { x: number; y: number; z: number };
}

/**
 * O erro de toque com que se conta, em píxeis da fotografia, em cada coordenada de cada canto da
 * referência (um desvio-padrão). Com a lupa e o íman nos cantos, 1 px é o que se consegue; é com ele
 * que `incertezaDaFocal` decide se a fotografia tem perspetiva que chegue, e que `margemDaArea` dá a
 * margem de erro da área (aí também nas pontas das arestas). Ainda não medido no terreno.
 */
export const ERRO_DE_TOQUE_PX = 1;

/**
 * A incerteza relativa da focal (um desvio-padrão, com `ERRO_DE_TOQUE_PX`) acima da qual
 * `camaraDaHomografia` devolve `null`. A 25 %, o erro mediano da focal com ±1 px nos cantos ronda os
 * 10 a 12 %; com a câmara a 12 m, a correção de uma marquise de 1,2 m (10 %) fica certa a ±2,5 %.
 */
export const INCERTEZA_MAXIMA_DA_FOCAL = 0.25;

/** O tamanho real da referência — o que `incertezaDaFocal` e `camaraDaHomografia` precisam de saber dela. */
export interface TamanhoDaReferencia {
  larguraM: number;
  alturaM: number;
}

/**
 * A referência que se supõe quando não se diz qual foi: uma porta comum, 0,90 × 2,10 m. A incerteza
 * depende do tamanho da referência na fotografia, e a homografia não o sabe; supor uma referência
 * mais pequena do que a verdadeira só torna a função mais exigente. Uma referência ainda mais
 * pequena do que esta (uma janela pequena) tem de ser passada, senão a câmara passa com menos
 * perspetiva do que devia.
 */
export const REFERENCIA_POR_OMISSAO: Readonly<TamanhoDaReferencia> = { larguraM: 0.9, alturaM: 2.1 };

/**
 * 1/f², com a focal f em unidades do lado maior da imagem — `NaN` quando não se pode tirar (a
 * fotografia de frente, sem perspetiva nenhuma). Pode sair negativo: nenhuma câmara dá essa
 * homografia (ver `camaraDaHomografia`).
 */
function umSobreF2(h: Matriz3, larguraImg: number, alturaImg: number): number {
  // Coordenadas da imagem com o ponto principal na origem e o lado maior a valer 1: a focal passa a
  // ser um número perto de 1 e as equações ficam bem condicionadas.
  const s = Math.max(larguraImg, alturaImg);
  const [cx, cy] = [larguraImg / 2, alturaImg / 2];
  const a1 = (h[0] - cx * h[6]) / s;
  const a2 = (h[1] - cx * h[7]) / s;
  const b1 = (h[3] - cy * h[6]) / s;
  const b2 = (h[4] - cy * h[7]) / s;
  const [c1, c2] = [h[6], h[7]];
  // Colunas de K⁻¹·H: m₁ = (a1/f, b1/f, c1), m₂ = (a2/f, b2/f, c2). Com u = 1/f²:
  //   m₁·m₂ = 0           →  A1·u + B1 = 0
  //   |m₁|² − |m₂|² = 0   →  A2·u + B2 = 0
  // resolvidas juntas por mínimos quadrados, a primeira a dobrar (assim as duas pesam o mesmo
  // qualquer que seja a rotação da fotografia).
  const A1 = a1 * a2 + b1 * b2;
  const B1 = c1 * c2;
  const A2 = a1 * a1 + b1 * b1 - (a2 * a2 + b2 * b2);
  const B2 = c1 * c1 - c2 * c2;
  const den = 4 * A1 * A1 + A2 * A2;
  // De frente, A1 = A2 = 0: o denominador é zero, ou quase, e u não quer dizer nada.
  const k = (a1 * a1 + b1 * b1 + a2 * a2 + b2 * b2) / 2;
  if (!(k > 0) || !(den > 1e-24 * k * k)) return NaN;
  return -(4 * A1 * B1 + A2 * B2) / den;
}

/**
 * Quanto se sabe da focal: a incerteza relativa (σ_f / f) que `ERRO_DE_TOQUE_PX` em cada coordenada
 * dos quatro cantos da referência lhe deixa. `Infinity` quando a focal nem se pode tirar.
 *
 * Calcula-se sem saber os cantos que foram tocados, só com a homografia e o tamanho real da
 * referência: os cantos são onde a homografia põe o retângulo (0, 0)–(largura, altura). Cada uma das
 * oito coordenadas anda 1 px para cada lado, refaz-se a homografia por esses quatro pontos e vê-se
 * quanto 1/f² mexe. É a mesma conta para uma porta a 8 m e para uma a 30 m: quanto mais pequena a
 * referência na fotografia, mais a mexe o mesmo píxel, e é isso que um limite fixo em graus não via.
 * Linearizado no ponto medido: num caso no limite, o próprio erro de toque pode fazer a perspetiva
 * parecer maior do que é e a incerteza parecer menor (ver os testes).
 *
 * As arestas verticais e horizontais não entram aqui (só a homografia chega à função): com elas, a
 * focal é mais certa do que este número diz, e a função fica do lado seguro.
 */
export function incertezaDaFocal(
  h: Matriz3,
  larguraImg: number,
  alturaImg: number,
  referencia: TamanhoDaReferencia = REFERENCIA_POR_OMISSAO,
): number {
  if (!(larguraImg > 0) || !(alturaImg > 0) || !h.every(Number.isFinite)) return Infinity;
  if (!(referencia.larguraM > 0) || !(referencia.alturaM > 0)) return Infinity;
  const u = umSobreF2(h, larguraImg, alturaImg);
  if (!(u > 0)) return Infinity;
  const plano: Ponto[] = [
    { x: 0, y: 0 },
    { x: referencia.larguraM, y: 0 },
    { x: referencia.larguraM, y: referencia.alturaM },
    { x: 0, y: referencia.alturaM },
  ];
  const cantos: Ponto[] = [];
  for (const p of plano) {
    const q = aplicarVisivel(h, p);
    if (!q) return Infinity;
    cantos.push(q);
  }
  const e = ERRO_DE_TOQUE_PX;
  let variancia = 0;
  for (let i = 0; i < 8; i++) {
    const canto = i >> 1;
    const eixo = i & 1 ? 'y' : 'x';
    const mexido = (sinal: number) =>
      umSobreF2(
        homografia(
          plano,
          cantos.map((c, j) => (j === canto ? { ...c, [eixo]: c[eixo] + sinal * e } : c)),
        ),
        larguraImg,
        alturaImg,
      );
    // Diferença centrada sobre ±1 px: apanha também o que não é linear à escala do erro de toque.
    const d = (mexido(1) - mexido(-1)) / 2;
    if (!Number.isFinite(d)) return Infinity;
    variancia += d * d;
  }
  // f = u^(−1/2) ⇒ σ_f / f = σ_u / (2·u).
  return Math.sqrt(variancia) / (2 * u);
}

/**
 * A câmara que tirou a fotografia, a partir da homografia plano → imagem: a distância focal e o
 * centro ótico, em metros, no referencial da fachada. É o que permite corrigir o que não está no
 * plano da fachada (`corrigirParalaxe`).
 *
 * Supõe uma câmara de telemóvel comum: ponto principal no centro da imagem, píxeis quadrados, sem
 * distorção da lente (ou já corrigida). Com essas três suposições sobra uma incógnita na matriz da
 * câmara, a focal f, e a homografia dá duas equações para ela (Zhang, 2000): as duas primeiras
 * colunas de K⁻¹·H são as direções horizontal e vertical da fachada vistas da câmara, logo têm de ser
 * perpendiculares e do mesmo comprimento. As duas são lineares em 1/f², e resolvem-se juntas por
 * mínimos quadrados.
 *
 * `referencia` é o tamanho real da referência com que se calibrou; sem ele, supõe-se
 * `REFERENCIA_POR_OMISSAO` (uma porta comum), o que só deixa a função mais exigente quando a
 * referência verdadeira é maior. Quem tem a referência deve passá-la.
 *
 * **Limitação, e porque devolve `null`.** A informação sobre a focal está toda na perspetiva — no
 * quanto as retas paralelas da fachada convergem. Numa fotografia tirada de frente, as paralelas
 * continuam paralelas, as duas equações reduzem-se a 0 = 0 e qualquer focal serve: a mesma fotografia
 * tanto pode ser de uma grande angular perto como de uma teleobjetiva longe. E o erro de toque
 * inventa perspetiva: tanto mais quanto mais pequena a referência aparece, ou seja, quanto mais longe
 * foi tirada a fotografia. Por isso devolve `null` quando a focal sai mais incerta do que
 * `INCERTEZA_MAXIMA_DA_FOCAL` com o erro de toque de `ERRO_DE_TOQUE_PX` (`incertezaDaFocal`) — um
 * critério que cresce com a distância, ao contrário de um ângulo mínimo fixo (até 04/11/2026, 8°:
 * afinado para uma porta a 12 m, deixava passar, de frente a 30 m, uma câmara em cada cinco, com a
 * focal até 3,8 vezes a verdadeira). Devolve `null` também quando 1/f² sai negativo (nenhuma câmara
 * dá aquela homografia) e quando a focal sai fora de [0,3; 3] × o lado maior da imagem.
 *
 * Esse intervalo deixa de fora, **de propósito**, a teleobjetiva 5× dos telemóveis de topo (111 a
 * 120 mm equivalentes, 3,1 a 3,3 × o lado maior), mesmo com os cantos perfeitos e a perspetiva forte:
 * aí o `null` não quer dizer cantos mal marcados. O intervalo é a rede para o que `incertezaDaFocal`
 * não vê, por não ser erro de toque — as medidas da referência mal escritas, uma referência fora do
 * plano da parede. Só apanha os casos grosseiros (uma altura mal escrita pode dar uma focal três vezes
 * e meia a verdadeira e passar, ver os testes), e cada degrau a mais deixa passar mais deles. O que se
 * perde com a 5× é pouco: a fachada só cabe nela de longe, e a correção da paralaxe vale s/z — 3 %
 * para uma marquise de 1,2 m a 35 m; sem câmara, a marquise fica medida por excesso, nunca por
 * defeito. Se as fotografias a 5× passarem a contar, o limite de cima sobe para 3,5. A 3× (77 mm) e a
 * grande angular 0,5× (95 a 110° no lado maior) cabem no intervalo; a fotografia real dos testes dá
 * 102°, o que só uma grande angular faz.
 *
 * Mesmo dentro do limite, o erro de toque passa para a focal: com ±1 px nos cantos de uma porta a
 * 12 m, o erro mediano ronda 8 % a 10° de inclinação e 1 a 3 % de 20° para cima (ver os testes). Um
 * recorte da fotografia (ponto principal fora do centro) engana a função sem aviso.
 */
export function camaraDaHomografia(
  h: Matriz3,
  larguraImg: number,
  alturaImg: number,
  referencia: TamanhoDaReferencia = REFERENCIA_POR_OMISSAO,
): CamaraDaFotografia | null {
  if (!(larguraImg > 0) || !(alturaImg > 0) || !h.every(Number.isFinite)) return null;
  const u = umSobreF2(h, larguraImg, alturaImg);
  if (!(u > 0) || !Number.isFinite(u)) return null;
  const fn = 1 / Math.sqrt(u);
  if (!(fn >= 0.3 && fn <= 3)) return null;
  if (!(incertezaDaFocal(h, larguraImg, alturaImg, referencia) <= INCERTEZA_MAXIMA_DA_FOCAL)) return null;

  const s = Math.max(larguraImg, alturaImg);
  const [cx, cy] = [larguraImg / 2, alturaImg / 2];
  const a1 = (h[0] - cx * h[6]) / s;
  const a2 = (h[1] - cx * h[7]) / s;
  const a3 = (h[2] - cx * h[8]) / s;
  const b1 = (h[3] - cy * h[6]) / s;
  const b2 = (h[4] - cy * h[7]) / s;
  const b3 = (h[5] - cy * h[8]) / s;
  const [c1, c2, c3] = [h[6], h[7], h[8]];

  // [r₁ r₂ t] = λ·K⁻¹·H, com λ a média geométrica das duas escalas (com ruído, |m₁| ≠ |m₂|).
  const m1 = [a1 / fn, b1 / fn, c1];
  const m2 = [a2 / fn, b2 / fn, c2];
  const m3 = [a3 / fn, b3 / fn, c3];
  const n1 = Math.hypot(m1[0]!, m1[1]!, m1[2]!);
  const n2 = Math.hypot(m2[0]!, m2[1]!, m2[2]!);
  if (!(n1 > 0) || !(n2 > 0)) return null;
  const lambda = 1 / Math.sqrt(n1 * n2);
  const t = m3.map((x) => x * lambda);
  // Com ruído, r₁ e r₂ não saem perpendiculares: o par ortonormado mais próximo, simétrico nos dois
  // (as bissetrizes de r₁ e r₂ são perpendiculares; roda-se ±45° a partir delas).
  const e1 = m1.map((x) => x / n1);
  const e2 = m2.map((x) => x / n2);
  const soma = e1.map((x, i) => x + e2[i]!);
  const dif = e1.map((x, i) => x - e2[i]!);
  const ns = Math.hypot(soma[0]!, soma[1]!, soma[2]!);
  const nd = Math.hypot(dif[0]!, dif[1]!, dif[2]!);
  if (!(ns > 0) || !(nd > 0)) return null;
  const r1 = soma.map((x, i) => (x / ns + dif[i]! / nd) / Math.SQRT2);
  const r2 = soma.map((x, i) => (x / ns - dif[i]! / nd) / Math.SQRT2);
  const r3 = [r1[1]! * r2[2]! - r1[2]! * r2[1]!, r1[2]! * r2[0]! - r1[0]! * r2[2]!, r1[0]! * r2[1]! - r1[1]! * r2[0]!];
  const escalar = (a: number[], b: number[]) => a[0]! * b[0]! + a[1]! * b[1]! + a[2]! * b[2]!;
  // t = R·(origem − centro) ⇒ centro = −Rᵀ·t no referencial (horizontal, vertical, normal) da
  // fachada. O sinal de λ e o lado da normal não se sabem da homografia, mas não importam: x e y não
  // mudam com o sinal de λ, e z é, por definição, a distância do lado da câmara.
  const centro = { x: -escalar(r1, t), y: -escalar(r2, t), z: Math.abs(escalar(r3, t)) };
  if (![centro.x, centro.y, centro.z].every(Number.isFinite)) return null;
  return { focalPx: fn * s, centro };
}

/**
 * Corrige a paralaxe de um ponto que não está no plano da fachada mas num plano paralelo, `saliencia`
 * metros à frente dela — a frente de uma marquise, de uma varanda fechada, de um corpo saliente.
 *
 * A vista endireitada leva tudo para o plano da fachada (Z = 0): um ponto mais perto da câmara cai
 * onde o raio que passa por ele fura a fachada, mais longe do pé da câmara do que está na realidade
 * — a frente de uma marquise sai maior do que é. Sendo C o centro ótico (`camaraDaHomografia`) e pé =
 * (C.x, C.y) o ponto da fachada em frente da câmara, a posição verdadeira é
 *
 *     pé + (p − pé) · (C.z − saliencia) / C.z
 *
 * Com `saliencia` ≤ 0 (nada a corrigir, ou um recuo, que esta função não trata) ou ≥ C.z (o ponto
 * estaria atrás da câmara), devolve o ponto tal como está.
 */
export function corrigirParalaxe(p: Ponto, centro: { x: number; y: number; z: number }, saliencia: number): Ponto {
  if (!(saliencia > 0) || !(saliencia < centro.z)) return p;
  const fator = (centro.z - saliencia) / centro.z;
  return { x: centro.x + (p.x - centro.x) * fator, y: centro.y + (p.y - centro.y) * fator };
}

export const distancia = (a: Ponto, b: Ponto) => Math.hypot(a.x - b.x, a.y - b.y);

/**
 * Medidas de controlo (avaliação do método "Levantamento v7", 04/11/2026): uma segunda distância
 * medida à fita, longe da referência, comparada com a mesma distância medida no desenho. A homografia
 * passa exatamente pela referência e propaga sem aviso qualquer erro que ela traga — uma largura mal
 * escrita (90 cm em vez de 80) aumenta todas as larguras 12,5 %, uma porta recuada fora do plano da
 * parede encolhe tudo — e nada mais na ferramenta o vê. Uma medida de controlo vê.
 *
 * A distância em metros, no plano da fachada, entre dois pontos da fotografia; nula se algum cair do
 * outro lado do horizonte do plano.
 */
export function medirNoPlano(cal: Calibracao, a: Ponto, b: Ponto): number | null {
  const pa = aplicar(cal.imagemParaPlano, a);
  const pb = aplicar(cal.imagemParaPlano, b);
  if (!pa || !pb || ![pa.x, pa.y, pb.x, pb.y].every(Number.isFinite)) return null;
  return distancia(pa, pb);
}

/**
 * Desvio a partir do qual uma medida de controlo pede para rever a referência. O ruído medido nos
 * testes é de ~1 % nas larguras e 1–1,5 % nas alturas com uma aresta (3–6 % sem ela); 1 % daria falsos
 * alarmes, 3 % ainda apanha uma largura mal escrita por 5 cm numa porta (3 %) e uma porta recuada.
 */
export const DESVIO_MAXIMO_DO_CONTROLO = 0.03;

/** Quanto o desenho difere da fita, em fração (+0,05 = o desenho dá 5 % a mais). Nulo sem medida válida. */
export function desvioDoControlo(cal: Calibracao, a: Ponto, b: Ponto, fitaM: number): number | null {
  const medido = medirNoPlano(cal, a, b);
  if (medido === null || !(fitaM > 0)) return null;
  return medido / fitaM - 1;
}
