/**
 * Dá para pintar neste dia? (pedido do promotor, 28/10/2026)
 *
 * «Em cronograma seria engraçado ter meteorologia ligada ao local da obra, para dar indicações de
 * temperatura, chuva, humidade do ar.»
 *
 * Um quadro com números é um brinquedo: o pintor já tem meteorologia no telemóvel. O que ele não
 * tem, e é o que decide o dia, é a tradução — **quatro números contra as regras de aplicação de
 * tinta**. Chove, está frio de mais, o ar está húmido de mais, está vento de mais: qualquer um
 * destes estraga uma demão que já foi paga.
 *
 * Os limiares abaixo são os que as fichas técnicas das tintas de exterior repetem (CIN, Barbot,
 * Robbialac e companhia). **São gerais, e a ficha do produto manda sempre** — por isso o ecrã diz a
 * razão de cada veredicto em vez de dar só uma cor: quem conhece o seu produto decide melhor com o
 * motivo à frente do que com um semáforo.
 *
 * A temperatura que conta para o frio é a **mínima**, não a máxima. Uma demão aplicada às três da
 * tarde ainda está a curar às seis da manhã seguinte, e é aí que o filme se perde.
 */

export const LIMIARES = {
  /** Abaixo disto a tinta de base aquosa não forma filme. */
  frioImpeditivo: 5,
  /** Entre este e o anterior, cura mal e devagar. */
  frioDuvidoso: 8,
  /** Acima disto seca antes de alastrar e ficam marcas de retoma. */
  calorDuvidoso: 30,
  calorImpeditivo: 35,
  /** Humidade relativa média do dia, em percentagem. */
  humidadeDuvidosa: 80,
  humidadeImpeditiva: 85,
  /** Probabilidade de precipitação do dia, em percentagem. */
  chuvaDuvidosa: 30,
  chuvaImpeditiva: 60,
  /** Chuva acumulada no dia, em milímetros. */
  chuvaMm: 1,
  /** Vento máximo, km/h: pó, salpico e andaimes. */
  ventoDuvidoso: 40,
  ventoImpeditivo: 60,
} as const;

export interface DiaDeTempo {
  /** AAAA-MM-DD */
  data: string;
  tMin: number;
  tMax: number;
  chuvaMm: number;
  chuvaProb: number;
  humidade: number;
  ventoKmh: number;
}

export type Veredicto = 'sim' | 'talvez' | 'nao';

export interface CondicoesDoDia {
  veredicto: Veredicto;
  /** Porquê, em palavras. Vazio quando o dia está bom. */
  razoes: string[];
}

export const VEREDICTO_LABELS: Record<Veredicto, string> = {
  sim: 'Dá para pintar',
  talvez: 'Com cuidado',
  nao: 'Não dá para pintar',
};

export function condicoesDePintura(d: DiaDeTempo): CondicoesDoDia {
  const impede: string[] = [];
  const duvida: string[] = [];

  if (d.chuvaMm >= LIMIARES.chuvaMm) impede.push(`${arredonda(d.chuvaMm)} mm de chuva`);
  else if (d.chuvaProb >= LIMIARES.chuvaImpeditiva) impede.push(`${d.chuvaProb}% de probabilidade de chuva`);
  else if (d.chuvaProb >= LIMIARES.chuvaDuvidosa) duvida.push(`${d.chuvaProb}% de probabilidade de chuva`);

  if (d.tMin < LIMIARES.frioImpeditivo) impede.push(`mínima de ${arredonda(d.tMin)} °C — abaixo de ${LIMIARES.frioImpeditivo} °C a tinta não forma filme`);
  else if (d.tMin < LIMIARES.frioDuvidoso) duvida.push(`mínima de ${arredonda(d.tMin)} °C, a cura é lenta`);

  if (d.tMax > LIMIARES.calorImpeditivo) impede.push(`máxima de ${arredonda(d.tMax)} °C`);
  else if (d.tMax > LIMIARES.calorDuvidoso) duvida.push(`máxima de ${arredonda(d.tMax)} °C, seca depressa de mais`);

  if (d.humidade >= LIMIARES.humidadeImpeditiva) impede.push(`${Math.round(d.humidade)}% de humidade do ar`);
  else if (d.humidade >= LIMIARES.humidadeDuvidosa) duvida.push(`${Math.round(d.humidade)}% de humidade do ar`);

  if (d.ventoKmh >= LIMIARES.ventoImpeditivo) impede.push(`vento até ${Math.round(d.ventoKmh)} km/h`);
  else if (d.ventoKmh >= LIMIARES.ventoDuvidoso) duvida.push(`vento até ${Math.round(d.ventoKmh)} km/h — pó e salpico`);

  if (impede.length > 0) return { veredicto: 'nao', razoes: impede };
  if (duvida.length > 0) return { veredicto: 'talvez', razoes: duvida };
  return { veredicto: 'sim', razoes: [] };
}

/** Quantos dos próximos dias dão para pintar — a frase que resume a semana. */
export function resumoDaSemana(dias: DiaDeTempo[]): string {
  if (dias.length === 0) return 'Sem previsão para já.';
  const bons = dias.filter((d) => condicoesDePintura(d).veredicto === 'sim').length;
  const maus = dias.filter((d) => condicoesDePintura(d).veredicto === 'nao').length;
  if (bons === dias.length) return `Os ${dias.length} dias dão para pintar.`;
  if (maus === dias.length) return `Nenhum dos ${dias.length} dias dá para pintar no exterior.`;
  // "1 de 3 dias dá": o nome concorda com o total, o verbo com a contagem.
  return `${bons} de ${dias.length} dias ${bons === 1 ? 'dá' : 'dão'} para pintar${maus > 0 ? `; ${maus} não` : ''}.`;
}

const arredonda = (n: number) => (Math.round(n * 10) / 10).toLocaleString('pt-PT');
