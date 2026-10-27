import type { EngagementStatus } from './engagement';
import { REFERRAL_BPS } from './referral';

// O que cada lado deve saber quando uma contratação muda de estado.
// Texto impessoal e sem identificar a outra parte: a identidade só é revelada depois da apresentação.

export interface Notice {
  to: 'cliente' | 'pintor';
  subject: string;
  lines: string[];
}

export function engagementNotices(before: EngagementStatus, after: EngagementStatus, feeDeadlineDays: number): Notice[] {
  if (before === after) return [];
  const both = (subject: string, lines: string[]): Notice[] => [
    { to: 'cliente', subject, lines },
    { to: 'pintor', subject, lines },
  ];
  switch (after) {
    case 'aguarda_fee':
      return [
        {
          to: 'pintor',
          subject: 'A proposta foi escolhida',
          lines: [
            'O cliente escolheu a proposta e depositou a caução.',
            `A comissão tem de ser paga em ${feeDeadlineDays} dias para ver o contrato e os contactos do cliente, e assinar.`,
          ],
        },
      ];
    case 'aguarda_assinatura_cliente':
      return [
        {
          to: 'cliente',
          subject: 'Partes apresentadas: falta assinar o contrato',
          lines: ['A empresa de pintura confirmou a escolha. Os contactos já estão visíveis.', 'Falta a assinatura do contrato, a fazer primeiro pelo cliente.'],
        },
      ];
    case 'aguarda_assinatura_pintor':
      return [
        {
          to: 'pintor',
          subject: 'O cliente assinou: falta a assinatura da empresa',
          lines: ['O cliente assinou o contrato.', 'Falta a assinatura da empresa de pintura para o contrato ficar concluído.'],
        },
      ];
    case 'assinado':
      return both('Contrato assinado pelas duas partes', [
        'As duas partes assinaram. O contrato fica guardado na plataforma.',
        'A caução do cliente é devolvida.',
      ]);
    case 'pintor_nao_pagou':
      return [
        { to: 'cliente', subject: 'A empresa não confirmou no prazo', lines: ['A empresa de pintura não confirmou a escolha dentro do prazo, pelo que esta escolha fica sem efeito.', 'A caução é devolvida ou passa para outra proposta, à escolha do cliente.'] },
        { to: 'pintor', subject: 'A comissão não foi paga no prazo', lines: ['A comissão não foi paga dentro do prazo, pelo que a escolha fica sem efeito.'] },
      ];
    case 'pintor_nao_assinou':
      return both('O contrato não foi assinado no prazo', ['A empresa de pintura não assinou dentro do prazo.']);
    case 'cliente_desistiu':
      return both('O cliente desistiu', ['O cliente desistiu depois de conhecer a empresa de pintura.']);
    case 'em_litigio':
      return both('Contratação em litígio', ['Foi aberto um litígio nesta contratação. A equipa da plataforma analisa o caso.']);
    case 'litigio_culpa_cliente':
      return [
        { to: 'cliente', subject: 'Litígio resolvido: a caução não é devolvida', lines: ['A equipa da plataforma decidiu o litígio com responsabilidade do lado do cliente.', 'A caução depositada fica retida.'] },
        { to: 'pintor', subject: 'Litígio resolvido a seu favor', lines: ['A equipa da plataforma decidiu o litígio com responsabilidade do lado do cliente.', 'A comissão paga é devolvida.'] },
      ];
    case 'litigio_culpa_pintor':
      return [
        { to: 'cliente', subject: 'Litígio resolvido a seu favor', lines: ['A equipa da plataforma decidiu o litígio com responsabilidade do lado da empresa de pintura.', 'A caução depositada é devolvida.'] },
        { to: 'pintor', subject: 'Litígio resolvido: a comissão não é devolvida', lines: ['A equipa da plataforma decidiu o litígio com responsabilidade do lado da empresa de pintura.', 'A comissão paga fica retida.'] },
      ];
    case 'litigio_repartido':
      return both('Litígio resolvido: responsabilidade repartida', [
        'A equipa da plataforma decidiu o litígio com responsabilidade repartida entre as duas partes.',
        'Cada parte perde só uma fração do que tinha em risco; o detalhe está na página da contratação.',
      ]);
    default:
      return [];
  }
}

export const NEW_PROPOSAL_NOTICE = (requestTitle: string): Omit<Notice, 'to'> => ({
  subject: 'Nova proposta recebida',
  lines: [`Há uma nova proposta para o pedido «${requestTitle}».`, 'As propostas aparecem sem identificar a empresa, para serem comparadas pelo conteúdo.'],
});

/**
 * A janela de esclarecimentos abriu: as propostas foram entregues todas ao mesmo tempo.
 *
 * Datas por extenso, nunca "hoje" ou "amanhã": se a tarefa diária falhar um dia, uma data continua
 * verdadeira. Ao cliente não se diz quantas propostas há no assunto do email — o número chega-lhe
 * na plataforma, e um assunto com "3 propostas" lido por cima do ombro é informação de mais.
 */
export const JANELA_ABRIU_NOTICE = (p: { titulo: string; ate: string; para: 'cliente' | 'pintor' }): { subject: string; lines: string[] } =>
  p.para === 'cliente'
    ? {
        subject: 'As propostas já estão abertas',
        lines: [
          `O prazo do pedido «${p.titulo}» acabou e as propostas foram abertas todas ao mesmo tempo.`,
          `Até ${p.ate} pode perguntar o que quiser a qualquer uma delas, sem ninguém se identificar.`,
          'Pode escolher quando quiser — durante estes dias ou depois.',
        ],
      }
    : {
        subject: 'A sua proposta foi aberta: podem perguntar-lhe',
        lines: [
          `O prazo do pedido «${p.titulo}» acabou e a sua proposta foi entregue ao cliente, ao mesmo tempo que as outras.`,
          `Até ${p.ate} o cliente pode fazer perguntas. Responder depressa conta: é a última coisa que ele lê antes de escolher.`,
        ],
      };

/** Último dia para perguntar. Só ao cliente: é ele que tem de perguntar antes de fechar. */
export const JANELA_ACABA_NOTICE = (p: { titulo: string; ate: string }): { subject: string; lines: string[] } => ({
  subject: 'Último dia para esclarecer dúvidas',
  lines: [
    `${p.ate} é o último dia para fazer perguntas às propostas do pedido «${p.titulo}».`,
    'Depois disso as propostas ficam como estão, e pode escolher quando lhe der jeito.',
  ],
});

/**
 * Os três toques do seguimento de um orçamento, escritos ao cliente do pintor.
 *
 * Quem recebe isto não é utilizador da plataforma: é um cliente dele, que pediu um orçamento e não
 * respondeu. Por isso cada mensagem diz, logo na primeira linha, **quem escreve e porquê** — o
 * assistente de IA do pintor, com o consentimento dele, pela quempinta.pt. Não é fórmula legal: é o
 * mínimo para ninguém se sentir enganado por uma mensagem que parecia escrita à mão.
 *
 * Sem pressão, sem juros, sem prazos inventados. O terceiro diz que é o último, e todos dizem como
 * se faz parar. Três e acabou (decisão do promotor, 26/10/2026).
 */
export const SEGUIMENTO_NOTICES = {
  orcamento_1: (p: { pintor: string; titulo: string | null }) => ({
    subject: `O orçamento${p.titulo ? ` de ${p.titulo}` : ''} chegou bem?`,
    lines: [
      `Escrevo em nome de ${p.pintor}, com a autorização dele: sou o assistente de IA que acompanha os orçamentos dele, pela plataforma quempinta.pt.`,
      `Há uns dias recebeu um orçamento${p.titulo ? ` para ${p.titulo}` : ''}. Chegou bem?`,
      'Se houver alguma coisa por esclarecer — o que está incluído, prazos, materiais —, responda a este email e eu faço chegar a pergunta.',
      'Se preferir não receber mais mensagens sobre este orçamento, basta dizê-lo nesta resposta.',
    ],
  }),
  orcamento_2: (p: { pintor: string; titulo: string | null; validade: string | null }) => ({
    subject: 'Sobre o orçamento que recebeu',
    lines: [
      `Escrevo em nome de ${p.pintor}, com a autorização dele, pela plataforma quempinta.pt.`,
      p.validade
        ? `O preço do orçamento${p.titulo ? ` de ${p.titulo}` : ''} é válido até ${p.validade}. Depois dessa data os materiais podem ter outro preço.`
        : `Queria só saber se o orçamento${p.titulo ? ` de ${p.titulo}` : ''} ainda está em cima da mesa.`,
      'Se já escolheu outra empresa não há problema nenhum em dizê-lo — poupa-lhe mensagens e a ele o trabalho de ficar à espera.',
      'Para não receber mais nada sobre este orçamento, responda a dizer.',
    ],
  }),
  orcamento_3: (p: { pintor: string; titulo: string | null }) => ({
    subject: 'Última mensagem sobre este orçamento',
    lines: [
      `Escrevo em nome de ${p.pintor}, com a autorização dele, pela plataforma quempinta.pt.`,
      `Esta é a última mensagem que lhe envio sobre o orçamento${p.titulo ? ` de ${p.titulo}` : ''} — não voltarei a incomodá-lo.`,
      `Se a obra se mantiver, mais tarde ou noutro formato, fale com ${p.pintor} quando lhe der jeito: o orçamento pode ser refeito com os preços da altura.`,
    ],
  }),
} as const;

/**
 * Os lembretes de cobrança, ao cliente do pintor — e o aviso ao pintor ao fim de um mês.
 *
 * O que estas mensagens **não** têm é tão decidido como o que têm: não falam em juros, não ameaçam,
 * não inventam consequências e não dizem que é a última oportunidade. A plataforma não guarda
 * dinheiro nenhum nem cobra nada — lembra, e diz quem é.
 *
 * O valor vai por extenso em cada uma: um lembrete sem o número obriga o cliente a ir procurar a
 * factura, e quem tem de procurar adia.
 */
export const COBRANCA_NOTICES = {
  cobranca_1: (p: { pintor: string; obra: string; valor: string; data: string }) => ({
    subject: `Pagamento de ${p.obra}`,
    lines: [
      `Escrevo em nome de ${p.pintor}, com a autorização dele: sou o assistente de IA que acompanha os pagamentos das obras dele, pela plataforma quempinta.pt.`,
      `A parcela de ${p.valor} da obra ${p.obra} estava prevista para ${p.data}.`,
      'Se já tiver sido paga, peço desculpa pelo incómodo — responda a dizer e eu dou baixa.',
      'Se houver alguma coisa a esclarecer antes de pagar, responda também: faço chegar a pergunta.',
    ],
  }),
  cobranca_2: (p: { pintor: string; obra: string; valor: string; data: string }) => ({
    subject: `Ainda sobre o pagamento de ${p.obra}`,
    lines: [
      `Escrevo em nome de ${p.pintor}, com a autorização dele, pela plataforma quempinta.pt.`,
      `A parcela de ${p.valor} da obra ${p.obra}, prevista para ${p.data}, continua por regularizar nos registos dele.`,
      'Pode ser só um lançamento por acertar. Uma linha de resposta chega para eu perceber o que se passa.',
    ],
  }),
  cobranca_3: (p: { pintor: string; obra: string; valor: string; data: string }) => ({
    subject: `Última mensagem sobre o pagamento de ${p.obra}`,
    lines: [
      `Escrevo em nome de ${p.pintor}, com a autorização dele, pela plataforma quempinta.pt.`,
      `Esta é a última mensagem que lhe envio sobre a parcela de ${p.valor} da obra ${p.obra}, prevista para ${p.data} — não voltarei a incomodá-lo.`,
      `Se quiser resolver isto, fale directamente com ${p.pintor}.`,
    ],
  }),
  /** Ao pintor, ao fim de um mês: a partir daqui é com ele. */
  cobranca_pintor: (p: { obra: string; valor: string; data: string }) => ({
    subject: `Um mês sem receber: ${p.obra}`,
    lines: [
      `A parcela de ${p.valor} da obra ${p.obra} estava prevista para ${p.data} e continua por receber.`,
      'Enviámos os três lembretes ao cliente e não enviaremos mais: a partir daqui, mais mensagens só gastam a relação de que vai precisar quando telefonar.',
      'Se já recebeu, dê baixa da parcela na obra para deixarmos de contar.',
    ],
  }),
} as const;

/** Convite aos pintores quando um pedido é publicado. Só leva o que o anúncio anónimo já mostra (concelho, tipo, prazo). */
export const NEW_REQUEST_NOTICE = (p: { concelho: string; tipoObra: string; prazo: string }): { subject: string; lines: string[] } => ({
  subject: `Pedido de Orçamento - pintura em ${p.concelho}`,
  lines: [
    'Está aberto um pedido de orçamento para uma obra de pintura e a sua empresa é convidada a participar.',
    `Local: ${p.concelho}. Tipo de obra: ${p.tipoObra}. Propostas até ${p.prazo}.`,
    'Abra o anúncio, veja as zonas e as áreas e prepare o orçamento por trabalhos, em poucos passos. O cliente compara as propostas sem saber quem as fez.',
  ],
});

/** Convite de adesão enviado por um fornecedor a um pintor que ainda não está na plataforma (decisão de
 * 23/10/2026, docs/DECISOES.md) — o único aviso desta lista endereçado a quem ainda não é utilizador.
 * Identifica a pessoa que convidou (não só a empresa) e o desconto concreto que o código já traz, para o
 * email se ler como um convite pessoal com uma vantagem real, não um aviso genérico. */
export const SUPPLIER_INVITE_NOTICE = (p: { fornecedor: string; remetente: string | null }) => {
  const quemConvida = p.remetente ? `${p.remetente}, da ${p.fornecedor},` : `A equipa da ${p.fornecedor}`;
  const desconto = (REFERRAL_BPS / 100).toLocaleString('pt-PT', { minimumFractionDigits: 2 });
  return {
    subject: p.remetente ? `${p.remetente} (${p.fornecedor}) convida-o a orçamentar obras na Quem Pinta` : `${p.fornecedor} convida-o a orçamentar obras na Quem Pinta`,
    lines: [
      `${quemConvida} convida-o a juntar-se à Quem Pinta: condomínios e particulares descrevem a obra, pintores verificados orçamentam e o cliente escolhe — sem anúncios pagos, sem portas frias.`,
      `Este convite já vem com uma vantagem: ao aceitá-lo, fica ligado a esta empresa e os seus orçamentos passam a ter ${desconto} pontos percentuais de desconto na comissão da plataforma, enquanto a ligação estiver ativa.`,
      'Juntar-se é gratuito e sem compromisso — cria a conta em poucos minutos.',
    ],
  };
};

// Avisos ao fornecedor sobre os códigos de adesão. Dizem só o que o fornecedor pode saber: a empresa que usou o código e o
// concelho da obra; nunca o cliente, a morada nem o valor da obra (só a comissão a que tem direito).
export const REFERRAL_NOTICES = {
  candidatura: (p: { pintor: string; concelho: string }) => ({
    subject: 'Um pintor candidatou-se com o seu código',
    lines: [`${p.pintor} usou um código seu numa proposta para uma obra em ${p.concelho}.`, 'Se ganhar a obra, será informado do valor da sua comissão.'],
  }),
  ganhou: (p: { pintor: string; comissao: string }) => ({
    subject: 'Ganhou uma comissão de adesão',
    lines: [
      `${p.pintor} ganhou a obra com um código seu. A sua comissão é de ${p.comissao} (0,25% do valor da obra, sem IVA; acresce IVA se o cobrar).`,
      'Fica no seu saldo quando a plataforma receber a comissão do pintor. Avisamos nessa altura; depois pode resgatar o saldo quando quiser.',
    ],
  }),
  feeRecebido: (p: { comissao: string }) => ({
    subject: 'Tem saldo para resgatar',
    lines: [`A plataforma já recebeu a comissão do pintor: ${p.comissao} passaram para o seu saldo. Quando quiser, resgate o saldo na área do fornecedor (precisa dos dados de pagamento e do regime validado) e envie a fatura.`],
  }),
  paga: (p: { comissao: string; referencia: string }) => ({
    subject: 'Comissão de adesão paga',
    lines: [`Foi pago o seu resgate: ${p.comissao} transferidos.${p.referencia ? ` Referência: ${p.referencia}.` : ''}`],
  }),
};
