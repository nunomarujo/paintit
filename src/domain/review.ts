// Motivos pré-aprovados para rejeitar uma fotografia de pormenor ou um documento de verificação (decisão de 22/10/2026).
// Agilizam a decisão e uniformizam o que o cliente ou a entidade vê; o texto fica sempre editável, para o caso raro
// que não encaixa em nenhum. O campo guardado na base de dados continua a ser só texto (notas_revisao/notas_validacao).

export const PHOTO_REJECTION_REASONS = [
  'Mostra a fachada inteira ou identifica o prédio.',
  'Mostra números de porta, placas ou nomes de rua.',
  'Mostra montras, lojas ou outros identificadores comerciais.',
  'Mostra matrículas de viaturas.',
  'Mostra pessoas reconhecíveis.',
  'Mostra prédios vizinhos de forma identificável.',
  'Está fora de foco ou não é possível avaliar.',
] as const;

export const DOCUMENT_REJECTION_REASONS = [
  'O documento está ilegível.',
  'O documento já expirou.',
  'O nome ou o NIF não corresponde à entidade.',
  'O documento está incompleto.',
  'Não é o tipo de documento pedido.',
] as const;

export const OTHER_REASON = 'Outro motivo';
