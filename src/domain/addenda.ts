import type { Cents } from './money';

// Trabalhos a mais (adendas) — 25/10/2026, docs/DECISOES.md.
//
// É a fonte número um de conflito e de margem perdida numa empreitada de pintura: o cliente pede
// "aproveite e pinte também a escada", não há adenda escrita nem preço aceite, e no fim ou o pintor
// não cobra ou cobra e discute. A adenda existe para que esse pedido deixe rasto: descrição, preço,
// fotografia e a aceitação do cliente, com data.
//
// Regra que não se contorna: uma adenda só conta para o valor da obra depois de aceite. Enquanto está
// proposta, é uma intenção — e é assim que aparece no ecrã, para o pintor não contar com dinheiro que
// ainda não tem.

export const ADDENDA_STATES = ['proposta', 'aceite', 'recusada', 'retirada'] as const;
export type AddendaState = (typeof ADDENDA_STATES)[number];

export const ADDENDA_STATE_LABELS: Record<AddendaState, string> = {
  proposta: 'À espera do cliente',
  aceite: 'Aceite',
  recusada: 'Recusada',
  retirada: 'Retirada',
};

export interface Addenda {
  id: string;
  descricao: string;
  valorCents: Cents;
  estado: AddendaState;
  criadaEm: string;
  respondidaEm: string | null;
  temFotografia: boolean;
}

export interface AddendaInput {
  descricao: string;
  valorCents: Cents;
}

/** O que falta para a adenda poder ser enviada ao cliente. Vazio = pode seguir. */
export function addendaErrors(input: AddendaInput): Record<string, string> {
  const errors: Record<string, string> = {};
  const descricao = input.descricao.trim();
  if (descricao.length < 8) errors.descricao = 'Descreva o trabalho a mais em poucas palavras — é isto que o cliente aceita.';
  if (descricao.length > 600) errors.descricao = 'Até 600 caracteres.';
  if (!Number.isInteger(input.valorCents) || input.valorCents <= 0) errors.valor = 'Indique o preço do trabalho a mais, sem IVA.';
  return errors;
}

/** Só o que o cliente aceitou acresce ao valor da obra. */
export const aceites = (as: Addenda[]): Addenda[] => as.filter((a) => a.estado === 'aceite');
export const totalAceite = (as: Addenda[]): Cents => aceites(as).reduce((n, a) => n + a.valorCents, 0);
export const totalProposto = (as: Addenda[]): Cents =>
  as.filter((a) => a.estado === 'proposta').reduce((n, a) => n + a.valorCents, 0);

/**
 * Dias de calendário desde que foi proposta, para saber quando vale a pena relembrar o cliente. Conta
 * dias inteiros e não horas: uma adenda enviada ao fim da tarde de segunda está "há 1 dia" na terça,
 * que é como qualquer pessoa a conta.
 */
export const diasAEsperar = (a: Addenda, hoje: string): number =>
  Math.round((Date.parse(`${hoje}T00:00:00Z`) - Date.parse(`${a.criadaEm.slice(0, 10)}T00:00:00Z`)) / 86_400_000);

/** Ao fim de uma semana sem resposta, a adenda deixa de ser recente e passa a pendência. */
export const LEMBRAR_DIAS = 7;

/**
 * As adendas que entram na barra de pendências da obra, da mais antiga para a mais recente — uma
 * adenda por responder prescreve na memória do cliente, e por isso vem antes de uma tranche em atraso,
 * que não desaparece.
 */
export function addendaPendings(as: Addenda[], hoje: string): { id: string; texto: string; aLembrar: boolean }[] {
  return as
    .filter((a) => a.estado === 'proposta')
    .sort((x, y) => x.criadaEm.localeCompare(y.criadaEm))
    .map((a) => {
      const dias = diasAEsperar(a, hoje);
      return {
        id: a.id,
        texto: `Trabalho a mais por aceitar: ${a.descricao.slice(0, 60)}${a.descricao.length > 60 ? '…' : ''}`,
        aLembrar: dias >= LEMBRAR_DIAS,
      };
    });
}
