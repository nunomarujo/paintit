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

/**
 * Uma obra pode ser de mais do que um tipo — e quase sempre é.
 *
 * Até 28/10/2026 o pedido escolhia um só tipo, numa lista pendente. Uma empreitada de condomínio
 * que pinta a fachada e as escadas cabia em "Fachadas e varandas" ou em "Zonas comuns interiores",
 * nunca nas duas, e o pintor recebia o anúncio com metade da obra escondida no texto (queixa do
 * promotor, repetida: primeiro nos modelos de orçamento, depois aqui).
 *
 * `tipo_obra` continua a existir e continua a ser o principal: é o que o anúncio põe no título, o
 * que filtra a lista de oportunidades e o que vai nos documentos. É sempre o primeiro de
 * `tipos_obra` pela ordem acima, para que o mesmo conjunto dê sempre o mesmo principal.
 */
export function tipoPrincipal(tipos: readonly WorkType[]): WorkType {
  return WORK_TYPES.find((t) => tipos.includes(t)) ?? 'fachadas';
}

/** Ordena pela ordem canónica e tira repetidos: a lista do formulário não manda na ordem. */
export function tiposCanonicos(tipos: readonly string[]): WorkType[] {
  return WORK_TYPES.filter((t) => tipos.includes(t));
}

/** "Fachadas e varandas · Interior de habitação" — um só tipo dá a etiqueta de sempre. */
export function etiquetaDosTipos(tipos: readonly WorkType[]): string {
  const lista = tiposCanonicos(tipos);
  return (lista.length ? lista : (['fachadas'] as WorkType[])).map((t) => WORK_TYPE_LABELS[t]).join(' · ');
}

/**
 * Datas que o cliente dá por indicativas.
 *
 * Uma data de execução sem margem é uma condição; a mesma data com margem é um desejo. O pintor
 * precisa de saber a diferença antes de orçamentar: com margem pode propor outra semana e ganhar a
 * obra; sem margem, ou pode naquelas datas ou não concorre (pedido do promotor, 28/10/2026).
 *
 * O prazo das propostas é o único que a plataforma faz cumprir — as propostas só chegam ao cliente
 * no fim dele. Marcá-lo flexível não o move: diz ao pintor que o cliente aceita prolongá-lo a
 * pedido, e o prolongamento tem o seu próprio caminho (`prolongar_prazo`).
 */
export const DATAS_FLEXIVEIS = ['propostas', 'execucao_desde', 'execucao_ate'] as const;
export type DataFlexivel = (typeof DATAS_FLEXIVEIS)[number];
export const DATA_FLEXIVEL_LABELS: Record<DataFlexivel, string> = {
  propostas: 'Aceito prolongar o prazo, se for pedido',
  execucao_desde: 'Data indicativa: pode começar noutra altura',
  execucao_ate: 'Data indicativa: aceito outra data de fim',
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

/**
 * Uma zona tem **três coisas independentes**, e durante muito tempo teve uma só.
 *
 * O campo `origem` acima misturava o método com quem o usou — «medição do cliente» são duas
 * respostas numa — e não dizia nada sobre duas perguntas diferentes: se a zona entra no pedido, e
 * se a quantidade já foi verificada. Correcção do promotor, 30/10/2026, depois de eu lhe ter
 * proposto meter os quatro conceitos num campo só:
 *
 * | Dimensão | Valores | O que responde |
 * | --- | --- | --- |
 * | Participação | incluída · por decidir · excluída | A zona entra nesta obra? |
 * | Origem da quantidade | medição · estimativa · documento | Como se chegou ao número? |
 * | Confirmação | por confirmar · confirmada | O número já foi verificado? |
 *
 * **«Levantamento» não é um método.** É o processo — e dentro dele o profissional pode medir uma
 * fachada e estimar outra. Por isso quem registou guarda-se à parte (`registadoPor`), e não dentro
 * da origem.
 *
 * **Excluída é uma decisão, não uma ausência.** Uma zona excluída fica no pedido, identificada,
 * para não restar dúvida de que foi considerada e deixada de fora; não exige medições, não entra no
 * total nem nas validações. Uma zona que simplesmente não está na lista não é nada disso — não é
 * excluída nem confirmada, e ninguém é obrigado a inventariar o imóvel inteiro para a pôr lá.
 */
export const PARTICIPACOES = ['incluida', 'por_decidir', 'excluida'] as const;
export type Participacao = (typeof PARTICIPACOES)[number];
export const PARTICIPACAO_LABELS: Record<Participacao, string> = {
  incluida: 'Incluída no pedido',
  por_decidir: 'Por decidir',
  excluida: 'Excluída deste pedido',
};

export const ORIGENS_DA_QUANTIDADE = ['medicao', 'estimativa', 'documento'] as const;
export type OrigemDaQuantidade = (typeof ORIGENS_DA_QUANTIDADE)[number];
export const ORIGEM_DA_QUANTIDADE_LABELS: Record<OrigemDaQuantidade, string> = {
  medicao: 'Medição',
  estimativa: 'Estimativa',
  documento: 'Documento existente',
};

export const CONFIRMACOES = ['por_confirmar', 'confirmada'] as const;
export type Confirmacao = (typeof CONFIRMACOES)[number];
export const CONFIRMACAO_LABELS: Record<Confirmacao, string> = {
  por_confirmar: 'Por confirmar',
  confirmada: 'Confirmada',
};

/** A zona, nas três dimensões, para quem só precisa de contar e de validar. */
export interface ZonaDoPedido {
  areaCm2: AreaCm2;
  participacao: Participacao;
  origemDaQuantidade: OrigemDaQuantidade | null;
  confirmacao: Confirmacao;
}

export interface ResumoDasZonas {
  /** Só as incluídas. Uma zona excluída não entra no total, e uma por decidir ainda não é obra. */
  areaIncluidaCm2: AreaCm2;
  incluidas: number;
  porDecidir: number;
  excluidas: number;
  /** Zonas incluídas cuja quantidade ainda não foi verificada. */
  porConfirmar: number;
  /** Zonas incluídas sem quantidade nenhuma. */
  semQuantidade: number;
}

export function resumoDasZonas(zonas: readonly ZonaDoPedido[]): ResumoDasZonas {
  const incluidas = zonas.filter((z) => z.participacao === 'incluida');
  return {
    areaIncluidaCm2: incluidas.reduce((n, z) => n + z.areaCm2, 0),
    incluidas: incluidas.length,
    porDecidir: zonas.filter((z) => z.participacao === 'por_decidir').length,
    excluidas: zonas.filter((z) => z.participacao === 'excluida').length,
    porConfirmar: incluidas.filter((z) => z.confirmacao === 'por_confirmar').length,
    semQuantidade: incluidas.filter((z) => z.areaCm2 <= 0).length,
  };
}

/**
 * Como o cliente quer dar as dimensões de uma zona.
 *
 * É a primeira pergunta do editor, e existe porque a anterior não existia: o formulário punha à
 * frente área, largura, altura, vãos e quantidade ao mesmo tempo, e quem não é do ofício não sabe
 * o que preencher nem como aqueles campos se relacionam (promotor, 30/10/2026). Respondida esta,
 * mostram-se só os campos que ela pede.
 *
 * **«Não sei as medidas» é uma resposta legítima**, e é a mais importante das três: a zona fica
 * registada, por levantar, e é disso que o profissional precisa para saber o que vai medir. Sem
 * ela, quem não sabe medir não conseguia sequer dizer que a fachada existe.
 */
export const COMO_MEDIR = ['area', 'largura_altura', 'nao_sei'] as const;
export type ComoMedir = (typeof COMO_MEDIR)[number];
export const COMO_MEDIR_LABELS: Record<ComoMedir, string> = {
  area: 'Sei a área',
  largura_altura: 'Sei a largura e a altura',
  nao_sei: 'Não sei as medidas',
};

/**
 * A confirmação que se deduz da origem, quando ninguém a declara.
 *
 * Uma **medição** é um número que alguém foi ver ao sítio: conta como confirmada. Uma
 * **estimativa** e um **documento** não — uma planta pode estar desactualizada e uma estimativa é
 * uma estimativa. Não é um juízo sobre quem a deu: é a diferença entre um número verificado e um
 * número por verificar, que é o que o pintor precisa de saber para contar com a margem certa.
 */
export const confirmacaoDaOrigem = (o: OrigemDaQuantidade | null): Confirmacao =>
  o === 'medicao' ? 'confirmada' : 'por_confirmar';

/** A origem antiga, traduzida para a nova. Serve a migração e o que ainda não tiver mudado. */
export const ORIGEM_ANTIGA_PARA_NOVA: Record<AreaSource, OrigemDaQuantidade> = {
  estimativa: 'estimativa',
  medicao_cliente: 'medicao',
  planta: 'documento',
};

export const DESIRED_WORKS = [
  'lavagem',
  'reparacao_fissuras',
  'tratamento_humidade',
  'primario',
  'pintura',
  'impermeabilizacao',
  'tratamento_metais',
  'capoto',
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
  capoto: 'Capoto (isolamento pelo exterior)',
};

/** Os trabalhos pretendidos são iguais em todas as zonas (fachadas)? */
export const WORKS_MODES = ['iguais', 'diferencas', 'nao_sei'] as const;
export type WorksMode = (typeof WORKS_MODES)[number];
export const WORKS_MODE_LABELS: Record<WorksMode, string> = {
  iguais: 'Sim, o mesmo pedido para todas as zonas',
  diferencas: 'Há diferenças entre zonas (trabalhos comuns, com ajustes em algumas)',
  nao_sei: 'Ainda não sei: descrevo o objetivo e junto fotografias',
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
  /** A origem antiga, que se mantém escrita enquanto a coluna existir. */
  origem: AreaSource;
  /** Como se chegou ao número. Null numa zona por levantar: ainda não há número nenhum. */
  origemQuantidade: OrigemDaQuantidade | null;
  /** Trabalhos só desta zona, quando diferem dos comuns do pedido. null = os do pedido. */
  trabalhos: DesiredWork[] | null;
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
  const zonaTrabalhos = form.getAll('trabalhosZona').map(String);
  if (zonaTrabalhos.some((t) => !(DESIRED_WORKS as readonly string[]).includes(t))) errors.trabalhosZona = 'Trabalho inválido.';
  const qty = String(form.get('quantidade') ?? '1').trim() || '1';
  const quantidade = /^\d+$/.test(qty) ? Number(qty) : Number.NaN;
  if (!Number.isInteger(quantidade) || quantidade < 1 || quantidade > 500) errors.quantidade = 'Entre 1 e 500.';

  // A primeira pergunta do editor decide o que é obrigatório. Sem ela — formulários antigos, ou um
  // envio sem o campo — vale a regra de antes: área, ou largura e altura.
  const comoMedir = String(form.get('comoMedir') ?? '');
  const como: ComoMedir | null = (COMO_MEDIR as readonly string[]).includes(comoMedir) ? (comoMedir as ComoMedir) : null;
  if (Object.keys(errors).length === 0) {
    if (como === 'area' && areaDireta === null) errors.area = 'Indique a área desta zona.';
    else if (como === 'largura_altura' && (largura === null || altura === null)) {
      errors[largura === null ? 'largura' : 'altura'] = 'Indique a largura e a altura.';
    } else if (como === null && areaDireta === null && (largura === null || altura === null)) {
      errors.area = 'Indique a área, ou a largura e a altura.';
    }
  }
  if (Object.keys(errors).length > 0) return { errors };

  // «Não sei as medidas» guarda a zona sem números nenhuns: por levantar.
  const semMedidas = como === 'nao_sei';
  const origemNova = String(form.get('origemQuantidade') ?? '');
  const value: SurfaceInput = {
    kind: kind as SurfaceKind,
    descricao: String(form.get('descricao') ?? '').trim() || null,
    areaDireta: semMedidas || como === 'largura_altura' ? null : areaDireta,
    larguraCm: semMedidas || como === 'area' ? null : largura,
    alturaCm: semMedidas || como === 'area' ? null : altura,
    vaosCm2: semMedidas || como === 'area' ? null : vaos,
    quantidade: semMedidas ? 1 : quantidade,
    origem: origem as AreaSource,
    origemQuantidade: semMedidas
      ? null
      : (ORIGENS_DA_QUANTIDADE as readonly string[]).includes(origemNova)
        ? (origemNova as OrigemDaQuantidade)
        : ORIGEM_ANTIGA_PARA_NOVA[origem as AreaSource],
    trabalhos: zonaTrabalhos.length > 0 ? (zonaTrabalhos as DesiredWork[]) : null,
  };
  // Uma zona por levantar tem área zero de propósito, e isso não é um erro: é o que se sabe dela.
  if (!semMedidas && surfaceArea(value) <= 0) {
    return { errors: { area: 'A área resultante tem de ser maior do que zero.' } };
  }
  return { value, errors };
}

// --- Anonimato do texto publicado ---------------------------------------------

const CONTACT_PATTERNS: [RegExp, string][] = [
  [/[^\s@]+@[^\s@]+\.[a-z]{2,}/i, 'um email'],
  // Emails disfarçados: "nome@gmail ponto com", "nome arroba gmail", "gmail.com".
  [/\S+\s*(@|\barroba\b)\s*\S+|\b(gmail|hotmail|outlook|sapo|yahoo|icloud|live)\b|\bponto\s+(com|pt)\b/i, 'um email'],
  [/\b(whats\s?app|telegram|signal|messenger|instagram|facebook|linkedin)\b/i, 'um contacto fora da plataforma'],
  [/\b(contact\w*|ligu\w*|liga[rm]?|fal(e|ar)|venha|vir)\b.{0,40}\b(diretamente|direto|por fora|fora da (plataforma|aplicação|app))\b|\b(evitar|sem|fugir|poupar)\b.{0,20}\b(comiss\w*|plataforma|aplicação|app)\b/i, 'um pedido de contacto fora da plataforma'],
  // Contornar a plataforma pelo preço: "faço-lhe mais barato porque a app cobra...".
  [/\b(mais barato|desconto|melhor pre[çc]o|pre[çc]o melhor|sem (a )?(app|aplica\w+|plataforma))\b.{0,60}\b(app|aplica\w+|plataforma|comiss\w+)\b|\b(app|aplica\w+|plataforma)\b.{0,30}\b(quer|cobra|leva|fica com)\b.{0,30}\b(dinheiro|comiss\w+|percentagem)\b/i, 'um pedido de contacto fora da plataforma'],
  // Onde fica a empresa ou o cliente, por pontos de referência: "a nossa loja, ao lado do café…".
  [/\b(a nossa|o nosso|a minha|o meu)\s+(loja|escrit[óo]rio|sede|armaz[ée]m|oficina)\b/i, 'a localização da empresa'],
  [/\b(ao lado d[oae]s?|junto (a|ao|à|d[oae]s?)|perto d[oae]s?|em frente (a|ao|à|d[oae]s?)|na zona d[oae]s?|fica(mos)? (na|no|em))\b.{0,30}\b(caf[ée]|restaurante|pastelaria|farm[áa]cia|igreja|escola|supermercado|bomba|loja|escrit[óo]rio|armaz[ée]m|oficina|largo|jardim|pra[çc]a|mercado)\b/i, 'uma indicação de localização'],
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
  /**
   * Os trabalhos que o cliente escolheu. Entram na verificação do contexto: quem marcou «pintura» e
   * «reparação de fissuras» já disse o que quer, mesmo que não escreva um parágrafo sobre isso.
   */
  trabalhos?: readonly string[];
  /** Outros textos que chegam aos pintores (descrições das superfícies, cor). */
  otherTexts?: string[];
  prazoPropostas: string | null; // AAAA-MM-DD
  /** As zonas do pedido, nas três dimensões. Só as incluídas contam. */
  zonas: readonly ZonaDoPedido[];
  today: string; // AAAA-MM-DD, no fuso de Lisboa
}

export const MIN_PROPOSAL_DAYS = 7;

/** Só os textos, para quem não precisa de saber de quem é cada coisa (as acções do servidor). */
export const publishBlockers = (input: PublishCheckInput): string[] => bloqueiosDaPublicacao(input).map((b) => b.texto);

/**
 * De quem é cada coisa que falta.
 *
 * A distinção entrou a 29/10/2026, e é a correcção de fundo que o promotor pediu: a aplicação
 * promete um profissional que mede a obra, e depois mostra ao cliente «indique pelo menos uma
 * superfície com área» como se fosse falha dele. As medições são do **levantamento**; o prazo e o
 * texto do anúncio são do **cliente**. São coisas diferentes e não se dizem da mesma maneira.
 */
export type DonoDoBloqueio = 'cliente' | 'levantamento';

export interface Bloqueio {
  texto: string;
  de: DonoDoBloqueio;
}

/** O que impede a publicação, com o dono de cada coisa. Vazio = pode ser publicado. */
export function bloqueiosDaPublicacao(input: PublishCheckInput): Bloqueio[] {
  const out: Bloqueio[] = [];
  const zonas = resumoDasZonas(input.zonas);
  if (zonas.incluidas === 0 || zonas.areaIncluidaCm2 <= 0) {
    out.push({ texto: 'Indique pelo menos uma superfície com área.', de: 'levantamento' });
  }
  // Uma zona por decidir não é uma zona em falta: é uma pergunta por responder, e a resposta é do
  // cliente — ninguém a pode dar por ele. Por isso é bloqueio, e é dele.
  if (zonas.porDecidir > 0) {
    out.push({
      texto:
        zonas.porDecidir === 1
          ? 'Há uma zona por decidir: diga se entra neste pedido ou se fica de fora.'
          : `Há ${zonas.porDecidir} zonas por decidir: diga quais entram neste pedido e quais ficam de fora.`,
      de: 'cliente',
    });
  }
  // A contagem de caracteres saiu a 30/10/2026, por decisão do promotor. Trinta caracteres não são
  // uma medida de qualidade — «pintar o prédio todo por fora» tem vinte e nove e diz mais do que
  // muitos parágrafos. O que o pedido precisa é de **contexto suficiente**, e esse pode vir das
  // respostas estruturadas tanto como da descrição: quem marcou os trabalhos já disse o que quer.
  if (input.descricao.trim().length === 0 && (input.trabalhos ?? []).length === 0) {
    out.push({ texto: 'Diga o que pretende fazer: escolha os trabalhos ou descreva a obra.', de: 'cliente' });
  }
  const revealing = [...new Set([input.descricao, ...(input.otherTexts ?? [])].flatMap(revealingContent))];
  if (revealing.length > 0) {
    out.push({
      texto: `O texto do anúncio parece conter ${revealing.join(', ')}. Retire-o: a identificação só é revelada depois da escolha.`,
      de: 'cliente',
    });
  }
  if (!input.prazoPropostas) out.push({ texto: 'Indique até quando aceita propostas.', de: 'cliente' });
  else {
    const min = new Date(`${input.today}T00:00:00Z`);
    min.setUTCDate(min.getUTCDate() + MIN_PROPOSAL_DAYS);
    if (input.prazoPropostas < min.toISOString().slice(0, 10)) {
      out.push({ texto: `Dê pelo menos ${MIN_PROPOSAL_DAYS} dias aos pintores para orçamentarem.`, de: 'cliente' });
    }
  }
  return out;
}

// --- Urgência do prazo (ecrã de Oportunidades) --------------------------------------

/**
 * A que distância está o prazo de um pedido aberto. Usa o mesmo limiar de 3 dias que já marca os
 * orçamentos por enviar (`DIAS_PARA_AVISAR`, domain/quoteBoard.ts) — uma só régua de urgência em
 * toda a aplicação. "Hoje" é o próprio caso-limite de "atencao", para a frase soar certa.
 */
export type NivelPrazo = 'hoje' | 'atencao' | 'normal';

export function urgenciaPrazo(prazoISO: string, hojeISO: string): { dias: number; nivel: NivelPrazo } {
  const dias = Math.round((Date.parse(`${prazoISO}T00:00:00Z`) - Date.parse(`${hojeISO}T00:00:00Z`)) / 86_400_000);
  return { dias, nivel: dias <= 0 ? 'hoje' : dias <= 3 ? 'atencao' : 'normal' };
}

/** Frase para a linha do pedido: "Termina hoje", "3 dias restantes", etc. */
export function fraseDePrazo({ dias, nivel }: { dias: number; nivel: NivelPrazo }): string {
  if (nivel === 'hoje') return dias === 0 ? 'Termina hoje' : 'Prazo terminado';
  return `${dias} ${dias === 1 ? 'dia restante' : 'dias restantes'}`;
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
  /** O principal: o primeiro de `tiposObra` pela ordem de WORK_TYPES. */
  tipoObra: WorkType;
  /** Todos os tipos escolhidos, pela ordem canónica. Nunca vazio. */
  tiposObra: WorkType[];
  descricao: string;
  trabalhos: DesiredWork[];
  corAcabamento: string | null;
  prazoPropostas: string | null;
  execucaoDesde: string | null;
  execucaoAte: string | null;
  ocupacaoViaPublica: ViaPublica;
  trabalhosModo: WorksMode;
  datasFlexiveis: DataFlexivel[];
}

const DATE = /^\d{4}-\d{2}-\d{2}$/;

export function parseRequest(form: FormData): { value?: RequestInput; errors: FieldErrors } {
  const errors: FieldErrors = {};
  const get = (k: string) => String(form.get(k) ?? '').trim();
  const buildingId = get('buildingId');
  if (!buildingId) errors.buildingId = 'Escolha o prédio.';
  const titulo = get('titulo');
  if (!titulo) errors.titulo = 'Dê um nome interno ao pedido.';
  const tiposObra = tiposCanonicos(form.getAll('tipoObra').map(String));
  if (tiposObra.length === 0) errors.tipoObra = 'Escolha pelo menos um tipo de obra.';
  const trabalhos = form.getAll('trabalhos').map(String);
  if (trabalhos.some((t) => !(DESIRED_WORKS as readonly string[]).includes(t))) errors.trabalhos = 'Trabalho inválido.';
  const dates: Record<string, string | null> = {};
  for (const k of ['prazoPropostas', 'execucaoDesde', 'execucaoAte']) {
    const v = get(k);
    if (v && !DATE.test(v)) errors[k] = 'Data inválida.';
    dates[k] = v || null;
  }
  const flexiveis = form.getAll('dataFlexivel').map(String).filter((d): d is DataFlexivel => (DATAS_FLEXIVEIS as readonly string[]).includes(d));
  const modo = get('trabalhosModo') || 'iguais';
  if (!(WORKS_MODES as readonly string[]).includes(modo)) errors.trabalhosModo = 'Escolha uma opção.';
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
      tipoObra: tipoPrincipal(tiposObra),
      tiposObra,
      descricao: get('descricao'),
      trabalhos: trabalhos as DesiredWork[],
      corAcabamento: get('corAcabamento') || null,
      prazoPropostas: dates.prazoPropostas ?? null,
      execucaoDesde: dates.execucaoDesde ?? null,
      execucaoAte: dates.execucaoAte ?? null,
      ocupacaoViaPublica: via as ViaPublica,
      trabalhosModo: modo as WorksMode,
      datasFlexiveis: [...new Set(flexiveis)],
    },
  };
}
