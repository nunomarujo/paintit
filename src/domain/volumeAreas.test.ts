import { describe, expect, it } from 'vitest';
import { areasDoVolume, AREA_MINIMA_DO_VAO_QUE_DESCONTA_M2 } from './volumeAreas';
import type { VolumeInput } from './volume';

const base: VolumeInput = {
  pisos: 3,
  fachadas: 4,
  temVarandas: false,
  moradia: false,
  forma: 'quadrado',
  escala: { larguraM: 10, profundidadeM: 10, peDireitoM: 3 },
  janelas: { frente: 0, tras: 0, esquerda: 0, direita: 0 }, // sem vãos, para isolar o cálculo bruto
};

describe('areasDoVolume', () => {
  it('fachadas sem vãos: 4 paredes de 10m x 9m (3 pisos x 3m)', () => {
    const r = areasDoVolume(base);
    // forma "quadrado" = um único corpo 10x10; com 4 fachadas livres, as 4 paredes (frente+lado) são
    // todas "fachada" (nenhuma empena). Perímetro 40m x altura 9m = 360 m².
    expect(r.fachadasBrutoM2).toBeCloseTo(360, 1);
    expect(r.categorias.find((c) => c.categoria === 'fachadas')!.areaM2).toBeCloseTo(360, 1);
    expect(r.vaosDescontadosCount).toBe(0);
  });

  it('desconta vãos com mais de 1 m² e não desconta vãos de 1 m² ou menos', () => {
    // Uma porta de entrada mede sempre 2,1m de altura x ~1m (regra de vaos() em volume.ts) => >1m².
    const comPorta = areasDoVolume({ ...base, janelas: { frente: 1, tras: 0, esquerda: 0, direita: 0 } });
    expect(comPorta.vaosDescontadosCount).toBeGreaterThan(0);
    expect(comPorta.vaosDescontadosM2).toBeGreaterThan(AREA_MINIMA_DO_VAO_QUE_DESCONTA_M2);
    expect(comPorta.categorias.find((c) => c.categoria === 'fachadas')!.areaM2).toBeLessThan(
      areasDoVolume(base).categorias.find((c) => c.categoria === 'fachadas')!.areaM2,
    );
  });

  it('empenas contam à parte, nunca como fachada', () => {
    const encostado = areasDoVolume({ ...base, fachadas: 2 });
    const empenas = encostado.categorias.find((c) => c.categoria === 'empenas')!;
    const fachadas = encostado.categorias.find((c) => c.categoria === 'fachadas')!;
    expect(empenas.areaM2).toBeGreaterThan(0);
    // Com só 2 fachadas livres, a área de fachada é bastante menor do que com 4.
    expect(fachadas.areaM2).toBeLessThan(areasDoVolume(base).categorias.find((c) => c.categoria === 'fachadas')!.areaM2);
  });

  it('varandas só contam quando declaradas, e marquises só quando declaradas — nunca ambas por omissão', () => {
    const semNenhuma = areasDoVolume(base);
    expect(semNenhuma.categorias.find((c) => c.categoria === 'varandas')!.areaM2).toBe(0);
    expect(semNenhuma.categorias.find((c) => c.categoria === 'marquises')!.areaM2).toBe(0);

    const comVarandas = areasDoVolume({ ...base, temVarandas: true });
    expect(comVarandas.categorias.find((c) => c.categoria === 'varandas')!.areaM2).toBeGreaterThan(0);
    expect(comVarandas.categorias.find((c) => c.categoria === 'marquises')!.areaM2).toBe(0);

    const comMarquises = areasDoVolume({ ...base, temMarquises: true });
    expect(comMarquises.categorias.find((c) => c.categoria === 'marquises')!.areaM2).toBeGreaterThan(0);
    expect(comMarquises.categorias.find((c) => c.categoria === 'varandas')!.areaM2).toBe(0);
  });

  it('marquises nunca entram no total pintável; varandas e fachadas entram', () => {
    const r = areasDoVolume({ ...base, temMarquises: true });
    const marquises = r.categorias.find((c) => c.categoria === 'marquises')!;
    expect(marquises.pintavel).toBe(false);
    const semMarquiseNoTotal =
      r.categorias.filter((c) => c.pintavel).reduce((a, c) => a + c.areaM2, 0) === r.totalPintavelM2;
    expect(semMarquiseNoTotal).toBe(true);
  });

  it('cresce com o número de pisos', () => {
    const baixo = areasDoVolume({ ...base, pisos: 2 });
    const alto = areasDoVolume({ ...base, pisos: 8 });
    expect(alto.fachadasBrutoM2).toBeGreaterThan(baixo.fachadasBrutoM2);
  });

  it('sem imports de cliente de base de dados', async () => {
    const fonte = await import('fs/promises').then((fs) => fs.readFile(new URL('./volumeAreas.ts', import.meta.url), 'utf8'));
    expect(fonte).not.toMatch(/supabase/i);
  });
});
