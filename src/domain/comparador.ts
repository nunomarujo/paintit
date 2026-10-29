import { workForRequested, inclusionToState } from './works';
import { lineTotal, UNIT_LABELS, type Inclusion, type ProposalLine, type Unit } from './proposal';
import { DESIRED_WORK_LABELS, type DesiredWork } from './request';
import type { Cents } from './money';

/**
 * O que cada proposta diz sobre cada trabalho que o cliente pediu.
 *
 * Primeiro passo do comparador revisto (docs/DECISOES.md, 28/10/2026). Antes de qualquer conta,
 * uniformizar o que se mostra — e mostrar o que já está guardado e nunca apareceu.
 *
 * As demãos e o produto estão em cada linha da proposta desde que o orçamento guiado existe. Na
 * proposta aberta aparecem; **na comparação, não** — e é na comparação que decidem. O cliente tinha
 * de abrir cada proposta e guardar de cabeça quem dava duas demãos e com quê.
 *
 * A grelha é o pedido do cliente, nunca a arrumação de um pintor: cada trabalho que ele pediu
 * recebe o estado em que cada proposta o deixou, mais a quantidade, as demãos, o produto e o preço.
 */

/**
 * Cinco estados, e a diferença entre os dois últimos é a que evita uma injustiça.
 *
 * «Não indicado» não é exclusão: um pintor que não falou do trabalho pode fazê-lo e tê-lo esquecido
 * na descrição, ou tê-lo metido dentro de outra linha. Tratá-lo como recusa penaliza quem descreveu
 * de menos tanto como quem recusou, e são coisas diferentes — uma é uma pergunta, a outra é um
 * facto (correcção do promotor, 28/10/2026).
 *
 * Falta aqui «alternativa proposta», que o promotor também pediu: exige uma coluna nova na linha da
 * proposta e fica para a migração própria. Não se adivinha por semelhança de categoria — adivinhar
 * é exactamente o que esta lista existe para evitar.
 */
export const ESTADOS_NO_PEDIDO = ['incluido', 'opcional', 'condicionado', 'excluido', 'nao_indicado'] as const;
export type EstadoNoPedido = (typeof ESTADOS_NO_PEDIDO)[number];

export const ESTADO_LABELS: Record<EstadoNoPedido, string> = {
  incluido: 'Incluído no preço',
  opcional: 'Opcional, com preço',
  condicionado: 'Só depois de observar',
  excluido: 'Excluído',
  nao_indicado: 'Não indicado',
};

/** O que o cliente faz a seguir. Vazio quando não há nada a fazer. */
export const ESTADO_ACCAO: Record<EstadoNoPedido, string> = {
  incluido: '',
  opcional: 'Decidir se quer',
  condicionado: 'Perguntar o que pode mudar',
  excluido: 'Contar com outro para este trabalho',
  nao_indicado: 'Perguntar se está incluído',
};

/** Estados que deixam uma pergunta por fazer antes de escolher. */
export const porEsclarecer = (e: EstadoNoPedido) => e === 'condicionado' || e === 'nao_indicado';

const DE_INCLUSAO: Record<Inclusion, EstadoNoPedido> = {
  incluido: 'incluido',
  opcional: 'opcional',
  condicionado: 'condicionado',
  nao_incluido: 'excluido',
};

/** Entre dois estados do mesmo trabalho, o que mais compromete o pintor. */
const FORCA: EstadoNoPedido[] = ['incluido', 'opcional', 'condicionado', 'excluido', 'nao_indicado'];

export interface TrabalhoNaProposta {
  work: DesiredWork;
  label: string;
  estado: EstadoNoPedido;
  /** Quantidade declarada, em centésimos da unidade; null quando as linhas usam unidades diferentes. */
  quantidade: number | null;
  unidade: Unit | null;
  /** Demãos, quando todas as linhas deste trabalho dizem o mesmo. Null = não indicado ou em desacordo. */
  demaos: number | null;
  /** Produtos nomeados neste trabalho, sem repetidos. */
  produtos: string[];
  /** Soma das linhas incluídas deste trabalho. Zero quando não há nenhuma. */
  precoCents: Cents;
}

export function trabalhosDaProposta(
  pedidos: readonly DesiredWork[],
  linhas: readonly ProposalLine[],
): TrabalhoNaProposta[] {
  return pedidos.map((w) => {
    const def = workForRequested(w);
    const label = def?.label ?? DESIRED_WORK_LABELS[w];
    const minhas = def ? linhas.filter((l) => l.trabalho === def.code) : [];
    if (minhas.length === 0) {
      return { work: w, label, estado: 'nao_indicado', quantidade: null, unidade: null, demaos: null, produtos: [], precoCents: 0 };
    }

    const estados = minhas.map((l) => DE_INCLUSAO[l.inclusao]);
    const estado = FORCA.find((e) => estados.includes(e)) ?? 'nao_indicado';

    // Só se soma quantidade dentro da mesma unidade: m² com metros não dá número nenhum.
    const unidades = [...new Set(minhas.map((l) => l.unidade))];
    const unidade = unidades.length === 1 ? unidades[0]! : null;
    const quantidade = unidade && unidade !== 'vg' ? minhas.reduce((n, l) => n + l.quantidade, 0) : null;

    // Demãos: só valem se todas as linhas que as declaram disserem o mesmo. Em desacordo, nada —
    // uma média de demãos não existe em obra.
    const declaradas = [...new Set(minhas.map((l) => l.demaos).filter((d): d is number => typeof d === 'number' && d > 0))];
    const demaos = declaradas.length === 1 ? declaradas[0]! : null;

    const produtos = [...new Set(minhas.map((l) => l.produto?.trim()).filter((p): p is string => Boolean(p)))];
    const precoCents = minhas.filter((l) => l.inclusao === 'incluido').reduce((n, l) => n + lineTotal(l), 0);

    return { work: w, label, estado, quantidade, unidade, demaos, produtos, precoCents };
  });
}

/** "240 m²", "12 m", "verba global" — ou nada, quando as unidades não se somam. */
export function quantidadeEmPalavras(t: Pick<TrabalhoNaProposta, 'quantidade' | 'unidade'>): string | null {
  if (t.unidade === 'vg') return UNIT_LABELS.vg;
  if (t.quantidade === null || !t.unidade) return null;
  return `${(t.quantidade / 100).toLocaleString('pt-PT', { maximumFractionDigits: 2 })} ${UNIT_LABELS[t.unidade]}`;
}

/**
 * A cobertura dita por extenso, e nunca em percentagem.
 *
 * «Dez em doze trabalhos» não diz nada se os dois que faltam forem a impermeabilização das
 * platibandas: contar trabalhos trata a limpeza final e a impermeabilização como iguais, e nunca
 * são (correcção do promotor, 28/10/2026).
 */
export function coberturaEmPalavras(ts: readonly TrabalhoNaProposta[]): string {
  if (ts.length === 0) return 'O pedido não enumera trabalhos.';
  const nomes = (e: EstadoNoPedido) => ts.filter((t) => t.estado === e).map((t) => t.label.toLocaleLowerCase('pt-PT'));
  const excluidos = nomes('excluido');
  const naoIndicados = nomes('nao_indicado');
  const opcionais = nomes('opcional');
  const condicionados = nomes('condicionado');

  if (excluidos.length === 0 && naoIndicados.length === 0 && opcionais.length === 0 && condicionados.length === 0) {
    return 'Inclui todos os trabalhos pedidos.';
  }
  const partes = [
    excluidos.length ? `exclui ${lista(excluidos)}` : '',
    naoIndicados.length ? `não indica ${lista(naoIndicados)}` : '',
    opcionais.length ? `deixa ${lista(opcionais)} como opcional` : '',
    condicionados.length ? `só orçamenta ${lista(condicionados)} depois de ver` : '',
  ].filter(Boolean);
  // As orações separam-se por ponto e vírgula, e só os itens dentro de cada uma levam "e". Com "e"
  // nos dois sítios saía "não indica lavagem e limpeza e reparação de fissuras e deixa como
  // opcional impermeabilização", que ninguém lê até ao fim.
  const frase = partes.join('; ');
  const incluidos = nomes('incluido');

  // "Inclui os trabalhos pedidos, mas não indica três deles" é enganador: só se diz assim quando o
  // que falta é a excepção. Quando os incluídos são minoria, nomeiam-se — é a leitura honesta de
  // uma proposta que só orçamentou parte da obra.
  if (incluidos.length === 0) return `${frase[0]!.toLocaleUpperCase('pt-PT')}${frase.slice(1)}.`;
  if (incluidos.length * 2 < ts.length) return `Inclui apenas ${lista(incluidos)}; ${frase}.`;
  return `Inclui os trabalhos pedidos, mas ${frase}.`;
}

function lista(xs: readonly string[], ultimo = ' e '): string {
  if (xs.length <= 1) return xs[0] ?? '';
  return `${xs.slice(0, -1).join(', ')}${ultimo}${xs[xs.length - 1]}`;
}

// --- Classificação em três dimensões ------------------------------------------------
//
// Em vez de uma escala única — que exigiria pesos, e pesos são uma opinião escrita em números —
// três leituras independentes (decisão do promotor, 28/10/2026). Nenhuma delas pontua: cada uma diz
// o que se passa, em palavras, e o cliente pesa-as como lhe convier.

export interface SinaisDaProposta {
  trabalhos: TrabalhoNaProposta[];
  /** Há linhas cujo preço só se fecha depois de observar. */
  temCondicionados: boolean;
  /** Zonas do pedido sem nenhuma linha incluída que as cubra. */
  zonasSemPreco: number;
  /** Preço fechado da obra toda, sem repartição por trabalho. */
  precoGlobal: boolean;
  /** Produtos que o cliente pediu: quantos a proposta segue, substitui, ou não refere. */
  produtosPedidos?: { segue: number; substitui: number; semIndicacao: number };
}

export interface Leitura {
  frase: string;
  /** O que impede de dar a dimensão por resolvida. Vazio = está resolvida. */
  reparos: string[];
}

/**
 * Os trabalhos que se aplicam por camadas: neles, o número de demãos é um requisito técnico e a sua
 * falta é uma lacuna. Uma lavagem ou uma reparação de fissuras não tem demãos, e exigir-lhas daria
 * um reparo falso.
 */
export const TRABALHOS_COM_DEMAOS: readonly DesiredWork[] = ['primario', 'pintura', 'impermeabilizacao', 'tratamento_metais'];

export interface Classificacao {
  cobertura: Leitura & { completa: boolean; porEsclarecer: number; semPrecoFirme: number };
  definicao: Leitura & { definido: boolean };
  /**
   * `confirmada` não quer dizer que a execução corresponda ao que foi pedido — isso exigiria
   * verificar preparação do suporte, sistema, consumo e compatibilidade, que a proposta não é
   * obrigada a declarar. Quer dizer que **o que é verificável nos dados está preenchido**. A frase
   * descreve o que foi verificado; nunca declara conformidade (correcção do promotor, 29/10/2026).
   */
  tecnica: Leitura & { confirmada: boolean };
}

export function classificar(s: SinaisDaProposta): Classificacao {
  const porEsclarecerN = s.trabalhos.filter((t) => porEsclarecer(t.estado)).length;
  const excluidos = s.trabalhos.filter((t) => t.estado === 'excluido').length;
  // Âmbito e preço são perguntas diferentes, e juntá-las escondia qual dos dois riscos se corria
  // (correcção do promotor, 29/10/2026). Um trabalho **condicionado está previsto** — o que falta é
  // o preço fechar depois de observar. Um **não indicado** é silêncio sobre o próprio trabalho.
  // Por isso o condicionado conta nas duas dimensões, e o não indicado só no âmbito.
  const semPrecoFirme = s.trabalhos.filter((t) => t.estado === 'condicionado').length;
  const naoIndicados = s.trabalhos.filter((t) => t.estado === 'nao_indicado').length;
  const completa = s.trabalhos.length > 0 && s.trabalhos.every((t) => t.estado === 'incluido');

  const reparosCobertura = [
    excluidos ? `${excluidos} ${excluidos === 1 ? 'trabalho excluído' : 'trabalhos excluídos'}` : '',
    naoIndicados ? `${naoIndicados} ${naoIndicados === 1 ? 'trabalho não indicado' : 'trabalhos não indicados'}` : '',
    semPrecoFirme ? `${semPrecoFirme} ${semPrecoFirme === 1 ? 'trabalho com preço por fechar' : 'trabalhos com preço por fechar'}` : '',
    s.zonasSemPreco ? `${s.zonasSemPreco} ${s.zonasSemPreco === 1 ? 'zona sem preço' : 'zonas sem preço'}` : '',
  ].filter(Boolean);

  // A definição é sobre o preço e as condições, não sobre o âmbito: uma proposta pode cobrir tudo e
  // ter metade sujeita a observação.
  const reparosDefinicao = [
    s.temCondicionados ? 'parte do preço só se fecha depois de observar' : '',
    s.zonasSemPreco ? 'há zonas do pedido sem preço' : '',
    // Preço global não é falta de definição — é falta de repartição. Diz-se, sem contar como reparo
    // da definição, porque o que o cliente paga está firme.
  ].filter(Boolean);
  const definido = reparosDefinicao.length === 0;

  const incluidos = s.trabalhos.filter((t) => t.estado === 'incluido');
  const semProduto = incluidos.filter((t) => t.produtos.length === 0).length;
  const semDemaos = incluidos.filter((t) => TRABALHOS_COM_DEMAOS.includes(t.work) && t.demaos === null).length;
  const p = s.produtosPedidos;
  const reparosTecnica = [
    p && p.substitui ? `substitui ${p.substitui} ${p.substitui === 1 ? 'produto pedido' : 'produtos pedidos'}` : '',
    p && p.semIndicacao ? `não diz o que usa em ${p.semIndicacao} ${p.semIndicacao === 1 ? 'produto pedido' : 'produtos pedidos'}` : '',
    !p && semProduto ? `${semProduto} ${semProduto === 1 ? 'trabalho incluído sem produto nomeado' : 'trabalhos incluídos sem produto nomeado'}` : '',
    semDemaos ? `não indica as demãos em ${semDemaos} ${semDemaos === 1 ? 'trabalho que as leva' : 'trabalhos que as levam'}` : '',
  ].filter(Boolean);

  return {
    cobertura: {
      completa,
      porEsclarecer: porEsclarecerN,
      semPrecoFirme,
      frase: coberturaEmPalavras(s.trabalhos),
      reparos: reparosCobertura,
    },
    definicao: {
      definido,
      frase: definido
        ? s.precoGlobal
          ? 'Total apresentado, a preço global: não se reparte por trabalho.'
          : 'Total apresentado, com preço por trabalho.'
        : `Total apresentado, mas ${junta(reparosDefinicao)}.`,
      reparos: reparosDefinicao,
    },
    tecnica: {
      confirmada: reparosTecnica.length === 0,
      // Mesmo sem reparos, a frase diz o que foi verificado e não que a execução corresponde ao
      // pedido: nomear o produto é preenchimento, não correspondência técnica.
      frase: reparosTecnica.length === 0
        ? p
          ? 'Segue os produtos pedidos e indica as demãos.'
          : 'Identifica produto e demãos em todos os trabalhos incluídos.'
        : `Correspondência técnica por confirmar: ${junta(reparosTecnica)}.`,
      reparos: reparosTecnica,
    },
  };
}

// --- Ordenação ----------------------------------------------------------------------
//
// Ordenar sem afirmar que uma proposta é globalmente melhor. O critério está sempre à vista, e
// **comissões da plataforma, promoções e relações comerciais nunca o alteram** — mesma família da
// regra 15 do CLAUDE.md: o dinheiro da plataforma não entra na decisão do cliente.

export const ORDENS = ['padrao', 'preco', 'cobertura', 'esclarecer', 'duracao', 'inicio'] as const;
export type Ordem = (typeof ORDENS)[number];

export const ORDEM_LABELS: Record<Ordem, string> = {
  padrao: 'Completas e com preço firme primeiro',
  preco: 'Menor valor total a pagar',
  cobertura: 'Maior cobertura do pedido',
  esclarecer: 'Menos pontos por esclarecer',
  duracao: 'Menor duração prevista',
  inicio: 'Data de início mais próxima',
};

export interface Ordenavel {
  id: string;
  totalComIva: Cents;
  completa: boolean;
  definido: boolean;
  porEsclarecer: number;
  trabalhosIncluidos: number;
  duracaoDias: number | null;
  /** AAAA-MM-DD, ou null. */
  inicioPossivel: string | null;
}

export interface GrupoOrdenado<T> {
  titulo: string;
  nota: string;
  propostas: T[];
}

const LONGE = Number.MAX_SAFE_INTEGER;

/**
 * Por omissão, dois grupos: primeiro as propostas que incluem todos os trabalhos pedidos **e** têm
 * o preço firme, por total a pagar; depois as restantes, com as pendências à vista. Se nenhuma
 * reunir as condições, diz-se — e nenhuma fica escondida.
 *
 * Com um critério escolhido, uma lista só, por esse critério e mais nada.
 */
export function ordenar<T extends Ordenavel>(ps: readonly T[], ordem: Ordem): GrupoOrdenado<T>[] {
  const porTotal = (a: T, b: T) => a.totalComIva - b.totalComIva;
  if (ordem !== 'padrao') {
    const chave = (x: T) =>
      ordem === 'preco' ? x.totalComIva
      : ordem === 'cobertura' ? -x.trabalhosIncluidos
      : ordem === 'esclarecer' ? x.porEsclarecer
      : ordem === 'duracao' ? (x.duracaoDias ?? LONGE)
      : x.inicioPossivel ? Number(x.inicioPossivel.replaceAll('-', '')) : LONGE;
    return [{ titulo: ORDEM_LABELS[ordem], nota: 'A ordenação é só por este critério; não é uma recomendação.', propostas: [...ps].sort((a, b) => chave(a) - chave(b) || porTotal(a, b)) }];
  }

  const prontas = ps.filter((x) => x.completa && x.definido).sort(porTotal);
  const resto = ps.filter((x) => !(x.completa && x.definido)).sort(porTotal);
  if (prontas.length === 0) {
    return [{
      titulo: 'Todas as propostas',
      nota: 'Nenhuma inclui todos os trabalhos pedidos com o preço firme. Veja as pendências de cada uma antes de escolher.',
      propostas: resto,
    }];
  }
  const grupos: GrupoOrdenado<T>[] = [{
    titulo: 'Incluem tudo o que pediu, com preço firme',
    nota: 'Por total a pagar. Dentro deste grupo, a comparação de preço é directa.',
    propostas: prontas,
  }];
  if (resto.length > 0) {
    grupos.push({
      titulo: 'Com pendências',
      nota: 'Falta-lhes algum trabalho pedido, ou parte do preço ainda não está firme.',
      propostas: resto,
    });
  }
  return grupos;
}

const junta = (xs: readonly string[]) => (xs.length <= 1 ? (xs[0] ?? '') : `${xs.slice(0, -1).join(', ')} e ${xs[xs.length - 1]}`);
