import type { PGlite } from '@electric-sql/pglite';
import { beforeAll, describe, expect, it } from 'vitest';
import { baseComMigracoes } from './baseEmMemoria';

// A convocatória por ondas (05/11/2026): o que a base garante sozinha.
//  · o «Aceito» de dois convidados ao mesmo levantamento dá um só dono, e o outro fica «tarde»;
//  · repetir o mesmo «Aceito» (a Twilio repete pedidos) não muda nada;
//  · sem inscrição de avaliador, não reserva;
//  · quando o levantamento deixa de estar aberto por outra via, os convites pendentes fecham;
//  · cada pessoa vê os seus convites e só esses;
//  · o NIF pessoal só existe com recebimento em nome próprio, e tem de ser de pessoa singular.

let db: PGlite;

const CLIENTE = '00000000-0000-4000-8000-00000000c001';
const AV1 = '00000000-0000-4000-8000-00000000a001';
const AV2 = '00000000-0000-4000-8000-00000000a002';
const AV3 = '00000000-0000-4000-8000-00000000a003';

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

let fornecedor: string;
let clienteOrg: string;
let building: string;

async function novoLevantamento(): Promise<string> {
  const req = await as(CLIENTE, () =>
    one<{ id: string }>(
      `insert into public.work_requests (org_id, building_id, titulo, tipo_obra, descricao, prazo_propostas)
       values ($1, $2, 'Fachadas', 'fachadas', 'Pintura das fachadas, com fissuras a reparar.', current_date + 10) returning id`,
      [clienteOrg, building],
    ),
  );
  return (await one<{ id: string }>('select id from public.request_surveys where request_id = $1', [req.id])).id;
}

async function convidar(survey: string, pessoas: string[], numero = 1): Promise<string[]> {
  const w = await one<{ id: string }>(
    `insert into public.survey_waves (survey_id, numero, versao_regras) values ($1, $2, '2026-11-05') returning id`,
    [survey, numero],
  );
  const ids: string[] = [];
  for (const p of pessoas) {
    const i = await one<{ id: string }>(
      `insert into public.survey_invites (wave_id, survey_id, user_id, org_id, telemovel, estado, enviado_em)
       values ($1, $2, $3, $4, '+351912345678', 'enviado', now()) returning id`,
      [w.id, survey, p, fornecedor],
    );
    ids.push(i.id);
  }
  return ids;
}

const aceitar = async (invite: string) => {
  await db.exec('set role service_role');
  try {
    return (await one<{ r: string }>('select public.aceitar_convite($1) as r', [invite])).r;
  } finally {
    await db.exec('reset role');
  }
};

const estado = async (invite: string) => (await one<{ estado: string }>('select estado from public.survey_invites where id = $1', [invite])).estado;

beforeAll(async () => {
  db = await baseComMigracoes();
  await db.query('insert into auth.users (id, email) values ($1, $2), ($3, $4), ($5, $6), ($7, $8)', [
    CLIENTE, 'cliente@teste.invalid', AV1, 'av1@teste.invalid', AV2, 'av2@teste.invalid', AV3, 'av3@teste.invalid',
  ]);
  clienteOrg = (await as(CLIENTE, () => one<{ id: string }>(`insert into public.organizations (kind, nome) values ('particular', 'Cliente de Ensaio') returning id`))).id;
  fornecedor = (await as(AV1, () => one<{ id: string }>(`insert into public.organizations (kind, nome, nif) values ('fornecedor', 'Tintas de Ensaio', '503504564') returning id`))).id;
  for (const p of [AV2, AV3]) {
    await db.query(`insert into public.org_members (org_id, user_id, role) values ($1, $2, 'vendedor')`, [fornecedor, p]);
  }
  building = (
    await as(CLIENTE, () =>
      one<{ id: string }>(
        `insert into public.buildings (org_id, nome_interno, tipo, morada, codigo_postal, localidade, concelho)
         values ($1, 'Rua A, 1', 'edificio_habitacao', 'Rua A, 1', '4900-001', 'Viana do Castelo', 'Viana do Castelo') returning id`,
        [clienteOrg],
      ),
    )
  ).id;
  // Inscrição de avaliador: AV1 e AV2 inscritos; AV3 não.
  for (const p of [AV1, AV2]) {
    await db.query(
      `insert into public.survey_terms_acceptances (user_id, version) values ($1, private.versao_da_autodeclaracao_do_avaliador())`,
      [p],
    );
  }
}, 60_000);

describe('o «Aceito»', () => {
  it('o primeiro fica com a vaga; o segundo fica «tarde»', async () => {
    const s = await novoLevantamento();
    const [a, b] = await convidar(s, [AV1, AV2]);
    expect(await aceitar(a!)).toBe('aceite');
    expect(await aceitar(b!)).toBe('tarde');
    const r = await one<{ status: string; vendedor_user_id: string }>('select status, vendedor_user_id from public.request_surveys where id = $1', [s]);
    expect(r).toEqual({ status: 'reservado', vendedor_user_id: AV1 });
    const t = await one<{ n: number; vendedor_user_id: string }>(
      'select count(*)::int as n, max(vendedor_user_id::text) as vendedor_user_id from public.survey_attempts where survey_id = $1',
      [s],
    );
    expect(t).toEqual({ n: 1, vendedor_user_id: AV1 });
  });

  it('repetir o mesmo «Aceito» devolve o mesmo e não cria segunda tentativa', async () => {
    const s = await novoLevantamento();
    const [a] = await convidar(s, [AV1]);
    expect(await aceitar(a!)).toBe('aceite');
    expect(await aceitar(a!)).toBe('aceite');
    expect((await one<{ n: number }>('select count(*)::int as n from public.survey_attempts where survey_id = $1', [s])).n).toBe(1);
  });

  it('sem inscrição de avaliador não reserva', async () => {
    const s = await novoLevantamento();
    const [c] = await convidar(s, [AV3]);
    expect(await aceitar(c!)).toBe('sem_inscricao');
    expect((await one<{ status: string }>('select status from public.request_surveys where id = $1', [s])).status).toBe('aberto');
  });

  it('quem não respondeu fica «expirado» quando outro aceita, e «tarde» se carregar depois', async () => {
    const s = await novoLevantamento();
    const [a, b] = await convidar(s, [AV1, AV2]);
    await aceitar(a!);
    expect(await estado(b!)).toBe('expirado');
    expect(await aceitar(b!)).toBe('tarde');
    expect(await estado(b!)).toBe('tarde');
  });

  it('o levantamento cancelado pelo cliente fecha os convites pendentes', async () => {
    const s = await novoLevantamento();
    const [a] = await convidar(s, [AV1]);
    await db.query(`update public.request_surveys set status = 'cancelado' where id = $1`, [s]);
    expect(await estado(a!)).toBe('expirado');
    expect(await aceitar(a!)).toBe('tarde');
  });

  it('só a chave de serviço chama a função', async () => {
    const s = await novoLevantamento();
    const [a] = await convidar(s, [AV1]);
    await expect(as(AV1, () => db.query('select public.aceitar_convite($1)', [a]))).rejects.toThrow(/permission denied/);
  });
});

describe('quem vê os convites', () => {
  it('cada pessoa vê os seus, e só esses; ninguém escreve pela API', async () => {
    const s = await novoLevantamento();
    await convidar(s, [AV1, AV2]);
    const meus = await as(AV2, () => db.query<{ user_id: string }>('select user_id from public.survey_invites where survey_id = $1', [s]));
    expect(meus.rows.map((r) => r.user_id)).toEqual([AV2]);
    await expect(as(AV2, () => db.query(`update public.survey_invites set estado = 'aceite' where user_id = $1`, [AV2]))).rejects.toThrow(/permission denied/);
    const ondas = await as(AV1, () => db.query('select * from public.survey_waves where survey_id = $1', [s]));
    expect(ondas.rows).toHaveLength(0);
    const mensagens = await as(AV1, () => db.query('select * from public.whatsapp_messages'));
    expect(mensagens.rows).toHaveLength(0);
  });
});

describe('o que o avaliador declara', () => {
  it('guarda concelho base e raio, e recusa um raio que o ecrã não oferece', async () => {
    await as(AV1, () =>
      db.query(`insert into public.survey_availability (user_id, concelho_base, raio_km) values ($1, 'Viana do Castelo', 30)`, [AV1]),
    );
    await expect(as(AV1, () => db.query(`update public.survey_availability set raio_km = 20 where user_id = $1`, [AV1]))).rejects.toThrow(/check/);
  });

  it('NIF pessoal só com recebimento em nome próprio, e só de pessoa singular', async () => {
    await expect(as(AV1, () => db.query(`update public.survey_availability set nif_pessoal = '123456789' where user_id = $1`, [AV1]))).rejects.toThrow(
      /nif_so_em_nome_proprio/,
    );
    await expect(as(AV1, () => db.query(`update public.survey_availability set recebimento = 'proprio' where user_id = $1`, [AV1]))).rejects.toThrow(
      /nif_so_em_nome_proprio/,
    );
    await expect(
      as(AV1, () => db.query(`update public.survey_availability set recebimento = 'proprio', nif_pessoal = '503504564' where user_id = $1`, [AV1])),
    ).rejects.toThrow(/check/);
    await as(AV1, () => db.query(`update public.survey_availability set recebimento = 'proprio', nif_pessoal = '123456789' where user_id = $1`, [AV1]));
    const r = await one<{ recebimento: string; nif_pessoal: string }>('select recebimento, nif_pessoal from public.survey_availability where user_id = $1', [AV1]);
    expect(r).toEqual({ recebimento: 'proprio', nif_pessoal: '123456789' });
  });
});

describe('o relógio', () => {
  it('sem pg_net nem Vault, pedir convocatórias não faz falhar nada', async () => {
    await expect(db.query('select private.pedir_convocatorias()')).resolves.toBeDefined();
  });
});
