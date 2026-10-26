import { ordenarEntidades, type EntidadeDoMapa } from './mapaContratos';

/**
 * Procurar e filtrar no Mapa de Contratos Públicos.
 *
 * O ecrã mostra centenas de entidades e o pintor trabalha num concelho. Sem um cabeçalho que deixe
 * procurar, escolher onde e que tipo de entidade, a lista é uma parede de nomes — e foi isso que o
 * promotor viu (26/10/2026): *"para que serve esta lista? pergunta o pintor, não a entendo"*.
 *
 * Tudo aqui é função pura sobre as entidades já somadas pela base. A procura é feita sobre o que
 * existe mesmo nos dados — não há lista de palavras-chave inventada — e por isso nunca sugere um
 * nome que não dê resultados.
 */

/** Minúsculas e sem acentos: quem escreve "camara" tem de encontrar "Câmara". */
export function normalizar(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}

export type TipoDeEntidade = 'municipio' | 'freguesia' | 'social' | 'saude' | 'ensino' | 'habitacao' | 'estado' | 'outra';

export const TIPOS: { tipo: TipoDeEntidade; label: string }[] = [
  { tipo: 'municipio', label: 'Câmaras municipais' },
  { tipo: 'freguesia', label: 'Juntas de freguesia' },
  { tipo: 'habitacao', label: 'Habitação municipal' },
  { tipo: 'social', label: 'Misericórdias e IPSS' },
  { tipo: 'saude', label: 'Saúde' },
  { tipo: 'ensino', label: 'Ensino' },
  { tipo: 'estado', label: 'Estado e forças de segurança' },
  { tipo: 'outra', label: 'Outras' },
];

// A ordem destas regras importa: "Serviços Sociais da Guarda Nacional Republicana" tem "serviços
// sociais" e é do Estado; "Hospital da Misericórdia" é saúde antes de ser IPSS. Cada entidade cai
// na primeira que bate, e a lista vai do mais específico para o mais geral.
const REGRAS: { tipo: TipoDeEntidade; padrao: RegExp }[] = [
  { tipo: 'habitacao', padrao: /habitacao|gebalis|domus social|habita/ },
  { tipo: 'saude', padrao: /hospital|centro hospitalar|unidade local de saude|ars |administracao regional de saude|saude|inem|emergencia medica/ },
  { tipo: 'ensino', padrao: /universidade|politecnico|instituto superior|escola|agrupamento|colegio|ensino/ },
  { tipo: 'estado', padrao: /guarda nacional|policia|forca aerea|exercito|marinha|ministerio|direcao-geral|direccao-geral|secretaria|instituto da|autoridade |tribunal|estado maior|seguranca social|financas/ },
  { tipo: 'freguesia', padrao: /freguesia|junta de/ },
  { tipo: 'municipio', padrao: /municipio|camara municipal|^cm |servicos municipalizados|servicos intermunicipalizados/ },
  { tipo: 'social', padrao: /misericordia|ipss|santa casa|associacao|fundacao|centro social|centro paroquial|socorros/ },
];

/** Que espécie de entidade é esta, pelo nome. É o nome que o portal publica; não há outro campo. */
export function tipoDaEntidade(nome: string): TipoDeEntidade {
  const n = normalizar(nome);
  for (const r of REGRAS) if (r.padrao.test(n)) return r.tipo;
  return 'outra';
}

export type Ordem = 'frequencia' | 'nome' | 'valor' | 'recente';

export const ORDENS: { ordem: Ordem; label: string }[] = [
  { ordem: 'frequencia', label: 'Quem contrata mais vezes' },
  { ordem: 'nome', label: 'Nome da entidade' },
  { ordem: 'valor', label: 'Quem gasta mais' },
  { ordem: 'recente', label: 'Quem contratou há menos tempo' },
];

export function ordenar(entidades: EntidadeDoMapa[], ordem: Ordem): EntidadeDoMapa[] {
  const e = [...entidades];
  switch (ordem) {
    case 'nome':
      return e.sort((a, b) => a.nome.localeCompare(b.nome, 'pt'));
    case 'valor':
      return e.sort((a, b) => b.totalCents - a.totalCents || a.nome.localeCompare(b.nome, 'pt'));
    case 'recente':
      // Sem data vai para o fim: não se sabe quando contratou, não é "há muito tempo".
      return e.sort((a, b) => (b.ultimo ?? '').localeCompare(a.ultimo ?? '') || a.nome.localeCompare(b.nome, 'pt'));
    default:
      // A ordem por omissão é a do mapa, e a regra vive onde está o porquê dela: `ordenarEntidades`.
      return ordenarEntidades(e);
  }
}

/**
 * Palavras que querem dizer o mesmo nos documentos do portal.
 *
 * Não é um dicionário: é a lista das equivalências que o próprio portal usa sem critério. A mesma
 * câmara aparece como "Município de Vila Nova de Gaia" num ano e "Câmara Municipal de ..." noutro, e
 * quem procura escreve o que diz na rua. Sem isto, "camara gaia" devolvia zero com a entidade à vista
 * na lista — foi o que aconteceu ao ensaiar com os dados reais de Lisboa e Porto (26/10/2026).
 *
 * Cada grupo é simétrico: qualquer palavra do grupo encontra as outras.
 */
const EQUIVALENCIAS: string[][] = [
  ['camara', 'camaras', 'municipio', 'municipios', 'municipal', 'cm'],
  ['junta', 'juntas', 'freguesia', 'freguesias'],
  ['misericordia', 'misericordias', 'santa casa', 'scm'],
  ['hospital', 'hospitalar', 'hospitais'],
  ['escola', 'escolas', 'escolar', 'agrupamento', 'agrupamentos'],
  ['universidade', 'universitario', 'academico'],
  ['gnr', 'guarda nacional republicana'],
  ['psp', 'policia de seguranca publica'],
  ['bombeiros', 'associacao humanitaria'],
  ['habitacao', 'habitacional', 'habita'],
];

/**
 * A palavra escrita e as que valem por ela.
 *
 * Exportada porque é o que faz a procura "deduzir" — e o que convém poder ler num teste sem
 * adivinhar.
 */
export function alternativas(palavra: string): string[] {
  const grupo = EQUIVALENCIAS.find((g) => g.includes(palavra));
  return grupo ? [...new Set([palavra, ...grupo])] : [palavra];
}

export interface Filtro {
  termo: string;
  tipos: TipoDeEntidade[];
  concelhos: string[];
}

/** A entidade passa o crivo? O termo procura no nome e nos concelhos onde ela contratou. */
export function combina(e: EntidadeDoMapa, f: Filtro): boolean {
  if (f.tipos.length > 0 && !f.tipos.includes(tipoDaEntidade(e.nome))) return false;
  if (f.concelhos.length > 0) {
    const meus = new Set(e.concelhos.map(normalizar));
    if (!f.concelhos.some((c) => meus.has(normalizar(c)))) return false;
  }
  const t = normalizar(f.termo);
  if (t.length === 0) return true;
  // Cada palavra tem de aparecer algures — sozinha ou por uma equivalente: "camara gaia" encontra
  // "Município de Vila Nova de Gaia" sem obrigar a escrever o nome como o portal o gravou.
  const alvo = normalizar(`${e.nome} ${e.concelhos.join(' ')}`);
  return t.split(/\s+/).every((p) => alternativas(p).some((a) => alvo.includes(a)));
}

export function filtrar(entidades: EntidadeDoMapa[], f: Filtro): EntidadeDoMapa[] {
  return entidades.filter((e) => combina(e, f));
}

export interface Sugestao {
  valor: string;
  /** O que isto é, para o ecrã dizer "entidade" ou "concelho" ao lado. */
  gentio: 'entidade' | 'concelho';
  /** Quantos contratos estão por trás, para ordenar o que é mais útil primeiro. */
  peso: number;
}

/**
 * O que oferecer a quem está a escrever.
 *
 * Sai sempre **do que existe nos dados carregados** — nomes de entidades e concelhos reais. Uma
 * sugestão que não dê resultados é pior do que nenhuma: ensina a desconfiar da caixa de procura.
 *
 * Quem começa a escrever vê primeiro o que bate no princípio da palavra e o que tem mais contratos
 * por trás, porque é o que tem mais hipóteses de ser o que procura.
 */
export function sugestoes(termo: string, entidades: EntidadeDoMapa[], limite = 8): Sugestao[] {
  const t = normalizar(termo);
  if (t.length < 2) return [];

  const porConcelho = new Map<string, number>();
  for (const e of entidades) for (const c of e.concelhos) porConcelho.set(c, (porConcelho.get(c) ?? 0) + e.contratos);

  const candidatos: Sugestao[] = [
    ...entidades.map((e) => ({ valor: e.nome, gentio: 'entidade' as const, peso: e.contratos })),
    ...[...porConcelho].map(([c, n]) => ({ valor: c, gentio: 'concelho' as const, peso: n })),
  ];

  const escapar = (x: string) => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const camada = (n: string, x: string) =>
    !n.includes(x) ? 0 : n === x ? 3 : new RegExp(`\\b${escapar(x)}`).test(n) ? 2 : 1;

  const pontuar = (s: Sugestao) => {
    const n = normalizar(s.valor);
    const directo = camada(n, t);
    // Uma equivalência é um palpite, e vale menos do que o que a pessoa escreveu mesmo: entra no
    // último patamar, abaixo de qualquer acerto directo, mas acima de não aparecer.
    const nivel = directo > 0 ? directo : alternativas(t).some((a) => a !== t && n.includes(a)) ? 1 : 0;
    if (nivel === 0) return null;
    return nivel * 1_000_000 + s.peso;
  };

  return candidatos
    .map((s) => ({ s, p: pontuar(s) }))
    .filter((x): x is { s: Sugestao; p: number } => x.p !== null)
    .sort((a, b) => b.p - a.p || a.s.valor.localeCompare(b.s.valor, 'pt'))
    .slice(0, limite)
    .map((x) => x.s);
}
