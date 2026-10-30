/**
 * A fila de envio de fotografias: o que já foi, o que vai agora, o que falhou.
 *
 * ## Porque é que isto é domínio e não um `useState` qualquer
 *
 * O promotor pediu que ao escolher várias imagens se mostrasse «progresso, sucesso ou falha por
 * ficheiro». A tentação é uma barra a andar sozinha. Não há barra honesta: um envio feito por uma
 * *server action* não devolve bytes transferidos, e uma barra inventada é uma mentira animada. O
 * que se sabe de verdade é a posição na fila — **a enviar a 3.ª de 7** — e o resultado de cada uma.
 * É isso que se conta, e é isso que estas funções calculam.
 *
 * ## Uma de cada vez
 *
 * Os envios são sequenciais. Em obra, de telemóvel, oito envios em paralelo competem pela mesma
 * ligação e o que se vê é tudo parado ao mesmo tempo; um a um, a primeira fotografia chega depressa
 * e vê-se a fila a andar. Também é o que permite dizer «3 de 7» sem ser falso.
 */

export type EstadoDoFicheiro = 'na_fila' | 'a_enviar' | 'enviado' | 'falhou';

export interface FicheiroNaFila {
  /** Identificador local, só para a lista no ecrã. */
  id: string;
  nome: string;
  estado: EstadoDoFicheiro;
  /** Porque falhou, nas palavras do servidor. Só quando `estado === 'falhou'`. */
  erro?: string;
}

export const ESTADO_DO_FICHEIRO_LABELS: Record<EstadoDoFicheiro, string> = {
  na_fila: 'Na fila',
  a_enviar: 'A enviar…',
  enviado: 'Enviada',
  falhou: 'Não foi possível enviar',
};

export interface ResumoDaFila {
  total: number;
  enviados: number;
  falhados: number;
  /** Quantas faltam, contando a que está a ser enviada. */
  porEnviar: number;
  /** A posição da que vai agora, a contar de 1. Zero quando não há nenhuma a caminho. */
  aEnviarNumero: number;
  terminou: boolean;
  /** O que se diz ao cliente. Uma frase, sempre verdadeira. */
  texto: string;
}

export function resumoDaFila(fila: readonly FicheiroNaFila[]): ResumoDaFila {
  const total = fila.length;
  const enviados = fila.filter((f) => f.estado === 'enviado').length;
  const falhados = fila.filter((f) => f.estado === 'falhou').length;
  const porEnviar = total - enviados - falhados;
  const aEnviar = fila.some((f) => f.estado === 'a_enviar');
  const aEnviarNumero = aEnviar ? enviados + falhados + 1 : 0;
  const terminou = total > 0 && porEnviar === 0;

  const plural = (n: number, uma: string, varias: string) => (n === 1 ? uma : varias);
  const texto =
    total === 0
      ? ''
      : aEnviar
        ? `A enviar a ${aEnviarNumero}.ª de ${total}.`
        : porEnviar > 0
          ? `${porEnviar} ${plural(porEnviar, 'fotografia à espera', 'fotografias à espera')}.`
          : falhados === 0
            ? `${enviados} ${plural(enviados, 'fotografia enviada', 'fotografias enviadas')}.`
            : enviados === 0
              ? `${falhados} ${plural(falhados, 'fotografia não foi enviada', 'fotografias não foram enviadas')}.`
              : `${enviados} ${plural(enviados, 'enviada', 'enviadas')}, ${falhados} ${plural(falhados, 'não foi', 'não foram')}.`;

  return { total, enviados, falhados, porEnviar, aEnviarNumero, terminou, texto };
}

/** A próxima a enviar, ou nada se já não há nenhuma à espera. */
export function proximoAEnviar(fila: readonly FicheiroNaFila[]): FicheiroNaFila | undefined {
  // Com uma a caminho não se começa outra: os envios são sequenciais, de propósito.
  if (fila.some((f) => f.estado === 'a_enviar')) return undefined;
  return fila.find((f) => f.estado === 'na_fila');
}

/**
 * Quantas das escolhidas cabem no pedido, e quantas ficam de fora.
 *
 * Dizer «cada pedido tem no máximo 20 fotografias» depois de alguém escolher trinta, e recusar as
 * trinta, é pior do que receber as que cabem. Aceita-se o que cabe e diz-se quantas ficaram.
 */
export function cabem(jaTem: number, aEscolher: number, maximo: number): { aceitas: number; recusadas: number } {
  const espaco = Math.max(0, maximo - jaTem);
  const aceitas = Math.min(aEscolher, espaco);
  return { aceitas, recusadas: aEscolher - aceitas };
}
