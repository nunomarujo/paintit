import type { Cents } from './money';

// Parâmetros comerciais em vigor. Uma alteração cria uma nova versão e nunca
// muda contratações já iniciadas: cada contratação guarda a versão que aplicou.
// Decisões e estado: docs/DECISOES.md.

export interface CommercialRules {
  version: string;
  /** Comissão do pintor, em pontos-base sobre o valor sem IVA. */
  commissionBp: number;
  commissionMinCents: Cents;
  /**
   * Piso da comissão, em pontos-base: nenhum desconto — nem todos empilhados — a faz descer abaixo
   * disto. Ausente nas versões antigas, que não tinham piso; `applyPainterDiscount` lê 0 nesse caso,
   * para que contratações já iniciadas continuem a reconstruir-se exatamente como foram.
   */
  commissionFloorBp?: number;
  /** Caução do cliente, em pontos-base sobre o valor sem IVA. */
  guaranteeBp: number;
  /** Mínimo da caução (150 €, igual ao da comissão). */
  guaranteeMinCents: Cents;
  /** IVA que acresce à comissão (taxa normal do continente). */
  commissionVatBp: number;
  /** Dias corridos para o fee entrar na conta, contados da notificação ao pintor. */
  feeDeadlineDays: number;
  /** Em aberto (proposta): dias corridos para o pintor assinar depois de pagar. */
  signDeadlineDays: number;
  timeZone: string;
  /** Percurso: v1 (cliente assina antes da apresentação) ou v2 (apresentação antes das assinaturas). */
  flow?: 'v1' | 'v2';
}

export const RULES_2026_10: CommercialRules = {
  version: '2026-10-18',
  commissionBp: 300,
  commissionMinCents: 15_000,
  guaranteeBp: 300,
  guaranteeMinCents: 15_000,
  commissionVatBp: 2_300,
  feeDeadlineDays: 8,
  signDeadlineDays: 8,
  timeZone: 'Europe/Lisbon',
};

/**
 * 19/10/2026: percurso v2, decidido pelo promotor depois do parecer jurídico. A
 * caução é garantia de interesse, depositada antes da apresentação e devolvida na
 * assinatura. Os valores mantêm-se.
 */
export const RULES_2026_10_19: CommercialRules = { ...RULES_2026_10, version: '2026-10-19', flow: 'v2' };

/** 20/10/2026: o promotor mantém o mínimo de 150 € também na caução (garante contra desistência fraudulenta e contorno da plataforma). Valores iguais aos de 19/10. */
export const RULES_2026_10_20: CommercialRules = { ...RULES_2026_10_19, version: '2026-10-20', guaranteeMinCents: 15_000 };

/**
 * 21/10/2026: com código de adesão de um fornecedor aplicado à proposta e a obra ganha, a comissão do pintor desce
 * 0,25 pontos (3% para 2,75%; o mínimo mantém-se). Versão usada só nessas contratações (ver src/domain/referral.ts).
 */
export const RULES_2026_10_20_REF: CommercialRules = { ...RULES_2026_10_20, version: `${RULES_2026_10_20.version}+ref`, commissionBp: RULES_2026_10_20.commissionBp - 25 };

/**
 * 24/10/2026: a comissão passa a 18% com piso de 9%, por decisão do promotor — os 3% em vigor até
 * aqui eram interinos e estavam, nas suas palavras, "abaixo do mínimo estabelecido". Os 18% são a
 * base do documento "Algoritmo de determinação de fee QuemPinta v1"; os 9% são o piso que o mesmo
 * documento fixa como mínimo absoluto, com todos os descontos empilhados (18 − 3 de resposta inicial
 * − 2 de fidelização − 4 de referências).
 *
 * O piso é agora cumprido pelo código, e não só pela aritmética de quem configura os descontos:
 * `applyPainterDiscount` nunca desce abaixo dele.
 *
 * Como manda a regra 3 do CLAUDE.md, isto é uma versão nova: as contratações já iniciadas continuam
 * com a versão que aplicaram e não mudam de preço a meio.
 */
export const RULES_2026_10_24: CommercialRules = {
  ...RULES_2026_10_20,
  version: '2026-10-24',
  commissionBp: 1_800,
  commissionFloorBp: 900,
};

/** O código de adesão de um fornecedor desce 0,25 pontos, agora sobre a base nova. */
export const RULES_2026_10_24_REF: CommercialRules = {
  ...RULES_2026_10_24,
  version: `${RULES_2026_10_24.version}+ref`,
  commissionBp: RULES_2026_10_24.commissionBp - 25,
};

/**
 * "Traga o seu pintor" com a base de 24/10: mantém-se nos 9%, que agora coincidem exatamente com o
 * piso. O canal já estava nesse valor por ser o mínimo do modelo; a subida da base não lhe toca.
 */
export const RULES_2026_10_24_CONVITE: CommercialRules = {
  ...RULES_2026_10_24,
  version: `${RULES_2026_10_24.version}+convite`,
  commissionBp: 900,
};

export const CURRENT_RULES = RULES_2026_10_24;

/**
 * 22/10/2026: "traga o seu pintor" — o cliente convida diretamente a empresa da sua confiança para a sua própria
 * obra (código ou QR, src/domain/painterTerms.ts não se aplica aqui; ver supabase/migrations/20261023143445).
 * A comissão fica em 9%, não por ser um valor novo, mas por ser o piso que o documento "Algoritmo de
 * determinação de fee QuemPinta v1" já estabelece como mínimo absoluto do próprio modelo dinâmico — mesmo
 * empilhando todos os seus descontos ao mesmo tempo (18% de base − 3 p.p. de resposta inicial − 2 p.p. de
 * fidelização − 4 p.p. de referências = 9%). Aplicar já esse piso a este canal, antes de o motor dinâmico
 * ("ponto 1") estar construído, é seguro: fica muito abaixo do alvo de 18-23% (o que importa para quem vem por
 * este caminho), nunca abaixo do que o negócio já decidiu ser sustentável — mesmo ficando acima dos 3% interinos
 * de hoje, que já se sabe estarem temporariamente baixos demais. Os descontos de códigos de adesão e referências
 * continuam a aplicar-se sobre esta base, não por cima dela.
 */
export const RULES_2026_10_20_CONVITE: CommercialRules = { ...RULES_2026_10_20, version: `${RULES_2026_10_20.version}+convite`, commissionBp: 900 };

/** Todas as versões, para reconstruir contratações antigas com as regras que aplicaram. */
export const RULES_BY_VERSION: Record<string, CommercialRules> = {
  [RULES_2026_10.version]: RULES_2026_10,
  [RULES_2026_10_19.version]: RULES_2026_10_19,
  [RULES_2026_10_20.version]: RULES_2026_10_20,
  [RULES_2026_10_20_REF.version]: RULES_2026_10_20_REF,
  [RULES_2026_10_20_CONVITE.version]: RULES_2026_10_20_CONVITE,
  [RULES_2026_10_24.version]: RULES_2026_10_24,
  [RULES_2026_10_24_REF.version]: RULES_2026_10_24_REF,
  [RULES_2026_10_24_CONVITE.version]: RULES_2026_10_24_CONVITE,
};
