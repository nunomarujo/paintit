import type { Pendencia } from './types';

/**
 * O que falta para o levantamento estar pronto a entregar ao pintor (pedido do promotor,
 * 24/10/2026). Vale mais aqui do que no orçamento: o avaliador está **no local**, e saber o que
 * falta enquanto lá está poupa-lhe uma segunda ida.
 *
 * Função pura: recebe o que já foi registado e devolve o que falta, com a âncora do sítio onde se
 * resolve. Não decide nada sobre prazos nem sobre dinheiro.
 */
export interface SurveyPending extends Pendencia {
  /** Elemento a que a barra salta. */
  ancora: string;
}

export function surveyPendings(p: {
  /** Superfícies registadas: nome e área em centésimos de m² (0 = por medir). */
  superficies: { id: string; label: string; areaCm2: number }[];
  /** Quantas fotografias já foram carregadas. */
  fotografias: number;
  /** Há um pedido de esclarecimento à espera de resposta? */
  esclarecimentoPorResponder?: boolean;
  /** O cliente pediu trabalhos em zonas que ainda não têm superfície registada. */
  semSuperficies?: boolean;
}): SurveyPending[] {
  const out: SurveyPending[] = [];

  if (p.esclarecimentoPorResponder) {
    out.push({
      id: 'esclarecimento',
      texto: 'Há um pedido de esclarecimento à espera de resposta, com prazo a correr.',
      ancora: 'esclarecimentos',
    });
  }

  if (p.semSuperficies || p.superficies.length === 0) {
    out.push({ id: 'sem-superficies', texto: 'Ainda não há nenhuma superfície registada.', ancora: 'superficies' });
  }

  for (const s of p.superficies) {
    if (s.areaCm2 <= 0) {
      out.push({ id: `area:${s.id}`, texto: `${s.label}: falta a área.`, ancora: 'superficies' });
    }
  }

  if (p.fotografias === 0) {
    out.push({ id: 'sem-fotos', texto: 'Ainda não há fotografias: o pintor orçamenta às cegas.', ancora: 'fotografias' });
  }

  return out;
}

/** O levantamento só se conclui sem nada em falta. */
export function podeConcluir(pendings: SurveyPending[]): boolean {
  return pendings.length === 0;
}
