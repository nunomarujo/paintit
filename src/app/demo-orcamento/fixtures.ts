// Dados fictícios para a captura de ecrã do orçamento guiado (WorksEditor) usada no popup "Para
// quem → empresas de pintura". Mesma obra fictícia (fachadas Norte/Sul/Poente) já usada em
// src/app/demo-comparador/fixtures.ts, para não inventar um segundo cenário sem necessidade.
import type { CatalogueProduct, WorkItem, Zone } from '@/domain/works';

export const ZONES: Zone[] = [
  { id: 'norte', label: 'Fachada Norte (90,00 m²)', area: 9000 },
  { id: 'sul', label: 'Fachada Sul (90,00 m²)', area: 9000 },
  { id: 'poente', label: 'Fachada Poente (60,00 m²)', area: 6000 },
];

export const CATALOGUE: CatalogueProduct[] = [
  {
    id: 'ref-primario-fixador',
    marca: 'CIN',
    nome: 'Primário Fixador',
    tipo: 'primario',
    uso: 'ambos',
    descricao: 'Primário fixador para paredes exteriores e interiores.',
    acabamento: null,
    rendimento_m2_l: 10,
    preco_referencia_cents: 1890,
    preco_embalagem_l: 5,
  },
  {
    id: 'ref-vinylmatt',
    marca: 'CIN',
    nome: 'Vinylmatt',
    tipo: 'tinta_exterior',
    uso: 'exterior',
    descricao: 'Tinta plástica mate para fachadas.',
    acabamento: 'Mate',
    rendimento_m2_l: 8,
    preco_referencia_cents: 2450,
    preco_embalagem_l: 5,
  },
  {
    id: 'ref-robbialac-universal',
    marca: 'Robbialac',
    nome: 'Primário Universal',
    tipo: 'primario',
    uso: 'ambos',
    descricao: 'Primário universal de aderência.',
    acabamento: null,
    rendimento_m2_l: 9,
    preco_referencia_cents: 1750,
    preco_embalagem_l: 5,
  },
  {
    id: 'ref-sika-membrane',
    marca: 'Sika',
    nome: 'Membrane',
    tipo: 'impermeabilizante',
    uso: 'exterior',
    descricao: 'Membrana líquida impermeabilizante para beirais e platibandas.',
    acabamento: null,
    rendimento_m2_l: 2,
    preco_referencia_cents: 3900,
    preco_embalagem_l: 5,
  },
];

// Três trabalhos: dois completos (primário, pintura final — a "Pintura final" fica como item
// corrente, com a caixa de sugestões do catálogo por abrir) e um por preencher (lavagem, sem o
// campo "Como vai limpar?"), para a captura mostrar também o estado "Por preencher" da navegação
// de trabalhos — o mesmo sinal visual que o pintor vê a sério.
export const INITIAL_ITEMS: WorkItem[] = [
  {
    key: 'lavagem',
    code: 'lavagem',
    estado: 'base',
    zonas: 'todas',
    campos: {},
    quantidade: '240',
    notas: '',
  },
  {
    key: 'primario',
    code: 'primario',
    estado: 'base',
    zonas: 'todas',
    campos: { produto: 'CIN Primário Fixador', demaos: '1' },
    quantidade: '240',
    notas: '',
  },
  {
    key: 'pintura_final',
    code: 'pintura_final',
    estado: 'base',
    zonas: 'todas',
    campos: { produto: 'CIN Vinylmatt', cor: 'Branco gelo, NCS S 0502-Y', acabamento: 'Mate', demaos: '2' },
    quantidade: '240',
    notas: '',
  },
];
