import type { Engagement } from './engagement';

/**
 * De quem é o próximo passo de uma contratação, e qual — para o rasto de avisos que leva cada parte até
 * ao contrato (promotor, 05/11/2026: «avisos bem evidentes para que o user não se perca onde está o doc e
 * como fazer … com indicação a cada menu onde carregar até alcançar o doc»).
 *
 * Responde só ao que é **obrigação** da parte para a contratação avançar. Desistir ou abrir um litígio
 * estão sempre à mão e não são passos: até 05/11/2026 a lista contava qualquer ação disponível como
 * «O próximo passo é seu», e o cliente via-o enquanto esperava pela confirmação do pintor (só porque podia
 * desistir) — e o pintor não o via quando tinha a comissão por pagar (o pagamento não é um acontecimento).
 *
 * O cliente nunca lê o que a plataforma cobra ao pintor (regra 15): para ele, o passo do pintor chama-se
 * «confirmação», e estes textos só vão à parte de quem é o passo.
 */

export type Passo = 'pagar_caucao' | 'depositar_adiantamento' | 'confirmar_obra' | 'assinar' | 'decidir';

export interface ProximoPasso {
  passo: Passo;
  /** Curto, para o menu, a lista e o título do aviso. */
  titulo: string;
  /** Uma frase sobre o que fazer, sem números. */
  texto: string;
  /** Data limite (AAAA-MM-DD, hora de Lisboa), quando a regra a fixa. */
  ate?: string;
}

type Estado = Pick<Engagement, 'status' | 'clientDue' | 'feeDue' | 'signDue'>;

export function proximoPasso(e: Estado, lado: 'cliente' | 'pintor'): ProximoPasso | null {
  if (lado === 'cliente') {
    switch (e.status) {
      case 'aguarda_deposito':
        return {
          passo: 'pagar_caucao',
          titulo: 'Pagar a caução',
          texto: 'A caução confirma a escolha da proposta e é devolvida quando as duas partes assinarem.',
        };
      case 'aguarda_adiantamento':
        return {
          passo: 'depositar_adiantamento',
          titulo: 'Depositar o adiantamento',
          texto: 'O adiantamento fica no parceiro de pagamentos e passa para o pintor quando as duas partes assinarem.',
          ...(e.clientDue ? { ate: e.clientDue } : {}),
        };
      case 'aguarda_assinatura_cliente':
        return {
          passo: 'assinar',
          titulo: 'Assinar o contrato',
          texto: 'Descarregar o PDF, assinar com a Chave Móvel Digital e carregar o ficheiro assinado na página do contrato.',
          ...(e.clientDue ? { ate: e.clientDue } : {}),
        };
      case 'pintor_nao_pagou':
      case 'pintor_nao_assinou':
        return {
          passo: 'decidir',
          titulo: 'Escolher outra proposta',
          texto: 'O pintor não cumpriu o prazo: passar para outra proposta, ou encerrar.',
        };
      default:
        return null;
    }
  }
  switch (e.status) {
    case 'aguarda_fee':
      return {
        passo: 'confirmar_obra',
        titulo: 'Confirmar a obra',
        texto: 'Pagar a comissão para conhecer o cliente e poder assinar.',
        ...(e.feeDue ? { ate: e.feeDue } : {}),
      };
    case 'aguarda_assinatura_pintor':
      return {
        passo: 'assinar',
        titulo: 'Assinar o contrato',
        texto: 'Descarregar o PDF já assinado pelo cliente, assinar com a Chave Móvel Digital e carregá-lo na página do contrato.',
        ...(e.signDue ? { ate: e.signDue } : {}),
      };
    default:
      return null;
  }
}

/** O passo que o rasto de avisos assinala em primeiro lugar: a assinatura é onde as pessoas se perdem. */
export const ordenarPorUrgencia = <T extends { passo: ProximoPasso }>(xs: T[]): T[] =>
  [...xs].sort(
    (a, b) =>
      Number(b.passo.passo === 'assinar') - Number(a.passo.passo === 'assinar') || (a.passo.ate ?? '9').localeCompare(b.passo.ate ?? '9'),
  );
