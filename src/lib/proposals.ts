import { parseFases, type Declared, type ProposalLine, type ProposalTerms } from '@/domain/proposal';
import type { Database } from '@/lib/database.types';

// --- Conversões linha da base de dados → domínio ----------------------------------

type Tables = Database['public']['Tables'];
type Row<T extends keyof Tables> = Tables[T]['Row'];

export function toLine(l: Row<'proposal_lines'>): ProposalLine {
  return {
    categoria: l.categoria,
    descricao: l.descricao,
    superficie: l.superficie,
    quantidade: l.quantidade,
    unidade: l.unidade,
    precoUnitario: l.preco_unitario_cents,
    demaos: l.demaos,
    produto: l.produto,
    inclusao: l.inclusao,
    productId: l.product_id,
    zonas: l.surface_ids,
    motivoDiferenca: l.motivo_diferenca,
  };
}

export function toTerms(p: Row<'proposals'>): ProposalTerms {
  return {
    ivaBps: p.iva_bps,
    validade: p.validade,
    inicioPossivel: p.inicio_possivel,
    duracaoDias: p.duracao_dias,
    adiantamentoBps: p.adiantamento_bps,
    precoAjusteM2: p.preco_ajuste_m2_cents,
    garantiaAnos: p.garantia_anos,
    exclusoes: p.exclusoes,
    notas: p.notas,
    fases: parseFases(p.fases),
    confirmaMaoObra: p.confirma_mao_obra,
    seguroRc: p.seguro_rc as Declared | null,
    seguroAt: p.seguro_at as Declared | null,
  };
}
