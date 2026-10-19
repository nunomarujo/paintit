import type { FieldErrors } from './organization';

// Pedido de orçamento: a obra descrita pelo cliente sobre um prédio, com as
// superfícies a pintar e as respetivas áreas. Antes da apresentação, os
// pintores só veem o anúncio anónimo: concelho, características gerais,
// superfícies, áreas, trabalhos e prazos. Nunca a morada nem a identidade.

export const WORK_TYPES = ['fachadas', 'zonas_comuns', 'muros', 'moradia', 'interior'] as const;
export type WorkType = (typeof WORK_TYPES)[number];
export const WORK_TYPE_LABELS: Record<WorkType, string> = {
  fachadas: 'Fachadas e varandas',
  zonas_comuns: 'Zonas comuns interiores',
  muros: 'Muros e vedações',
  moradia: 'Moradia (exterior)',
  interior: 'Interior de habitação',
};

export const SURFACE_KINDS = [
  'fachada',
  'empena',
  'varandas',
  'muro',
  'escadas_atrio',
  'beirais_cobertura',
  'elementos_metalicos',
  'paredes_interiores',
  'tetos',
  'outro',
] as const;
export type SurfaceKind = (typeof SURFACE_KINDS)[number];
export const SURFACE_KIND_LABELS: Record<SurfaceKind, string> = {
  fachada: 'Fachada',
  empena: 'Empena',
  varandas: 'Varandas (tetos e guardas)',
  muro: 'Muro',
  escadas_atrio: 'Escadas e átrio',
  beirais_cobertura: 'Beirais e cobertura',
  elementos_metalicos: 'Elementos metálicos (grades, portões)',
  paredes_interiores: 'Paredes interiores',
  tetos: 'Tetos',
  outro: 'Outra superfície',
};

export const AREA_SOURCES = ['estimativa', 'medicao_cliente', 'planta'] as const;
export type AreaSource = (typeof AREA_SOURCES)[number];
export const AREA_SOURCE_LABELS: Record<AreaSource, string> = {
  estimativa: 'Estimativa',
  medicao_cliente: 'Medição do cliente',
  planta: 'Planta ou projeto',
};

export const DESIRED_WORKS = [
  'lavagem',
  'reparacao_fissuras',
  'tratamento_humidade',
  'primario',
  'pintura',
  'impermeabilizacao',
  'tratamento_metais',
] as const;
export type DesiredWork = (typeof DESIRED_WORKS)[number];
export const DESIRED_WORK_LABELS: Record<DesiredWork, string> = {
  lavagem: 'Lavagem',
  reparacao_fissuras: 'Reparação de fissuras',
  tratamento_humidade: 'Tratamento de humidade',
  primario: 'Primário',
  pintura: 'Pintura',
  impermeabilizacao: 'Impermeabilização',
  tratamento_metais: 'Tratamento de metais',
};

// Áreas em centésimos de m² (inteiros), para não acumular erros de arredondamento.
export type AreaCm2 = number;

export interface SurfaceInput {
  kind: SurfaceKind;
  descricao: string | null;
  /** Área indicada diretamente, em centésimos de m². */
  areaDireta: AreaCm2 | null;
  /** Ou dimensões: largura × altura − vãos, em centésimos de m (cm). */
  larguraCm: number | null;
  alturaCm: number | null;
  vaosCm2: AreaCm2 | null;
  quantidade: number;
  origem: AreaSource;
}

/** Área de uma superfície, em centésimos de m². A área direta prevalece. */
export function surfaceArea(s: SurfaceInput): AreaCm2 {
  if (s.areaDireta !== null) return s.areaDireta * s.quantidade;
  if (s.larguraCm === null || s.alturaCm === null) return 0;
  // cm × cm = cm²; 1 centésimo de m² = 100 cm².
  const gross = Math.round((s.larguraCm * s.alturaCm) / 100);
  return Math.max(0, gross - (s.vaosCm2 ?? 0)) * s.quantidade;
}

export function formatArea(area: AreaCm2): string {
  return `${(area / 100).toLocaleString('pt-PT', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} m²`;
}

/** Lê "12,5" ou "12.5" em metros (ou m²) e devolve centésimos; null se vazio; NaN se inválido. */
export function parseHundredths(input: FormDataEntryValue | null): number | null {
  const s = typeof input === 'string' ? input.trim().replace(',', '.') : '';
  if (s === '') return null;
  if (!/^\d+(\.\d{1,2})?$/.test(s)) return Number.NaN;
  return Math.round(Number(s) * 100);
}

export function parseSurface(form: FormData): { value?: SurfaceInput; errors: FieldErrors } {
  const errors: FieldErrors = {};
  const kind = String(form.get('kind') ?? '');
  if (!(SURFACE_KINDS as readonly string[]).includes(kind)) errors.kind = 'Escolha o tipo de superfície.';
  const origem = String(form.get('origem') ?? 'estimativa');
  if (!(AREA_SOURCES as readonly string[]).includes(origem)) errors.origem = 'Origem inválida.';

  const areaDireta = parseHundredths(form.get('area'));
  const largura = parseHundredths(form.get('largura'));
  const altura = parseHundredths(form.get('altura'));
  const vaos = parseHundredths(form.get('vaos'));
  for (const [field, v] of [['area', areaDireta], ['largura', largura], ['altura', altura], ['vaos', vaos]] as const) {
    if (Number.isNaN(v)) errors[field] = 'Número com até 2 casas decimais.';
  }
  const qty = String(form.get('quantidade') ?? '1').trim() || '1';
  const quantidade = /^\d+$/.test(qty) ? Number(qty) : Number.NaN;
  if (!Number.isInteger(quantidade) || quantidade < 1 || quantidade > 500) errors.quantidade = 'Entre 1 e 500.';

  if (Object.keys(errors).length === 0 && areaDireta === null && (largura === null || altura === null)) {
    errors.area = 'Indique a área, ou a largura e a altura.';
  }
  if (Object.keys(errors).length > 0) return { errors };

  const value: SurfaceInput = {
    kind: kind as SurfaceKind,
    descricao: String(form.get('descricao') ?? '').trim() || null,
    areaDireta,
    larguraCm: largura,
    alturaCm: altura,
    vaosCm2: vaos,
    quantidade,
    origem: origem as AreaSource,
  };
  if (surfaceArea(value) <= 0) return { errors: { area: 'A área resultante tem de ser maior do que zero.' } };
  return { value, errors };
}

// --- Anonimato do texto publicado ---------------------------------------------

const CONTACT_PATTERNS: [RegExp, string][] = [
  [/[^\s@]+@[^\s@]+\.[a-z]{2,}/i, 'um email'],
  // Emails disfarçados: "nome@gmail ponto com", "nome arroba gmail", "gmail.com".
  [/\S+\s*(@|\barroba\b)\s*\S+|\b(gmail|hotmail|outlook|sapo|yahoo|icloud|live)\b|\bponto\s+(com|pt)\b/i, 'um email'],
  [/\b(whats\s?app|telegram|signal|messenger|instagram|facebook|linkedin)\b/i, 'um contacto fora da plataforma'],
  [/\b(contact\w*|ligu\w*|liga[rm]?|fal(e|ar)|venha|vir)\b.{0,40}\b(diretamente|direto|por fora|fora da (plataforma|aplicação|app))\b|\b(evitar|sem|fugir|poupar)\b.{0,20}\b(comiss\w*|plataforma|aplicação|app)\b/i, 'um pedido de contacto fora da plataforma'],
  [/(https?:\/\/|www\.)\S+/i, 'um endereço web'],
  [/(\+?351[\s.-]?)?\b[29]\d{2}[\s.-]?\d{3}[\s.-]?\d{3}\b/, 'um número de telefone'],
  [/\b\d{4}-\d{3}\b/, 'um código postal'],
  [/\b(rua|r\.|avenida|av\.|travessa|tv\.|largo|praça|pç\.|estrada|beco|calçada|alameda)\s+\S+/i, 'uma morada'],
  [/\b(lote|n\.?º|número|nº|prédio|predio|edifício|edificio|porta|andar)\s*\d+/i, 'um número de porta ou lote'],
  [/\bNIF\b|\b\d{9}\b/i, 'um NIF'],
];

/** Motivos pelos quais um texto pode revelar quem é ou onde fica. Vazio = pode ser publicado. */
export function revealingContent(text: string): string[] {
  // Cada achado é retirado antes do padrão seguinte: um telemóvel não conta também como NIF.
  const found: string[] = [];
  let rest = text;
  for (const [re, reason] of CONTACT_PATTERNS) {
    if (!re.test(rest)) continue;
    found.push(reason);
    rest = rest.replace(new RegExp(re.source, re.flags + 'g'), ' ');
  }
  return found;
}

// --- Publicação ------------------------------------------------------------------

export interface PublishCheckInput {
  descricao: string;
  /** Outros textos que chegam aos pintores (descrições das superfícies, cor). */
  otherTexts?: string[];
  prazoPropostas: string | null; // AAAA-MM-DD
  surfacesArea: AreaCm2[];
  today: string; // AAAA-MM-DD, no fuso de Lisboa
}

export const MIN_PROPOSAL_DAYS = 7;

/** O que impede a publicação. Vazio = pode ser publicado. */
export function publishBlockers(input: PublishCheckInput): string[] {
  const out: string[] = [];
  if (input.surfacesArea.length === 0 || input.surfacesArea.every((a) => a <= 0)) {
    out.push('Indique pelo menos uma superfície com área.');
  }
  if (input.descricao.trim().length < 30) out.push('Descreva a obra em pelo menos 30 caracteres.');
  const revealing = [...new Set([input.descricao, ...(input.otherTexts ?? [])].flatMap(revealingContent))];
  if (revealing.length > 0) {
    out.push(
      `O texto do anúncio parece conter ${revealing.join(', ')}. Retire-o: a identificação só é revelada depois da escolha.`,
    );
  }
  if (!input.prazoPropostas) out.push('Indique até quando aceita propostas.');
  else {
    const min = new Date(`${input.today}T00:00:00Z`);
    min.setUTCDate(min.getUTCDate() + MIN_PROPOSAL_DAYS);
    if (input.prazoPropostas < min.toISOString().slice(0, 10)) {
      out.push(`Dê pelo menos ${MIN_PROPOSAL_DAYS} dias aos pintores para orçamentarem.`);
    }
  }
  return out;
}

// --- Formulário do pedido ----------------------------------------------------------

export const VIA_PUBLICA = ['sim', 'nao', 'a_avaliar'] as const;
export type ViaPublica = (typeof VIA_PUBLICA)[number];
export const VIA_PUBLICA_LABELS: Record<ViaPublica, string> = {
  sim: 'Sim, prevê ocupação da via pública (andaime ou equipamento no passeio ou na rua)',
  nao: 'Não',
  a_avaliar: 'A avaliar pelo pintor',
};

export interface RequestInput {
  buildingId: string;
  titulo: string;
  tipoObra: WorkType;
  descricao: string;
  trabalhos: DesiredWork[];
  corAcabamento: string | null;
  prazoPropostas: string | null;
  execucaoDesde: string | null;
  execucaoAte: string | null;
  ocupacaoViaPublica: ViaPublica;
}

const DATE = /^\d{4}-\d{2}-\d{2}$/;

export function parseRequest(form: FormData): { value?: RequestInput; errors: FieldErrors } {
  const errors: FieldErrors = {};
  const get = (k: string) => String(form.get(k) ?? '').trim();
  const buildingId = get('buildingId');
  if (!buildingId) errors.buildingId = 'Escolha o prédio.';
  const titulo = get('titulo');
  if (!titulo) errors.titulo = 'Dê um nome interno ao pedido.';
  const tipoObra = get('tipoObra');
  if (!(WORK_TYPES as readonly string[]).includes(tipoObra)) errors.tipoObra = 'Escolha o tipo de obra.';
  const trabalhos = form.getAll('trabalhos').map(String);
  if (trabalhos.some((t) => !(DESIRED_WORKS as readonly string[]).includes(t))) errors.trabalhos = 'Trabalho inválido.';
  const dates: Record<string, string | null> = {};
  for (const k of ['prazoPropostas', 'execucaoDesde', 'execucaoAte']) {
    const v = get(k);
    if (v && !DATE.test(v)) errors[k] = 'Data inválida.';
    dates[k] = v || null;
  }
  const via = get('ocupacaoViaPublica') || 'a_avaliar';
  if (!(VIA_PUBLICA as readonly string[]).includes(via)) errors.ocupacaoViaPublica = 'Escolha uma opção.';
  if (dates.execucaoDesde && dates.execucaoAte && dates.execucaoAte < dates.execucaoDesde) {
    errors.execucaoAte = 'Tem de ser depois do início.';
  }
  if (Object.keys(errors).length > 0) return { errors };
  return {
    errors,
    value: {
      buildingId,
      titulo,
      tipoObra: tipoObra as WorkType,
      descricao: get('descricao'),
      trabalhos: trabalhos as DesiredWork[],
      corAcabamento: get('corAcabamento') || null,
      prazoPropostas: dates.prazoPropostas ?? null,
      execucaoDesde: dates.execucaoDesde ?? null,
      execucaoAte: dates.execucaoAte ?? null,
      ocupacaoViaPublica: via as ViaPublica,
    },
  };
}
