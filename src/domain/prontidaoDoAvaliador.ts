// Pronto para receber levantamentos? (decisão do promotor, 06/11/2026.)
//
// O cartão «Quanto pode ganhar» saiu da página pública: os valores e as percentagens aparecem só dentro
// da aplicação, depois de a pessoa ter feito o que é preciso para receber oportunidades. Até lá, o topo
// de «Avaliações › Hoje» mostra o que falta, por esta ordem:
//
// 1. **Inscrição de avaliador** (obrigatória) — a autodeclaração da pessoa. Sem ela a base não deixa
//    reservar levantamentos (`reserva_so_para_avaliadores_inscritos`).
// 2. **Zonas da empresa** (obrigatória) — pelo menos um concelho escolhido, ou «Todo o país» marcado de
//    propósito; sem escolha, o concelho da morada da empresa (promotor, 06/11/2026 —
//    `coberturaDaEmpresa.ts`). Nunca «todo o país» por omissão. Só o responsável da empresa as grava.
// 3. **Avisos por WhatsApp** (recomendado, não obrigatório) — quem responde primeiro fica com o
//    levantamento, e o WhatsApp é o aviso que chega primeiro.
//
// Pronto = os dois obrigatórios feitos. O WhatsApp nunca impede o cartão; quando falta, aparece a
// recomendação ao lado.

export type PassoDoAvaliador = 'inscricao' | 'zonas' | 'whatsapp';

export interface ItemDaLista {
  passo: PassoDoAvaliador;
  titulo: string;
  feito: boolean;
  obrigatorio: boolean;
  /** Onde se faz. */
  href: string;
  /** O botão; `null` quando quem lê não o pode fazer (as zonas, para quem não é responsável). */
  acao: string | null;
  nota: string;
}

export interface SituacaoDoAvaliador {
  inscrito: boolean;
  /** Há uma zona que vale: a escolhida, ou o concelho da morada da empresa (`zonaEfetiva`). */
  zonasDefinidas: boolean;
  /** Quando a zona é a por omissão (nada escolhido): «Viana do Castelo (morada da empresa)», para o ecrã o dizer. */
  zonaDaMorada?: string | null;
  /** A pessoa pode gravar as zonas da empresa. */
  responsavel: boolean;
  whatsappLigado: boolean;
}

/** A recomendação do promotor (06/11/2026), em tratamento impessoal (regra 12). */
export const RECOMENDACAO_WHATSAPP =
  'Para ganhar levantamentos é preciso ser o primeiro a responder. Inscreva o seu telemóvel para receber por WhatsApp os avisos de novas ofertas. É gratuito.';

export function listaDoAvaliador(s: SituacaoDoAvaliador): ItemDaLista[] {
  return [
    {
      passo: 'inscricao',
      titulo: 'Inscrição de avaliador',
      feito: s.inscrito,
      obrigatorio: true,
      href: '/app/avaliacoes/inscricao',
      acao: 'Fazer a inscrição',
      nota: 'Uma autodeclaração com quatro compromissos. Fica registada em seu nome.',
    },
    {
      passo: 'zonas',
      titulo: 'Concelhos cobertos pela empresa',
      feito: s.zonasDefinidas,
      obrigatorio: true,
      href: '/app/avaliacoes/disponibilidade',
      acao: s.responsavel ? 'Escolher os concelhos' : null,
      nota: s.responsavel
        ? 'Os concelhos onde a empresa vai à obra. Sem escolha valem os da morada e das lojas da empresa, que ainda não têm código postal.'
        : 'Quem os escolhe é o responsável da empresa. Até lá não chegam oportunidades.',
    },
    {
      passo: 'whatsapp',
      titulo: 'Avisos por WhatsApp',
      feito: s.whatsappLigado,
      obrigatorio: false,
      href: '/app/avaliacoes/inscricao#avisos',
      acao: 'Ligar os avisos',
      nota: RECOMENDACAO_WHATSAPP,
    },
  ];
}

/** Pronto = inscrição e zonas feitas. O WhatsApp é recomendado e não conta. */
export const prontoParaLevantamentos = (s: SituacaoDoAvaliador) => s.inscrito && s.zonasDefinidas;

/** A chave, por pessoa, que guarda neste navegador que a janela «Está pronto» já foi vista. */
export const chaveDaJanelaDePronto = (userId: string) => `avaliador.pronto.visto.${userId}`;
