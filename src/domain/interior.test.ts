import { describe, expect, it } from 'vitest';
import {
  VAO_MINIMO_INTERIOR_M2,
  areasDaDivisao,
  declaracaoDoInterior,
  divisaoDaPlanta,
  escalaDaPlanta,
  lerMetros,
  nomeDaDivisao,
  proximoNumero,
  separadoresDoPasso,
  totalDoInterior,
  type Divisao,
} from './interior';

const div = (o: Partial<Divisao> = {}): Divisao => ({
  tipo: 'quarto',
  numero: 1,
  comprimentoM: 4,
  larguraM: 3,
  perimetroM: null,
  peDireitoM: null,
  vaos: [],
  pintarParedes: true,
  pintarTeto: false,
  areaParedesManualM2: null,
  areaTetoManualM2: null,
  ...o,
});
const geral = { metros: 2.6, aceiteComoCorrente: false };

describe('interior: paredes = perímetro × pé-direito − vãos', () => {
  it('um quarto de 4 × 3 com 2,6 m: 36,4 m² de paredes', () => {
    expect(areasDaDivisao(div(), geral, 'desenho')).toEqual({ paredesM2: 36.4, tetoM2: null, certeza: 'declarada', falta: [] });
  });

  it('vãos: só os maiores do que o mínimo descontam (o valor é parâmetro, por decidir)', () => {
    const porta = { larguraM: 0.8, alturaM: 2, quantidade: 1 }; // 1,6 m²
    const postigo = { larguraM: 0.5, alturaM: 0.5, quantidade: 2 }; // 0,25 m² cada
    expect(areasDaDivisao(div({ vaos: [porta, postigo] }), geral, 'desenho').paredesM2).toBe(34.8);
    expect(VAO_MINIMO_INTERIOR_M2).toBe(1);
    expect(areasDaDivisao(div({ vaos: [porta, postigo] }), geral, 'desenho', { vaoMinimoM2: 0 }).paredesM2).toBe(34.3);
  });

  it('pé-direito próprio da divisão manda sobre o geral', () => {
    expect(areasDaDivisao(div({ peDireitoM: 3 }), geral, 'desenho').paredesM2).toBe(42);
  });

  it('nunca inventa: sem medidas, fica por medir e diz o que falta', () => {
    const a = areasDaDivisao(div({ larguraM: null }), { metros: null, aceiteComoCorrente: false }, 'desenho');
    expect(a.paredesM2).toBeNull();
    expect(a.falta).toEqual(['largura', 'pé-direito']);
  });

  it('o pé-direito corrente aceite entra como estimativa', () => {
    expect(areasDaDivisao(div(), { metros: 2.8, aceiteComoCorrente: true }, 'desenho').certeza).toBe('estimada');
  });

  it('divisão irregular pelo perímetro; o teto aí precisa das medidas', () => {
    const a = areasDaDivisao(div({ comprimentoM: null, larguraM: null, perimetroM: 15, pintarTeto: true }), geral, 'desenho');
    expect(a.paredesM2).toBe(39);
    expect(a.tetoM2).toBeNull();
    expect(a.falta[0]).toMatch(/teto/);
  });

  it('teto à parte, só quando se pinta', () => {
    expect(areasDaDivisao(div({ pintarTeto: true }), geral, 'desenho').tetoM2).toBe(12);
  });

  it('planta à escala: estimada; manual: o que se escreveu', () => {
    expect(areasDaDivisao(div(), geral, 'planta').certeza).toBe('estimada');
    expect(areasDaDivisao(div({ areaParedesManualM2: 30.5 }), geral, 'manual')).toMatchObject({ paredesM2: 30.5, certeza: 'declarada' });
    expect(areasDaDivisao(div({ areaParedesManualM2: null }), geral, 'manual').falta).toEqual(['área das paredes']);
  });

  it('total: só as divisões a pintar; conta as que estão por medir', () => {
    const t = totalDoInterior(
      [div(), div({ tipo: 'sala', pintarTeto: true, comprimentoM: 5, larguraM: 4 }), div({ tipo: 'wc', pintarParedes: false }), div({ numero: 2, larguraM: null })],
      geral,
      'desenho',
    );
    expect(t).toEqual({ paredesM2: 83.2, tetosM2: 20, porMedir: 1, certeza: 'declarada' });
  });
});

describe('planta à escala', () => {
  it('escala por uma medida conhecida; recusa uma medida curta demais', () => {
    expect(escalaDaPlanta({ x: 0, y: 0 }, { x: 300, y: 400 }, 5)).toBeCloseTo(0.01);
    expect(escalaDaPlanta({ x: 0, y: 0 }, { x: 10, y: 0 }, 5)).toBeNull();
  });
  it('a divisão sai em metros, com a margem do toque', () => {
    const d = divisaoDaPlanta({ x: 100, y: 100 }, { x: 500, y: 400 }, 0.01, 500)!;
    expect(d.comprimentoM).toBe(4);
    expect(d.larguraM).toBe(3);
    expect(d.margem).toBeGreaterThan(0);
    expect(d.margem).toBeLessThan(0.05);
  });
});

describe('separadores do passo «Medidas e fotografias»', () => {
  it('interior e exterior: Alçados e Interior', () => {
    expect(separadoresDoPasso(['fachadas', 'interior'])).toEqual({ modo: 'separadores', primeiro: 'Alçados' });
    expect(separadoresDoPasso(['moradia', 'interior', 'caleiras'])).toEqual({ modo: 'separadores', primeiro: 'Alçados' });
  });
  it('só interior: sem separadores', () => {
    expect(separadoresDoPasso(['interior'])).toEqual({ modo: 'so_interior' });
    expect(separadoresDoPasso(['interior', 'caleiras'])).toEqual({ modo: 'so_interior' });
  });
  it('sem interior: como sempre; zonas comuns não se mexem', () => {
    expect(separadoresDoPasso(['fachadas'])).toEqual({ modo: 'so_zonas' });
    expect(separadoresDoPasso(['zonas_comuns', 'interior'])).toEqual({ modo: 'separadores', primeiro: 'Zonas e medidas' });
  });
});

describe('nomes e leitura', () => {
  it('«Quarto 2»: só nomes da lista, numerados', () => {
    expect(proximoNumero([div(), div({ numero: 2 })], 'quarto')).toBe(3);
    expect(nomeDaDivisao({ tipo: 'quarto', numero: 2 }, true)).toBe('Quarto 2');
    expect(nomeDaDivisao({ tipo: 'sala', numero: 1 }, false)).toBe('Sala');
  });
  it('metros: vírgula, até 100 m', () => {
    expect(lerMetros('2,75')).toBe(2.75);
    expect(lerMetros('')).toBeNull();
    expect(lerMetros('0')).toBeNaN();
    expect(lerMetros('120')).toBeNaN();
  });
  it('a frase do contrato', () => {
    expect(declaracaoDoInterior([div(), div({ tipo: 'sala', comprimentoM: 5, larguraM: 4, pintarTeto: true })], geral, 'desenho')).toBe(
      'Interior da habitação — Quarto, Sala; pé-direito 2,6 m; paredes 83,2 m²; tetos 20 m².',
    );
    expect(declaracaoDoInterior([div({ pintarParedes: false })], geral, 'desenho')).toBeNull();
  });
});

import { lerInterior } from './interior';
describe('o que o ecrã envia, validado no servidor', () => {
  const ok = { modo: 'desenho', peDireitoM: 2.6, divisoes: [{ tipo: 'sala', numero: 1, comprimentoM: 5, larguraM: 4, vaos: [{ larguraM: 0.9, alturaM: 2, quantidade: 1 }] }] };
  it('aceita o que é válido', () => {
    const r = lerInterior(ok);
    expect(r.erro).toBeUndefined();
    expect(r.value?.divisoes[0]).toMatchObject({ tipo: 'sala', comprimentoM: 5, pintarParedes: true, pintarTeto: false });
  });
  it('recusa tipos fora da lista (nada de texto livre a identificar pessoas)', () => {
    expect(lerInterior({ ...ok, divisoes: [{ tipo: 'Quarto do João', numero: 1 }] }).erro).toMatch(/tipo/);
  });
  it('recusa medidas fora dos limites, nomes repetidos e modos desconhecidos', () => {
    expect(lerInterior({ ...ok, divisoes: [{ tipo: 'sala', numero: 1, comprimentoM: 500 }] }).erro).toMatch(/limites/);
    expect(lerInterior({ ...ok, divisoes: [{ tipo: 'sala', numero: 1 }, { tipo: 'sala', numero: 1 }] }).erro).toMatch(/mesmo nome/);
    expect(lerInterior({ ...ok, modo: 'magia' }).erro).toBeDefined();
    expect(lerInterior({ ...ok, peDireitoM: 0.5 }).erro).toMatch(/pé-direito/);
  });
  it('o corrente aceite só conta com um pé-direito; o hex só com uma referência', () => {
    expect(lerInterior({ ...ok, peDireitoM: null, aceiteComoCorrente: true }).value?.geral.aceiteComoCorrente).toBe(false);
    expect(lerInterior({ ...ok, divisoes: [{ tipo: 'sala', numero: 1, corHex: '#ffffff' }] }).value?.divisoes[0]?.corHex).toBeNull();
  });
});

import { declaracaoDasDivisoesGravadas } from './interior';
describe('a declaração gravada (contrato e anúncio)', () => {
  const g = (o: Partial<Parameters<typeof declaracaoDasDivisoesGravadas>[0][number]>) => ({
    tipo: 'quarto', numero: 1, pintar_paredes: true, pintar_teto: false, area_paredes_cm2: 3640, area_teto_cm2: null, pe_direito_cm: null, cor_referencia: null, certeza: 'declarada', ...o,
  });
  it('divisões, áreas à parte, por medir e cores com o aviso', () => {
    const f = declaracaoDasDivisoesGravadas(
      [g({}), g({ numero: 2, area_paredes_cm2: null }), g({ tipo: 'sala', pintar_teto: true, area_teto_cm2: 2000, area_paredes_cm2: 4680, cor_referencia: 'QP-014 · Branco gelo' })],
      'A cor é aproximada.',
    );
    expect(f[0]).toBe('Interior da habitação — Quarto 1, Quarto 2, Sala; paredes 83,2 m²; tetos 20 m²; 1 divisão por medir.');
    expect(f[1]).toBe('Cores: Sala: QP-014 · Branco gelo. A cor é aproximada.');
  });
  it('nada a pintar, nada a declarar', () => {
    expect(declaracaoDasDivisoesGravadas([g({ pintar_paredes: false })], 'x')).toEqual([]);
  });
});
