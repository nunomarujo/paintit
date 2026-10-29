import type { Cents } from './money';
import type { Classificacao, TrabalhoNaProposta } from './comparador';
import { TRABALHOS_COM_DEMAOS } from './comparador';
import type { DesiredWork } from './request';

/**
 * A síntese: uma linha por critério, uma coluna por proposta, e nada mais.
 *
 * Nasce de uma observação do promotor (29/10/2026): quem abre o comparador precisa de saber, no
 * primeiro ecrã, **o que merece atenção** — e a análise detalhada serve para confirmar, não para
 * descobrir. Daí a forma: critérios sempre na mesma ordem à esquerda, propostas em colunas.
 *
 * ## Três regras que esta tabela não quebra
 *
 * 1. **Nenhuma célula é pintada de verde por cumprir.** A cor de aviso não se usa para destaque
 *    (CLAUDE.md, regra 13): pintar o que está bem ensina a ignorar o que está mal. O tom `atencao`
 *    existe para o texto ficar âmbar, e **traz sempre o motivo escrito** — quem não distingue a cor
 *    lê a mesma informação.
 * 2. **Mais demãos ou mais anos de garantia não são "melhor".** A tabela mostra o que cada proposta
 *    declara e deixa a leitura ao cliente. Uma tinta mais cara não é uma tinta melhor, e isso já
 *    estava escrito na nota do catálogo deste projecto antes de aqui chegar.
 * 3. **A última linha não elege ninguém.** Resume o que está acima, em palavras, sem pontuação e
 *    sem vencedor global: é o cliente que decide o que pesa mais.
 *
 * Só entram as linhas que o **pedido** torna relevantes: não se pergunta pelas demãos a quem só
 * pediu uma lavagem.
 */

export type Tom = 'neutro' | 'atencao';

export interface CelulaDaSintese {
  texto: string;
  tom: Tom;
  /**
   * Porque é que esta célula pede atenção. Escrito, nunca só na cor — e é também o que a célula
   * mostra quando se abre o detalhe.
   */
  motivo: string | null;
}

export interface LinhaDaSintese {
  id: string;
  criterio: string;
  celulas: CelulaDaSintese[];
  /** O preço, que se lê maior. Não é destaque de cor. */
  destacada?: boolean;
}

export interface PropostaNaSintese {
  id: string;
  alias: string;
  totalComIva: Cents;
  classificacao: Classificacao;
  trabalhos: TrabalhoNaProposta[];
  garantiaAnos: number | null;
  duracaoDias: number | null;
  inicioPossivel: string | null;
  adiantamentoBps: number;
}

export interface ContextoDaSintese {
  /** Os trabalhos que o cliente pediu: são eles que decidem as linhas da tabela. */
  pedidos: readonly DesiredWork[];
  /** Área do levantamento do cliente, em centésimos de m². Null quando não há levantamento. */
  areaPedidoCm2: number | null;
  formataEuros: (c: Cents) => string;
  formataArea: (cm2: number) => string;
  formataData: (iso: string) => string;
}

const neutro = (texto: string): CelulaDaSintese => ({ texto, tom: 'neutro', motivo: null });
const atencao = (texto: string, motivo: string): CelulaDaSintese => ({ texto, tom: 'atencao', motivo });
const naoIndicada = (motivo: string) => atencao('Não indicada', motivo);

/** Os trabalhos de preparação do suporte, que se dizem numa linha só. */
const PREPARACAO: readonly DesiredWork[] = ['lavagem', 'reparacao_fissuras', 'tratamento_humidade', 'primario'];

/** Trabalhos cujo produto e demãos valem uma linha própria. */
const ACABAMENTO: readonly DesiredWork[] = ['pintura', 'impermeabilizacao'];

/**
 * A frase que se lê antes da tabela. Factual e sem recomendação: diz qual tem o menor total entre
 * as que estão completas, e — quando é outra — qual tem o menor total de todas e o que lhe falta.
 * Ser a mais barata e estar incompleta são dois factos, e o cliente tem de os ver juntos.
 */
export function leituraImediata(ps: PropostaNaSintese[], formata: (c: Cents) => string): string | null {
  if (ps.length < 2) return null;
  const maisBarata = (xs: PropostaNaSintese[]) => [...xs].sort((a, b) => a.totalComIva - b.totalComIva)[0];
  const completas = ps.filter((p) => p.classificacao.cobertura.completa && p.classificacao.cobertura.semPrecoFirme === 0 && p.classificacao.definicao.definido);
  const barataGlobal = maisBarata(ps)!;
  const barataCompleta = completas.length ? maisBarata(completas)! : null;

  if (barataCompleta && barataCompleta.id === barataGlobal.id) {
    return `${barataCompleta.alias} tem o menor total (${formata(barataCompleta.totalComIva)}) e inclui todos os trabalhos pedidos, sem custos por fechar.`;
  }
  const pendencias = oEssencial(barataGlobal, false).texto.toLocaleLowerCase('pt-PT');
  if (!barataCompleta) {
    return `Nenhuma proposta inclui todos os trabalhos pedidos com o preço fechado. ${barataGlobal.alias} apresenta o menor total (${formata(barataGlobal.totalComIva)}), mas falta ${pendencias}.`;
  }
  return `${barataCompleta.alias} tem o menor total (${formata(barataCompleta.totalComIva)}) entre as propostas que incluem todos os trabalhos pedidos e não apresentam custos por fechar. ${barataGlobal.alias} apresenta o menor total (${formata(barataGlobal.totalComIva)}), mas falta ${pendencias}.`;
}

export function sinteseDasPropostas(ps: PropostaNaSintese[], ctx: ContextoDaSintese): LinhaDaSintese[] {
  if (ps.length === 0) return [];
  const linhas: LinhaDaSintese[] = [];
  const porCada = (f: (p: PropostaNaSintese) => CelulaDaSintese) => ps.map(f);

  linhas.push({
    id: 'total',
    criterio: 'Total com IVA',
    destacada: true,
    celulas: porCada((p) => neutro(ctx.formataEuros(p.totalComIva))),
  });

  // Sem trabalhos no pedido não há cobertura que se classifique: a linha diria «todos incluídos» de
  // uma lista vazia, ou «0 por esclarecer». Acontece na base real — há pedidos publicados com a
  // lista de trabalhos vazia — e o que se pode dizer é que o pedido não os indica.
  const semPedido = ctx.pedidos.length === 0;
  // Âmbito e preço, separados: um trabalho previsto com preço por fechar não é uma omissão, e uma
  // omissão não é uma incerteza de preço (correcção do promotor, 29/10/2026).
  linhas.push({
    id: 'trabalhos',
    criterio: 'Trabalhos pedidos',
    celulas: porCada((p) => {
      if (semPedido) {
        return atencao(
          'Pedido sem trabalhos indicados',
          'O pedido não indica que trabalhos quer, e por isso não se pode dizer se esta proposta os cobre. Complete o pedido ou peça ao pintor a lista do que inclui.',
        );
      }
      const c = p.classificacao.cobertura;
      if (c.completa) return neutro('Todos incluídos');
      const faltas = [
        p.trabalhos.filter((t) => t.estado === 'nao_indicado').length,
        p.trabalhos.filter((t) => t.estado === 'excluido').length,
      ];
      const [naoIndicados, excluidos] = faltas as [number, number];
      const partes = [
        naoIndicados ? `${naoIndicados} por esclarecer` : '',
        excluidos ? `${excluidos} ${excluidos === 1 ? 'excluído' : 'excluídos'}` : '',
      ].filter(Boolean);
      const opcionais = p.trabalhos.filter((t) => t.estado === 'opcional').length;
      if (partes.length === 0) {
        return opcionais
          ? atencao(`${opcionais} em opção`, 'O pintor deixa estes trabalhos à sua escolha. Confirme o preço de cada um: se os quiser, somam ao total apresentado.')
          : neutro('Todos incluídos');
      }
      // Não indicar **não comprova exclusão** (correcção do promotor, 29/10/2026): o pintor pode
      // tê-los esquecido, ou tê-los dado por implícitos. Dizer «não estão nesta proposta» afirma o
      // que a proposta não diz. O que se pode afirmar é que não está esclarecido — e o que fazer.
      const motivo = [
        naoIndicados
          ? `A proposta não esclarece se inclui ${naoIndicados === 1 ? 'este trabalho' : `estes ${naoIndicados} trabalhos`}. Pergunte ao pintor se os faz e por que preço, antes de comparar este total com os outros.`
          : '',
        excluidos
          ? `O pintor indica expressamente que não faz ${excluidos === 1 ? 'um dos trabalhos pedidos' : `${excluidos} dos trabalhos pedidos`}. Para os ter feitos, terá de os contratar a outra pessoa.`
          : '',
      ]
        .filter(Boolean)
        .join(' ');
      return atencao(partes.join(', '), motivo);
    }),
  });

  linhas.push({
    id: 'custos_por_fechar',
    criterio: 'Custos por fechar',
    celulas: porCada((p) => {
      const n = p.classificacao.cobertura.semPrecoFirme;
      const zonas = p.classificacao.definicao.reparos.includes('há zonas do pedido sem preço');
      if (n === 0 && !zonas) return neutro('Nenhum declarado');
      const partes = [
        n ? `${n} ${n === 1 ? 'trabalho' : 'trabalhos'} após observação` : '',
        zonas ? 'zonas sem preço' : '',
      ].filter(Boolean);
      return atencao(partes.join(', '), 'Há trabalhos cujo preço o pintor só fecha depois de ver a obra. Peça um limite máximo, ou o preço unitário e a forma de medir, para saber até onde o total pode subir.');
    }),
  });

  // Área: só quando há levantamento com que comparar, e só se alguma proposta declarar área.
  const areas = ps.map((p) => areaDeclarada(p.trabalhos));
  if (areas.some((a) => a !== null)) {
    linhas.push({
      id: 'area',
      criterio: 'Área de pintura',
      celulas: ps.map((p, i) => {
        const a = areas[i]!;
        if (a === null) return naoIndicada('Não indica a área. Confirme sobre que metros quadrados foi feito o orçamento.');
        const texto = ctx.formataArea(a);
        if (ctx.areaPedidoCm2 === null || a === ctx.areaPedidoCm2) return neutro(texto);
        // Dizer «diverge», e não «conta a mais»: pode ser outro critério de medição, e não um erro.
        return atencao(
          `${texto} — diverge`,
          `O pintor conta ${texto} onde o pedido diz ${ctx.formataArea(ctx.areaPedidoCm2)}. Confirme o que cada medição abrange e como foi feita, antes de comparar os preços.`,
        );
      }),
    });
  }

  if (ctx.pedidos.some((w) => PREPARACAO.includes(w))) {
    linhas.push({
      id: 'preparacao',
      criterio: 'Preparação do suporte',
      celulas: porCada((p) => {
        const incluidos = p.trabalhos.filter((t) => PREPARACAO.includes(t.work) && t.estado === 'incluido');
        if (incluidos.length === 0) return naoIndicada('Não indica a preparação do suporte. Confirme o que faz antes de pintar — lavagem, tratamento de fissuras, primário — e se está incluído no preço.');
        // Separador em vez de «e»: o próprio rótulo «Lavagem e limpeza» já traz um, e encadeá-los
        // dava «lavagem e limpeza, reparação de fissuras e primário», que não se lê.
        return neutro(incluidos.map((t) => t.label.toLocaleLowerCase('pt-PT')).join(' · '));
      }),
    });
  }

  for (const work of ACABAMENTO) {
    if (!ctx.pedidos.includes(work)) continue;
    linhas.push({
      id: `acabamento_${work}`,
      criterio: work === 'pintura' ? 'Pintura de acabamento' : 'Impermeabilização',
      celulas: porCada((p) => {
        const t = p.trabalhos.find((x) => x.work === work);
        if (!t || t.estado !== 'incluido') return naoIndicada('A proposta não se pronuncia sobre este trabalho. Confirme se o faz e por que preço.');
        return celulaDeExecucao(t);
      }),
    });
  }

  linhas.push({
    id: 'garantia',
    criterio: 'Garantia da execução',
    celulas: porCada((p) =>
      p.garantiaAnos === null
        ? naoIndicada('Não indica garantia. Pergunte que garantia dá e por quanto tempo — a ausência de prazo escrito não afasta os direitos que a lei já lhe dá, mas deixa-os por concretizar.')
        : neutro(`${p.garantiaAnos} ${p.garantiaAnos === 1 ? 'ano' : 'anos'}`),
    ),
  });

  linhas.push({
    id: 'prazos',
    criterio: 'Início / duração',
    celulas: porCada((p) => {
      const inicio = p.inicioPossivel ? ctx.formataData(p.inicioPossivel) : 'A combinar';
      const dur = p.duracaoDias === null ? 'duração não indicada' : `${p.duracaoDias} ${p.duracaoDias === 1 ? 'dia útil' : 'dias úteis'}`;
      const texto = `${inicio} · ${dur}`;
      return p.duracaoDias === null
        ? atencao(texto, 'Não indica a duração. Confirme o prazo e as limitações de utilização previstas durante a obra.')
        : neutro(texto);
    }),
  });

  linhas.push({
    id: 'adiantamento',
    criterio: 'Adiantamento',
    celulas: porCada((p) => neutro(`${Math.round(p.adiantamentoBps / 100)}%`)),
  });

  linhas.push({
    id: 'essencial',
    criterio: 'O essencial',
    celulas: porCada((p) => {
      const frase = oEssencial(p, semPedido);
      return frase.atencao ? atencao(frase.texto, frase.motivo!) : neutro(frase.texto);
    }),
  });

  return linhas;
}

/** A área só se soma quando todos os trabalhos de pintura a declaram na mesma unidade. */
function areaDeclarada(ts: TrabalhoNaProposta[]): number | null {
  const pint = ts.filter((t) => t.work === 'pintura' && t.estado === 'incluido');
  if (pint.length === 0) return null;
  if (pint.some((t) => t.quantidade === null || t.unidade !== 'm2')) return null;
  return pint.reduce((n, t) => n + t.quantidade!, 0);
}

function celulaDeExecucao(t: TrabalhoNaProposta): CelulaDaSintese {
  const produto = t.produtos.length === 0 ? null : t.produtos.length <= 2 ? t.produtos.join(' e ') : `${t.produtos.length} produtos — ver detalhe`;
  const leva = TRABALHOS_COM_DEMAOS.includes(t.work);
  const demaos = t.demaos === null ? null : `${t.demaos} ${t.demaos === 1 ? 'demão' : 'demãos'}`;
  if (produto && (demaos || !leva)) return neutro([produto, demaos].filter(Boolean).join(' · '));
  if (produto && !demaos) return atencao(`${produto} · demãos não indicadas`, 'Indica a tinta mas não o número de camadas. Confirme quantas demãos aplica, porque é isso que falta para comparar com as outras propostas.');
  if (!produto && demaos) return atencao(`Produto não indicado · ${demaos}`, 'Indica o número de camadas mas não a tinta. Confirme que produto aplica e se é adequado ao suporte.');
  return naoIndicada('Não indica a tinta nem o número de camadas deste trabalho. Confirme os dois antes de comparar o preço.');
}

/**
 * A conclusão de cada proposta: o que está acima, dito numa frase. Sem pontuação, sem comparar com
 * as outras e sem eleger nenhuma — a ordem de prioridade é âmbito, depois preço, depois execução,
 * porque é essa a ordem em que uma falha estraga a comparação.
 */
function oEssencial(p: PropostaNaSintese, semPedido: boolean): { texto: string; atencao: boolean; motivo: string | null } {
  const { cobertura, definicao, tecnica } = p.classificacao;
  const faltaAmbito = p.trabalhos.filter((t) => t.estado === 'nao_indicado' || t.estado === 'excluido').length;
  const pendencias: string[] = [];
  if (faltaAmbito) pendencias.push(faltaAmbito === 1 ? 'esclarecer 1 trabalho' : `esclarecer ${faltaAmbito} trabalhos`);
  if (cobertura.semPrecoFirme || !definicao.definido) pendencias.push('fechar o preço em falta');
  if (!tecnica.confirmada) pendencias.push('confirmar a execução');

  // «Preço definido» afirmava mais do que os dados mostram: não haver condicionados declarados não é
  // o mesmo que o pintor ter confirmado um preço fixo (correcção do promotor, 29/10/2026). O que se
  // pode dizer é o que está declarado — e não o que daí se concluiria.
  if (semPedido) {
    return {
      texto: 'Sem pedido definido para comparar',
      atencao: true,
      motivo: 'Enquanto o pedido não indicar que trabalhos quer, nenhuma proposta pode ser dada como completa.',
    };
  }
  if (pendencias.length === 0) return { texto: 'Cobre o pedido; sem custos por fechar declarados', atencao: false, motivo: null };
  return {
    texto: maiuscula(listar(pendencias)),
    atencao: true,
    motivo: 'Até isto ficar esclarecido, o valor final pode ser diferente do que está aqui.',
  };
}

const maiuscula = (s: string) => `${s[0]?.toLocaleUpperCase('pt-PT') ?? ''}${s.slice(1)}`;

function listar(xs: string[]): string {
  if (xs.length <= 1) return xs[0] ?? '';
  return `${xs.slice(0, -1).join(', ')} e ${xs[xs.length - 1]}`;
}

/**
 * As linhas em que as propostas **não dizem todas o mesmo**.
 *
 * Pedido do promotor (29/10/2026): destacar o que muda antes da grelha completa, sem dispensar a
 * grelha — os critérios iguais continuam a ter de aparecer, porque é assim que o cliente confirma
 * que a cobertura é a mesma. Aqui só se diz o que distingue.
 *
 * O total fica de fora por ser sempre diferente e já estar em cima, e «O essencial» também, por ser
 * o resumo das linhas e não uma delas.
 */
/** Acima disto, um grupo diz-se pelo número em vez de se nomear proposta a proposta. */
const LIMITE_PARA_NOMEAR = 3;

export function diferencasRelevantes(linhas: LinhaDaSintese[], aliases: string[]): { criterio: string; frase: string }[] {
  const fora = new Set(['total', 'essencial']);
  return linhas
    .filter((l) => !fora.has(l.id))
    .filter((l) => new Set(l.celulas.map((c) => c.texto)).size > 1)
    .map((l) => {
      // Agrupar por texto igual: «A e B: 240 m² · C: 310 m² — diverge» lê-se; três cláusulas
      // separadas para dizer o mesmo duas vezes, não.
      const porTexto = new Map<string, string[]>();
      l.celulas.forEach((c, i) => {
        const quem = aliases[i];
        if (!quem) return;
        porTexto.set(c.texto, [...(porTexto.get(c.texto) ?? []), quem]);
      });
      // Com dez propostas, nomear as nove que dizem o mesmo é pior do que não dizer nada: a frase
      // enche-se de aliases e a diferença — que é o ponto — desaparece no meio. O grupo maior passa
      // a «as restantes N», e nomeiam-se as minorias, que são as que distinguem.
      const grupos = [...porTexto.entries()].sort((a, b) => a[1].length - b[1].length);
      const maior = grupos[grupos.length - 1];
      const partes = grupos.map(([texto, quem], i) => {
        const ultimo = i === grupos.length - 1;
        const nomear = !ultimo || quem.length <= LIMITE_PARA_NOMEAR || grupos.length === 1;
        if (nomear) return `${listar(quem)}: ${texto}`;
        return `${quem.length === maior![1].length && grupos.length > 1 ? `as restantes ${quem.length}` : listar(quem)}: ${texto}`;
      });
      return { criterio: l.criterio, frase: partes.join(' · ') };
    });
}

/**
 * As pendências das propostas que receberam indicação — as que o cliente está mesmo a ponderar.
 *
 * É a regra que o promotor pediu: se há uma questão capaz de alterar a escolha, aparece na primeira
 * página e não enterrada no detalhe. Uma pendência numa proposta que ninguém está a considerar não
 * altera escolha nenhuma, e por isso não sobe.
 */
export function pendenciasQueImportam(
  linhas: LinhaDaSintese[],
  aliases: string[],
  indicados: string[],
): { alias: string; criterio: string; motivo: string }[] {
  const quais = new Set(indicados);
  const fora = new Set(['essencial']);
  const out: { alias: string; criterio: string; motivo: string }[] = [];
  for (const l of linhas) {
    if (fora.has(l.id)) continue;
    l.celulas.forEach((c, i) => {
      const alias = aliases[i];
      if (!alias || !quais.has(alias) || c.tom !== 'atencao' || !c.motivo) return;
      out.push({ alias, criterio: l.criterio, motivo: c.motivo });
    });
  }
  return out;
}
