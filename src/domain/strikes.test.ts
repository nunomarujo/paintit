import { describe, expect, it } from 'vitest';
import { MAX_STRIKES, strikeLevel } from './strikes';

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
