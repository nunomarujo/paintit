import { percentOf, type Cents } from './money';
import { SURVEYOR_SHARE_OF_VALUE_BP_MAX, SURVEYOR_SHARE_OF_VALUE_BP_MIN, surveyorShareBp, type SurveyorPerformance } from './survey';

/**
 * Ser avaliador: a inscrição, o simulador de ganho e a explicação da banda.
 *
 * Pedido do promotor (02/11/2026): um vendedor de um fornecedor registado pode inscrever-se como
 * avaliador — quem ajuda o cliente a medir a obra (dimensões, estado do imóvel, objetivos), com a
 * plataforma a registar tudo. Ganha duas vezes: a comissão do levantamento, que é dele seja qual for a
 * proposta vencedora, e a proximidade aos pintores antes de haver orçamento.
 *
 * A inscrição é por **autodeclaração**: a pessoa declara que tem experiência e compromete-se com a
 * verdade do que regista. Fica guardada como uma aceitação de termos com versão própria
 * (`survey_terms_acceptances`, a mesma tabela dos termos de confidencialidade) — mudar o texto dos
 * compromissos exige mudar a versão, o que pede aceitação de novo.
 *
 * O ganho é a regra já em vigor em `survey.ts`: entre 1% e 2,7% do valor adjudicado sem IVA, conforme
 * o desempenho, e nunca acima da comissão que a plataforma receber nessa obra. O simulador não inventa
 * nada: chama `surveyorShareBp` com o desempenho e `percentOf` com o valor.
 */

export const VERSAO_AUTODECLARACAO_DO_AVALIADOR = 'avaliador-2026-11-02';

/** O que a pessoa declara ao inscrever-se. Uma frase por compromisso, na primeira pessoa. */
export const COMPROMISSOS_DO_AVALIADOR: readonly string[] = [
  'Tenho experiência em obras de pintura ou construção e sei medir e descrever o estado de um suporte.',
  'Registo na plataforma o que vejo e meço, sem omitir nem exagerar, e assinalo o que não consegui verificar.',
  'Não uso o levantamento para orientar o cliente para um pintor ou para um produto: a escolha é dele.',
  'Contacto o cliente no prazo que a plataforma indica e compareço à hora combinada.',
];

/** Valor da obra usado no exemplo público e no simulador por omissão: 45 000 € (promotor). */
export const VALOR_DE_EXEMPLO_CENTS: Cents = 4_500_000;

/** Desempenho neutro: tudo por conhecer, meio da banda. É o ponto de partida de quem se inscreve. */
export const DESEMPENHO_INICIAL: SurveyorPerformance = {
  qualificacaoGeral: null,
  notaInformacao: null,
  respostaAtempada: null,
  notaCliente: null,
};

export interface SimulacaoDeGanho {
  /** A % aplicada, em pontos-base. */
  shareBp: number;
  /** O que a pessoa recebe desta obra, antes do teto da comissão da plataforma. */
  ganhoCents: Cents;
  /** O mínimo e o máximo da banda para este valor de obra. */
  minimoCents: Cents;
  maximoCents: Cents;
}

export function simularGanho(valorAdjudicadoCents: Cents, desempenho: SurveyorPerformance = DESEMPENHO_INICIAL): SimulacaoDeGanho {
  const shareBp = surveyorShareBp(desempenho);
  return {
    shareBp,
    ganhoCents: percentOf(valorAdjudicadoCents, shareBp),
    minimoCents: percentOf(valorAdjudicadoCents, SURVEYOR_SHARE_OF_VALUE_BP_MIN),
    maximoCents: percentOf(valorAdjudicadoCents, SURVEYOR_SHARE_OF_VALUE_BP_MAX),
  };
}

/** «2%», «1%», «2,7%» — a % em palavras, para o simulador e para a página pública. */
export const percentagemEmPalavras = (bp: number) => `${(bp / 100).toLocaleString('pt-PT', { maximumFractionDigits: 1 })}%`;

/** Como a % sobe ou desce: os quatro fatores de `surveyorShareBp`, pelo peso, em linguagem de quem lê. */
export const FATORES_DA_BANDA: readonly { peso: string; nome: string; explicacao: string }[] = [
  { peso: '40%', nome: 'Qualificação geral', explicacao: 'A média de todas as avaliações que já recebeu. Sobe com o tempo e com trabalho bem feito; uma má obra pesa menos quando há muitas boas.' },
  { peso: '30%', nome: 'Informação do levantamento', explicacao: 'O que os pintores que orçamentaram esta obra disseram da qualidade das medidas e do estado descrito.' },
  { peso: '15%', nome: 'Resposta a tempo', explicacao: 'Quando um pintor pede um esclarecimento sobre o levantamento, responder dentro do prazo conta; não responder desce.' },
  { peso: '15%', nome: 'Avaliação do cliente', explicacao: 'A nota que o cliente dá à visita: pontualidade, cuidado, clareza.' },
];
