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

  // Pormenores caracterizados (24/10/2026).
  it('desenha janelas em ritmo fixo, duas por piso acima do rés-do-chão', () => {
    expect(count(buildingVolume(base), 'janela')).toBe(4 * 2);
    expect(count(buildingVolume({ ...base, pisos: 2 }), 'janela')).toBe(1 * 2);
  });

  it('toda a varanda leva guarda: uma por piso com varanda, nenhuma sem varandas', () => {
    expect(count(buildingVolume({ ...base, temVarandas: true }), 'grade')).toBe(4);
    expect(count(buildingVolume(base), 'grade')).toBe(0);
  });

  it('só desenha muro, beirais e palas quando foram caracterizados', () => {
    expect(count(buildingVolume(base), 'muro')).toBe(0);
    expect(count(buildingVolume(base), 'beiral')).toBe(0);
    expect(count(buildingVolume(base), 'pala')).toBe(0);
    expect(count(buildingVolume({ ...base, elementos: { muro: true } }), 'muro')).toBe(3);
    expect(count(buildingVolume({ ...base, elementos: { beirais: true } }), 'beiral')).toBe(3);
    // Uma pala por vão: dois vãos por piso, quatro pisos acima do rés-do-chão.
    expect(count(buildingVolume({ ...base, elementos: { palas: true } }), 'pala')).toBe(4 * 2 * 3);
  });

  it('os pormenores não quebram o anonimato: as mesmas declarações dão o mesmo desenho', () => {
    const declaracoes = { ...base, temVarandas: true, elementos: { muro: true, beirais: true, palas: true, metalicos: true } };
    expect(buildingVolume(declaracoes)).toEqual(buildingVolume({ ...declaracoes, elementos: { ...declaracoes.elementos } }));
  });

  it('o desenho cresce com o que foi caracterizado, nunca encolhe', () => {
    const semNada = buildingVolume(base).faces.length;
    const comTudo = buildingVolume({ ...base, temVarandas: true, elementos: { muro: true, beirais: true, palas: true } }).faces.length;
    expect(comTudo).toBeGreaterThan(semNada);
  });
});
