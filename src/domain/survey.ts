import { percentOf, type Cents } from './money';

// Levantamento feito por um vendedor de um fornecedor (bónus "esforço" do documento "Quem Pinta — a
// oferta", trazido pelo promotor; decisão de 23/10/2026, docs/DECISOES.md): em vez de o cliente ter de
// fotografar e medir a obra, um vendedor com catálogo ativo na zona pode reservar o pedido, visitar e
// registar o levantamento — sem custo para o cliente. Se nenhum vendedor reservar a tempo, o
// levantamento self-service (o cliente preenche sozinho) continua sempre disponível: é uma rede de
// segurança, nunca uma obrigação.

export const SURVEY_STATUSES = ['aberto', 'reservado', 'concluido', 'expirado', 'cancelado'] as const;
export type SurveyStatus = (typeof SURVEY_STATUSES)[number];

/**
 * Prazo, em horas, para o vendedor que reservou agendar, visitar e registar o levantamento antes de a
 * vaga voltar a ficar disponível para outro vendedor. O documento que desenhou este mecanismo deixou o
 * número como "horas à vista, a definir" — este valor é um ponto de partida razoável, não uma decisão
 * fechada do promotor. A migração (`request_surveys`) usa o mesmo número, por SQL não poder importar
 * esta constante: mudar aqui exige mudar lá também.
 */
export const RESERVE_WINDOW_HOURS = 48;

/**
 * Fração da comissão que a PLATAFORMA recebe (nunca do valor da obra) partilhada com o fornecedor do
 * vendedor, paga só quando essa comissão entra — seja qual for o pintor escolhido (é isto que torna o
 * vendedor aliado do processo, não um risco de desintermediação: ver docs/DECISOES.md). **Placeholder,
 * não confirmado pelo promotor** — o próprio documento que desenhou este mecanismo deixou a percentagem
 * em aberto ("precisa de um número para recalcular a receita líquida"). Não ligar a pagamentos reais sem
 * confirmar este valor.
 */
export const SURVEY_SHARE_BP_PROVISIONAL = 1000;

/** Quanto o fornecedor do vendedor recebe desta obra, a partir da comissão líquida que a plataforma
 * recebeu (sem IVA — o IVA da comissão nunca é receita da plataforma, não há o que partilhar dele). */
export function surveyPayoutAmount(platformFeeNet: Cents, shareBp: number = SURVEY_SHARE_BP_PROVISIONAL): Cents {
  return percentOf(platformFeeNet, shareBp);
}

/**
 * Fórmula dinâmica da fração do vendedor (proposta minha, pedida pelo promotor em 23/10/2026 para manter
 * simples — docs/DECISOES.md), a substituir `SURVEY_SHARE_BP_PROVISIONAL` fixo: 40% qualificação geral
 * acumulada do vendedor, 30% nota dos pintores sobre a informação deste levantamento, 15% se respondeu a
 * tempo a um pedido de esclarecimento (clarification.ts), 15% nota do cliente a esta obra em concreto.
 * Cada componente sem dados ainda (obra nova, sem avaliações, sem pedido de esclarecimento) entra como
 * neutro — nem penaliza nem beneficia um vendedor sem histórico suficiente, mesmo critério de
 * `vendorRatingSummary` ("primeira obra", sem limiar mínimo).
 *
 * O resultado fica entre `SURVEY_SHARE_BP_MIN` e `SURVEY_SHARE_BP_MAX`, com o antigo valor provisório
 * (10%) exatamente ao meio — ninguém fica pior do que estava, só se diferencia dentro de uma banda
 * moderada. Mostrado ao vendedor sempre como "% do valor adjudicado" (`surveyorDisplayShare`), nunca como
 * "% da comissão da plataforma" (CLAUDE.md, regra 13: o cliente nunca vê a comissão; o vendedor vê a sua
 * própria fração, traduzida).
 */
export const SURVEY_SHARE_BP_MIN = 500; // 5%
export const SURVEY_SHARE_BP_MAX = 1500; // 15%
const SURVEYOR_NEUTRAL_SCORE = 50;

export interface SurveyorPerformance {
  /** Média de estrelas (1-5) de todas as obras já avaliadas deste vendedor. null = ainda nenhuma. */
  qualificacaoGeral: number | null;
  /** Média de estrelas (1-5) dos pintores desta obra sobre a informação do levantamento. null = nenhuma ainda. */
  notaInformacao: number | null;
  /** Houve pedido de esclarecimento nesta obra e respondeu a tempo? null = nunca houve pedido. */
  respostaAtempada: boolean | null;
  /** Nota do cliente (1-5) a esta obra em concreto. null = ainda não avaliou. */
  notaCliente: number | null;
}

const starsToScore = (stars: number | null): number => (stars == null ? SURVEYOR_NEUTRAL_SCORE : ((stars - 1) / 4) * 100);

export function surveyorCommissionBp(p: SurveyorPerformance): number {
  const score =
    0.4 * starsToScore(p.qualificacaoGeral) +
    0.3 * starsToScore(p.notaInformacao) +
    0.15 * (p.respostaAtempada == null ? SURVEYOR_NEUTRAL_SCORE : p.respostaAtempada ? 100 : 0) +
    0.15 * starsToScore(p.notaCliente);
  return Math.round(SURVEY_SHARE_BP_MIN + (score / 100) * (SURVEY_SHARE_BP_MAX - SURVEY_SHARE_BP_MIN));
}

/** Tradução para o ecrã do vendedor: nunca a % real da comissão da plataforma, sempre "% do valor
 * adjudicado" — a mesma fração, só multiplicada pela comissão típica para dar um número que o vendedor
 * entende sem nunca revelar a comissão em si. */
export function surveyorDisplayShareBp(shareBp: number, typicalCommissionBp: number): number {
  return Math.round(percentOf(typicalCommissionBp, shareBp));
}

/** O fornecedor serve este concelho? Lista vazia = todo o país (mesma convenção de `supplier_delivery`,
 * já em produção: "Separados por vírgulas. Vazio = todo o país"). */
export function coversZone(coverageConcelhos: string[], concelho: string): boolean {
  return coverageConcelhos.length === 0 || coverageConcelhos.includes(concelho);
}

/** Resumo de avaliação para mostrar: quando ainda não há nenhuma, mostra-se que é a primeira obra na
 * plataforma — sem limiar mínimo (ao contrário do comparador de pintores, que só mostra a média a partir
 * de 3 obras: aqui o promotor pediu explicitamente o inverso, mostrar sempre, sinalizando quando é nova). */
export function vendorRatingSummary(notas: number[]): { n: number; media: number | null; primeiraObra: boolean } {
  if (notas.length === 0) return { n: 0, media: null, primeiraObra: true };
  const media = Math.round((notas.reduce((a, b) => a + b, 0) / notas.length) * 10) / 10;
  return { n: notas.length, media, primeiraObra: false };
}
