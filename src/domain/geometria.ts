import type { SurfaceKind } from './request';
import type { FaceKind, Forma } from './volume';

/**
 * A **geometria do prédio** — e o que ela não é.
 *
 * ## A separação que faltava
 *
 * «Separar a geometria do edifício das superfícies de intervenção» (promotor, 30/10/2026). Até aqui
 * era tudo a mesma coisa: o desenho lia `request_surfaces` para saber se havia muro, grades ou
 * beirais e punha-os no volume. Mas um muro declarado como **zona a pintar** e um muro que
 * **existe** são afirmações diferentes — e a que o desenho precisa é a segunda. Um prédio com muro
 * que não vai ser pintado continua a ter muro; uma obra só de interiores não faz o prédio
 * desaparecer.
 *
 * Aqui ficam só as perguntas sobre **o que o prédio é**: a forma em planta, quantos pisos tem,
 * quanto mede de frente, de fundo e de pé-direito. O que se vai pintar está nas zonas, e as duas
 * coisas encontram-se num sítio só: {@link facesDaZona}, que diz que partes do desenho uma zona
 * cobre.
 *
 * ## Nunca inventar
 *
 * «Não inferir geometria a partir de áreas insuficientes.» É a regra que manda neste ficheiro.
 * Sabendo que uma fachada tem 180 m², é tentador dividir por uma altura qualquer e anunciar 18
 * metros de frente. Isso não é uma medida: é uma conta com um palpite lá dentro, apresentada ao
 * cliente com a mesma cara de uma medida verdadeira. Uma dimensão que ninguém deu fica
 * **desconhecida**, diz-se «Por medir», e o desenho mostra-se sem cota nenhuma nesse eixo.
 *
 * A única conta que este ficheiro faz é a altura = pisos × pé-direito, porque as duas parcelas são
 * declaradas e a conta é a definição de altura — e mesmo assim a certeza do resultado é a pior das
 * duas parcelas (ver {@link alturaDoPredio}).
 */

/** De onde vem uma dimensão. A ordem é do mais firme para o menos. */
export type Certeza = 'declarada' | 'estimada' | 'desconhecida';

export const CERTEZA_LABELS: Record<Certeza, string> = {
  declarada: 'medida',
  estimada: 'estimada',
  desconhecida: 'por medir',
};

export interface Dimensao {
  /** Em metros. Nulo quando ninguém a deu — e nunca calculado a partir de uma área. */
  metros: number | null;
  certeza: Certeza;
}

export const porMedir: Dimensao = { metros: null, certeza: 'desconhecida' };

export function dimensao(metros: number | null | undefined, certeza: Certeza = 'declarada'): Dimensao {
  if (metros === null || metros === undefined || !Number.isFinite(metros) || metros <= 0) return porMedir;
  return { metros, certeza };
}

export interface GeometriaDoPredio {
  forma: Forma | null;
  pisos: number | null;
  /** Frente: a medida ao longo da fachada principal. */
  largura: Dimensao;
  /** Fundo: da fachada principal para o tardoz. */
  profundidade: Dimensao;
  /** Pé-direito de um piso. */
  peDireito: Dimensao;
}

/**
 * Pé-direito corrente em habitação, usado **só** quando o cliente não o souber e aceitar a
 * estimativa. Não entra sozinho: quem não responder fica com a altura por medir.
 */
export const PE_DIREITO_CORRENTE = 2.8;

/** A pior das certezas: uma conta não fica mais firme do que a sua parcela mais fraca. */
export function piorCerteza(...cs: Certeza[]): Certeza {
  if (cs.includes('desconhecida')) return 'desconhecida';
  if (cs.includes('estimada')) return 'estimada';
  return 'declarada';
}

/**
 * Altura total = pisos × pé-direito. É a única conta aqui dentro, e só corre com as duas parcelas
 * em mãos: sem pisos ou sem pé-direito, a altura fica por medir — não se arbitra nenhum dos dois.
 */
export function alturaDoPredio(g: GeometriaDoPredio): Dimensao {
  if (!g.pisos || g.pisos <= 0 || g.peDireito.metros === null) return porMedir;
  return {
    metros: Math.round(g.pisos * g.peDireito.metros * 100) / 100,
    certeza: piorCerteza(g.peDireito.certeza, 'declarada'),
  };
}

export type Eixo = 'largura' | 'profundidade' | 'altura';

export interface Cota {
  eixo: Eixo;
  rotulo: string;
  dimensao: Dimensao;
  /** O que se escreve ao lado da cota. Nunca um número que ninguém deu. */
  texto: string;
}

const metros = (n: number) => `${n.toLocaleString('pt-PT', { maximumFractionDigits: 2 })} m`;

export function textoDaCota(d: Dimensao): string {
  if (d.metros === null) return 'Por medir';
  return d.certeza === 'declarada' ? metros(d.metros) : `${metros(d.metros)} (estimada)`;
}

/** As três cotas do prédio, sempre as três — uma que falte diz que falta, e não desaparece. */
export function cotasDoPredio(g: GeometriaDoPredio): Cota[] {
  const altura = alturaDoPredio(g);
  return [
    { eixo: 'largura', rotulo: 'Frente', dimensao: g.largura, texto: textoDaCota(g.largura) },
    { eixo: 'profundidade', rotulo: 'Fundo', dimensao: g.profundidade, texto: textoDaCota(g.profundidade) },
    { eixo: 'altura', rotulo: 'Altura', dimensao: altura, texto: textoDaCota(altura) },
  ];
}

/**
 * O desenho em escala só se faz com largura e altura. Sem elas, desenha-se o volume genérico de
 * sempre — com proporções fixas e sem cotas —, e diz-se porquê.
 */
export function porqueNaoTemEscala(g: GeometriaDoPredio): string | null {
  const altura = alturaDoPredio(g);
  const faltam: string[] = [];
  if (g.largura.metros === null) faltam.push('a frente');
  if (altura.metros === null) faltam.push(g.pisos ? 'o pé-direito' : 'os pisos');
  if (faltam.length === 0) return null;
  const lista = faltam.length === 1 ? faltam[0] : `${faltam.slice(0, -1).join(', ')} e ${faltam.at(-1)}`;
  return `O desenho está em proporções genéricas: falta ${lista}.`;
}

/**
 * Que partes do desenho é que uma zona cobre.
 *
 * É aqui que as duas coisas separadas lá em cima se voltam a encontrar, e só aqui. Uma zona de
 * paredes interiores não tem parte nenhuma no volume — e dizer isso é melhor do que acender o
 * prédio inteiro.
 */
export const FACES_DA_ZONA: Record<SurfaceKind, FaceKind[]> = {
  fachada: ['frente', 'lado'],
  empena: ['empena'],
  varandas: ['varanda'],
  muro: ['muro'],
  beirais_cobertura: ['beiral', 'topo'],
  elementos_metalicos: ['grade'],
  escadas_atrio: [],
  paredes_interiores: [],
  tetos: [],
  outro: [],
};

export function facesDaZona(kind: SurfaceKind): FaceKind[] {
  return FACES_DA_ZONA[kind] ?? [];
}

/**
 * Há zonas que o desenho não consegue apontar com precisão: uma «fachada» pode ser a da frente, a
 * de trás ou uma lateral, e a zona não diz qual — nunca houve esse campo. Acende-se o que se sabe e
 * **diz-se** que não se sabe qual, em vez de escolher uma à sorte e deixar o cliente a pensar que a
 * plataforma sabe qualquer coisa que não sabe.
 */
export function avisoDoRealce(kind: SurfaceKind): string | null {
  if (facesDaZona(kind).length === 0) return 'Esta zona não aparece no volume do prédio.';
  if (kind === 'fachada') return 'O pedido não diz qual das fachadas: estão assinaladas todas as que se veem.';
  return null;
}
