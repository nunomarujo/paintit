import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import { beforeAll, describe, expect, it } from 'vitest';
import { INVALID_NIFS, VALID_NIFS } from '../../src/domain/nif.vectors';

// Corre as migrações numa base Postgres em memória, com o mínimo do ambiente
// Supabase simulado (papéis, auth.uid(), storage), e verifica as regras de
// acesso utilizador a utilizador. Não substitui os avisos de segurança do
// projeto real, que se consultam depois de aplicar.

const SUPABASE_STUB = `
  create role anon nologin;
  create role authenticated nologin;
  create schema auth;
  create table auth.users (id uuid primary key);
  create function auth.uid() returns uuid language sql stable as
    $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  grant usage on schema auth to anon, authenticated;
  grant execute on function auth.uid() to anon, authenticated;
  create schema storage;
  create table storage.buckets (id text primary key, name text, public boolean,
    file_size_limit bigint, allowed_mime_types text[]);
  create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text, name text);
  alter table storage.objects enable row level security;
  grant usage on schema storage to authenticated;
  grant select, insert on storage.objects to authenticated;
  grant usage on schema public to anon, authenticated;
  alter default privileges in schema public grant all on tables to anon, authenticated;
`;

const A = '00000000-0000-4000-8000-00000000000a'; // administradora e condomínio
const B = '00000000-0000-4000-8000-00000000000b'; // outro utilizador, sem relação
const C = '00000000-0000-4000-8000-00000000000c'; // gestor na administradora de A
const ADMIN = '00000000-0000-4000-8000-0000000000ad'; // equipa da plataforma

let db: PGlite;

async function as<T>(user: string | null, fn: () => Promise<T>): Promise<T> {
  await db.exec(user ? 'set role authenticated' : 'set role anon');
  await db.query(`select set_config('request.jwt.claim.sub', $1, false)`, [user ?? '']);
  try {
    return await fn();
  } finally {
    await db.exec('reset role');
  }
}

const one = async <T>(sql: string, params: unknown[] = []) => (await db.query<T>(sql, params)).rows[0]!;

async function createOrg(user: string, kind: string, nome: string, nif: string | null, geridaPor: string | null = null) {
  return as(user, () =>
    one<{ id: string }>(
      `insert into public.organizations (kind, nome, nif, gerida_por) values ($1, $2, $3, $4) returning id`,
      [kind, nome, nif, geridaPor],
    ),
  );
}

const building = (orgId: string) =>
  db.query(
    `insert into public.buildings (org_id, nome_interno, tipo, morada, codigo_postal, localidade, concelho)
     values ($1, 'Rua A, 1', 'edificio_habitacao', 'Rua A, 1', '1000-001', 'Lisboa', 'Lisboa') returning id`,
    [orgId],
  );

let adminOrg: string;
let condo: string;

beforeAll(async () => {
  db = new PGlite();
  await db.exec(SUPABASE_STUB);
  const dir = join(__dirname, '..', 'migrations');
  for (const file of readdirSync(dir).filter((f) => f.endsWith('.sql')).sort()) {
    await db.exec(readFileSync(join(dir, file), 'utf8'));
  }
  for (const u of [A, B, C, ADMIN]) await db.query('insert into auth.users (id) values ($1)', [u]);
  await db.query('insert into public.platform_admins (user_id) values ($1)', [ADMIN]);

  adminOrg = (await createOrg(A, 'administradora', 'Gestão Exemplo Lda', '500000000')).id;
  condo = (await createOrg(A, 'condominio', 'Condomínio Rua A, 1', '901000000', adminOrg)).id;
  await db.query(`insert into public.org_members (org_id, user_id, role) values ($1, $2, 'gestor')`, [adminOrg, C]);
}, 60_000);

describe('NIF na base de dados', () => {
  it('concorda com a regra do domínio', async () => {
    for (const nif of VALID_NIFS) expect((await one<{ ok: boolean }>('select private.nif_valido($1) ok', [nif])).ok).toBe(true);
    for (const nif of INVALID_NIFS) expect((await one<{ ok: boolean }>('select private.nif_valido($1) ok', [nif])).ok).toBe(false);
  });

  it('recusa uma organização com NIF inválido', async () => {
    await expect(createOrg(B, 'pintor', 'Pinturas X', '123456780')).rejects.toThrow();
  });
});

describe('organizações', () => {
  it('quem cria fica proprietário', async () => {
    const r = await one<{ role: string }>('select role from public.org_members where org_id = $1 and user_id = $2', [condo, A]);
    expect(r.role).toBe('proprietario');
  });

  it('um utilizador sem relação não vê as organizações dos outros', async () => {
    const rows = await as(B, async () => (await db.query('select id from public.organizations')).rows);
    expect(rows).toEqual([]);
  });

  it('o gestor da administradora vê o condomínio que ela gere', async () => {
    const rows = await as(C, async () => (await db.query('select id from public.organizations where id = $1', [condo])).rows);
    expect(rows).toHaveLength(1);
  });

  it('ninguém pendura um condomínio numa administradora que não gere', async () => {
    await expect(createOrg(B, 'condominio', 'Condomínio Y', '901234567', adminOrg)).rejects.toThrow(/row-level security/);
  });

  it('o público anónimo não tem acesso', async () => {
    await expect(as(null, () => db.query('select id from public.organizations'))).rejects.toThrow(/permission denied/);
  });
});

describe('prédios', () => {
  it('o gestor da administradora cria prédios no condomínio gerido', async () => {
    const res = await as(C, () => building(condo));
    expect(res.rows).toHaveLength(1);
  });

  it('um estranho não cria nem vê prédios', async () => {
    await expect(as(B, () => building(condo))).rejects.toThrow(/row-level security/);
    const rows = await as(B, async () => (await db.query('select id from public.buildings')).rows);
    expect(rows).toEqual([]);
  });
});

describe('documentos de verificação', () => {
  it('o membro submete, mas não pode marcar como aprovado', async () => {
    await as(A, () =>
      db.query(
        `insert into public.org_documents (org_id, kind, storage_path, nome_ficheiro)
         values ($1, 'ata_nomeacao_administrador', $2, 'ata.pdf')`,
        [condo, `${condo}/ata.pdf`],
      ),
    );
    await expect(
      as(A, () =>
        db.query(
          `insert into public.org_documents (org_id, kind, storage_path, nome_ficheiro, status)
           values ($1, 'outro', 'x', 'x.pdf', 'aprovado')`,
          [condo],
        ),
      ),
    ).rejects.toThrow(/row-level security/);
  });

  it('só a equipa da plataforma valida', async () => {
    const before = await as(A, async () => (await db.query(`update public.org_documents set status = 'aprovado' returning id`)).rows);
    expect(before).toEqual([]);
    const after = await as(ADMIN, async () => (await db.query(`update public.org_documents set status = 'aprovado' returning id`)).rows);
    expect(after.length).toBeGreaterThan(0);
  });

  it('não aceita um prédio de outra organização', async () => {
    const other = (await createOrg(B, 'particular', 'Bruno', null)).id;
    const b = await as(B, async () => (await building(other)).rows[0] as { id: string });
    await expect(
      as(A, () =>
        db.query(
          `insert into public.org_documents (org_id, building_id, kind, storage_path, nome_ficheiro)
           values ($1, $2, 'outro', 'x', 'x.pdf')`,
          [condo, b.id],
        ),
      ),
    ).rejects.toThrow(/foreign key/);
  });

  it('o ficheiro só entra na pasta de uma organização a que se pertence', async () => {
    await as(A, () => db.query(`insert into storage.objects (bucket_id, name) values ('documentos', $1)`, [`${condo}/ata.pdf`]));
    await expect(
      as(B, () => db.query(`insert into storage.objects (bucket_id, name) values ('documentos', $1)`, [`${condo}/x.pdf`])),
    ).rejects.toThrow(/row-level security/);
  });
});
