import { describe, expect, it } from 'vitest';
import { EQUIVALENT_PROPOSAL_NOTE, EQUIVALENT_RULE, EQUIVALENT_TOLERANCE_BPS, hasEquivalent } from './equivalence';
import { describeItem, parseWorkItems, type WorkItem } from './works';

const item = (campos: Record<string, string>): WorkItem => ({ key: 'primario', code: 'primario', estado: 'base', zonas: 'todas', campos, quantidade: '100', notas: '' });

describe('produto ou equivalente', () => {
  it('a descrição assinala-o e guarda-se na leitura', () => {
    expect(hasEquivalent(describeItem(item({ produto: 'Marca X Primário', 'produto~eq': 'sim' }), []))).toBe(true);
    expect(hasEquivalent(describeItem(item({ produto: 'Marca X Primário' }), []))).toBe(false);
    const parsed = parseWorkItems([{ ...item({ produto: 'Marca X', 'produto~eq': 'sim', 'outro~eq': 'sim' }) }], []);
    expect(parsed.items?.[0]?.campos['produto~eq']).toBe('sim');
    expect(parsed.items?.[0]?.campos['outro~eq']).toBeUndefined();
  });

  it('sem produto, a marca não conta', () => {
    expect(parseWorkItems([item({ 'produto~eq': 'sim' })], []).items?.[0]?.campos['produto~eq']).toBeUndefined();
  });

  it('os termos falam de 10% e de características, sem pôr o preço como critério único', () => {
    expect(EQUIVALENT_TOLERANCE_BPS).toBe(1000);
    expect(EQUIVALENT_RULE).toMatch(/10%/);
    expect(EQUIVALENT_RULE).toMatch(/características técnicas/);
    expect(EQUIVALENT_PROPOSAL_NOTE).toMatch(/cor/);
  });
});
