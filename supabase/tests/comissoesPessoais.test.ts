import type { PGlite } from '@electric-sql/pglite';
import { beforeAll, describe, expect, it } from 'vitest';
import { baseComMigracoes } from './baseEmMemoria';

// A comissão do avaliador é da pessoa (05/11/2026): só ela a vê, só ela a resgata, com o seu recibo; a empresa
// onde trabalha não vê nem resgata nada. A equipa valida os dados de pagamento e vê tudo.

let db: PGlite;

const DONO = '00000000-0000-4000-8000-00000000d001'; // responsável da empresa
const AV = '00000000-0000-4000-8000-00000000d002'; // avaliador
const OUTRO = '00000000-0000-4000-8000-00000000d003'; // outro avaliador da mesma empresa
const EQUIPA = '00000000-0000-4000-8000-00000000d004';

async function as<T>(user: string, fn: () => Promise<T>): Promise<T> {
  await db.exec('set role authenticated');
  await db.query(`select set_config('request.jwt.claim.sub', $1, false)`, [user]);
  await db.query(`select set_config('request.jwt.claims', $1, false)`, [JSON.stringify({ sub: user })]);
  try {
    return await fn();
  } finally {
    await db.exec('reset role');
  }
}
const one = async <T>(sql: string, params: unknown[] = []) => (await db.query<T>(sql, params)).rows[0]!;

let org: string;

/** Um pagamento de levantamento já ganho por `pessoa` — sem montar a obra inteira: as chaves estrangeiras
 * desligam-se só para inserir a linha de ensaio. */
async function pagamento(pessoa: string, cents: number): Promise<string> {
  await db.exec(`set session_replication_role = replica`);
  try {
    return (
      await one<{ id: string }>(
        `insert into public.survey_payouts (request_survey_id, supplier_org_id, engagement_id, amount_cents, fee_recebido_em, vendedor_user_id)
         values (gen_random_uuid(), $1, gen_random_uuid(), $2, now(), $3) returning id`,
        [org, cents, pessoa],
      )
    ).id;
  } finally {
    await db.exec(`set session_replication_role = origin`);
  }
}

const dados = (user: string) =>
  as(user, () =>
    db.query(
      `insert into public.avaliador_payout_details (user_id, nif, titular, iban, documento, cobra_iva, isencao_iva, declaracao_retencao, retencao_bps, regime_validado)
       values ($1, '123456789', 'Cláudio Pereira', 'PT50000201231234567890154', 'ato_isolado', false, 'Artigo 53.º do CIVA', 'sujeito', 2500, true)`,
      [user],
    ),
  );

beforeAll(async () => {
  db = await baseComMigracoes();
  await db.query('insert into auth.users (id, email) values ($1, $2), ($3, $4), ($5, $6), ($7, $8)', [
    DONO, 'dono@teste.invalid', AV, 'av@teste.invalid', OUTRO, 'outro@teste.invalid', EQUIPA, 'equipa@teste.invalid',
  ]);
  await db.query('insert into public.platform_admins (user_id) values ($1)', [EQUIPA]);
  org = (await as(DONO, () => one<{ id: string }>(`insert into public.organizations (kind, nome, nif) values ('fornecedor', 'Tintas de Ensaio', '503504564') returning id`))).id;
  for (const p of [AV, OUTRO]) await db.query(`insert into public.org_members (org_id, user_id, role) values ($1, $2, 'vendedor')`, [org, p]);
}, 60_000);

describe('quem vê as comissões', () => {
  it('a pessoa vê as suas; o responsável da empresa e o colega não veem nenhuma', async () => {
    const id = await pagamento(AV, 90_000);
    expect((await as(AV, () => db.query('select id from public.survey_payouts where id = $1', [id]))).rows).toHaveLength(1);
    expect((await as(DONO, () => db.query('select id from public.survey_payouts where id = $1', [id]))).rows).toHaveLength(0);
    expect((await as(OUTRO, () => db.query('select id from public.survey_payouts where id = $1', [id]))).rows).toHaveLength(0);
    expect((await as(EQUIPA, () => db.query('select id from public.survey_payouts where id = $1', [id]))).rows).toHaveLength(1);
  });
});

describe('os dados de pagamento', () => {
  it('a pessoa não se valida a si própria nem escolhe a retenção', async () => {
    await dados(AV);
    const d = await one<{ regime_validado: boolean; retencao_bps: number }>('select regime_validado, retencao_bps from public.avaliador_payout_details where user_id = $1', [AV]);
    expect(d).toEqual({ regime_validado: false, retencao_bps: 0 });
  });
  it('NIF de empresa não serve', async () => {
    await expect(
      as(OUTRO, () =>
        db.query(
          `insert into public.avaliador_payout_details (user_id, nif, titular, iban, documento) values ($1, '503504564', 'Outro', 'PT50000201231234567890154', 'recibo_verde')`,
          [OUTRO],
        ),
      ),
    ).rejects.toThrow(/check/);
  });
  it('ninguém lê os dados de outra pessoa; a equipa lê', async () => {
    expect((await as(DONO, () => db.query('select * from public.avaliador_payout_details where user_id = $1', [AV]))).rows).toHaveLength(0);
    expect((await as(EQUIPA, () => db.query('select * from public.avaliador_payout_details where user_id = $1', [AV]))).rows).toHaveLength(1);
  });
  it('só a equipa valida; mudar o declarado volta a pôr por validar', async () => {
    await expect(as(AV, () => db.query('select public.avaliador_validar_regime($1, 2500)', [AV]))).rejects.toThrow(/Só a equipa/);
    await as(EQUIPA, () => db.query('select public.avaliador_validar_regime($1, 2500)', [AV]));
    expect((await one<{ v: boolean }>('select regime_validado as v from public.avaliador_payout_details where user_id = $1', [AV])).v).toBe(true);
    await as(AV, () => db.query(`update public.avaliador_payout_details set documento = 'recibo_verde' where user_id = $1`, [AV]));
    expect((await one<{ v: boolean }>('select regime_validado as v from public.avaliador_payout_details where user_id = $1', [AV])).v).toBe(false);
    await as(EQUIPA, () => db.query('select public.avaliador_validar_regime($1, 2500)', [AV]));
  });
});

describe('o resgate', () => {
  it('a empresa já não resgata comissões de levantamento', async () => {
    await expect(as(DONO, () => db.query('select public.survey_request_redemption($1)', [org]))).rejects.toThrow(/de cada avaliador/);
  });

  it('a pessoa resgata o saldo todo, com a retenção validada; o colega não toca no dela', async () => {
    await pagamento(OUTRO, 50_000); // do colega: não entra no resgate dela
    const rid = (await as(AV, () => one<{ id: string }>('select public.avaliador_pedir_resgate() as id'))).id;
    const r = await one<{ comissao_cents: number; iva_cents: number; retencao_cents: number; liquido_cents: number; user_id: string; nif: string }>(
      'select comissao_cents, iva_cents, retencao_cents, liquido_cents, user_id, nif from public.survey_redemptions where id = $1',
      [rid],
    );
    expect(r).toEqual({ comissao_cents: 90_000, iva_cents: 0, retencao_cents: 22_500, liquido_cents: 67_500, user_id: AV, nif: '123456789' });
    expect((await as(DONO, () => db.query('select id from public.survey_redemptions where id = $1', [rid]))).rows).toHaveLength(0);
    await expect(as(AV, () => db.query('select public.avaliador_pedir_resgate()'))).rejects.toThrow(/em curso/);
  });

  it('o recibo vai para a pasta da própria pessoa; noutra pasta é recusado', async () => {
    const rid = (await one<{ id: string }>('select id from public.survey_redemptions where user_id = $1', [AV])).id;
    await expect(as(AV, () => db.query(`select public.survey_redemption_invoice($1, 'ATO 1', $2)`, [rid, `${org}/x.pdf`]))).rejects.toThrow(/Recibo inválido/);
    await expect(as(OUTRO, () => db.query(`select public.survey_redemption_invoice($1, 'ATO 1', $2)`, [rid, `${OUTRO}/x.pdf`]))).rejects.toThrow(/não encontrado/);
    await as(AV, () => db.query(`select public.survey_redemption_invoice($1, 'ATO 1', $2)`, [rid, `${AV}/levantamento-${rid}.pdf`]));
    expect((await one<{ estado: string }>('select estado from public.survey_redemptions where id = $1', [rid])).estado).toBe('fatura_recebida');
  });

  it('a equipa paga; o saldo fica pago', async () => {
    const rid = (await one<{ id: string }>('select id from public.survey_redemptions where user_id = $1', [AV])).id;
    await as(EQUIPA, () => db.query(`select public.survey_redemption_pay($1, 'TRF-1')`, [rid]));
    const estados = await db.query<{ estado: string }>('select estado from public.survey_payouts where vendedor_user_id = $1', [AV]);
    expect(estados.rows.map((e) => e.estado)).toEqual(['paga']);
  });

  it('sem dados validados não há resgate', async () => {
    await expect(as(OUTRO, () => db.query('select public.avaliador_pedir_resgate()'))).rejects.toThrow(/dados de pagamento/);
  });
});
