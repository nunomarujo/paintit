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

import { bestDiscount, deliveryFor, discounted, type DiscountRule } from './catalog';

const rule = (o: Partial<DiscountRule>): DiscountRule => ({
  id: 'r',
  productId: null,
  tipo: null,
  minArea: null,
  maxArea: null,
  bps: 0,
  validUntil: null,
  ...o,
});

describe('descontos e entregas dos fornecedores', () => {
  const tinta = { id: 'p1', tipo: 'tinta_exterior' as const };
  const rules = [
    rule({ id: 'a', tipo: 'tinta_exterior', maxArea: 100000, bps: 1000 }), // até 1000 m²: 10%
    rule({ id: 'b', tipo: 'tinta_exterior', minArea: 100001, bps: 1500 }), // acima: 15%
    rule({ id: 'c', productId: 'p2', bps: 3000 }),
    rule({ id: 'd', bps: 1200, validUntil: '2026-01-01' }),
  ];

  it('escolhe o escalão da área orçamentada', () => {
    expect(bestDiscount(tinta, 50000, '2026-10-19', rules)?.id).toBe('a');
    expect(bestDiscount(tinta, 200000, '2026-10-19', rules)?.id).toBe('b');
    expect(bestDiscount({ id: 'p3', tipo: 'primario' }, 50000, '2026-10-19', rules)).toBeNull();
    expect(bestDiscount({ id: 'p3', tipo: 'primario' }, 50000, '2025-12-01', rules)?.id).toBe('d');
  });

  it('um desconto por cliente só vale para esse pintor', () => {
    const vip = [...rules, rule({ id: 'v', tipo: 'tinta_exterior', bps: 2500, painterOrgId: 'P1' })];
    expect(bestDiscount(tinta, 50000, '2026-10-19', vip, 'P1')?.id).toBe('v');
    expect(bestDiscount(tinta, 50000, '2026-10-19', vip, 'P2')?.id).toBe('a');
    expect(bestDiscount(tinta, 50000, '2026-10-19', vip)?.id).toBe('a');
  });

  it('desconto ao cêntimo', () => {
    expect(discounted(8990, 1000)).toBe(8091);
    expect(discounted(8990, 0)).toBe(8990);
  });

  it('entrega por concelho, incluída acima do mínimo', () => {
    const d = [
      { concelhos: ['Lisboa', 'Oeiras'], incluida: true, custo: null, minimo: 50000, condicoes: '' },
      { concelhos: [], incluida: false, custo: 4000, minimo: null, condicoes: 'Restante país, 48 h' },
    ];
    expect(deliveryFor(d, 'lisboa', 60000)).toEqual({ kind: 'incluida' });
    expect(deliveryFor(d, 'Lisboa', 10000)).toEqual({ kind: 'paga', custo: 4000, condicoes: 'Restante país, 48 h' });
    expect(deliveryFor(d.slice(0, 1), 'Porto', 60000)).toEqual({ kind: 'sem_entrega' });
  });
});
