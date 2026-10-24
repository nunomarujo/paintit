import { ISOLAMENTO_E_ACESSORIOS, type ProductType } from './catalog';

// Pesquisa do catálogo (CMP-05): quem procura um produto não fala a linguagem da ficha técnica. Um
// pintor escreve "capoto", não "isolamento térmico pelo exterior"; escreve "esferovite", não "EPS"; e
// escreve com erros, sobretudo em teclados de telemóvel. A pesquisa tem de encontrar o produto apesar
// disso — nunca o contrário, de o utilizador ter de adivinhar o termo exato do catálogo (pedido do
// Nuno, 24/10/2026: "capoto" não devolvia nada, mesmo com o tipo "Isolamento — EPS" já escolhido).

/** Minúsculas, sem acentos, espaços à volta aparados. */
export function normalizeText(s: string): string {
  return s
    .toLocaleLowerCase('pt-PT')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .trim();
}

function words(s: string): string[] {
  return normalizeText(s)
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
}

/** Distância de Levenshtein entre duas palavras já normalizadas. */
function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  let prev: number[] = Array.from({ length: n + 1 }, (_, j) => j);
  let curr: number[] = new Array(n + 1).fill(0);
  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min((curr[j - 1] ?? 0) + 1, (prev[j] ?? 0) + 1, (prev[j - 1] ?? 0) + cost);
    }
    [prev, curr] = [curr, prev];
  }
  return prev[n] ?? 0;
}

/** Erros tolerados consoante o tamanho da palavra — como a generalidade dos motores de pesquisa: zero
 * tolerância em palavras muito curtas (para não gerar falsos positivos entre palavras diferentes). */
function maxTypos(len: number): number {
  if (len <= 3) return 0;
  if (len <= 7) return 1;
  return 2;
}

/** Uma palavra da pesquisa "encontra" uma palavra do texto: igual, prefixo de uma da outra, ou a poucos
 * caracteres de distância (erro de escrita). */
export function wordMatches(query: string, word: string): boolean {
  if (!query || !word) return false;
  if (word.startsWith(query) || query.startsWith(word)) return true;
  return levenshtein(query, word) <= maxTypos(Math.min(query.length, word.length));
}

interface JargonEntry {
  /** Tipos de produto a incluir mesmo que o nome/descrição não contenham a palavra escrita. */
  tipos?: readonly ProductType[];
  /** Palavras técnicas equivalentes, a comparar (com a mesma tolerância a erros) contra o texto do produto. */
  termos?: string[];
}

/** Gíria e termos comuns do setor, por palavra (já normalizada: minúsculas, sem acentos). Alargar esta
 * lista é a forma correta de resolver "a pesquisa de X não encontra nada" — nunca pedir ao utilizador
 * para escrever o termo técnico. */
export const CATALOG_JARGON: Record<string, JargonEntry> = {
  // Sistema de isolamento térmico pelo exterior (ETICS): "capoto" é como toda a gente lhe chama em
  // Portugal, incluindo os próprios fabricantes nos catálogos comerciais — nunca "ETICS" ou "isolamento
  // térmico pelo exterior" por escrito pelo utilizador comum.
  capoto: { tipos: ISOLAMENTO_E_ACESSORIOS },
  etics: { tipos: ISOLAMENTO_E_ACESSORIOS },
  isolamento: { tipos: ISOLAMENTO_E_ACESSORIOS },
  isolante: { tipos: ISOLAMENTO_E_ACESSORIOS },
  termico: { tipos: ISOLAMENTO_E_ACESSORIOS },
  // Nomes comerciais/coloquiais de cada isolante.
  esferovite: { tipos: ['isolamento_eps', 'isolamento_eps_grafitado'] },
  eps: { tipos: ['isolamento_eps', 'isolamento_eps_grafitado'] },
  grafitado: { tipos: ['isolamento_eps_grafitado'] },
  xps: { tipos: ['isolamento_xps'] },
  extrudido: { tipos: ['isolamento_xps'] },
  la: { tipos: ['isolamento_la_mineral'] },
  rocha: { tipos: ['isolamento_la_mineral'] },
  mineral: { tipos: ['isolamento_la_mineral'] },
  rockwool: { tipos: ['isolamento_la_mineral'] },
  cortica: { tipos: ['isolamento_cortica'] },
  icb: { tipos: ['isolamento_cortica'] },
  // Acessórios do sistema de capoto.
  bucha: { tipos: ['fixador_capoto'] },
  buchas: { tipos: ['fixador_capoto'] },
  fixador: { tipos: ['fixador_capoto'] },
  parafuso: { tipos: ['fixador_capoto'] },
  rede: { tipos: ['rede_fibra_vidro'] },
  malha: { tipos: ['rede_fibra_vidro'] },
  fibra: { tipos: ['rede_fibra_vidro'] },
  reboco: { tipos: ['reboco_capoto'] },
  argamassa: { tipos: ['reboco_capoto'] },
  // Tintas e afins.
  tinta: { tipos: ['tinta_interior', 'tinta_exterior'] },
  pintura: { tipos: ['tinta_interior', 'tinta_exterior'] },
  primer: { tipos: ['primario'] },
  primario: { tipos: ['primario'] },
  impermeabilizacao: { tipos: ['impermeabilizante'] },
  verniz: { tipos: ['esmalte'] },
  laca: { tipos: ['esmalte'] },
  esmalte: { tipos: ['esmalte'] },
  massa: { tipos: ['massa_reparacao'] },
  estuque: { tipos: ['massa_reparacao'] },
};

function jargonFor(word: string): JargonEntry | undefined {
  const exact = CATALOG_JARGON[word];
  if (exact) return exact;
  // Erro de escrita no próprio termo de gíria (ex.: "captoo"): procura a entrada mais próxima.
  for (const [key, entry] of Object.entries(CATALOG_JARGON)) {
    if (wordMatches(word, key)) return entry;
  }
  return undefined;
}

export interface SearchableProduct {
  tipo: ProductType;
  /** Marca, nome e descrição, já concatenados — a pesquisa não distingue entre campos. */
  texto: string;
}

/** O produto corresponde ao que foi escrito: por nome/marca/descrição (com tolerância a erros de
 * escrita) ou por gíria do setor que aponta para o tipo de produto, mesmo sem a palavra aparecer na
 * ficha. Pesquisa vazia corresponde sempre. Várias palavras: todas têm de encontrar algo (como a
 * generalidade dos motores de pesquisa). */
export function matchesSearch(term: string, item: SearchableProduct): boolean {
  const query = words(term);
  if (query.length === 0) return true;
  const textWords = words(item.texto);
  return query.every((q) => {
    const entry = jargonFor(q);
    if (entry?.tipos?.includes(item.tipo)) return true;
    const candidates = [q, ...(entry?.termos ?? [])];
    return textWords.some((tw) => candidates.some((c) => wordMatches(c, tw)));
  });
}
