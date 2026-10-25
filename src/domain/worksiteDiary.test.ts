import { describe, expect, it } from 'vitest';
import { diaryErrors, faltas, porFase, type FotoDiario } from './worksiteDiary';

const f = (over: Partial<FotoDiario> = {}): FotoDiario => ({
  id: Math.random().toString(36).slice(2), fase: 'antes', zona: null, produto: null, legenda: null,
  registadaEm: '2026-10-20T09:00:00Z', ...over,
});

describe('diário da obra', () => {
  it('exige a fase, que é o que dá sentido à fotografia', () => {
    expect(diaryErrors({ fase: 'inventada', legenda: '', zona: '', produto: '' })).toHaveProperty('fase');
    expect(diaryErrors({ fase: 'antes', legenda: '', zona: '', produto: '' })).toEqual({});
  });

  it('agrupa pela ordem em que a obra acontece, não pela ordem de carregamento', () => {
    const lista = [f({ fase: 'depois' }), f({ fase: 'antes' }), f({ fase: 'durante' })];
    expect(porFase(lista).map((g) => g.fase)).toEqual(['antes', 'durante', 'depois']);
  });

  it('dentro de cada fase, a mais antiga primeiro', () => {
    const lista = [f({ id: 'b', registadaEm: '2026-10-22T09:00:00Z' }), f({ id: 'a', registadaEm: '2026-10-20T09:00:00Z' })];
    expect(porFase(lista)[0]!.fotos.map((x) => x.id)).toEqual(['a', 'b']);
  });

  it('não mostra fases vazias', () => {
    expect(porFase([f({ fase: 'antes' })]).map((g) => g.fase)).toEqual(['antes']);
  });
});

describe('o que falta para servir de prova', () => {
  it('avisa quando não há fotografias do antes', () => {
    expect(faltas([f({ fase: 'depois' })])[0]).toContain('antes');
  });

  it('avisa quando nenhuma diz o produto aplicado', () => {
    expect(faltas([f({ fase: 'antes' })]).some((x) => x.includes('produto'))).toBe(true);
  });

  it('cala-se quando o diário está completo', () => {
    expect(faltas([f({ fase: 'antes', produto: 'CIN Vinylmatt' })])).toEqual([]);
  });

  it('num diário vazio só fala do antes — ainda não há nada para dizer sobre produtos', () => {
    expect(faltas([])).toHaveLength(1);
  });
});
