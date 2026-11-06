import { describe, expect, it } from 'vitest';
import { planoVigente } from './subscription';

describe('planoVigente', () => {
  it('um plano ativo sem fim vale sempre', () => expect(planoVigente({ plan: 'catalogo', status: 'ativa', valida_ate: null }, '2030-01-01')).toBe('catalogo'));
  it('com fim, vale até ao último dia, inclusive', () => {
    const s = { plan: 'catalogo', status: 'ativa', valida_ate: '2027-01-31' } as const;
    expect(planoVigente(s, '2027-01-31')).toBe('catalogo');
    expect(planoVigente(s, '2027-02-01')).toBeNull();
  });
  it('suspenso, cancelado ou inexistente não vale', () => {
    expect(planoVigente({ plan: 'catalogo', status: 'suspensa', valida_ate: null }, '2026-11-06')).toBeNull();
    expect(planoVigente(null, '2026-11-06')).toBeNull();
  });
});
