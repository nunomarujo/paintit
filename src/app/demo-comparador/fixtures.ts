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
    L({ categoria: 'pintura', descricao: 'Impermeabilização da platibanda (fachada poente)', quantidade: 2000, unidade: 'm2', precoUnitario: 1800, produto: 'Sika Membrane', inclusao: 'incluido', trabalho: 'impermeabilizacao', zonas: ['poente'], superficie: 'beirais_cobertura' }),
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

export const PROPOSTA_C: typeof PROPOSTA_A = {
  lines: [
    L({ categoria: 'preparacao', descricao: 'Lavagem e limpeza', quantidade: 24000, unidade: 'm2', precoUnitario: 0, inclusao: 'incluido', trabalho: 'lavagem' }),
    L({ categoria: 'reparacao', descricao: 'Reparação de fissuras: só se orçamenta depois de observar a extensão real.', quantidade: 4000, unidade: 'ml', precoUnitario: 0, inclusao: 'condicionado', trabalho: 'fissuras' }),
    L({ categoria: 'preparacao', descricao: 'Primário', quantidade: 24000, unidade: 'm2', precoUnitario: 0, produto: 'Sherwin-Williams ProClassic', demaos: 1, inclusao: 'incluido', trabalho: 'primario' }),
    L({ categoria: 'pintura', descricao: 'Pintura final, acabamento mate', quantidade: 24000, unidade: 'm2', precoUnitario: 0, produto: 'CIN Vinylmatt', demaos: 2, inclusao: 'incluido', trabalho: 'pintura_final' }),
    L({ categoria: 'pintura', descricao: 'Impermeabilização da platibanda: zona de acesso condicionado; proposta em separado se necessário.', quantidade: 2000, unidade: 'm2', precoUnitario: 0, inclusao: 'nao_incluido', trabalho: 'impermeabilizacao', zonas: ['poente'], superficie: 'beirais_cobertura' }),
    L({ categoria: 'acessos', descricao: 'Andaimes', quantidade: 100, unidade: 'vg', precoUnitario: 0, inclusao: 'incluido', trabalho: 'acessos', superficie: null }),
    L({ categoria: 'licencas', descricao: 'Ocupação da via pública', quantidade: 100, unidade: 'vg', precoUnitario: 0, inclusao: 'incluido', trabalho: 'licencas', superficie: null }),
    L({ categoria: 'outro', descricao: 'Preço global da empreitada', quantidade: 100, unidade: 'vg', precoUnitario: 540000, inclusao: 'incluido', trabalho: 'global', superficie: null }),
  ],
  terms: { ivaBps: 2300, duracaoDias: 20, inicioPossivel: null, adiantamentoBps: 1000, garantiaAnos: 3, modoPreco: 'global' },
  seguroRc: null,
  seguroAt: 'sim',
  verificado: true,
  avaliacao: { media: 4.0, n: 2 },
};

export const PROPOSTAS = [
  { id: 'a', ...PROPOSTA_A },
  { id: 'b', ...PROPOSTA_B },
  { id: 'c', ...PROPOSTA_C },
];

export type CategoriaTotais = Record<LineCategory, number | null>;
