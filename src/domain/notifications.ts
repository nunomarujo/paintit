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
