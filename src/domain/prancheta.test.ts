import { describe, expect, it } from 'vitest';
import {
  caixaDoRotulo,
  cotasDoDesenho,
  desenharZonas,
  lugaresDasZonas,
  numerarZonas,
  sitiosParaAcrescentar,
  type ZonaParaDesenho,
} from './prancheta';
import { dentroDoPoligono } from './chamadas';
import { buildingVolume, type VolumeInput } from './volume';

const predio = (o: Partial<VolumeInput> = {}) =>
  buildingVolume({
    pisos: 4,
    fachadas: 2,
    temVarandas: true,
    moradia: false,
    forma: null,
    angulo: 25,
    janelas: { frente: 4, esquerda: 0, direita: 0, tras: 4 },
    escala: { larguraM: 12, profundidadeM: 10, peDireitoM: 2.8 },
    elementos: { muro: true },
    ...o,
  });

const z = (id: string, kind: ZonaParaDesenho['kind'], participacao: ZonaParaDesenho['participacao'] = 'incluida'): ZonaParaDesenho => ({
  id,
  kind,
  participacao,
});

describe('o sítio de cada zona no desenho', () => {
  const v = predio();
  const zonas = [z('z1', 'fachada'), z('z2', 'empena'), z('z3', 'varandas', 'por_decidir'), z('z4', 'muro', 'excluida')];
  const lugares = lugaresDasZonas(v, zonas);

  it('as quatro zonas das maquetas têm sítio, cada uma nas suas faces', () => {
    const tipos = (id: string) => [...new Set(lugares[id]!.faces.map((i) => v.faces[i]!.kind))].sort();
    expect(tipos('z1')).toEqual(['frente']);
    expect(tipos('z2')).toEqual(['empena']);
    // As varandas levam os tetos e as guardas: é o nome da zona.
    expect(tipos('z3')).toEqual(['grade', 'varanda']);
    expect(tipos('z4')).toEqual(['muro']);
    for (const id of ['z1', 'z2', 'z3', 'z4']) expect(lugares[id]!.pino).not.toBeNull();
  });

  it('uma face é de uma zona só: a segunda fachada não tem onde ficar', () => {
    const l = lugaresDasZonas(v, [z('a', 'fachada'), z('b', 'fachada')]);
    expect(l.a!.pino).not.toBeNull();
    expect(l.b).toEqual({ faces: [], pino: null });
  });

  it('o que o volume não tem fica sem sítio: escadas e átrio, interiores, tetos, outra superfície', () => {
    const l = lugaresDasZonas(v, [z('e', 'escadas_atrio'), z('p', 'paredes_interiores'), z('t', 'tetos'), z('o', 'outro')]);
    for (const id of ['e', 'p', 't', 'o']) expect(l[id]!.pino).toBeNull();
  });

  it('com uma zona de elementos metálicos, as guardas são dela e não das varandas', () => {
    const l = lugaresDasZonas(v, [z('v', 'varandas'), z('m', 'elementos_metalicos')]);
    expect(l.v!.faces.every((i) => v.faces[i]!.kind === 'varanda')).toBe(true);
    expect(l.m!.faces.every((i) => v.faces[i]!.kind === 'grade')).toBe(true);
    expect(l.m!.pino).not.toBeNull();
  });
});

describe('o pedido vazio: acrescentar tocando no prédio', () => {
  it('a fachada, a empena e as varandas, cada uma dentro da face que pintaria', () => {
    const v = predio({ elementos: {} });
    const sitios = sitiosParaAcrescentar(v);
    expect(sitios.map((x) => x.tipo)).toEqual(['fachada', 'empena', 'varandas']);
    const dentro = (tipo: string, kind: string) =>
      v.faces.some((f) => f.kind === kind && dentroDoPoligono(sitios.find((x) => x.tipo === tipo)!.p, f.points));
    expect(dentro('fachada', 'frente')).toBe(true);
    expect(dentro('empena', 'empena')).toBe(true);
    expect(dentro('varandas', 'varanda')).toBe(true);
  });

  it('sem empena à vista nem varandas, só a fachada', () => {
    expect(sitiosParaAcrescentar(predio({ fachadas: 4, temVarandas: false, elementos: {} })).map((x) => x.tipo)).toEqual(['fachada']);
  });
});

describe('a ordem e os números', () => {
  it('primeiro as do desenho, depois as que ele não mostra, no fim as excluídas — numeradas quando têm sítio', () => {
    const v = predio();
    const zonas = [
      z('muro', 'muro', 'excluida'),
      z('escadas', 'escadas_atrio'),
      z('fachada', 'fachada'),
      z('empena', 'empena'),
      z('tardoz', 'fachada'),
    ];
    const n = numerarZonas(zonas, lugaresDasZonas(v, zonas));
    expect(n).toEqual([
      { id: 'fachada', grupo: 'no_desenho', n: 1 },
      { id: 'empena', grupo: 'no_desenho', n: 2 },
      { id: 'escadas', grupo: 'fora_do_desenho', n: null },
      { id: 'tardoz', grupo: 'fora_do_desenho', n: null },
      { id: 'muro', grupo: 'fora_do_pedido', n: 3 },
    ]);
  });
});

describe('as cotas', () => {
  const v = predio();
  const silhueta = v.faces.filter((f) => !f.fade).flatMap((f) => f.points);
  const minY = Math.min(...silhueta.map((p) => p[1]));
  const maxX = Math.max(...silhueta.map((p) => p[0]));

  it('só se desenha a cota de um eixo com medida', () => {
    expect(cotasDoDesenho(v, { frente: '12 m' }, { afastamento: 1, letra: 1 }).map((c) => c.eixo)).toEqual(['frente']);
    expect(cotasDoDesenho(v, {}, { afastamento: 1, letra: 1 })).toEqual([]);
  });

  it('ficam por cima e atrás do prédio, onde as ligações das zonas não precisam de ir', () => {
    const [frente, fundo, altura] = cotasDoDesenho(v, { frente: '12 m', fundo: '10 m', altura: '11,2 m' }, { afastamento: 1, letra: 1 });
    // A frente por cima do telhado: parte do canto mais alto do desenho (o de trás, à esquerda) e sobe.
    expect(frente!.chamadas[0]![0][1]).toBeCloseTo(minY, 5);
    for (const [aresta, linha] of frente!.chamadas) expect(linha[1]).toBeLessThan(aresta[1]);
    // A altura à direita de tudo.
    expect(Math.min(altura!.linha[0][0], altura!.linha[1][0])).toBeGreaterThan(maxX);
    // O fundo à esquerda da esquina da frente, no alto: acaba acima do alto da frente.
    expect(Math.min(fundo!.linha[0][0], fundo!.linha[1][0])).toBeLessThan(v.cotas.largura[0][0]);
    expect(Math.max(fundo!.linha[0][1], fundo!.linha[1][1])).toBeLessThan(v.cotas.altura[1][1]);
    // E os textos crescem para longe do prédio.
    expect([frente!.alinhar, fundo!.alinhar, altura!.alinhar]).toEqual(['centro', 'direita', 'esquerda']);
  });

  it('a caixa do desenho inclui as cotas e os seus textos', () => {
    const d = desenharZonas(v, [], { frente: '12 m', altura: '11,2 m' }, 20);
    const [x, y, w, h] = d.caixa;
    for (const c of d.cotas) {
      for (const p of c.linha) {
        expect(p[0]).toBeGreaterThanOrEqual(x);
        expect(p[0]).toBeLessThanOrEqual(x + w);
        expect(p[1]).toBeGreaterThanOrEqual(y);
        expect(p[1]).toBeLessThanOrEqual(y + h);
      }
    }
  });

  it('num prédio em L, U ou T, o texto da frente não assenta na asa de trás (cético, 05/11/2026)', () => {
    for (const forma of ['L', 'U', 'T'] as const) {
      const vf = predio({ forma });
      const letra = 1;
      const caracter = 0.37;
      const cotas = cotasDoDesenho(vf, { frente: '≈ 12 m', fundo: '≈ 10 m' }, { afastamento: 1, letra, caracter });
      for (const c of cotas) {
        const k = caixaDoRotulo(c, { letra, caracter });
        const cantos: [number, number][] = [
          [k.x, k.y],
          [k.x + k.w, k.y],
          [k.x + k.w, k.y + k.h],
          [k.x, k.y + k.h],
        ];
        for (const f of vf.faces.filter((x) => !x.fade)) {
          for (const p of cantos) expect(dentroDoPoligono(p, f.points), `${forma}: ${c.eixo}`).toBe(false);
        }
      }
    }
  });
});
