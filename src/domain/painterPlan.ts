import type { Cents } from './money';

// Subscrição das empresas de pintura (decisão do promotor, 25/10/2026 — docs/DECISOES.md).
//
// Dois planos: o gratuito, que é o que todas têm hoje, e o Pro. O Pro desce 5 pontos percentuais na
// comissão da plataforma em qualquer obra ganha, acumulável com os outros descontos, e abre os
// separadores que estão a ser construídos (obras públicas, ferramentas de obra).
//
// Preço de lançamento mais baixo porque as funcionalidades ainda não estão todas no ar: sobe para o
// preço de tabela quando estiverem, e quem subscrever antes disso mantém o preço de lançamento
// enquanto não cancelar (a assinatura guarda a versão que aplicou, como as regras comerciais).

export const PLANOS_PINTOR = ['gratuito', 'pro'] as const;
export type PlanoPintor = (typeof PLANOS_PINTOR)[number];
export const isPlanoPintor = (v: unknown): v is PlanoPintor => typeof v === 'string' && (PLANOS_PINTOR as readonly string[]).includes(v);

export const PERIODICIDADES = ['mensal', 'anual'] as const;
export type Periodicidade = (typeof PERIODICIDADES)[number];

/** Desconto do plano Pro na comissão, em pontos-base: 5 pontos percentuais (18% → 13%). */
export const PRO_DISCOUNT_BP = 500;

export interface PlanoPreco {
  version: string;
  mensalCents: Cents;
  anualCents: Cents;
  /** Preço de tabela, para quando as funcionalidades por lançar estiverem no ar. */
  tabelaMensalCents: Cents;
  tabelaAnualCents: Cents;
}

/** Preço de lançamento, em vigor enquanto obras públicas e ferramentas de obra não estiverem no ar. */
export const PRECO_2026_10_25: PlanoPreco = {
  version: '2026-10-25',
  mensalCents: 3_000,
  anualCents: 25_000,
  tabelaMensalCents: 5_000,
  tabelaAnualCents: 50_000,
};

export const PRECO_ATUAL = PRECO_2026_10_25;
export const PRECOS_POR_VERSAO: Record<string, PlanoPreco> = { [PRECO_2026_10_25.version]: PRECO_2026_10_25 };

/** Quanto poupa, por ano, quem paga à anual em vez de mensalmente. */
export const poupancaAnual = (p: PlanoPreco = PRECO_ATUAL): Cents => p.mensalCents * 12 - p.anualCents;

export interface Beneficio {
  titulo: string;
  detalhe: string;
  /** Ainda por lançar: aparece com a marca de "em construção" e justifica o preço de lançamento. */
  porLancar?: boolean;
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
  },
  {
    titulo: 'Obras Públicas',
    detalhe:
      'Concursos de câmaras, juntas de freguesia e outras entidades públicas, filtrados para trabalhos de pintura e isolamento, com a lista de documentos que cada um exige e o aviso de se o seu alvará chega para aquele valor.',
    porLancar: true,
  },
  {
    titulo: 'Cofre de documentos com aviso de validade',
    detalhe:
      'Certidão permanente, não dívida às Finanças e à Segurança Social, apólice e recibo do seguro de acidentes de trabalho, alvará. Aviso 15 dias antes de cada caducidade e um envio único para o administrador de condomínio.',
    porLancar: true,
  },
  {
    titulo: 'Trabalhos a mais com aceitação do cliente',
    detalhe:
      'A adenda escrita, com preço e fotografia, aceite pelo cliente num clique. É onde a margem desaparece quando não fica registada.',
    porLancar: true,
  },
  {
    titulo: 'Ferramentas de gestão de obras',
    detalhe: 'Diário fotográfico datado para garantias e reclamações, carga das equipas por semana, e o que está facturado por receber.',
    porLancar: true,
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
