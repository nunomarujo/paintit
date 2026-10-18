import { describe, expect, it } from 'vitest';
import { buildingVolume } from './volume';

const base = { pisos: 5, fachadas: 4, temVarandas: false, moradia: false };
const count = (v: ReturnType<typeof buildingVolume>, kind: string) => v.faces.filter((f) => f.kind === kind).length;

describe('volume do prédio', () => {
  it('é igual para prédios com os mesmos dados (não identifica o prédio)', () => {
    expect(buildingVolume(base)).toEqual(buildingVolume({ ...base }));
  });

  it('cresce com o número de pisos', () => {
    const low = buildingVolume({ ...base, pisos: 2 });
    const high = buildingVolume({ ...base, pisos: 8 });
    expect(high.viewBox[3]).toBeGreaterThan(low.viewBox[3]);
    expect(high.pisosDesenhados).toBe(8);
  });

  it('limita o desenho a 20 pisos e usa valores por omissão', () => {
    expect(buildingVolume({ ...base, pisos: 40 }).pisosDesenhados).toBe(20);
    expect(buildingVolume({ ...base, pisos: null }).pisosDesenhados).toBe(4);
    expect(buildingVolume({ ...base, pisos: null, moradia: true }).pisosDesenhados).toBe(2);
    expect(buildingVolume({ ...base, pisos: 0 }).pisosDesenhados).toBe(1);
  });

  it('desenha uma varanda por piso acima do rés-do-chão', () => {
    expect(count(buildingVolume({ ...base, temVarandas: true }), 'varanda')).toBe(4 * 3);
    expect(count(buildingVolume(base), 'varanda')).toBe(0);
  });

  it('mostra vizinhos encostados em prédios em banda', () => {
    expect(count(buildingVolume(base), 'vizinho')).toBe(0);
    expect(count(buildingVolume({ ...base, fachadas: 2 }), 'vizinho')).toBe(6);
    expect(count(buildingVolume({ ...base, fachadas: 1 }), 'vizinho')).toBe(6);
    expect(count(buildingVolume({ ...base, fachadas: 3 }), 'vizinho')).toBe(3);
  });
});
