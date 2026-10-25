import type { Cents } from './money';

// Obras públicas: saber, de um anúncio, se a empresa pode concorrer.
//
// Fontes (levantamento de 25/10/2026, docs/DECISOES.md):
//  - Lei n.º 41/2015, de 3 de Junho — regime da actividade de construção (alvará e certificado).
//  - Portaria n.º 212/2022, de 23 de Agosto — valores limite de cada classe.
//  - Código dos Contratos Públicos, na redação do DL n.º 177/2026, em vigor desde 1 de Outubro de 2026.
//
// A regra que decide tudo é o artigo 8.º da Lei 41/2015: a habilitação tem de cobrir o **valor global
// da empreitada**, e não a parte de pintura. Um pintor de classe 1 não pode ser empreiteiro de uma
// reabilitação de 400 000 € onde a pintura são 80 000 € — pode ser subcontratado dela. É a razão
// número um pela qual uma empresa pequena não concorre, e é isto que a plataforma lhe deve dizer
// antes de ela perder uma tarde a ler o caderno de encargos.

/** Valor limite de cada classe de alvará, em cêntimos (Portaria 212/2022). A classe 9 não tem limite. */
export const CLASSES: { classe: number; limiteCents: Cents | null }[] = [
  { classe: 1, limiteCents: 20_000_000 },
  { classe: 2, limiteCents: 40_000_000 },
  { classe: 3, limiteCents: 80_000_000 },
  { classe: 4, limiteCents: 160_000_000 },
  { classe: 5, limiteCents: 320_000_000 },
  { classe: 6, limiteCents: 640_000_000 },
  { classe: 7, limiteCents: 1_250_000_000 },
  { classe: 8, limiteCents: 1_900_000_000 },
  { classe: 9, limiteCents: null },
];

/** O certificado habilita até 20% do limite da classe 1 (artigo 7.º, n.º 2 da Lei 41/2015): 40 000 €. */
export const LIMITE_CERTIFICADO_CENTS: Cents = 4_000_000;

/** Subcategorias da 1.ª categoria (edifícios e património construído) que interessam a uma empresa de pintura. */
export const SUBCATEGORIAS = ['b', 't', 'g'] as const;
export type Subcategoria = (typeof SUBCATEGORIAS)[number];
export const SUBCATEGORIA_LABELS: Record<Subcategoria, string> = {
  b: 'Estuques, pinturas e outros revestimentos',
  t: 'Impermeabilizações e isolamentos',
  g: 'Restauro de bens imóveis histórico-artísticos',
};

/** Títulos habilitantes de uma empresa, como ela os declara. */
export interface Habilitacao {
  titulo: 'certificado' | 'alvara' | 'nenhum';
  /** Classe do alvará (1 a 9). Irrelevante no certificado. */
  classe: number | null;
  subcategorias: Subcategoria[];
}

/** O limite de valor que esta habilitação cobre, em cêntimos. null = sem limite (classe 9). */
export function limiteDe(h: Habilitacao): Cents | null {
  if (h.titulo === 'nenhum') return 0;
  if (h.titulo === 'certificado') return LIMITE_CERTIFICADO_CENTS;
  const c = CLASSES.find((x) => x.classe === h.classe);
  return c ? c.limiteCents : 0;
}

/** A classe mínima que cobre um dado valor global, ou 9 quando nenhuma das anteriores chega. */
export function classeNecessaria(valorGlobalCents: Cents): number {
  const c = CLASSES.find((x) => x.limiteCents !== null && valorGlobalCents <= x.limiteCents);
  return c ? c.classe : 9;
}

export type Veredicto = 'pode' | 'falta_classe' | 'falta_subcategoria' | 'falta_ambos' | 'sem_titulo';

export interface Elegibilidade {
  veredicto: Veredicto;
  /** Resumo numa linha, para o cartão do concurso. */
  resumo: string;
  /** O que fazer a seguir, quando não pode concorrer sozinha. */
  caminho: string | null;
  classeNecessaria: number;
  subcategoriasEmFalta: Subcategoria[];
}

/**
 * Pode esta empresa ser o empreiteiro deste concurso?
 *
 * `valorGlobalCents` é o valor estimado (ou o preço base) de **toda** a empreitada, não da parte de
 * pintura — é esse o valor que o artigo 8.º manda cobrir.
 */
export function elegibilidade(h: Habilitacao, valorGlobalCents: Cents, exigidas: Subcategoria[]): Elegibilidade {
  const precisa = classeNecessaria(valorGlobalCents);
  const emFalta = exigidas.filter((s) => !h.subcategorias.includes(s));

  if (h.titulo === 'nenhum') {
    return {
      veredicto: 'sem_titulo',
      resumo: 'Sem alvará nem certificado do IMPIC, não pode concorrer a obra pública.',
      caminho: 'O certificado de empreiteiro habilita até 40 000 € e não exige quadro técnico nas subcategorias de pintura e de impermeabilizações.',
      classeNecessaria: precisa,
      subcategoriasEmFalta: emFalta,
    };
  }

  const limite = limiteDe(h);
  const cobreValor = limite === null || valorGlobalCents <= limite;
  const subOk = emFalta.length === 0;

  if (cobreValor && subOk) {
    return {
      veredicto: 'pode',
      resumo: 'A sua habilitação cobre o valor e as subcategorias deste concurso.',
      caminho: null,
      classeNecessaria: precisa,
      subcategoriasEmFalta: [],
    };
  }

  const faltas: string[] = [];
  if (!cobreValor) faltas.push(`é precisa a classe ${precisa}`);
  if (!subOk) faltas.push(`faltam as subcategorias ${emFalta.map((s) => `${s}) ${SUBCATEGORIA_LABELS[s]}`).join(', ')}`);

  return {
    veredicto: !cobreValor && !subOk ? 'falta_ambos' : !cobreValor ? 'falta_classe' : 'falta_subcategoria',
    resumo: `Não pode concorrer como empreiteiro: ${faltas.join(' e ')}.`,
    caminho: !cobreValor
      ? 'A classe mede-se pelo valor global da empreitada, não pela parte de pintura. O caminho aqui é a subcontratação ou o consórcio.'
      : 'Pode pedir ao IMPIC o averbamento da subcategoria em falta; nas de pintura e de impermeabilizações não é exigido quadro técnico.',
    classeNecessaria: precisa,
    subcategoriasEmFalta: emFalta,
  };
}

// Limiares do CCP (DL 177/2026, em vigor desde 1 de Outubro de 2026), em cêntimos, para empreitadas.
// Subiram muito: o ajuste directo passou de 30 000 € para 150 000 € e a consulta prévia de 150 000 €
// para 1 000 000 €. A consequência para quem espera por anúncios é dura e está em docs/DECISOES.md.
export const LIMIAR_AJUSTE_DIRETO_CENTS: Cents = 15_000_000;
export const LIMIAR_CONSULTA_PREVIA_CENTS: Cents = 100_000_000;
export const LIMIAR_CONSULTA_PREVIA_ESPECIAL_CENTS: Cents = 200_000_000;
export const LIMIAR_EUROPEU_CENTS: Cents = 540_400_000;

export type Procedimento = 'ajuste_direto' | 'consulta_previa' | 'consulta_previa_especial' | 'concurso_publico' | 'concurso_publico_joue';

/** Com que procedimento é que uma empreitada deste valor pode ser adjudicada, e se é anunciada publicamente. */
export function procedimentoPossivel(valorCents: Cents): { minimo: Procedimento; anunciado: boolean } {
  if (valorCents < LIMIAR_AJUSTE_DIRETO_CENTS) return { minimo: 'ajuste_direto', anunciado: false };
  if (valorCents < LIMIAR_CONSULTA_PREVIA_CENTS) return { minimo: 'consulta_previa', anunciado: false };
  if (valorCents < LIMIAR_CONSULTA_PREVIA_ESPECIAL_CENTS) return { minimo: 'consulta_previa_especial', anunciado: false };
  if (valorCents < LIMIAR_EUROPEU_CENTS) return { minimo: 'concurso_publico', anunciado: true };
  return { minimo: 'concurso_publico_joue', anunciado: true };
}

/**
 * Códigos CPV que interessam a uma empresa de pintura. O aviso da secção de notas do levantamento é
 * importante: grande parte das empreitadas que um pintor quer apanhar **não** vem classificada em
 * 4544xxxx, vem como recuperação ou restauro, porque a pintura é um capítulo do mapa de quantidades.
 * Filtrar só por estes códigos perde a maior parte do mercado — tem de se cruzar com pesquisa de texto.
 */
export const CPV_PINTURA: { codigo: string; label: string; nucleo?: boolean }[] = [
  { codigo: '45442100-8', label: 'Obras de pintura', nucleo: true },
  { codigo: '45442110-1', label: 'Pintura de edifícios', nucleo: true },
  { codigo: '45442180-2', label: 'Renovação de pintura', nucleo: true },
  { codigo: '45443000-4', label: 'Obras de fachada', nucleo: true },
  { codigo: '45321000-3', label: 'Obras de isolamento térmico (ETICS)', nucleo: true },
  { codigo: '45261420-4', label: 'Obras de impermeabilização', nucleo: true },
  { codigo: '45440000-3', label: 'Pintura e colocação de vidros' },
  { codigo: '45442000-7', label: 'Aplicação de revestimentos protectores' },
  { codigo: '45442120-4', label: 'Pintura e revestimentos protectores de estruturas' },
  { codigo: '45442190-5', label: 'Decapagem de tinta' },
  { codigo: '45442200-9', label: 'Aplicação de revestimentos anticorrosivos' },
  { codigo: '45442300-0', label: 'Obras de protecção de superfícies' },
  { codigo: '45410000-4', label: 'Trabalhos de estucagem' },
  { codigo: '45450000-6', label: 'Outras obras de acabamento de edifícios' },
  { codigo: '45320000-6', label: 'Obras de isolamento' },
  { codigo: '45261400-8', label: 'Obras de revestimento isolador' },
  { codigo: '45261220-2', label: 'Pintura de telhados e outros revestimentos' },
  { codigo: '45453000-7', label: 'Obras de revisão e recuperação' },
  { codigo: '45453100-8', label: 'Obras de recuperação' },
  { codigo: '45454100-5', label: 'Obras de restauro' },
  { codigo: '45262690-4', label: 'Restauração de edifícios degradados' },
  { codigo: '45262330-3', label: 'Reparação de betão' },
];

/** Palavras a cruzar com o CPV na pesquisa do objecto do contrato, pela razão acima. */
export const PALAVRAS_OBJETO = ['pintura', 'pintar', 'fachada', 'etics', 'capoto', 'isolamento térmico', 'impermeabiliza', 'reabilitação', 'revestimento'];
