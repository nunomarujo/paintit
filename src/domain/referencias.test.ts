import { describe, expect, it } from 'vitest';
import { referenciaDoLevantamento } from './referencias';

describe('referenciaDoLevantamento', () => {
  it('monta a forma que se lê e se diz', () => {
    expect(referenciaDoLevantamento(1042)).toBe('QP-1042');
  });
  it('não enfeita números grandes com separadores de milhares', () => {
    expect(referenciaDoLevantamento(100000)).toBe('QP-100000');
  });
});
