import { describe, expect, it } from 'vitest';
import { areasDaFachada, zonaDeDoisCantos, type TipoZona, type Zona } from './fachadaMedida';

let n = 0;
const z = (tipo: TipoZona, x: number, y: number, largura: number, altura: number): Zona => ({
  id: String(n++),
  tipo,
  x,
  y,
  largura,
  altura,
});
const contorno = z('fachada', 0, 0, 10, 20); // 200 m²

describe('areasDaFachada', () => {
  it('sem contorno, não há área — e diz o que falta', () => {
    const r = areasDaFachada([z('vao', 1, 1, 2, 2)]);
    expect(r.temContorno).toBe(false);
    expect(r.pintavelM2).toBe(0);
    expect(r.avisos.join(' ')).toMatch(/contorno/);
  });

  it('só o contorno: tudo pintável, e a frente/altura são as do contorno', () => {
    const r = areasDaFachada([contorno]);
    expect(r.contornoM2).toBe(200);
    expect(r.pintavelM2).toBe(200);
    expect(r.frenteM).toBe(10);
    expect(r.alturaM).toBe(20);
  });

  it('vãos (handoff, teste 4): 0,99 m² não desconta, 1,01 m² desconta exatamente 1,01 m²', () => {
    const pequeno = z('vao', 1, 1, 0.99, 1);
    const grande = z('vao', 4, 1, 1.01, 1);
    const r = areasDaFachada([contorno, pequeno, grande]);
    expect(r.pintavelM2).toBeCloseTo(200 - 1.01, 6);
    expect(r.vaosDescontados).toBe(1);
    expect(r.vaosPequenos).toBe(1);
  });

  it('um vão de exatamente 1 m² não desconta («igual ou inferior»)', () => {
    expect(areasDaFachada([contorno, z('vao', 1, 1, 1, 1)]).pintavelM2).toBe(200);
  });

  it('marquises descontam-se (fechadas, não pintadas)', () => {
    expect(areasDaFachada([contorno, z('marquise', 2, 5, 3, 2)]).pintavelM2).toBe(194);
  });

  it('R/C comercial fica fora por omissão e pode incluir-se', () => {
    const rc = z('rc', 0, 0, 10, 4);
    expect(areasDaFachada([contorno, rc]).pintavelM2).toBe(160);
    expect(areasDaFachada([contorno, rc], { incluirRC: true }).pintavelM2).toBe(200);
  });

  it('um vão dentro de um R/C já excluído não se desconta duas vezes', () => {
    const r = areasDaFachada([contorno, z('rc', 0, 0, 10, 4), z('vao', 3, 0, 2, 2)]);
    expect(r.pintavelM2).toBe(160);
    expect(r.linhas.find((l) => l.tipo === 'vao')!.areaM2).toBe(0);
  });

  it('as linhas somam exatamente o pintável (contorno − R/C − marquises − vãos)', () => {
    const zonas = [contorno, z('rc', 0, 0, 10, 4), z('marquise', 1, 3, 3, 3), z('vao', 6, 2, 2, 4), z('vao', 6, 10, 1.5, 1.2)];
    const r = areasDaFachada(zonas);
    const descontos = r.linhas.filter((l) => l.efeito === 'desconta' || l.efeito === 'fora').reduce((s, l) => s + l.areaM2, 0);
    expect(r.contornoM2 - descontos).toBeCloseTo(r.pintavelM2, 6);
  });

  it('varandas abertas não descontam — a frente faz parte da fachada pintada', () => {
    const r = areasDaFachada([contorno, z('varanda', 0, 4, 3, 16)]);
    expect(r.pintavelM2).toBe(200);
    expect(r.linhas.find((l) => l.tipo === 'varanda')!.areaM2).toBe(48);
  });

  it('dois contornos sobrepostos (prédio com recuo) contam a união, não a soma', () => {
    const r = areasDaFachada([z('fachada', 0, 0, 10, 20), z('fachada', 8, 0, 6, 15)]);
    expect(r.contornoM2).toBe(200 + 4 * 15); // os 2 m de sobreposição (8 → 10) não contam duas vezes
    expect(r.frenteM).toBe(14);
  });

  it('só conta o que está dentro do contorno, e avisa do resto', () => {
    const r = areasDaFachada([contorno, z('marquise', 8, 5, 4, 2)]); // metade fora
    expect(r.pintavelM2).toBe(196);
    expect(r.avisos.join(' ')).toMatch(/fora do contorno/);
  });

  it('zonaDeDoisCantos aceita os cantos por qualquer ordem', () => {
    const a = zonaDeDoisCantos('x', 'vao', { x: 5, y: 1 }, { x: 2, y: 4 });
    expect(a).toMatchObject({ x: 2, y: 1, largura: 3, altura: 3 });
  });
});

describe('sem base de dados', () => {
  it('fachadaMedida.ts não importa cliente de base de dados', async () => {
    const fonte = await import('fs/promises').then((fs) => fs.readFile(new URL('./fachadaMedida.ts', import.meta.url), 'utf8'));
    expect(fonte).not.toMatch(/supabase/i);
  });
});
