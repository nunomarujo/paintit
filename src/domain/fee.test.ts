import { describe, expect, it } from 'vitest';
import { euros } from './money';
import {
  adequacaoIndividualBp,
  baseFactors,
  calcularFee,
  fidelizacaoBp,
  obraBaseBp,
  respostaInicialBp,
  taxaFinal,
  valorParaLiquido,
  type AdequacaoInput,
  type BaseFactorsInput,
  type FidelizacaoInput,
} from './fee';

const neutralBase: BaseFactorsInput = {
  c1DecisaoContratar: 'neutro',
  c2InformacaoTecnica: 'neutro',
  c3DecisaoOrcamento: 'neutro',
  e1JanelaInicio: 'neutro',
  e2RitmoExecucao: 'neutro',
  e3RepeticaoLogistica: 'neutro',
  e4CustosTerceiros: 'neutro',
  f1FluxoPagamentos: 'neutro',
  f2DisponibilidadeFundos: 'neutro',
  f3RetencoesAdicionais: 'neutro',
  m1OfertaLocal: 'neutro',
};

const neutralAdequacao: AdequacaoInput = {
  j1EncaixeAgenda: 'neutro',
  j2MobilizacaoProximidade: 'neutro',
  j3MeiosDisponiveis: 'neutro',
};

const semFidelizacao: FidelizacaoInput = {
  propostasElegiveis180d: 0,
  qualidadeS: null,
  fiabilidade: 'sem_dados',
  assiduidadeCumprida: false,
};

describe('fatores da base da obra (secção 4)', () => {
  it('cada bloco soma os sub-fatores e para no seu próprio limite', () => {
    expect(baseFactors(neutralBase)).toEqual({ c: 0, e: 0, f: 0, m: 0 });
    expect(
      baseFactors({ ...neutralBase, c1DecisaoContratar: 'favoravel', c2InformacaoTecnica: 'favoravel', c3DecisaoOrcamento: 'favoravel' }).c,
    ).toBe(100); // 50+50+25=125, limitado a 100
    expect(baseFactors({ ...neutralBase, e1JanelaInicio: 'desfavoravel', e3RepeticaoLogistica: 'desfavoravel' }).e).toBe(-100);
    expect(baseFactors({ ...neutralBase, e4CustosTerceiros: 'desfavoravel' }).e).toBe(-50);
    expect(baseFactors({ ...neutralBase, f2DisponibilidadeFundos: 'desfavoravel' }).f).toBe(-25);
    expect(baseFactors({ ...neutralBase, m1OfertaLocal: 'favoravel' }).m).toBe(100);
  });

  it('"desconhecido" vale zero, como "neutro"', () => {
    expect(baseFactors({ ...neutralBase, c1DecisaoContratar: 'desconhecido' }).c).toBe(0);
  });

  it('B parte da taxa de referência e fica sempre entre 18% e 23%', () => {
    expect(obraBaseBp(neutralBase)).toBe(2100);
    expect(
      obraBaseBp({
        ...neutralBase,
        c1DecisaoContratar: 'favoravel',
        c2InformacaoTecnica: 'favoravel',
        e1JanelaInicio: 'favoravel',
        e3RepeticaoLogistica: 'favoravel',
        e2RitmoExecucao: 'favoravel',
        f1FluxoPagamentos: 'favoravel',
        f2DisponibilidadeFundos: 'favoravel',
        m1OfertaLocal: 'favoravel',
      }),
    ).toBe(2300);
    expect(
      obraBaseBp({
        ...neutralBase,
        c1DecisaoContratar: 'desfavoravel',
        c2InformacaoTecnica: 'desfavoravel',
        e1JanelaInicio: 'desfavoravel',
        e3RepeticaoLogistica: 'desfavoravel',
        e2RitmoExecucao: 'desfavoravel',
        f1FluxoPagamentos: 'desfavoravel',
        f2DisponibilidadeFundos: 'desfavoravel',
        m1OfertaLocal: 'desfavoravel',
      }),
    ).toBe(1800);
  });
});

describe('adequação individual (secção 5, "J")', () => {
  it('J soma os três sub-fatores, limitada a ±1 p.p. no total', () => {
    expect(adequacaoIndividualBp(2100, neutralAdequacao)).toBe(2100);
    expect(
      adequacaoIndividualBp(2100, { j1EncaixeAgenda: 'favoravel', j2MobilizacaoProximidade: 'favoravel', j3MeiosDisponiveis: 'favoravel' }),
    ).toBe(2200); // 50+50+25=125, limitado a 100
    expect(adequacaoIndividualBp(2300, { ...neutralAdequacao, j1EncaixeAgenda: 'favoravel' })).toBe(2300); // já no limite de B
  });
});

describe('R — incentivo inicial por oportunidade (secção 6)', () => {
  it.each([
    [0, 300],
    [1, 200],
    [2, 200],
    [3, 100],
    [4, 100],
    [5, 0],
    [8, 0],
  ])('%i propostas elegíveis anteriores → %i p.b.', (n, bp) => expect(respostaInicialBp(n)).toBe(bp));
});

describe('L — fidelização com janela de 180 dias (secção 6)', () => {
  it('soma as quatro parcelas, limitada a 2 p.p.', () => {
    expect(fidelizacaoBp(semFidelizacao)).toBe(0);
    expect(fidelizacaoBp({ ...semFidelizacao, propostasElegiveis180d: 2 })).toBe(25);
    expect(fidelizacaoBp({ ...semFidelizacao, propostasElegiveis180d: 5 })).toBe(50);
    expect(fidelizacaoBp({ ...semFidelizacao, qualidadeS: 60 })).toBe(50);
    expect(fidelizacaoBp({ ...semFidelizacao, qualidadeS: 80 })).toBe(100);
    expect(fidelizacaoBp({ ...semFidelizacao, qualidadeS: 40 })).toBe(0);
    expect(fidelizacaoBp({ ...semFidelizacao, fiabilidade: true })).toBe(25);
    expect(fidelizacaoBp({ ...semFidelizacao, assiduidadeCumprida: true })).toBe(25);
    expect(
      fidelizacaoBp({ propostasElegiveis180d: 5, qualidadeS: 80, fiabilidade: true, assiduidadeCumprida: true }),
    ).toBe(200); // 50+100+25+25=200, no limite exato
  });

  it('sem 3 oportunidades encerradas elegíveis, a qualidade não entra (nem a favor nem contra)', () => {
    expect(fidelizacaoBp({ ...semFidelizacao, qualidadeS: null })).toBe(0);
  });
});

describe('cenários de teste do próprio documento (secção 9)', () => {
  it('cenário 1: B=19%, R=3pp, Q=2,25pp (3 fornecedores) → T=13,75%, 5.500€ em 40.000€', () => {
    const r = taxaFinal({
      base: { ...neutralBase, c1DecisaoContratar: 'desfavoravel', c2InformacaoTecnica: 'desfavoravel', e1JanelaInicio: 'desfavoravel', e3RepeticaoLogistica: 'desfavoravel' },
      adequacao: neutralAdequacao,
      propostasElegiveisAnteriores: 0,
      fidelizacao: semFidelizacao,
      referenciasBp: 225,
    });
    expect(r.obraBaseBp).toBe(1900);
    expect(r.taxaFinalBp).toBe(1375);
    const fee = calcularFee(
      euros(40_000),
      {
        base: { ...neutralBase, c1DecisaoContratar: 'desfavoravel', c2InformacaoTecnica: 'desfavoravel', e1JanelaInicio: 'desfavoravel', e3RepeticaoLogistica: 'desfavoravel' },
        adequacao: neutralAdequacao,
        propostasElegiveisAnteriores: 0,
        fidelizacao: semFidelizacao,
        referenciasBp: 225,
      },
      15_000,
    );
    expect(fee.comissaoCents).toBe(euros(5_500));
  });

  it('cenário "oportunidade muito atrativa": B limitado a 23%, L=1pp, Q=1pp → T=18%, 7.200€ em 40.000€', () => {
    const base: BaseFactorsInput = {
      ...neutralBase,
      c1DecisaoContratar: 'favoravel',
      c2InformacaoTecnica: 'favoravel',
      e1JanelaInicio: 'favoravel',
      e2RitmoExecucao: 'favoravel',
      e3RepeticaoLogistica: 'favoravel',
      f1FluxoPagamentos: 'favoravel',
      f2DisponibilidadeFundos: 'favoravel',
      m1OfertaLocal: 'favoravel',
    };
    const r = taxaFinal({
      base,
      adequacao: neutralAdequacao,
      propostasElegiveisAnteriores: 0,
      fidelizacao: { ...semFidelizacao, qualidadeS: 80 },
      referenciasBp: 100,
    });
    expect(r.obraBaseBp).toBe(2300);
    expect(r.taxaFinalBp).toBe(1800);
    expect(
      calcularFee(euros(40_000), { base, adequacao: neutralAdequacao, propostasElegiveisAnteriores: 0, fidelizacao: { ...semFidelizacao, qualidadeS: 80 }, referenciasBp: 100 }, 15_000)
        .comissaoCents,
    ).toBe(euros(7_200));
  });

  it('cenário "menor atratividade": B limitado a 18%, L=2pp (teto), Q=4pp (teto) → T=9%, 3.600€ em 40.000€ — o piso do documento', () => {
    const base: BaseFactorsInput = {
      c1DecisaoContratar: 'desfavoravel',
      c2InformacaoTecnica: 'desfavoravel',
      c3DecisaoOrcamento: 'desfavoravel',
      e1JanelaInicio: 'desfavoravel',
      e2RitmoExecucao: 'desfavoravel',
      e3RepeticaoLogistica: 'desfavoravel',
      e4CustosTerceiros: 'desfavoravel',
      f1FluxoPagamentos: 'desfavoravel',
      f2DisponibilidadeFundos: 'desfavoravel',
      f3RetencoesAdicionais: 'desfavoravel',
      m1OfertaLocal: 'desfavoravel',
    };
    const fidelizacao: FidelizacaoInput = { propostasElegiveis180d: 5, qualidadeS: 80, fiabilidade: true, assiduidadeCumprida: true };
    const r = taxaFinal({ base, adequacao: neutralAdequacao, propostasElegiveisAnteriores: 0, fidelizacao, referenciasBp: 400 });
    expect(r.obraBaseBp).toBe(1800);
    expect(r.fidelizacaoBp).toBe(200);
    expect(r.referenciasBp).toBe(400);
    expect(r.taxaFinalBp).toBe(900);
    expect(calcularFee(euros(40_000), { base, adequacao: neutralAdequacao, propostasElegiveisAnteriores: 0, fidelizacao, referenciasBp: 400 }, 15_000).comissaoCents).toBe(euros(3_600));
  });

  it('cenário "mesma obra, pintores diferentes": B=21% para os dois, J e descontos diferentes', () => {
    const inputA = {
      base: neutralBase,
      adequacao: { ...neutralAdequacao, j1EncaixeAgenda: 'favoravel' as const },
      propostasElegiveisAnteriores: 0,
      fidelizacao: { ...semFidelizacao, qualidadeS: 80 },
      referenciasBp: 100,
    };
    const inputB = { base: neutralBase, adequacao: neutralAdequacao, propostasElegiveisAnteriores: 3, fidelizacao: semFidelizacao, referenciasBp: 0 };
    expect(taxaFinal(inputA).taxaFinalBp).toBe(1650);
    expect(taxaFinal(inputB).taxaFinalBp).toBe(2000);
  });

  it('mínimo monetário (exemplo da secção 10, "apresentação numérica no ecrã"): B=19%, R=3pp, L=0,25pp (2 propostas), Q=1,75pp (2 fornecedores) → T=14% sobre 1.000€ dava 140€, mas o mínimo de 150€ prevalece (taxa efetiva 15%)', () => {
    const input = {
      base: { ...neutralBase, c1DecisaoContratar: 'desfavoravel' as const, c2InformacaoTecnica: 'desfavoravel' as const, e1JanelaInicio: 'desfavoravel' as const, e3RepeticaoLogistica: 'desfavoravel' as const },
      adequacao: neutralAdequacao,
      propostasElegiveisAnteriores: 0,
      fidelizacao: { ...semFidelizacao, propostasElegiveis180d: 2 },
      referenciasBp: 175,
    };
    const r = calcularFee(euros(1_000), input, 15_000);
    expect(r.taxaFinalBp).toBe(1400);
    expect(r.comissaoCents).toBe(euros(150));
    expect(r.taxaEfetivaBp).toBe(1500);
  });
});

describe('o piso nunca desce de 9% dentro dos limites documentados', () => {
  it('mesmo no pior caso de B, J, R, L e Q em simultâneo', () => {
    const piorBase: BaseFactorsInput = {
      c1DecisaoContratar: 'desfavoravel',
      c2InformacaoTecnica: 'desfavoravel',
      c3DecisaoOrcamento: 'desfavoravel',
      e1JanelaInicio: 'desfavoravel',
      e2RitmoExecucao: 'desfavoravel',
      e3RepeticaoLogistica: 'desfavoravel',
      e4CustosTerceiros: 'desfavoravel',
      f1FluxoPagamentos: 'desfavoravel',
      f2DisponibilidadeFundos: 'desfavoravel',
      f3RetencoesAdicionais: 'desfavoravel',
      m1OfertaLocal: 'desfavoravel',
    };
    const piorAdequacao: AdequacaoInput = { j1EncaixeAgenda: 'desfavoravel', j2MobilizacaoProximidade: 'desfavoravel', j3MeiosDisponiveis: 'desfavoravel' };
    const r = taxaFinal({
      base: piorBase,
      adequacao: piorAdequacao,
      propostasElegiveisAnteriores: 0,
      fidelizacao: { propostasElegiveis180d: 99, qualidadeS: 100, fiabilidade: true, assiduidadeCumprida: true },
      referenciasBp: 999,
    });
    expect(r.taxaFinalBp).toBe(900);
  });
});

describe('valor a cobrar para um líquido pretendido (secção 8)', () => {
  it('40.000€ líquidos a 3% dão ≈41.237,11€, com 1.237,11€ de comissão (exemplo FIN-07)', () => {
    const v = valorParaLiquido(euros(40_000), 300, 15_000);
    expect(v).toBe(4_123_711);
    expect(v - euros(40_000)).toBe(123_711);
  });

  it('quando o mínimo monetário domina, soma-se em vez de dividir', () => {
    expect(valorParaLiquido(euros(500), 300, 15_000)).toBe(euros(500) + 15_000);
  });
});
