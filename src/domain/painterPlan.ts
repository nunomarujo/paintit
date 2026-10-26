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

/** O desconto de lançamento, face ao preço de tabela, em cada periodicidade. */
export const descontoDeLancamento = (p: PlanoPreco = PRECO_ATUAL) => ({
  mensalCents: p.tabelaMensalCents - p.mensalCents,
  anualCents: p.tabelaAnualCents - p.anualCents,
});

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
  /** A dor do pintor, não o nome da funcionalidade. */
  titulo: string;
  detalhe: string;
  /** Uma página que desenvolve o assunto por extenso, quando a há. */
  maisInfoHref?: string;
  /** O que fica escondido atrás de "+ saber mais": a matemática, as condições, os números. */
  maisInfo?: string;
  /** Rótulo do botão, quando "+ saber mais" não é a pergunta certa. */
  rotuloMaisInfo?: string;
  /** Ainda não funciona para o utilizador, por melhor que esteja o código. */
  aChegar?: boolean;
  /** A promessa maior da página: sai do alinhamento da lista e ganha moldura própria. */
  destaque?: boolean;
}

// A lista saiu do estudo de 25/10/2026 sobre o que falta mesmo a uma empresa de pintura portuguesa
// (docs/DECISOES.md). A conclusão que a determina: o valor está em ganhar obra, orçamentar depressa e
// não perder adjudicações por papelada caducada — não em calculadoras, que existem de graça nos sites
// dos fabricantes e que ninguém subscreve.
export const BENEFICIOS_PRO: Beneficio[] = [
  {
    titulo: 'Fique com mais do que ganhou',
    destaque: true,
    detalhe: 'Numa obra de 30 000 €, ficam-lhe mais 1 500 € no bolso — mais do que quatro anos de subscrição, numa obra só.',
    maisInfo:
      'A comissão desce 5 pontos percentuais do valor sem IVA, e soma-se aos descontos que já tenha — os de fornecedores indicados e os de códigos de adesão.',
  },
  {
    titulo: 'O cliente lembra-se de si, não da aplicação',
    detalhe: 'Orçamentos com o seu logótipo e contactos — a próxima obra deste cliente pode vir ter consigo directamente.',
  },
  {
    titulo: 'Faça orçamentos completos em menos de 15 minutos',
    detalhe: 'Hoje demora entre uma e três horas por orçamento.',
    rotuloMaisInfo: 'Porquê?',
    maisInfo:
      'Com a Quem Pinta: 45 minutos no primeiro orçamento, 30 no segundo, menos de 15 a partir do terceiro. A aplicação aprende os seus preços e os capítulos de trabalho à medida que orça — e os pedidos vindos da Quem Pinta arrancam ainda mais depressa, porque as áreas já vêm medidas pelo avaliador.',
  },
  {
    titulo: 'Nunca mais perca uma obra por um documento caducado',
    detalhe:
      'Certidão permanente, não dívida às Finanças e à Segurança Social, seguro de acidentes de trabalho e alvará — tudo guardado, com aviso 15 dias antes de vencer.',
  },
  {
    titulo: 'Já fez trabalho a mais e não lhe pagaram?',
    detalhe: 'A adenda com preço e fotografia, aceite pelo cliente num clique — é aí que a margem deixa de desaparecer.',
  },
  {
    titulo: 'Saiba sempre quanto lhe devem',
    detalhe: 'Diário fotográfico datado para garantias e reclamações, carga das equipas por semana, e o que está facturado por receber.',
  },
  // O mapa de contratos públicos esteve aqui como destaque da página, e saiu de lá por decisão do
  // promotor a 26/10/2026. A razão é aritmética e está no artigo /obra-publica: há cerca de 977
  // lugares de convidado por ano em todo o país. Mesmo com execução perfeita — a plataforma a
  // preparar tudo e o pintor só a assinar e enviar — a maior parte dos subscritores nunca verá um
  // convite atribuível a isto, e o retorno não é imediato nem garantido. Prometer isto à cabeça era
  // montar a subscrição sobre o que ela menos consegue entregar, e colher a desilusão que se segue.
  //
  // Fica onde pertence: uma coisa valiosa que nenhuma outra ferramenta faz, a seguir às que o pintor
  // usa todas as semanas. Os números são da carga real de 2026 (478 contratos de 199 701), medidos a
  // 26/10/2026 depois de tirados quatro repetidos que o ficheiro do portal trazia a dobrar.
  {
    titulo: 'Dois terços das obras públicas nunca são anunciadas',
    detalhe:
      'A câmara não publica concurso: convida directamente quem já conhece. Fazemos o trabalho para que seja a si que convidam — dizemos-lhe quem contrata pintura à sua volta, com que frequência e por que valores.',
    maisInfo:
      'Em 2026 houve 478 empreitadas de pintura, fachadas e isolamento, no total de 62,5 milhões de euros. Dois terços foram por convite directo, sem anúncio, e em mais de um terço desses casos foi convidada uma única empresa — nesses, estar na lista é ganhar a obra. Não se promete um convite: são cerca de 977 lugares de convidado por ano em todo o país, e nenhuma entidade é obrigada a chamar seja quem for. O que se promete é o trabalho feito — quem contrata à sua volta, quanto paga, e a carta pronta a assinar.',
    maisInfoHref: '/obra-publica',
    rotuloMaisInfo: 'O que isto vale, e o que não vale',
    aChegar: true,
  },
  {
    titulo: 'Nunca mais perca uma obra pública por não saber que existia',
    detalhe: 'Os concursos que são anunciados, filtrados só para pintura e isolamento — já organizados para si.',
    maisInfo:
      'Com a lista exacta de documentos que cada concurso exige, e o aviso imediato de se o seu alvará chega para aquele valor. Menos tempo a decifrar editais, mais tempo a concorrer.',
    aChegar: true,
  },
];

export const BENEFICIOS_GRATUITO: Beneficio[] = [
  {
    titulo: 'Comece sem pagar nada',
    detalhe: 'Veja os pedidos, prepare e envie propostas à vontade. Sem mensalidade.',
    maisInfo:
      'Só há comissão quando ganha a obra — nunca antes. Com o plano Pro desce 5 pontos percentuais, e ainda há os descontos de fornecedores indicados e de códigos de adesão, quando os tiver.',
  },
  {
    titulo: 'Nunca mais orçamente às cegas',
    detalhe: 'Acesso ao levantamento do avaliador e às perguntas feitas ao cliente — a mesma informação, sem ter de lá ir perguntar.',
  },
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
