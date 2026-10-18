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

/** Último dia (inclusive) para cumprir um prazo iniciado em `start`. */
export function deadlineFrom(start: Date, days: number, timeZone: string): IsoDate {
  return addDays(localDate(start, timeZone), days);
}

export function isWithin(instant: Date, lastDay: IsoDate, timeZone: string): boolean {
  return localDate(instant, timeZone) <= lastDay;
}
