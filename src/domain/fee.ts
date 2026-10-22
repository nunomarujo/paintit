import { percentOf, type Cents } from './money';

/**
 * Algoritmo de determinação de fee — "ponto 1" (faixa dinâmica 18-23%), a partir do documento
 * `Algoritmo_determinacao_fee_QuemPinta_v1.docx` (carregado em 22/10/2026, ver docs/DECISOES.md). Funções puras
 * e sem estado, testadas contra os cenários da secção 9 do próprio documento.
 *
 * NÃO está ligado ao esquema nem ao `proposal_selected()` — a comissão em produção continua a ser a de
 * `src/domain/rules.ts` (3% fixo, decisão do promotor de trabalhar primeiro as referências "ponto 2"). Isto é
 * só o motor de cálculo, pronto a ligar quando: (a) os campos de cada fator (C/E/F/M/J) tiverem onde ser
 * declarados no pedido e na proposta — hoje não existem no esquema; (b) a contagem de "propostas completas
 * elegíveis anteriores" (R) e a janela de 180 dias (L) tiverem uma consulta própria; (c) o indicador de
 * qualidade competitiva (S) tiver o módulo de ranking que o próprio documento diz estar "ainda a fechar" — aqui
 * entra como parâmetro já calculado, nunca calculado por esta função; (d) o promotor confirmar os pesos e
 * limites, que o documento marca a si próprio como "propostas para teste", não decisões fechadas.
 *
 * Q (referências de fornecedores) não se reimplementa aqui: `referralDiscountFor`/`referralEligibility.ts` já é
 * exatamente a fórmula da secção 7, construída e testada em 22/10/2026.
 */

/** Estado de um fator com os dois lados possíveis (sobe/desce a base). "desconhecido" conta como "neutro" no
 * cálculo (vale zero) mas fica distinto, para poder ser assinalado — o documento exige registar os estados
 * desconhecidos, não escondê-los dentro de um "neutro" indistinguível. */
export type FeeFactorState = 'favoravel' | 'neutro' | 'desfavoravel' | 'desconhecido';

/** Alguns fatores só têm penalização documentada, nunca bónus (E4, F3 — secção 4). */
export type FeeFactorDownOnly = 'neutro' | 'desfavoravel' | 'desconhecido';

function stateBp(state: FeeFactorState | FeeFactorDownOnly, up: number, down: number): number {
  if (state === 'favoravel') return up;
  if (state === 'desfavoravel') return down;
  return 0;
}

const clampBp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

/** Fatores da base da obra (secção 4) — um valor por bloco, já limitado ao intervalo do próprio bloco. */
export interface BaseFactorsInput {
  /** C1 decisão de contratar: +50/−50 p.b. */
  c1DecisaoContratar: FeeFactorState;
  /** C2 informação técnica: +50/−50 p.b. */
  c2InformacaoTecnica: FeeFactorState;
  /** C3 decisão e orçamento: +25/−25 p.b. */
  c3DecisaoOrcamento: FeeFactorState;
  /** E1 janela de início: +75/−50 p.b. (único fator assimétrico nos dois lados). */
  e1JanelaInicio: FeeFactorState;
  /** E2 ritmo de execução: +25/−25 p.b. */
  e2RitmoExecucao: FeeFactorState;
  /** E3 repetição e logística: +50/−50 p.b. */
  e3RepeticaoLogistica: FeeFactorState;
  /** E4 custos de terceiros: só desce, −50 p.b. (≥40% em equipamento/terceiros). */
  e4CustosTerceiros: FeeFactorDownOnly;
  /** F1 fluxo de pagamentos: +50/−50 p.b. */
  f1FluxoPagamentos: FeeFactorState;
  /** F2 disponibilidade de fundos: +50/−25 p.b. */
  f2DisponibilidadeFundos: FeeFactorState;
  /** F3 retenções adicionais: só desce, −25 p.b. (retenção >5% ou libertação >90 dias). */
  f3RetencoesAdicionais: FeeFactorDownOnly;
  /** M1 oferta qualificada local: +100/−100 p.b. (≥10 favorável, ≤3 desfavorável, 4-9 neutro). */
  m1OfertaLocal: FeeFactorState;
}

export interface BaseFactorsBreakdown {
  /** Bloco C, limitado a [−100, 100] p.b. */
  c: number;
  /** Bloco E, limitado a [−150, 150] p.b. */
  e: number;
  /** Bloco F, limitado a [−100, 100] p.b. */
  f: number;
  /** Bloco M, limitado a [−100, 100] p.b. */
  m: number;
}

/** Soma de cada bloco de fatores, já limitada ao intervalo do próprio bloco (secção 4, "Limites por bloco"). */
export function baseFactors(input: BaseFactorsInput): BaseFactorsBreakdown {
  const c = clampBp(
    stateBp(input.c1DecisaoContratar, 50, -50) +
      stateBp(input.c2InformacaoTecnica, 50, -50) +
      stateBp(input.c3DecisaoOrcamento, 25, -25),
    -100,
    100,
  );
  const e = clampBp(
    stateBp(input.e1JanelaInicio, 75, -50) +
      stateBp(input.e2RitmoExecucao, 25, -25) +
      stateBp(input.e3RepeticaoLogistica, 50, -50) +
      stateBp(input.e4CustosTerceiros, 0, -50),
    -150,
    150,
  );
  const f = clampBp(
    stateBp(input.f1FluxoPagamentos, 50, -50) + stateBp(input.f2DisponibilidadeFundos, 50, -25) + stateBp(input.f3RetencoesAdicionais, 0, -25),
    -100,
    100,
  );
  const m = clampBp(stateBp(input.m1OfertaLocal, 100, -100), -100, 100);
  return { c, e, f, m };
}

/** B: base da obra, em pontos-base — secção 3, passo 1. `referenceBp` é a taxa de referência discutida (21%,
 * 2100 p.b.), ainda "por aprovar" segundo o próprio documento (secção 2). */
export function obraBaseBp(input: BaseFactorsInput, referenceBp = 2100): number {
  const { c, e, f, m } = baseFactors(input);
  return clampBp(referenceBp + c + e + f + m, 1800, 2300);
}

/** Fatores de adequação entre o pintor e esta oportunidade (secção 5, "J") — limitados a [−100, 100] p.b. no
 * total, não por sub-fator. */
export interface AdequacaoInput {
  /** J1 encaixe na agenda: +50/−50 p.b.; zero se já contado em E1 (mesma flexibilidade). */
  j1EncaixeAgenda: FeeFactorState;
  /** J2 mobilização e proximidade: +50/−50 p.b.; não repete o efeito de M (oferta local). */
  j2MobilizacaoProximidade: FeeFactorState;
  /** J3 meios adequados disponíveis: +25/−25 p.b.; não repete E3/E4. */
  j3MeiosDisponiveis: FeeFactorState;
}

/** A: adequação individual, em pontos-base — secção 3, passo 2. */
export function adequacaoIndividualBp(obraBp: number, input: AdequacaoInput): number {
  const j = clampBp(
    stateBp(input.j1EncaixeAgenda, 50, -50) + stateBp(input.j2MobilizacaoProximidade, 50, -50) + stateBp(input.j3MeiosDisponiveis, 25, -25),
    -100,
    100,
  );
  return clampBp(obraBp + j, 1800, 2300);
}

/**
 * R: incentivo inicial por oportunidade, em pontos-base — secção 6. Conta propostas completas elegíveis
 * recebidas antes desta (uma por entidade; rascunhos, duplicados e propostas rejeitadas não contam).
 */
export function respostaInicialBp(propostasElegiveisAnteriores: number): number {
  if (propostasElegiveisAnteriores <= 0) return 300;
  if (propostasElegiveisAnteriores <= 2) return 200;
  if (propostasElegiveisAnteriores <= 4) return 100;
  return 0;
}

export interface FidelizacaoInput {
  /** Propostas elegíveis nos últimos 180 dias (uma por obra; não é necessário ganhar). */
  propostasElegiveis180d: number;
  /**
   * Indicador S (0-100) de qualidade competitiva, já calculado por fora — secção 6: "a fórmula e pesos do
   * ranking são um módulo separado ainda a fechar". Esta função nunca o calcula, só aplica os escalões.
   * `null` quando há menos de 3 oportunidades encerradas elegíveis (não entra nesta parcela).
   */
  qualidadeS: number | null;
  /** ≥90% dos pedidos de esclarecimento respondidos a tempo, com pelo menos 3 pedidos; `'sem_dados'` se não
   * houver os 3 pedidos mínimos (não conta, não penaliza). */
  fiabilidade: boolean | 'sem_dados';
  /** Atividade útil em pelo menos 4 dos últimos 8 períodos semanais. */
  assiduidadeCumprida: boolean;
}

/** L: fidelização com janela móvel de 180 dias, em pontos-base — secção 6. Soma das quatro parcelas, limitada a
 * 2 p.p. (200 p.b.) no total. */
export function fidelizacaoBp(input: FidelizacaoInput): number {
  const participacao = input.propostasElegiveis180d >= 5 ? 50 : input.propostasElegiveis180d >= 2 ? 25 : 0;
  const qualidade = input.qualidadeS === null ? 0 : input.qualidadeS >= 75 ? 100 : input.qualidadeS >= 50 ? 50 : 0;
  const fiabilidade = input.fiabilidade === true ? 25 : 0;
  const assiduidade = input.assiduidadeCumprida ? 25 : 0;
  return clampBp(participacao + qualidade + fiabilidade + assiduidade, 0, 200);
}

export interface FeeRateInput {
  base: BaseFactorsInput;
  adequacao: AdequacaoInput;
  /** Para R — ver `respostaInicialBp`. */
  propostasElegiveisAnteriores: number;
  /** Para L — ver `fidelizacaoBp`. */
  fidelizacao: FidelizacaoInput;
  /** Q, em pontos-base (0 a 400) — calculado por `referralDiscountFor` (src/domain/referralEligibility.ts),
   * nunca recalculado aqui. */
  referenciasBp: number;
  referenceBp?: number;
}

export interface FeeRateBreakdown {
  obraBaseBp: number;
  adequacaoIndividualBp: number;
  respostaInicialBp: number;
  fidelizacaoBp: number;
  referenciasBp: number;
  /** T = A − R − L − Q. Com os limites de cada parcela respeitados, nunca fica abaixo de 900 p.b. (9%) — ver
   * `fee.test.ts`, "o piso nunca desce de 9% nos limites documentados". */
  taxaFinalBp: number;
}

/** T: taxa final, em pontos-base — secção 3, passo 3. */
export function taxaFinal(input: FeeRateInput): FeeRateBreakdown {
  const obraBase = obraBaseBp(input.base, input.referenceBp);
  const adequacao = adequacaoIndividualBp(obraBase, input.adequacao);
  const resposta = respostaInicialBp(input.propostasElegiveisAnteriores);
  const fidelizacao = fidelizacaoBp(input.fidelizacao);
  const referencias = clampBp(input.referenciasBp, 0, 400);
  return {
    obraBaseBp: obraBase,
    adequacaoIndividualBp: adequacao,
    respostaInicialBp: resposta,
    fidelizacaoBp: fidelizacao,
    referenciasBp: referencias,
    taxaFinalBp: adequacao - resposta - fidelizacao - referencias,
  };
}

export interface FeeResult extends FeeRateBreakdown {
  comissaoCents: Cents;
  /** Comissão/valor da obra, em pontos-base — só sobe acima de `taxaFinalBp` quando o mínimo monetário domina
   * (secção 3, passo 4 e "o mínimo monetário tem de ser visível"). */
  taxaEfetivaBp: number;
}

/** Comissão em euros a partir do valor da obra (sem IVA) e da taxa final — secção 3, passos 4-5 (sem o IVA da
 * própria comissão, que fica a cargo de quem chamar, igual a `painterFee` em `commission.ts`). */
export function calcularFee(valorBaseCents: Cents, input: FeeRateInput, minimoCents: Cents): FeeResult {
  const breakdown = taxaFinal(input);
  const comissaoCents = Math.max(minimoCents, percentOf(valorBaseCents, breakdown.taxaFinalBp));
  const taxaEfetivaBp = valorBaseCents === 0 ? 0 : Math.round((comissaoCents * 10000) / valorBaseCents);
  return { ...breakdown, comissaoCents, taxaEfetivaBp };
}

/**
 * V a cobrar para o pintor ficar com `liquidoCents` depois desta comissão (não do IVA da comissão) — secção 8.
 * Quando o mínimo monetário domina, soma-se diretamente em vez de dividir por (1 − T/100): o documento assinala
 * isto como um erro a evitar, não uma alternativa equivalente.
 */
export function valorParaLiquido(liquidoCents: Cents, taxaFinalBp: number, minimoCents: Cents): Cents {
  const porProporcao = Math.round((liquidoCents * 10000) / (10000 - taxaFinalBp));
  const comissaoPorProporcao = percentOf(porProporcao, taxaFinalBp);
  return comissaoPorProporcao <= minimoCents ? liquidoCents + minimoCents : porProporcao;
}
