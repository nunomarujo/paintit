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
      // Cada linha é um dia de uma pessoa, nunca um acumulado: é o que permite distinguir as horas
      // normais das suplementares (src/domain/overtime.ts).
      hours: [
        { horas: 800, custoHora: 1200, memberId: 'a', data: '2026-10-13' },
        { horas: 800, custoHora: 1200, memberId: 'a', data: '2026-10-14' },
        { horas: 800, custoHora: 1200, memberId: 'a', data: '2026-10-15' },
        { horas: 800, custoHora: 1200, memberId: 'a', data: '2026-10-16' },
        { horas: 800, custoHora: 1200, memberId: 'a', data: '2026-10-17' },
        { horas: 750, custoHora: null, memberId: 'b', data: '2026-10-17' },
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

describe('trabalho suplementar na margem', () => {
  const base = { contrato: 1_000_000, tranches: [], costs: [], today: '2026-10-25' };

  it('um dia de dez horas custa mais do que dez horas normais', () => {
    const normal = summarize({ ...base, hours: [{ horas: 800, custoHora: 1000, memberId: 'a', data: '2026-10-20' }] });
    const esticado = summarize({ ...base, hours: [{ horas: 1000, custoHora: 1000, memberId: 'a', data: '2026-10-20' }] });
    // 8 h = 80 €. 10 h = 100 € + 2,50 (1.ª a 25%) + 3,75 (2.ª a 37,5%) = 106,25 €.
    expect(normal.maoDeObra).toBe(8_000);
    expect(esticado.maoDeObra).toBe(10_625);
    expect(esticado.suplementares).toBe(200);
  });

  it('o limiar anual é por pessoa, não por obra', () => {
    // Duas pessoas, cada uma com duas horas a mais: nenhuma chega perto das 100 anuais.
    const s = summarize({
      ...base,
      hours: [
        { horas: 1000, custoHora: 1000, memberId: 'a', data: '2026-10-20' },
        { horas: 1000, custoHora: 1000, memberId: 'b', data: '2026-10-20' },
      ],
    });
    expect(s.maoDeObra).toBe(10_625 * 2);
  });

  it('um dia de descanso não tem horas normais nenhumas', () => {
    const s = summarize({ ...base, hours: [{ horas: 800, custoHora: 1000, memberId: 'a', data: '2026-10-25', tipoDia: 'descanso' }] });
    expect(s.maoDeObra).toBe(12_000);
    expect(s.suplementares).toBe(800);
  });
});
