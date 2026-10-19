import { describe, expect, it } from 'vitest';
import { summarize } from './worksite';

describe('ferramentas de obra', () => {
  it('resume recebimentos, custos, mão de obra e margem', () => {
    const s = summarize({
      contrato: 1_000_000,
      tranches: [
        { valor: 300_000, prevista: '2026-10-01', recebidaEm: '2026-10-02' },
        { valor: 300_000, prevista: '2026-10-10', recebidaEm: null },
        { valor: 300_000, prevista: '2026-11-30', recebidaEm: null },
      ],
      costs: [
        { categoria: 'material', valor: 150_000 },
        { categoria: 'andaime', valor: 80_000 },
        { categoria: 'material', valor: 20_000 },
      ],
      hours: [
        { horas: 4000, custoHora: 1200 }, // 40 h a 12 €
        { horas: 750, custoHora: null },
      ],
      today: '2026-10-19',
    });
    expect(s.recebido).toBe(300_000);
    expect(s.porReceber).toBe(700_000);
    expect(s.emAtraso).toBe(300_000);
    expect(s.porCategoria).toEqual({ material: 170_000, andaime: 80_000 });
    expect(s.maoDeObra).toBe(48_000);
    expect(s.horas).toBe(4750);
    expect(s.custos).toBe(298_000);
    expect(s.margem).toBe(702_000);
    expect(s.margemBps).toBe(7020);
    expect(s.semPlano).toBe(100_000);
  });
});
