import { verticesDaZona } from '@/domain/fachadaMedida';
import { aplicar, aplicarVisivel, pontoDeFuga, type Calibracao, type Homogeneo, type Ponto } from '@/domain/homografia';
import type { Contorno } from './deteccao';
import type { Pixeis } from './endireitar';

/**
 * Propor as arestas que acertam o endireitamento — duas verticais compridas e afastadas, e duas
 * horizontais da fachada, uma em baixo e outra em cima —, para quem mede não as traçar à mão: vê-as
 * sobre a fachada e confirma. Função pura sobre os píxeis da fotografia, para se testar sem browser.
 *
 * Coordenadas como as do SVG da medição e de `cantos.ts`: o píxel (i, j) ocupa [i, i + 1) ×
 * [j, j + 1) e o seu centro está em (i + 0,5; j + 0,5). As propostas saem em píxeis da fotografia,
 * como as arestas do passo 2 e os acertos.
 *
 * ## Porque é que a precisão é tudo
 *
 * As arestas entram em `calibrar` como pontos de fuga, e a margem de erro (`margemDaArea`) conta cada
 * ponta com o erro de toque de 1 px. Uma reta proposta 2 px ao lado da aresta verdadeira estraga o que
 * devia corrigir; uma reta que não é da família certa (o lado de uma varanda, a parede do vizinho)
 * estraga mais. Por isso: melhor nada do que uma reta errada.
 *
 * ## O método, e porquê este
 *
 * O documento de referência cita a retificação clássica (Chaudhury et al., ICIP 2014: Canny + Hough
 * probabilístico + RANSAC dos pontos de fuga) e o LSD (Grompone von Gioi et al., 2010). O Hough
 * quantiza ângulo e distância numa grelha, e os segmentos que dá herdam essa quantização (±1 a 2 px nas
 * pontas); o LSD segue os píxeis da própria aresta, sem grelha nem limiares a afinar, e é linear no
 * número de píxeis — numa fotografia de 1000 px de lado, poucas dezenas de milissegundos. Ficou o LSD
 * para encontrar os segmentos e o RANSAC para os separar por ponto de fuga; mas nenhum dos dois dá a
 * precisão que aqui conta (o LSD, à metade da resolução, erra ~1 px nas pontas). A precisão vem de um
 * terceiro passo, na fotografia à resolução cheia, ao longo de toda a reta. Os passos:
 *
 * 1. Luminância (Rec. 709) da fotografia inteira; uma cópia reduzida por média de f × f píxeis até
 *    ~1000 px no lado maior (f = 2 numa fotografia de 2000 px), só para encontrar os segmentos.
 * 2. Segmentos (LSD simplificado). Gradiente 2 × 2; cada píxel com gradiente acima de `RHO` tem a
 *    direção da sua linha de nível. Pela ordem do gradiente, do mais forte para o mais fraco, cresce-se
 *    uma região de píxeis vizinhos com a direção a menos de 22,5° da média da região — o ângulo do LSD,
 *    e com o sentido: as duas arestas de um friso escuro são duas regiões. Cada região dá um retângulo
 *    (centro e eixo pelo momento de inércia, pesado pelo gradiente); se estiver pouco cheio (uma curva,
 *    uma esquina), encolhe-se à volta da semente até ficar cheio (é o «reduce region radius» do LSD).
 *    Ficam os segmentos com `COMPRIMENTO_MINIMO_PX` ou mais.
 * 3. Pontos de fuga por consenso (RANSAC, com semente fixa: o mesmo resultado sempre). A calibração
 *    atual já diz por onde andam os dois pontos de fuga — o vertical e o horizontal da fachada —, e só
 *    entram os segmentos a menos de `ANGULO_DE_ENTRADA` da direção que eles dão; para as horizontais,
 *    só os de dentro do contorno. Pares de segmentos, sorteados pelo comprimento, dão hipóteses; cada
 *    hipótese vale a soma dos comprimentos dos segmentos que a apontam (a ponta a menos de
 *    `TOLERANCIA_FUGA_PX` da reta que vai do meio do segmento ao ponto de fuga — uma tolerância em
 *    píxeis, que aperta o ângulo nos segmentos compridos). A melhor refaz-se por mínimos quadrados com
 *    os que a apoiam (`pontoDeFuga`, pesado pelo comprimento), três vezes. **Em duas voltas**: a segunda
 *    com o cone à volta do ponto de fuga que a primeira achou — com a referência mal tocada, a calibração
 *    erra a direção das horizontais dos pisos de cima em 13 a 43°, só as de baixo entravam, e em 7 de 20
 *    casos (σ = 3 px) não saía horizontal nenhuma (avaliação de 04/11/2026); sem consenso, uma tentativa
 *    com o cone a `ANGULO_DE_ENTRADA_LARGO`. A segunda volta nunca sai desse cone largo à volta da
 *    calibração: quase de frente, com a porta muito mal tocada, um ponto de fuga achado perto da
 *    fotografia rodava as direções até à horizontal, e arestas de laje saíam como verticais (avaliação
 *    de 05/11/2026). Sem pelo menos `RETAS_MINIMAS_DO_CONSENSO` retas diferentes a apoiá-lo, não há
 *    consenso — duas retas cruzam-se sempre num ponto e não provam nada — e não se propõe nada dessa
 *    família. É isto que deixa de fora as outras paredes e os lados das varandas: vão a outro ponto de
 *    fuga e ficam em minoria.
 * 4. Retas. Os segmentos do consenso que estão na mesma reta que passa pelo ponto de fuga, com o mesmo
 *    sentido de gradiente, juntam-se (uma laje interrompida por um tubo de queda é uma reta só).
 * 5. Refinamento na fotografia à resolução cheia, que é o que dá a precisão. Refinam-se as retas que mais
 *    segmentos apoiam (`VERTICAIS_A_REFINAR`, `HORIZONTAIS_A_REFINAR`) e, nas verticais, também as
 *    primeiras de cada terço da largura da fachada (`VERTICAIS_POR_TERCO`): uma aresta comprida partida
 *    em segmentos curtos fica atrás de muitas arestas nítidas do outro lado. De 2 em 2 px ao longo da
 *    reta, o perfil de luminância perpendicular a ela (amostras de 0,5 px, média de três perfis
 *    vizinhos) e a sua derivada; a aresta é o máximo da derivada com o sentido certo, ao décimo de
 *    píxel por uma parábola nos três pontos à volta (Devernay, 1995). A reta é o ajuste robusto
 *    (biweight de Tukey) a todos esses pontos, três vezes, com a janela a fechar de ±3 px para ±1,5 px
 *    (as duas primeiras voltas com um ponto em cada três). Depois estende-se para os dois lados enquanto
 *    a aresta continuar à vista, com o mesmo sentido e a menos de 1,2 px da reta — passando faltas de
 *    até `SALTO_MAXIMO` do que a fachada mede ao longo dela (um tubo de queda, o vão entre duas janelas
 *    da mesma fila) — e reajusta-se. Com centenas de pontos, o erro da reta fica em centésimas de píxel.
 *    O que não for uma aresta só cai: uma aresta curva pelo resíduo (`RESIDUO_MAXIMO_PX`), duas arestas
 *    quase na mesma reta pelo degrau entre os quartos da reta (`DEGRAU_MAXIMO_PX`).
 * 6. A prova de cada reta, contra o ponto de fuga dos **outros** objetos da família (`fugaDasRetas`), e
 *    não contra o do consenso dos segmentos, que a própria reta errada ajudou a fazer (avaliação de
 *    04/11/2026). As retas contam por objeto (`GEMEAS`): as duas arestas de um tubo de queda são o mesmo
 *    objeto, e não se provam uma à outra. O RANSAC conta objetos, e não comprimento
 *    (`COMPRIMENTO_QUE_CONTA`, com o peso a descer com a distância, MSAC): pelo comprimento, um tubo
 *    inclinado e uma esquina ganhavam às duas esquinas. O objeto que mais se desvia dos outros, se passar
 *    do limite, sai, e faz-se tudo outra vez; sem objetos que pesem (`PESO_MINIMO_DA_FAMILIA`), a família
 *    não conta. O limite é `TOLERANCIA_MINIMA_PX` (ou `FATOR_DO_TIPICO` vezes o desvio típico, numa
 *    fotografia com distorção), aberto para cada reta pelo comprimento dela sobre o da mais comprida dos
 *    outros objetos, até `TOLERANCIA_FINAL_PX`: contra retas curtas, o ponto de fuga dos outros é menos
 *    certo. Um tubo inclinado 0,35° falha-o em 1,9 a 3 px, conforme a câmara. A nota (0 a 1) junta o
 *    resíduo, a cobertura, o número de objetos que concordam e o desvio ao ponto de fuga.
 * 7. Escolha do que falta (contam as verticais do passo 2 e os acertos que já lá estão):
 *    - Verticais: o objetivo são **duas** compridas (metade da altura da fachada ou mais) e afastadas
 *      uma da outra (`SEPARACAO_DAS_VERTICAIS` da largura do contorno). Com uma só, o ponto de fuga
 *      vertical fica algures ao longo dela, e onde — ao longo dela — continuam a decidir os lados da
 *      referência, curtos: é o argumento de `calibrar` para as horizontais, e vale igual aqui. Propõe-se
 *      a mais comprida (pela nota) longe das que já há e, se ainda faltar, outra longe dessa.
 *    - Horizontais: uma na parte de baixo e outra na de cima (abaixo de 40 % e acima de 60 % da altura
 *      do contorno, lida no plano pela calibração atual), o par que mais fixa o ponto de fuga:
 *      afastadas em altura, compridas (o erro do ângulo de cada uma vai com 1/comprimento) e bem
 *      ajustadas. Uma horizontal só não se propõe sem par — outra proposta, ou uma que já lá esteja: uma
 *      só pode piorar longe dela (`avisoDasHorizontais`).
 * 8. A concordância. Contar as arestas não chega: na fotografia do promotor, depois de aceitar a
 *    vertical e as duas horizontais, o ecrã dizia «nada a propor» com a esquina esquerda do prédio 1,3°
 *    inclinada — as ombreiras da porta, tocadas 3° ao lado, pesavam no ponto de fuga tanto como as
 *    arestas compridas (desde então `calibrar` pesa as verticais pelo comprimento, mas pesam ainda). Com
 *    `calibrarCom`, a calibração com as arestas propostas compara-se com o ponto de fuga das retas da
 *    fotografia (`concordar`): onde estão as retas compridas e nas arestas e a meio do contorno, quanto a
 *    direção que a calibração dá se afasta da que as retas dão (px nas pontas), descontada a incerteza do
 *    ponto de fuga da fotografia ali (`INCERTEZAS_DO_PONTO_DE_FUGA`, pela propagação do erro de cada
 *    reta) — longe das retas da fotografia ele também é incerto, e a calibração exata «discordava» dele
 *    (avaliação de 05/11/2026). Enquanto passar de `TOLERANCIA_DA_CALIBRACAO_PX`, experimenta-se juntar
 *    a reta comprida que mais discorda, longe das que já estão marcadas, e só fica se o desacerto descer
 *    (`REDUCAO_MINIMA`; até `PROPOSTAS_MAXIMAS`). Acima de `DESACERTO_VISIVEL_PX`, `Concordancia.torta`
 *    diz onde a vista fica torta e quanto, em cm e graus no prédio; o ecrã só o diz quando isso mexe na
 *    área do contorno mais do que a margem (`MedirFachada`, `tortaCom`), e diz-o ao propor, depois de
 *    aceitar e depois de qualquer acerto (`concordancia`, com o que a procura viu: `RetasDaFotografia`).
 *
 * Porque não na vista endireitada: lá as verticais e as horizontais estão perto dos eixos, mas cada
 * píxel da vista é uma interpolação da fotografia a outra escala, e a reta tem de voltar à fotografia —
 * a precisão perdia-se na ida e na volta. A calibração só serve de guia (os pontos de fuga
 * aproximados, as alturas, o contorno).
 *
 * ## O que se mediu (05/11/2026, depois das correções da segunda avaliação)
 *
 * Fachada sintética dos testes (`fachadaSintetica.ts`: câmara virtual, f = 1500 px, 1500 × 2000, de lado
 * e de baixo, com varandas salientes, um vizinho rodado 25°, um tubo de queda inclinado 0,5°, o
 * embasamento numa rua inclinada 0,5°, uma caleira com 0,5° de pendente, desfocagem e ruído; a porta
 * tocada com ±2 px): as retas propostas ficam a menos de 0,1 px das verdadeiras nas pontas, e nunca
 * sobre o tubo, o embasamento, a caleira, o vizinho ou um lado de varanda; o erro mediano da área do
 * contorno desce de 13,4 % para menos de 4 %, e a margem para menos de um terço. As cenas da segunda
 * avaliação, 20 sementes cada:
 * - Empena (só as esquinas e as ombreiras como verticais compridas) com um tubo de queda de 10 cm a
 *   0,35°, 0,5° e 1°, nos três casos (sem a vertical do passo 2; com ela numa esquina e o tubo perto da
 *   outra, ou longe): o tubo proposto em 0 de 180 casos (antes, 180 de 180); o erro mediano da área
 *   depois de aceitar, 1,02–1,08 %, a esquina mais inclinada 0,6–1,2 cm em 18 m e a segunda procura
 *   «nada a propor» em 20 de 20 — igual à cena sem tubo (antes, 2,3–8,9 % e 13–49 cm).
 * - Câmara oblíqua pela esquerda e as outras duas, tubo a 0,2–0,5°, porta com σ = 1,5 px: o tubo
 *   proposto em 0 de 240 casos (antes, 37, entre eles 19 de 20 com a vertical do passo 2 e o tubo a 0,35°).
 * - Calibração exata (porta, duas verticais e duas horizontais exatas), quatro câmaras, retângulo e
 *   triângulo: nada a propor, e concorda — a não ser as horizontais da câmara rasante com o triângulo de
 *   cima à esquerda (ver os limites).
 * - Porta tocada com σ = 5 px, quase de frente e de lado, 12 sementes: nenhuma reta de outra família.
 * - Distorção radial (k1 = 0,02 a 0,06), 6 sementes, com e sem a vertical do passo 2: a segunda procura
 *   propõe em 2 de 36 casos (antes, 4 de 12 só com k1 = 0,06), e a terceira nunca.
 * Na fotografia do promotor (1500 × 2000, a porta do R/C, o contorno do e2e): com a vertical do passo 2,
 * a aresta esquerda da parede branca (1004 px), a esquina esquerda do corpo laranja (814 px), a base das
 * montras do R/C (1182 px) e o beiral da parte branca (354 px); a margem do contorno passa de ± 5,1 % para
 * ± 1,7 % e o contorno de 220,52 para 214,41 m². Sem ela, as mesmas e a aresta direita da parede branca
 * (1014 px), que antes não se refinava: ± 15,9 % → ± 1,6 %, 208,65 m² (antes, 204,24 m² e a vista 15 cm
 * torta em 12 m desse lado). Propor outra vez dá «nada a propor» nos dois casos. A vertical do passo 2
 * do e2e fica 3,8 px fora da aresta na ponta de baixo: daí os 2,7 % entre os dois resultados, um erro
 * sistemático que a margem não vê.
 *
 * Tempos em Node, numa fotografia de 1500 × 2000: ~150 a 300 ms por procura, conforme a carga da
 * máquina; o teste exige o melhor de 3 abaixo de 300 ms. No browser, com o CPU 4× mais lento, a procura
 * ocupa a página 0,84–0,9 s e aceitar 0,55–0,6 s, depois de o botão mostrar «A procurar…» ou «A aplicar…».
 *
 * ## Limites conhecidos
 *
 * - A distorção da lente: uma grande angular sem correção curva as retas compridas, e o que fica é a
 *   corda da parte que passa as provas. Medido na fachada sintética com distorção radial (k1 = 0,01,
 *   0,03 e 0,06: 9, 26 e 51 px no canto da imagem): retas a 0,3–2,2 px, 0,8–3,7 px e 0,2–15,7 px da
 *   reta da câmara sem distorção, e a área do contorno melhorou em todos os casos. Na fotografia do
 *   promotor, as horizontais do R/C ficam 2 a 5 px fora do ponto de fuga das de cima.
 * - Uma aresta da família certa mas fora do plano da fachada (o beiral de uma varanda, a frente de uma
 *   marquise) serve para o ponto de fuga — é paralela à fachada —, e é proposta; a altura que se lhe lê
 *   no plano está deslocada pela paralaxe, o que só mexe na escolha da de baixo e da de cima.
 * - Uma aresta inclinada menos de ~0,2° (um tubo de queda quase a prumo, uma caleira com pouca
 *   pendente) pode passar a prova, com nota menor; o erro que traz à área é de décimas de ponto
 *   percentual. Contra só as ombreiras da porta (uma empena com uma esquina escondida), o limite abre
 *   até `TOLERANCIA_FINAL_PX`, e aí um tubo até ~0,35° não se distingue de uma esquina.
 * - Duas arestas quase na mesma reta só se separam a partir de ~2,5 px de degrau: abaixo disso, a reta
 *   pelo meio das duas passa, a 1 a 1,7 px de cada (uma esquina com 1,2 a 3 cm de degrau, na empena).
 * - Numa câmara rasante, com o ponto de fuga horizontal dentro da fotografia e as horizontais curtas, a
 *   calibração exata ainda «discorda» ~4 px na aresta do contorno que aponta ao ponto de fuga; o ecrã cala-o
 *   porque não mexe na área mais do que a margem.
 * - Perto da altura dos olhos, todas as horizontais do mundo se confundem na fotografia (todas vão
 *   parar à linha do horizonte); uma horizontal de outra parede a essa altura não se distingue pelo
 *   ponto de fuga, e só o contorno a deixa de fora.
 * - A margem de erro (`margemDaArea`) conta as pontas das retas propostas com o mesmo erro de toque de
 *   1 px das traçadas à mão: para elas é pessimista (o ajuste a centenas de pontos erra centésimas). E
 *   não vê os erros sistemáticos — uma referência tocada torta, uma vertical do passo 2 fora da aresta
 *   —: a concordância (passo 8) mostra os que entortam a vista, a margem não. Nem a escala (a largura e a
 *   altura da referência).
 * - Corre no próprio aparelho, de uma vez: num telemóvel lento (CPU 4× mais lento), a procura ocupa a
 *   página ~0,9 s, depois de o botão mostrar «A procurar…».
 */

/** Uma aresta proposta, em píxeis da fotografia. */
export interface ArestaProposta {
  tipo: 'vertical' | 'horizontal';
  /** Pontas: a vertical de baixo para cima, a horizontal da esquerda para a direita. */
  a: Ponto;
  b: Ponto;
  /** De 0 a 1: o resíduo do ajuste, a fração do comprimento com aresta à vista, quantas retas concordam e o desvio ao ponto de fuga delas. */
  confianca: number;
  /** Quantos segmentos da fotografia apoiam o ponto de fuga desta família (o consenso). */
  segmentos: number;
  /** Desvio médio quadrático dos pontos da aresta à reta ajustada, em píxeis. */
  residuoPx: number;
  /** Fração do comprimento em que a aresta se vê. */
  cobertura: number;
  /** Só nas horizontais: a altura no plano da fachada (m), pela calibração atual, a meio da reta. */
  alturaM?: number;
}

/** O que se pediu: as arestas que já entram na calibração, em píxeis da fotografia. */
export interface ArestasExistentes {
  verticais: readonly (readonly [Ponto, Ponto])[];
  horizontais: readonly (readonly [Ponto, Ponto])[];
}

/** Onde fica uma reta na fachada: uma vertical, por terços da largura do contorno; uma horizontal, da altura. */
export type Onde = 'esquerda' | 'meio' | 'direita' | 'baixo' | 'cima';

/**
 * Como sai na vista uma aresta direita do prédio onde a calibração mais discorda da fotografia: tantos cm
 * fora do prumo (ou do nível) em tantos metros de fachada, e em graus — as unidades que quem mede vê no
 * prédio, e não os píxeis da fotografia (avaliação de 05/11/2026: «7,8 px» eram 15 cm em 12 m).
 */
export interface Inclinacao {
  tipo: 'vertical' | 'horizontal';
  onde: Onde;
  desvioCm: number;
  comprimentoM: number;
  /** Com sinal: positivo, o topo (ou a ponta direita) sai para a direita (ou para cima). */
  graus: number;
  /**
   * A aresta que a fotografia pede ali (px da fotografia): a reta que passa pelo sítio e vai ao ponto de
   * fuga dela. Não é uma aresta do prédio — serve para o ecrã estimar quanto a inclinação mexe na área.
   */
  reta: { a: Ponto; b: Ponto };
}

/**
 * Quanto uma calibração discorda das retas compridas da fotografia, por família: o maior desvio (px nas
 * pontas) delas e das arestas do contorno ao ponto de fuga da calibração, descontada a incerteza do ponto
 * de fuga da fotografia (passo 8). Nulo sem retas fiáveis para comparar. Acima de
 * `TOLERANCIA_DA_CALIBRACAO_PX`, a vista ainda sai torta, mesmo com as arestas todas contadas; acima de
 * `DESACERTO_VISIVEL_PX`, `torta` diz onde e quanto.
 */
export interface Concordancia {
  vertical: number | null;
  horizontal: number | null;
  torta: Inclinacao | null;
}

/**
 * O que a procura viu de uma família na fotografia: o ponto de fuga, o mesmo com cada reta que o faz
 * rodada para um lado e para o outro do erro típico delas (a incerteza dele), e as retas compridas.
 */
export interface FamiliaDaFotografia {
  fuga: Homogeneo;
  variacoes: [Homogeneo, Homogeneo][];
  retas: { a: Ponto; b: Ponto }[];
}

/** As duas famílias da fotografia, para conferir com elas qualquer calibração (`concordancia`). */
export interface RetasDaFotografia {
  vertical: FamiliaDaFotografia | null;
  horizontal: FamiliaDaFotografia | null;
}

export interface ResultadoDasArestas {
  propostas: ArestaProposta[];
  /**
   * O que faltava contando as que já lá estavam: duas verticais compridas e afastadas (ver o passo 7),
   * uma horizontal na parte de baixo, outra na de cima.
   */
  faltavam: { vertical: boolean; baixo: boolean; cima: boolean };
  /** Segmentos a apoiar cada ponto de fuga; 0 sem consenso. */
  consenso: { verticais: number; horizontais: number };
  /** A concordância da calibração dada com a fotografia. */
  desacerto: Concordancia;
  /** A mesma, com as propostas aceites — só quando se pode saber (sem propostas, ou com `calibrarCom`). */
  desacertoDepois: Concordancia | null;
  /** O que se viu na fotografia, para conferir outras calibrações depois (`concordancia`). */
  fotografia: RetasDaFotografia;
}

export interface OpcoesDasArestas {
  /** Os contornos da fachada, em metros no plano da calibração dada. Sem eles, a fotografia inteira. */
  contornos?: readonly Contorno[];
  existentes?: ArestasExistentes;
  /**
   * A calibração com estas arestas juntas às que já lá estão. Com ela, a proposta junta de uma vez as
   * retas que ainda faltam para a calibração concordar com a fotografia (passo 8); sem ela, só se
   * compara a calibração dada, e só quando não há outras propostas.
   */
  calibrarCom?: (verticais: [Ponto, Ponto][], horizontais: [Ponto, Ponto][]) => Calibracao | null;
}

/** O lado maior da imagem reduzida em que se procuram os segmentos. */
const LADO_DOS_SEGMENTOS = 1000;
/** Gradiente mínimo (níveis por píxel) do LSD: q / sen τ, com q = 2 e τ = 22,5°. */
const RHO = 5.2;
/** Tolerância de direção do crescimento das regiões (o τ do LSD). */
const COS_TAU = Math.cos(Math.PI / 8);
/** Píxeis mínimos de uma região, e o enchimento mínimo do seu retângulo. */
const PIXEIS_MINIMOS = 10;
const ENCHIMENTO_MINIMO = 0.6;
/** Segmentos mais curtos do que isto (px da fotografia) não entram. */
const COMPRIMENTO_MINIMO_PX = 24;
/**
 * Só entram no consenso os segmentos a menos disto da direção do ponto de fuga da calibração atual; e,
 * na segunda volta, da do ponto de fuga que a primeira achou. Sem consenso assim, tenta-se uma vez com
 * `ANGULO_DE_ENTRADA_LARGO`: com a referência mal tocada, a calibração atual erra a direção das
 * horizontais dos pisos de cima em 13 a 43° (avaliação de 04/11/2026).
 */
const ANGULO_DE_ENTRADA = (12 * Math.PI) / 180;
const ANGULO_DE_ENTRADA_LARGO = (25 * Math.PI) / 180;
/** Tolerância do consenso: a ponta do segmento a menos disto da reta do meio dele ao ponto de fuga. */
const TOLERANCIA_FUGA_PX = 2;
const ITERACOES_RANSAC = 400;
/** Retas diferentes (não segmentos) que têm de apoiar um ponto de fuga para haver consenso. */
const RETAS_MINIMAS_DO_CONSENSO = 3;
/** Dois segmentos na mesma reta: as pontas a menos disto (px) da reta do primeiro ao ponto de fuga. */
const TOLERANCIA_DO_GRUPO_PX = 2.5;
/** Refinamento: passo ao longo da reta e das amostras do perfil (px). */
const PASSO_AO_LONGO = 2;
const PASSO_DO_PERFIL = 0.5;
/** Janelas de procura da aresta, de cada lado da reta, em cada volta do ajuste (px). */
const JANELAS = [3, 2, 1.5];
/** Na extensão, a aresta tem de estar a menos disto da reta (px), com pelo menos esta fração da força mediana. */
const JANELA_DA_EXTENSAO = 1.2;
const FORCA_RELATIVA_MINIMA = 0.35;
/**
 * Sem aresta à vista durante mais do que isto (fração do que a fachada mede ao longo da reta, nunca
 * menos de 24 px), a reta acaba. Chega para passar um tubo de queda ou a janela seguinte de uma fila.
 */
const SALTO_MAXIMO = 0.15;
/** Uma reta só se propõe com resíduo abaixo disto (px) e aresta à vista em pelo menos esta fração. */
const RESIDUO_MAXIMO_PX = 0.6;
const COBERTURA_MINIMA = 0.4;
/**
 * Nem um quarto da reta com a mediana do resíduo mais longe do que isto (px): uma aresta só fica em
 * centésimas; duas arestas quase na mesma reta (o vidro das janelas a 7,46 m e o da montra a 7,48 m, na
 * fachada dos testes) davam uma reta pelo meio das duas, a 1,2 px de cada, com 0,6 px de degrau.
 */
const DEGRAU_MAXIMO_PX = 0.5;
/**
 * O ponto de fuga de uma família tira-se das retas refinadas que passam a menos disto (px, nas pontas)
 * dele; e cada reta proposta tem de passar a menos do seu limite (entre `TOLERANCIA_MINIMA_PX` e
 * `TOLERANCIA_FINAL_PX`, ver `fugaDasRetas`) do ponto de fuga dos OUTROS objetos. As retas refinadas erram
 * centésimas de píxel; o que as afasta mais é a distorção da lente (na fotografia do promotor, as
 * horizontais do R/C ficam 2 a 5 px fora do ponto de fuga das de cima) e o que não é paralelo: um tubo de
 * queda inclinado 0,35° falha o ponto de fuga em 1,9 px (câmara oblíqua pela esquerda) a ~3 px (a do
 * teste), uma rua inclinada 0,3° em ~3 px (avaliações de 04 e 05/11/2026).
 */
const TOLERANCIA_DO_PONTO_DE_FUGA_PX = 1;
const TOLERANCIA_FINAL_PX = 2;
/**
 * O limite de cada família (ver `fugaDasRetas`): este, ou `FATOR_DO_TIPICO` vezes o desvio típico das
 * retas dela, até `TOLERANCIA_FINAL_PX`.
 */
const TOLERANCIA_MINIMA_PX = 1;
const FATOR_DO_TIPICO = 3;
/**
 * Duas retas da mesma família são o mesmo objeto quando as pontas da mais curta ficam a menos desta
 * fração do comprimento dela da reta da outra (e lado a lado em metade dele, pelo menos): as duas
 * arestas de um tubo de queda, o caixilho e o vidro de uma janela, as duas faces de uma laje. Um objeto
 * inclinado tem as arestas todas inclinadas por igual; contam como uma reta só (`fugaDasRetas`).
 */
const GEMEAS = 0.05;
/** No RANSAC das retas refinadas, um objeto vale 1 a partir desta fração da reta mais comprida (ver `fugaDasRetas`). */
const COMPRIMENTO_QUE_CONTA = 0.3;
/**
 * E os objetos que concordam têm de pesar isto, juntos: numa câmara rasante, depois de as retas compridas
 * se excluírem umas às outras, sobravam três pedaços de 28 a 208 px, que concordam com qualquer ponto de
 * fuga, e a calibração exata «discordava» 12,7 px deles.
 */
const PESO_MINIMO_DA_FAMILIA = 2;
/**
 * A calibração concorda com a fotografia quando as retas compridas da fotografia passam pelo ponto de
 * fuga dela a menos disto (px, nas pontas): pouco mais do que o erro de toque com que conta a margem.
 */
const TOLERANCIA_DA_CALIBRACAO_PX = 1.5;
/** Duas retas refinadas são a mesma aresta quando as pontas de uma ficam a menos disto (px) da outra. */
const MESMA_ARESTA_PX = 2;
/**
 * Uma reta junta-se para a calibração concordar só se ficar a esta fração da largura da fachada (as
 * verticais) ou da altura (as horizontais) das que já lá estão.
 */
const AFASTAMENTO_DA_CONCORDANCIA = 0.15;
/**
 * Uma reta só se junta para a calibração concordar se o desacerto da família descer a esta fração do que
 * era (ou abaixo de `TOLERANCIA_DA_CALIBRACAO_PX`); experimentam-se as que mais discordam, até estas.
 */
const REDUCAO_MINIMA = 0.75;
const CANDIDATAS_DA_CONCORDANCIA = 4;
/**
 * A concordância desconta este número de desvios-padrão da incerteza do ponto de fuga da fotografia em
 * cada sítio (os pontos de fuga sem cada objeto, `fugaDasRetas`).
 */
const INCERTEZAS_DO_PONTO_DE_FUGA = 2;
/** O erro das pontas de uma reta refinada nunca se conta abaixo disto (px), por mais que as retas concordem. */
const ERRO_MINIMO_DAS_PONTAS_PX = 0.05;
/** Arestas propostas de uma vez, no máximo: as que faltam e as que fazem a calibração concordar. */
const PROPOSTAS_MAXIMAS = 6;
/** Uma vertical é comprida a partir desta fração da altura da fachada na fotografia; mais curta, não se propõe. */
const VERTICAL_COMPRIDA = 0.5;
/** Duas verticais só fixam o ponto de fuga se estiverem afastadas: esta fração da largura do contorno, a meia altura. */
const SEPARACAO_DAS_VERTICAIS = 0.25;
/** Uma horizontal tem de cobrir pelo menos esta fração da largura da fachada à sua altura. */
const HORIZONTAL_MINIMA = 0.3;
/** Parte de baixo e parte de cima da fachada, em fração da altura do contorno. */
const LIMITE_DE_BAIXO = 0.4;
const LIMITE_DE_CIMA = 0.6;
/** Folga à volta do contorno (m, e fração do maior lado). */
const FOLGA_CONTORNO_M = 0.3;
const FOLGA_CONTORNO = 0.02;
/**
 * Abaixo desta nota não se propõe. As provas (o resíduo, o degrau, a cobertura, o ponto de fuga) é que
 * decidem; a nota de uma reta no limite de todas elas é 0,06, e esta só tira as que estão perto do
 * limite em várias ao mesmo tempo.
 */
export const NOTA_MINIMA = 0.2;

/**
 * A nota de uma reta que passou as provas: cada parte vai de 1 (o melhor) a 0,5 (no limite do que se
 * aceita) — o resíduo do ajuste, a fração com aresta à vista, quantos objetos concordam e o desvio ao
 * ponto de fuga deles. As provas são os limites; a nota serve para escolher entre as que passaram, para
 * dizer a confiança e, abaixo de `NOTA_MINIMA`, para tirar as que estão perto do limite em várias.
 */
export function notaDaReta(p: { residuo: number; cobertura: number; concordam: number; desvio: number; limite: number }): number {
  return (
    (1 - (0.5 * p.residuo) / RESIDUO_MAXIMO_PX) *
    (0.5 + 0.5 * Math.min(1, (p.cobertura - COBERTURA_MINIMA) / (0.8 - COBERTURA_MINIMA))) *
    (0.5 + 0.5 * Math.min(1, p.concordam / 6)) *
    (1 - (0.5 * p.desvio) / p.limite)
  );
}
/**
 * Retas refinadas: as verticais, e as horizontais da parte de baixo, da de cima e do meio da fachada. É
 * com elas que se tira o ponto de fuga de cada família e se prova cada proposta.
 */
const VERTICAIS_A_REFINAR = 16;
/** E as primeiras de cada terço da largura da fachada, que podem não estar entre essas (ver `proporArestas`). */
const VERTICAIS_POR_TERCO = 10;
const HORIZONTAIS_A_REFINAR = { baixo: 8, cima: 8, meio: 6 };

interface Segmento {
  a: Ponto;
  b: Ponto;
  m: Ponto;
  /** Direção unitária de a para b. */
  d: Ponto;
  /** Normal unitária para o lado mais claro. */
  n: Ponto;
  comprimento: number;
}

/** Luminância Rec. 709, um valor por píxel. */
function luminancia(p: Pixeis): Float32Array {
  const n = p.width * p.height;
  const out = new Float32Array(n);
  const d = p.data;
  for (let i = 0, j = 0; i < n; i++, j += 4) out[i] = 0.2126 * d[j]! + 0.7152 * d[j + 1]! + 0.0722 * d[j + 2]!;
  return out;
}

/** A média de cada bloco de f × f píxeis. */
function reduzir(lum: Float32Array, W: number, H: number, f: number): { img: Float32Array; w: number; h: number } {
  if (f === 1) return { img: lum, w: W, h: H };
  const w = Math.floor(W / f);
  const h = Math.floor(H / f);
  const img = new Float32Array(w * h);
  const k = 1 / (f * f);
  for (let y = 0; y < h; y++) {
    for (let dy = 0; dy < f; dy++) {
      const linha = (y * f + dy) * W;
      for (let x = 0; x < w; x++) {
        let s = 0;
        const base = linha + x * f;
        for (let dx = 0; dx < f; dx++) s += lum[base + dx]!;
        img[y * w + x] = img[y * w + x]! + s * k;
      }
    }
  }
  return { img, w, h };
}

/**
 * Os segmentos de reta da imagem reduzida (LSD simplificado; ver o comentário do ficheiro), em píxeis
 * da fotografia: o gradiente entre os centros dos píxeis x e x + 1 da imagem reduzida está em x + 1,
 * que na fotografia é f·(x + 1).
 */
function detetarSegmentos(img: Float32Array, w: number, h: number, f: number): Segmento[] {
  const gw = w - 1;
  const gh = h - 1;
  if (gw < 3 || gh < 3) return [];
  const N = gw * gh;
  const ux = new Float32Array(N);
  const uy = new Float32Array(N);
  const mag = new Float32Array(N);
  let maior = 0;
  for (let y = 0; y < gh; y++) {
    let i = y * w;
    let k = y * gw;
    for (let x = 0; x < gw; x++, i++, k++) {
      const A = img[i]!;
      const B = img[i + 1]!;
      const C = img[i + w]!;
      const D = img[i + w + 1]!;
      const gx = (B + D - A - C) / 2;
      const gy = (C + D - A - B) / 2;
      const m = Math.sqrt(gx * gx + gy * gy);
      mag[k] = m;
      if (m > 0) {
        // A direção da linha de nível: o gradiente rodado 90°.
        ux[k] = -gy / m;
        uy[k] = gx / m;
      }
      if (m > maior) maior = m;
    }
  }
  if (!(maior > RHO)) return [];

  // Ordem pelo gradiente, do mais forte para o mais fraco (ordenação por caixas, como no LSD).
  const CAIXAS = 1024;
  const estado = new Uint8Array(N); // 0 livre, 1 usado, 2 abaixo do limiar
  const porCaixa = new Int32Array(CAIXAS);
  const escala = (CAIXAS - 1) / maior;
  let validos = 0;
  for (let k = 0; k < N; k++) {
    if (mag[k]! <= RHO) {
      estado[k] = 2;
      continue;
    }
    porCaixa[Math.floor(mag[k]! * escala)]!++;
    validos++;
  }
  const inicio = new Int32Array(CAIXAS);
  for (let c = CAIXAS - 1, acc = 0; c >= 0; c--) {
    inicio[c] = acc;
    acc += porCaixa[c]!;
  }
  const ordem = new Int32Array(validos);
  for (let k = 0; k < N; k++) if (estado[k] === 0) ordem[inicio[Math.floor(mag[k]! * escala)]!++] = k;

  const reg = new Int32Array(N);
  const segmentos: Segmento[] = [];
  const minimoReduzido = COMPRIMENTO_MINIMO_PX / f;
  for (let o = 0; o < validos; o++) {
    const semente = ordem[o]!;
    if (estado[semente] !== 0) continue;
    let n = 0;
    reg[n++] = semente;
    estado[semente] = 1;
    let sx = ux[semente]!;
    let sy = uy[semente]!;
    let rx = sx;
    let ry = sy;
    for (let i = 0; i < n; i++) {
      const p = reg[i]!;
      const px = p % gw;
      const py = (p - px) / gw;
      for (let dy = -1; dy <= 1; dy++) {
        const qy = py + dy;
        if (qy < 0 || qy >= gh) continue;
        for (let dx = -1; dx <= 1; dx++) {
          const qx = px + dx;
          if ((dx === 0 && dy === 0) || qx < 0 || qx >= gw) continue;
          const q = qy * gw + qx;
          if (estado[q] !== 0 || ux[q]! * rx + uy[q]! * ry < COS_TAU) continue;
          estado[q] = 1;
          reg[n++] = q;
          sx += ux[q]!;
          sy += uy[q]!;
          const nn = Math.hypot(sx, sy);
          rx = sx / nn;
          ry = sy / nn;
        }
      }
    }
    if (n < PIXEIS_MINIMOS) continue;
    const s = retanguloDaRegiao(reg, n, gw, mag, rx, ry, semente);
    if (!s || s.l1 - s.l0 < minimoReduzido) continue;
    const a = { x: f * (s.cx + s.l0 * s.dx), y: f * (s.cy + s.l0 * s.dy) };
    const b = { x: f * (s.cx + s.l1 * s.dx), y: f * (s.cy + s.l1 * s.dy) };
    segmentos.push({
      a,
      b,
      m: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 },
      d: { x: s.dx, y: s.dy },
      n: { x: s.dy, y: -s.dx },
      comprimento: f * (s.l1 - s.l0),
    });
  }
  return segmentos;
}

/**
 * O retângulo de uma região: centro e eixo pelo momento de inércia pesado pelo gradiente, extensão ao
 * longo do eixo. Pouco cheio (uma curva, uma esquina), encolhe-se à volta da semente até ficar cheio;
 * nulo se não ficar.
 */
function retanguloDaRegiao(
  reg: Int32Array,
  n: number,
  gw: number,
  mag: Float32Array,
  rx: number,
  ry: number,
  semente: number,
): { cx: number; cy: number; dx: number; dy: number; l0: number; l1: number } | null {
  const sxs = (semente % gw) + 1;
  const sys = Math.floor(semente / gw) + 1;
  let raio2 = Infinity;
  for (let volta = 0; volta < 12; volta++) {
    let sw = 0;
    let sx = 0;
    let sy = 0;
    let usados = 0;
    let maiorD2 = 0;
    for (let i = 0; i < n; i++) {
      const p = reg[i]!;
      const x = (p % gw) + 1;
      const y = Math.floor(p / gw) + 1;
      const d2 = (x - sxs) ** 2 + (y - sys) ** 2;
      if (d2 > raio2) continue;
      if (d2 > maiorD2) maiorD2 = d2;
      const w = mag[p]!;
      sw += w;
      sx += w * x;
      sy += w * y;
      usados++;
    }
    if (usados < PIXEIS_MINIMOS || !(sw > 0)) return null;
    const cx = sx / sw;
    const cy = sy / sw;
    let cxx = 0;
    let cyy = 0;
    let cxy = 0;
    for (let i = 0; i < n; i++) {
      const p = reg[i]!;
      const x = (p % gw) + 1 - cx;
      const y = Math.floor(p / gw) + 1 - cy;
      if ((x + cx - sxs) ** 2 + (y + cy - sys) ** 2 > raio2) continue;
      const w = mag[p]!;
      cxx += w * x * x;
      cyy += w * y * y;
      cxy += w * x * y;
    }
    const phi = 0.5 * Math.atan2(2 * cxy, cxx - cyy);
    let dx = Math.cos(phi);
    let dy = Math.sin(phi);
    if (dx * rx + dy * ry < 0) {
      dx = -dx;
      dy = -dy;
    }
    let l0 = Infinity;
    let l1 = -Infinity;
    let w0 = Infinity;
    let w1 = -Infinity;
    for (let i = 0; i < n; i++) {
      const p = reg[i]!;
      const x = (p % gw) + 1 - cx;
      const y = Math.floor(p / gw) + 1 - cy;
      if ((x + cx - sxs) ** 2 + (y + cy - sys) ** 2 > raio2) continue;
      const l = x * dx + y * dy;
      const t = -x * dy + y * dx;
      if (l < l0) l0 = l;
      if (l > l1) l1 = l;
      if (t < w0) w0 = t;
      if (t > w1) w1 = t;
    }
    const comprimento = l1 - l0 + 1;
    const largura = w1 - w0 + 1;
    // O eixo tem de concordar com a direção média das linhas de nível da região.
    const alinhado = dx * rx + dy * ry >= COS_TAU;
    if (alinhado && usados / (comprimento * largura) >= ENCHIMENTO_MINIMO) return { cx, cy, dx, dy, l0, l1 };
    // Encolher à volta da semente (o «reduce region radius» do LSD).
    raio2 = maiorD2 * 0.75 * 0.75;
    if (raio2 < 4) return null;
  }
  return null;
}

/** Ponto homogéneo de norma 1. */
function unitario(v: Homogeneo): Homogeneo | null {
  const n = Math.hypot(v[0], v[1], v[2]);
  return n > 0 && Number.isFinite(n) ? [v[0] / n, v[1] / n, v[2] / n] : null;
}

/**
 * A distância (px) da ponta `a` à reta que vai do meio de a–b ao ponto de fuga v: metade do comprimento
 * vezes o seno do ângulo entre a reta e a direção do ponto de fuga — mais apertado para as compridas.
 * Serve para os segmentos do LSD e para as retas refinadas.
 */
function desvioDaReta(a: Ponto, b: Ponto, v: Homogeneo): number {
  const mx = (a.x + b.x) / 2;
  const my = (a.y + b.y) / 2;
  const l0 = my * v[2] - v[1];
  const l1 = v[0] - mx * v[2];
  const nn = Math.hypot(l0, l1);
  if (!(nn > 1e-12)) return Infinity;
  return Math.abs(l0 * a.x + l1 * a.y + mx * v[1] - my * v[0]) / nn;
}

/** Gerador pseudoaleatório com semente (mulberry32): o RANSAC dá sempre o mesmo (e a fachada dos testes também). */
export function aleatorio(semente: number): () => number {
  let s = semente | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface Consenso {
  fuga: Homogeneo;
  apoio: Segmento[];
}

/** Um cone de entrada: os segmentos a menos de `angulo` da direção que vai do meio deles ao ponto de fuga `fuga`. */
interface Cone {
  fuga: Homogeneo;
  angulo: number;
}

/**
 * O ponto de fuga em que mais segmentos concordam (pelo comprimento), com os segmentos que entram nos
 * cones dados — todos: o da volta, e o da calibração atual a `ANGULO_DE_ENTRADA_LARGO` (ver
 * `consensoEmDuasVoltas`).
 */
function consensoDeFuga(segmentos: Segmento[], cones: readonly Cone[]): Consenso | null {
  const dentro = cones.map((c) => ({ v: unitario(c.fuga), sin: Math.sin(c.angulo) }));
  if (dentro.some((c) => !c.v)) return null;
  const candidatos = segmentos.filter((s) => dentro.every((c) => desvioDaReta(s.a, s.b, c.v!) <= (s.comprimento / 2) * c.sin));
  if (candidatos.length < RETAS_MINIMAS_DO_CONSENSO) return null;
  const linhas = candidatos.map((s): Homogeneo => [s.a.y - s.b.y, s.b.x - s.a.x, s.a.x * s.b.y - s.a.y * s.b.x]);
  const acumulado: number[] = [];
  let soma = 0;
  for (const s of candidatos) acumulado.push((soma += s.comprimento));
  const sortear = (u: number) => {
    const alvo = u * soma;
    let lo = 0;
    let hi = acumulado.length - 1;
    while (lo < hi) {
      const meio = (lo + hi) >> 1;
      if (acumulado[meio]! < alvo) lo = meio + 1;
      else hi = meio;
    }
    return lo;
  };
  const apoioDe = (v: Homogeneo) => candidatos.filter((s) => desvioDaReta(s.a, s.b, v) <= TOLERANCIA_FUGA_PX);
  const valor = (v: Homogeneo) => {
    let t = 0;
    for (const s of candidatos) if (desvioDaReta(s.a, s.b, v) <= TOLERANCIA_FUGA_PX) t += s.comprimento;
    return t;
  };
  const rnd = aleatorio(20261104);
  let melhor: Homogeneo | null = null;
  let melhorValor = 0;
  for (let it = 0; it < ITERACOES_RANSAC; it++) {
    const i = sortear(rnd());
    const j = sortear(rnd());
    if (i === j) continue;
    const l = linhas[i]!;
    const k = linhas[j]!;
    const v = unitario([l[1] * k[2] - l[2] * k[1], l[2] * k[0] - l[0] * k[2], l[0] * k[1] - l[1] * k[0]]);
    if (!v) continue;
    const t = valor(v);
    if (t > melhorValor) {
      melhorValor = t;
      melhor = v;
    }
  }
  if (!melhor) return null;
  let fuga = melhor;
  let apoio = apoioDe(fuga);
  for (let volta = 0; volta < 3 && apoio.length >= 2; volta++) {
    const v = unitario(
      pontoDeFuga(
        apoio.map((s): [Ponto, Ponto] => [s.a, s.b]),
        { pesarPeloComprimento: true },
      ),
    );
    if (!v) break;
    const novo = apoioDe(v);
    if (novo.length < 2) break;
    fuga = v;
    apoio = novo;
  }
  return { fuga, apoio };
}

/**
 * O consenso em duas voltas (ver `ANGULO_DE_ENTRADA`): à volta do ponto de fuga da calibração atual e
 * depois à volta do que essa volta achou — com a referência mal tocada, só as retas perto dela entram na
 * primeira, e a segunda apanha as outras, que vão ao mesmo ponto de fuga. Sem `RETAS_MINIMAS_DO_CONSENSO`
 * retas diferentes, nulo.
 *
 * A segunda volta nunca sai do cone largo à volta da calibração atual. Quase de frente, as verticais da
 * fotografia são quase paralelas e dois segmentos cruzam-se em qualquer ponto ao longo delas, mesmo perto
 * da fotografia; à volta de um ponto de fuga assim, as direções rodam até à horizontal, e na avaliação de
 * 05/11/2026 (a porta tocada com σ = 5 px) a mesma aresta de laje saiu proposta como vertical e como
 * horizontal, e aceitar levou a área de −67 % a +293 522 %. Uma reta a mais de `ANGULO_DE_ENTRADA_LARGO`
 * da direção que a calibração dá não é desta família, por mal tocada que esteja a referência.
 */
function consensoEmDuasVoltas(segmentos: Segmento[], aproximado: Homogeneo): (Consenso & { grupos: Grupo[] }) | null {
  const comGrupos = (c: Consenso | null) => {
    const grupos = c ? agrupar(c.apoio, c.fuga) : [];
    return c && grupos.length >= RETAS_MINIMAS_DO_CONSENSO ? { ...c, grupos } : null;
  };
  const largo: Cone = { fuga: aproximado, angulo: ANGULO_DE_ENTRADA_LARGO };
  for (const angulo of [ANGULO_DE_ENTRADA, ANGULO_DE_ENTRADA_LARGO]) {
    const primeira = comGrupos(consensoDeFuga(segmentos, [{ fuga: aproximado, angulo }]));
    if (!primeira) continue;
    const segunda = comGrupos(consensoDeFuga(segmentos, [{ fuga: primeira.fuga, angulo: ANGULO_DE_ENTRADA }, largo]));
    return segunda && segunda.apoio.length >= primeira.apoio.length ? segunda : primeira;
  }
  return null;
}

/** Uma reta que passa pelo ponto de fuga, com os segmentos do consenso que lhe pertencem. */
interface Grupo {
  /** Um ponto da reta, a direção (unitária) e a normal para o lado mais claro. */
  o: Ponto;
  u: Ponto;
  n: Ponto;
  t0: number;
  t1: number;
  apoio: number;
}

function direcaoParaAFuga(m: Ponto, v: Homogeneo, quase: Ponto): Ponto | null {
  // A reta m × v; a direção dela é (l1, −l0).
  const l0 = m.y * v[2] - v[1];
  const l1 = v[0] - m.x * v[2];
  const nn = Math.hypot(l0, l1);
  if (!(nn > 1e-12)) return null;
  const u = { x: l1 / nn, y: -l0 / nn };
  return u.x * quase.x + u.y * quase.y >= 0 ? u : { x: -u.x, y: -u.y };
}

/** Os segmentos do consenso juntos por reta (a que passa pelo ponto de fuga) e pelo sentido do gradiente. */
function agrupar(apoio: Segmento[], v: Homogeneo): Grupo[] {
  const grupos: Grupo[] = [];
  for (const s of [...apoio].sort((p, q) => q.comprimento - p.comprimento)) {
    const dist = (g: Grupo, p: Ponto) => Math.abs((p.x - g.o.x) * g.n.x + (p.y - g.o.y) * g.n.y);
    const g = grupos.find(
      (g) => s.n.x * g.n.x + s.n.y * g.n.y > 0.5 && dist(g, s.a) <= TOLERANCIA_DO_GRUPO_PX && dist(g, s.b) <= TOLERANCIA_DO_GRUPO_PX,
    );
    const ta = (gr: Grupo) => (s.a.x - gr.o.x) * gr.u.x + (s.a.y - gr.o.y) * gr.u.y;
    const tb = (gr: Grupo) => (s.b.x - gr.o.x) * gr.u.x + (s.b.y - gr.o.y) * gr.u.y;
    if (g) {
      g.t0 = Math.min(g.t0, ta(g), tb(g));
      g.t1 = Math.max(g.t1, ta(g), tb(g));
      g.apoio += s.comprimento;
      continue;
    }
    const u = direcaoParaAFuga(s.m, v, s.d);
    if (!u) continue;
    // A normal perpendicular à reta, do lado mais claro (o do segmento).
    let n = { x: u.y, y: -u.x };
    if (n.x * s.n.x + n.y * s.n.y < 0) n = { x: -n.x, y: -n.y };
    const novo: Grupo = { o: s.m, u, n, t0: 0, t1: 0, apoio: s.comprimento };
    novo.t0 = Math.min(ta(novo), tb(novo));
    novo.t1 = Math.max(ta(novo), tb(novo));
    grupos.push(novo);
  }
  return grupos;
}

/** Luminância bilinear no ponto (x, y), com o centro do píxel (i, j) em (i + 0,5; j + 0,5). */
function amostra(lum: Float32Array, W: number, H: number, x: number, y: number): number {
  const fx = x - 0.5;
  const fy = y - 0.5;
  const i = Math.floor(fx);
  const j = Math.floor(fy);
  const ax = fx - i;
  const ay = fy - j;
  const i0 = Math.min(W - 1, Math.max(0, i));
  const i1 = Math.min(W - 1, Math.max(0, i + 1));
  const j0 = Math.min(H - 1, Math.max(0, j)) * W;
  const j1 = Math.min(H - 1, Math.max(0, j + 1)) * W;
  return (lum[j0 + i0]! * (1 - ax) + lum[j0 + i1]! * ax) * (1 - ay) + (lum[j1 + i0]! * (1 - ax) + lum[j1 + i1]! * ax) * ay;
}

interface Imagem {
  lum: Float32Array;
  W: number;
  H: number;
}

/**
 * A aresta no ponto p, ao longo da normal n (para o lado mais claro), a menos de `janela` px: o
 * deslocamento (px, ao décimo por uma parábola) e a força (níveis por píxel). Nulo sem máximo da
 * derivada com o sentido certo dentro da janela.
 */
function arestaNoPerfil(im: Imagem, p: Ponto, u: Ponto, n: Ponto, janela: number): { s: number; forca: number } | null {
  const K = Math.ceil((janela + 1) / PASSO_DO_PERFIL);
  const valores: number[] = [];
  for (let k = -K; k <= K; k++) {
    const s = k * PASSO_DO_PERFIL;
    let soma = 0;
    for (let a = -1; a <= 1; a++) soma += amostra(im.lum, im.W, im.H, p.x + s * n.x + a * u.x, p.y + s * n.y + a * u.y);
    valores.push(soma / 3);
  }
  // A derivada em cada amostra interior: a luminância sobe para o lado de n.
  const D = (k: number) => (valores[k + K + 1]! - valores[k + K - 1]!) / (2 * PASSO_DO_PERFIL);
  const kj = Math.floor(janela / PASSO_DO_PERFIL);
  let melhor = -Infinity;
  let km = 0;
  for (let k = -kj; k <= kj; k++) {
    const d = D(k);
    if (d > melhor) {
      melhor = d;
      km = k;
    }
  }
  if (!(melhor > 0)) return null;
  const antes = D(km - 1);
  const depois = D(km + 1);
  // Um máximo na borda da janela não é um máximo: a aresta está fora dela.
  if (antes > melhor || depois > melhor) return null;
  const curva = antes - 2 * melhor + depois;
  const delta = curva < 0 ? (0.5 * (antes - depois)) / curva : 0;
  return { s: (km + Math.max(-0.5, Math.min(0.5, delta))) * PASSO_DO_PERFIL, forca: melhor };
}

/** Ajuste robusto (Tukey) de e = c0 + c1·t, com pesos iniciais; devolve os coeficientes e o desvio. */
function ajusteRobusto(ts: number[], es: number[]): { c0: number; c1: number; sigma: number } | null {
  const n = ts.length;
  if (n < 4) return null;
  const pesos = new Array<number>(n).fill(1);
  let c0 = 0;
  let c1 = 0;
  let sigma = 1;
  const tm = ts.reduce((s, t) => s + t, 0) / n;
  for (let volta = 0; volta < 6; volta++) {
    let sw = 0;
    let st = 0;
    let se = 0;
    let stt = 0;
    let ste = 0;
    for (let i = 0; i < n; i++) {
      const w = pesos[i]!;
      const t = ts[i]! - tm;
      sw += w;
      st += w * t;
      se += w * es[i]!;
      stt += w * t * t;
      ste += w * t * es[i]!;
    }
    const det = sw * stt - st * st;
    if (!(sw > 0) || !(Math.abs(det) > 1e-12)) return null;
    c1 = (sw * ste - st * se) / det;
    const c0m = (se - c1 * st) / sw;
    c0 = c0m - c1 * tm;
    const r = es.map((e, i) => e - (c0 + c1 * ts[i]!));
    const abs = r.map(Math.abs).sort((a, b) => a - b);
    const mad = abs[Math.floor(n / 2)]!;
    sigma = Math.max(0.05, 1.4826 * mad);
    const c = 4.685 * sigma;
    for (let i = 0; i < n; i++) {
      const q = r[i]! / c;
      pesos[i] = Math.abs(q) < 1 ? (1 - q * q) ** 2 : 0;
    }
  }
  return { c0, c1, sigma };
}

interface RetaRefinada {
  a: Ponto;
  b: Ponto;
  residuo: number;
  /** O maior afastamento (px) da mediana de um quarto da reta à reta ajustada (ver `refinarReta`). */
  degrau: number;
  cobertura: number;
  comprimento: number;
}

/**
 * A reta do grupo, refinada na fotografia à resolução cheia (ver o comentário do ficheiro, passo 5).
 * `limites` diz até onde, ao longo da reta, pode haver aresta (o contorno, a fotografia); `g.t0`–`g.t1`
 * é onde o LSD a viu. Nulo se a aresta não se segurar.
 */
function refinarReta(im: Imagem, g: Grupo, limites: readonly [number, number]): RetaRefinada | null {
  // A reta: o + t·u + e(t)·n, com e(t) = c0 + c1·t. O perfil lê-se sempre ao longo de n (a normal do
  // grupo): a reta ajustada desvia-se dela uma fração de grau, e é ao longo de n que o modelo mede e(t).
  const { o, u, n } = g;
  let c0 = 0;
  let c1 = 0;
  const ponto = (t: number) => ({ x: o.x + t * u.x + (c0 + c1 * t) * n.x, y: o.y + t * u.y + (c0 + c1 * t) * n.y });
  const [tMin, tMax] = limites;
  const salto = Math.max(24, SALTO_MAXIMO * (tMax - tMin));
  const medir = (t: number, janela: number) => {
    if (t < tMin || t > tMax) return null;
    const r = arestaNoPerfil(im, ponto(t), u, n, janela);
    return r ? { e: c0 + c1 * t + r.s, forca: r.forca } : null;
  };

  // 1. Onde o LSD a viu: três voltas, com a janela a fechar.
  let ts: number[] = [];
  let forcas: number[] = [];
  let sigma = 1;
  for (const janela of JANELAS) {
    const tsv: number[] = [];
    const es: number[] = [];
    const fs: number[] = [];
    // As duas primeiras voltas só põem a reta perto da aresta: chega um ponto em cada três.
    const passo = janela === JANELAS[JANELAS.length - 1] ? PASSO_AO_LONGO : 3 * PASSO_AO_LONGO;
    for (let t = Math.max(tMin, g.t0); t <= Math.min(tMax, g.t1); t += passo) {
      const r = medir(t, janela);
      if (!r) continue;
      tsv.push(t);
      es.push(r.e);
      fs.push(r.forca);
    }
    const aj = ajusteRobusto(tsv, es);
    if (!aj) return null;
    c0 = aj.c0;
    c1 = aj.c1;
    sigma = aj.sigma;
    ts = tsv;
    forcas = fs;
  }
  if (ts.length < 4) return null;
  const forcaMediana = [...forcas].sort((a, b) => a - b)[Math.floor(forcas.length / 2)]!;

  // 2. Estender para os dois lados enquanto a aresta continuar à vista, e reajustar.
  let inicio = Math.max(tMin, g.t0);
  let fim = Math.min(tMax, g.t1);
  for (let volta = 0; volta < 3; volta++) {
    const aceita = (t: number) => {
      const r = medir(t, JANELA_DA_EXTENSAO * 1.5);
      return r && r.forca >= FORCA_RELATIVA_MINIMA * forcaMediana && Math.abs(r.e - (c0 + c1 * t)) <= JANELA_DA_EXTENSAO ? r : null;
    };
    const andar = (de: number, sentido: 1 | -1) => {
      let ultimo = de;
      let t = de;
      for (;;) {
        t += sentido * PASSO_AO_LONGO;
        if (t < tMin || t > tMax) break;
        if (aceita(t)) ultimo = t;
        else if (Math.abs(t - ultimo) > salto) break;
      }
      return ultimo;
    };
    const novoFim = andar(fim, 1);
    const novoInicio = andar(inicio, -1);
    // Sem nada de novo à vista, a reta fica como está (o passo 3 mede-a outra vez).
    if (novoFim === fim && novoInicio === inicio) break;
    const tsv: number[] = [];
    const es: number[] = [];
    for (let t = novoInicio; t <= novoFim; t += PASSO_AO_LONGO) {
      const r = aceita(t);
      if (!r) continue;
      tsv.push(t);
      es.push(r.e);
    }
    const aj = ajusteRobusto(tsv, es);
    if (!aj) return null;
    c0 = aj.c0;
    c1 = aj.c1;
    sigma = aj.sigma;
    inicio = novoInicio;
    fim = novoFim;
  }

  // 3. Resíduo e cobertura, só com os pontos que ficaram perto da reta.
  const finais: number[] = [];
  const residuos: number[] = [];
  let soma2 = 0;
  for (let t = inicio; t <= fim; t += PASSO_AO_LONGO) {
    const r = medir(t, JANELA_DA_EXTENSAO * 1.5);
    if (!r || r.forca < FORCA_RELATIVA_MINIMA * forcaMediana) continue;
    const res = r.e - (c0 + c1 * t);
    if (Math.abs(res) > Math.max(1, 3 * sigma)) continue;
    finais.push(t);
    residuos.push(res);
    soma2 += res * res;
  }
  if (finais.length < 4) return null;
  // 4. Por partes: a mediana do resíduo em cada quarto da reta. Numa aresta só, fica em centésimas; duas
  // arestas quase na mesma reta (o vidro das janelas e o da montra, 2 cm ao lado) dão um degrau.
  let degrau = 0;
  const quarto = Math.floor(residuos.length / 4);
  if (quarto >= 6)
    for (let k = 0; k < 4; k++) {
      const parte = residuos.slice(k * quarto, k === 3 ? residuos.length : (k + 1) * quarto).sort((a, b) => a - b);
      degrau = Math.max(degrau, Math.abs(parte[Math.floor(parte.length / 2)]!));
    }
  const t0 = finais[0]!;
  const t1 = finais[finais.length - 1]!;
  const comprimento = Math.hypot(1, c1) * (t1 - t0);
  return {
    a: ponto(t0),
    b: ponto(t1),
    residuo: Math.sqrt(soma2 / finais.length),
    degrau,
    cobertura: Math.min(1, (finais.length * PASSO_AO_LONGO) / Math.max(PASSO_AO_LONGO, t1 - t0 + PASSO_AO_LONGO)),
    comprimento,
  };
}

/** A distância (px) do ponto p à reta (infinita) que passa por a e b. */
function distanciaAReta(p: Ponto, a: Ponto, b: Ponto): number {
  const l = comprimento(a, b);
  return l > 0 ? Math.abs((b.y - a.y) * (p.x - a.x) - (b.x - a.x) * (p.y - a.y)) / l : Infinity;
}

/**
 * Se duas retas da mesma família são o mesmo objeto (ver `GEMEAS`): as pontas da mais curta perto da reta
 * da outra, e lado a lado em pelo menos metade do comprimento da mais curta.
 */
function mesmoObjeto(p: { a: Ponto; b: Ponto }, q: { a: Ponto; b: Ponto }): boolean {
  const [c, l] = comprimento(p.a, p.b) <= comprimento(q.a, q.b) ? [p, q] : [q, p];
  const lc = comprimento(c.a, c.b);
  const ll = comprimento(l.a, l.b);
  if (!(lc > 0) || !(ll > 0)) return false;
  const limite = GEMEAS * lc;
  if (distanciaAReta(c.a, l.a, l.b) > limite || distanciaAReta(c.b, l.a, l.b) > limite) return false;
  const ux = (l.b.x - l.a.x) / ll;
  const uy = (l.b.y - l.a.y) / ll;
  const t = (x: Ponto) => (x.x - l.a.x) * ux + (x.y - l.a.y) * uy;
  const [s0, s1] = [t(c.a), t(c.b)].sort((x, y) => x - y) as [number, number];
  return Math.min(s1, ll) - Math.max(s0, 0) >= 0.5 * lc;
}

/** O objeto (ver `GEMEAS`) de cada reta: o índice de uma reta dele, o mesmo para as retas do mesmo objeto. */
function objetosDasRetas(retas: readonly { a: Ponto; b: Ponto }[]): number[] {
  const pai = retas.map((_, i) => i);
  const raiz = (i: number): number => {
    while (pai[i] !== i) i = pai[i] = pai[pai[i]!]!;
    return i;
  };
  for (let i = 0; i < retas.length; i++)
    for (let j = i + 1; j < retas.length; j++) if (mesmoObjeto(retas[i]!, retas[j]!)) pai[raiz(i)] = raiz(j);
  return retas.map((_, i) => raiz(i));
}

/** O ponto de fuga de uma família tirado das retas refinadas (ver `fugaDasRetas`). */
interface FugaDasRetas {
  fuga: Homogeneo;
  /** Quantos objetos (não retas: ver `GEMEAS`) concordam com ele. */
  concordam: number;
  /** De cada reta, o desvio (px nas pontas) ao ponto de fuga dos OUTROS objetos que concordam. */
  desvios: number[];
  /** De cada reta, até onde se aceita esse desvio (ver `TOLERANCIA_MINIMA_PX`). */
  limites: number[];
  /** O ponto de fuga com cada reta que concorda rodada para um lado e para o outro: a incerteza dele (ver `concordar`). */
  variacoes: [Homogeneo, Homogeneo][];
}

/**
 * O ponto de fuga das retas refinadas de uma família, e quanto cada uma se desvia do ponto de fuga dos
 * OUTROS objetos. As retas refinadas erram centésimas de píxel, e é contra elas que cada proposta se
 * prova — não contra o consenso dos segmentos do LSD, que a própria reta errada ajudou a fazer: um tubo
 * de queda inclinado 0,5° tem segmentos compridos, puxava esse ponto de fuga 16 px, ficava a 1,6 px dele
 * e deixava a esquina verdadeira a 3,1 px (avaliação de 04/11/2026).
 *
 * As retas contam por objeto (`GEMEAS`): as duas arestas de um tubo de queda de 10 cm, as mais compridas
 * da fotografia numa empena lisa, provavam-se uma à outra — o «deixar uma de fora» deixava a gémea dentro
 * —, ganhavam às duas esquinas verdadeiras, e o tubo inclinado 0,35 a 1° foi proposto em 20 de 20 casos
 * (avaliação de 05/11/2026). Aqui: RANSAC aos pares de objetos (o par que mais comprimento põe a menos de
 * `TOLERANCIA_DO_PONTO_DE_FUGA_PX`, a reta mais comprida de cada objeto), mínimos quadrados com os que
 * concordam, e, para cada objeto, o ponto de fuga dos outros («deixar um de fora»). O objeto que mais se
 * desvia dos outros, se passar do limite, sai e faz-se tudo outra vez: sem isso, um tubo comprido que
 * ganhava o RANSAC a uma esquina meio escondida deixava a esquina de fora, e não se propunha nada.
 *
 * O limite é `TOLERANCIA_MINIMA_PX`, ou `FATOR_DO_TIPICO` vezes o desvio típico das retas da família se
 * esse for maior (até `TOLERANCIA_FINAL_PX`): numa fotografia sem distorção as retas verdadeiras ficam a
 * centésimas umas das outras e o tubo a 0,35° destaca-se a 1,9 px; com a distorção de uma lente, todas
 * se afastam mais, e o limite abre com elas.
 *
 * Nulo com menos de `RETAS_MINIMAS_DO_CONSENSO` objetos a concordar.
 */
function fugaDasRetas(retas: readonly RetaRefinada[]): FugaDasRetas | null {
  const objeto = objetosDasRetas(retas);
  // A reta mais comprida de cada objeto representa-o.
  const representante = new Map<number, number>();
  retas.forEach((r, i) => {
    const o = objeto[i]!;
    const atual = representante.get(o);
    if (atual === undefined || r.comprimento > retas[atual]!.comprimento) representante.set(o, i);
  });
  const fora = new Set<number>();
  // O peso de cada objeto: 1 a partir de `COMPRIMENTO_QUE_CONTA` da reta mais comprida de todas, menos se for mais curto.
  const maior = Math.max(...retas.map((r) => r.comprimento));
  const peso = (i: number) => Math.min(1, retas[i]!.comprimento / (COMPRIMENTO_QUE_CONTA * maior));
  for (let volta = 0; volta < 4; volta++) {
    const reps = [...representante.entries()].filter(([o]) => !fora.has(o)).map(([, i]) => i);
    if (reps.length < RETAS_MINIMAS_DO_CONSENSO) return null;
    const linha = (r: RetaRefinada): Homogeneo => [r.a.y - r.b.y, r.b.x - r.a.x, r.a.x * r.b.y - r.a.y * r.b.x];
    const concordantes = (v: Homogeneo) => reps.filter((i) => desvioDaReta(retas[i]!.a, retas[i]!.b, v) <= TOLERANCIA_DO_PONTO_DE_FUGA_PX);
    // O valor de uma hipótese conta objetos, e não comprimento: cada objeto vale 1 a partir de
    // `COMPRIMENTO_QUE_CONTA` da reta mais comprida (menos, se for mais curto), e menos quanto mais longe
    // passar do ponto de fuga (MSAC). Pelo comprimento, um tubo inclinado 0,5° e uma esquina (2152 px)
    // ganhavam às duas esquinas (1806 px) — a outra esquina saía, e as ombreiras, que concordam com as duas
    // hipóteses a menos de 1 px, não desempatavam; por objetos e pela distância, as ombreiras desempatam.
    const valor = (v: Homogeneo) =>
      reps.reduce((t, i) => {
        const d = desvioDaReta(retas[i]!.a, retas[i]!.b, v) / TOLERANCIA_DO_PONTO_DE_FUGA_PX;
        return d <= 1 ? t + peso(i) * (1 - d * d) : t;
      }, 0);
    // Os pares só entre os mais compridos: chega para achar o ponto de fuga e mantém a conta pequena.
    const ordem = [...reps].sort((p, q) => retas[q]!.comprimento - retas[p]!.comprimento).slice(0, 24);
    let melhor: number[] | null = null;
    let melhorValor = 0;
    for (let p = 0; p < ordem.length; p++)
      for (let q = p + 1; q < ordem.length; q++) {
        const l = linha(retas[ordem[p]!]!);
        const k = linha(retas[ordem[q]!]!);
        const v = unitario([l[1] * k[2] - l[2] * k[1], l[2] * k[0] - l[0] * k[2], l[0] * k[1] - l[1] * k[0]]);
        if (!v) continue;
        const t = valor(v);
        if (t > melhorValor) {
          melhorValor = t;
          melhor = concordantes(v);
        }
      }
    if (!melhor) return null;
    const ajustar = (dentro: number[], semObjeto = -1): Homogeneo | null => {
      const usadas = dentro.filter((i) => objeto[i] !== semObjeto).map((i): [Ponto, Ponto] => [retas[i]!.a, retas[i]!.b]);
      return usadas.length >= 2 ? unitario(pontoDeFuga(usadas, { pesarPeloComprimento: true })) : null;
    };
    let fuga: Homogeneo | null = null;
    for (let k = 0; k < 3; k++) {
      const v = ajustar(melhor);
      if (!v) return null;
      fuga = v;
      const novo = concordantes(v);
      if (novo.length === melhor.length && novo.every((x, i) => x === melhor![i])) break;
      melhor = novo;
    }
    // Sem retas que pesem (só pedaços curtos, depois de as compridas saírem), o ponto de fuga não vale nada.
    if (!fuga || melhor.length < RETAS_MINIMAS_DO_CONSENSO || melhor.reduce((t, i) => t + peso(i), 0) < PESO_MINIMO_DA_FAMILIA) return null;
    const dentro = melhor;
    // Deixar um de fora: o ponto de fuga dos outros objetos, para cada objeto que concorda.
    const sem = new Map<number, Homogeneo | null>(dentro.map((i) => [objeto[i]!, ajustar(dentro, objeto[i]!)]));
    const desvios = retas.map((r, i) => {
      const o = objeto[i]!;
      const v = sem.has(o) ? sem.get(o)! : fuga;
      return v ? desvioDaReta(r.a, r.b, v) : Infinity;
    });
    const deles = dentro.map((i) => desvios[i]!).sort((p, q) => p - q);
    const tipico = deles[Math.floor(deles.length / 2)]!;
    const base = Math.max(TOLERANCIA_MINIMA_PX, FATOR_DO_TIPICO * tipico);
    // O limite de cada reta abre com o comprimento dela sobre o da mais comprida dos OUTROS objetos (até
    // `TOLERANCIA_FINAL_PX`): contra retas mais curtas, o ponto de fuga dos outros é menos certo ao longo
    // dela. Uma esquina com só as ombreiras da porta como outras (uma empena com a outra esquina
    // escondida) desviava-se delas 1 a 2 px e ficava de fora; um tubo ao pé de outras retas compridas
    // fica com o limite de base.
    const maiores = [...dentro].sort((p, q) => retas[q]!.comprimento - retas[p]!.comprimento);
    const limites = retas.map((r, i) => {
      const outra = maiores.find((k) => objeto[k] !== objeto[i]);
      const alcance = outra === undefined ? 1 : Math.max(1, r.comprimento / retas[outra]!.comprimento);
      return Math.min(TOLERANCIA_FINAL_PX, base * alcance);
    });
    // O objeto que mais se desvia dos outros: se passa do limite, sai, e faz-se tudo outra vez.
    let pior = -1;
    for (const i of dentro) if (pior < 0 || desvios[i]! / limites[i]! > desvios[pior]! / limites[pior]!) pior = i;
    if (pior >= 0 && desvios[pior]! > limites[pior]!) {
      fora.add(objeto[pior]!);
      continue;
    }
    // A incerteza do ponto de fuga: cada reta que concorda rodada à volta do meio, para um lado e para o
    // outro, até as pontas andarem o erro delas — o desvio médio quadrático das retas ao ponto de fuga de
    // todas (dois graus de liberdade a menos) —, e o ponto de fuga outra vez (propagação do erro de cada
    // reta, uma de cada vez). Contra o ponto de fuga das outras, cada reta somava o erro dele ao seu: com
    // uma esquina e as duas ombreiras, a esquina contra as ombreiras sozinhas inchava o erro de todas.
    const residuos = dentro.map((i) => desvioDaReta(retas[i]!.a, retas[i]!.b, fuga!));
    const erroDasPontas = Math.max(
      ERRO_MINIMO_DAS_PONTAS_PX,
      Math.sqrt(residuos.reduce((t, d) => t + d * d, 0) / Math.max(1, residuos.length - 2)),
    );
    const rodada = (r: RetaRefinada, sinal: 1 | -1): [Ponto, Ponto] => {
      const m = meioDe(r.a, r.b);
      const metade = comprimento(r.a, r.b) / 2;
      const ang = sinal * Math.atan(erroDasPontas / Math.max(metade, 1e-9));
      const [c, sn] = [Math.cos(ang), Math.sin(ang)];
      const rodar = (q: Ponto): Ponto => ({ x: m.x + c * (q.x - m.x) - sn * (q.y - m.y), y: m.y + sn * (q.x - m.x) + c * (q.y - m.y) });
      return [rodar(r.a), rodar(r.b)];
    };
    const variacoes: [Homogeneo, Homogeneo][] = [];
    for (const i of dentro) {
      const com = (sinal: 1 | -1) =>
        unitario(
          pontoDeFuga(
            dentro.map((k): [Ponto, Ponto] => (k === i ? rodada(retas[k]!, sinal) : [retas[k]!.a, retas[k]!.b])),
            { pesarPeloComprimento: true },
          ),
        );
      const mais = com(1);
      const menos = com(-1);
      if (mais && menos) variacoes.push([mais, menos]);
    }
    return { fuga, concordam: dentro.length, desvios, limites, variacoes };
  }
  return null;
}

/** A fotografia → o plano da fachada, só do lado que a câmara vê. */
function noPlano(cal: Calibracao, p: Ponto): Ponto | null {
  const q = aplicar(cal.imagemParaPlano, p);
  if (!q || !Number.isFinite(q.x) || !Number.isFinite(q.y)) return null;
  const h = cal.planoParaImagem;
  return h[6] * q.x + h[7] * q.y + h[8] > 0 ? q : null;
}

/** Se o ponto (no plano) está num dos polígonos convexos, ou a menos de `folga` dele. */
function pertoDosContornos(poligonos: Ponto[][], p: Ponto, folga: number): boolean {
  for (const v of poligonos) {
    let dentro = true;
    let dist = Infinity;
    for (let k = 0; k < v.length; k++) {
      const a = v[k]!;
      const b = v[(k + 1) % v.length]!;
      const ex = b.x - a.x;
      const ey = b.y - a.y;
      if (ex * (p.y - a.y) - ey * (p.x - a.x) < 0) dentro = false;
      const l2 = ex * ex + ey * ey;
      const t = l2 > 0 ? Math.max(0, Math.min(1, ((p.x - a.x) * ex + (p.y - a.y) * ey) / l2)) : 0;
      dist = Math.min(dist, Math.hypot(p.x - a.x - t * ex, p.y - a.y - t * ey));
    }
    if (dentro || dist <= folga) return true;
  }
  return false;
}

const comprimento = (a: Ponto, b: Ponto) => Math.hypot(b.x - a.x, b.y - a.y);
const meioDe = (a: Ponto, b: Ponto): Ponto => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });

type Tipo = ArestaProposta['tipo'];

/** A fachada no plano da calibração e na fotografia: o que a procura e a concordância tiram do contorno. */
interface Geometria {
  caixa: { x0: number; x1: number; y0: number; y1: number } | null;
  /** Se o ponto da fotografia fica na fachada (num dos contornos, com folga), e na fotografia. */
  naFachada: (p: Ponto, extra?: number) => boolean;
  /** A altura de um ponto da fotografia, de 0 (a base do contorno) a 1 (o topo); sem contorno, na fotografia. */
  alturaRelativa: (p: Ponto) => number | null;
  /** A altura da fachada na fotografia (px), pela reta a meio do contorno. */
  alturaPx: number;
  larguraDaFachada: number;
  /** Onde uma vertical da fotografia passa a meia altura da fachada: o X no plano, ou o x na fotografia sem contorno. */
  aMeiaAltura: (a: Ponto, b: Ponto) => number | null;
}

function geometriaDaFachada(cal: Calibracao, dados: readonly Contorno[] | undefined, W: number, H: number): Geometria {
  // Os contornos (convexos: retângulos e triângulos) e a caixa deles.
  const contornos = (dados ?? []).filter((c) => c.largura > 0 && c.altura > 0);
  const poligonos = contornos.map((c) => verticesDaZona({ id: '', tipo: 'fachada', ...c }));
  const caixa =
    contornos.length > 0
      ? {
          x0: Math.min(...contornos.map((c) => c.x)),
          x1: Math.max(...contornos.map((c) => c.x + c.largura)),
          y0: Math.min(...contornos.map((c) => c.y)),
          y1: Math.max(...contornos.map((c) => c.y + c.altura)),
        }
      : null;
  const folga = caixa ? Math.max(FOLGA_CONTORNO_M, FOLGA_CONTORNO * Math.max(caixa.x1 - caixa.x0, caixa.y1 - caixa.y0)) : 0;
  const naFotografia = (p: Ponto) => p.x >= 4 && p.y >= 4 && p.x <= W - 4 && p.y <= H - 4;
  const naFachada = (p: Ponto, extra = 0) => {
    if (!naFotografia(p)) return false;
    if (!caixa) return true;
    const q = noPlano(cal, p);
    return !!q && pertoDosContornos(poligonos, q, folga + extra);
  };
  const alturaRelativa = (p: Ponto): number | null => {
    if (!caixa) return 1 - p.y / H;
    const q = noPlano(cal, p);
    return q ? (q.y - caixa.y0) / (caixa.y1 - caixa.y0) : null;
  };
  const medidaNaFoto = (p: Ponto, q: Ponto) => {
    const a = aplicarVisivel(cal.planoParaImagem, p);
    const b = aplicarVisivel(cal.planoParaImagem, q);
    return a && b ? comprimento(a, b) : null;
  };
  const alturaPx = caixa
    ? (medidaNaFoto({ x: (caixa.x0 + caixa.x1) / 2, y: caixa.y0 }, { x: (caixa.x0 + caixa.x1) / 2, y: caixa.y1 }) ?? H)
    : H;
  const aMeiaAltura = (a: Ponto, b: Ponto): number | null => {
    const [p, q] = caixa ? [noPlano(cal, a), noPlano(cal, b)] : [a, b];
    const meio = caixa ? (caixa.y0 + caixa.y1) / 2 : H / 2;
    if (!p || !q || !(Math.abs(q.y - p.y) > 1e-9)) return null;
    return p.x + ((meio - p.y) * (q.x - p.x)) / (q.y - p.y);
  };
  return { caixa, naFachada, alturaRelativa, alturaPx, larguraDaFachada: caixa ? caixa.x1 - caixa.x0 : W, aMeiaAltura };
}

/**
 * O que as arestas que já lá estão fixam: as verticais compridas (a posição de cada uma a meia altura) e
 * as alturas das horizontais; e o que falta — duas verticais compridas e afastadas, uma horizontal na
 * parte de baixo e outra na de cima (passo 7).
 */
function oQueJaHa(geo: Geometria, existentes: ArestasExistentes) {
  const verticaisCompridas = existentes.verticais
    .filter(([a, b]) => comprimento(a, b) >= VERTICAL_COMPRIDA * geo.alturaPx)
    .map(([a, b]) => geo.aMeiaAltura(a, b))
    .filter((x): x is number => x !== null);
  const separacao = SEPARACAO_DAS_VERTICAIS * geo.larguraDaFachada;
  const alturasExistentes = existentes.horizontais.map(([a, b]) => geo.alturaRelativa(meioDe(a, b))).filter((r): r is number => r !== null);
  return {
    verticaisCompridas,
    alturasExistentes,
    faltavam: {
      vertical: !verticaisCompridas.some((x, i) => verticaisCompridas.slice(i + 1).some((y) => Math.abs(x - y) >= separacao)),
      baixo: !alturasExistentes.some((r) => r < 0.5),
      cima: !alturasExistentes.some((r) => r >= 0.5),
    },
  };
}

/**
 * O que ainda falta às arestas marcadas para fixarem os dois pontos de fuga — o `faltavam` de
 * `proporArestas`, sem olhar para a fotografia: duas verticais compridas (metade da altura da fachada ou
 * mais) e afastadas uma da outra, uma horizontal na parte de baixo do contorno e outra na de cima. É o que
 * a sugestão da margem conta (`comoReduzirAMargem`): contar as verticais não chegava — com a segunda
 * curta e ao lado da primeira, a sugestão dizia que só uma referência maior reduzia a margem, e «Propor
 * as arestas» levava-a de ± 6,1 % a ± 2,2 % (avaliação de 05/11/2026).
 */
export function oQueFalta(
  cal: Calibracao,
  contornos: readonly Contorno[],
  existentes: ArestasExistentes,
  tamanho: { width: number; height: number },
): ResultadoDasArestas['faltavam'] {
  return oQueJaHa(geometriaDaFachada(cal, contornos, tamanho.width, tamanho.height), existentes).faltavam;
}

/** As retas em que se confere uma calibração (`concordar`): as do contorno, na fotografia, e onde fica cada coisa na fachada. */
interface Quadro {
  /** A aresta esquerda, a do meio e a direita do contorno (as verticais); a de baixo, a do meio e a de cima (as horizontais). */
  vertical: { a: Ponto; b: Ponto; onde: Onde }[];
  horizontal: { a: Ponto; b: Ponto; onde: Onde }[];
  onde: (tipo: Tipo, p: Ponto) => Onde;
}

function quadroDaFachada(geo: Geometria, cal: Calibracao, W: number, H: number): Quadro {
  const { caixa } = geo;
  const terco = (tipo: Tipo, f: number): Onde =>
    tipo === 'vertical' ? (f < 1 / 3 ? 'esquerda' : f > 2 / 3 ? 'direita' : 'meio') : f < 1 / 3 ? 'baixo' : f > 2 / 3 ? 'cima' : 'meio';
  const onde = (tipo: Tipo, p: Ponto): Onde => {
    if (!caixa) return terco(tipo, tipo === 'vertical' ? p.x / W : 1 - p.y / H);
    const q = noPlano(cal, p);
    if (!q) return 'meio';
    return terco(tipo, tipo === 'vertical' ? (q.x - caixa.x0) / (caixa.x1 - caixa.x0) : (q.y - caixa.y0) / (caixa.y1 - caixa.y0));
  };
  if (!caixa) return { vertical: [], horizontal: [], onde };
  const naFoto = (p: Ponto, q: Ponto, o: Onde) => {
    const a = aplicarVisivel(cal.planoParaImagem, p);
    const b = aplicarVisivel(cal.planoParaImagem, q);
    return a && b ? [{ a, b, onde: o }] : [];
  };
  const xm = (caixa.x0 + caixa.x1) / 2;
  const ym = (caixa.y0 + caixa.y1) / 2;
  return {
    vertical: [
      ...naFoto({ x: caixa.x0, y: caixa.y0 }, { x: caixa.x0, y: caixa.y1 }, 'esquerda'),
      ...naFoto({ x: xm, y: caixa.y0 }, { x: xm, y: caixa.y1 }, 'meio'),
      ...naFoto({ x: caixa.x1, y: caixa.y0 }, { x: caixa.x1, y: caixa.y1 }, 'direita'),
    ],
    horizontal: [
      ...naFoto({ x: caixa.x0, y: caixa.y0 }, { x: caixa.x1, y: caixa.y0 }, 'baixo'),
      ...naFoto({ x: caixa.x0, y: ym }, { x: caixa.x1, y: ym }, 'meio'),
      ...naFoto({ x: caixa.x0, y: caixa.y1 }, { x: caixa.x1, y: caixa.y1 }, 'cima'),
    ],
    onde,
  };
}

/** O ponto de fuga que a calibração dá a uma família: a coluna da homografia. */
const fugaDe = (c: Calibracao, tipo: Tipo): Homogeneo =>
  tipo === 'vertical'
    ? [c.planoParaImagem[1], c.planoParaImagem[4], c.planoParaImagem[7]]
    : [c.planoParaImagem[0], c.planoParaImagem[3], c.planoParaImagem[6]];

/** O ângulo (rad, com sinal, entre −90° e 90°) entre as retas que vão de m aos pontos de fuga v e w. */
function anguloEntre(m: Ponto, v: Homogeneo, w: Homogeneo): number {
  const dvx = v[0] - m.x * v[2];
  const dvy = v[1] - m.y * v[2];
  const dwx = w[0] - m.x * w[2];
  const dwy = w[1] - m.y * w[2];
  if (!(Math.hypot(dvx, dvy) > 0) || !(Math.hypot(dwx, dwy) > 0)) return Math.PI / 2;
  // As retas não têm sentido: atan, e não atan2.
  return Math.atan((dvx * dwy - dvy * dwx) / (dvx * dwx + dvy * dwy));
}

/**
 * Quanto a calibração (ponto de fuga v) inclina a reta r da fotografia em relação ao ponto de fuga da
 * família (px nas pontas: metade do comprimento vezes o seno do ângulo entre as duas direções), e o mesmo
 * descontada a incerteza desse ponto de fuga ali (`INCERTEZAS_DO_PONTO_DE_FUGA` desvios-padrão, pela
 * propagação do erro de cada reta — `FamiliaDaFotografia.variacoes`).
 */
function desacertoNaReta(r: { a: Ponto; b: Ponto }, v: Homogeneo, familia: FamiliaDaFotografia): { bruto: number; desacerto: number } {
  const m = meioDe(r.a, r.b);
  const metade = comprimento(r.a, r.b) / 2;
  const seno = Math.abs(Math.sin(anguloEntre(m, v, familia.fuga)));
  let variancia = 0;
  for (const [mais, menos] of familia.variacoes)
    variancia += ((anguloEntre(m, mais, familia.fuga) - anguloEntre(m, menos, familia.fuga)) / 2) ** 2;
  const sigma = Math.sqrt(variancia);
  return { bruto: metade * seno, desacerto: metade * Math.max(0, seno - INCERTEZAS_DO_PONTO_DE_FUGA * Math.sin(sigma)) };
}

/**
 * Como sai na vista, com a calibração c, uma aresta direita do prédio onde está a reta r: a reta que
 * passa pelo meio de r e vai ao ponto de fuga w da fotografia, levada ao plano.
 */
function inclinacaoNaVista(tipo: Tipo, r: { a: Ponto; b: Ponto }, w: Homogeneo, c: Calibracao, onde: Onde): Inclinacao | null {
  const m = meioDe(r.a, r.b);
  const metade = comprimento(r.a, r.b) / 2;
  let dx = w[0] - m.x * w[2];
  let dy = w[1] - m.y * w[2];
  const n = Math.hypot(dx, dy);
  if (!(n > 0)) return null;
  dx /= n;
  dy /= n;
  const reta = { a: { x: m.x - metade * dx, y: m.y - metade * dy }, b: { x: m.x + metade * dx, y: m.y + metade * dy } };
  const p = aplicar(c.imagemParaPlano, reta.a);
  const q = aplicar(c.imagemParaPlano, reta.b);
  if (!p || !q || ![p.x, p.y, q.x, q.y].every(Number.isFinite)) return null;
  let ao = tipo === 'vertical' ? q.y - p.y : q.x - p.x;
  let fora = tipo === 'vertical' ? q.x - p.x : q.y - p.y;
  if (ao < 0) {
    ao = -ao;
    fora = -fora;
  }
  if (!(ao > 0)) return null;
  return {
    tipo,
    onde,
    desvioCm: Math.round(Math.abs(fora) * 100),
    comprimentoM: Math.round(ao * 10) / 10,
    graus: Math.round(((Math.atan2(fora, ao) * 180) / Math.PI) * 100) / 100,
    reta,
  };
}

/**
 * A concordância de uma calibração com a fotografia (passo 8): em cada família, nas retas compridas da
 * fotografia e nas arestas e a meio do contorno, quanto a calibração inclina a reta em relação ao ponto
 * de fuga da fotografia — descontada a incerteza dele ali. Nas arestas do contorno longe das retas da
 * fotografia o ponto de fuga dela também é incerto; sem esse desconto, numa câmara rasante com as
 * horizontais da fotografia curtas (60 a 170 px), a calibração exata «discordava» 6,9 px e a procura
 * juntava três horizontais que não mudavam nada (avaliação de 05/11/2026).
 */
function concordar(fotografia: RetasDaFotografia, quadro: Quadro, c: Calibracao): Concordancia {
  let torta: Inclinacao | null = null;
  let pior = DESACERTO_VISIVEL_PX;
  const maior = (tipo: Tipo): number | null => {
    const familia = fotografia[tipo];
    if (!familia || familia.retas.length === 0) return null;
    const v = fugaDe(c, tipo);
    let m = 0;
    const retas = [...familia.retas.map((r) => ({ ...r, onde: quadro.onde(tipo, meioDe(r.a, r.b)) })), ...quadro[tipo]];
    for (const r of retas) {
      const d = desacertoNaReta(r, v, familia).desacerto;
      if (d > m) m = d;
      if (d > pior) {
        const i = inclinacaoNaVista(tipo, r, familia.fuga, c, r.onde);
        if (i) {
          pior = d;
          torta = i;
        }
      }
    }
    return arredondar(m);
  };
  return { vertical: maior('vertical'), horizontal: maior('horizontal'), torta };
}

/**
 * A concordância de qualquer calibração com o que a procura viu na fotografia (`RetasDaFotografia`, do
 * resultado de `proporArestas`): para o ecrã dizer, depois de aceitar ou de traçar à mão, se a vista
 * ainda sai torta, e onde. `contornos` no plano de `cal`.
 */
export function concordancia(
  fotografia: RetasDaFotografia,
  cal: Calibracao,
  contornos: readonly Contorno[],
  tamanho: { width: number; height: number },
): Concordancia {
  const geo = geometriaDaFachada(cal, contornos, tamanho.width, tamanho.height);
  return concordar(fotografia, quadroDaFachada(geo, cal, tamanho.width, tamanho.height), cal);
}

/**
 * Propõe as verticais e as horizontais que faltam para acertar o endireitamento (ver o comentário do
 * ficheiro). `cal` é a calibração atual — a que dá os pontos de fuga aproximados, as alturas e o
 * contorno na fotografia.
 */
export function proporArestas(pixeis: Pixeis, cal: Calibracao, opcoes: OpcoesDasArestas = {}): ResultadoDasArestas {
  const W = pixeis.width;
  const H = pixeis.height;
  const semRetas: RetasDaFotografia = { vertical: null, horizontal: null };
  const nada: Concordancia = { vertical: null, horizontal: null, torta: null };
  if (!(W > 8) || !(H > 8) || pixeis.data.length < W * H * 4)
    return {
      propostas: [],
      faltavam: { vertical: false, baixo: false, cima: false },
      consenso: { verticais: 0, horizontais: 0 },
      desacerto: nada,
      desacertoDepois: null,
      fotografia: semRetas,
    };

  const geo = geometriaDaFachada(cal, opcoes.contornos, W, H);
  const { naFachada, alturaRelativa, alturaPx, larguraDaFachada, aMeiaAltura, caixa } = geo;
  const existentes = opcoes.existentes ?? { verticais: [], horizontais: [] };
  const { verticaisCompridas, alturasExistentes, faltavam } = oQueJaHa(geo, existentes);

  const lum = luminancia(pixeis);
  const im: Imagem = { lum, W, H };
  const f = Math.max(1, Math.round(Math.max(W, H) / LADO_DOS_SEGMENTOS));
  const reduzida = reduzir(lum, W, H, f);
  const segmentos = detetarSegmentos(reduzida.img, reduzida.w, reduzida.h, f);
  const h = cal.planoParaImagem;
  const consenso = { verticais: 0, horizontais: 0 };

  const pontoDoGrupo = (g: Grupo, t: number) => ({ x: g.o.x + t * g.u.x, y: g.o.y + t * g.u.y });
  const meioDoGrupo = (g: Grupo) => pontoDoGrupo(g, (g.t0 + g.t1) / 2);
  /** Até onde a reta do grupo fica na fachada (e na fotografia), para os dois lados do meio dele: em t. */
  const limitesDoGrupo = (g: Grupo): [number, number] | null => {
    const tm = (g.t0 + g.t1) / 2;
    if (!naFachada(pontoDoGrupo(g, tm))) return null;
    let t0 = tm;
    let t1 = tm;
    while (naFachada(pontoDoGrupo(g, t0 - 4))) t0 -= 4;
    while (naFachada(pontoDoGrupo(g, t1 + 4))) t1 += 4;
    return [t0, t1];
  };

  /** Uma reta refinada e provada: o desvio ao ponto de fuga dos outros objetos, a nota, e se é comprida. */
  type Provada = RetaRefinada & { desvio: number; nota: number; comprida: boolean; altura: number | null };
  /**
   * Refina os grupos (passo 5), junta os que deram a mesma aresta, e prova cada reta contra o ponto de
   * fuga dos outros objetos (passo 6). Ficam só as que passam. Um grupo que já está numa reta refinada não
   * se refina outra vez: daria a mesma aresta, e o tempo vai para as outras.
   */
  const provar = (grupos: { g: Grupo; limites: [number, number] }[], comprida: (r: RetaRefinada, limites: [number, number]) => boolean) => {
    const refinadas: (RetaRefinada & { limites: [number, number] })[] = [];
    for (const { g, limites } of grupos) {
      const doGrupo = { a: pontoDoGrupo(g, g.t0), b: pontoDoGrupo(g, g.t1) };
      if (refinadas.some((o) => mesmaAresta(o, doGrupo, MESMA_ARESTA_PX))) continue;
      const r = refinarReta(im, g, limites);
      if (!r || r.residuo > RESIDUO_MAXIMO_PX || r.degrau > DEGRAU_MAXIMO_PX || r.cobertura < COBERTURA_MINIMA) continue;
      // Dois grupos que deram a mesma aresta: fica a mais comprida.
      const igual = refinadas.findIndex((o) => mesmaAresta(o, r, MESMA_ARESTA_PX));
      if (igual < 0) refinadas.push({ ...r, limites });
      else if (r.comprimento > refinadas[igual]!.comprimento) refinadas[igual] = { ...r, limites };
    }
    const fuga = fugaDasRetas(refinadas);
    if (!fuga) return { retas: [] as Provada[], fuga: null };
    const provadas: Provada[] = [];
    refinadas.forEach((r, i) => {
      const desvio = fuga.desvios[i]!;
      const limite = fuga.limites[i]!;
      if (!(desvio <= limite)) return;
      const nota = notaDaReta({ residuo: r.residuo, cobertura: r.cobertura, concordam: fuga.concordam, desvio, limite });
      if (nota < NOTA_MINIMA) return;
      provadas.push({ ...r, desvio, nota, comprida: comprida(r, r.limites), altura: alturaRelativa(meioDe(r.a, r.b)) });
    });
    return { retas: provadas, fuga: provadas.length > 0 ? fuga : null };
  };

  // As verticais: qualquer vertical do mundo vai ao mesmo ponto de fuga. Refinam-se as que mais segmentos
  // apoiam e, de cada terço da largura da fachada, as primeiras desse terço: uma aresta comprida mas
  // partida em segmentos curtos (a aresta direita da parede branca, na fotografia do promotor, com 70 px
  // de apoio, a 53.ª) ficava de fora, e sem a vertical do passo 2 a vista ficava torta desse lado.
  const cv = consensoEmDuasVoltas(segmentos, [h[1], h[4], h[7]]);
  const tercoDaLargura = (g: Grupo) => {
    const x = aMeiaAltura(pontoDoGrupo(g, g.t0), pontoDoGrupo(g, g.t1));
    const x0 = caixa ? caixa.x0 : 0;
    return x === null ? 1 : Math.max(0, Math.min(2, Math.floor((3 * (x - x0)) / larguraDaFachada)));
  };
  const gruposV = cv
    ? cv.grupos
        .map((g) => ({ g, limites: limitesDoGrupo(g) }))
        .filter((x): x is { g: Grupo; limites: [number, number] } => x.limites !== null)
        .sort((p, q) => q.g.apoio - p.g.apoio)
    : [];
  const porTerco = [0, 0, 0];
  const aRefinarV = gruposV.filter((x, k) => {
    const t = tercoDaLargura(x.g);
    const n = porTerco[t]!;
    porTerco[t] = n + 1;
    return k < VERTICAIS_A_REFINAR || n < VERTICAIS_POR_TERCO;
  });
  const { retas: verticais, fuga: fugaV } = provar(aRefinarV, (r) => r.comprimento >= VERTICAL_COMPRIDA * alturaPx);
  if (cv && verticais.length > 0) consenso.verticais = cv.apoio.length;

  // As horizontais: só as da fachada (dentro do contorno), que vão ao ponto de fuga horizontal dela.
  const zonaDe = (altura: number) => (altura <= LIMITE_DE_BAIXO ? 'baixo' : altura >= LIMITE_DE_CIMA ? 'cima' : 'meio');
  /** Quão perto da ponta da fachada (de baixo ou de cima) está a altura: 0 no limite da zona, 1 na ponta. */
  const ponta = (altura: number) =>
    Math.max(0, Math.min(1, altura <= LIMITE_DE_BAIXO ? 1 - altura / LIMITE_DE_BAIXO : (altura - LIMITE_DE_CIMA) / (1 - LIMITE_DE_CIMA)));
  const ch = consensoEmDuasVoltas(
    segmentos.filter((s) => naFachada(s.m)),
    [h[0], h[3], h[6]],
  );
  const gruposH = ch
    ? ch.grupos
        .map((g) => ({ g, limites: limitesDoGrupo(g), altura: alturaRelativa(meioDoGrupo(g)) }))
        .filter((x): x is { g: Grupo; limites: [number, number]; altura: number } => x.limites !== null && x.altura !== null)
    : [];
  const aRefinar = (['baixo', 'cima', 'meio'] as const).flatMap((zona) =>
    gruposH
      .filter((x) => zonaDe(x.altura) === zona)
      .sort((p, q) => q.g.apoio * (0.5 + ponta(q.altura)) - p.g.apoio * (0.5 + ponta(p.altura)))
      .slice(0, HORIZONTAIS_A_REFINAR[zona]),
  );
  // Comprida: pelo menos uma fração do que a fachada mede a esta altura.
  const { retas: horizontais, fuga: fugaH } = provar(
    aRefinar,
    (r, limites) => r.comprimento >= HORIZONTAL_MINIMA * (limites[1] - limites[0]),
  );
  if (ch && horizontais.length > 0) consenso.horizontais = ch.apoio.length;

  const propostas: ArestaProposta[] = [];
  const propor = (tipo: Tipo, r: Provada, segmentosDoConsenso: number) => {
    const [a, b] = tipo === 'vertical' ? (r.a.y >= r.b.y ? [r.a, r.b] : [r.b, r.a]) : r.a.x <= r.b.x ? [r.a, r.b] : [r.b, r.a];
    const q = tipo === 'horizontal' ? noPlano(cal, meioDe(a, b)) : null;
    propostas.push({
      tipo,
      a,
      b,
      confianca: arredondar(r.nota),
      segmentos: segmentosDoConsenso,
      residuoPx: arredondar(r.residuo),
      cobertura: arredondar(r.cobertura),
      ...(q ? { alturaM: Math.round(q.y * 100) / 100 } : {}),
    });
  };

  // 7. O que falta. As verticais: até haver duas compridas e afastadas, a mais comprida (pela nota) longe
  // das que já lá estão e das que já se propuseram — sem nenhuma, duas; com uma, a outra.
  if (faltavam.vertical) {
    const separacao = SEPARACAO_DAS_VERTICAIS * larguraDaFachada;
    const posicoes = [...verticaisCompridas];
    for (let k = 0; k < 2; k++) {
      let melhor: { r: Provada; x: number } | null = null;
      for (const r of verticais) {
        const x = r.comprida ? aMeiaAltura(r.a, r.b) : null;
        if (x === null || posicoes.some((e) => Math.abs(x - e) < separacao)) continue;
        if (!melhor || r.comprimento * r.nota > melhor.r.comprimento * melhor.r.nota) melhor = { r, x };
      }
      if (!melhor) break;
      propor('vertical', melhor.r, consenso.verticais);
      posicoes.push(melhor.x);
      if (posicoes.length >= 2) break;
    }
  }

  // As horizontais: o par que mais fixa o ponto de fuga — afastadas em altura, compridas (o erro do
  // ângulo de cada uma é ~1/comprimento) e bem ajustadas. Uma horizontal sozinha pode piorar longe dela
  // (`avisoDasHorizontais`): só se propõe se ficar com par — outra proposta, ou uma que já lá esteja.
  // Para escolher, a qualidade pesa pouco: todas as que passaram têm o resíduo abaixo de
  // `RESIDUO_MAXIMO_PX`, e o ângulo de uma reta ajustada a centenas de pontos fica muito mais certo do
  // que o de uma traçada à mão. O que mais pesa é o comprimento e a distância entre as duas.
  if (faltavam.baixo || faltavam.cima) {
    type Medida = { altura: number; comprimento: number; nota: number };
    const qualidade = (r: RetaRefinada) => (1 - (0.3 * r.residuo) / RESIDUO_MAXIMO_PX) * Math.min(1, r.cobertura / 0.7);
    const valor = (p: Medida, q: Medida) =>
      (p.nota * q.nota * Math.abs(q.altura - p.altura)) / Math.hypot(1 / p.comprimento, 1 / q.comprimento);
    const medida = (r: Provada): Medida => ({ altura: r.altura!, comprimento: r.comprimento, nota: qualidade(r) });
    const candidatas = (zona: 'baixo' | 'cima') =>
      faltavam[zona] ? horizontais.filter((r) => r.comprida && r.altura !== null && zonaDe(r.altura) === zona) : [];
    const parceiras = existentes.horizontais
      .map(([a, b]) => ({ altura: alturaRelativa(meioDe(a, b)), comprimento: comprimento(a, b), nota: 1 }))
      .filter((x): x is Medida => x.altura !== null && x.comprimento > 0);
    let escolhidas: Provada[] = [];
    let melhorValor = 0;
    if (faltavam.baixo && faltavam.cima) {
      for (const b of candidatas('baixo'))
        for (const t of candidatas('cima')) {
          const v = valor(medida(b), medida(t));
          if (v > melhorValor) {
            melhorValor = v;
            escolhidas = [b, t];
          }
        }
    } else {
      for (const k of [...candidatas('baixo'), ...candidatas('cima')])
        for (const e of parceiras) {
          const v = valor(medida(k), e);
          if (v > melhorValor) {
            melhorValor = v;
            escolhidas = [k];
          }
        }
    }
    for (const k of escolhidas) propor('horizontal', k, consenso.horizontais);
  }

  // 8. A concordância. A calibração com as arestas que já lá estão e as propostas tem de passar pelo
  // ponto de fuga que as retas compridas da fotografia dão; senão, a vista ainda sai torta (as ombreiras
  // de uma porta mal tocada pesam no ponto de fuga — avaliação de 04/11/2026: «nada a propor» com a
  // esquina do prédio 1,3° inclinada). Enquanto discordar mais do que `TOLERANCIA_DA_CALIBRACAO_PX`,
  // junta-se a reta comprida que mais discorda e ainda não está marcada — só se a juntar fizer descer o
  // desacerto (`REDUCAO_MINIMA`): na avaliação de 05/11/2026, com a calibração exata, juntavam-se retas
  // que o deixavam igual.
  const compridas = { vertical: verticais.filter((r) => r.comprida), horizontal: horizontais.filter((r) => r.comprida) };
  const familia = (fuga: FugaDasRetas | null, retas: Provada[]): FamiliaDaFotografia | null =>
    fuga && retas.length > 0 ? { fuga: fuga.fuga, variacoes: fuga.variacoes, retas: retas.map((r) => ({ a: r.a, b: r.b })) } : null;
  const fotografia: RetasDaFotografia = {
    vertical: familia(fugaV, compridas.vertical),
    horizontal: familia(fugaH, compridas.horizontal),
  };
  const quadro = quadroDaFachada(geo, cal, W, H);
  const desacerto = concordar(fotografia, quadro, cal);
  const daProposta = (tipo: Tipo) => propostas.filter((p) => p.tipo === tipo).map((p): [Ponto, Ponto] => [p.a, p.b]);
  const calibrarComAsPropostas = () =>
    propostas.length === 0 ? cal : (opcoes.calibrarCom?.(daProposta('vertical'), daProposta('horizontal')) ?? null);
  // Uma horizontal só se junta por aqui quando já há par (uma em baixo e outra em cima).
  const alturasComPropostas = () => [
    ...alturasExistentes,
    ...propostas
      .filter((p) => p.tipo === 'horizontal')
      .map((p) => alturaRelativa(meioDe(p.a, p.b)))
      .filter((r): r is number => r !== null),
  ];
  let depois = calibrarComAsPropostas();
  let agora = depois ? concordar(fotografia, quadro, depois) : null;
  while (depois && agora && propostas.length < PROPOSTAS_MAXIMAS) {
    let juntou = false;
    for (const tipo of ['vertical', 'horizontal'] as const) {
      const familiaDele = fotografia[tipo];
      const antes = agora[tipo];
      if (!familiaDele || antes === null || !(antes > TOLERANCIA_DA_CALIBRACAO_PX) || propostas.length >= PROPOSTAS_MAXIMAS) continue;
      if (tipo === 'horizontal') {
        const alturas = alturasComPropostas();
        if (!alturas.some((r) => r < 0.5) || !alturas.some((r) => r >= 0.5)) continue;
      }
      // A que mais discorda, longe das que já lá estão (duas retas lado a lado pouco mudam o ponto de fuga),
      // pesada pela nota: entre duas posições que discordam quase o mesmo, a reta mais fiável.
      const marcadas = [...(tipo === 'vertical' ? existentes.verticais : existentes.horizontais), ...daProposta(tipo)];
      const posicao = (a: Ponto, b: Ponto) => (tipo === 'vertical' ? aMeiaAltura(a, b) : alturaRelativa(meioDe(a, b)));
      const escala = tipo === 'vertical' ? larguraDaFachada : 1;
      const posicoes = marcadas.map(([a, b]) => posicao(a, b)).filter((x): x is number => x !== null);
      const v = fugaDe(depois, tipo);
      const candidatas = compridas[tipo]
        .filter((r) => {
          const x = posicao(r.a, r.b);
          return x !== null && !posicoes.some((e) => Math.abs(x - e) < AFASTAMENTO_DA_CONCORDANCIA * escala);
        })
        .map((r) => ({ r, valor: desacertoNaReta(r, v, familiaDele).bruto * r.nota }))
        .sort((p, q) => q.valor - p.valor)
        .slice(0, CANDIDATAS_DA_CONCORDANCIA);
      const outro = tipo === 'vertical' ? 'horizontal' : 'vertical';
      for (const { r } of candidatas) {
        propor(tipo, r, tipo === 'vertical' ? consenso.verticais : consenso.horizontais);
        const c = calibrarComAsPropostas();
        const a = c ? concordar(fotografia, quadro, c) : null;
        const desce = !!a && a[tipo] !== null && a[tipo]! <= Math.max(TOLERANCIA_DA_CALIBRACAO_PX, REDUCAO_MINIMA * antes);
        const naoEstragaOOutro =
          !!a && (agora[outro] === null || (a[outro] ?? 0) <= Math.max(TOLERANCIA_DA_CALIBRACAO_PX, agora[outro]! + 0.5));
        if (c && a && desce && naoEstragaOOutro) {
          depois = c;
          agora = a;
          juntou = true;
          break;
        }
        propostas.pop();
      }
    }
    if (!juntou) break;
  }
  return { propostas, faltavam, consenso, desacerto, desacertoDepois: agora, fotografia };
}

/** Se as pontas de `q` ficam a menos de `tolerancia` px da reta de `p` (infinita): a mesma aresta. */
function mesmaAresta(p: { a: Ponto; b: Ponto }, q: { a: Ponto; b: Ponto }, tolerancia: number): boolean {
  return distanciaAReta(q.a, p.a, p.b) <= tolerancia && distanciaAReta(q.b, p.a, p.b) <= tolerancia;
}

const arredondar = (n: number) => Math.round(n * 100) / 100;

/**
 * Acima disto (px nas pontas das retas compridas e das arestas do contorno — ver `desacerto`), o ecrã
 * diz que a vista ainda sai torta: 3 px numa aresta de 1300 px são 0,26°, uns 9 cm em 20 m. Entre
 * `TOLERANCIA_DA_CALIBRACAO_PX` e isto, a procura ainda junta retas, mas não se avisa.
 */
export const DESACERTO_VISIVEL_PX = 3;

/** O que o ecrã sabe das arestas propostas: o resultado da procura e quantas ainda lá estão. */
export interface EstadoDasArestas {
  /** Quantas a procura propôs. */
  encontradas: number;
  /** Quantas ainda estão propostas: as outras tirou-as quem mede, com um toque. */
  ficam: number;
  faltavam: ResultadoDasArestas['faltavam'];
  /**
   * A concordância da calibração de agora com a fotografia. O ecrã só põe aqui a `torta` que mexe na área
   * do contorno mais do que a margem (a distorção da lente deixa sempre alguma, e não há aresta que a tire).
   */
  desacerto: Concordancia;
  /** Com as propostas que ficam aceites, onde a vista ainda sai torta (com o mesmo critério); nada, se não sair. */
  tortaDepois?: Inclinacao | null;
}

const umaCasa = (n: number) => n.toLocaleString('pt-PT', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

/** Onde, em palavras: «do lado direito», «em cima». */
function ondeEmPalavras(t: Inclinacao): string {
  switch (t.onde) {
    case 'esquerda':
      return 'do lado esquerdo';
    case 'direita':
      return 'do lado direito';
    case 'baixo':
      return 'em baixo';
    case 'cima':
      return 'em cima';
    default:
      return t.tipo === 'vertical' ? 'a meio da fachada' : 'a meio da altura';
  }
}

/** «uns 15 cm fora do prumo em 12 m (0,7°)», nas unidades de quem mede. */
function quantoEmPalavras(t: Inclinacao): string {
  const graus = umaCasa(Math.max(0.1, Math.abs(t.graus)));
  const metros = Math.max(1, Math.round(t.comprimentoM));
  return `uns ${Math.max(1, t.desvioCm)} cm fora do ${t.tipo === 'vertical' ? 'prumo' : 'nível'} em ${metros} m (${graus}°)`;
}

/**
 * O conselho para acertar uma inclinação: a aresta a traçar à mão, e onde. Com `proporPrimeiro`, antes
 * disso «Propor as arestas» — quando a procura ainda não correu sobre esta calibração, ou quem mede tirou
 * com um toque retas que ela tinha encontrado (a verificação de 05/11/2026: depois de tirar a aresta
 * direita da parede branca, o ecrã dizia «não se encontrou ali uma aresta fiável» e mandava traçá-la à
 * mão, quando «Propor as arestas» a voltava a propor).
 */
function comoAcertar(t: Inclinacao, proporPrimeiro = false): string {
  const ali =
    t.onde === 'meio' ? (t.tipo === 'vertical' ? 'a meio' : 'a meio da altura') : t.tipo === 'vertical' ? 'desse lado' : 'a essa altura';
  const aMao =
    t.tipo === 'vertical'
      ? `traçar à mão, com «Acertar o endireitamento», uma vertical comprida ${ali} (um canto do prédio, a aresta de uma parede)`
      : `traçar à mão, com «Acertar o endireitamento», uma horizontal comprida ${ali} (a cimalha, uma linha de janelas)`;
  return proporPrimeiro ? `«Propor as arestas» procura-a na fotografia; se não a propuser, ${aMao}` : aMao;
}

/**
 * Onde a vista ainda sai torta, numa frase para quem mede (`Concordancia.torta`): de que lado, quanto no
 * prédio — cm fora do prumo em metros de fachada, e graus — e o que fazer. Os píxeis da fotografia não
 * aparecem: era uma unidade que não se via em mais lado nenhum (avaliação de 05/11/2026), e a 15 cm em
 * 12 m a inclinação não se vê na vista de um telemóvel.
 *
 * `procurada`: a procura acabou de correr sobre esta calibração e não propôs nada ali — só então se diz
 * «não se encontrou ali uma aresta fiável». Sem isso (depois de aceitar, de traçar à mão, de desfazer, de
 * tirar retas com toques) o conselho começa por «Propor as arestas» (`comoAcertar`).
 */
export function fraseDaInclinacao(t: Inclinacao, { procurada = false }: { procurada?: boolean } = {}): string {
  const aOlho = Math.abs(t.graus) < 1 ? ', pouco para se ver a olho' : '';
  const conselho = procurada
    ? `Não se encontrou ali uma aresta fiável na fotografia: ${comoAcertar(t)}`
    : `Para a acertar: ${comoAcertar(t, true)}`;
  return `A vista ainda fica torta ${ondeEmPalavras(t)}: uma ${t.tipo === 'vertical' ? 'vertical' : 'horizontal'} do prédio sai ${quantoEmPalavras(t)}${aOlho}. ${conselho}. O aviso sai quando o endireitamento concordar.`;
}

/** O que o ecrã diz das arestas propostas, no quadro «Agora»: o título e a frase por baixo. */
export function fraseDasArestas(e: EstadoDasArestas): { titulo: string; frase: string } {
  if (e.ficam > 0) {
    // «Não se encontrou ali» só é verdade se quem mede não tirou nenhuma: uma das tiradas podia ser essa.
    const tiradas = e.encontradas > e.ficam;
    const depois = e.tortaDepois
      ? ` Mesmo com ${e.ficam === 1 ? 'ela' : 'elas'}, a vista fica torta ${ondeEmPalavras(e.tortaDepois)}, ${quantoEmPalavras(e.tortaDepois)}${
          tiradas
            ? `: depois de aceitar, ${comoAcertar(e.tortaDepois, true)}.`
            : `, e não se encontrou ali uma aresta fiável: depois de aceitar, ${comoAcertar(e.tortaDepois)}.`
        }`
      : '';
    return e.ficam === 1
      ? {
          titulo: 'Confirmar a aresta proposta',
          frase:
            'Tocar na reta para a tirar, se não assentar numa aresta do prédio. Se ficar, acerta o endireitamento, como as traçadas à mão.' +
            depois,
        }
      : {
          titulo: `Confirmar as ${e.ficam} arestas propostas`,
          frase:
            'Tocar numa reta para a tirar — ficam só as que assentarem numa aresta do prédio. As que ficarem acertam o endireitamento, como as traçadas à mão.' +
            depois,
        };
  }
  if (e.encontradas > 0)
    return {
      titulo: 'Todas as arestas propostas foram tiradas',
      frase: 'Nada a aceitar. «Fechar», ou traçar à mão com «Acertar o endireitamento».',
    };
  const completas = !e.faltavam.vertical && !e.faltavam.baixo && !e.faltavam.cima;
  if (!completas) return { titulo: 'Não se encontraram arestas fiáveis', frase: 'Traçar à mão com «Acertar o endireitamento».' };
  const { vertical, horizontal, torta } = e.desacerto;
  if (torta)
    return {
      titulo: `A vista ainda fica torta ${ondeEmPalavras(torta)}`,
      frase: fraseDaInclinacao(torta, { procurada: true }).replace(/^A vista ainda fica torta [^:]*: u/, 'U'),
    };
  // Sem retas fiáveis para comparar, não se diz que concorda (avaliação de 05/11/2026: numa fotografia só
  // de ruído, «o endireitamento concorda com as arestas da fotografia»).
  if (vertical === null && horizontal === null)
    return {
      titulo: 'Já há duas verticais e duas horizontais',
      frase:
        'Não se encontraram na fotografia arestas fiáveis para conferir o endireitamento: conferir na vista se o prédio ficou direito.',
    };
  if (vertical === null || horizontal === null) {
    // A família que tem retas só «concorda» até `DESACERTO_VISIVEL_PX` (verificação de 05/11/2026: numa
    // câmara rasante dizia «As horizontais concordam» com 4,06 px de desacerto).
    const comRetas = vertical === null ? 'horizontais' : 'verticais';
    const semRetas = vertical === null ? 'verticais' : 'horizontais';
    const afastam = (vertical ?? horizontal ?? 0) > DESACERTO_VISIVEL_PX;
    return {
      titulo: 'Já há duas verticais e duas horizontais',
      frase: afastam
        ? `As ${comRetas} da fotografia ainda se afastam um pouco do endireitamento, mas não o bastante para mudar a área do contorno mais do que a margem; para as ${semRetas} não se encontraram arestas fiáveis que o confirmem. Nada a propor.`
        : `As ${comRetas} concordam com as arestas da fotografia; para as ${semRetas} não se encontraram arestas fiáveis que o confirmem. Nada a propor.`,
    };
  }
  if (Math.max(vertical, horizontal) > DESACERTO_VISIVEL_PX)
    return {
      titulo: 'Já há duas verticais e duas horizontais',
      frase:
        'As arestas compridas da fotografia ainda se afastam um pouco do endireitamento, mas não o bastante para mudar a área do contorno mais do que a margem: nada a propor.',
    };
  return {
    titulo: 'Já há duas verticais e duas horizontais',
    frase: 'E o endireitamento concorda com as arestas da fotografia: nada a propor.',
  };
}
