import { describe, expect, it } from 'vitest';
import { AVISO_DA_COR, coresDoFabricante, lerReferenciaDeCor, porFamilia, referenciaDaPaleta, referenciaDeFabricante } from './corDaPintura';
import { embalagensEstimadas, litrosEstimados, precosUnitarios } from './materiaisDoInterior';

const paleta = [
  { codigo: 'QP-001', nome: 'Branco puro', hex: '#f7f7f4', familia: 'Brancos' },
  { codigo: 'QP-014', nome: 'Branco gelo', hex: '#eef1f2', familia: 'Brancos' },
  { codigo: 'QP-030', nome: 'Areia', hex: '#d9c9ae', familia: 'Terras' },
];

describe('referência da cor', () => {
  it('da paleta própria: código e nome, com o hex da paleta', () => {
    expect(referenciaDaPaleta(paleta[1]!)).toBe('QP-014 · Branco gelo');
    expect(lerReferenciaDeCor('QP-014 · Branco gelo', '#EEF1F2', paleta)).toEqual({ referencia: 'QP-014 · Branco gelo', hex: '#eef1f2' });
  });
  it('um código de outro sistema guarda-se como texto, sem quadrado de cor', () => {
    expect(lerReferenciaDeCor('RAL 9010', '#ffffff', paleta)).toEqual({ referencia: 'RAL 9010', hex: null });
    expect(lerReferenciaDeCor('  branco  ', null, paleta)).toEqual({ referencia: 'branco', hex: null });
  });
  it('um hex que não bate com a paleta não entra', () => {
    expect(lerReferenciaDeCor('QP-014 · Branco gelo', '#000000', paleta).hex).toBeNull();
  });
  it('vazio é vazio; texto comprido é cortado', () => {
    expect(lerReferenciaDeCor('', '#eef1f2', paleta)).toEqual({ referencia: null, hex: null });
    expect(lerReferenciaDeCor('x'.repeat(200), null, paleta).referencia).toHaveLength(120);
  });
  it('cores de fabricante: nome e marca, sem hex', () => {
    expect(coresDoFabricante('Branco, Marfim; Areia\nBranco')).toEqual(['Branco', 'Marfim', 'Areia']);
    expect(referenciaDeFabricante('Barbot', 'Casca de Ovo')).toBe('Barbot · Casca de Ovo');
  });
  it('agrupa por família, pela ordem', () => {
    expect(porFamilia(paleta).map(([f, c]) => [f, c.length])).toEqual([['Brancos', 2], ['Terras', 1]]);
  });
  it('o aviso que vai para o contrato e o orçamento', () => {
    expect(AVISO_DA_COR).toContain('amostra do fabricante');
  });
});

describe('materiais: estimativas, nunca números inventados', () => {
  it('litros ≈ área ÷ rendimento × demãos', () => {
    expect(litrosEstimados(120, 12, 2)).toBe(20);
    expect(litrosEstimados(100, 11, 2)).toBe(18.2);
  });
  it('sem área, rendimento ou demãos válidas: nada', () => {
    expect(litrosEstimados(null, 12, 2)).toBeNull();
    expect(litrosEstimados(100, null, 2)).toBeNull();
    expect(litrosEstimados(100, 12, 0)).toBeNull();
  });
  it('embalagens: arredonda para cima', () => {
    expect(embalagensEstimadas(20, 15)).toBe(2);
    expect(embalagensEstimadas(20, null)).toBeNull();
  });
  it('preço por litro e por m²: com o rendimento, ou pela área da embalagem; em falta dá nulo', () => {
    expect(precosUnitarios({ precoCents: 6000, embalagemL: 15, m2PorEmbalagem: null, rendimentoM2L: 10 })).toEqual({ porLitro: 400, porM2: 40 });
    expect(precosUnitarios({ precoCents: 6000, embalagemL: null, m2PorEmbalagem: 150, rendimentoM2L: null })).toEqual({ porLitro: null, porM2: 40 });
    expect(precosUnitarios({ precoCents: null, embalagemL: 15, m2PorEmbalagem: null, rendimentoM2L: 10 })).toEqual({ porLitro: null, porM2: null });
  });
});
