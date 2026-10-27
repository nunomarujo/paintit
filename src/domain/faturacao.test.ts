import { describe, expect, it } from 'vitest';
import { DIAS_UTEIS_PARA_EMITIR, diasUteis, estadoDaFatura, resumoDaFila, type FaturaPendente } from './faturacao';

describe('diasUteis', () => {
  it('não conta o próprio dia do facto', () => {
    expect(diasUteis('2026-11-02', '2026-11-02')).toBe(0); // segunda
  });

  it('conta de segunda a sexta', () => {
    expect(diasUteis('2026-11-02', '2026-11-06')).toBe(4);
  });

  it('salta o fim de semana', () => {
    // Sexta 6 → segunda 9 é um dia útil, não três.
    expect(diasUteis('2026-11-06', '2026-11-09')).toBe(1);
  });

  it('uma semana inteira dá cinco', () => {
    expect(diasUteis('2026-11-02', '2026-11-09')).toBe(5);
  });
});

describe('estadoDaFatura', () => {
  it('a tempo até ao quarto dia útil', () => {
    expect(estadoDaFatura('2026-11-02', '2026-11-06')).toBe('a_tempo');
  });

  it('ao quinto dia útil é o último dia', () => {
    expect(DIAS_UTEIS_PARA_EMITIR).toBe(5);
    expect(estadoDaFatura('2026-11-02', '2026-11-09')).toBe('ultimo_dia');
  });

  it('depois disso está fora de prazo', () => {
    expect(estadoDaFatura('2026-11-02', '2026-11-10')).toBe('fora_de_prazo');
  });
});

describe('resumoDaFila', () => {
  const p = (descricao: string, data: string, valorCents = 10_000): FaturaPendente => ({ descricao, data, valorCents });

  it('fila vazia não é urgente e não tem mais antiga', () => {
    expect(resumoDaFila([], '2026-11-10')).toEqual({
      total: 0,
      valorCents: 0,
      foraDePrazo: 0,
      ultimoDia: 0,
      maisAntiga: null,
      urgente: false,
    });
  });

  it('soma, conta os estados e aponta a mais antiga', () => {
    const r = resumoDaFila([p('Comissão A', '2026-11-02', 23_173), p('Subscrição B', '2026-11-09', 3_000)], '2026-11-10');
    expect(r.total).toBe(2);
    expect(r.valorCents).toBe(26_173);
    expect(r.foraDePrazo).toBe(1);
    expect(r.maisAntiga).toMatchObject({ descricao: 'Comissão A', data: '2026-11-02' });
    expect(r.urgente).toBe(true);
  });

  it('tudo dentro do prazo não interrompe ninguém', () => {
    expect(resumoDaFila([p('Comissão A', '2026-11-09')], '2026-11-10').urgente).toBe(false);
  });
});
