import type { SurveyStatus } from './survey';

/**
 * Em que ponto está um pedido, e **quem tem de fazer alguma coisa a seguir**.
 *
 * ## Porque é que isto existe
 *
 * A página do pedido mostrava uma lista de campos técnicos e, por baixo, os bloqueios à publicação.
 * Ao cliente que não sabe uma medida — e é para esse que a plataforma promete um profissional que
 * mede por ele — isso lia-se como uma lista de coisas que ele fez mal. O promotor apanhou-o a
 * 29/10/2026: «a aplicação promete que um profissional faz o levantamento, mas apresenta ao cliente
 * um formulário técnico e bloqueia-o por não ter medidas».
 *
 * A correcção não é tirar os campos: é dizer, antes deles, **em que fase o pedido está, quem actua
 * agora, e o que vem a seguir**. Enquanto houver um levantamento a caminho, os campos técnicos são
 * informação, não tarefa.
 *
 * ## O percurso, nas palavras do promotor
 *
 *     Pedido de visita → Visita → Levantamento → Revisão → Recepção de propostas
 *
 * ## O que este módulo **não** faz
 *
 * Não decide se o pedido pode ser publicado — isso é `publishBlockers`, e continua a ser dele. Aqui
 * só se lê o estado e se diz de quem é a vez. Um pedido pode estar na fase «revisão» e ainda ter
 * bloqueios; são duas perguntas diferentes e misturá-las foi o que produziu o ecrã que o promotor
 * rejeitou.
 */

export const FASES = [
  'visita_pedida',
  'visita_marcada',
  'levantamento_entregue',
  'a_preencher',
  'pronto_a_publicar',
  'a_receber_propostas',
  'fechado',
] as const;
export type Fase = (typeof FASES)[number];

/** De quem é a vez. É a pergunta que o cliente faz primeiro, e a que o ecrã não respondia. */
export type Vez = 'cliente' | 'profissional' | 'pintores' | 'ninguem';

export interface EstadoDoPercurso {
  fase: Fase;
  vez: Vez;
  /** O título do estado, para se ler de longe. */
  titulo: string;
  /** Uma frase: o que já aconteceu e o que vem a seguir. Nunca uma repreensão. */
  explicacao: string;
  /**
   * Os campos técnicos — superfícies, áreas, fotografias — são tarefa do cliente?
   * Falso enquanto houver um levantamento a caminho: nessa altura são informação que ele pode
   * consultar e completar se quiser, e é assim que a página os tem de apresentar.
   */
  tecnicoPertenceAoCliente: boolean;
}

export interface EntradaDoPercurso {
  /** `work_requests.status`. */
  estadoDoPedido: 'rascunho' | 'publicado' | 'encerrado' | 'cancelado' | string;
  /** O levantamento pedido, quando existe. Null: nunca houve, ou é um pedido anterior à mudança. */
  levantamento: { status: SurveyStatus; marcadoPara: string | null } | null;
  /** Quantas coisas faltam para publicar (`publishBlockers().length`). */
  bloqueiosDaPublicacao: number;
}

/**
 * As quatro etapas que se mostram ao cliente como régua, pela ordem em que acontecem. A recepção de
 * propostas é a quinta, e vem depois da publicação.
 */
export const ETAPAS: { fase: Fase; nome: string }[] = [
  { fase: 'visita_pedida', nome: 'Pedido de visita' },
  { fase: 'visita_marcada', nome: 'Visita' },
  { fase: 'levantamento_entregue', nome: 'Levantamento' },
  { fase: 'pronto_a_publicar', nome: 'Revisão' },
  { fase: 'a_receber_propostas', nome: 'Propostas' },
];

/**
 * A régua de quem trata de tudo sozinho. Sem visita, as duas primeiras etapas nunca acontecem, e
 * mostrá-las a cinzento prometia um passo que não vem — pior ainda, punha o pedido a parecer
 * atrasado logo no princípio.
 */
export const ETAPAS_SEM_VISITA: { fase: Fase; nome: string }[] = [
  { fase: 'a_preencher', nome: 'Levantamento' },
  { fase: 'pronto_a_publicar', nome: 'Revisão' },
  { fase: 'a_receber_propostas', nome: 'Propostas' },
];

/** A régua que serve este pedido: com visita a caminho ou já feita, a longa; sem ela, a curta. */
export const etapasDoPedido = (houveLevantamento: boolean) => (houveLevantamento ? ETAPAS : ETAPAS_SEM_VISITA);

export function percursoDoPedido(e: EntradaDoPercurso): EstadoDoPercurso {
  if (e.estadoDoPedido === 'cancelado' || e.estadoDoPedido === 'encerrado') {
    return {
      fase: 'fechado',
      vez: 'ninguem',
      titulo: e.estadoDoPedido === 'cancelado' ? 'Pedido cancelado' : 'Pedido encerrado',
      explicacao: 'Não há nada a fazer neste pedido.',
      tecnicoPertenceAoCliente: false,
    };
  }

  if (e.estadoDoPedido === 'publicado') {
    return {
      fase: 'a_receber_propostas',
      vez: 'pintores',
      titulo: 'A receber propostas',
      explicacao:
        'O pedido está publicado. As propostas chegam todas no fim do prazo, para se compararem lado a lado — até lá, não há nada a fazer.',
      tecnicoPertenceAoCliente: false,
    };
  }

  const lev = e.levantamento;
  const activo = lev && (lev.status === 'aberto' || lev.status === 'reservado');

  if (activo && lev.status === 'aberto') {
    return {
      fase: 'visita_pedida',
      vez: 'profissional',
      titulo: 'À espera de marcação da visita',
      explicacao:
        'O pedido de levantamento está entregue. Um profissional vai visitar o imóvel e registar as medições, as fotografias e os trabalhos. Não precisa de indicar as medidas.',
      tecnicoPertenceAoCliente: false,
    };
  }

  if (activo && lev.status === 'reservado') {
    return {
      fase: 'visita_marcada',
      vez: 'profissional',
      // Só se diz «marcada» quando há mesmo uma data. Um profissional ter reservado a vaga não é
      // uma marcação, e anunciá-lo como tal seria prometer o que ainda não existe (promotor,
      // 29/10/2026: «só apresentar “Visita marcada” quando houver uma data efectivamente
      // confirmada»).
      titulo: lev.marcadoPara ? 'Visita marcada' : 'Visita a combinar',
      explicacao: lev.marcadoPara
        ? 'A visita está marcada. Depois dela, o levantamento fica registado aqui e poderá revê-lo antes de publicar.'
        : 'Um profissional ficou com a visita e vai combinar consigo a data. Não precisa de indicar as medidas.',
      tecnicoPertenceAoCliente: false,
    };
  }

  if (lev?.status === 'concluido') {
    return {
      fase: 'levantamento_entregue',
      vez: 'cliente',
      titulo: 'Levantamento entregue',
      explicacao:
        'O profissional registou as medições e os trabalhos que observou. Reveja o que está aqui, peça correcções se for preciso, e publique quando estiver de acordo.',
      // A partir daqui o cliente manda: pode corrigir e acrescentar o que quiser.
      tecnicoPertenceAoCliente: true,
    };
  }

  // Sem levantamento a caminho — nunca houve, desistiu, ou ninguém foi — o pedido é dele.
  if (e.bloqueiosDaPublicacao > 0) {
    return {
      fase: 'a_preencher',
      vez: 'cliente',
      titulo: 'A preparar o pedido',
      explicacao: 'Falta completar o pedido antes de o publicar. O que falta está indicado mais abaixo.',
      tecnicoPertenceAoCliente: true,
    };
  }

  return {
    fase: 'pronto_a_publicar',
    vez: 'cliente',
    titulo: 'Pronto a publicar',
    explicacao: 'Está tudo o que os pintores precisam de saber. Publique para começar a receber propostas.',
    tecnicoPertenceAoCliente: true,
  };
}

/** Em que ponto da régua recebida está esta fase. Zero quando a fase não é nenhuma delas. */
export function etapaAtingida(fase: Fase, etapas: { fase: Fase }[] = ETAPAS): number {
  if (fase === 'fechado') return etapas.length - 1;
  const i = etapas.findIndex((x) => x.fase === fase);
  if (i !== -1) return i;
  // `a_preencher` e `levantamento_entregue` são o mesmo ponto da régua curta — o levantamento, quer
  // o faça o cliente quer o faça o profissional.
  if (fase === 'a_preencher' || fase === 'levantamento_entregue') return 0;
  return 0;
}
