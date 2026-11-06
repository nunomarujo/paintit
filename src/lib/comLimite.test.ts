import { describe, expect, it, vi } from 'vitest';
import { comLimite } from './comLimite';

describe('comLimite', () => {
  it('devolve a resposta quando chega a tempo', async () => {
    await expect(comLimite(Promise.resolve(42), 1000)).resolves.toEqual({ tipo: 'ok', valor: 42 });
  });
  it('desiste ao fim do prazo, sem esperar pela resposta', async () => {
    vi.useFakeTimers();
    const nunca = new Promise<number>(() => {});
    const r = comLimite(nunca, 5000);
    await vi.advanceTimersByTimeAsync(5000);
    await expect(r).resolves.toEqual({ tipo: 'esgotado' });
    vi.useRealTimers();
  });
  it('uma falha dentro do prazo continua a ser falha', async () => {
    await expect(comLimite(Promise.reject(new Error('rede')), 1000)).rejects.toThrow('rede');
  });
});
