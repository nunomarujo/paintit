import { describe, expect, it } from 'vitest';
import {
  PATHOLOGIES,
  PATHOLOGY_HINTS,
  PATHOLOGY_LABELS,
  conditionBlockers,
  isSeverity,
  missingPhotos,
  severityBand,
  summaryForListing,
  type ConditionNote,
} from './condition';

const nota = (over: Partial<ConditionNote> = {}): ConditionNote => ({ pathology: 'fissuras', severity: 0, nota: '', fotos: 0, ...over });

describe('estado e patologias da obra', () => {
  it('todas as patologias têm rótulo e ajuda', () => {
    for (const p of PATHOLOGIES) {
      expect(PATHOLOGY_LABELS[p]).toBeTruthy();
      expect(PATHOLOGY_HINTS[p]).toBeTruthy();
    }
  });

  it('a escala do promotor: 0 é ausência, 1 suave, 10 tremendo', () => {
    expect(severityBand(0)).toBe('nenhum');
    expect(severityBand(1)).toBe('ligeiro');
    expect(severityBand(3)).toBe('ligeiro');
    expect(severityBand(4)).toBe('moderado');
    expect(severityBand(6)).toBe('moderado');
    expect(severityBand(7)).toBe('grave');
    expect(severityBand(10)).toBe('grave');
  });

  it('recusa gravidades fora da escala ou com casas decimais', () => {
    expect(isSeverity(-1)).toBe(false);
    expect(isSeverity(11)).toBe(false);
    expect(isSeverity(3.5)).toBe(false);
    expect(isSeverity(0)).toBe(true);
    expect(isSeverity(10)).toBe(true);
  });

  it('a partir de moderado, exige fotografia', () => {
    expect(missingPhotos([nota({ severity: 3 })])).toEqual([]);
    expect(missingPhotos([nota({ severity: 4 })])).toEqual(['fissuras']);
    expect(missingPhotos([nota({ severity: 9, fotos: 2 })])).toEqual([]);
  });

  it('diz o que falta antes de concluir, por patologia', () => {
    const blockers = conditionBlockers([nota({ severity: 8 }), nota({ pathology: 'humidade', severity: 5, fotos: 1 })]);
    expect(blockers).toHaveLength(1);
    expect(blockers[0]).toContain('Fissuras e rachadelas');
  });

  it('o resumo do anúncio mostra só o que tem ocorrência, do mais grave para o menos', () => {
    const r = summaryForListing([
      nota({ pathology: 'fissuras', severity: 2, fotos: 1 }),
      nota({ pathology: 'humidade', severity: 0 }),
      nota({ pathology: 'ferrugem', severity: 7, fotos: 1 }),
    ]);
    expect(r.map((x) => x.pathology)).toEqual(['ferrugem', 'fissuras']);
    expect(r[0]!.band).toBe('grave');
  });
});
