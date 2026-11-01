import { describe, expect, it } from 'vitest';
import { HORARIO_UTIL, contagemDoContacto, contagemDoPrazo, horaExata, minutosUteisAte, quandoCurto } from './contagem';

// Novembro de 2026 está em UTC+0, por isso as horas UTC abaixo são as horas de Lisboa.
const em = (dia: number, hora: number, minuto = 0) => new Date(Date.UTC(2026, 10, dia, hora, minuto));

describe('o prazo de contacto, em minutos úteis', () => {
  it('conta só os minutos de atendimento', () => {
    // Terça às 9h25, prazo às 10h00: 35 minutos, todos dentro do horário.
    expect(contagemDoContacto(em(10, 9, 25), em(10, 10)).texto).toBe('faltam 35 minutos úteis');
  });

  it('salta a noite: 17h50 de terça para 9h10 de quarta são 20 minutos úteis', () => {
    expect(contagemDoContacto(em(10, 17, 50), em(11, 9, 10)).texto).toBe('faltam 20 minutos úteis');
  });

  it('salta o fim de semana: sexta 17h50 para segunda 9h10 são 20 minutos úteis', () => {
    expect(contagemDoContacto(em(6, 17, 50), em(9, 9, 10)).texto).toBe('faltam 20 minutos úteis');
  });

  it('não arredonda para cima', () => {
    expect(contagemDoContacto(em(10, 9), em(10, 9, 59)).texto).toBe('faltam 59 minutos úteis');
  });

  it('a concordância está certa no singular e no plural', () => {
    expect(contagemDoContacto(em(10, 9, 59), em(10, 10)).texto).toBe('falta 1 minuto útil');
    expect(contagemDoContacto(em(10, 9, 58), em(10, 10)).texto).toBe('faltam 2 minutos úteis');
    expect(contagemDoContacto(em(10, 9), em(10, 10)).texto).toBe('falta 1 hora útil');
    expect(contagemDoContacto(em(10, 9), em(10, 11)).texto).toBe('faltam 2 horas úteis');
    expect(contagemDoPrazo(em(10, 10), em(10, 10, 1)).texto).toBe('falta 1 minuto');
  });

  it('passada a hora, diz que passou, e não zero', () => {
    const c = contagemDoContacto(em(10, 10), em(10, 9));
    expect(c).toEqual({ vencido: true, texto: 'o prazo passou' });
  });

  it('fora de horas, o tempo não corre', () => {
    // De sábado para segunda às 9h30: só os 30 minutos de segunda contam.
    expect(minutosUteisAte(em(7, 11), em(9, 9, 30))).toBe(30);
  });
});

describe('o prazo de conclusão, em tempo de calendário', () => {
  it('diz horas e minutos quando falta menos de dois dias', () => {
    expect(contagemDoPrazo(em(10, 10), em(12, 9, 20)).texto).toBe('faltam 47h 20m');
  });

  it('passa a dias quando são dois ou mais', () => {
    expect(contagemDoPrazo(em(10, 10), em(12, 13)).texto).toBe('faltam 2 dias e 3h');
    expect(contagemDoPrazo(em(10, 10), em(12, 10)).texto).toBe('faltam 2 dias');
  });

  it('conta o fim de semana, ao contrário do prazo de contacto', () => {
    expect(contagemDoPrazo(em(6, 10), em(8, 10)).texto).toBe('faltam 2 dias');
  });

  it('abaixo de uma hora, diz minutos', () => {
    expect(contagemDoPrazo(em(10, 10), em(10, 10, 40)).texto).toBe('faltam 40 minutos');
  });

  it('o minuto de vencimento já conta como passado', () => {
    expect(contagemDoPrazo(em(10, 10), em(10, 10)).vencido).toBe(true);
  });
});

describe('a hora exata, que acompanha sempre a contagem', () => {
  it('escreve o dia da semana e a hora', () => {
    expect(horaExata(em(9, 9, 30))).toBe('segunda-feira, 09/11, 09h30');
  });

  it('usa a hora de Lisboa e não a de UTC', () => {
    // 1 de julho, 23h30 UTC, é já 2 de julho em Lisboa (UTC+1).
    expect(horaExata(new Date('2026-07-01T23:30:00Z'))).toBe('quinta-feira, 02/07, 00h30');
  });
});

describe('o horário de atendimento em palavras', () => {
  it('diz as horas que a regra fixou', () => {
    expect(HORARIO_UTIL).toBe('das 9h às 18h, de segunda a sexta');
  });
});

describe('quandoCurto', () => {
  const em = (iso: string) => new Date(iso);
  it('diz Hoje pela data civil, não por 24 horas', () => {
    expect(quandoCurto(em('2026-11-02T22:00:00Z'), em('2026-11-02T23:30:00Z')).dia).toBe('Hoje');
    expect(quandoCurto(em('2026-11-02T22:00:00Z'), em('2026-11-03T00:30:00Z')).dia).toBe('Amanhã');
  });
  it('usa o dia da semana dentro da semana e a data depois', () => {
    expect(quandoCurto(em('2026-11-02T09:00:00Z'), em('2026-11-04T09:00:00Z')).dia).toBe('quarta-feira');
    expect(quandoCurto(em('2026-11-02T09:00:00Z'), em('2026-11-20T09:00:00Z')).dia).toBe('20/11');
  });
  it('dá a hora no relógio de Lisboa', () => {
    expect(quandoCurto(em('2026-11-02T09:00:00Z'), em('2026-11-02T10:25:00Z')).hora).toBe('10h25');
  });
});
