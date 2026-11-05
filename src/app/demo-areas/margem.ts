import { camaraDaHomografia, type Calibracao, type Matriz3, type TamanhoDaReferencia } from '@/domain/homografia';
import { areaPintavelExata, corrigirSaliencias, type OpcoesFachada, type Zona } from '@/domain/fachadaMedida';
import { MARGEM_A_REDUZIR } from '@/domain/margemDaArea';
import { remapearZona } from './endireitar';

/**
 * As áreas do ecrã refeitas para outra calibração: as funções que `margemDaArea` mexe. A margem tem de
 * ser a da área que o ecrã mostra, e não a de uma conta parecida — por isso o caminho é o mesmo do
 * ecrã: as zonas vão da calibração em que estão escritas para a nova pela fotografia
 * (`remapearZona`, como quando se acerta o endireitamento), as frentes salientes corrigem-se com a
 * câmara tirada da nova calibração (`camaraDaHomografia`, `corrigirSaliencias`) e as contas são as de
 * `areasDaFachada`, com as opções do passo 4. Com a própria calibração das zonas, dá o número do
 * ecrã antes de arredondado (ver os testes).
 *
 * As áreas **não** se arredondam ao centésimo (`areaPintavelExata`): a margem tira derivadas mexendo
 * um píxel, e num contorno pequeno o arredondamento comia a diferença — a margem de um contorno de
 * 0,6 × 0,6 m saía zero.
 *
 * ## O que se guarda, e porquê
 *
 * Cada margem pede a área em 2 × (8 + 4 por aresta) + 1 calibrações — 49 com a referência, uma
 * vertical e duas horizontais —, e em cada uma as zonas levam-se pela fotografia e, com saliência,
 * tira-se a câmara (17 homografias). Medido em 04/11/2026: com 18 zonas e saliência, ~50 ms por
 * margem; com 123 zonas, ~270 ms — e o passo 4 refazia tudo a cada tecla na saliência, nos vidros
 * laterais ou ao excluir o R/C, meio segundo por tecla num telemóvel. Mas nada disso depende das
 * opções: as zonas levadas e a câmara de cada calibração guardam-se (`zonasNaCalibracao`,
 * `centroNaCalibracao`, por objeto de calibração) e, quando muda uma opção, só se refazem a correção
 * das saliências e as contas. Com as contas mais leves (`areaPintavelExata`, e `contem` a olhar só para
 * as formas da faixa), uma tecla custa ~8 ms com 18 zonas e ~85–105 ms com 123, nesta máquina.
 *
 * ## Um limite conhecido: a câmara que liga e desliga
 *
 * Com saliência, cada calibração mexida tira a sua câmara, e uma fotografia perto do limite de
 * `incertezaDaFocal` pode ter câmara numa e não ter noutra: um píxel liga ou desliga a correção das
 * frentes salientes, e a área salta. A diferença centrada apanha o salto como se fosse sensibilidade,
 * e a margem sai maior (em mediana 1,26 vezes, no pior caso 1,76, numa fachada com três colunas de
 * marquises); o contrário também acontece, e no pior caso medido a margem cobriu 91 % em vez de 95 %
 * (câmara a 14 m, só com 0,29 de incerteza da focal sem ruído — 04/11/2026). Fixar a câmara da
 * calibração dos toques tirava o salto mas também o erro da própria câmara, que é real; fica assim, e o
 * ecrã já avisa quando a fotografia não dá a correção.
 */

/**
 * As zonas, escritas na calibração `base` (plano → imagem), levadas a cada calibração pela fotografia
 * — uma vez por calibração.
 */
export function zonasNaCalibracao(zonas: Zona[], base: Matriz3): (cal: Calibracao) => Zona[] {
  const guardadas = new WeakMap<Calibracao, Zona[]>();
  return (cal) => {
    let zs = guardadas.get(cal);
    if (!zs) {
      zs = zonas.map((z) => remapearZona(z, base, cal.imagemParaPlano));
      guardadas.set(cal, zs);
    }
    return zs;
  };
}

type Centro = { x: number; y: number; z: number };

/**
 * O centro da câmara de cada calibração (`camaraDaHomografia`), ou nulo quando a fotografia não o dá
 * — uma vez por calibração, e só quando se pede (sem saliência não é preciso).
 */
export function centroNaCalibracao(
  foto: { largura: number; altura: number },
  referencia: TamanhoDaReferencia,
): (cal: Calibracao) => Centro | null {
  const guardados = new WeakMap<Calibracao, Centro | null>();
  return (cal) => {
    if (guardados.has(cal)) return guardados.get(cal)!;
    const centro = camaraDaHomografia(cal.planoParaImagem, foto.largura, foto.altura, referencia)?.centro ?? null;
    guardados.set(cal, centro);
    return centro;
  };
}

export interface DesenhoDaFachada {
  /** As zonas tal como estão guardadas (sem a correção das saliências), levadas a cada calibração: `zonasNaCalibracao`. */
  zonas: (cal: Calibracao) => Zona[];
  /** O centro da câmara em cada calibração: `centroNaCalibracao`. */
  centro: (cal: Calibracao) => Centro | null;
  /** Quanto as marquises e as varandas saem da parede (m), medido à fita. */
  saliencias: { marquise: number | null; varanda: number | null };
  opcoes: OpcoesFachada;
}

/** A área a pintar desta fachada (a do passo 4), com a calibração `cal`, sem arredondar. */
export function pintavelNaCalibracao(d: DesenhoDaFachada): (cal: Calibracao) => number {
  const comSaliencia = (d.saliencias.marquise ?? 0) > 0 || (d.saliencias.varanda ?? 0) > 0;
  return (cal) => {
    // Sem saliência não há nada a corrigir: a câmara fica por tirar.
    const centro = comSaliencia ? d.centro(cal) : null;
    return areaPintavelExata(corrigirSaliencias(d.zonas(cal), centro, d.saliencias), d.opcoes).pintavelM2;
  };
}

/**
 * A área do contorno (a do passo 3: a união dos retângulos e triângulos do contorno), com a calibração
 * `cal`, sem arredondar. `contornos` leva só as zonas do contorno (`zonasNaCalibracao` delas).
 */
export function contornoNaCalibracao(contornos: (cal: Calibracao) => Zona[]): (cal: Calibracao) => number {
  return (cal) => areaPintavelExata(contornos(cal)).contornoM2;
}

/**
 * O que as arestas que já entram na calibração (as verticais do passo 2 e dos acertos, e as horizontais
 * dos acertos) fixam: `oQueFalta`, em `arestasPropostas.ts`. Contá-las não chegava: com a segunda vertical
 * curta e ao lado da primeira, a sugestão dizia «mesmo com duas verticais e duas horizontais» e escondia
 * «Propor as arestas», que levava a margem de ± 6,1 % a ± 2,2 % (avaliação de 05/11/2026).
 */
export interface ArestasMarcadas {
  /** Duas verticais compridas (metade da altura da fachada ou mais) e afastadas uma da outra. */
  duasVerticais: boolean;
  /** Uma horizontal na parte de baixo do contorno e outra na de cima. */
  duasHorizontais: boolean;
}

/** Abaixo disto, a área que o ecrã mostra (ao centésimo de m²) é «0,00». */
const AREA_A_VISTA_M2 = 0.005;

/** Uma margem e a área a que se refere, em m². */
export interface MargemEArea {
  margemM2: number;
  areaM2: number;
}

/**
 * A margem relativa à área que o ecrã mostra; nula quando essa área se lê «0,00 m²», onde uma
 * percentagem não tem sentido — e um resto de vírgula flutuante (um vão do tamanho do contorno deixa
 * 10⁻⁵ m²) dava «± 17,3 %».
 */
export function margemRelativa(m: MargemEArea): number | null {
  return m.areaM2 >= AREA_A_VISTA_M2 ? m.margemM2 / m.areaM2 : null;
}

/**
 * Se a margem passa de `MARGEM_A_REDUZIR`, o que a reduz, numa frase; nulo se não passa ou se não há
 * área à vista. Decide-se pelo número que se vê, arredondado a uma casa: «± 5,0 %» nunca aparece com
 * «Acima de 5 %».
 *
 * Só se aconselha o que faz descer o número. As arestas que reduzem a margem são duas verticais
 * compridas e afastadas e duas horizontais a alturas diferentes (`arestasPropostas.ts`, passo 7): com
 * uma vertical só, o ponto de fuga vertical fica livre ao longo dela, e a sugestão dizia que só uma
 * referência maior reduzia a margem enquanto «Propor as arestas», logo por baixo, a levava de ± 7,3 %
 * a ± 2,4 % com a segunda vertical (avaliação de 04/11/2026); com duas verticais juntas, o mesmo
 * (05/11/2026: `ArestasMarcadas`). Na fotografia do promotor (04/11/2026), com o contorno
 * de 11,07 × 19,92 m: a porta sozinha, ±16 %; com uma vertical e duas horizontais, ±4,3 %; a banda do
 * R/C como referência, sem arestas nenhumas, ±2,5 %. As duas coisas reduzem, e a referência maior pode
 * reduzir mais do que as arestas — por isso aparecem as duas, sem dizer qual reduz mais. Rever os
 * cantos da referência não entra: muda a área (para melhor ou pior), mas não a margem, que se calcula
 * pela geometria com o mesmo erro de toque (três revisões de um píxel: ±7,5 → 7,2 → 7,2 → 7,3 %).
 */
export function comoReduzirAMargem(margem: MargemEArea, arestas: ArestasMarcadas, passo: 3 | 4): string | null {
  const relativa = margemRelativa(margem);
  if (relativa === null || !Number.isFinite(relativa) || Math.round(relativa * 1000) <= Math.round(MARGEM_A_REDUZIR * 1000)) return null;
  const limite = `${String(MARGEM_A_REDUZIR * 100).replace('.', ',')} %`;
  if (arestas.duasVerticais && arestas.duasHorizontais) {
    return `Acima de ${limite}, mesmo com duas verticais e duas horizontais: o que ainda a reduz é uma referência maior no passo 2 — um retângulo medido à fita que ocupe mais espaço na fotografia.`;
  }
  const acertar =
    passo === 3
      ? 'acertar o endireitamento («Propor as arestas» procura-as na fotografia)'
      : 'voltar ao passo 3 e acertar o endireitamento («Propor as arestas» procura-as na fotografia)';
  return `Acima de ${limite}. Para a reduzir: ${acertar} com duas verticais compridas, longe uma da outra, e duas horizontais a alturas diferentes, ou usar no passo 2 uma referência maior — quanto mais espaço ocupa na fotografia, menor a margem.`;
}

/** Com uma casa decimal e nunca abaixo de 0,1: «± 0,0 %» diria que não há erro nenhum. */
const umaCasa = (n: number) =>
  Math.max(0.1, Math.round(n * 10) / 10).toLocaleString('pt-PT', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

/**
 * A margem como o ecrã a escreve: «± 2,1 %» e «± 4,6 m²». Os m² levam uma casa a partir de 0,1 m² e
 * duas abaixo disso — num contorno pequeno, «± 0,1 m²» seria mais do que a própria área. Sem área à
 * vista (`margemRelativa` nula), só os m². Nulo — o ecrã escreve «—» — quando nem a margem nem a
 * área chegam ao centésimo: com nada a pintar, «± 0,1 %» inventava um erro que não há.
 */
export function textoDaMargem(margem: MargemEArea): { percentagem: string | null; m2: string } | null {
  const relativa = margemRelativa(margem);
  if (!(margem.margemM2 > 0) || (relativa === null && margem.margemM2 < AREA_A_VISTA_M2)) return null;
  const m2 =
    margem.margemM2 >= 0.095
      ? umaCasa(margem.margemM2)
      : Math.max(0.01, Math.round(margem.margemM2 * 100) / 100).toLocaleString('pt-PT', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        });
  return {
    percentagem: relativa !== null && Number.isFinite(relativa) ? `± ${umaCasa(relativa * 100)} %` : null,
    m2: `± ${m2} m²`,
  };
}
