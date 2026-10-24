import { resumoCapoto, type CapotoSpec } from './etics';
import { LINE_CATEGORIES, LINE_CATEGORY_LABELS, type ProposalLine, type ProposalTerms } from './proposal';

// Funções de apoio ao documento de orçamento (PROPOSTA.md, "Rever e enviar"): o ficheiro que o
// pintor entrega ao cliente e que o cliente usa para comparar propostas. Só compõem frases a
// partir de campos que a proposta já tem — nunca inventam anos de experiência, certificações ou
// qualquer outro facto que o pintor não tenha indicado (pedido do promotor, 24/10/2026).

/**
 * Parágrafo curto de apresentação, gerado a partir do conteúdo da proposta. Usa capoto, mão-de-obra,
 * duração e garantia quando preenchidos; nunca inventa o que falta — simplesmente não o menciona.
 */
export function proposalIntro(terms: ProposalTerms, lines: ProposalLine[], capoto: CapotoSpec | null): string {
  const included = lines.filter((l) => l.inclusao === 'incluido');
  const categorias = LINE_CATEGORIES.filter((c) => included.some((l) => l.categoria === c)).map(
    (c) => (LINE_CATEGORY_LABELS[c].split(' (')[0] ?? LINE_CATEGORY_LABELS[c]).toLowerCase(),
  );

  const partes: string[] = [];
  partes.push(capoto ? `${resumoCapoto(capoto)}.` : categorias.length > 0 ? `Proposta de ${categorias.join(', ')}.` : 'Proposta de pintura.');
  if (terms.confirmaMaoObra) partes.push('Inclui mão-de-obra qualificada na execução proposta.');
  if (terms.duracaoDias) {
    const dia = terms.duracaoDias === 1 ? 'dia útil' : 'dias úteis';
    partes.push(`Duração estimada de ${terms.duracaoDias} ${dia}.`);
  }
  if (terms.garantiaAnos) partes.push(`Garantia adicional de ${terms.garantiaAnos} ano${terms.garantiaAnos === 1 ? '' : 's'}, além da legal.`);

  return partes.join(' ');
}

/** Resumo de uma zona para a grelha de âmbito do documento: nome a mostrar e área formatada. */
export interface DocumentZone {
  id: string;
  label: string;
  areaCm2: number;
}

/** Linhas incluídas que se aplicam a uma zona (ou à obra toda, quando a linha não tem zonas). */
export function linesForZone(lines: (ProposalLine & { id: string })[], zoneId: string): (ProposalLine & { id: string })[] {
  return lines.filter((l) => l.inclusao === 'incluido' && (!l.zonas || l.zonas.length === 0 || l.zonas.includes(zoneId)));
}
