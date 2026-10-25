import { describe, expect, it } from 'vitest';
import { contarPorGrupo, grupoDe, orcamentosPorEnviar, podeApagar, type OrcamentoDoPainel } from './quoteBoard';

const o = (over: Partial<OrcamentoDoPainel>): OrcamentoDoPainel => ({
  id: 'x',
  estado: 'rascunho',
  criadoEm: '2026-10-20',
  totalCents: 120_000,
  linhas: 10,
  ...over,
});

describe('os três grupos', () => {
  it('ganho e perdido são arquivo: o orçamento já cumpriu o que tinha a cumprir', () => {
    expect(grupoDe('rascunho')).toBe('preenchimento');
    expect(grupoDe('enviado')).toBe('enviados');
    expect(grupoDe('ganho')).toBe('arquivo');
    expect(grupoDe('perdido')).toBe('arquivo');
  });

  it('conta cada grupo para o separador mostrar o número', () => {
    const r = contarPorGrupo([o({}), o({ estado: 'enviado' }), o({ estado: 'ganho' }), o({ estado: 'perdido' })]);
    expect(r).toEqual({ preenchimento: 1, enviados: 1, arquivo: 2 });
  });
});

describe('aviso dos que ficaram por enviar', () => {
  it('avisa um orçamento feito e parado há três dias', () => {
    expect(orcamentosPorEnviar([o({ id: 'a', criadoEm: '2026-10-20' })], '2026-10-23')).toEqual([{ id: 'a', dias: 3 }]);
  });

  it('não avisa no próprio dia nem no dia seguinte', () => {
    expect(orcamentosPorEnviar([o({ criadoEm: '2026-10-22' })], '2026-10-23')).toEqual([]);
  });

  it('não avisa um rascunho vazio: isso é uma desistência, não um esquecimento', () => {
    expect(orcamentosPorEnviar([o({ linhas: 0, totalCents: 0 })], '2026-10-30')).toEqual([]);
    expect(orcamentosPorEnviar([o({ linhas: 10, totalCents: 0 })], '2026-10-30')).toEqual([]);
  });

  it('não avisa o que já foi enviado', () => {
    expect(orcamentosPorEnviar([o({ estado: 'enviado', criadoEm: '2026-01-01' })], '2026-10-30')).toEqual([]);
  });

  it('põe o mais antigo à frente, que é o mais esquecido', () => {
    const r = orcamentosPorEnviar(
      [o({ id: 'novo', criadoEm: '2026-10-20' }), o({ id: 'velho', criadoEm: '2026-09-01' })],
      '2026-10-25',
    );
    expect(r.map((x) => x.id)).toEqual(['velho', 'novo']);
  });
});

describe('o que se pode apagar', () => {
  it('um rascunho e um não ganho, sim', () => {
    expect(podeApagar('rascunho')).toBe(true);
    expect(podeApagar('perdido')).toBe(true);
  });

  it('um enviado não: é a prova do que foi proposto ao cliente', () => {
    expect(podeApagar('enviado')).toBe(false);
  });

  it('um ganho não: deu origem a uma obra, e apagá-lo deixava-a sem princípio', () => {
    expect(podeApagar('ganho')).toBe(false);
  });
});
