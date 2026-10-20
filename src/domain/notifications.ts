import type { EngagementStatus } from './engagement';

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
          lines: ['A empresa de pintura pagou a comissão. Os contactos já estão visíveis.', 'Falta a assinatura do contrato, a fazer primeiro pelo cliente.'],
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
      return both('A comissão não foi paga no prazo', ['A comissão não foi paga dentro do prazo, pelo que a escolha fica sem efeito.']);
    case 'pintor_nao_assinou':
      return both('O contrato não foi assinado no prazo', ['A empresa de pintura não assinou dentro do prazo.']);
    case 'cliente_desistiu':
      return both('O cliente desistiu', ['O cliente desistiu depois de conhecer a empresa de pintura.']);
    case 'em_litigio':
      return both('Contratação em litígio', ['Foi aberto um litígio nesta contratação. A equipa da plataforma analisa o caso.']);
    default:
      return [];
  }
}

export const NEW_PROPOSAL_NOTICE = (requestTitle: string): Omit<Notice, 'to'> => ({
  subject: 'Nova proposta recebida',
  lines: [`Há uma nova proposta para o pedido «${requestTitle}».`, 'As propostas aparecem sem identificar a empresa, para serem comparadas pelo conteúdo.'],
});
