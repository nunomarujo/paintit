import { describe, expect, it } from 'vitest';
import { BUILDING_NEEDS, BUILDING_NEED_LABELS, canStartRequest, isBuildingNeed, isQuotableNeed, splitNeeds } from './buildingNeeds';

describe('obras pretendidas no prédio', () => {
  it('todas têm rótulo', () => {
    for (const n of BUILDING_NEEDS) expect(BUILDING_NEED_LABELS[n]).toBeTruthy();
  });

  it('só a pintura e a impermeabilização se orçamentam aqui', () => {
    expect(BUILDING_NEEDS.filter(isQuotableNeed)).toEqual(['pintura_exterior', 'pintura_interior', 'impermeabilizacao']);
    // As que o promotor nomeou e estão fora do âmbito registam-se, mas não geram pedido.
    expect(isQuotableNeed('telhado_cobertura')).toBe(false);
    expect(isQuotableNeed('caleiras_algerozes')).toBe(false);
    expect(isQuotableNeed('revestimento_fachada')).toBe(false);
  });

  it('separa o que se pede aqui do que fica só registado', () => {
    const r = splitNeeds(['telhado_cobertura', 'pintura_exterior', 'caleiras_algerozes']);
    expect(r.orcamentaveis).toEqual(['pintura_exterior']);
    expect(r.soRegistados).toEqual(['telhado_cobertura', 'caleiras_algerozes']);
  });

  it('ignora valores que não são obras conhecidas, venham de onde vierem', () => {
    expect(isBuildingNeed('inventado')).toBe(false);
    expect(splitNeeds(['inventado', 'pintura_interior'])).toEqual({ orcamentaveis: ['pintura_interior'], soRegistados: [] });
  });

  it('o convite a pedir orçamentos só aparece com uma obra orçamentável assinalada', () => {
    expect(canStartRequest([])).toBe(false);
    expect(canStartRequest(['telhado_cobertura'])).toBe(false);
    expect(canStartRequest(['telhado_cobertura', 'pintura_exterior'])).toBe(true);
  });
});
