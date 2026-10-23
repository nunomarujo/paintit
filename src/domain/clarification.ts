// Pedido de esclarecimento ao vendedor sobre o levantamento (decisão de 23/10/2026, docs/DECISOES.md):
// qualquer pintor que ache a informação do levantamento insuficiente pode pedir o que falta. As dúvidas
// de todos os pintores dessa obra juntam-se numa única lista, sem identificar quem perguntou nem a quem
// (o vendedor nunca sabe que pintor pediu o quê, e os pintores nunca sabem quem é o vendedor). O
// vendedor responde sempre pela plataforma — nunca há contacto direto.
//
// Prazo, em dois marcos fixos, sem perda parcial a meio (o promotor rejeitou explicitamente uma
// penalização proporcional por atraso): um dia para confirmar, na aplicação, que vai à obra; mais um dia
// para lá ir e responder. Falhar qualquer um dos dois marcos custa a comissão desta obra por completo —
// sem valor parcial — e o pedido passa a estar disponível para outro vendedor da zona (mesmo padrão
// "primeiro a reservar, avança" de reserve_survey). Este mecanismo só serve para esclarecimentos: nunca
// para pedir um levantamento novo nem para qualquer outra tarefa.

export const CLARIFICATION_STATUSES = ['aberto', 'respondido', 'expirado'] as const;
export type ClarificationStatus = (typeof CLARIFICATION_STATUSES)[number];

/** Dia 1: confirmar na aplicação que vai à obra. */
export const CLARIFICATION_CONFIRM_WINDOW_HOURS = 24;

/** Dia 2 (a partir da confirmação do dia 1): visitar e responder. */
export const CLARIFICATION_RESPOND_WINDOW_HOURS = 24;

/** Prazo total, do pedido à resposta, se o vendedor confirmar no limite do dia 1. */
export const CLARIFICATION_TOTAL_WINDOW_HOURS = CLARIFICATION_CONFIRM_WINDOW_HOURS + CLARIFICATION_RESPOND_WINDOW_HOURS;
