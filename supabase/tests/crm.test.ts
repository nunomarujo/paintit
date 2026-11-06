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

describe('CRM: códigos e cliques', () => {
  it('cada contacto tem um código próprio de 8 caracteres', async () => {
    const a = await contacto(true, 'cod-a@empresa.invalid');
    const b = await contacto(true, 'cod-b@empresa.invalid');
    const r = await db.query<{ id: string; codigo: string }>('select id, codigo from public.crm_contactos where id = any($1)', [[a, b]]);
    expect(r.rows).toHaveLength(2);
    expect(r.rows[0]!.codigo).toMatch(/^[A-Z0-9]{8}$/);
    expect(r.rows[0]!.codigo).not.toBe(r.rows[1]!.codigo);
  });
  it('um envio só conta um clique', async () => {
    const c = await contacto(true, 'clique@empresa.invalid');
    const e = (await db.query<{ id: string }>(`insert into public.crm_envios (contacto_id, campanha_id) values ($1, 'pintor-1') returning id`, [c])).rows[0]!.id;
    await db.query(`insert into public.crm_eventos (contacto_id, envio_id, tipo) values ($1, $2, 'clique')`, [c, e]);
    await expect(db.query(`insert into public.crm_eventos (contacto_id, envio_id, tipo) values ($1, $2, 'clique')`, [c, e])).rejects.toThrow(/duplicate key/);
    await db.query(`insert into public.crm_eventos (contacto_id, envio_id, tipo) values ($1, $2, 'resposta')`, [c, e]);
  });
});

describe('CRM: só as campanhas aprovadas enviam', () => {
  it('um envio aprovado ou enviado exige a campanha aprovada', async () => {
    const c = await contacto(true, 'camp@empresa.invalid');
    await expect(db.query(`insert into public.crm_envios (contacto_id, campanha_id, estado) values ($1, 'pintor-2', 'aprovado')`, [c])).rejects.toThrow(/não foi aprovada/);
    await db.query(`insert into public.crm_campanhas (id, assunto, corpo, cta) values ('pintor-2', 'A', 'B', 'C')`);
    await expect(db.query(`insert into public.crm_envios (contacto_id, campanha_id, estado) values ($1, 'pintor-2', 'aprovado')`, [c])).rejects.toThrow(/não foi aprovada/);
    await db.query(`update public.crm_campanhas set estado = 'aprovada' where id = 'pintor-2'`);
    const r = await db.query<{ id: string }>(`insert into public.crm_envios (contacto_id, campanha_id, estado) values ($1, 'pintor-2', 'aprovado') returning id`, [c]);
    await db.query(`update public.crm_envios set estado = 'enviado' where id = $1`, [r.rows[0]!.id]);
  });
  it('retirar a aprovação pára o que ainda não saiu', async () => {
    const c = await contacto(true, 'retira@empresa.invalid');
    await db.query(`update public.crm_campanhas set estado = 'aprovada' where id = 'pintor-2'`);
    const r = await db.query<{ id: string }>(`insert into public.crm_envios (contacto_id, campanha_id, estado) values ($1, 'pintor-1', 'proposto') returning id`, [c]);
    await db.query(`insert into public.crm_campanhas (id, assunto, corpo, cta, estado) values ('pintor-1', 'A', 'B', 'C', 'aprovada') on conflict (id) do update set estado = 'aprovada'`);
    await db.query(`update public.crm_envios set estado = 'aprovado' where id = $1`, [r.rows[0]!.id]);
    await db.query(`update public.crm_campanhas set estado = 'correcao' where id = 'pintor-1'`);
    await expect(db.query(`update public.crm_envios set estado = 'enviado' where id = $1`, [r.rows[0]!.id])).rejects.toThrow(/não foi aprovada/);
  });
  it('quem desistiu pode ter os envios pendentes rejeitados', async () => {
    const c = await contacto(true, 'sai@empresa.invalid');
    const r = await db.query<{ id: string }>(`insert into public.crm_envios (contacto_id, campanha_id) values ($1, 'fornecedor-1') returning id`, [c]);
    await db.query(`update public.crm_contactos set desistiu_em = now(), estado = 'desistiu' where id = $1`, [c]);
    await db.query(`update public.crm_envios set estado = 'rejeitado' where id = $1`, [r.rows[0]!.id]);
  });
});

describe('CRM: o dossier só é da equipa', () => {
  it('quem não é da equipa não lê nem escreve', async () => {
    await db.query(`insert into public.crm_dossier (perfil, tema, tipo, texto, fonte) values ('pintor', 'propostas sem resposta', 'dor', 'x', 'teste')`);
    expect((await as(OUTRO, () => db.query('select * from public.crm_dossier'))).rows).toHaveLength(0);
    expect((await as(ADMIN, () => db.query('select * from public.crm_dossier'))).rows).toHaveLength(1);
    await expect(as(OUTRO, () => db.query(`insert into public.crm_dossier (perfil, tema, tipo, texto, fonte) values ('pintor','a','dor','b','c')`))).rejects.toThrow(/row-level security/);
  });
});

describe('Oferta de lançamento', () => {
  const ORG = '00000000-0000-4000-8000-0000000000d1';
  beforeAll(async () => {
    await db.query(`insert into public.organizations (id, kind, nome, created_by) values ($1, 'pintor', 'Pinturas de Ensaio', $2)`, [ORG, ADMIN]);
  });
  it('o Pro de lançamento cabe no esquema da subscrição, e não ocupa o lugar de uma subscrição paga', async () => {
    await db.query(
      `insert into public.org_subscriptions (org_id, plano, periodicidade, estado, preco_versao, preco_cents, valida_ate)
       values ($1, 'pro', 'mensal', 'cancelada', 'lancamento-2027-01-31', 0, '2027-01-31')`,
      [ORG],
    );
    await db.query(`insert into public.org_subscriptions (org_id, plano, periodicidade, estado, preco_versao, preco_cents) values ($1, 'pro', 'mensal', 'por_pagar', '2026-10-25', 3000)`, [ORG]);
  });
  it('uma oferta por entidade', async () => {
    await db.query(`insert into public.ofertas_de_lancamento (org_id, origem_flyer, concedida, valida_ate) values ($1, 'fl-pin-1', 'pro', '2027-01-31')`, [ORG]);
    await expect(db.query(`insert into public.ofertas_de_lancamento (org_id, origem_flyer) values ($1, 'fl-pin-1')`, [ORG])).rejects.toThrow(/duplicate key/);
  });
  it('só se aceita um flyer com o formato exato', async () => {
    await expect(db.query(`insert into public.ofertas_de_lancamento (org_id, origem_flyer) values ($1, 'x; drop')`, ['00000000-0000-4000-8000-0000000000d2'])).rejects.toThrow();
  });
  it('só a equipa lê; ninguém escreve pela interface', async () => {
    expect((await as(ADMIN, () => db.query('select * from public.ofertas_de_lancamento'))).rows).toHaveLength(1);
    expect((await as(OUTRO, () => db.query('select * from public.ofertas_de_lancamento'))).rows).toHaveLength(0);
    await expect(as(ADMIN, () => db.query(`insert into public.ofertas_de_lancamento (org_id) values ($1)`, [ORG]))).rejects.toThrow(/permission denied/);
  });
});
