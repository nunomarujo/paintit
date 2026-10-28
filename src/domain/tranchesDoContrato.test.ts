import { describe, expect, it } from 'vitest';
import { tranchesDoContrato } from './tranchesDoContrato';

const fases = [
  { nome: 'A meio da obra', bps: 4000 },
  { nome: 'À conclusão', bps: 3000 },
];

describe('as tranches saem do contrato', () => {
  it('o adiantamento vem à frente, e cada fase pela ordem escrita na proposta', () => {
    const t = tranchesDoContrato({ totalCents: 1_000_000, adiantamentoBps: 3000, fases });
    expect(t.map((x) => x.descricao)).toEqual(['Adiantamento', 'A meio da obra', 'À conclusão']);
    expect(t.map((x) => x.valorCents)).toEqual([300_000, 400_000, 300_000]);
  });

  it('a soma das tranches é exactamente o contrato, cêntimos incluídos', () => {
    // 4 × 25% sobre 1.000,01 € dá quatro vezes 250,00 € e perde um cêntimo. A última leva o resto,
    // senão ficava sempre uma dívida por explicar.
    const quatro = [
      { nome: 'Um', bps: 2500 },
      { nome: 'Dois', bps: 2500 },
      { nome: 'Três', bps: 2500 },
      { nome: 'Quatro', bps: 2500 },
    ];
    const t = tranchesDoContrato({ totalCents: 100_001, adiantamentoBps: 0, fases: quatro });
    expect(t.reduce((n, x) => n + x.valorCents, 0)).toBe(100_001);
    expect(t[3]!.valorCents).toBe(25_001);
  });

  it('sem adiantamento não se cria uma tranche de zero', () => {
    const t = tranchesDoContrato({ totalCents: 1_000_000, adiantamentoBps: 0, fases });
    expect(t.map((x) => x.descricao)).toEqual(['A meio da obra', 'À conclusão']);
    expect(t.reduce((n, x) => n + x.valorCents, 0)).toBe(1_000_000);
  });

  it('uma fase sem nome não fica sem rótulo', () => {
    const t = tranchesDoContrato({ totalCents: 1000, adiantamentoBps: 0, fases: [{ nome: '   ', bps: 10_000 }] });
    expect(t[0]!.descricao).toBe('Fase');
  });

  it('as datas repartem-se pelo período da obra: a primeira no início, a última no fim', () => {
    const t = tranchesDoContrato({ totalCents: 1_000_000, adiantamentoBps: 3000, fases, inicio: '2026-03-02', fim: '2026-03-12' });
    expect(t.map((x) => x.prevista)).toEqual(['2026-03-02', '2026-03-07', '2026-03-12']);
  });

  it('sem período conhecido ficam por datar — uma data inventada faria a cobrança escrever no dia errado', () => {
    const t = tranchesDoContrato({ totalCents: 1_000_000, adiantamentoBps: 3000, fases });
    expect(t.every((x) => x.prevista === null)).toBe(true);
    expect(tranchesDoContrato({ totalCents: 1000, adiantamentoBps: 0, fases, inicio: '2026-03-02' }).every((x) => x.prevista === null)).toBe(true);
  });

  it('um fim antes do início não produz datas ao contrário', () => {
    const t = tranchesDoContrato({ totalCents: 1000, adiantamentoBps: 0, fases, inicio: '2026-03-12', fim: '2026-03-02' });
    expect(t.every((x) => x.prevista === null)).toBe(true);
  });

  it('uma só tranche fica na data de início', () => {
    const t = tranchesDoContrato({ totalCents: 1000, adiantamentoBps: 10_000, fases: [], inicio: '2026-03-02', fim: '2026-03-12' });
    expect(t).toEqual([{ descricao: 'Adiantamento', valorCents: 1000, prevista: '2026-03-02' }]);
  });

  it('um contrato sem plano nenhum não inventa tranches', () => {
    expect(tranchesDoContrato({ totalCents: 1_000_000, adiantamentoBps: 0, fases: [] })).toEqual([]);
  });
});
