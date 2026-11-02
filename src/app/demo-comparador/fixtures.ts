// Dados fictícios para a geração em build-time dos 6 estados do comparador usados na landing
// (ComparadorDemo.tsx, scripts/gerar-demo-comparador.mjs). Esta rota não é navegação de produto —
// existe só para o script de build extrair o HTML já pré-renderizado de cada página e publicá-lo
// em public/demo-comparador/. Mesma obra fictícia e mesmos valores do harness isolado já validado
// (fora do repositório), passados pelas funções reais de src/domain/.
import type { ProposalLine, ProposalTerms, LineCategory } from '@/domain/proposal';
import type { DesiredWork } from '@/domain/request';

export const PEDIDO: DesiredWork[] = ['lavagem', 'reparacao_fissuras', 'primario', 'pintura', 'impermeabilizacao'];

export const ZONAS = [
  { id: 'norte', kind: 'fachada' as const, label: 'Fachada Norte (90,00 m²)' },
  { id: 'sul', kind: 'fachada' as const, label: 'Fachada Sul (90,00 m²)' },
  { id: 'poente', kind: 'fachada' as const, label: 'Fachada Poente (60,00 m²)' },
];
export const AREA_TOTAL_CM2 = 24000; // 240,00 m² (centésimos de m², como em src/domain/request.ts)
const TODAS = ZONAS.map((z) => z.id);

const L = (
  p: Partial<ProposalLine> & Pick<ProposalLine, 'categoria' | 'descricao' | 'quantidade' | 'unidade' | 'precoUnitario' | 'inclusao'>,
): ProposalLine => ({
  superficie: 'fachada',
  demaos: null,
  produto: null,
  trabalho: null,
  zonas: TODAS,
  motivoDiferenca: null,
  ...p,
});

export const PROPOSTA_A: {
  lines: ProposalLine[];
  terms: Pick<ProposalTerms, 'ivaBps' | 'duracaoDias' | 'inicioPossivel' | 'adiantamentoBps' | 'garantiaAnos' | 'modoPreco'>;
  seguroRc: string | null;
  seguroAt: string | null;
  verificado: boolean;
  avaliacao: { media: number; n: number } | null;
} = {
  lines: [
    L({ categoria: 'preparacao', descricao: 'Lavagem e limpeza · lavagem a alta pressão', quantidade: 24000, unidade: 'm2', precoUnitario: 300, inclusao: 'incluido', trabalho: 'lavagem' }),
    L({ categoria: 'reparacao', descricao: 'Reparação de fissuras · tratamento com massa elastómera e rede', quantidade: 4000, unidade: 'ml', precoUnitario: 800, inclusao: 'incluido', trabalho: 'fissuras' }),
    L({ categoria: 'preparacao', descricao: 'Primário fixador', quantidade: 24000, unidade: 'm2', precoUnitario: 250, produto: 'CIN Primário Fixador', demaos: 1, inclusao: 'incluido', trabalho: 'primario' }),
    L({ categoria: 'pintura', descricao: 'Pintura final, acabamento mate', quantidade: 24000, unidade: 'm2', precoUnitario: 900, produto: 'CIN Vinylmatt', demaos: 2, inclusao: 'incluido', trabalho: 'pintura_final' }),
    L({ categoria: 'pintura', descricao: 'Impermeabilização da platibanda (fachada poente)', quantidade: 2000, unidade: 'm2', precoUnitario: 1800, produto: 'Sika Membrane', demaos: 2, inclusao: 'incluido', trabalho: 'impermeabilizacao', zonas: ['poente'], superficie: 'beirais_cobertura' }),
    L({ categoria: 'acessos', descricao: 'Andaimes, 15 dias', quantidade: 100, unidade: 'vg', precoUnitario: 90000, inclusao: 'incluido', trabalho: 'acessos', superficie: null }),
    L({ categoria: 'licencas', descricao: 'Ocupação da via pública', quantidade: 100, unidade: 'vg', precoUnitario: 15000, inclusao: 'incluido', trabalho: 'licencas', superficie: null }),
  ],
  terms: { ivaBps: 2300, duracaoDias: 15, inicioPossivel: '2026-11-10', adiantamentoBps: 2000, garantiaAnos: 5, modoPreco: 'detalhado' },
  seguroRc: 'sim',
  seguroAt: 'sim',
  verificado: true,
  avaliacao: { media: 4.6, n: 12 },
};

export const PROPOSTA_B: typeof PROPOSTA_A = {
  lines: [
    L({ categoria: 'preparacao', descricao: 'Lavagem e limpeza · lavagem com tratamento antifungos e algas', quantidade: 24000, unidade: 'm2', precoUnitario: 250, inclusao: 'incluido', trabalho: 'lavagem' }),
    L({ categoria: 'reparacao', descricao: 'Reparação de fissuras: após vistoria, consideradas estéticas e sem risco estrutural; não incluída no preço.', quantidade: 4000, unidade: 'ml', precoUnitario: 0, inclusao: 'nao_incluido', trabalho: 'fissuras' }),
    L({ categoria: 'preparacao', descricao: 'Primário universal', quantidade: 24000, unidade: 'm2', precoUnitario: 240, produto: 'Robbialac Primário Universal', demaos: 1, inclusao: 'incluido', trabalho: 'primario' }),
    L({ categoria: 'pintura', descricao: 'Pintura final, acabamento mate, varandas incluídas na área', quantidade: 31000, unidade: 'm2', precoUnitario: 870, produto: 'CIN Vinylmatt', demaos: 2, inclusao: 'incluido', trabalho: 'pintura_final' }),
    L({ categoria: 'acessos', descricao: 'Andaimes, 10 dias', quantidade: 100, unidade: 'vg', precoUnitario: 65000, inclusao: 'incluido', trabalho: 'acessos', superficie: null }),
  ],
  terms: { ivaBps: 2300, duracaoDias: 12, inicioPossivel: '2026-11-05', adiantamentoBps: 3000, garantiaAnos: 2, modoPreco: 'detalhado' },
  seguroRc: 'sim',
  seguroAt: 'nao',
  verificado: false,
  avaliacao: null,
};

/**
 * O cenário da demonstração (promotor, 02/11/2026): três propostas com papéis claros.
 *  - **Pintor B, a mais barata**, mas não faz tudo: exclui as fissuras e não fala da impermeabilização.
 *  - **Pintor A, a intermédia**, cobre o pedido inteiro com preço firme e sem trabalhos a mais.
 *  - **Pintor C, a mais completa**, cobre o pedido e acrescenta dois trabalhos que não foram pedidos
 *    (guardas metálicas e tectos das varandas), por um total cuja diferença para A excede o valor
 *    desses trabalhos — é isso que faz de A a Escolha Quem Pinta, com a justificação escrita.
 */
export const PROPOSTA_C: typeof PROPOSTA_A = {
  lines: [
    L({ categoria: 'preparacao', descricao: 'Lavagem e limpeza · lavagem a alta pressão com biocida', quantidade: 24000, unidade: 'm2', precoUnitario: 350, inclusao: 'incluido', trabalho: 'lavagem' }),
    L({ categoria: 'reparacao', descricao: 'Reparação de fissuras · abertura, massa elastómera e rede', quantidade: 4000, unidade: 'ml', precoUnitario: 900, inclusao: 'incluido', trabalho: 'fissuras' }),
    L({ categoria: 'preparacao', descricao: 'Primário fixador', quantidade: 24000, unidade: 'm2', precoUnitario: 300, produto: 'CIN Primário Fixador', demaos: 1, inclusao: 'incluido', trabalho: 'primario' }),
    L({ categoria: 'pintura', descricao: 'Pintura final, acabamento mate', quantidade: 24000, unidade: 'm2', precoUnitario: 1000, produto: 'CIN Vinylmatt', demaos: 2, inclusao: 'incluido', trabalho: 'pintura_final' }),
    L({ categoria: 'pintura', descricao: 'Impermeabilização da platibanda (fachada poente)', quantidade: 2000, unidade: 'm2', precoUnitario: 2000, produto: 'Sika Membrane', demaos: 2, inclusao: 'incluido', trabalho: 'impermeabilizacao', zonas: ['poente'], superficie: 'beirais_cobertura' }),
    L({ categoria: 'reparacao', descricao: 'Tratamento anticorrosivo e pintura das guardas metálicas das varandas', quantidade: 6000, unidade: 'ml', precoUnitario: 2200, produto: 'CIN C-Thane S258', demaos: 2, inclusao: 'incluido', trabalho: 'metais_madeiras', superficie: 'elementos_metalicos' }),
    L({ categoria: 'pintura', descricao: 'Pintura dos tectos das varandas', quantidade: 3600, unidade: 'm2', precoUnitario: 1200, produto: 'CIN Vinylmatt', demaos: 2, inclusao: 'incluido', trabalho: null, superficie: 'varandas' }),
    L({ categoria: 'acessos', descricao: 'Andaimes, 18 dias', quantidade: 100, unidade: 'vg', precoUnitario: 100000, inclusao: 'incluido', trabalho: 'acessos', superficie: null }),
    L({ categoria: 'licencas', descricao: 'Ocupação da via pública', quantidade: 100, unidade: 'vg', precoUnitario: 15000, inclusao: 'incluido', trabalho: 'licencas', superficie: null }),
  ],
  terms: { ivaBps: 2300, duracaoDias: 18, inicioPossivel: '2026-11-17', adiantamentoBps: 2000, garantiaAnos: 5, modoPreco: 'detalhado' },
  seguroRc: 'sim',
  seguroAt: 'sim',
  verificado: true,
  avaliacao: { media: 4.8, n: 9 },
};

export const PROPOSTAS = [
  { id: 'a', ...PROPOSTA_A },
  { id: 'b', ...PROPOSTA_B },
  { id: 'c', ...PROPOSTA_C },
];

export type CategoriaTotais = Record<LineCategory, number | null>;
