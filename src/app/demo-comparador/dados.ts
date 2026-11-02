// Junta os dados fictícios de fixtures.ts e chama as funções reais de src/domain/ para produzir
// exactamente o que o comparador real produziria para estes dados. Nenhum valor de resultado é
// escrito aqui à mão. Ver nota em fixtures.ts sobre o propósito desta rota.
import { compareProposals, type ComparableProposal } from '@/domain/proposal';
import { formatEuros } from '@/domain/money';
import { formatArea } from '@/domain/request';
import { classificar, resumoDosTrabalhosAMais, trabalhosAMais, trabalhosDaProposta } from '@/domain/comparador';
import { indicacoes as calcularIndicacoes } from '@/domain/indicacoes';
import { sinteseDasPropostas, leituraImediata } from '@/domain/sintese';
import { matrizDasPropostas } from '@/domain/matriz';
import { quadroEconomico, type LadoDaReconciliacao } from '@/domain/reconciliacao';
import type { PropostaEmBloco } from '@/components/ComparacaoEmBlocos';
import { AREA_TOTAL_CM2, PEDIDO, PROPOSTAS, ZONAS } from './fixtures';

const pt = (d: string | null) => (d ? d.split('-').reverse().join('/') : 'Não indicado');

export function construirComparacao() {
  const comparaveis: ComparableProposal[] = PROPOSTAS.map((p) => ({
    id: p.id,
    lines: p.lines,
    ivaBps: p.terms.ivaBps,
    duracaoDias: p.terms.duracaoDias,
    inicioPossivel: p.terms.inicioPossivel,
    adiantamentoBps: p.terms.adiantamentoBps,
  }));

  const rows = compareProposals(comparaveis, {
    areaTotal: AREA_TOTAL_CM2,
    superficies: ['fachada'],
    zonas: ZONAS.map((z) => ({ id: z.id, kind: z.kind })),
  });

  const byId = new Map(PROPOSTAS.map((p) => [p.id, p]));
  const rowById = new Map(rows.map((r) => [r.id, r]));

  const trabalhosPorProposta = new Map(rows.map((r) => [r.id, trabalhosDaProposta(PEDIDO, byId.get(r.id)!.lines)]));

  const classificacaoDe = new Map(
    rows.map((r) => [
      r.id,
      classificar({
        trabalhos: trabalhosPorProposta.get(r.id)!,
        temCondicionados: r.temCondicionados,
        zonasSemPreco: r.zonasEmFalta.length,
        precoGlobal: byId.get(r.id)!.terms.modoPreco === 'global',
      }),
    ]),
  );

  const sorted = rows; // ordem de chegada A, B, C.

  const propostasDaSintese = sorted.map((r) => {
    const p = byId.get(r.id)!;
    return {
      id: r.id,
      alias: r.alias,
      totalComIva: r.totals.totalComIva,
      classificacao: classificacaoDe.get(r.id)!,
      trabalhos: trabalhosPorProposta.get(r.id)!,
      garantiaAnos: p.terms.garantiaAnos,
      duracaoDias: p.terms.duracaoDias,
      inicioPossivel: p.terms.inicioPossivel,
      adiantamentoBps: p.terms.adiantamentoBps,
    };
  });

  const linhasDaSintese = sinteseDasPropostas(propostasDaSintese, {
    pedidos: PEDIDO,
    areaPedidoCm2: AREA_TOTAL_CM2,
    formataEuros: formatEuros,
    formataArea: formatArea,
    formataData: pt,
  });
  const leituraDaSintese = leituraImediata(propostasDaSintese, formatEuros);

  // As três indicações (a mais barata, a mais completa, a Escolha Quem Pinta), pelas mesmas regras
  // do ecrã real e do relatório (src/domain/indicacoes.ts).
  const indicacoes = calcularIndicacoes(
    sorted.map((r) => {
      const c = classificacaoDe.get(r.id)!;
      const ts = trabalhosPorProposta.get(r.id)!;
      return {
        id: r.id,
        alias: r.alias,
        totalComIva: r.totals.totalComIva,
        precoFirme: c.cobertura.semPrecoFirme === 0 && c.definicao.definido,
        naoIndicados: ts.filter((t) => t.estado === 'nao_indicado').length,
        excluidos: ts.filter((t) => t.estado === 'excluido').length,
        aMais: resumoDosTrabalhosAMais(trabalhosAMais(PEDIDO, byId.get(r.id)!.lines)),
      };
    }),
    formatEuros,
    PEDIDO.length,
  );

  const emBloco = (id: string): PropostaEmBloco => {
    const p = byId.get(id)!;
    const r = rowById.get(id)!;
    return {
      id,
      alias: r.alias,
      totalComIva: r.totals.totalComIva,
      base: r.totals.base,
      opcionais: r.totals.opcionais,
      condicionados: r.totals.condicionados,
      trabalhos: trabalhosPorProposta.get(id)!,
      classificacao: classificacaoDe.get(id)!,
      inicioPossivel: p.terms.inicioPossivel,
      duracaoDias: p.terms.duracaoDias,
      adiantamentoBps: p.terms.adiantamentoBps,
      garantiaAnos: p.terms.garantiaAnos,
      seguroRc: p.seguroRc,
      seguroAt: p.seguroAt,
      verificado: p.verificado,
    };
  };

  const emLado = (id: string): LadoDaReconciliacao => {
    const p = byId.get(id)!;
    const r = rowById.get(id)!;
    return {
      id,
      alias: r.alias,
      base: r.totals.base,
      trabalhos: trabalhosPorProposta.get(id)!,
      categorias: r.categorias,
      precoGlobal: p.terms.modoPreco === 'global',
      aMais: trabalhosAMais(PEDIDO, p.lines),
    };
  };

  const linhasDaMatriz = matrizDasPropostas(
    sorted.map((r) => {
      const c = classificacaoDe.get(r.id)!;
      const p = byId.get(r.id)!;
      return {
        id: r.id,
        alias: r.alias,
        totalComIva: r.totals.totalComIva,
        naoIndicados: trabalhosPorProposta.get(r.id)!.filter((t) => t.estado === 'nao_indicado').length,
        excluidos: trabalhosPorProposta.get(r.id)!.filter((t) => t.estado === 'excluido').length,
        trabalhosPedidos: PEDIDO.length,
        semPrecoFirme: c.cobertura.semPrecoFirme,
        zonasSemPreco: c.definicao.reparos.includes('há zonas do pedido sem preço') ? 1 : 0,
        avaliacao: p.avaliacao,
      };
    }),
    formatEuros,
  );

  const referencia = sorted[0]!;
  const economico = quadroEconomico(emLado(referencia.id), sorted.slice(1).map((r) => emLado(r.id)), formatEuros);

  return {
    rows: sorted,
    byId,
    rowById,
    trabalhosPorProposta,
    classificacaoDe,
    linhasDaSintese,
    leituraDaSintese,
    indicacoes,
    linhasDaMatriz,
    economico,
    referencia,
    emBloco,
    emLado,
    pt,
  };
}
