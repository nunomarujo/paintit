import type { Cents } from './money';
import { REGRAS_DAS_INDICACOES } from './metodologia';
import type { Indicacoes } from './indicacoes';

/**
 * A matriz: **uma linha por proposta**, para quando são muitas.
 *
 * A tabela de síntese põe os critérios à esquerda e uma coluna por proposta, e lê-se muito bem — até
 * às quatro colunas. Depois disso não cabe na folha, porque o total a 14pt impõe uma largura mínima
 * a cada coluna. A matriz resolve isso mudando de forma em vez de encolher a letra: com dez
 * candidatos são dez linhas, e uma folha A4 tem altura para elas (ideia do promotor, 29/10/2026).
 *
 * As duas convivem: a matriz dá a vista de todos, a síntese transposta serve a comparação final de
 * duas ou três.
 *
 * **Histórico curto não é mau histórico.** Abaixo de três avaliações escreve-se que o histórico
 * ainda é limitado, e não uma nota baixa: um pintor novo não é um pintor pior, e apresentá-lo como
 * tal seria uma barreira à entrada criada por nós.
 */

/** Abaixo disto, a média diria mais sobre o acaso do que sobre o pintor. */
export const AVALIACOES_MINIMAS = 3;

export interface Celula {
  texto: string;
  /** Pede atenção: sai em texto âmbar, nunca em fundo de cor (CLAUDE.md, regra 13). */
  atencao: boolean;
}

export interface LinhaDaMatriz {
  propostaId: string;
  alias: string;
  total: string;
  pedido: Celula;
  custosPorFechar: Celula;
  reputacao: Celula;
  /** Os nomes das indicações desta proposta. Vazio é o caso normal, não uma falha. */
  indicacoes: string[];
}

export interface PropostaNaMatriz {
  id: string;
  alias: string;
  totalComIva: Cents;
  /**
   * Trabalhos pedidos sobre os quais a proposta **não se pronuncia**. Não indicar não comprova
   * exclusão: o pintor pode tê-los esquecido ou dado por implícitos, e afirmar que não os faz é
   * pôr-lhe na boca o que não disse (correcção do promotor, 29/10/2026).
   */
  naoIndicados: number;
  /** Trabalhos pedidos que a proposta **declara expressamente** que não faz. */
  excluidos: number;
  /**
   * Quantos trabalhos o pedido indica. Zero acontece na base real — há pedidos publicados com a
   * lista vazia — e sem isto a matriz dizia «Completo», porque não havia nada por esclarecer nem
   * excluído. Cobrir zero trabalhos não é cobrir o pedido: é não haver pedido que se cubra.
   */
  trabalhosPedidos: number;
  /** Trabalhos previstos cujo preço só fecha depois de observar. */
  semPrecoFirme: number;
  /** Zonas do pedido sem nenhuma linha que as cubra. */
  zonasSemPreco: number;
  /** Média das avaliações e quantas são. Null quando ainda não há nenhuma. */
  avaliacao: { media: number; n: number } | null;
}

const NOME_DA_INDICACAO = new Map(REGRAS_DAS_INDICACOES.map((r) => [r.id, r.nome]));

export function matrizDasPropostas(
  ps: PropostaNaMatriz[],
  ind: Indicacoes,
  formata: (c: Cents) => string,
): LinhaDaMatriz[] {
  return ps.map((p) => ({
    propostaId: p.id,
    alias: p.alias,
    total: formata(p.totalComIva),
    pedido: celulaDoPedido(p),
    custosPorFechar: celulaDosCustos(p),
    reputacao: celulaDaReputacao(p.avaliacao),
    indicacoes: ind.atribuidas.filter((x) => x.propostaId === p.id).map((x) => NOME_DA_INDICACAO.get(x.indicacao) ?? x.indicacao),
  }));
}

/**
 * «Em falta» juntava duas coisas diferentes e dizia mal as duas. Um trabalho que a proposta não
 * refere está **por esclarecer**; um que ela declara não fazer está **excluído**. A diferença muda o
 * que o cliente tem de fazer a seguir: num caso pergunta, no outro contrata a outra pessoa.
 */
function celulaDoPedido(p: PropostaNaMatriz): Celula {
  if (p.trabalhosPedidos === 0) {
    return { texto: 'Pedido sem trabalhos indicados', atencao: true };
  }
  if (p.naoIndicados === 0 && p.excluidos === 0) return { texto: 'Completo', atencao: false };
  const partes = [
    p.naoIndicados ? `${p.naoIndicados} por esclarecer` : '',
    p.excluidos ? `${p.excluidos} ${p.excluidos === 1 ? 'excluído' : 'excluídos'}` : '',
  ].filter(Boolean);
  return { texto: partes.join(', '), atencao: true };
}

function celulaDosCustos(p: PropostaNaMatriz): Celula {
  const partes = [
    p.semPrecoFirme ? `${p.semPrecoFirme} após observação` : '',
    p.zonasSemPreco ? `${p.zonasSemPreco} ${p.zonasSemPreco === 1 ? 'zona sem preço' : 'zonas sem preço'}` : '',
  ].filter(Boolean);
  // «Não» afirmava que não há custos por fechar. O que se sabe é que não foram declarados — e a
  // diferença importa: a proposta pode simplesmente não se pronunciar sobre o que a faria variar.
  return partes.length === 0
    ? { texto: 'Nenhum declarado', atencao: false }
    : { texto: partes.join(', '), atencao: true };
}

/**
 * Sem avaliações suficientes diz-se isso, e não um número. O `atencao` fica a falso de propósito:
 * um histórico curto é uma informação em falta, não um defeito da proposta — pintá-lo de âmbar
 * seria usar o aviso contra quem ainda não teve ocasião de o construir.
 */
function celulaDaReputacao(a: PropostaNaMatriz['avaliacao']): Celula {
  if (!a || a.n < AVALIACOES_MINIMAS) {
    return { texto: a && a.n > 0 ? `Histórico ainda limitado (${a.n})` : 'Sem obras avaliadas', atencao: false };
  }
  const media = a.media.toLocaleString('pt-PT', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  return { texto: `${media}/5 · ${a.n} ${a.n === 1 ? 'obra' : 'obras'}`, atencao: false };
}
