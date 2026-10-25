import type { Cents } from './money';
import { DIA_NORMAL } from './dayLog';

// Trabalho suplementar (25/10/2026, docs/DECISOES.md).
//
// Registar dez horas ao preço de oito mente na margem — e a margem é a única razão por que estas
// horas se registam. O acréscimo legal não é pequeno: a partir das 100 horas anuais por trabalhador,
// duplica.
//
// Acréscimos do artigo 268.º do Código do Trabalho, confirmados a 25/10/2026:
//
//                                   até 100 h/ano    acima de 100 h/ano
//   1.ª hora em dia útil                 +25%              +50%
//   horas seguintes em dia útil        +37,5%              +75%
//   descanso semanal ou feriado          +50%             +100%
//
// Estes são os mínimos legais. Um contrato colectivo pode ser mais favorável, e por isso a empresa
// pode guardar os seus próprios acréscimos — como na biblioteca de preços, o que vale é o número
// dela. A aplicação calcula; quem decide o que paga é a empresa e o seu contabilista.

export const TIPOS_DIA = ['util', 'descanso'] as const;
export type TipoDia = (typeof TIPOS_DIA)[number];
export const TIPO_DIA_LABELS: Record<TipoDia, string> = {
  util: 'Dia útil',
  descanso: 'Descanso semanal ou feriado',
};

/** Limiar anual, por trabalhador, a partir do qual os acréscimos duplicam (Lei n.º 13/2023). */
export const LIMIAR_ANUAL = 10_000; // 100 horas, em centésimos

export interface Acrescimos {
  /** Pontos-base sobre o custo/hora. 2500 = +25%. */
  primeiraHoraUtil: number;
  seguintesUtil: number;
  descanso: number;
  primeiraHoraUtilAcima: number;
  seguintesUtilAcima: number;
  descansoAcima: number;
}

/** Os mínimos legais, usados quando a empresa não guardou os seus. */
export const ACRESCIMOS_LEGAIS: Acrescimos = {
  primeiraHoraUtil: 2_500,
  seguintesUtil: 3_750,
  descanso: 5_000,
  primeiraHoraUtilAcima: 5_000,
  seguintesUtilAcima: 7_500,
  descansoAcima: 10_000,
};

export interface DiaTrabalhado {
  /** Horas do dia, em centésimos. */
  horas: number;
  tipoDia: TipoDia;
}

export interface CustoDoDia {
  /** Horas pagas ao valor normal, em centésimos. */
  normais: number;
  /** Horas com acréscimo, em centésimos. */
  suplementares: number;
  custoNormal: Cents;
  /** Só o acréscimo, para se ver quanto custou a mais do que um dia normal. */
  custoAcrescimo: Cents;
  custoTotal: Cents;
}

const parte = (horas: number, custoHora: Cents, bp: number): Cents => Math.round((horas * custoHora * bp) / 1_000_000);

/**
 * Quanto custa um dia a esta pessoa, já com o trabalho suplementar.
 *
 * `suplementaresAntes` são as horas suplementares que ela já fez este ano **antes deste dia**: é o
 * que decide se os acréscimos vão em singelo ou em dobro. Num dia de descanso ou feriado, todas as
 * horas são suplementares — não há parte normal.
 */
export function custoDoDia(
  dia: DiaTrabalhado,
  custoHora: Cents,
  suplementaresAntes: number,
  acrescimos: Acrescimos = ACRESCIMOS_LEGAIS,
): CustoDoDia {
  const horas = Math.max(0, dia.horas);
  const normais = dia.tipoDia === 'descanso' ? 0 : Math.min(horas, DIA_NORMAL);
  const suplementares = horas - normais;

  const custoNormal = Math.round((normais * custoHora) / 100);
  if (suplementares === 0) return { normais, suplementares: 0, custoNormal, custoAcrescimo: 0, custoTotal: custoNormal };

  // O limiar atravessa-se a meio de um dia: as horas até às 100 anuais vão em singelo e as de lá para
  // cima em dobro, hora a hora — não o dia inteiro por causa da última hora.
  const ateLimiar = Math.max(0, Math.min(suplementares, LIMIAR_ANUAL - suplementaresAntes));
  const acimaLimiar = suplementares - ateLimiar;

  let custoAcrescimo = 0;
  if (dia.tipoDia === 'descanso') {
    custoAcrescimo += parte(ateLimiar, custoHora, acrescimos.descanso);
    custoAcrescimo += parte(acimaLimiar, custoHora, acrescimos.descansoAcima);
    // Em dia de descanso a hora também se paga, além do acréscimo.
    return {
      normais,
      suplementares,
      custoNormal,
      custoAcrescimo,
      custoTotal: custoNormal + Math.round((suplementares * custoHora) / 100) + custoAcrescimo,
    };
  }

  // Em dia útil, a primeira hora suplementar tem acréscimo menor do que as seguintes.
  const primeira = Math.min(suplementares, 100);
  const seguintes = suplementares - primeira;
  const primeiraAteLimiar = Math.min(primeira, ateLimiar);
  const primeiraAcima = primeira - primeiraAteLimiar;
  const seguintesAteLimiar = Math.max(0, ateLimiar - primeira);
  const seguintesAcima = seguintes - seguintesAteLimiar;

  custoAcrescimo += parte(primeiraAteLimiar, custoHora, acrescimos.primeiraHoraUtil);
  custoAcrescimo += parte(primeiraAcima, custoHora, acrescimos.primeiraHoraUtilAcima);
  custoAcrescimo += parte(seguintesAteLimiar, custoHora, acrescimos.seguintesUtil);
  custoAcrescimo += parte(seguintesAcima, custoHora, acrescimos.seguintesUtilAcima);

  return {
    normais,
    suplementares,
    custoNormal,
    custoAcrescimo,
    custoTotal: custoNormal + Math.round((suplementares * custoHora) / 100) + custoAcrescimo,
  };
}

/** Horas suplementares de um dia, sem contas de dinheiro — para contadores e avisos. */
export const suplementaresDe = (dia: DiaTrabalhado): number =>
  dia.tipoDia === 'descanso' ? Math.max(0, dia.horas) : Math.max(0, dia.horas - DIA_NORMAL);

/**
 * Aviso sobre o acumulado anual de uma pessoa. Não impede nada: os limites dependem da dimensão da
 * empresa e do contrato colectivo, e não é a plataforma que os vai decidir por ela.
 */
export function avisoAnual(suplementaresNoAno: number): string | null {
  if (suplementaresNoAno >= LIMIAR_ANUAL) {
    return 'Passou as 100 horas suplementares este ano: a partir daqui os acréscimos são o dobro.';
  }
  if (suplementaresNoAno >= LIMIAR_ANUAL * 0.8) {
    const faltam = (LIMIAR_ANUAL - suplementaresNoAno) / 100;
    return `Faltam ${faltam.toLocaleString('pt-PT', { maximumFractionDigits: 1 })} horas para as 100 anuais, a partir das quais os acréscimos duplicam.`;
  }
  return null;
}

export interface LinhaDeHoras {
  /** Identificador da linha, para se saber a que dia pertence cada custo devolvido. */
  id: string;
  /** Quem fez as horas. Sem pessoa, não há contagem anual possível. */
  memberId: string | null;
  /** AAAA-MM-DD. A ordem das datas é o que decide quem passou o limiar e quando. */
  data: string | null;
  horas: number;
  custoHora: Cents | null;
  tipoDia: TipoDia | null;
}

/**
 * O custo de cada dia de trabalho, calculado sobre **todas as obras da empresa**.
 *
 * O limiar das 100 horas anuais é por trabalhador, não por obra. Contá-lo dentro de cada obra
 * separadamente fazia com que um pintor que anda em três obras nunca lá chegasse em nenhuma, e o
 * custo saía por baixo — era uma aproximação conhecida desde 26/10/2026 e passa a erro assim que um
 * dia se reparte por dois locais, que é o que a proposta de Gestão de Obra introduz.
 *
 * Não se consegue corrigir dentro de uma obra: o acréscimo de um dia depende das horas feitas antes
 * **daquela data**, onde quer que tenham sido feitas. Por isso o cálculo é central e cada obra
 * consome o que lhe toca.
 */
export function custoDasHoras(linhas: LinhaDeHoras[], acrescimos: Acrescimos = ACRESCIMOS_LEGAIS): Map<string, CustoDoDia> {
  // Por data, e com a ordem original a desempatar, para o resultado não depender da base de dados.
  const ordenadas = linhas
    .map((l, i) => ({ l, i }))
    .sort((a, b) => (a.l.data ?? '').localeCompare(b.l.data ?? '') || a.i - b.i)
    .map((x) => x.l);

  const acumulado = new Map<string, number>();
  const porLinha = new Map<string, CustoDoDia>();
  for (const l of ordenadas) {
    const chave = `${l.memberId ?? 'sem-pessoa'}|${(l.data ?? '').slice(0, 4)}`;
    const antes = acumulado.get(chave) ?? 0;
    const dia = { horas: l.horas, tipoDia: l.tipoDia ?? ('util' as const) };
    porLinha.set(l.id, custoDoDia(dia, l.custoHora ?? 0, antes, acrescimos));
    acumulado.set(chave, antes + suplementaresDe(dia));
  }
  return porLinha;
}
