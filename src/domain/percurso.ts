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

/**
 * De quem é a vez. É a pergunta que o cliente faz primeiro, e a que o ecrã não respondia.
 *
 * Os nomes mudaram a 30/10/2026, por correcção do promotor: «Consigo» e «Com o profissional do
 * levantamento» descreviam a posse e não a obrigação. O cliente precisa de saber **se tem de
 * agir**, e é isso que as etiquetas passam a dizer.
 */
export type Vez = 'cliente' | 'a_aguardar_profissional' | 'a_aguardar_marcacao' | 'pintores' | 'ninguem';

export const VEZ_LABELS: Record<Vez, string | null> = {
  cliente: 'A sua vez',
  a_aguardar_profissional: 'A aguardar o profissional',
  a_aguardar_marcacao: 'A aguardar marcação',
  pintores: 'Com os pintores',
  ninguem: null,
};

/**
 * Para onde leva o botão do estado. O destino escolhe-se aqui, o endereço monta-se no ecrã: o
 * domínio não tem de saber como se chama a rota nem que âncora tem a secção.
 *
 * **Só entram alvos que existem.** O promotor foi explícito: «só mostrar acções que tenham
 * funcionamento real por trás». Duas das que ele listou — indicar disponibilidade, alterar a
 * marcação — ainda não têm nada atrás, e por isso não aparecem: um botão que não faz nada é pior
 * do que nenhum.
 */
export type AlvoDaAccao = 'pedido_de_visita' | 'levantamento' | 'publicar' | 'propostas' | 'pendencia';

export interface AccaoDoEstado {
  texto: string;
  alvo: AlvoDaAccao;
}

export interface EstadoDoPercurso {
  fase: Fase;
  vez: Vez;
  /** O que fazer a seguir, quando há mesmo alguma coisa a fazer. */
  accao: AccaoDoEstado | null;
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
      accao: null,
      explicacao: 'Não há nada a fazer neste pedido.',
      tecnicoPertenceAoCliente: false,
    };
  }

  if (e.estadoDoPedido === 'publicado') {
    return {
      fase: 'a_receber_propostas',
      vez: 'pintores',
      titulo: 'A receber propostas',
      accao: { texto: 'Ver prazo e propostas', alvo: 'propostas' },
      // «Até lá, não há nada a fazer» saiu a 30/10/2026: pode haver esclarecimentos a responder, e
      // dizer-lhe que não tem nada a fazer é prometer-lhe sossego que não lhe podemos garantir.
      explicacao:
        'As propostas ficam disponíveis no fim do prazo, para se compararem lado a lado. Avisamos se surgir algum pedido de esclarecimento.',
      tecnicoPertenceAoCliente: false,
    };
  }

  const lev = e.levantamento;
  const activo = lev && (lev.status === 'aberto' || lev.status === 'reservado');

  if (activo && lev.status === 'aberto') {
    return {
      fase: 'visita_pedida',
      vez: 'a_aguardar_profissional',
      // «Um profissional vai visitar» prometia o que ainda não existe: a vaga está aberta e
      // ninguém a reservou. Correcção do promotor a 30/10/2026 — uma vaga aberta não é um
      // profissional a caminho, e dizê-lo seria vender uma certeza que não temos.
      titulo: 'A procurar um profissional para o levantamento',
      accao: { texto: 'Ver pedido de visita', alvo: 'pedido_de_visita' },
      explicacao:
        'O pedido de ajuda foi registado. Ainda não há profissional atribuído nem data marcada. Não precisa de preencher as medidas enquanto aguarda.',
      tecnicoPertenceAoCliente: false,
    };
  }

  if (activo && lev.status === 'reservado') {
    return {
      fase: 'visita_marcada',
      vez: lev.marcadoPara ? 'a_aguardar_profissional' : 'a_aguardar_marcacao',
      // Indicar disponibilidade e alterar a marcação são as acções certas para estes dois estados,
      // e são as duas que ainda não têm nada atrás. Ficam de fora até terem.
      accao: { texto: 'Ver pedido de visita', alvo: 'pedido_de_visita' },
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
      accao: { texto: 'Rever levantamento', alvo: 'levantamento' },
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
      // «Continuar preparação», e não «Completar o pedido»: o cliente não vai completar nada de
      // uma assentada, vai continuar de onde ficou. E leva-o à primeira pendência a sério, não a
      // uma secção fixa (promotor, 30/10/2026).
      accao: { texto: 'Continuar preparação', alvo: 'pendencia' },
      // «Mais abaixo» deixou de ser verdade quando a página passou a ter secções (30/10/2026): o
      // que falta está numa secção que pode nem estar à vista, e o botão leva lá.
      explicacao: 'Falta completar o pedido antes de o publicar. Em «Rever e publicar» está a lista do que falta.',
      tecnicoPertenceAoCliente: true,
    };
  }

  return {
    fase: 'pronto_a_publicar',
    vez: 'cliente',
    titulo: 'Pronto a publicar',
    accao: { texto: 'Rever e publicar', alvo: 'publicar' },
    explicacao: 'Está tudo o que os pintores precisam de saber. Publique para começar a receber propostas.',
    tecnicoPertenceAoCliente: true,
  };
}

/** Em que ponto da régua recebida está esta fase. Zero quando a fase não é nenhuma delas. */
export function etapaAtingida(fase: Fase, etapas: { fase: Fase }[] = ETAPAS): number {
  if (fase === 'fechado') return etapas.length - 1;
  // Entregue o levantamento, a etapa do levantamento está **cumprida** e a que está a decorrer é a
  // revisão — é o cliente que tem o pedido nas mãos. Deixá-la activa dizia que o profissional ainda
  // andava a medir (correcção do promotor, 30/10/2026).
  const procurada: Fase = fase === 'levantamento_entregue' ? 'pronto_a_publicar' : fase;
  const i = etapas.findIndex((x) => x.fase === procurada);
  if (i !== -1) return i;
  // Na régua curta não há etapa de revisão separada do preenchimento: quem faz as duas é a mesma
  // pessoa, e o pedido só sai de lá quando estiver pronto.
  return 0;
}
