import type { Cents } from './money';

// Preço cobrado contra custo real (25/10/2026, docs/DECISOES.md).
//
// É isto que fecha o círculo das ferramentas de obra. Sem isto, registar horas é um favor que o
// pintor faz à aplicação; com isto, é informação que ele quer — porque lhe diz, obra a obra, se o
// preço a que vendeu dava lucro.
//
// Regra que atravessa tudo: só se compara o que é comparável. Uma obra sem horas registadas não tem
// custo de mão de obra nenhum, e apresentar-lhe uma margem alta por causa disso seria pior do que não
// apresentar nada — ele acreditava e repetia o preço.

export interface ObraConcluida {
  id: string;
  nome: string;
  /** Valor sem IVA pelo qual vendeu a obra. */
  valorCents: Cents;
  /** Área intervencionada, em centésimos de m². Null quando não se sabe. */
  areaCm2: number | null;
  /** Custos directos lançados (material, andaime, transporte…). */
  custosDiretos: Cents;
  /** Mão de obra, já com o trabalho suplementar (src/domain/overtime.ts). */
  maoDeObra: Cents;
  /** Horas registadas, em centésimos. Zero significa que ninguém registou nada. */
  horas: number;
  fim: string | null;
}

export interface Margem {
  valor: Cents;
  custo: Cents;
  margem: Cents;
  margemBps: number | null;
  /** Custo real por m², em cêntimos. Null sem área conhecida. */
  custoPorM2: Cents | null;
  precoPorM2: Cents | null;
  /** Sem horas registadas o custo está incompleto e a margem é falsamente boa. */
  fiavel: boolean;
}

export function margemDaObra(o: Pick<ObraConcluida, 'valorCents' | 'areaCm2' | 'custosDiretos' | 'maoDeObra' | 'horas'>): Margem {
  const custo = o.custosDiretos + o.maoDeObra;
  const m2 = o.areaCm2 && o.areaCm2 > 0 ? o.areaCm2 / 100 : null;
  return {
    valor: o.valorCents,
    custo,
    margem: o.valorCents - custo,
    margemBps: o.valorCents > 0 ? Math.round(((o.valorCents - custo) * 10_000) / o.valorCents) : null,
    custoPorM2: m2 ? Math.round(custo / m2) : null,
    precoPorM2: m2 ? Math.round(o.valorCents / m2) : null,
    fiavel: o.horas > 0,
  };
}

/** Quantas obras são precisas para a média deixar de ser uma curiosidade. */
export const MINIMO_OBRAS = 3;

export interface Historico {
  /** Obras contadas: concluídas, com área e com horas registadas. */
  obras: number;
  custoMedioPorM2: Cents | null;
  precoMedioPorM2: Cents | null;
  margemMediaBps: number | null;
  /** O menor e o maior custo por m², para ele ver a dispersão em vez de confiar numa média só. */
  minimoPorM2: Cents | null;
  maximoPorM2: Cents | null;
  /** Abaixo de `MINIMO_OBRAS` a média mostra-se com a ressalva à frente. */
  suficiente: boolean;
}

/**
 * O histórico da empresa, só com obras que o sustentem: concluídas, com área conhecida e com horas
 * registadas. Uma obra sem horas entraria com custo a menos e puxava a média para baixo — que é
 * exactamente o erro que se quer evitar na hora de orçamentar a seguinte.
 */
export function historico(obras: ObraConcluida[]): Historico {
  const uteis = obras.filter((o) => o.areaCm2 !== null && o.areaCm2 > 0 && o.horas > 0 && o.valorCents > 0);
  if (uteis.length === 0) {
    return { obras: 0, custoMedioPorM2: null, precoMedioPorM2: null, margemMediaBps: null, minimoPorM2: null, maximoPorM2: null, suficiente: false };
  }

  const margens = uteis.map((o) => margemDaObra(o));
  const custos = margens.map((m) => m.custoPorM2!).sort((a, b) => a - b);
  const area = uteis.reduce((n, o) => n + o.areaCm2! / 100, 0);
  const custoTotal = margens.reduce((n, m) => n + m.custo, 0);
  const valorTotal = margens.reduce((n, m) => n + m.valor, 0);

  return {
    obras: uteis.length,
    // Média ponderada pela área, não média das médias: uma obra de 40 m² não vale o mesmo que uma de 900.
    custoMedioPorM2: Math.round(custoTotal / area),
    precoMedioPorM2: Math.round(valorTotal / area),
    margemMediaBps: valorTotal > 0 ? Math.round(((valorTotal - custoTotal) * 10_000) / valorTotal) : null,
    minimoPorM2: custos[0]!,
    maximoPorM2: custos[custos.length - 1]!,
    suficiente: uteis.length >= MINIMO_OBRAS,
  };
}

/**
 * O que dizer a quem está a orçamentar, a partir do histórico e do preço por m² que está a pensar
 * praticar. Diz o facto e deixa a decisão com ele — o preço depende da obra, da concorrência e de
 * quanto ele quer aquele trabalho, e nada disso está nesta base de dados.
 */
export function avisoDePreco(h: Historico, precoPorM2: Cents | null): string | null {
  if (!h.suficiente || h.custoMedioPorM2 === null || precoPorM2 === null || precoPorM2 <= 0) return null;
  if (precoPorM2 <= h.custoMedioPorM2) {
    return `Este preço fica abaixo do que as suas obras têm custado (${(h.custoMedioPorM2 / 100).toLocaleString('pt-PT', { minimumFractionDigits: 2 })} €/m², em média de ${h.obras} obras).`;
  }
  const margem = Math.round(((precoPorM2 - h.custoMedioPorM2) * 100) / precoPorM2);
  if (margem < 15) {
    return `Com este preço sobram cerca de ${margem}% acima do custo médio das suas obras. É pouco para absorver um imprevisto.`;
  }
  return null;
}
