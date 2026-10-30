import {
  ORIGEM_ANTIGA_PARA_NOVA,
  type AreaSource,
  type Confirmacao,
  type OrigemDaQuantidade,
  type Participacao,
  type ZonaDoPedido,
} from '@/domain/request';

/**
 * Uma linha de `request_surfaces` lida como zona, nas três dimensões.
 *
 * **Porquê tolerante.** As três colunas entraram a 30/10/2026 e os tipos gerados da base podem
 * andar atrás da migração. Em vez de partir o ecrã inteiro enquanto isso não se acerta, uma zona
 * sem as colunas novas lê-se pelo que se sabia antes: conta como incluída — era o que acontecia
 * quando a participação não existia —, e a origem antiga traduz-se para a nova.
 *
 * Isto não é condescendência com dados maus: é a diferença entre *não haver resposta* e *a resposta
 * ser «não». Uma zona antiga não foi excluída por ninguém, e tratá-la como excluída tirava-a do
 * total sem que ninguém o tivesse decidido.
 */
export interface LinhaDeSuperficie {
  area_cm2: number;
  participacao?: string | null;
  origem_quantidade?: string | null;
  confirmacao?: string | null;
  origem?: string | null;
}

const umDe = <T extends string>(valores: readonly T[], v: unknown, omissao: T): T =>
  typeof v === 'string' && (valores as readonly string[]).includes(v) ? (v as T) : omissao;

export function paraZona(s: LinhaDeSuperficie): ZonaDoPedido {
  const participacao = umDe(['incluida', 'por_decidir', 'excluida'] as const, s.participacao, 'incluida' as Participacao);
  const origemNova = umDe(['medicao', 'estimativa', 'documento'] as const, s.origem_quantidade, '' as OrigemDaQuantidade);
  const antiga = umDe(['estimativa', 'medicao_cliente', 'planta'] as const, s.origem, 'estimativa' as AreaSource);
  return {
    areaCm2: s.area_cm2 ?? 0,
    participacao,
    origemDaQuantidade: origemNova || ORIGEM_ANTIGA_PARA_NOVA[antiga],
    // Sem resposta, uma quantidade está por confirmar. Dá-la por confirmada seria afirmar que
    // alguém a foi ver ao local — exactamente o que não se sabe.
    confirmacao: umDe(['por_confirmar', 'confirmada'] as const, s.confirmacao, 'por_confirmar' as Confirmacao),
  };
}
