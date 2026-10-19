import { describe, expect, it } from 'vitest';
import { consumption, parseProduct, productLabel } from './catalog';

const form = (o: Record<string, string>) => {
  const f = new FormData();
  for (const [k, v] of Object.entries(o)) f.set(k, v);
  return f;
};

describe('catálogo', () => {
  it('calcula litros e embalagens para a área e as demãos', () => {
    // 161,5 m² × 2 demãos a 12 m²/L = 26,92 L → 26 917 mL; latas de 15 L → 2.
    const c = consumption(16150, 2, { rendimento: 1200, embalagemMl: 15000, precoReferencia: 8990 });
    expect(c).toEqual({ ml: 26917, embalagens: 2, custo: 17980 });
    expect(consumption(16150, 2, { rendimento: null, embalagemMl: null, precoReferencia: null })).toBeNull();
    expect(consumption(16150, 1, { rendimento: 1000, embalagemMl: null, precoReferencia: 100 })).toEqual({ ml: 16150, embalagens: null, custo: null });
  });

  it('lê o formulário do produto, com preço datado', () => {
    const p = parseProduct(form({ nome: 'Acrílica Mate', marca: 'Marca X', tipo: 'tinta_exterior', rendimento: '12', embalagem: '15', preco: '89,90', precoData: '2026-10-01' }));
    expect(p.value).toMatchObject({ rendimento: 1200, embalagemMl: 15000, precoReferencia: 8990 });
    expect(productLabel(p.value!)).toBe('Marca X Acrílica Mate');
    expect(parseProduct(form({ nome: 'x', marca: 'y', tipo: 'tinta_exterior', preco: '10' })).errors.precoData).toBeTruthy();
    expect(parseProduct(form({ tipo: 'nada' })).errors).toMatchObject({ nome: expect.any(String), marca: expect.any(String), tipo: expect.any(String) });
  });
});
