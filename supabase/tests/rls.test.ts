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
  create table auth.users (id uuid primary key, email text);
  create function auth.uid() returns uuid language sql stable as
    $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  create function auth.jwt() returns jsonb language sql stable as
    $$ select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb $$;
  grant usage on schema auth to anon, authenticated;
  grant execute on function auth.uid(), auth.jwt() to anon, authenticated;
  create schema storage;
  create table storage.buckets (id text primary key, name text, public boolean,
    file_size_limit bigint, allowed_mime_types text[]);
  create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text, name text);
  alter table storage.objects enable row level security;
  grant usage on schema storage to authenticated;
  grant select, insert, delete on storage.objects to authenticated;
  grant usage on schema public to anon, authenticated;
  alter default privileges in schema public grant all on tables to anon, authenticated;
`;

const A = '00000000-0000-4000-8000-00000000000a'; // administradora e condomínio
const B = '00000000-0000-4000-8000-00000000000b'; // outro utilizador, sem relação
const C = '00000000-0000-4000-8000-00000000000c'; // gestor na administradora de A
const ADMIN = '00000000-0000-4000-8000-0000000000ad'; // equipa da plataforma
const D = '00000000-0000-4000-8000-00000000000d'; // convidada para o condomínio

const email = (user: string) => `u${user.slice(-2)}@teste.invalid`;

let db: PGlite;

async function as<T>(user: string | null, fn: () => Promise<T>): Promise<T> {
  await db.exec(user ? 'set role authenticated' : 'set role anon');
  await db.query(`select set_config('request.jwt.claim.sub', $1, false)`, [user ?? '']);
  await db.query(`select set_config('request.jwt.claims', $1, false)`, [
    user ? JSON.stringify({ sub: user, email: email(user) }) : '',
  ]);
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
  for (const u of [A, B, C, D, ADMIN]) {
    await db.query('insert into auth.users (id, email) values ($1, $2)', [u, email(u)]);
  }
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

describe('convites', () => {
  const invite = (role: string, to = email(D)) =>
    as(A, () =>
      one<{ id: string }>(
        `insert into public.org_invitations (org_id, email, role) values ($1, $2, $3) returning id`,
        [condo, to, role],
      ),
    );

  it('só o proprietário convida', async () => {
    await expect(
      as(C, () => db.query(`insert into public.org_invitations (org_id, email, role) values ($1, 'x@teste.invalid', 'leitor')`, [condo])),
    ).rejects.toThrow(/row-level security/);
  });

  it('a convidada vê o convite; um estranho não', async () => {
    const inv = await invite('gestor');
    const seen = await as(D, async () => (await db.query('select id from public.org_invitations where id = $1', [inv.id])).rows);
    expect(seen).toHaveLength(1);
    const stranger = await as(B, async () => (await db.query('select id from public.org_invitations')).rows);
    expect(stranger).toEqual([]);
  });

  it('a convidada não pode mudar o papel do convite', async () => {
    await expect(as(D, () => db.query(`update public.org_invitations set role = 'proprietario'`))).rejects.toThrow(
      /permission denied/,
    );
  });

  it('não se junta com um papel diferente do convidado', async () => {
    await expect(
      as(D, () => db.query(`insert into public.org_members (org_id, user_id, role) values ($1, $2, 'proprietario')`, [condo, D])),
    ).rejects.toThrow(/row-level security/);
  });

  it('aceita com o papel do convite e passa a ver o condomínio', async () => {
    await as(D, async () => {
      await db.query(`insert into public.org_members (org_id, user_id, role) values ($1, $2, 'gestor')`, [condo, D]);
      await db.query(
        `update public.org_invitations set accepted_at = now(), accepted_by = $2 where org_id = $1 and email = $3`,
        [condo, D, email(D)],
      );
    });
    const orgs = await as(D, async () => (await db.query('select id from public.organizations where id = $1', [condo])).rows);
    expect(orgs).toHaveLength(1);
  });

  it('um convite expirado não serve', async () => {
    const other = (await createOrg(A, 'particular', 'Casa A', null)).id;
    await db.query(
      `insert into public.org_invitations (org_id, email, role, invited_by, expires_at) values ($1, $2, 'leitor', $3, now() - interval '1 day')`,
      [other, email(B), A],
    );
    await expect(
      as(B, () => db.query(`insert into public.org_members (org_id, user_id, role) values ($1, $2, 'leitor')`, [other, B])),
    ).rejects.toThrow(/row-level security/);
  });
});

describe('perfis', () => {
  it('o perfil é criado com o email da conta', async () => {
    const p = await as(A, () => one<{ email: string }>('select email from public.profiles where user_id = $1', [A]));
    expect(p.email).toBe(email(A));
  });

  it('colegas veem-se; estranhos não', async () => {
    const colleague = await as(D, async () => (await db.query('select user_id from public.profiles where user_id = $1', [A])).rows);
    expect(colleague).toHaveLength(1);
    const stranger = await as(B, async () => (await db.query('select user_id from public.profiles where user_id = $1', [A])).rows);
    expect(stranger).toEqual([]);
  });

  it('o utilizador muda o nome mas não o email', async () => {
    await as(A, () => db.query(`update public.profiles set nome = 'Ana' where user_id = $1`, [A]));
    await expect(as(A, () => db.query(`update public.profiles set email = 'outro@teste.invalid' where user_id = $1`, [A]))).rejects.toThrow(
      /permission denied/,
    );
  });
});

describe('pedidos e anúncios', () => {
  const P = '00000000-0000-4000-8000-0000000000e1'; // pintor
  let requestId: string;
  let buildingId: string;

  beforeAll(async () => {
    await db.query('insert into auth.users (id, email) values ($1, $2)', [P, email(P)]);
    await createOrg(P, 'pintor', 'Pinturas Exemplo', '501964843');
    buildingId = (await one<{ id: string }>('select id from public.buildings where org_id = $1 limit 1', [condo])).id;
    requestId = (
      await as(A, () =>
        one<{ id: string }>(
          `insert into public.work_requests (org_id, building_id, titulo, tipo_obra, descricao, prazo_propostas)
           values ($1, $2, 'Rua A, 1 — fachadas', 'fachadas', $3, current_date + 10) returning id`,
          [condo, buildingId, 'Pintura das fachadas e tetos das varandas, com fissuras a reparar.'],
        ),
      )
    ).id;
  });

  it('não publica sem superfícies', async () => {
    await expect(
      as(A, () => db.query(`update public.work_requests set status = 'publicado' where id = $1`, [requestId])),
    ).rejects.toThrow(/superfície/);
  });

  it('a área calculada pela base de dados é igual à do domínio', async () => {
    const r = await as(A, () =>
      one<{ area_cm2: number }>(
        `insert into public.request_surfaces (request_id, kind, largura_cm, altura_cm, vaos_cm2)
         values ($1, 'fachada', 1200, 1550, 2450) returning area_cm2`,
        [requestId],
      ),
    );
    expect(r.area_cm2).toBe(16150); // o mesmo vetor de src/domain/request.test.ts
  });

  it('publicado: o pintor vê o anúncio anónimo, mas não o pedido nem o prédio', async () => {
    await as(A, () => db.query(`update public.work_requests set status = 'publicado' where id = $1`, [requestId]));
    const listing = await as(P, () =>
      one<Record<string, unknown>>('select * from public.request_listings where request_id = $1', [requestId]),
    );
    expect(listing.concelho).toBe('Lisboa');
    expect(listing.area_total_cm2).toBe(16150);
    expect(Object.keys(listing)).not.toContain('titulo');
    const privateRows = await as(P, async () => [
      ...(await db.query('select id from public.work_requests')).rows,
      ...(await db.query('select id from public.buildings')).rows,
    ]);
    expect(privateRows).toEqual([]);
    const surfaces = await as(P, async () => (await db.query('select area_cm2 from public.request_surfaces')).rows);
    expect(surfaces).toHaveLength(1);
  });

  it('quem não é pintor não vê anúncios', async () => {
    const rows = await as(B, async () => (await db.query('select request_id from public.request_listings')).rows);
    expect(rows).toEqual([]);
  });

  it('um pedido publicado não se altera nem recebe superfícies', async () => {
    await expect(
      as(A, () => db.query(`update public.work_requests set descricao = 'outra coisa qualquer' where id = $1`, [requestId])),
    ).rejects.toThrow(/não pode ser alterado/);
    await expect(
      as(A, () =>
        db.query(`insert into public.request_surfaces (request_id, kind, area_direta_cm2) values ($1, 'muro', 1000)`, [requestId]),
      ),
    ).rejects.toThrow(/row-level security/);
  });

  it('ninguém escreve anúncios diretamente', async () => {
    await expect(as(A, () => db.query(`update public.request_listings set concelho = 'Porto'`))).rejects.toThrow(
      /permission denied/,
    );
  });

  it('voltar a rascunho fecha o anúncio e sobe a versão', async () => {
    const r = await as(A, () =>
      one<{ version: number }>(`update public.work_requests set status = 'rascunho' where id = $1 returning version`, [requestId]),
    );
    expect(r.version).toBe(2);
    const rows = await as(P, async () => (await db.query('select request_id from public.request_listings')).rows);
    expect(rows).toEqual([]);
  });
});

describe('fotografias do pedido', () => {
  const P = '00000000-0000-4000-8000-0000000000e1'; // pintor criado acima
  let requestId: string;
  let geral: string;
  let pormenor: string;
  const path = (name: string) => `${requestId}/${name}`;
  const addPhoto = (user: string, kind: string, name: string) =>
    as(user, () =>
      one<{ id: string; revisao: string | null }>(
        `insert into public.request_photos (request_id, kind, storage_path, revisao) values ($1, $2, $3, 'aprovada')
         returning id, revisao`,
        [requestId, kind, path(name)],
      ),
    );
  const painterSees = async () =>
    as(P, async () => ({
      rows: (await db.query<{ id: string }>('select id from public.request_photos')).rows.map((r) => r.id),
      files: (await db.query<{ name: string }>(`select name from storage.objects where bucket_id = 'fotos'`)).rows.map((r) => r.name),
    }));

  beforeAll(async () => {
    requestId = (await one<{ id: string }>(`select id from public.work_requests where status = 'rascunho' limit 1`)).id;
    for (const name of ['geral.jpg', 'pormenor.jpg']) {
      await as(A, () => db.query(`insert into storage.objects (bucket_id, name) values ('fotos', $1)`, [path(name)]));
    }
    geral = (await addPhoto(A, 'geral', 'geral.jpg')).id;
  });

  it('entra sempre por rever, mesmo que se tente aprovar ao enviar', async () => {
    const r = await addPhoto(C, 'pormenor', 'pormenor.jpg');
    pormenor = r.id;
    expect(r.revisao).toBe('pendente');
  });

  it('um estranho não envia fotografias nem ficheiros', async () => {
    await expect(addPhoto(B, 'geral', 'x.jpg')).rejects.toThrow(/row-level security/);
    await expect(
      as(B, () => db.query(`insert into storage.objects (bucket_id, name) values ('fotos', $1)`, [path('x.jpg')])),
    ).rejects.toThrow(/row-level security/);
  });

  it('o cliente não aprova as próprias fotografias', async () => {
    const rows = await as(A, async () =>
      (await db.query(`update public.request_photos set revisao = 'aprovada', reviewed_by = $2 where id = $1 returning id`, [pormenor, A])).rows,
    );
    expect(rows).toEqual([]);
  });

  it('a equipa da plataforma revê, mas não muda a fotografia', async () => {
    await expect(
      as(ADMIN, () => db.query(`update public.request_photos set revisao = 'rejeitada', reviewed_by = $2 where id = $1`, [pormenor, ADMIN])),
    ).rejects.toThrow(/Explique/);
    await expect(
      as(ADMIN, () => db.query(`update public.request_photos set legenda = 'x', reviewed_by = $2 where id = $1`, [pormenor, ADMIN])),
    ).rejects.toThrow(/Só a revisão/);
    const geralRows = await as(ADMIN, async () =>
      (await db.query(`update public.request_photos set reviewed_by = $2 where id = $1 returning id`, [geral, ADMIN])).rows,
    );
    expect(geralRows).toEqual([]);
    await as(ADMIN, () =>
      db.query(`update public.request_photos set revisao = 'aprovada', reviewed_by = $2, reviewed_at = now() where id = $1`, [pormenor, ADMIN]),
    );
  });

  it('o pintor só vê o pormenor aprovado, e só com o anúncio aberto', async () => {
    expect(await painterSees()).toEqual({ rows: [], files: [] });
    await as(A, () => db.query(`update public.work_requests set status = 'publicado' where id = $1`, [requestId]));
    expect(await painterSees()).toEqual({ rows: [pormenor], files: [path('pormenor.jpg')] });
    const strangers = await as(B, async () => (await db.query('select id from public.request_photos')).rows);
    expect(strangers).toEqual([]);
  });

  it('com o pedido publicado não se juntam nem apagam fotografias', async () => {
    await expect(addPhoto(A, 'geral', 'outra.jpg')).rejects.toThrow(/row-level security/);
    const rows = await as(A, async () => (await db.query('delete from public.request_photos where id = $1 returning id', [geral])).rows);
    expect(rows).toEqual([]);
  });

  it('fechado o anúncio, o pintor deixa de ver', async () => {
    await as(A, () => db.query(`update public.work_requests set status = 'encerrado' where id = $1`, [requestId]));
    expect(await painterSees()).toEqual({ rows: [], files: [] });
  });
});
