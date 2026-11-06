import type { PGlite } from '@electric-sql/pglite';
import { beforeAll, describe, expect, it } from 'vitest';
import { baseComMigracoes } from './baseEmMemoria';

let db: PGlite;
const ADMIN = '00000000-0000-4000-8000-0000000000c1';
const OUTRO = '00000000-0000-4000-8000-0000000000c2';

async function as<T>(user: string | null, fn: () => Promise<T>): Promise<T> {
  await db.exec(user ? 'set role authenticated' : 'set role anon');
  await db.query(`select set_config('request.jwt.claim.sub', $1, false)`, [user ?? '']);
  await db.query(`select set_config('request.jwt.claims', $1, false)`, [user ? JSON.stringify({ sub: user }) : '']);
  try {
    return await fn();
  } finally {
    await db.exec('reset role');
  }
}

async function contacto(pc: boolean, email: string, extra = ''): Promise<string> {
  const r = await db.query<{ id: string }>(
    `insert into public.crm_contactos (zona_id, tipo, nome, email, fonte, pessoa_coletiva ${extra ? ', desistiu_em' : ''})
     select id, 'pintor', 'Empresa de Ensaio', $1, 'teste', $2 ${extra ? ', now()' : ''} from public.crm_zonas limit 1 returning id`,
    [email, pc],
  );
  return r.rows[0]!.id;
}

beforeAll(async () => {
  db = await baseComMigracoes();
  await db.query('insert into auth.users (id, email) values ($1, $2), ($3, $4)', [ADMIN, 'a@teste.invalid', OUTRO, 'o@teste.invalid']);
  await db.query('insert into public.platform_admins (user_id) values ($1)', [ADMIN]);
}, 60_000);

describe('CRM: acesso', () => {
  it('a primeira zona é Viana do Castelo, na campanha 1', async () => {
    const r = await as(ADMIN, () => db.query<{ concelho: string; campanha_atual: number }>('select concelho, campanha_atual from public.crm_zonas'));
    expect(r.rows).toEqual([{ concelho: 'Viana do Castelo', campanha_atual: 1 }]);
  });
  it('quem não é da equipa não vê nem escreve', async () => {
    const r = await as(OUTRO, () => db.query('select * from public.crm_zonas'));
    expect(r.rows).toHaveLength(0);
    await expect(as(OUTRO, () => db.query(`insert into public.crm_zonas (concelho) values ('Braga')`))).rejects.toThrow(/row-level security/);
  });
  it('anónimo não tem acesso nenhum', async () => {
    await expect(as(null, () => db.query('select * from public.crm_contactos'))).rejects.toThrow(/permission denied/);
  });
});

describe('CRM: a porta legal na base de dados', () => {
  it('aceita um envio a uma pessoa coletiva', async () => {
    const id = await contacto(true, 'ok@empresa.invalid');
    await db.query(`insert into public.crm_envios (contacto_id, campanha_id) values ($1, 'pintor-1')`, [id]);
  });
  it('recusa um envio a pessoa singular', async () => {
    const id = await contacto(false, 'singular@exemplo.invalid');
    await expect(db.query(`insert into public.crm_envios (contacto_id, campanha_id) values ($1, 'pintor-1')`, [id])).rejects.toThrow(/pessoas coletivas/);
  });
  it('recusa um envio a quem desistiu', async () => {
    const id = await contacto(true, 'saiu@empresa.invalid', 'desistiu');
    await expect(db.query(`insert into public.crm_envios (contacto_id, campanha_id) values ($1, 'pintor-1')`, [id])).rejects.toThrow(/não receber/);
  });
  it('não repete a mesma campanha ao mesmo contacto', async () => {
    const id = await contacto(true, 'dup@empresa.invalid');
    await db.query(`insert into public.crm_envios (contacto_id, campanha_id) values ($1, 'pintor-1')`, [id]);
    await expect(db.query(`insert into public.crm_envios (contacto_id, campanha_id) values ($1, 'pintor-1')`, [id])).rejects.toThrow(/duplicate key/);
  });
});
