import { calibrar, ERRO_DE_TOQUE_PX, type Calibracao, type Ponto, type ReferenciaRetangular } from './homografia';

/**
 * Margem de erro da área a pintar: quanto a área que o ecrã mostra pode estar errada só pelo erro de
 * toque nos pontos que calibram a fachada. É a confiança da **área**, à parte da da câmara
 * (`incertezaDaFocal`): uma fotografia de frente não dá câmara nenhuma e pode dar uma área certa, e
 * uma câmara bem tirada não diz quanto a área se afasta longe da referência.
 *
 * ## Porque é precisa
 *
 * A homografia passa exatamente pela referência e extrapola para o resto da fachada: o mesmo píxel
 * de erro num canto pesa tanto mais quanto mais pequena é a referência na fotografia e mais longe
 * dela fica o que se mede. Numa comparação independente (04/11/2026, câmara virtual com f = 800 px,
 * imagem de 1000 × 1500, contorno de 6 × 12 m), com uma porta de 0,90 × 2,10 m (~60 px) e só a porta, o erro
 * mediano da área chegou a 27 %; com uma vertical e duas horizontais, a 2 %. Com a porta do R/C da
 * fotografia real (1,65 × 3,77 m) e ±1 px: ~2 % só com a porta, ~0,3 % com as arestas. Sem um número
 * no ecrã, os dois casos parecem iguais.
 *
 * ## Como se calcula
 *
 * Propagação do erro, linearizada à volta do que foi tocado. Cada coordenada tocada — as 8 dos
 * cantos da referência e as 4 de cada aresta, vertical ou horizontal, incluindo as dos acertos do
 * endireitamento — anda `ERRO_DE_TOQUE_PX` para cada lado; recalibra-se (`calibrar`) e recalcula-se a
 * área pela mesma função que dá a área do ecrã. A derivada é a diferença **centrada**,
 *
 *     ∂A/∂c ≈ (A(c + h) − A(c − h)) / 2h,   h = ERRO_DE_TOQUE_PX,
 *
 * que, à escala do próprio erro, apanha também o que não é linear e anula o que é simétrico (um termo
 * de segunda ordem que, numa diferença para um só lado, entrava como sensibilidade). Com os toques
 * independentes e todos com o mesmo desvio-padrão σ = ERRO_DE_TOQUE_PX:
 *
 *     σ_A = σ · √(Σ (∂A/∂c)²),   margem = 2 σ_A  (≈ 95 % dos casos, com erro gaussiano)
 *
 * Verificado com a câmara virtual da comparação e ruído gaussiano de σ = 1 px em todas as coordenadas
 * tocadas, 1000 ensaios por cenário (04/11/2026): o erro real da área ficou dentro da margem em 94 %
 * dos ensaios com a porta pequena só (erro mediano 23 %, margem mediana ±68 %), 95 % com ela e a
 * vertical, 94 % com ela, a vertical e as duas horizontais (1,6 %, ±4,8 %); com a porta grande, 96 %
 * só com ela (6,8 %, ±20 %), 96 % com a vertical e 94 % com as três arestas (1,0 %, ±2,9 %). Os
 * testes (`margemDaArea.test.ts`) repetem quatro destes cenários com 120 ensaios e exigem 85 %. Mesmo
 * longe do linear (a porta pequena sozinha), a diferença centrada à escala do erro aguenta-se.
 *
 * Supõe o desenho certo **na calibração em que está**. Um contorno desenhado só com a porta e levado
 * depois para a calibração dos acertos (`levarZonas`) traz o erro da vista em que se desenhou. Com o
 * retângulo a meio dos cantos (`remapearZona`, desde 04/11/2026) e 1000 ensaios: com a porta pequena
 * sozinha no passo 2, o contorno fica 0,8 % acima do verdadeiro em mediana e a margem cobre 87 %; com
 * a vertical no passo 2, 95 %; com a porta grande, 94–95 %. Com a caixa que `remapearZona` usava antes
 * (300 ensaios), o contorno ficava 16,5 % acima e a margem cobria 7 % — 52 %, 30 % e 77 % nos outros
 * três casos. Ver `margem.test.ts`.
 *
 * ## O que não cobre
 *
 * Só o erro de toque — aleatório e independente de ponto para ponto. Não cobre a largura e a altura
 * escritas da referência (uma porta de 80 cm escrita 90 aumenta todas as larguras 12,5 %, e esta
 * margem fica igual), uma referência fora do plano da parede (uma porta recuada encolhe tudo), um
 * canto que o íman prendeu no aro em vez do vão (um erro sistemático, não ruído), a distorção da
 * lente, as medidas à fita (saliências, vidros laterais) nem zonas desenhadas fora do sítio. Os erros
 * de escala são o papel das medidas de controlo à fita (`desvioDoControlo`); o desenho confere-se na
 * vista «Conferir a área».
 *
 * ## Quando não há margem
 *
 * `null` quando a calibração dos pontos tocados falha e também quando falha uma das calibrações
 * mexidas — a referência deixa de ser um retângulo em perspetiva com um píxel de diferença, ou a
 * função da área devolve nulo, um número que não é finito, ou rebenta. Uma referência que se desfaz
 * com um píxel está no limite, e uma margem tirada só do lado que funcionou sairia mais pequena do que
 * a verdadeira: melhor dizer que não se sabe do que mostrar um número que tranquiliza sem razão. Nunca
 * NaN.
 */

/** Quantos desvios-padrão leva a margem: 2 σ cobre cerca de 95 % dos casos, com erro gaussiano. */
export const DESVIOS_NA_MARGEM = 2;

/**
 * A margem relativa acima da qual os passos 3 e 4 dizem o que a reduz (`comoReduzirAMargem`): acertar
 * o endireitamento com uma vertical comprida e duas horizontais, e uma referência maior. Na fotografia
 * do promotor, a referência maior reduziu mais do que as arestas — por isso aparecem as duas.
 */
export const MARGEM_A_REDUZIR = 0.05;

export interface MargemDaArea {
  /** A área com os pontos tal como foram tocados, em m². */
  areaM2: number;
  /** Um desvio-padrão da área, em m². */
  desvioM2: number;
  /** A margem, ± em m²: `DESVIOS_NA_MARGEM` desvios-padrão. */
  margemM2: number;
  /** A margem em fração da área (0,021 = ±2,1 %). Sem área, 0 — ou `Infinity` se a margem não for nula. */
  relativa: number;
}

type Aresta = readonly [Ponto, Ponto];

/**
 * As calibrações de que a margem precisa: a dos pontos tal como foram tocados (`base`) e, para cada
 * coordenada tocada, as duas com essa coordenada mexida `ERRO_DE_TOQUE_PX` para cada lado (`pares`).
 * Só dependem dos toques: o ecrã guarda-as e, quando muda uma saliência ou o R/C, só refaz as áreas.
 */
export interface CalibracoesMexidas {
  base: Calibracao;
  pares: (readonly [Calibracao, Calibracao])[];
}

/**
 * As calibrações mexidas de `ref` com as arestas dadas (os mesmos argumentos de `calibrar`). `null` se
 * a dos pontos tocados ou alguma das mexidas falhar — ver o comentário do ficheiro.
 */
export function calibracoesMexidas(
  ref: ReferenciaRetangular,
  arestasVerticais: readonly Aresta[],
  arestasHorizontais: readonly Aresta[],
): CalibracoesMexidas | null {
  // Todos os pontos tocados numa lista só: os quatro cantos, as pontas das verticais, as das horizontais.
  const pontos: Ponto[] = [...ref.cantos, ...arestasVerticais.flat(), ...arestasHorizontais.flat()];
  const aresta = (ps: Ponto[], i: number): [Ponto, Ponto] => [ps[4 + 2 * i]!, ps[5 + 2 * i]!];
  const calibrarCom = (ps: Ponto[]): Calibracao | null => {
    try {
      const cal = calibrar(
        { ...ref, cantos: [ps[0]!, ps[1]!, ps[2]!, ps[3]!] },
        arestasVerticais.map((_, i) => aresta(ps, i)),
        arestasHorizontais.map((_, i) => aresta(ps, arestasVerticais.length + i)),
      );
      return cal.planoParaImagem.every(Number.isFinite) && cal.imagemParaPlano.every(Number.isFinite) ? cal : null;
    } catch {
      return null;
    }
  };

  const base = calibrarCom(pontos);
  if (!base) return null;
  const h = ERRO_DE_TOQUE_PX;
  const pares: (readonly [Calibracao, Calibracao])[] = [];
  for (let i = 0; i < pontos.length; i++) {
    for (const eixo of ['x', 'y'] as const) {
      const mexida = (sinal: number) => calibrarCom(pontos.map((p, j) => (j === i ? { ...p, [eixo]: p[eixo] + sinal * h } : p)));
      const mais = mexida(1);
      const menos = mexida(-1);
      if (!mais || !menos) return null;
      pares.push([mais, menos]);
    }
  }
  return { base, pares };
}

/**
 * A margem de erro da área que `area` calcula, com as calibrações já mexidas. `null` se a área
 * devolver nulo, um número que não é finito ou rebentar em alguma delas.
 */
export function margemNasCalibracoes(cals: CalibracoesMexidas, area: (cal: Calibracao) => number | null): MargemDaArea | null {
  const areaCom = (cal: Calibracao): number | null => {
    try {
      const a = area(cal);
      return a !== null && Number.isFinite(a) ? a : null;
    } catch {
      return null;
    }
  };
  const areaM2 = areaCom(cals.base);
  if (areaM2 === null) return null;
  const h = ERRO_DE_TOQUE_PX;
  let soma = 0;
  for (const [calMais, calMenos] of cals.pares) {
    const mais = areaCom(calMais);
    const menos = areaCom(calMenos);
    if (mais === null || menos === null) return null;
    const derivada = (mais - menos) / (2 * h);
    soma += derivada * derivada;
  }
  const desvioM2 = Math.sqrt(soma) * ERRO_DE_TOQUE_PX;
  const margemM2 = DESVIOS_NA_MARGEM * desvioM2;
  return { areaM2, desvioM2, margemM2, relativa: areaM2 > 0 ? margemM2 / areaM2 : margemM2 > 0 ? Infinity : 0 };
}

/**
 * A margem de erro da área que `area` calcula a partir da calibração de `ref` com as arestas dadas
 * (os mesmos argumentos de `calibrar`). Ver o comentário do ficheiro: o que cobre, o que não cobre, e
 * porque devolve `null`.
 */
export function margemDaArea(
  ref: ReferenciaRetangular,
  arestasVerticais: readonly Aresta[],
  arestasHorizontais: readonly Aresta[],
  area: (cal: Calibracao) => number | null,
): MargemDaArea | null {
  const cals = calibracoesMexidas(ref, arestasVerticais, arestasHorizontais);
  return cals ? margemNasCalibracoes(cals, area) : null;
}

/**
 * A margem de várias fachadas somadas (o subtotal do prédio). Cada fachada tem a sua fotografia e os
 * seus toques, e os erros são independentes: combinam-se em quadratura, √(Σ mᵢ²), e não por soma
 * direta, que daria uma margem maior do que a verdadeira. Nula se alguma fachada não tiver margem —
 * sem ela, o total ficava com uma margem mais pequena do que devia.
 */
export function margemCombinada(margensM2: readonly (number | null)[]): number | null {
  let soma = 0;
  for (const m of margensM2) {
    if (m === null || !Number.isFinite(m)) return null;
    soma += m * m;
  }
  return Math.sqrt(soma);
}
