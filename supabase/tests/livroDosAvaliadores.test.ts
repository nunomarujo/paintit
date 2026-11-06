import type { PGlite } from '@electric-sql/pglite';
import { beforeAll, describe, expect, it } from 'vitest';
import { ACCOUNT_LIST } from '../../src/domain/accounting/accounts';
import { planPostings } from '../../src/domain/accounting/plan';
import { baseComMigracoes } from './baseEmMemoria';

// O livro de movimentos conhece os resgates dos avaliadores (06/11/2026): as contas existem na base e os lançamentos que o plano gera
// para um resgate pago gravam-se por acc_post, fecham a zero e não se duplicam.

let db: PGlite;
beforeAll(async () => {
  db = await baseComMigracoes();
});

const post = (p: { data: string; descricao: string; origem: string; origemId: string; lines: unknown[] }) =>
  db.query('select public.acc_post($1::date, $2, $3, $4, $5::jsonb)', [p.data, p.descricao, p.origem, p.origemId, JSON.stringify(p.lines)]);

describe('livro de movimentos: avaliadores', () => {
  it('todas as contas do código existem na base, com a mesma natureza', async () => {
    const { rows } = await db.query<{ codigo: string; natureza: string }>('select codigo, natureza from public.acc_accounts');
    const na = new Map(rows.map((r) => [r.codigo, r.natureza]));
    for (const a of ACCOUNT_LIST) expect(na.get(a.codigo), a.codigo).toBe(a.natureza);
  });

  it('um resgate pago grava-se uma só vez e a conta 22.3 fecha a zero', async () => {
    const plan = planPostings({
      payments: [],
      retentions: [],
      payouts: [],
      redemptions: [],
      subscriptions: [],
      stripeFees: [],
      stripePayouts: [],
      surveyPayouts: [{ id: 'sp1', amountCents: 10_000, estado: 'paga', feeRecebidoEm: '2026-10-20T11:00:00Z' }],
      surveyRedemptions: [
        {
          id: 'sr1',
          estado: 'paga',
          comissaoCents: 10_000,
          ivaCents: 2_300,
          retencaoCents: 2_500,
          liquidoCents: 9_800,
          invoiceEm: '2026-10-21T08:00:00Z',
          pagaEm: '2026-10-21T09:00:00Z',
        },
      ],
      posted: new Set(),
      today: '2026-10-22',
      day: (iso) => iso.slice(0, 10),
    });
    expect(plan).toHaveLength(3);
    for (const p of plan) await post(p);
    for (const p of plan) await post(p); // segunda corrida: o par (origem, origem_id) já existe
    const n = await db.query<{ n: string }>(`select count(*) n from public.acc_entries where origem like 'levantamento%'`);
    expect(Number(n.rows[0]!.n)).toBe(3);
    const { rows } = await db.query<{ conta: string; d: string; c: string }>(
      `select conta, sum(debito_cents) d, sum(credito_cents) c from public.acc_lines l join public.acc_entries e on e.id = l.entry_id where e.origem like 'levantamento%' group by conta`,
    );
    const by = new Map(rows.map((r) => [r.conta, Number(r.c) - Number(r.d)]));
    expect(by.get('22.3')).toBe(0);
    expect(by.get('24.2')).toBe(2_500);
    expect(by.get('12.1')).toBe(9_800);
    expect(by.get('62.2.3')).toBe(-10_000);
    expect(by.get('24.32')).toBe(-2_300);
  });
});
