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
  // Quando sobra alguma coisa incluída, diz-se primeiro o que inclui; quando não sobra nada, a
  // frase começa pela ressalva e leva maiúscula.
  const haIncluidos = excluidos.length + naoIndicados.length + opcionais.length + condicionados.length < ts.length;
  return haIncluidos ? `Inclui os trabalhos pedidos, mas ${frase}.` : `${frase[0]!.toLocaleUpperCase('pt-PT')}${frase.slice(1)}.`;
}

function lista(xs: readonly string[], ultimo = ' e '): string {
  if (xs.length <= 1) return xs[0] ?? '';
  return `${xs.slice(0, -1).join(', ')}${ultimo}${xs[xs.length - 1]}`;
}
