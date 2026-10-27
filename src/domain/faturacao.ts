/**
 * Quando é que uma factura por emitir deixa de ser trabalho e passa a ser um problema (27/10/2026).
 *
 * A fila de facturação existe desde 22/10 e funciona — o que não existia era alguém a dar por ela.
 * Até hoje foram emitidos zero documentos, e a fila enche-se sozinha: cada comissão recebida, cada
 * subscrição paga, cada caução retida. Enquanto não houve dinheiro verdadeiro isso não custou nada;
 * com dinheiro verdadeiro, uma fila que ninguém vê é incumprimento fiscal a acumular em silêncio.
 *
 * **O prazo que este ficheiro assume** é a regra geral portuguesa: a factura emite-se até ao 5.º dia
 * útil seguinte ao facto tributável. Está escrito aqui num só sítio para o contabilista do promotor
 * poder confirmar ou corrigir um número, em vez de o procurar espalhado pelo código. A plataforma
 * não decide matéria fiscal: avisa a horas e mostra o que está à espera.
 */

/** Dias úteis até ao limite de emissão, contados a partir do dia seguinte ao facto. */
export const DIAS_UTEIS_PARA_EMITIR = 5;

export type EstadoDaFatura = 'a_tempo' | 'ultimo_dia' | 'fora_de_prazo';

export interface FaturaPendente {
  /** O que a origina, para o aviso poder dizer o quê sem abrir o ecrã. */
  descricao: string;
  /** Data do facto tributável (ISO). */
  data: string;
  valorCents: number;
}

const dia = (iso: string) => new Date(`${iso}T00:00:00Z`);

/**
 * Dias úteis decorridos entre duas datas, sem contar o próprio dia do facto.
 *
 * Só exclui sábados e domingos. **Não conhece feriados** — e isso é de propósito: uma tabela de
 * feriados desactualizada dá um prazo errado com ar de certo. Contar a menos é o erro seguro: avisa
 * mais cedo do que o necessário, nunca mais tarde.
 */
export function diasUteis(de: string, ate: string): number {
  let n = 0;
  const d = dia(de);
  const fim = dia(ate);
  while (d < fim) {
    d.setUTCDate(d.getUTCDate() + 1);
    const semana = d.getUTCDay();
    if (semana !== 0 && semana !== 6) n += 1;
  }
  return n;
}

export function estadoDaFatura(data: string, hoje: string): EstadoDaFatura {
  const passados = diasUteis(data, hoje);
  if (passados > DIAS_UTEIS_PARA_EMITIR) return 'fora_de_prazo';
  if (passados === DIAS_UTEIS_PARA_EMITIR) return 'ultimo_dia';
  return 'a_tempo';
}

export interface ResumoDaFila {
  total: number;
  valorCents: number;
  foraDePrazo: number;
  ultimoDia: number;
  /** A mais antiga, que é a que diz se isto é uma fila ou um descuido. */
  maisAntiga: { descricao: string; data: string; diasUteis: number } | null;
  /** Há alguma coisa que mereça interromper alguém? */
  urgente: boolean;
}

export function resumoDaFila(pendentes: FaturaPendente[], hoje: string): ResumoDaFila {
  if (pendentes.length === 0) {
    return { total: 0, valorCents: 0, foraDePrazo: 0, ultimoDia: 0, maisAntiga: null, urgente: false };
  }
  const estados = pendentes.map((p) => estadoDaFatura(p.data, hoje));
  const antiga = [...pendentes].sort((a, b) => a.data.localeCompare(b.data))[0]!;
  return {
    total: pendentes.length,
    valorCents: pendentes.reduce((n, p) => n + p.valorCents, 0),
    foraDePrazo: estados.filter((e) => e === 'fora_de_prazo').length,
    ultimoDia: estados.filter((e) => e === 'ultimo_dia').length,
    maisAntiga: { descricao: antiga.descricao, data: antiga.data, diasUteis: diasUteis(antiga.data, hoje) },
    urgente: estados.some((e) => e !== 'a_tempo'),
  };
}
