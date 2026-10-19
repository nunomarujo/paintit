import { describe, expect, it } from 'vitest';
import { addDays, deadlineFrom, fromLocalDateTime, isWithin, localDate } from './deadline';

const tz = 'Europe/Lisbon';

describe('prazos em dias corridos (Lisboa)', () => {
  it('termina no fim do 8.º dia após a notificação', () => {
    const notified = new Date('2026-10-20T10:00:00Z');
    expect(deadlineFrom(notified, 8, tz)).toBe('2026-10-28');
  });

  it('aceita até às 23:59 de Lisboa e rejeita depois', () => {
    // Em 28/10/2026 Lisboa está em UTC+0 (a hora de verão acabou a 25/10).
    expect(isWithin(new Date('2026-10-28T23:59:00Z'), '2026-10-28', tz)).toBe(true);
    expect(isWithin(new Date('2026-10-29T00:00:30Z'), '2026-10-28', tz)).toBe(false);
  });

  it('usa a data de Lisboa, não a de UTC, em horário de verão', () => {
    // 23:30 UTC de 1 de julho já é 2 de julho em Lisboa (UTC+1).
    expect(localDate(new Date('2026-07-01T23:30:00Z'), tz)).toBe('2026-07-02');
  });

  it('atravessa mudanças de mês e de hora', () => {
    expect(addDays('2026-03-28', 8)).toBe('2026-04-05');
    expect(addDays('2026-12-28', 8)).toBe('2027-01-05');
  });
});

describe('hora local de Lisboa', () => {
  it('converte com a hora de verão e de inverno', () => {
    expect(fromLocalDateTime('2026-07-01T10:00', 'Europe/Lisbon')?.toISOString()).toBe('2026-07-01T09:00:00.000Z');
    expect(fromLocalDateTime('2026-12-01T10:00', 'Europe/Lisbon')?.toISOString()).toBe('2026-12-01T10:00:00.000Z');
    expect(fromLocalDateTime('ontem', 'Europe/Lisbon')).toBeNull();
  });
});
