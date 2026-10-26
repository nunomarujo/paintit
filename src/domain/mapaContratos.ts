import type { Cents } from './money';

/**
 * Mapa de Contratos Públicos: o que dizer ao pintor a partir dos contratos já celebrados.
 *
 * A pergunta a que o ecrã responde não é "que concursos estão abertos" — dois terços das empreitadas
 * de pintura do Estado não têm concurso nenhum. É **quem contrata pintura à minha volta, quanto paga,
 * e quem costuma chamar**. Isso lê-se no passado, não no futuro, e está publicado.
 *
 * As contagens fazem-se na base de dados (`mapa_contratos`, migração de 26/10/2026): com os quinze
 * anos carregados são 9 393 contratos, e trazê-los em bruto para somar aqui eram 5,7 MB por abertura
 * de página. O que fica deste lado são os tipos e as decisões de apresentação — sobretudo a ordem,
 * que é juízo de produto e não contagem.
 */

export interface EntidadeDoMapa {
  /** O NIF quando existe; senão o nome, que é o que resta para agrupar. */
  chave: string;
  nif: string | null;
  nome: string;
  contratos: number;
  totalCents: Cents;
  /** O valor do meio, que diz mais sobre o que a entidade costuma pagar do que a média. */
  medianaCents: Cents;
  porConvite: number;
  /** Convites em que foi chamada uma empresa só: aí, estar na lista é ganhar a obra. */
  conviteUnico: number;
  /**
   * Convites cuja lista de convidados o portal não publica.
   *
   * Importa mostrar à parte: sem isto, um `conviteUnico` baixo lê-se como "esta entidade abre o
   * convite a várias empresas", quando pode ser apenas que não se sabe quem foram. Em 2026 faltava a
   * lista em 113 dos 326 convites.
   */
  semLista: number;
  /** A data do contrato mais recente, que é o que diz se a entidade ainda está a contratar. */
  ultimo: string | null;
  concelhos: string[];
}

/** Quem é chamado, e com que frequência: para o pintor saber com quem está a competir. */
export interface ConvidadoDoMapa {
  chave: string;
  nif: string | null;
  nome: string;
  /** Vezes que foi convidado. */
  convites: number;
  /** Vezes que ficou com a obra, das que foi convidado. */
  ganhos: number;
}

/** O que o mapa sabe sobre a própria empresa do pintor. Procurada pelo NIF, nunca pelo nome. */
export interface PresencaDaEmpresa {
  convites: number;
  ganhos: number;
  entidades: string[];
}

export interface ResumoDoMapa {
  contratos: number;
  totalCents: Cents;
  entidades: number;
  porConvite: number;
  semLista: number;
  anos: number[];
}

/** Tudo o que o ecrã precisa, tal como a base o devolve. */
export interface Mapa {
  resumo: ResumoDoMapa;
  entidades: EntidadeDoMapa[];
  convidados: ConvidadoDoMapa[];
  presenca: PresencaDaEmpresa;
}

/**
 * Quantos anos o mapa mostra por omissão.
 *
 * Cinco: o suficiente para uma entidade mostrar hábito, e recente o bastante para o hábito ainda ser
 * verdade. A série completa vai a 2012, mas uma câmara que contratava em 2013 e parou não diz nada a
 * quem quer bater à porta hoje — e apareceria no topo da lista por número de contratos.
 */
export const ANOS_DO_MAPA = 5;

/**
 * A ordem por que as entidades se apresentam.
 *
 * Por **frequência** e, só em empate, por valor. Ordenar por valor punha uma junta de freguesia com
 * uma obra grande à frente de uma câmara que contrata todos os meses: ao pintor interessa a quem vale
 * a pena bater à porta, e isso mede-se em quantas vezes contrata, não no tamanho de uma obra.
 */
export function ordenarEntidades(entidades: EntidadeDoMapa[]): EntidadeDoMapa[] {
  return [...entidades].sort(
    (a, b) => b.contratos - a.contratos || b.totalCents - a.totalCents || a.nome.localeCompare(b.nome, 'pt'),
  );
}

/**
 * A entidade contrata com hábito suficiente para o que se diz dela significar alguma coisa?
 *
 * Abaixo disto, "costuma pagar" e "convida uma empresa só" são uma ou duas ocorrências a fingir de
 * padrão. O ecrã continua a mostrar a entidade — ela contrata, e isso é o que interessa — mas sem
 * lhe atribuir hábitos.
 */
export function temHabito(e: EntidadeDoMapa): boolean {
  return e.contratos >= 3;
}

/**
 * A entidade concentra os convites numa empresa só?
 *
 * Medido nos dados a 26/10/2026: nacionalmente as entidades **rodam** — das 1 235 empresas convidadas
 * desde 2022, 828 foram-no uma única vez, e dentro de cada entidade que convida com regularidade a
 * mais chamada fica em média com 24% dos convites. Mas há excepções fortes e locais: em Vila Franca
 * de Xira, 21 dos 33 convites foram a uma empresa só. É essa diferença que o pintor precisa de ver —
 * não a média do país, que não é o sítio onde ele trabalha.
 *
 * Conta-se sobre os convites **com lista publicada**: os outros não se sabe a quem foram.
 */
export function concentraConvites(e: EntidadeDoMapa): boolean {
  const comLista = e.porConvite - e.semLista;
  return comLista >= 3 && e.conviteUnico / comLista >= 0.5;
}
