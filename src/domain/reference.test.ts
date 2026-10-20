import { describe, expect, it } from 'vitest';
import { adherence, parsePreferences, pricePerLitre, preferencesFromForm } from './reference';

const A = '11111111-1111-4111-8111-111111111111';
const B = '22222222-2222-4222-8222-222222222222';

describe('produtos pedidos no pedido de obra', () => {
  it('lê preferências', () => {
    const f = new FormData();
    f.append('preferido', A);
    f.append('preferido', 'lixo');
    f.append('fixo', A);
    expect(preferencesFromForm(f)).toEqual([{ id: A, fixo: true }]);
    expect(parsePreferences([{ id: B }])).toEqual([{ id: B, fixo: false }]);
  });
  it('segue, substitui (mais caro/barato) ou não diz', () => {
    const refs = new Map([
      [A, { tipo: 'tinta_exterior' as const, perLitre: pricePerLitre({ preco: 6000, litros: 15 }) }],
      [B, { tipo: 'primario' as const, perLitre: null }],
    ]);
    const r = adherence(
      [{ id: A, fixo: false }, { id: B, fixo: true }],
      refs,
      [{ referenceId: null, tipo: 'tinta_exterior', label: 'Outra marca', perLitre: 500 }],
    );
    expect(r[0]!.result).toEqual({ kind: 'substitui', por: 'Outra marca', diffPct: 25 });
    expect(r[1]!.result).toEqual({ kind: 'sem_indicacao' });
    expect(adherence([{ id: A, fixo: false }], refs, [{ referenceId: A, tipo: 'tinta_exterior', label: 'x', perLitre: null }])[0]!.result).toEqual({ kind: 'segue' });
  });
});
