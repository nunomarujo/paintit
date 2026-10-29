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
   * Trabalhos do pedido excluídos ou não referidos. **É este campo, e só este, que decide se o
   * pedido está coberto** — um trabalho condicionado está previsto, e o que lhe falta é o preço
   * fechar, não o âmbito. Guardar à parte um `cobreTudo` deixava os dois divergirem, e divergiam:
   * uma proposta com um trabalho condicionado aparecia com «0 trabalhos em falta» a âmbar.
   */
  emFalta: number;
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
    pedido: p.emFalta === 0
      ? { texto: 'Completo', atencao: false }
      : {
          texto: `${p.emFalta} ${p.emFalta === 1 ? 'trabalho em falta' : 'trabalhos em falta'}`,
          atencao: true,
        },
    custosPorFechar: celulaDosCustos(p),
    reputacao: celulaDaReputacao(p.avaliacao),
    indicacoes: ind.atribuidas.filter((x) => x.propostaId === p.id).map((x) => NOME_DA_INDICACAO.get(x.indicacao) ?? x.indicacao),
  }));
}

function celulaDosCustos(p: PropostaNaMatriz): Celula {
  const partes = [
    p.semPrecoFirme ? `${p.semPrecoFirme} após observação` : '',
    p.zonasSemPreco ? `${p.zonasSemPreco} ${p.zonasSemPreco === 1 ? 'zona sem preço' : 'zonas sem preço'}` : '',
  ].filter(Boolean);
  return partes.length === 0 ? { texto: 'Não', atencao: false } : { texto: partes.join(', '), atencao: true };
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
