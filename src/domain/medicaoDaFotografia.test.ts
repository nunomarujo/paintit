import { describe, expect, it } from 'vitest';
import { margemEmTexto, zonaDaMedicao, type MedicaoDaFotografia } from './medicaoDaFotografia';

const boa: MedicaoDaFotografia = { temContorno: true, pintavelM2: 133.18, porMedir: [], margemRelativa: 0.017 };

describe('zonaDaMedicao: a medição pela fotografia como zona do pedido (06/11/2026)', () => {
  it('área em centésimos de m² e margem em pontos-base (regra 1)', () => {
    expect(zonaDaMedicao(boa)).toEqual({ ok: true, areaDiretaCm2: 13318, margemBps: 170 });
  });

  it('a margem arredonda para cima, nunca para baixo', () => {
    expect(zonaDaMedicao({ ...boa, margemRelativa: 0.01701 })).toMatchObject({ margemBps: 171 });
    expect(zonaDaMedicao({ ...boa, margemRelativa: 0.0000001 })).toMatchObject({ margemBps: 1 });
    // Uma margem de zero não existe numa fotografia: fica 1 ponto-base.
    expect(zonaDaMedicao({ ...boa, margemRelativa: 0 })).toMatchObject({ margemBps: 1 });
  });

  it('não grava uma área incompleta, sem contorno, nula ou absurda', () => {
    expect(zonaDaMedicao({ ...boa, porMedir: ['saliência das marquises'] })).toEqual({
      ok: false,
      motivo: 'Falta medir: saliência das marquises.',
    });
    expect(zonaDaMedicao({ ...boa, temContorno: false }).ok).toBe(false);
    for (const a of [0, -3, Number.NaN, Number.POSITIVE_INFINITY, 0.004, 2_000_000])
      expect(zonaDaMedicao({ ...boa, pintavelM2: a }).ok).toBe(false);
  });

  it('sem margem conhecida não grava — a medição do cliente vai sempre com a sua margem', () => {
    for (const r of [null, Number.NaN, Number.POSITIVE_INFINITY, -0.01, 1.0001])
      expect(zonaDaMedicao({ ...boa, margemRelativa: r }).ok).toBe(false);
    expect(zonaDaMedicao({ ...boa, margemRelativa: 1 })).toMatchObject({ ok: true, margemBps: 10_000 });
  });
});

describe('margemEmTexto', () => {
  it('lê-se como na ferramenta, e também para cima', () => {
    expect(margemEmTexto(170)).toBe('± 1,7 %');
    expect(margemEmTexto(171)).toBe('± 1,8 %');
    expect(margemEmTexto(600)).toBe('± 6 %');
    expect(margemEmTexto(1250)).toBe('± 13 %');
    expect(margemEmTexto(1)).toBe('± 0,1 %');
  });
});
