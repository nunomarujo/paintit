/**
 * A oferta de lançamento (promotor, 06/11/2026): quem chega pelo QR de um flyer de pintores ou pelo link de um email do CRM
 * e cria uma empresa de pintura fica com o Plano Pro sem custo até à data da campanha. Funções puras; quem grava é
 * `src/lib/ofertaDeLancamento.ts`.
 *
 * A origem viaja num cookie que o navegador pode alterar (regra 10): por isso só vale pelo que se prova do lado do servidor —
 * o formato, o tipo de entidade criada e a data. Não é um segredo: o QR é público por natureza, e o limite é uma oferta por
 * entidade e a data.
 */

import { CAMPANHA_DE_LANCAMENTO } from './campanhas';

export const COOKIE_DE_ORIGEM = 'qp_origem';
export const VERSAO_DE_LANCAMENTO = `lancamento-${CAMPANHA_DE_LANCAMENTO.ate}`;
export const DIAS_DO_COOKIE = 30;

const FLYER = /^fl-[a-z]{2,4}-[0-9]$/;
const CODIGO = /^[A-Z0-9]{8}$/;

export interface Origem {
  /** O código do flyer (`?c=`), por exemplo «fl-pin-1». */
  flyer: string | null;
  /** O código do contacto do CRM (`?k=`). */
  codigo: string | null;
}

/** O que se lê do endereço: só entra o que tiver o formato exato; o resto é ignorado. */
export function origemDoEndereco(params: { get(nome: string): string | null }): Origem | null {
  const c = params.get('c');
  const k = params.get('k');
  const flyer = c && FLYER.test(c) ? c : null;
  const codigo = k && CODIGO.test(k) ? k : null;
  return flyer || codigo ? { flyer, codigo } : null;
}

export const origemParaCookie = (o: Origem) => `c:${o.flyer ?? ''}.k:${o.codigo ?? ''}`;

export function origemDoCookie(valor: string | undefined | null): Origem | null {
  const m = /^c:([^.]*)\.k:([^.]*)$/.exec(valor ?? '');
  if (!m) return null;
  const flyer = m[1] && FLYER.test(m[1]) ? m[1] : null;
  const codigo = m[2] && CODIGO.test(m[2]) ? m[2] : null;
  return flyer || codigo ? { flyer, codigo } : null;
}

export type Concessao = { tipo: 'pro' | 'catalogo'; validaAte: string } | null;

/**
 * O que se concede a uma entidade nova, até à data da campanha: às empresas de pintura vindas de um flyer de pintores
 * (`fl-pin-*`), o Plano Pro; aos fornecedores vindos de um flyer de fornecedores (`fl-for-*`), a presença no catálogo sem
 * subscrição. O flyer de um email do CRM é o mesmo: o link do email leva ao destino do flyer, com `c=` e `k=`.
 * Administradoras: nada a conceder (o relatório já é gratuito); a adesão só se regista.
 */
export function concessaoPara(kind: string, origem: Origem | null, hoje: string): Concessao {
  if (hoje > CAMPANHA_DE_LANCAMENTO.ate) return null;
  if (kind === 'pintor' && origem?.flyer?.startsWith('fl-pin-')) return { tipo: 'pro', validaAte: CAMPANHA_DE_LANCAMENTO.ate };
  if (kind === 'fornecedor' && origem?.flyer?.startsWith('fl-for-')) return { tipo: 'catalogo', validaAte: CAMPANHA_DE_LANCAMENTO.ate };
  return null;
}
