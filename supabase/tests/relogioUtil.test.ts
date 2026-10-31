import type { PGlite } from '@electric-sql/pglite';
import { beforeAll, describe, expect, it } from 'vitest';
import { prazosDaReserva, somarDiasUteis, somarMinutosUteis } from '../../src/domain/horasUteis';
import { baseComMigracoes } from './baseEmMemoria';

// O relógio das horas úteis existe duas vezes: em plpgsql, porque a reserva é atómica na base de dados, e em
// TypeScript, porque a interface precisa de prever prazos antes de alguém aceitar. Duas implementações da
// mesma regra só valem se se provar que concordam — é o que este ficheiro faz, minuto a minuto.
//
// Se um dia divergirem, é aqui que se vê, e não num levantamento perdido por um prazo errado.

let db: PGlite;

beforeAll(async () => {
  db = await baseComMigracoes();
}, 60_000);

async function sqlMinutosUteis(desde: Date, minutos: number): Promise<Date> {
  const r = await db.query<{ t: Date }>('select private.somar_minutos_uteis($1, $2) as t', [
    desde.toISOString(),
    minutos,
  ]);
  return new Date(r.rows[0]!.t);
}

async function sqlDiasUteis(desde: Date, dias: number): Promise<Date> {
  const r = await db.query<{ t: Date }>('select private.somar_dias_uteis($1, $2) as t', [desde.toISOString(), dias]);
  return new Date(r.rows[0]!.t);
}

describe('o relógio útil na base de dados', () => {
  it('reproduz os três exemplos que o promotor fixou', async () => {
    // sexta 6/11/2026 17h30 → segunda 9/11 9h30 (novembro está em UTC+0)
    expect((await sqlMinutosUteis(new Date('2026-11-06T17:30:00Z'), 60)).toISOString()).toBe(
      '2026-11-09T09:30:00.000Z',
    );
    // sábado → segunda 10h00
    expect((await sqlMinutosUteis(new Date('2026-11-07T11:00:00Z'), 60)).toISOString()).toBe(
      '2026-11-09T10:00:00.000Z',
    );
    // dia útil 18h30 → 10h00 do dia útil seguinte
    expect((await sqlMinutosUteis(new Date('2026-11-10T18:30:00Z'), 60)).toISOString()).toBe(
      '2026-11-11T10:00:00.000Z',
    );
  });

  it('conhece o fuso de Lisboa, e não o de UTC', async () => {
    // 1 de julho, 17h30 UTC, é 18h30 em Lisboa (UTC+1): já fechou, logo passa para o dia seguinte às 10h00
    // de Lisboa, que são 9h00 UTC. Se a base não soubesse o fuso, devolveria 18h30 UTC do mesmo dia.
    expect((await sqlMinutosUteis(new Date('2026-07-01T17:30:00Z'), 60)).toISOString()).toBe(
      '2026-07-02T09:00:00.000Z',
    );
  });

  it('recusa somas negativas em vez de devolver uma data errada', async () => {
    await expect(sqlMinutosUteis(new Date('2026-11-10T10:00:00Z'), -1)).rejects.toThrow();
    await expect(sqlDiasUteis(new Date('2026-11-10T10:00:00Z'), -1)).rejects.toThrow();
  });
});

describe('as duas implementações concordam', () => {
  // Uma semana inteira de instantes de aceitação, de dez em dez minutos: 1 008 comparações de cada lado.
  // De dez em dez e não de um em um porque cada chamada atravessa a base; os casos de fronteira que os
  // minutos soltos apanhariam estão cobertos um a um em src/domain/horasUteis.test.ts.
  it('na primeira hora útil, ao longo de uma semana', async () => {
    const inicio = Date.UTC(2026, 10, 2, 0, 0); // segunda 2/11
    const divergencias: string[] = [];
    for (let m = 0; m < 7 * 24 * 60; m += 10) {
      const aceitacao = new Date(inicio + m * 60_000);
      const base = await sqlMinutosUteis(aceitacao, 60);
      const dominio = somarMinutosUteis(aceitacao, 60);
      if (base.getTime() !== dominio.getTime()) {
        divergencias.push(`${aceitacao.toISOString()}: base ${base.toISOString()} ≠ domínio ${dominio.toISOString()}`);
      }
    }
    expect(divergencias).toEqual([]);
  }, 120_000);

  it('nos sete dias úteis do teto de adiamento', async () => {
    const inicio = Date.UTC(2026, 10, 2, 9, 0);
    const divergencias: string[] = [];
    for (let h = 0; h < 7 * 24; h += 1) {
      const desde = new Date(inicio + h * 3_600_000);
      const base = await sqlDiasUteis(desde, 7);
      const dominio = somarDiasUteis(desde, 7);
      if (base.getTime() !== dominio.getTime()) {
        divergencias.push(`${desde.toISOString()}: base ${base.toISOString()} ≠ domínio ${dominio.toISOString()}`);
      }
    }
    expect(divergencias).toEqual([]);
  }, 120_000);

  it('atravessando as duas mudanças de hora de 2026, nos dois sentidos', async () => {
    const semanas = [
      Date.UTC(2026, 2, 23, 0, 0), // semana da entrada na hora de verão (29/03)
      Date.UTC(2026, 9, 19, 0, 0), // semana da saída (25/10)
    ];
    const divergencias: string[] = [];
    for (const inicio of semanas) {
      for (let m = 0; m < 9 * 24 * 60; m += 30) {
        const aceitacao = new Date(inicio + m * 60_000);
        const base = await sqlMinutosUteis(aceitacao, 60);
        const dominio = somarMinutosUteis(aceitacao, 60);
        if (base.getTime() !== dominio.getTime()) {
          divergencias.push(`${aceitacao.toISOString()}: base ${base.toISOString()} ≠ domínio ${dominio.toISOString()}`);
        }
        const baseDias = await sqlDiasUteis(aceitacao, 7);
        const dominioDias = somarDiasUteis(aceitacao, 7);
        if (baseDias.getTime() !== dominioDias.getTime()) {
          divergencias.push(
            `${aceitacao.toISOString()} (+7 dias úteis): base ${baseDias.toISOString()} ≠ domínio ${dominioDias.toISOString()}`,
          );
        }
      }
    }
    expect(divergencias).toEqual([]);
  }, 180_000);
});

describe('os três prazos, calculados dos dois lados', () => {
  it('a tabela da secção 5.5 do handoff sai igual da base e do domínio', async () => {
    const aceitacoes = [
      new Date('2026-11-06T17:30:00Z'),
      new Date('2026-11-07T11:00:00Z'),
      new Date('2026-11-10T18:30:00Z'),
      new Date('2026-11-10T10:00:00Z'),
    ];
    for (const a of aceitacoes) {
      const r = await db.query<{ prazo_contacto: Date; prazo_conclusao: Date; limite_adiamento: Date }>(
        'select * from private.prazos_da_reserva($1)',
        [a.toISOString()],
      );
      const base = r.rows[0]!;
      const dominio = prazosDaReserva(a);
      expect(new Date(base.prazo_contacto).toISOString()).toBe(dominio.contacto.toISOString());
      expect(new Date(base.prazo_conclusao).toISOString()).toBe(dominio.conclusao.toISOString());
      expect(new Date(base.limite_adiamento).toISOString()).toBe(dominio.limiteDeAdiamento.toISOString());
    }
  });
});
