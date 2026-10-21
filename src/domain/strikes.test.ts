import { describe, expect, it } from 'vitest';
import { MAX_STRIKES, appealEligibility, strikeLevel } from './strikes';

describe('avisos por contactos', () => {
  it('1.ª tentativa avisa, 2.ª é o último aviso, 3.ª bloqueia', () => {
    expect(strikeLevel(1).level).toBe('aviso');
    expect(strikeLevel(2).level).toBe('ultimo');
    expect(strikeLevel(3).level).toBe('bloqueada');
    expect(strikeLevel(7).level).toBe('bloqueada');
    expect(MAX_STRIKES).toBe(3);
  });
  it('o último aviso diz que a próxima tentativa bloqueia', () => {
    expect(strikeLevel(2).texto).toMatch(/bloqueada/);
    expect(strikeLevel(1).texto).not.toMatch(/bloqueada de forma permanente/);
  });
});

describe('pedido de revisão', () => {
  const ok = { activeStrikes: 2, blocked: false, appealedSecond: false };
  it('só no segundo aviso, uma vez, e nunca depois do bloqueio', () => {
    expect(appealEligibility(ok).allowed).toBe(true);
    expect(appealEligibility({ ...ok, activeStrikes: 1 }).allowed).toBe(false);
    expect(appealEligibility({ ...ok, activeStrikes: 3 }).allowed).toBe(false);
    expect(appealEligibility({ ...ok, blocked: true }).allowed).toBe(false);
    expect(appealEligibility({ ...ok, appealedSecond: true }).allowed).toBe(false);
  });
  it('o último aviso diz que se pode pedir revisão', () => {
    expect(strikeLevel(2).texto).toMatch(/pedir uma revisão/);
    expect(strikeLevel(3).texto).not.toMatch(/revisão/);
  });
});
