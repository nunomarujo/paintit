import { beforeEach, describe, expect, it, vi } from 'vitest';

// O lado do prédio de uma zona grava-se à parte (a coluna `face_do_predio` pode não estar aplicada). Quando não grava, a zona
// fica gravada e quem a gravou tem de o saber: `updateSurface` já o dizia; `addSurface` ignorava o resultado (revisão, 06/11/2026).

const estado = { erroDoLado: false, zonaAntes: { origem_quantidade: null } as unknown };

vi.mock('next/server', () => ({ after: vi.fn() }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('next/navigation', () => ({ redirect: vi.fn() }));
vi.mock('@/lib/notify', () => ({ notifyNewRequest: vi.fn() }));
vi.mock('@/lib/access', () => ({ isPlatformAdmin: vi.fn() }));
vi.mock('@/lib/strikes', () => ({ guardContact: vi.fn(async () => null) }));
vi.mock('@/lib/supabase/server', () => ({
  getUser: async () => ({
    user: { id: 'u1' },
    supabase: {
      from: () => ({
        // Acrescentar: insert(...).select('id'). Alterar: select(...).eq().eq().maybeSingle() e update(...).eq().eq().
        insert: () => ({ select: async () => ({ data: [{ id: 'z-nova' }], error: null }) }),
        select: () => ({
          eq: () => ({
            eq: () => ({
              maybeSingle: async () => ({ data: estado.zonaAntes, error: null }),
              single: async () => ({ data: estado.zonaAntes, error: null }),
            }),
            maybeSingle: async () => ({ data: estado.zonaAntes, error: null }),
            single: async () => ({ data: estado.zonaAntes, error: null }),
          }),
        }),
        update: (v: Record<string, unknown>) => ({
          eq: () => ({
            eq: async () => ({
              error: 'face_do_predio' in v && estado.erroDoLado ? { message: 'column face_do_predio does not exist' } : null,
            }),
          }),
        }),
      }),
    },
  }),
}));

const { addSurface, updateSurface } = await import('./actions');

const formulario = (extra: Record<string, string> = {}) => {
  const f = new FormData();
  f.set('kind', 'fachada');
  f.set('comoMedir', 'area');
  f.set('area', '120');
  for (const [k, v] of Object.entries(extra)) f.set(k, v);
  return f;
};

describe('o lado do prédio de uma zona que a base ainda não guarda', () => {
  beforeEach(() => {
    estado.erroDoLado = false;
  });

  it('acrescentar uma zona com lado: gravou o lado, sem aviso', async () => {
    const r = await addSurface('r1', { errors: {} }, formulario({ face: 'direita' }));
    expect(r.ok).toBe(true);
    expect(r.lerAntesDeFechar).toBeUndefined();
    expect(r.message).toBeUndefined();
  });

  it('acrescentar uma zona sem o campo do lado: nada a avisar', async () => {
    estado.erroDoLado = true;
    const r = await addSurface('r1', { errors: {} }, formulario());
    expect(r).toEqual({ errors: {}, ok: true });
  });

  it('acrescentar uma zona cujo lado não se grava: a zona fica, e diz-se que o lado se perdeu', async () => {
    estado.erroDoLado = true;
    const r = await addSurface('r1', { errors: {} }, formulario({ face: 'direita' }));
    expect(r.ok).toBe(true);
    expect(r.lerAntesDeFechar).toBe(true);
    expect(r.message).toMatch(/lado do prédio ainda não se guarda/);
  });

  it('alterar uma zona diz o mesmo, com a mesma frase', async () => {
    estado.erroDoLado = true;
    const r = await updateSurface('r1', 'z1', { errors: {} }, formulario({ face: 'esquerda' }));
    expect(r.ok).toBe(true);
    expect(r.lerAntesDeFechar).toBe(true);
    expect(r.message).toMatch(/lado do prédio ainda não se guarda/);
  });
});
