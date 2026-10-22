// Prazos em dias corridos, contados no fuso de Lisboa. Um prazo de 8 dias a
// partir de uma notificação feita no dia D termina às 23:59:59 do dia D + 8.

export type IsoDate = `${number}-${number}-${number}`;

export function localDate(instant: Date, timeZone: string): IsoDate {
  // en-CA formata como AAAA-MM-DD.
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(instant) as IsoDate;
}

export function addDays(date: IsoDate, days: number): IsoDate {
  const [y, m, d] = date.split('-').map(Number) as [number, number, number];
  const utc = new Date(Date.UTC(y, m - 1, d + days));
  return utc.toISOString().slice(0, 10) as IsoDate;
}

/** Soma `months` meses a uma data de calendário. O único caso em que o dia não existe no mês de chegada, com uma
 * soma de meses inteiros, é 29 de fevereiro a cair num ano não bissexto: usa-se então o último dia de fevereiro
 * desse ano. `months` pode ser negativo (recua). */
export function addCalendarMonths(date: IsoDate, months: number): IsoDate {
  const [y, m, d] = date.split('-').map(Number) as [number, number, number];
  const totalMonths = (m - 1) + months;
  const targetYear = y + Math.floor(totalMonths / 12);
  const targetMonth = ((totalMonths % 12) + 12) % 12; // 0-based
  const lastDayOfTargetMonth = new Date(Date.UTC(targetYear, targetMonth + 1, 0)).getUTCDate();
  const day = Math.min(d, lastDayOfTargetMonth);
  return new Date(Date.UTC(targetYear, targetMonth, day)).toISOString().slice(0, 10) as IsoDate;
}

/** Último dia (inclusive) para cumprir um prazo iniciado em `start`. */
export function deadlineFrom(start: Date, days: number, timeZone: string): IsoDate {
  return addDays(localDate(start, timeZone), days);
}

export function isWithin(instant: Date, lastDay: IsoDate, timeZone: string): boolean {
  return localDate(instant, timeZone) <= lastDay;
}

/** "AAAA-MM-DDTHH:MM" lido como hora local de `timeZone` (ex.: um campo datetime-local) → instante. */
export function fromLocalDateTime(value: string, timeZone: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);
  if (!m) return null;
  const [y, mo, d, h, mi] = m.slice(1).map(Number) as [number, number, number, number, number];
  const guess = Date.UTC(y, mo - 1, d, h, mi);
  // Diferença entre o relógio local e UTC nesse momento (muda com a hora de verão).
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-GB', {
      timeZone,
      hourCycle: 'h23',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
      .formatToParts(new Date(guess))
      .map((p) => [p.type, p.value]),
  );
  const local = Date.UTC(+parts.year!, +parts.month! - 1, +parts.day!, +parts.hour!, +parts.minute!);
  return new Date(guess - (local - guess));
}
