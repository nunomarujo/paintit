import { percentOf, type Cents } from './money';

// Levantamento feito por um vendedor de um fornecedor (bónus "esforço" do documento "Quem Pinta — a
// oferta", trazido pelo promotor; decisão de 23/10/2026, docs/DECISOES.md): em vez de o cliente ter de
// fotografar e medir a obra, um vendedor com catálogo ativo na zona pode reservar o pedido, visitar e
// registar o levantamento — sem custo para o cliente. Se nenhum vendedor reservar a tempo, o
// levantamento self-service (o cliente preenche sozinho) continua sempre disponível: é uma rede de
// segurança, nunca uma obrigação.
//
// NOTA DE NOMENCLATURA (23/10/2026): o promotor passou a chamar "avaliador" a este papel, por ser o que
// o pessoa faz (avalia a obra para orçamentação), não "vendedor" de tintas. Este ficheiro e a base de
// dados (colunas, tabelas, o papel 'vendedor' já aplicado em produção) continuam com o nome antigo —
// mudar isso é um passo maior (um enum já em produção, usado em muitas políticas RLS), por decidir
// separadamente. Já mudou: todo o texto visível ao utilizador (`docs/ESTADO.md`, 23/10/2026).

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
 * Comissão do vendedor (o promotor chama-lhe "avaliador" no papel que desempenha aqui — ver nota no
 * fundo do ficheiro): % do VALOR ADJUDICADO da obra (sem IVA, o mesmo `base` de `engagement.ts`), nunca
 * da comissão da plataforma — mas paga a partir dela, por isso nunca pode exceder a comissão líquida que
 * a plataforma de facto recebeu (`surveyorPayoutAmount`). Números do promotor (23/10/2026,
 * docs/DECISOES.md): 1% de base, até 2,7% em alta performance — a mesma fórmula 40/30/15/15 já em vigor
 * (qualificação geral acumulada / nota dos pintores sobre a informação do levantamento / resposta a
 * tempo a um pedido de esclarecimento / nota do cliente a esta obra), só a reler numa escala direta de %
 * do valor da obra em vez de % da comissão. Cada componente sem dados ainda entra neutro (meio da banda),
 * mesmo critério de `vendorRatingSummary` ("primeira obra", sem limiar mínimo).
 *
 * **Sobre o 5.º fator que o promotor considerou** (a % de comissão que a plataforma vai mesmo receber
 * nesta obra): não entra como fator pesado à parte — é circular (só se sabe depois de o próprio trabalho
 * do avaliador estar feito, com proposta já escolhida) e o teto abaixo já o traduz sem precisar de mais
 * nada: numa obra de comissão baixa (ex. "traga o seu pintor", 9%), o teto por si só já reduz a fração
 * efetiva do avaliador, sem ser preciso somar isso à fórmula.
 */
export const SURVEYOR_SHARE_OF_VALUE_BP_MIN = 100; // 1% do valor adjudicado
export const SURVEYOR_SHARE_OF_VALUE_BP_MAX = 270; // 2,7% do valor adjudicado
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

/** Posição do vendedor na banda 1%-2,7% do valor adjudicado, segundo o seu desempenho. */
export function surveyorShareBp(p: SurveyorPerformance): number {
  const score =
    0.4 * starsToScore(p.qualificacaoGeral) +
    0.3 * starsToScore(p.notaInformacao) +
    0.15 * (p.respostaAtempada == null ? SURVEYOR_NEUTRAL_SCORE : p.respostaAtempada ? 100 : 0) +
    0.15 * starsToScore(p.notaCliente);
  return Math.round(SURVEYOR_SHARE_OF_VALUE_BP_MIN + (score / 100) * (SURVEYOR_SHARE_OF_VALUE_BP_MAX - SURVEYOR_SHARE_OF_VALUE_BP_MIN));
}

/** Quanto o fornecedor do vendedor recebe desta obra: a % (`surveyorShareBp`) do valor adjudicado, nunca
 * mais do que a comissão líquida que a plataforma de facto recebeu (sem IVA) — o teto que absorve o 5.º
 * fator referido acima, sem o somar à fórmula. */
export function surveyorPayoutAmount(valorAdjudicado: Cents, shareBp: number, platformFeeNet: Cents): Cents {
  return Math.min(percentOf(valorAdjudicado, shareBp), platformFeeNet);
}

/**
 * Bónus de adesão ao avaliador (ponto 4, pedido do promotor, 23/10/2026): hoje, um fornecedor que
 * convida um pintor a aderir (`supplier_painter_invites`) não ganha nenhuma comissão nesse programa —
 * só a carteira de clientes e os descontos que pode aplicar, ao contrário do pintor que indica um
 * fornecedor (1-2%, `referral_payouts`). Em vez disso, cada convite aceite dá um crédito único
 * ("por uma vez") de +30 pontos-base na próxima obra em que o seu avaliador for pago — gasto e marcado
 * no mesmo momento (`settleSurveyPayout`, src/lib/surveys.ts). Só concedido/gasto se o fornecedor tiver
 * telefone e autorização de alertas registados (organizations.telefone, alertas_autorizados): exigência
 * do próprio promotor, para o bónus não ficar por reclamar sem forma de avisar quem o ganhou.
 *
 * O promotor propôs esta alternativa: avisar este fornecedor 2 horas antes de todos os outros sempre
 * que houver um novo pedido na sua zona. Optei pelo bónus porque a plataforma hoje não tem nenhum aviso
 * push aos avaliadores quando um levantamento abre (descobrem navegando a lista, /app/levantamentos) —
 * dar uma janela de exclusividade a um só exigiria também bloquear a reserva dos outros durante essa
 * janela, uma mudança bem maior à regra "quem chega primeiro" do levantamento (reserve_survey). O bónus
 * dá o mesmo reconhecimento com risco e código muito menores; a janela de aviso fica por construir, se o
 * bónus não se mostrar suficiente.
 */
export const AVALIADOR_BONUS_BP = 30;

/** Aplica o bónus de adesão (se houver crédito) à fração calculada, sem exceder o máximo da banda. */
export function applyAvaliadorBonus(shareBp: number, hasBonusCredit: boolean): number {
  return hasBonusCredit ? Math.min(shareBp + AVALIADOR_BONUS_BP, SURVEYOR_SHARE_OF_VALUE_BP_MAX) : shareBp;
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
