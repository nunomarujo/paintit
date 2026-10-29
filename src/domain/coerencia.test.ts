import { describe, expect, it } from 'vitest';
import { classificar, ordenar, trabalhosDaProposta, type SinaisDaProposta, type TrabalhoNaProposta } from './comparador';
import { indicacoes } from './indicacoes';
import { matrizDasPropostas } from './matriz';
import { METODOLOGIA } from './metodologia';
import { formatEuros } from './money';
import { formatArea, type DesiredWork } from './request';
import { sinteseDasPropostas, type ContextoDaSintese } from './sintese';
import type { LineCategory, ProposalLine } from './proposal';

/**
 * As quatro vistas do mesmo pedido têm de dizer o mesmo.
 *
 * A primeira página (matriz e indicações), o comparativo lado a lado (síntese), a explicação
 * económica e a metodologia publicada são escritas por módulos diferentes e lidas em sítios
 * diferentes. Nada impede que divirjam — e já divergiram duas vezes nesta sessão: «0 trabalhos em
 * falta» na matriz enquanto a síntese dizia outra coisa, e «em falta» a juntar dois estados que a
 * síntese separava.
 *
 * Este ficheiro não testa nenhum módulo em particular: testa que **concordam entre si** a partir dos
 * mesmos dados de entrada. É a verificação que o promotor pediu antes de fechar a ronda.
 */

const PEDIDOS: readonly DesiredWork[] = ['lavagem', 'reparacao_fissuras', 'primario', 'pintura', 'impermeabilizacao'];

const l = (p: Partial<ProposalLine>): ProposalLine => ({
  categoria: 'pintura',
  descricao: '',
  superficie: null,
  quantidade: 24000,
  unidade: 'm2',
  precoUnitario: 200,
  demaos: null,
  produto: null,
  inclusao: 'incluido',
  ...p,
});

const CATS = (o: Partial<Record<LineCategory, number>> = {}) =>
  ({ preparacao: null, reparacao: null, pintura: null, acessos: null, licencas: null, outro: null, ...o }) as Record<
    LineCategory,
    number | null
  >;

function monta(alias: string, linhas: ProposalLine[], extra: { garantiaAnos?: number | null; avaliacao?: { media: number; n: number } | null } = {}) {
  const trabalhos: TrabalhoNaProposta[] = trabalhosDaProposta(PEDIDOS, linhas);
  const sinais: SinaisDaProposta = {
    trabalhos,
    temCondicionados: linhas.some((x) => x.inclusao === 'condicionado'),
    zonasSemPreco: 0,
    precoGlobal: false,
  };
  const c = classificar(sinais);
  const base = linhas
    .filter((x) => x.inclusao === 'incluido')
    .reduce((n, x) => n + Math.round((x.quantidade * x.precoUnitario) / 100), 0);
  return {
    id: alias,
    alias,
    totalComIva: Math.round(base * 1.23),
    base,
    trabalhos,
    classificacao: c,
    naoIndicados: trabalhos.filter((t) => t.estado === 'nao_indicado').length,
    excluidos: trabalhos.filter((t) => t.estado === 'excluido').length,
    garantiaAnos: extra.garantiaAnos ?? 5,
    avaliacao: extra.avaliacao ?? { media: 4.5, n: 20 },
    categorias: CATS(),
  };
}

const completa = (alias: string, preco: number, extra = {}) =>
  monta(
    alias,
    [
      l({ trabalho: 'lavagem', precoUnitario: 120, produto: 'Alta pressão' }),
      l({ trabalho: 'fissuras', unidade: 'ml', quantidade: 4200, precoUnitario: 1800, produto: 'Mastique' }),
      l({ trabalho: 'primario', precoUnitario: 180, demaos: 1, produto: 'CIN Primário' }),
      l({ trabalho: 'pintura_final', precoUnitario: preco, demaos: 2, produto: 'CIN Vinylmatt' }),
      l({ trabalho: 'impermeabilizacao', unidade: 'ml', quantidade: 3200, precoUnitario: 3400, demaos: 2, produto: 'Sika' }),
    ],
    extra,
  );

/** Um conjunto com todos os estados que o produto conhece, para nenhum escapar à verificação. */
const CASO = [
  completa('Pintor A', 3600),
  completa('Pintor B', 4200, { garantiaAnos: null }),
  // Cala-se sobre dois trabalhos.
  monta('Pintor C', [
    l({ trabalho: 'lavagem', precoUnitario: 120, produto: 'Alta pressão' }),
    l({ trabalho: 'primario', precoUnitario: 180, demaos: 1, produto: 'CIN Primário' }),
    l({ trabalho: 'pintura_final', precoUnitario: 1400, demaos: 1, quantidade: 31000 }),
  ]),
  // Prevê tudo, mas um trabalho só fecha o preço depois de observar.
  monta('Pintor D', [
    l({ trabalho: 'lavagem', precoUnitario: 120, produto: 'Alta pressão' }),
    l({ trabalho: 'fissuras', unidade: 'ml', quantidade: 4200, precoUnitario: 1800, produto: 'Mastique', inclusao: 'condicionado' }),
    l({ trabalho: 'primario', precoUnitario: 180, demaos: 1, produto: 'CIN Primário' }),
    l({ trabalho: 'pintura_final', precoUnitario: 3400, demaos: 2, produto: 'CIN Vinylmatt' }),
    l({ trabalho: 'impermeabilizacao', unidade: 'ml', quantidade: 3200, precoUnitario: 3400, demaos: 2, produto: 'Sika' }),
  ], { avaliacao: { media: 5, n: 1 } }),
];

const ctx: ContextoDaSintese = {
  pedidos: PEDIDOS,
  areaPedidoCm2: 24000,
  formataEuros: formatEuros,
  formataArea: formatArea,
  formataData: (d) => d,
};

const ind = indicacoes(
  CASO.map((p) => ({
    id: p.id,
    alias: p.alias,
    totalComIva: p.totalComIva,
    precoFirme: p.classificacao.cobertura.semPrecoFirme === 0 && p.classificacao.definicao.definido,
    naoIndicados: p.naoIndicados,
    excluidos: p.excluidos,
  })),
  formatEuros,
);
const linhasMatriz = matrizDasPropostas(
  CASO.map((p) => ({
    id: p.id,
    alias: p.alias,
    totalComIva: p.totalComIva,
    naoIndicados: p.naoIndicados,
    excluidos: p.excluidos,
    trabalhosPedidos: PEDIDOS.length,
    semPrecoFirme: p.classificacao.cobertura.semPrecoFirme,
    zonasSemPreco: 0,
    avaliacao: p.avaliacao,
  })),
  ind,
  formatEuros,
);
const linhasSintese = sinteseDasPropostas(
  CASO.map((p) => ({
    id: p.id,
    alias: p.alias,
    totalComIva: p.totalComIva,
    classificacao: p.classificacao,
    trabalhos: p.trabalhos,
    garantiaAnos: p.garantiaAnos,
    duracaoDias: 20,
    inicioPossivel: '2026-11-15',
    adiantamentoBps: 2000,
  })),
  ctx,
);
const aliases = CASO.map((p) => p.alias);
const linhaDe = (id: string) => linhasSintese.find((x) => x.id === id)!;
const matrizDe = (alias: string) => linhasMatriz.find((x) => x.alias === alias)!;
const col = (alias: string) => aliases.indexOf(alias);

describe('as quatro vistas dizem o mesmo', () => {
  it('o total é o mesmo na matriz e na síntese', () => {
    for (const p of CASO) {
      expect(matrizDe(p.alias).total).toBe(formatEuros(p.totalComIva));
      expect(linhaDe('total').celulas[col(p.alias)]!.texto).toBe(formatEuros(p.totalComIva));
    }
  });

  it('a cobertura do pedido diz o mesmo nas duas, incluindo a distinção entre calar e excluir', () => {
    for (const p of CASO) {
      const naMatriz = matrizDe(p.alias).pedido;
      const naSintese = linhaDe('trabalhos').celulas[col(p.alias)]!;
      // Ou as duas dizem que está completo, ou as duas assinalam — nunca uma de cada.
      expect(naMatriz.atencao).toBe(naSintese.tom === 'atencao');
      if (p.naoIndicados > 0) {
        expect(naMatriz.texto).toContain('por esclarecer');
        expect(naSintese.texto).toContain('por esclarecer');
      }
      if (p.naoIndicados === 0 && p.excluidos === 0) {
        expect(naMatriz.texto).toBe('Completo');
        expect(naSintese.texto).toBe('Todos incluídos');
      }
    }
  });

  it('os custos por fechar contam o mesmo nas duas', () => {
    for (const p of CASO) {
      const n = p.classificacao.cobertura.semPrecoFirme;
      const naMatriz = matrizDe(p.alias).custosPorFechar;
      const naSintese = linhaDe('custos_por_fechar').celulas[col(p.alias)]!;
      expect(naMatriz.atencao).toBe(naSintese.tom === 'atencao');
      if (n === 0) {
        expect(naMatriz.texto).toBe('Nenhum declarado');
        expect(naSintese.texto).toBe('Nenhum declarado');
      } else {
        expect(naMatriz.texto).toContain('após observação');
        expect(naSintese.texto).toContain('após observação');
      }
    }
  });

  it('um trabalho condicionado cobre o pedido e conta no preço, nas duas vistas', () => {
    const d = matrizDe('Pintor D');
    expect(d.pedido.texto).toBe('Completo');
    expect(d.custosPorFechar.texto).toContain('após observação');
    expect(linhaDe('trabalhos').celulas[col('Pintor D')]!.texto).toBe('Todos incluídos');
    expect(linhaDe('custos_por_fechar').celulas[col('Pintor D')]!.tom).toBe('atencao');
  });

  it('a indicação atribuída aparece na linha certa da matriz, e em mais nenhuma', () => {
    for (const a of ind.atribuidas) {
      const nome = METODOLOGIA.indicacoes.find((r) => r.id === a.indicacao)!.nome;
      expect(matrizDe(a.alias).indicacoes).toContain(nome);
      for (const outra of CASO.filter((p) => p.alias !== a.alias)) {
        expect(matrizDe(outra.alias).indicacoes).not.toContain(nome);
      }
    }
  });

  it('quem leva «melhor preço para o pedido completo» está completo e sem custos por fechar nas duas vistas', () => {
    const a = ind.atribuidas.find((x) => x.indicacao === 'menor_preco_completo');
    expect(a).toBeDefined();
    expect(matrizDe(a!.alias).pedido.texto).toBe('Completo');
    expect(matrizDe(a!.alias).custosPorFechar.texto).toBe('Nenhum declarado');
    expect(linhaDe('essencial').celulas[col(a!.alias)]!.tom).toBe('neutro');
  });

  it('a referência da ordenação por omissão é a mais barata entre as completas e firmes', () => {
    const grupos = ordenar(
      CASO.map((p) => ({
        id: p.id,
        totalComIva: p.totalComIva,
        completa: p.classificacao.cobertura.completa,
        definido: p.classificacao.definicao.definido,
        porEsclarecer: p.classificacao.cobertura.porEsclarecer,
        trabalhosIncluidos: p.trabalhos.filter((t) => t.estado === 'incluido').length,
        duracaoDias: 20,
        inicioPossivel: '2026-11-15',
      })),
      'padrao',
    );
    const primeira = grupos.flatMap((g) => g.propostas)[0]!;
    const alias = CASO.find((p) => p.id === primeira.id)!.alias;
    // É contra esta que o relatório mede as outras — e é a que leva a indicação do pedido completo.
    expect(alias).toBe(ind.atribuidas.find((x) => x.indicacao === 'menor_preco_completo')!.alias);
  });

  it('toda a indicação que o motor atribui está publicada na metodologia, com o mesmo identificador', () => {
    const publicadas = new Set(METODOLOGIA.indicacoes.map((r) => r.id));
    for (const a of ind.atribuidas) expect(publicadas.has(a.indicacao)).toBe(true);
    for (const n of ind.naoAtribuidas) expect(publicadas.has(n.indicacao)).toBe(true);
  });

  it('nenhuma vista inventa uma proposta que a outra não tenha', () => {
    expect(linhasMatriz.map((x) => x.alias)).toEqual(aliases);
    for (const linha of linhasSintese) expect(linha.celulas).toHaveLength(aliases.length);
  });
});
