import { describe, expect, it } from 'vitest';
import { contarPorFicheiro, geometriaAMao } from './alvosDeToque';

/**
 * Inventário do que ainda falta corrigir (01/11/2026), para a dívida só poder descer.
 *
 * O percurso do fornecedor — Vendas e Avaliações — está limpo: nenhum ficheiro dele aparece aqui. O que
 * resta é do percurso do pintor, do cliente e do backoffice, e fica para quando se mexer neles.
 *
 * Se este teste falhar por a contagem **descer**, é boa notícia: baixe o número, ou apague a linha.
 */
const DIVIDA: Record<string, number> = {
  'app/app/backoffice/PromoForms.tsx': 3,
  'app/app/backoffice/ReportForms.tsx': 2,
  'app/app/backoffice/entidades/ReviewForm.tsx': 2,
  'app/app/backoffice/moderacao/avisos/page.tsx': 1,
  'app/app/backoffice/pedidos/PhotoReviewForm.tsx': 2,
  'app/app/catalogo/page.tsx': 1,
  'app/app/catalogo/referencia/[id]/page.tsx': 1,
  'app/app/contratacoes/[id]/PayButton.tsx': 1,
  'app/app/obras/Hoje.tsx': 3,
  'app/app/obras/page.tsx': 1,
  'app/app/oportunidades/[id]/orcamento/CapotoEditor.tsx': 1,
  'app/app/oportunidades/[id]/page.tsx': 2,
  'app/app/oportunidades/page.tsx': 1,
  'app/app/organizacoes/[id]/DeleteOrg.tsx': 1,
  'app/app/organizacoes/[id]/predios/[predioId]/editar/Needs.tsx': 1,
  'app/app/page.tsx': 2,
  'app/app/pedidos/[id]/page.tsx': 1,
  'app/app/pedidos/[id]/propostas/page.tsx': 1,
  'app/app/subscricao/PlanForms.tsx': 1,
  'app/page.tsx': 1,
  'components/MessageThread.tsx': 1,
};

describe('alvos de toque: a geometria vem do sistema (regra 17)', () => {
  it('reconhece um botão feito à mão e deixa passar o do sistema', () => {
    expect(geometriaAMao('<button className="rounded-lg px-3 py-1.5">x</button>')).toHaveLength(1);
    expect(geometriaAMao('<button className="btn-primary">x</button>')).toHaveLength(0);
    expect(geometriaAMao('<Link className="inline-flex min-h-[44px] rounded-lg px-3 py-2">x</Link>')).toHaveLength(0);
    // Uma pílula não é um botão: a forma é redonda de propósito e não leva 44px.
    expect(geometriaAMao('<a className="rounded-full px-2 py-0.5">3</a>')).toHaveLength(0);
  });

  it('nenhum ficheiro novo entra na dívida, e nenhum sobe', () => {
    const atual = contarPorFicheiro('src');
    const novos = Object.keys(atual).filter((f) => !(f in DIVIDA));
    expect(novos, 'ficheiros novos com geometria à mão — usar btn-primary/secondary/quiet ou campo').toEqual([]);
    for (const [f, n] of Object.entries(atual)) {
      expect(n, `${f} subiu de ${DIVIDA[f]} para ${n}`).toBeLessThanOrEqual(DIVIDA[f]!);
    }
  });

  it('o percurso do fornecedor está limpo', () => {
    const atual = contarPorFicheiro('src');
    const doFornecedor = Object.keys(atual).filter(
      (f) =>
        f.includes('app/app/avaliacoes/') ||
        f.includes('app/app/vendas/') ||
        f.includes('app/app/encomendas/') ||
        f.includes('app/app/levantamentos/') ||
        f.includes('app/app/organizacoes/[id]/produtos/') ||
        f.includes('app/app/organizacoes/[id]/clientes/') ||
        f.includes('components/avaliacoes/') ||
        f.includes('components/vendas/'),
    );
    expect(doFornecedor).toEqual([]);
  });
});
