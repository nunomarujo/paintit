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
