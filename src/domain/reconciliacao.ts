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

export interface Parcela {
  causa: Causa;
  descricao: string;
  /** Cêntimos. Positivo: torna a segunda proposta mais cara. Null: descrita, sem euros atribuídos. */
  valorCents: Cents | null;
}

export interface LadoDaReconciliacao {
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
      parcelas.push({ causa: 'ambito', descricao: `${a.alias} inclui ${min(ta.label)}, ${b.alias} não`, valorCents: -ta.precoCents });
      continue;
    }
    if (!naA && naB) {
      parcelas.push({ causa: 'ambito', descricao: `${b.alias} inclui ${min(tb.label)}, ${a.alias} não`, valorCents: tb.precoCents });
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
      parcelas.push({ causa: 'ambito', descricao: `${quem} inclui ${nome}, ${outro} não`, valorCents: vb - va });
    } else {
      parcelas.push({ causa: 'condicoes', descricao: `${nome}: as duas incluem, com valores diferentes`, valorCents: vb - va });
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

/** A frase que o cliente lê primeiro. */
export function emPalavras(a: string, b: string, r: Reconciliacao, formata: (c: Cents) => string): string[] {
  if (r.diferencaCents === 0) return [`${a} e ${b} apresentam o mesmo preço sem IVA.`];
  const maisCara = r.diferencaCents > 0 ? b : a;
  const abs = Math.abs(r.diferencaCents);
  const frases = [`${maisCara} custa mais ${formata(abs)}, sem IVA.`];

  if (r.indecomponivel) {
    frases.push('Uma das propostas tem preço global, sem repartição por trabalho: a diferença não se pode decompor.');
    return frases;
  }
  for (const p of r.parcelas) {
    if (p.valorCents === null || p.valorCents === 0) continue;
    frases.push(`${formata(Math.abs(p.valorCents))}: ${p.descricao}.`);
  }
  frases.push(...r.notasTecnicas.map((n) => `${n} — esse custo não está separado.`));
  if (r.naoDecompostaCents !== 0) {
    frases.push(`${formata(Math.abs(r.naoDecompostaCents))} não podem ser decompostos com os dados disponíveis.`);
  }
  return frases;
}

const min = (s: string) => s.toLocaleLowerCase('pt-PT');
const mesmosProdutos = (x: readonly string[], y: readonly string[]) =>
  x.length === y.length && x.every((p) => y.some((q) => q.toLocaleLowerCase('pt-PT') === p.toLocaleLowerCase('pt-PT')));

function qt(t: TrabalhoNaProposta): string {
  return t.quantidade !== null && t.unidade ? `${(t.quantidade / 100).toLocaleString('pt-PT', { maximumFractionDigits: 2 })} ${t.unidade === 'm2' ? 'm²' : t.unidade === 'ml' ? 'm' : 'un.'}` : 'quantidade não indicada';
}

function diferencaTecnica(aliasA: string, ta: TrabalhoNaProposta, aliasB: string, tb: TrabalhoNaProposta): string {
  const descreve = (alias: string, t: TrabalhoNaProposta) => {
    const partes = [t.demaos ? `${t.demaos} ${t.demaos === 1 ? 'demão' : 'demãos'}` : null, ...t.produtos].filter(Boolean);
    return `${alias} ${partes.length ? partes.join(' com ') : 'não diz como executa'}`;
  };
  return `${min(ta.label)}: ${descreve(aliasA, ta)}; ${descreve(aliasB, tb)}`;
}

/** Perguntas que a reconciliação deixa por fazer, para o cliente enviar ao pintor. */
export function perguntas(a: LadoDaReconciliacao, b: LadoDaReconciliacao, r: Reconciliacao): string[] {
  const qs: string[] = [];
  for (const p of r.parcelas) {
    if (p.causa === 'quantidade') {
      qs.push(`${p.descricao}. Pode confirmar os elementos incluídos e o critério de desconto dos vãos?`);
    }
  }
  for (const [i, ta] of a.trabalhos.entries()) {
    const tb = b.trabalhos[i];
    if (!tb) continue;
    for (const [alias, t] of [[a.alias, ta], [b.alias, tb]] as const) {
      if (porEsclarecer(t.estado)) qs.push(`${alias}: ${min(t.label)} está "${t.estado === 'nao_indicado' ? 'não indicado' : 'só depois de observar'}". Pode dizer se está incluído e em que condições?`);
    }
  }
  return [...new Set(qs)];
}
