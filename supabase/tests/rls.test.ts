import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import { beforeAll, describe, expect, it } from 'vitest';
import { INVALID_NIFS, VALID_NIFS } from '../../src/domain/nif.vectors';
import { CURRENT_RULES } from '../../src/domain/rules';

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

  it('o convite diz a entidade, mesmo que quem convida tente outro nome', async () => {
    const inv = await as(A, () =>
      one<{ id: string }>(
        `insert into public.org_invitations (org_id, email, role, org_nome) values ($1, $2, 'leitor', 'Outra coisa') returning id`,
        [condo, email(B)],
      ),
    );
    const seen = await as(B, () =>
      one<{ org_nome: string; org_kind: string }>('select org_nome, org_kind from public.org_invitations where id = $1', [inv.id]),
    );
    const real = await as(A, () => one<{ nome: string }>('select nome from public.organizations where id = $1', [condo]));
    expect(seen).toEqual({ org_nome: real.nome, org_kind: 'condominio' });
    await expect(as(B, () => db.query(`update public.org_invitations set org_nome = 'x' where id = $1`, [inv.id]))).rejects.toThrow(
      /permission denied/,
    );
    await as(A, () => db.query('delete from public.org_invitations where id = $1', [inv.id]));
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

describe('propostas e escolha', () => {
  const P = '00000000-0000-4000-8000-0000000000e1'; // pintor criado acima
  const P2 = '00000000-0000-4000-8000-0000000000e2'; // segundo pintor
  let requestId: string;
  let painterOrg: string;
  let painter2Org: string;
  let mine: string;
  let other: string;

  const proposal = (user: string, org: string) =>
    as(user, () =>
      one<{ id: string }>(
        `insert into public.proposals (request_id, painter_org_id, validade, duracao_dias)
         values ($1, $2, current_date + 30, 20) returning id`,
        [requestId, org],
      ),
    );
  const addLine = (user: string, id: string, preco: number, inclusao = 'incluido') =>
    as(user, () =>
      db.query(
        `insert into public.proposal_lines (proposal_id, categoria, descricao, superficie, quantidade, preco_unitario_cents, inclusao)
         values ($1, 'pintura', 'Pintura da fachada', 'fachada', 16150, $2, $3)`,
        [id, preco, inclusao],
      ),
    );
  const setStatus = (user: string, id: string, status: string) =>
    as(user, () => db.query('update public.proposals set status = $2 where id = $1', [id, status]));

  beforeAll(async () => {
    await db.query('insert into auth.users (id, email) values ($1, $2)', [P2, email(P2)]);
    painterOrg = (await one<{ id: string }>(`select id from public.organizations where kind = 'pintor' limit 1`)).id;
    painter2Org = (await createOrg(P2, 'pintor', 'Pinturas Dois', '502011378')).id;
    const buildingId = (await one<{ id: string }>('select id from public.buildings where org_id = $1 limit 1', [condo])).id;
    requestId = (
      await as(A, () =>
        one<{ id: string }>(
          `insert into public.work_requests (org_id, building_id, titulo, tipo_obra, descricao, prazo_propostas)
           values ($1, $2, 'Rua A, 1 — empena', 'fachadas', $3, current_date + 10) returning id`,
          [condo, buildingId, 'Pintura da empena norte, com lavagem prévia e primário.'],
        ),
      )
    ).id;
    await as(A, () => db.query(`insert into public.request_surfaces (request_id, kind, area_direta_cm2) values ($1, 'fachada', 16150)`, [requestId]));
  });

  it('não se propõe a um pedido que não está publicado', async () => {
    await expect(proposal(P, painterOrg)).rejects.toThrow(/row-level security/);
    await as(A, () => db.query(`update public.work_requests set status = 'publicado' where id = $1`, [requestId]));
  });

  it('só uma entidade de pintura propõe, e só pela sua', async () => {
    await expect(proposal(A, condo)).rejects.toThrow(/row-level security/);
    await expect(proposal(P2, painterOrg)).rejects.toThrow(/row-level security/);
    mine = (await proposal(P, painterOrg)).id;
    other = (await proposal(P2, painter2Org)).id;
  });

  it('o total da linha na base de dados é igual ao do domínio', async () => {
    await addLine(P, mine, 850);
    await addLine(P, mine, 100, 'opcional');
    const r = await one<{ total_cents: string }>('select total_cents from public.proposal_lines where proposal_id = $1 and inclusao = $2', [mine, 'incluido']);
    expect(Number(r.total_cents)).toBe(137275); // o mesmo vetor de src/domain/proposal.test.ts
  });

  it('o cliente não vê rascunhos; o concorrente nunca vê', async () => {
    const client = await as(A, async () => (await db.query('select id from public.proposals')).rows);
    expect(client).toEqual([]);
    const rival = await as(P2, async () => (await db.query('select id from public.proposals where id = $1', [mine])).rows);
    expect(rival).toEqual([]);
    const lines = await as(P2, async () => (await db.query('select id from public.proposal_lines where proposal_id = $1', [mine])).rows);
    expect(lines).toEqual([]);
  });

  it('o cliente não mexe num rascunho do pintor', async () => {
    const rows = await as(A, async () =>
      (await db.query(`update public.proposals set notas = 'x' where id = $1 returning id`, [mine])).rows,
    );
    expect(rows).toEqual([]);
  });

  it('não submete sem linhas incluídas; submetida fixa a base e fica imutável', async () => {
    await expect(setStatus(P2, other, 'submetida')).rejects.toThrow(/pelo menos uma linha/);
    await setStatus(P, mine, 'submetida');
    const r = await one<{ base_cents: string; iva_cents: string; request_version: number; pintor_verificado: boolean }>(
      'select base_cents, iva_cents, request_version, pintor_verificado from public.proposals where id = $1',
      [mine],
    );
    expect([Number(r.base_cents), Number(r.iva_cents), r.request_version, r.pintor_verificado]).toEqual([137275, 31573, 1, false]);
    await expect(as(P, () => db.query(`update public.proposals set notas = 'x' where id = $1`, [mine]))).rejects.toThrow(/não pode ser alterada/);
    await expect(addLine(P, mine, 1)).rejects.toThrow(/row-level security/);
    await addLine(P2, other, 900);
    await setStatus(P2, other, 'submetida');
  });

  it('o cliente vê as propostas submetidas, mas não a entidade que as fez', async () => {
    const rows = await as(A, async () => (await db.query('select id from public.proposals order by submitted_at')).rows);
    expect(rows).toHaveLength(2);
    const orgs = await as(A, async () => (await db.query('select id from public.organizations where id = $1', [painterOrg])).rows);
    expect(orgs).toEqual([]);
  });

  it('mensagens: cada lado escreve pelo seu, estranhos não leem', async () => {
    await as(P, () => db.query(`insert into public.proposal_messages (proposal_id, lado, texto) values ($1, 'pintor', 'Há acesso para andaime?')`, [mine]));
    await as(A, () => db.query(`insert into public.proposal_messages (proposal_id, lado, texto) values ($1, 'cliente', 'Sim, pelo pátio.')`, [mine]));
    await expect(
      as(P, () => db.query(`insert into public.proposal_messages (proposal_id, lado, texto) values ($1, 'cliente', 'falso')`, [mine])),
    ).rejects.toThrow(/row-level security/);
    const rival = await as(P2, async () => (await db.query('select id from public.proposal_messages where proposal_id = $1', [mine])).rows);
    expect(rival).toEqual([]);
    const client = await as(A, async () => (await db.query('select id from public.proposal_messages where request_id = $1', [requestId])).rows);
    expect(client).toHaveLength(2);
  });

  it('o pintor não se escolhe a si próprio', async () => {
    await expect(setStatus(P, mine, 'selecionada')).rejects.toThrow(/Só o cliente/);
    await expect(as(P, () => db.query('select public.select_proposal($1)', [mine]))).rejects.toThrow(/não encontrada/);
  });

  it('o cliente escolhe uma: as outras ficam não selecionadas e o pedido fecha', async () => {
    await as(A, () => db.query('select public.select_proposal($1)', [mine]));
    const rows = await db.query<{ id: string; status: string }>('select id, status from public.proposals where request_id = $1', [requestId]);
    expect(Object.fromEntries(rows.rows.map((r) => [r.id, r.status]))).toEqual({ [mine]: 'selecionada', [other]: 'nao_selecionada' });
    const req = await one<{ status: string }>('select status from public.work_requests where id = $1', [requestId]);
    expect(req.status).toBe('encerrado');
    await expect(as(A, () => db.query('select public.select_proposal($1)', [other]))).rejects.toThrow(/submetida/);
  });
});

describe('contratação', () => {
  const P = '00000000-0000-4000-8000-0000000000e1'; // pintor escolhido
  const P2 = '00000000-0000-4000-8000-0000000000e2'; // pintor não escolhido
  let engagementId: string;
  let requestId: string;
  const event = (user: string, kind: string, extra: { amount?: number; reveal?: boolean; at?: string } = {}) =>
    as(user, () =>
      db.query(
        `insert into public.engagement_events (engagement_id, kind, amount_cents, reveal, at)
         values ($1, $2, $3, $4, coalesce($5::timestamptz, now()))`,
        [engagementId, kind, extra.amount ?? null, extra.reveal ?? false, extra.at ?? null],
      ),
    );

  beforeAll(async () => {
    const e = await one<{ id: string; request_id: string }>(
      `select e.id, e.request_id from public.engagements e join public.proposals p on p.id = e.proposal_id where p.status = 'selecionada'`,
    );
    engagementId = e.id;
    requestId = e.request_id;
  });

  it('a escolha cria a contratação com a versão das regras em vigor e o adiantamento', async () => {
    const e = await one<{ rules_version: string; base_cents: string; advance_cents: string }>(
      'select rules_version, base_cents, advance_cents from public.engagements where id = $1',
      [engagementId],
    );
    expect(e.rules_version).toBe(CURRENT_RULES.version);
    expect([Number(e.base_cents), Number(e.advance_cents)]).toEqual([137275, 0]);
  });

  it('cada lado vê a contratação; o pintor não escolhido não', async () => {
    for (const u of [A, P]) {
      const rows = await as(u, async () => (await db.query('select id from public.engagements')).rows);
      expect(rows).toHaveLength(1);
    }
    expect(await as(P2, async () => (await db.query('select id from public.engagements')).rows)).toEqual([]);
  });

  it('ninguém cria contratações à mão', async () => {
    await expect(
      as(A, () => db.query(`insert into public.engagements (proposal_id, request_id, client_org_id, painter_org_id, base_cents, advance_cents, rules_version)
        select proposal_id, request_id, client_org_id, painter_org_id, 1, 0, 'x' from public.engagements limit 1`)),
    ).rejects.toThrow(/permission denied/);
  });

  it('só a plataforma confirma dinheiro; cada parte só regista o que lhe cabe', async () => {
    await expect(event(A, 'deposito_confirmado', { amount: 15000 })).rejects.toThrow(/row-level security/);
    await expect(event(P, 'cliente_assinou')).rejects.toThrow(/row-level security/);
    await expect(event(A, 'pintor_assinou')).rejects.toThrow(/row-level security/);
    await expect(event(A, 'cliente_assinou', { reveal: true })).rejects.toThrow(/row-level security/);
    await event(ADMIN, 'deposito_confirmado', { amount: 15000 });
    await event(A, 'cliente_assinou');
  });

  it('as partes não escolhem a hora; a plataforma pode indicar uma hora passada', async () => {
    await event(A, 'litigio_aberto', { at: '2020-01-01T00:00:00Z' });
    await event(ADMIN, 'fee_recebido', { amount: 18450, at: '2020-01-01T00:00:00Z' });
    const rows = await db.query<{ kind: string; year: number }>(
      `select kind, extract(year from at)::int as year from public.engagement_events where engagement_id = $1 and kind in ('litigio_aberto', 'fee_recebido')`,
      [engagementId],
    );
    expect(Object.fromEntries(rows.rows.map((r) => [r.kind, r.year]))).toEqual({ litigio_aberto: new Date().getUTCFullYear(), fee_recebido: 2020 });
    await db.query(`delete from public.engagement_events where engagement_id = $1 and kind in ('litigio_aberto', 'fee_recebido')`, [engagementId]);
  });

  it('os acontecimentos não se alteram', async () => {
    await expect(as(A, () => db.query(`update public.engagement_events set kind = 'pintor_assinou'`))).rejects.toThrow(/permission denied/);
  });

  it('antes da apresentação, o pintor não vê o cliente, o pedido nem o prédio', async () => {
    const rows = await as(P, async () => [
      ...(await db.query('select id from public.organizations where id = $1', [condo])).rows,
      ...(await db.query('select id from public.work_requests where id = $1', [requestId])).rows,
      ...(await db.query('select b.id from public.buildings b')).rows,
    ]);
    expect(rows).toEqual([]);
  });

  it('com a comissão confirmada, as partes veem-se; o outro pintor e os outros condomínios não', async () => {
    await event(ADMIN, 'fee_recebido', { amount: 18450, reveal: true });
    const painterSees = await as(P, async () => ({
      orgs: (await db.query<{ id: string }>('select id from public.organizations')).rows.map((r) => r.id),
      req: (await db.query('select morada from public.buildings')).rows.length,
      request: (await db.query('select id from public.work_requests')).rows.map((r) => (r as { id: string }).id),
    }));
    expect(painterSees.orgs).toContain(condo);
    expect(painterSees.orgs).not.toContain(adminOrg);
    expect(painterSees.req).toBe(1);
    expect(painterSees.request).toEqual([requestId]);
    const painterOrg = (await one<{ painter_org_id: string }>('select painter_org_id from public.engagements where id = $1', [engagementId])).painter_org_id;
    const clientSees = await as(A, async () => (await db.query('select id from public.organizations where id = $1', [painterOrg])).rows);
    expect(clientSees).toHaveLength(1);
    const rival = await as(P2, async () => (await db.query('select id from public.organizations where id = $1', [condo])).rows);
    expect(rival).toEqual([]);
  });

  it('a falhada só com valores a transitar; depois escolhe-se outra e a nova contratação herda-os', async () => {
    const other = (await one<{ id: string }>(`select id from public.proposals where request_id = $1 and status = 'nao_selecionada'`, [requestId])).id;
    await expect(as(A, () => db.query('select public.reselect_proposal($1)', [other]))).rejects.toThrow(/falhou/);
    await event(A, 'transitar');
    await as(A, () => db.query('select public.reselect_proposal($1)', [other]));
    const next = await one<{ carried_from: string }>('select carried_from from public.engagements where proposal_id = $1', [other]);
    expect(next.carried_from).toBe(engagementId);
  });
});

describe('denúncias de anúncios', () => {
  const P = '00000000-0000-4000-8000-0000000000e1';
  let requestId: string;
  let reportId: string;

  beforeAll(async () => {
    const buildingId = (await one<{ id: string }>('select id from public.buildings where org_id = $1 limit 1', [condo])).id;
    requestId = (
      await as(A, () =>
        one<{ id: string }>(
          `insert into public.work_requests (org_id, building_id, titulo, tipo_obra, descricao, prazo_propostas)
           values ($1, $2, 'muro', 'muros', $3, current_date + 10) returning id`,
          [condo, buildingId, 'Pintura do muro de vedação com 40 metros lineares.'],
        ),
      )
    ).id;
    await as(A, () => db.query(`insert into public.request_surfaces (request_id, kind, area_direta_cm2) values ($1, 'muro', 8000)`, [requestId]));
    await as(A, () => db.query(`update public.work_requests set status = 'publicado' where id = $1`, [requestId]));
  });

  it('só um pintor denuncia um anúncio aberto, e não decide a denúncia', async () => {
    await expect(
      as(B, () => db.query(`insert into public.listing_reports (request_id, motivo) values ($1, 'O texto tem o nome do prédio.')`, [requestId])),
    ).rejects.toThrow(/row-level security/);
    await expect(
      as(P, () =>
        db.query(`insert into public.listing_reports (request_id, motivo, status) values ($1, 'O texto tem o nome do prédio.', 'suspenso')`, [requestId]),
      ),
    ).rejects.toThrow(/row-level security/);
    reportId = (
      await as(P, () =>
        one<{ id: string }>(`insert into public.listing_reports (request_id, motivo) values ($1, 'O texto tem o nome do prédio.') returning id`, [requestId]),
      )
    ).id;
  });

  it('o cliente não vê denúncias pendentes nem quem denunciou', async () => {
    expect(await as(A, async () => (await db.query('select id from public.listing_reports')).rows)).toEqual([]);
  });

  it('só a plataforma decide; suspender devolve o pedido a rascunho e o cliente vê o motivo', async () => {
    await expect(as(A, () => db.query('select public.resolve_listing_report($1, true, $2)', [reportId, 'x']))).rejects.toThrow(/Sem permissão/);
    await as(ADMIN, () => db.query('select public.resolve_listing_report($1, true, $2)', [reportId, 'Retire o nome do prédio do texto.']));
    const req = await one<{ status: string; version: number }>('select status, version from public.work_requests where id = $1', [requestId]);
    expect(req).toEqual({ status: 'rascunho', version: 2 });
    const seen = await as(A, async () => (await db.query<{ resolucao: string }>('select resolucao from public.listing_reports')).rows);
    expect(seen).toEqual([{ resolucao: 'Retire o nome do prédio do texto.' }]);
  });
});

describe('catálogo de fornecedores', () => {
  const F = '00000000-0000-4000-8000-0000000000f1'; // fornecedor
  let supplier: string;
  let productId: string;
  const product = (user: string, org: string) =>
    as(user, () =>
      one<{ id: string }>(
        `insert into public.products (org_id, nome, marca, tipo, rendimento, preco_referencia_cents, preco_data)
         values ($1, 'Acrílica Mate', 'Marca X', 'tinta_exterior', 1200, 8990, current_date) returning id`,
        [org],
      ),
    );

  beforeAll(async () => {
    await db.query('insert into auth.users (id, email) values ($1, $2)', [F, email(F)]);
    supplier = (await createOrg(F, 'fornecedor', 'Tintas Exemplo', '503004642')).id;
  });

  it('só um fornecedor cria produtos, e só para si', async () => {
    await expect(product(A, condo)).rejects.toThrow(/row-level security/);
    await expect(product(B, supplier)).rejects.toThrow(/row-level security/);
    productId = (await product(F, supplier)).id;
  });

  it('um preço sem data é recusado', async () => {
    await expect(
      as(F, () =>
        db.query(`insert into public.products (org_id, nome, marca, tipo, preco_referencia_cents) values ($1, 'x', 'y', 'outro', 100)`, [supplier]),
      ),
    ).rejects.toThrow(/products_price_dated/);
  });

  it('qualquer conta vê produtos ativos; desativado, só o fornecedor', async () => {
    expect(await as(B, async () => (await db.query('select id from public.products')).rows)).toHaveLength(1);
    await as(F, () => db.query('update public.products set ativo = false where id = $1', [productId]));
    expect(await as(B, async () => (await db.query('select id from public.products')).rows)).toEqual([]);
    expect(await as(F, async () => (await db.query('select id from public.products')).rows)).toHaveLength(1);
  });

  it('não se apaga nem se altera por terceiros', async () => {
    await expect(as(F, () => db.query('delete from public.products where id = $1', [productId]))).rejects.toThrow(/permission denied/);
    const rows = await as(B, async () => (await db.query(`update public.products set nome = 'x' where id = $1 returning id`, [productId])).rows);
    expect(rows).toEqual([]);
  });

  it('a ficha técnica só entra na pasta do fornecedor', async () => {
    await as(F, () => db.query(`insert into storage.objects (bucket_id, name) values ('fichas', $1)`, [`${supplier}/ficha.pdf`]));
    await expect(
      as(A, () => db.query(`insert into storage.objects (bucket_id, name) values ('fichas', $1)`, [`${condo}/ficha.pdf`])),
    ).rejects.toThrow(/row-level security/);
  });
});

describe('complementos: versões, convites, avaliações e avisos', () => {
  const P = '00000000-0000-4000-8000-0000000000e1';
  const P2 = '00000000-0000-4000-8000-0000000000e2';

  it('cada submissão guarda uma versão que o cliente pode ver', async () => {
    const v = await as(A, async () => (await db.query<{ version: number; snapshot: { lines: unknown[] } }>('select version, snapshot from public.proposal_versions')).rows);
    expect(v.length).toBeGreaterThan(0);
    expect(v[0]!.snapshot.lines.length).toBeGreaterThan(0);
    await expect(as(A, () => db.query('delete from public.proposal_versions'))).rejects.toThrow(/permission denied/);
  });

  it('só a plataforma convida pintores, para anúncios abertos', async () => {
    const buildingId = (await one<{ id: string }>('select id from public.buildings where org_id = $1 limit 1', [condo])).id;
    const req = (
      await as(A, () =>
        one<{ id: string }>(
          `insert into public.work_requests (org_id, building_id, titulo, tipo_obra, descricao, prazo_propostas)
           values ($1, $2, 'escadas', 'zonas_comuns', $3, current_date + 10) returning id`,
          [condo, buildingId, 'Pintura das escadas e do átrio do prédio, três pisos.'],
        ),
      )
    ).id;
    await as(A, () => db.query(`insert into public.request_surfaces (request_id, kind, area_direta_cm2) values ($1, 'escadas_atrio', 9000)`, [req]));
    await as(A, () => db.query(`update public.work_requests set status = 'publicado' where id = $1`, [req]));
    const painter2 = (await one<{ id: string }>(`select id from public.organizations where nome = 'Pinturas Dois'`)).id;
    await expect(as(A, () => db.query('insert into public.listing_invites (request_id, painter_org_id) values ($1, $2)', [req, painter2]))).rejects.toThrow(
      /row-level security/,
    );
    await as(ADMIN, () => db.query('insert into public.listing_invites (request_id, painter_org_id) values ($1, $2)', [req, painter2]));
    expect(await as(P2, async () => (await db.query('select id from public.listing_invites')).rows)).toHaveLength(1);
    expect(await as(P, async () => (await db.query('select id from public.listing_invites')).rows)).toEqual([]);
    const notes = await as(P2, async () => (await db.query<{ texto: string }>('select texto from public.notifications')).rows.map((r) => r.texto));
    expect(notes).toContain('Foi convidado a orçamentar um pedido.');
  });

  it('avaliação só depois da assinatura; o pintor responde mas não altera', async () => {
    const e = await one<{ id: string }>(`select e.id from public.engagements e join public.proposals p on p.id = e.proposal_id where p.status = 'selecionada'`);
    const review = (user: string) =>
      as(user, () => db.query(`insert into public.reviews (engagement_id, qualidade, prazo, comunicacao, comentario) values ($1, 5, 4, 5, 'Bom trabalho.')`, [e.id]));
    await expect(review(A)).rejects.toThrow(/row-level security/);
    await db.query(`insert into public.engagement_events (engagement_id, kind, actor) values ($1, 'pintor_assinou', $2)`, [e.id, ADMIN]);
    await expect(review(P2)).rejects.toThrow(/row-level security/);
    await review(A);
    const painter = (await one<{ painter_org_id: string }>('select painter_org_id from public.engagements where id = $1', [e.id])).painter_org_id;
    const owner = (await one<{ user_id: string }>(`select user_id from public.org_members where org_id = $1 and role = 'proprietario'`, [painter])).user_id;
    await expect(as(owner, () => db.query(`update public.reviews set qualidade = 1 where engagement_id = $1`, [e.id]))).rejects.toThrow(/não altera/);
    await as(owner, () => db.query(`update public.reviews set resposta = 'Obrigado.' where engagement_id = $1`, [e.id]));
    const r = await one<{ qualidade: number; resposta: string }>('select qualidade, resposta from public.reviews where engagement_id = $1', [e.id]);
    expect(r).toEqual({ qualidade: 5, resposta: 'Obrigado.' });
    await expect(as(A, () => db.query('delete from public.reviews'))).rejects.toThrow(/permission denied/);
  });

  it('avisos: só os membros veem e só marcam como lidos', async () => {
    const mine = await as(A, async () => (await db.query<{ id: string }>('select id from public.notifications')).rows);
    expect(mine.length).toBeGreaterThan(0);
    await expect(as(A, () => db.query(`update public.notifications set texto = 'x'`))).rejects.toThrow(/permission denied/);
    await as(A, () => db.query('update public.notifications set lida_em = now()'));
    expect(await as(B, async () => (await db.query('select id from public.notifications')).rows)).toEqual([]);
  });
});

describe('materiais certificados, encomendas e ferramentas de obra', () => {
  const F = '00000000-0000-4000-8000-0000000000f1'; // fornecedor criado acima
  let supplier: string;
  let productId: string;
  let engagementId: string;
  let painterOwner: string;
  let orderId: string;

  beforeAll(async () => {
    supplier = (await one<{ id: string }>(`select id from public.organizations where kind = 'fornecedor' limit 1`)).id;
    productId = (
      await as(F, () =>
        one<{ id: string }>(
          `insert into public.products (org_id, nome, marca, tipo, unidade, preco_fornecedor_cents) values ($1, 'Primário Fixador', 'Marca X', 'primario', 'L', 5000) returning id`,
          [supplier],
        ),
      )
    ).id;
    const e = await one<{ id: string; painter_org_id: string }>(
      `select e.id, e.painter_org_id from public.engagements e join public.proposals p on p.id = e.proposal_id where p.status = 'selecionada'`,
    );
    engagementId = e.id;
    painterOwner = (await one<{ user_id: string }>(`select user_id from public.org_members where org_id = $1 and role = 'proprietario'`, [e.painter_org_id])).user_id;
  });

  it('qualquer conta vê o fornecedor e os contactos; descontos só pelo fornecedor', async () => {
    expect(await as(B, async () => (await db.query('select id from public.organizations where id = $1', [supplier])).rows)).toHaveLength(1);
    await expect(
      as(B, () => db.query(`insert into public.supplier_discounts (org_id, tipo, desconto_bps) values ($1, 'primario', 1000)`, [supplier])),
    ).rejects.toThrow(/row-level security/);
    await as(F, () => db.query(`insert into public.supplier_discounts (org_id, tipo, max_area_cm2, desconto_bps) values ($1, 'primario', 100000, 1000)`, [supplier]));
    await as(F, () => db.query(`insert into public.supplier_delivery (org_id, concelhos, incluida, minimo_cents) values ($1, '{Lisboa}', true, 50000)`, [supplier]));
    expect(await as(B, async () => (await db.query('select id from public.supplier_discounts')).rows)).toHaveLength(1);
  });

  it('o desconto de um produto tem de ser do próprio fornecedor', async () => {
    const other = (await createOrg(F, 'fornecedor', 'Tintas Dois', '504426290')).id;
    await expect(
      as(F, () => db.query(`insert into public.supplier_discounts (org_id, product_id, desconto_bps) values ($1, $2, 500)`, [other, productId])),
    ).rejects.toThrow(/foreign key/);
  });

  it('o pintor encomenda; só o fornecedor confirma e entrega; o cliente vê', async () => {
    await expect(
      as(A, () => db.query('insert into public.material_orders (engagement_id, product_id, embalagens) values ($1, $2, 3)', [engagementId, productId])),
    ).rejects.toThrow(/row-level security/);
    orderId = (
      await as(painterOwner, () =>
        one<{ id: string; estado: string }>(
          `insert into public.material_orders (engagement_id, product_id, embalagens, estado) values ($1, $2, 3, 'entregue') returning id, estado`,
          [engagementId, productId],
        ),
      )
    ).id;
    expect((await one<{ estado: string }>('select estado from public.material_orders where id = $1', [orderId])).estado).toBe('pedida');
    await expect(as(painterOwner, () => db.query(`update public.material_orders set estado = 'confirmada' where id = $1`, [orderId]))).rejects.toThrow(
      /Só o fornecedor/,
    );
    await as(F, () => db.query(`update public.material_orders set estado = 'confirmada' where id = $1`, [orderId]));
    await as(F, () => db.query(`update public.material_orders set estado = 'entregue' where id = $1`, [orderId]));
    const seen = await as(A, async () => (await db.query<{ estado: string }>('select estado from public.material_orders')).rows);
    expect(seen).toEqual([{ estado: 'entregue' }]);
    const painterOrg = (await one<{ painter_org_id: string }>('select painter_org_id from public.material_orders where id = $1', [orderId])).painter_org_id;
    expect(await as(F, async () => (await db.query('select id from public.organizations where id = $1', [painterOrg])).rows)).toHaveLength(1);
  });

  it('só avalia o fornecedor quem lhe comprou', async () => {
    await expect(
      as(B, () => db.query(`insert into public.supplier_reviews (supplier_org_id, painter_org_id, produto, entrega, atendimento) values ($1, $1, 5, 5, 5)`, [supplier])),
    ).rejects.toThrow(/row-level security/);
    const painterOrg = (await one<{ painter_org_id: string }>('select painter_org_id from public.engagements where id = $1', [engagementId])).painter_org_id;
    await as(painterOwner, () =>
      db.query(`insert into public.supplier_reviews (supplier_org_id, painter_org_id, produto, entrega, atendimento) values ($1, $2, 5, 4, 5)`, [supplier, painterOrg]),
    );
    await as(painterOwner, () => db.query(`update public.supplier_reviews set entrega = 5 where supplier_org_id = $1`, [supplier]));
  });

  it('ferramentas de obra: só a equipa do pintor', async () => {
    await as(painterOwner, () =>
      db.query(`insert into public.worksite_entries (engagement_id, painter_org_id, tipo, valor_cents, categoria) values ($1, $1, 'custo', 15000, 'material')`, [engagementId]),
    );
    const painterOrg = (await one<{ painter_org_id: string }>('select painter_org_id from public.engagements where id = $1', [engagementId])).painter_org_id;
    expect((await one<{ painter_org_id: string }>('select painter_org_id from public.worksite_entries limit 1')).painter_org_id).toBe(painterOrg);
    expect(await as(A, async () => (await db.query('select id from public.worksite_entries')).rows)).toEqual([]);
    expect(await as(ADMIN, async () => (await db.query('select id from public.worksite_entries')).rows)).toEqual([]);
    await expect(
      as(A, () => db.query(`insert into public.worksite_phases (engagement_id, painter_org_id, nome) values ($1, $1, 'x')`, [engagementId])),
    ).rejects.toThrow(/row-level security/);
  });
});
