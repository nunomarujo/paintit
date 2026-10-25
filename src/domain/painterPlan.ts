import type { Cents } from './money';

// Subscrição das empresas de pintura (decisão do promotor, 25/10/2026 — docs/DECISOES.md).
//
// Dois planos: o gratuito, que é o que todas têm hoje, e o Pro. O Pro desce 5 pontos percentuais na
// comissão da plataforma em qualquer obra ganha, acumulável com os outros descontos, e abre o que
// `FUNCIONALIDADES_PRO` lista.
//
// Preço de lançamento abaixo do preço de tabela, enquanto a plataforma não tiver massa crítica de
// pedidos. Quem subscrever a este preço mantém-no enquanto não cancelar: a assinatura guarda a versão
// que aplicou, como as regras comerciais (CLAUDE.md, regra 3).

export const PLANOS_PINTOR = ['gratuito', 'pro'] as const;
export type PlanoPintor = (typeof PLANOS_PINTOR)[number];
export const isPlanoPintor = (v: unknown): v is PlanoPintor => typeof v === 'string' && (PLANOS_PINTOR as readonly string[]).includes(v);

export const PERIODICIDADES = ['mensal', 'anual'] as const;
export type Periodicidade = (typeof PERIODICIDADES)[number];
export const isPeriodicidade = (v: unknown): v is Periodicidade =>
  typeof v === 'string' && (PERIODICIDADES as readonly string[]).includes(v);

/** Desconto do plano Pro na comissão, em pontos-base: 5 pontos percentuais (18% → 13%). */
export const PRO_DISCOUNT_BP = 500;

export interface PlanoPreco {
  version: string;
  mensalCents: Cents;
  anualCents: Cents;
  /** Preço de tabela, acima do preço de lançamento em vigor. */
  tabelaMensalCents: Cents;
  tabelaAnualCents: Cents;
}

/** Preço de lançamento, em vigor. */
export const PRECO_2026_10_25: PlanoPreco = {
  version: '2026-10-25',
  mensalCents: 3_000,
  anualCents: 25_000,
  tabelaMensalCents: 5_000,
  tabelaAnualCents: 50_000,
};

export const PRECO_ATUAL = PRECO_2026_10_25;
export const PRECOS_POR_VERSAO: Record<string, PlanoPreco> = { [PRECO_2026_10_25.version]: PRECO_2026_10_25 };

/**
 * Preço de uma periodicidade na versão de preços que a assinatura guardou.
 *
 * A regra 3 do CLAUDE.md: a versão fica presa à assinatura e um preço novo não mexe em assinaturas
 * já começadas. Devolve `null` para uma versão desconhecida — quem chama decide o que fazer, em vez
 * de ficar um preço errado gravado em silêncio.
 */
export function precoDe(version: string, periodicidade: Periodicidade): Cents | null {
  const p = PRECOS_POR_VERSAO[version];
  if (!p) return null;
  return periodicidade === 'anual' ? p.anualCents : p.mensalCents;
}

/** Quanto poupa, por ano, quem paga à anual em vez de mensalmente. */
export const poupancaAnual = (p: PlanoPreco = PRECO_ATUAL): Cents => p.mensalCents * 12 - p.anualCents;

/**
 * O que exige plano Pro, decidido a 25/10/2026.
 *
 * Até essa data o plano vendia quatro coisas e só reservava uma: as outras três estavam no ar e
 * abertas a toda a gente, incluindo o orçamento com marca própria. Esta lista é a resposta única à
 * pergunta "isto é do Pro?", para não voltarem a existir três respostas diferentes.
 *
 * Ficam de fora, de propósito: as adendas de trabalhos a mais (fechá-las tiraria margem registada à
 * plataforma) e as ferramentas de gestão de obras (são o hábito diário que traz o pintor cá; fechadas,
 * ele não entra).
 */
export const FUNCIONALIDADES_PRO = ['obras_publicas', 'marca_propria', 'cofre_documentos'] as const;
export type FuncionalidadePro = (typeof FUNCIONALIDADES_PRO)[number];

/** A subscrição dá acesso às funcionalidades do Pro nesta data? Cancelada dentro do período pago, dá. */
export function temPro(s: SubscricaoPintor | null, hoje: string): boolean {
  return subscriberDiscountBp(s, hoje) > 0;
}

export interface Beneficio {
  titulo: string;
  detalhe: string;
  /** Exclusivo de quem subscreve: no plano gratuito não existe, ou existe com a marca da plataforma. */
  exclusivo?: boolean;
}

// A lista saiu do estudo de 25/10/2026 sobre o que falta mesmo a uma empresa de pintura portuguesa
// (docs/DECISOES.md). A conclusão que a determina: o valor está em ganhar obra, orçamentar depressa e
// não perder adjudicações por papelada caducada — não em calculadoras, que existem de graça nos sites
// dos fabricantes e que ninguém subscreve.
export const BENEFICIOS_PRO: Beneficio[] = [
  {
    titulo: 'Menos 5 pontos de comissão em cada obra ganha',
    detalhe:
      'A comissão da plataforma desce de 18% para 13% do valor sem IVA, e soma-se aos descontos que já tenha. Numa obra de 30 000 € são menos 1 500 € de comissão — mais do que quatro anos de subscrição, numa obra só.',
    exclusivo: true,
  },
  {
    titulo: 'Orçamentos com a marca da sua empresa',
    detalhe:
      'O documento sai com o logótipo e os contactos da sua empresa no topo e sem marca de água, com a plataforma apenas numa linha no fundo. No plano gratuito sai com a marca Quem Pinta.pt.',
    exclusivo: true,
  },
  {
    titulo: 'Obras Públicas',
    detalhe:
      'Concursos de câmaras, juntas de freguesia e outras entidades públicas, filtrados para trabalhos de pintura e isolamento, com a lista de documentos que cada um exige e o aviso de se o seu alvará chega para aquele valor.',
    exclusivo: true,
  },
  {
    titulo: 'Cofre de documentos com aviso de validade',
    detalhe:
      'Certidão permanente, não dívida às Finanças e à Segurança Social, apólice e recibo do seguro de acidentes de trabalho, alvará. Aviso 15 dias antes de cada caducidade, para não perder uma adjudicação por um papel fora de prazo.',
    exclusivo: true,
  },
  {
    titulo: 'Trabalhos a mais com aceitação do cliente',
    detalhe:
      'A adenda escrita, com preço e fotografia, aceite pelo cliente num clique. É onde a margem desaparece quando não fica registada. Disponível em qualquer plano.',
  },
  {
    titulo: 'Ferramentas de gestão de obras',
    detalhe:
      'Diário fotográfico datado para garantias e reclamações, carga das equipas por semana, materiais e consumíveis, e o que está facturado por receber. Disponível em qualquer plano, mesmo sem obra ganha aqui.',
  },
];

export const BENEFICIOS_GRATUITO: Beneficio[] = [
  { titulo: 'Orçamentar sem custos', detalhe: 'Ver pedidos, preparar e enviar propostas. Só paga comissão se ganhar a obra.' },
  { titulo: 'Comissão de 18%', detalhe: 'Com os descontos de códigos de adesão e de fornecedores indicados, quando os tiver.' },
  { titulo: 'Levantamentos e esclarecimentos', detalhe: 'Acesso ao levantamento do avaliador e às perguntas ao cliente.' },
];

export const ESTADOS_SUBSCRICAO = ['ativa', 'por_pagar', 'cancelada'] as const;
export type EstadoSubscricao = (typeof ESTADOS_SUBSCRICAO)[number];

export interface SubscricaoPintor {
  plano: PlanoPintor;
  estado: EstadoSubscricao;
  periodicidade: Periodicidade;
  /** AAAA-MM-DD do fim do período pago; a subscrição vale até lá mesmo depois de cancelada. */
  validaAte: string | null;
  /** O que está a ser debitado, para o ecrã poder dizê-lo sem ir ao Stripe. */
  precoCents?: Cents;
}

/**
 * O que dizer a quem subscreve, em linguagem de quem paga.
 *
 * O ecrã dizia só "Plano Pro activo" e não dizia a periodicidade nem o valor debitado (encontrado a
 * 25/10/2026 ao testar o cancelamento: nem o próprio subscritor conseguia ver o que pagava). Quem
 * paga tem de poder ver quanto, com que frequência e até quando, sem abrir o Stripe.
 */
export type SituacaoSubscricao =
  | { tipo: 'gratuito' }
  | { tipo: 'por_pagar' }
  | { tipo: 'activa'; periodicidade: Periodicidade; precoCents: Cents | null; renovaEm: string | null }
  | { tipo: 'cancelada_ate'; validaAte: string }
  | { tipo: 'terminada' };

export function situacaoDe(s: SubscricaoPintor | null, hoje: string): SituacaoSubscricao {
  if (!s || s.plano !== 'pro') return { tipo: 'gratuito' };
  if (s.estado === 'por_pagar') return { tipo: 'por_pagar' };
  const caducada = s.validaAte !== null && s.validaAte < hoje;
  if (s.estado === 'cancelada') {
    return !caducada && s.validaAte !== null ? { tipo: 'cancelada_ate', validaAte: s.validaAte } : { tipo: 'terminada' };
  }
  if (caducada) return { tipo: 'terminada' };
  return { tipo: 'activa', periodicidade: s.periodicidade, precoCents: s.precoCents ?? null, renovaEm: s.validaAte };
}

/**
 * O desconto de subscritor em vigor nesta data. Só o plano Pro ativo e dentro do período pago
 * desconta — uma subscrição cancelada mantém o desconto até ao fim do período que já pagou, que é o
 * que o pintor comprou.
 */
export function subscriberDiscountBp(s: SubscricaoPintor | null, hoje: string): number {
  if (!s || s.plano !== 'pro') return 0;
  if (s.estado === 'por_pagar') return 0;
  // Cancelada sem validade conhecida não desconta. Antes descontava para sempre: bastava cancelar
  // antes de o Stripe dizer até quando o período ia (bug encontrado a 25/10/2026, no primeiro
  // pagamento de teste, quando a validade ficou vazia por se ler o campo no sítio errado).
  if (s.estado === 'cancelada' && s.validaAte === null) return 0;
  if (s.validaAte !== null && s.validaAte < hoje) return 0;
  return PRO_DISCOUNT_BP;
}

/** Texto da linha de desconto de subscritor, que aparece sempre — tenha-o ou não (pedido do promotor). */
export function linhaSubscritor(bp: number): { label: string; valor: string; ativo: boolean } {
  return bp > 0
    ? { label: 'Desconto de subscritor Pro', valor: `−${bp / 100} p.p.`, ativo: true }
    : { label: 'Desconto de subscritor', valor: '0 p.p.', ativo: false };
}
