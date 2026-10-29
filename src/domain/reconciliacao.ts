import type { Cents } from './money';
import type { LineCategory } from './proposal';
import { porEsclarecer, type TrabalhoNaProposta } from './comparador';

/**
 * Explicar a diferença de preço entre duas propostas, sem inventar a decomposição.
 *
 * Passo 3 do comparador (docs/DECISOES.md, 28/10/2026). A regra que torna isto defensável numa
 * assembleia de condóminos — que é o leitor verdadeiro deste relatório — é aritmética e não
 * retórica: **as parcelas com euros, mais a diferença não decomposta, dão exactamente a diferença
 * de preço**. Sempre. É uma invariante, não uma aspiração, e está fixada em teste.
 *
 * O que sobra **não se chama margem**. Pode ser produtividade, equipamento, transporte, estrutura,
 * risco — ou margem. Não sabemos, e não o dizemos (correcção do promotor, 28/10/2026).
 *
 * ## A cascata
 *
 * «Cada diferença conta uma única vez» só se implementa com uma ordem fixa, senão o mesmo euro é
 * reclamado por duas causas conforme a ordem do cálculo. Esta é a ordem, e é sempre a mesma:
 *
 *   1. **Âmbito** — trabalhos que uma inclui e a outra não, ao preço de quem os inclui.
 *   2. **Quantidade** — nos trabalhos que ambas incluem, a diferença de área ou de metros declarados.
 *   3. **Execução e materiais** — demãos ou produto diferentes. **Descreve-se, sem lhe atribuir
 *      euros**: separar quanto da diferença de preço unitário é a demão a mais exigiria saber o
 *      custo do pintor, que não sabemos. Os euros desse trabalho vão para a não decomposta.
 *   4. **Condições de obra** — acessos e licenças que ambas incluem com valores diferentes.
 *   5. **Preço** — só onde tudo o resto é equivalente: mesma quantidade, mesmas demãos, mesmo
 *      produto. É o único desconto verdadeiro.
 *   6. O que não couber: **não decomposta**.
 *
 * ## A convenção da parcela de quantidade
 *
 * Com `T = Q × P`, a diferença entre dois trabalhos reparte-se exactamente assim:
 *
 *     T(b) − T(a) = (Q(b) − Q(a)) × P(a)   +   Q(b) × (P(b) − P(a))
 *                   └── quantidade ──┘          └──── preço ────┘
 *
 * A repartição não é única — podia medir-se a quantidade ao preço de B. Escolhe-se o preço de A, a
 * proposta à esquerda, e diz-se: uma convenção escrita é auditável, uma convenção implícita não.
 */

export const CAUSAS = ['ambito', 'quantidade', 'execucao', 'condicoes', 'preco', 'nao_decomposta'] as const;
export type Causa = (typeof CAUSAS)[number];

export const CAUSA_LABELS: Record<Causa, string> = {
  ambito: 'Âmbito',
  quantidade: 'Quantidade',
  execucao: 'Execução e materiais',
  condicoes: 'Condições de obra',
  preco: 'Preço',
  nao_decomposta: 'Diferença não decomposta',
};

export const CAUSA_EXPLICACOES: Record<Causa, string> = {
  ambito: 'Trabalhos que uma inclui e a outra não.',
  quantidade: 'Mesma zona, área ou metros declarados diferentes.',
  execucao: 'Demãos ou produto diferentes. Descreve-se; o custo não se separa.',
  condicoes: 'Acessos e licenças com valores diferentes.',
  preco: 'Tudo igual, preço diferente. É o único desconto verdadeiro.',
  nao_decomposta: 'O orçamento não permite separar esta parcela. Não é margem.',
};

/**
 * De onde vem o número. A distinção é a diferença entre uma prova e uma simulação, e o cliente tem
 * direito a vê-la antes de decidir: fechar a conta ao cêntimo não prova que cada atribuição seja
 * legítima — a parcela não decomposta fecha-a sempre, por construção.
 *
 * - `declarado`: o valor está escrito na proposta. O preço de um trabalho que uma inclui e a outra
 *   não; a diferença entre dois valores de acessos. Não há conta nossa pelo meio.
 * - `calculado`: o valor resulta de uma convenção de repartição nossa, aplicada a números
 *   declarados. Medir a quantidade ao preço unitário da proposta de referência é uma escolha, não
 *   um facto: medi-la ao preço da outra daria outra repartição com a mesma diferença total.
 */
export const PROVENIENCIAS_DE_VALOR = ['declarado', 'calculado'] as const;
export type ProvenienciaDeValor = (typeof PROVENIENCIAS_DE_VALOR)[number];

export interface Parcela {
  causa: Causa;
  descricao: string;
  /** Cêntimos. Positivo: torna a segunda proposta mais cara. Null: descrita, sem euros atribuídos. */
  valorCents: Cents | null;
  proveniencia: ProvenienciaDeValor;
}

export interface LadoDaReconciliacao {
  /** Identificador da proposta: é por ele que a pergunta sabe a quem se envia. */
  id: string;
  alias: string;
  /** Soma das linhas incluídas, sem IVA. */
  base: Cents;
  /** Pela mesma ordem nos dois lados: os trabalhos que o cliente pediu. */
  trabalhos: TrabalhoNaProposta[];
  categorias: Record<LineCategory, Cents | null>;
  /** Preço fechado da obra toda: não há repartição para comparar. */
  precoGlobal: boolean;
}

export interface Reconciliacao {
  /** Positivo: a segunda é mais cara. Sobre a base sem IVA. */
  diferencaCents: Cents;
  parcelas: Parcela[];
  naoDecompostaCents: Cents;
  /** Uma das duas tem preço global: só se compara o total. */
  indecomponivel: boolean;
  /** Diferenças técnicas sem euros atribuídos, para se dizerem a seguir às parcelas. */
  notasTecnicas: string[];
}

const naoNulo = (v: Cents | null) => v ?? 0;

export function reconciliar(a: LadoDaReconciliacao, b: LadoDaReconciliacao): Reconciliacao {
  const diferencaCents = b.base - a.base;
  if (a.precoGlobal || b.precoGlobal) {
    return { diferencaCents, parcelas: [], naoDecompostaCents: diferencaCents, indecomponivel: true, notasTecnicas: [] };
  }

  const parcelas: Parcela[] = [];
  const notasTecnicas: string[] = [];

  // 1 e 2 e 5: trabalho a trabalho, pela cascata.
  for (const [i, ta] of a.trabalhos.entries()) {
    const tb = b.trabalhos[i];
    if (!tb) continue;
    const naA = ta.estado === 'incluido';
    const naB = tb.estado === 'incluido';

    if (naA && !naB) {
      parcelas.push({ causa: 'ambito', descricao: `${a.alias} inclui ${min(ta.label)}, ${b.alias} não`, valorCents: -ta.precoCents, proveniencia: 'declarado' });
      continue;
    }
    if (!naA && naB) {
      parcelas.push({ causa: 'ambito', descricao: `${b.alias} inclui ${min(tb.label)}, ${a.alias} não`, valorCents: tb.precoCents, proveniencia: 'declarado' });
      continue;
    }
    if (!naA && !naB) continue;

    // Ambas incluem. A quantidade só se compara dentro da mesma unidade.
    const comparavel = ta.unidade !== null && ta.unidade === tb.unidade && ta.quantidade !== null && tb.quantidade !== null && ta.quantidade > 0;
    const execucaoDifere = ta.demaos !== tb.demaos || !mesmosProdutos(ta.produtos, tb.produtos);

    if (!comparavel) {
      // Sem quantidade comparável não há repartição possível: o trabalho inteiro fica por decompor.
      if (execucaoDifere) notasTecnicas.push(diferencaTecnica(a.alias, ta, b.alias, tb));
      continue;
    }

    const pA = (ta.precoCents * 100) / ta.quantidade!;
    const efeitoQuantidade = Math.round(((tb.quantidade! - ta.quantidade!) * pA) / 100);
    if (efeitoQuantidade !== 0) {
      parcelas.push({
        causa: 'quantidade',
        descricao: `${min(ta.label)}: ${b.alias} declara ${qt(tb)} onde ${a.alias} declara ${qt(ta)}`,
        valorCents: efeitoQuantidade,
        proveniencia: 'calculado',
      });
    }

    const efeitoRestante = tb.precoCents - ta.precoCents - efeitoQuantidade;
    if (execucaoDifere) {
      // O custo de uma demão a mais não se separa do preço sem saber o custo do pintor. Descreve-se,
      // e os euros deste trabalho ficam por decompor.
      notasTecnicas.push(diferencaTecnica(a.alias, ta, b.alias, tb));
    } else if (efeitoRestante !== 0) {
      parcelas.push({
        causa: 'preco',
        descricao: `${min(ta.label)}: mesma quantidade e mesma execução, preço diferente`,
        valorCents: efeitoRestante,
        // Com as quantidades iguais isto é `T(b) − T(a)`, a diferença entre dois totais escritos:
        // nenhuma convenção lá dentro. Com quantidades diferentes, o que sobra depende de onde se
        // cortou a parcela de quantidade, e aí é tão convencional como ela.
        proveniencia: efeitoQuantidade === 0 ? 'declarado' : 'calculado',
      });
    }
  }

  // 4: acessos e licenças. Só uma a incluir é âmbito; as duas a incluir com valores diferentes são
  // condições de obra — tipicamente o período de andaime ou o tipo de plataforma.
  for (const cat of ['acessos', 'licencas'] as const) {
    const va = naoNulo(a.categorias[cat]);
    const vb = naoNulo(b.categorias[cat]);
    if (va === vb) continue;
    const nome = cat === 'acessos' ? 'acessos e proteções' : 'licenças e taxas';
    if (va === 0 || vb === 0) {
      const quem = va === 0 ? b.alias : a.alias;
      const outro = va === 0 ? a.alias : b.alias;
      parcelas.push({ causa: 'ambito', descricao: `${quem} inclui ${nome}, ${outro} não`, valorCents: vb - va, proveniencia: 'declarado' });
    } else {
      parcelas.push({ causa: 'condicoes', descricao: `${nome}: as duas incluem, com valores diferentes`, valorCents: vb - va, proveniencia: 'declarado' });
    }
  }

  const somaDasParcelas = parcelas.reduce((n, p) => n + (p.valorCents ?? 0), 0);
  // Pela ordem da cascata, e não pela ordem em que foram calculadas. É a mesma ordem em que a regra
  // está escrita, e lê-se como ela: primeiro o que é obra a mais, por fim o que é só preço. Dentro
  // de cada causa mantém-se a ordem dos trabalhos.
  const ordenadas = CAUSAS.flatMap((c) => parcelas.filter((x) => x.causa === c)).map((x) => ({
    ...x,
    descricao: `${x.descricao[0]!.toLocaleUpperCase('pt-PT')}${x.descricao.slice(1)}`,
  }));
  return {
    diferencaCents,
    parcelas: ordenadas,
    // Por construção, e não por sorte: o que as parcelas não explicam é exactamente isto.
    naoDecompostaCents: diferencaCents - somaDasParcelas,
    indecomponivel: false,
    notasTecnicas,
  };
}

/**
 * A diferença de preço, dita em blocos pela **origem do número** e não só pela causa.
 *
 * A razão é a que o promotor apontou a 29/10/2026: a conta fecha sempre ao cêntimo, porque a
 * parcela não decomposta é definida como o resto. Fechar não prova que cada atribuição seja
 * legítima. Atribuir 1.400 € à quantidade medindo-a ao preço unitário de A é uma simulação segundo
 * uma convenção — e se B também mudou o produto e as demãos, não demonstra que os 70 m² a mais
 * expliquem efectivamente aquele custo.
 *
 * Por isso os quatro blocos saem separados e identificados, e **a convenção vai junto da conta**,
 * onde o cliente a lê, e não só no código ou num anexo de pressupostos.
 */
export const BLOCOS_DA_DIFERENCA = ['declarado', 'calculado', 'descrito', 'nao_decomposto'] as const;
export type BlocoId = (typeof BLOCOS_DA_DIFERENCA)[number];

export interface BlocoDaDiferenca {
  id: BlocoId;
  titulo: string;
  /** A convenção ou o limite que sustenta este bloco. Lê-se antes dos números, não depois. */
  nota: string | null;
  linhas: string[];
}

export interface DiferencaEmPalavras {
  /** A frase que o cliente lê primeiro. */
  abertura: string;
  blocos: BlocoDaDiferenca[];
}

export function diferencaEmPalavras(
  a: string,
  b: string,
  r: Reconciliacao,
  formata: (c: Cents) => string,
): DiferencaEmPalavras {
  if (r.diferencaCents === 0) {
    return { abertura: `${a} e ${b} apresentam o mesmo preço sem IVA.`, blocos: [] };
  }
  const maisCara = r.diferencaCents > 0 ? b : a;
  const abertura = `${maisCara} custa mais ${formata(Math.abs(r.diferencaCents))}, sem IVA.`;

  if (r.indecomponivel) {
    return {
      abertura,
      blocos: [{
        id: 'nao_decomposto',
        titulo: 'Sem repartição possível',
        nota: null,
        linhas: ['Uma das propostas tem preço global, sem repartição por trabalho: a diferença não se pode decompor.'],
      }],
    };
  }

  const comValor = (prov: ProvenienciaDeValor) =>
    r.parcelas.filter((p) => p.proveniencia === prov && p.valorCents !== null && p.valorCents !== 0)
      .map((p) => `${formata(Math.abs(p.valorCents!))}: ${p.descricao}.`);

  const blocos: BlocoDaDiferenca[] = [];

  const declarado = comValor('declarado');
  if (declarado.length) {
    blocos.push({
      id: 'declarado',
      titulo: 'Valores escritos nas propostas',
      nota: null,
      linhas: declarado,
    });
  }

  const calculado = comValor('calculado');
  if (calculado.length) {
    blocos.push({
      id: 'calculado',
      titulo: 'Efeito calculado a partir das quantidades declaradas',
      nota: `A quantidade é medida ao preço unitário de ${a}. Medi-la ao preço de ${b} daria outra repartição entre quantidade e preço, com a mesma diferença total. Estes valores não estão escritos nas propostas.`,
      linhas: calculado,
    });
  }

  if (r.notasTecnicas.length) {
    blocos.push({
      id: 'descrito',
      titulo: 'Diferenças sem valor separado',
      nota: 'Separar quanto custa uma demão a mais, ou um produto diferente, exigiria saber o custo de cada empresa. Descreve-se a diferença; os euros desse trabalho ficam por decompor.',
      linhas: r.notasTecnicas.map((n) => `${n}.`),
    });
  }

  if (r.naoDecompostaCents !== 0) {
    blocos.push({
      id: 'nao_decomposto',
      titulo: 'Diferença que os orçamentos não permitem decompor',
      // Sem nomear aquilo que não sabemos — nem para o negar. A decisão do promotor (28/10/2026)
      // é não escrever a palavra: negá-la planta-a na mesma, e o teste fixa-o.
      nota: 'Pode ser produtividade, equipamento, transporte, estrutura de custos ou risco assumido. Dizer qual exigiria saber o custo de cada empresa, que não se conhece.',
      linhas: [`${formata(Math.abs(r.naoDecompostaCents))} não podem ser decompostos com os dados disponíveis.`],
    });
  }

  return { abertura, blocos };
}

/** O mesmo, achatado, para onde só couber uma lista de frases. */
export function emPalavras(a: string, b: string, r: Reconciliacao, formata: (c: Cents) => string): string[] {
  const { abertura, blocos } = diferencaEmPalavras(a, b, r, formata);
  return [abertura, ...blocos.flatMap((bl) => [`${bl.titulo}:`, ...bl.linhas])];
}

const min = (s: string) => s.toLocaleLowerCase('pt-PT');
const mesmosProdutos = (x: readonly string[], y: readonly string[]) =>
  x.length === y.length && x.every((p) => y.some((q) => q.toLocaleLowerCase('pt-PT') === p.toLocaleLowerCase('pt-PT')));

function qt(t: TrabalhoNaProposta): string {
  return t.quantidade !== null && t.unidade ? `${(t.quantidade / 100).toLocaleString('pt-PT', { maximumFractionDigits: 2 })} ${t.unidade === 'm2' ? 'm²' : t.unidade === 'ml' ? 'm' : 'un.'}` : 'quantidade não indicada';
}

/**
 * A frase só nomeia o que **difere**.
 *
 * Dizer "A 2 demãos com CIN; B 2 demãos com Robbialac" quando as demãos são iguais é fazer o leitor
 * procurar a diferença dentro da frase que devia apontá-la (visto no relatório impresso, 29/10/2026).
 */
function diferencaTecnica(aliasA: string, ta: TrabalhoNaProposta, aliasB: string, tb: TrabalhoNaProposta): string {
  const demaosDiferem = ta.demaos !== tb.demaos;
  const produtosDiferem = !mesmosProdutos(ta.produtos, tb.produtos);
  const descreve = (alias: string, t: TrabalhoNaProposta) => {
    const partes = [
      demaosDiferem ? (t.demaos ? `${t.demaos} ${t.demaos === 1 ? 'demão' : 'demãos'}` : 'demãos não indicadas') : null,
      ...(produtosDiferem ? (t.produtos.length ? t.produtos : ['produto não indicado']) : []),
    ].filter(Boolean);
    return `${alias} ${partes.join(' com ')}`;
  };
  return `${min(ta.label)}: ${descreve(aliasA, ta)}; ${descreve(aliasB, tb)}`;
}

export interface Pergunta {
  /** A quem se pergunta. */
  propostaId: string;
  alias: string;
  /** O texto tal como vai ser enviado, na primeira pessoa e sem identificar ninguém. */
  texto: string;
}

/**
 * As perguntas que a conta deixou por fazer, prontas a enviar.
 *
 * Cada uma tem destinatário: uma divergência de medição pergunta-se **aos dois**, porque com duas
 * propostas não há forma de saber qual delas mediu outra coisa — e porque perguntar só a um é
 * tratá-lo como suspeito. O texto nunca diz que houve erro: pergunta pelo critério, que é o que
 * realmente varia (vãos descontados ou não, superfície desenvolvida, varandas à parte).
 */
export function perguntas(a: LadoDaReconciliacao, b: LadoDaReconciliacao, r: Reconciliacao): Pergunta[] {
  const qs: Pergunta[] = [];

  for (const [i, ta] of a.trabalhos.entries()) {
    const tb = b.trabalhos[i];
    if (!tb) continue;

    // Divergência de medição: aos dois, pelo critério e não pelo número.
    const temParcelaDeQuantidade = r.parcelas.some((p) => p.causa === 'quantidade' && p.descricao.toLocaleLowerCase('pt-PT').startsWith(min(ta.label)));
    if (temParcelaDeQuantidade) {
      for (const [lado, propria, outra] of [[a, ta, tb], [b, tb, ta]] as const) {
        qs.push({
          propostaId: lado.id,
          alias: lado.alias,
          texto: `Em ${min(ta.label)} indica ${qt(propria)}, e outra proposta indica ${qt(outra)} para a mesma obra. Pode confirmar que elementos incluiu e qual foi o critério — vãos descontados, superfície desenvolvida, varandas contadas à parte?`,
        });
      }
    }

    for (const [lado, t] of [[a, ta], [b, tb]] as const) {
      if (!porEsclarecer(t.estado)) continue;
      qs.push({
        propostaId: lado.id,
        alias: lado.alias,
        texto: t.estado === 'nao_indicado'
          ? `A proposta não refere ${min(t.label)}, que faz parte do que pedi. Está incluído no preço apresentado? Se não estiver, quanto custaria?`
          : `Em ${min(t.label)} o preço fica sujeito a observação. O que pode mudar depois de ver a obra, e até que valor?`,
      });
    }
  }

  // Sem repetidos: a mesma pergunta ao mesmo pintor conta uma vez.
  const vistas = new Set<string>();
  return qs.filter((q) => {
    const chave = `${q.propostaId}|${q.texto}`;
    if (vistas.has(chave)) return false;
    vistas.add(chave);
    return true;
  });
}
