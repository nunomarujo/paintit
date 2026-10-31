import { describe, expect, it } from 'vitest';
import {
  ABERTURA_MIN,
  adiamentoAceitavel,
  dentroDoHorarioUtil,
  prazosDaReserva,
  somarDiasUteis,
  somarMinutosUteis,
} from './horasUteis';

const FUSO = 'Europe/Lisbon';

const DIAS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'] as const;

/** "sex 06/11 17:30" — como se lê em Lisboa, para as expectativas ficarem legíveis. Montado à mão a partir
 * das partes, para não depender de como cada locale abrevia os dias da semana. */
function lisboa(instante: Date): string {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat('en-GB', {
      timeZone: FUSO,
      weekday: 'short',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    })
      .formatToParts(instante)
      .map((x) => [x.type, x.value]),
  );
  const diaDaSemana = DIAS[new Date(`${p.year}-${p.month}-${p.day}T12:00:00Z`).getUTCDay()];
  return `${diaDaSemana} ${p.day}/${p.month} ${p.hour}:${p.minute}`;
}

/** Um instante dado em hora de Lisboa. Novembro de 2026 está em UTC+0. */
function emNovembro(dia: number, hora: number, minuto = 0): Date {
  return new Date(Date.UTC(2026, 10, dia, hora, minuto));
}

describe('a primeira hora útil', () => {
  // Os três casos que o promotor fixou, palavra por palavra.
  it('sexta às 17h30 → segunda às 9h30', () => {
    expect(lisboa(somarMinutosUteis(emNovembro(6, 17, 30), 60))).toBe('seg 09/11 09:30');
  });

  it('sábado → segunda às 10h00', () => {
    expect(lisboa(somarMinutosUteis(emNovembro(7, 11), 60))).toBe('seg 09/11 10:00');
  });

  it('dia útil às 18h30 → 10h00 do dia útil seguinte', () => {
    expect(lisboa(somarMinutosUteis(emNovembro(10, 18, 30), 60))).toBe('qua 11/11 10:00');
  });

  it('dentro do horário, é uma hora a seguir', () => {
    expect(lisboa(somarMinutosUteis(emNovembro(10, 10), 60))).toBe('ter 10/11 11:00');
  });

  it('antes da abertura, conta das 9h00', () => {
    expect(lisboa(somarMinutosUteis(emNovembro(10, 6, 15), 60))).toBe('ter 10/11 10:00');
  });

  it('às 17h59 sobra um minuto do dia, e o resto passa para amanhã', () => {
    expect(lisboa(somarMinutosUteis(emNovembro(10, 17, 59), 60))).toBe('qua 11/11 09:59');
  });

  it('domingo de madrugada → segunda às 10h00', () => {
    expect(lisboa(somarMinutosUteis(emNovembro(8, 3), 60))).toBe('seg 09/11 10:00');
  });
});

describe('os três prazos da reserva', () => {
  // A tabela da secção 5.5 do handoff, linha a linha.
  const casos: ReadonlyArray<readonly [string, Date, string, string, string]> = [
    ['sexta 6/11 17h30', emNovembro(6, 17, 30), 'seg 09/11 09:30', 'qua 11/11 09:30', 'qua 18/11 09:30'],
    ['sábado 7/11 11h00', emNovembro(7, 11), 'seg 09/11 10:00', 'qua 11/11 10:00', 'qua 18/11 10:00'],
    ['terça 10/11 18h30', emNovembro(10, 18, 30), 'qua 11/11 10:00', 'sex 13/11 10:00', 'sex 20/11 10:00'],
    ['terça 10/11 10h00', emNovembro(10, 10), 'ter 10/11 11:00', 'qui 12/11 11:00', 'qui 19/11 11:00'],
  ];

  it.each(casos)('%s', (_rotulo, aceitacao, contacto, conclusao, adiamento) => {
    const p = prazosDaReserva(aceitacao);
    expect(lisboa(p.contacto)).toBe(contacto);
    expect(lisboa(p.conclusao)).toBe(conclusao);
    expect(lisboa(p.limiteDeAdiamento)).toBe(adiamento);
  });

  it('a conclusão são 48 horas de calendário exatas desde o contacto', () => {
    const p = prazosDaReserva(emNovembro(6, 17, 30));
    expect(p.conclusao.getTime() - p.contacto.getTime()).toBe(48 * 3_600_000);
  });

  it('não depende da confirmação do cliente: a mesma aceitação dá sempre os mesmos prazos', () => {
    const a = prazosDaReserva(emNovembro(10, 10));
    const b = prazosDaReserva(emNovembro(10, 10));
    expect(b).toEqual(a);
  });
});

describe('a propriedade que nenhum exemplo garante', () => {
  // Para qualquer instante de aceitação de uma semana inteira, minuto a minuto, nenhum prazo posterior pode
  // vencer antes de um anterior. Com a contagem escolhida isto é verdade por construção; o teste existe para
  // apanhar quem a troque mais tarde.
  it('contacto ≤ conclusão ≤ limite de adiamento, em 10 080 instantes', () => {
    const inicio = Date.UTC(2026, 10, 2, 0, 0); // segunda 2/11, 00h00
    const falhas: string[] = [];
    for (let minuto = 0; minuto < 7 * 24 * 60; minuto += 1) {
      const aceitacao = new Date(inicio + minuto * 60_000);
      const p = prazosDaReserva(aceitacao);
      if (!(p.contacto <= p.conclusao && p.conclusao <= p.limiteDeAdiamento)) {
        falhas.push(lisboa(aceitacao));
      }
    }
    expect(falhas).toEqual([]);
  });

  it('o prazo de contacto cai sempre dentro do horário útil ou exatamente às 18h00', () => {
    const inicio = Date.UTC(2026, 10, 2, 0, 0);
    const foraDeHoras: string[] = [];
    for (let minuto = 0; minuto < 7 * 24 * 60; minuto += 1) {
      const contacto = prazosDaReserva(new Date(inicio + minuto * 60_000)).contacto;
      const horas = Number(
        new Intl.DateTimeFormat('en-GB', { timeZone: FUSO, hourCycle: 'h23', hour: '2-digit' }).format(contacto),
      );
      const ehFimDoDia = horas === 18;
      if (!dentroDoHorarioUtil(contacto) && !ehFimDoDia) foraDeHoras.push(lisboa(contacto));
    }
    expect(foraDeHoras).toEqual([]);
  });
});

describe('as mudanças de hora', () => {
  // Em 2026 a hora de verão começa a 29 de março e acaba a 25 de outubro, ambos domingos.
  it('o relógio útil salta o fim de semana da mudança de março sem perder minutos', () => {
    // Sexta, 27/03/2026, 17h30 em Lisboa (ainda UTC+0) → segunda, 30/03, 9h30 (já UTC+1).
    const aceitacao = new Date(Date.UTC(2026, 2, 27, 17, 30));
    expect(lisboa(somarMinutosUteis(aceitacao, 60))).toBe('seg 30/03 09:30');
  });

  it('o relógio útil salta o fim de semana da mudança de outubro', () => {
    // Sexta, 23/10/2026, 17h30 em Lisboa (UTC+1) → segunda, 26/10, 9h30 (UTC+0).
    const aceitacao = new Date(Date.UTC(2026, 9, 23, 16, 30));
    expect(lisboa(somarMinutosUteis(aceitacao, 60))).toBe('seg 26/10 09:30');
  });

  it('as 48 horas são tempo decorrido, por isso a hora apresentada desloca-se na mudança', () => {
    // Contacto devido sexta, 23/10, às 17h00 de Lisboa (UTC+1). Mais 48 horas reais caem domingo às 17h00 UTC,
    // que já é 17h00 de Lisboa em UTC+0 — uma hora «a menos» no relógio de parede, porque o dia de domingo
    // teve 25 horas. É deliberado: o avaliador teve 48 horas de facto.
    const p = prazosDaReserva(new Date(Date.UTC(2026, 9, 23, 15, 0)));
    expect(lisboa(p.contacto)).toBe('sex 23/10 17:00');
    expect(p.conclusao.getTime() - p.contacto.getTime()).toBe(48 * 3_600_000);
    expect(lisboa(p.conclusao)).toBe('dom 25/10 16:00');
  });

  it('o limite do adiamento mantém a hora de parede ao atravessar a mudança', () => {
    // Contacto sexta, 23/10, 17h00 (UTC+1). Sete dias úteis depois é terça, 3/11, e a hora tem de ser 17h00.
    const p = prazosDaReserva(new Date(Date.UTC(2026, 9, 23, 15, 0)));
    expect(lisboa(p.limiteDeAdiamento)).toBe('ter 03/11 17:00');
  });
});

describe('o adiamento pedido pelo cliente', () => {
  const prazos = prazosDaReserva(emNovembro(6, 17, 30)); // teto: quarta 18/11 09:30

  it('aceita uma data dentro do teto', () => {
    expect(adiamentoAceitavel(emNovembro(17, 15), prazos)).toBe(true);
  });

  it('aceita o próprio minuto do teto', () => {
    expect(adiamentoAceitavel(prazos.limiteDeAdiamento, prazos)).toBe(true);
  });

  it('recusa um minuto depois do teto', () => {
    expect(adiamentoAceitavel(new Date(prazos.limiteDeAdiamento.getTime() + 60_000), prazos)).toBe(false);
  });

  it('recusa a quinta-feira seguinte', () => {
    expect(adiamentoAceitavel(emNovembro(19, 9, 30), prazos)).toBe(false);
  });
});

describe('os blocos de construção', () => {
  it('somarDiasUteis salta sábados e domingos e mantém a hora', () => {
    expect(lisboa(somarDiasUteis(emNovembro(6, 14, 15), 1))).toBe('seg 09/11 14:15');
    expect(lisboa(somarDiasUteis(emNovembro(6, 14, 15), 5))).toBe('sex 13/11 14:15');
  });

  it('somar zero não mexe em nada', () => {
    const d = emNovembro(10, 10);
    expect(somarDiasUteis(d, 0).getTime()).toBe(d.getTime());
  });

  it('dentroDoHorarioUtil fecha às 18h00 e não abre ao fim de semana', () => {
    expect(dentroDoHorarioUtil(emNovembro(10, 9))).toBe(true);
    expect(dentroDoHorarioUtil(emNovembro(10, 17, 59))).toBe(true);
    expect(dentroDoHorarioUtil(emNovembro(10, 18))).toBe(false);
    expect(dentroDoHorarioUtil(emNovembro(10, 8, 59))).toBe(false);
    expect(dentroDoHorarioUtil(emNovembro(7, 11))).toBe(false);
    expect(dentroDoHorarioUtil(emNovembro(8, 11))).toBe(false);
  });

  it('a abertura é às 9h00', () => {
    expect(ABERTURA_MIN).toBe(540);
  });

  it('recusa somas negativas em vez de devolver uma data errada', () => {
    expect(() => somarMinutosUteis(emNovembro(10, 10), -1)).toThrow(RangeError);
    expect(() => somarDiasUteis(emNovembro(10, 10), 1.5)).toThrow(RangeError);
  });
});
