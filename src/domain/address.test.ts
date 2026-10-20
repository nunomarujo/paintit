import { describe, expect, it } from 'vitest';
import { addressProblem, matchesStreet, normalizeStreet, streetPart } from './address';

const info = { cp: '4900-302', localidade: 'Viana do Castelo', concelho: 'Viana do Castelo', distrito: 'Viana do Castelo', ruas: ['Rua Alberto de Sousa'] };

describe('moradas', () => {
  it('normaliza abreviaturas e acentos', () => {
    expect(normalizeStreet('R. Alberto de Sousa')).toBe('rua alberto sousa');
    expect(normalizeStreet('Pç. da República')).toBe('praca republica');
    expect(streetPart('Rua Alberto de Sousa, 150, 2.º Esq.')).toBe('Rua Alberto de Sousa');
    expect(streetPart('Rua Alberto de Sousa nº 150')).toBe('Rua Alberto de Sousa');
  });
  it('aceita a rua certa e recusa ruas inventadas', () => {
    expect(matchesStreet('R. Alberto Sousa 80', info.ruas)).toBe('Rua Alberto de Sousa');
    expect(addressProblem('Rua Alberto de Sousa, 150', '4900-302', info)).toBeNull();
    expect(addressProblem('largo cidade da baía 45', '4900-302', info)).toMatch(/não corresponde/);
    expect(addressProblem('qualquer', '9999-999', null)).toMatch(/não existe/);
  });
});
