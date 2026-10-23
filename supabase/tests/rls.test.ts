import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import { beforeAll, describe, expect, it } from 'vitest';
import { INVALID_NIFS, VALID_NIFS } from '../../src/domain/nif.vectors';
import { referralDiscountBp } from '../../src/domain/referralEligibility';
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

  it('a habilitação validada fica registada na proposta, sem bloquear', async () => {
    await db.query(
      `insert into public.org_documents (org_id, kind, storage_path, nome_ficheiro, status, submitted_by) values ($1, 'certificado_impic', 'c/x.pdf', 'x.pdf', 'aprovado', $2)`,
      [painterOrg, A],
    );
  });

  it('as linhas só se ligam a zonas do próprio pedido', async () => {
    const zone = (await one<{ id: string }>('select id from public.request_surfaces where request_id = $1 limit 1', [requestId])).id;
    const ins = (z: string) =>
      as(P, () =>
        db.query(
          `insert into public.proposal_lines (proposal_id, categoria, descricao, quantidade, preco_unitario_cents, inclusao, surface_ids)
           values ($1, 'pintura', 'Zona de teste', 100, 100, 'opcional', array[$2]::uuid[]) returning id`,
          [mine, z],
        ),
      );
    await expect(ins('00000000-0000-4000-8000-00000000dead')).rejects.toThrow(/não pertence/);
    const ok = await ins(zone);
    await as(P, () => db.query('delete from public.proposal_lines where id = $1', [(ok.rows[0] as { id: string }).id]));
  });

  it('orçamento guiado: trabalhos e estados nas linhas, preço global e IVA livre até 30%', async () => {
    const line = await as(P, () =>
      db.query(
        `insert into public.proposal_lines (proposal_id, categoria, descricao, quantidade, preco_unitario_cents, inclusao, trabalho, detalhes)
         values ($1, 'preparacao', 'Lavagem e limpeza', 100, 0, 'nao_incluido', 'lavagem', '{"key":"lavagem","estado":"nao_incluido","ordem":0}'::jsonb) returning id`,
        [mine],
      ),
    );
    await as(P, () => db.query('delete from public.proposal_lines where id = $1', [(line.rows[0] as { id: string }).id]));
    await as(P, () => db.query(`update public.proposals set iva_bps = 600, modo_preco = 'global' where id = $1`, [mine]));
    await expect(as(P, () => db.query(`update public.proposals set iva_bps = 3100 where id = $1`, [mine]))).rejects.toThrow(/proposals_iva_bps_range|check/);
    await expect(as(P, () => db.query(`update public.proposals set modo_preco = 'x' where id = $1`, [mine]))).rejects.toThrow(/check/);
    await as(P, () => db.query(`update public.proposals set iva_bps = 2300, modo_preco = 'detalhado' where id = $1`, [mine]));
  });

  it('código de adesão: o fornecedor cria, o pintor aplica ao rascunho e só por aí', async () => {
    const S = '00000000-0000-4000-8000-0000000000f5';
    await db.query('insert into auth.users (id, email) values ($1, $2)', [S, 'zz-test-forn@exemplo.pt']);
    const supplier = (await createOrg(S, 'fornecedor', 'Tintas Aderentes Lda', '501234560')).id;
    const mk = (user: string, org: string, code: string) =>
      as(user, () => db.query(`insert into public.referral_codes (supplier_org_id, code) values ($1, $2) returning id`, [org, code]));
    await expect(mk(P, painterOrg, 'ABCD1234')).rejects.toThrow(/row-level security/);
    await expect(mk(S, supplier, 'abc')).rejects.toThrow(/check/);
    const created = await mk(S, supplier, 'ABCD1234');
    const codeId = (created.rows[0] as { id: string }).id;
    // O pintor não vê códigos nem altera a coluna diretamente.
    expect(await as(P, async () => (await db.query('select 1 from public.referral_codes')).rows)).toEqual([]);
    await expect(as(P, () => db.query(`update public.proposals set referral_code_id = $2 where id = $1`, [mine, codeId]))).rejects.toThrow(/função própria/);
    await expect(as(P, () => db.query(`select public.apply_referral_code($1, 'ZZZZZZZZ')`, [mine]))).rejects.toThrow(/inválido/);
    await expect(as(S, () => db.query(`select public.apply_referral_code($1, 'ABCD1234')`, [mine]))).rejects.toThrow(/não encontrada/);
    const name = await as(P, () => one<{ apply_referral_code: string }>(`select public.apply_referral_code($1, ' abcd1234 ')`, [mine]));
    expect(name.apply_referral_code).toBe('Tintas Aderentes Lda');
    // Atribuído a este pintor: outro não o usa.
    await expect(as(P2, () => db.query(`select public.apply_referral_code($1, 'ABCD1234')`, [other]))).rejects.toThrow(/outra empresa/);
    // O fornecedor não altera o código além de o ativar e anotar.
    await expect(as(S, () => db.query(`update public.referral_codes set max_wins = 99 where id = $1`, [codeId]))).rejects.toThrow(/permission denied/);
  });

  it('duas organizações-fornecedor não partilham o mesmo NIF', async () => {
    const S2 = '00000000-0000-4000-8000-0000000000f6';
    const S3 = '00000000-0000-4000-8000-0000000000f7';
    await db.query('insert into auth.users (id, email) values ($1, $2), ($3, $4)', [S2, 'zz-test-forn2@exemplo.pt', S3, 'zz-test-forn3@exemplo.pt']);
    await createOrg(S2, 'fornecedor', 'Tintas Um', '455000000');
    await expect(createOrg(S3, 'fornecedor', 'Tintas Dois', '455000000')).rejects.toThrow();
  });

  it('não submete sem linhas incluídas; submetida fixa a base e fica imutável', async () => {
    // Condições do orçamento: sem mão-de-obra, seguros e plano de pagamentos a 100% não se submete.
    const upd = async (sql: string) => {
      await as(P, () => db.query(`update public.proposals set ${sql} where id = $1`, [mine]));
      await as(P2, () => db.query(`update public.proposals set ${sql} where id = $1`, [other]));
    };
    await expect(setStatus(P, mine, 'submetida')).rejects.toThrow(/mão-de-obra qualificada/);
    await upd('confirma_mao_obra = true');
    await expect(setStatus(P, mine, 'submetida')).rejects.toThrow(/seguros/);
    await upd(`seguro_rc = 'sim', seguro_at = 'nao'`);
    await expect(setStatus(P, mine, 'submetida')).rejects.toThrow(/100%/);
    await upd(`fases = '[{"nome":"No início","bps":3000},{"nome":"No fim","bps":6000}]'::jsonb`);
    await expect(setStatus(P, mine, 'submetida')).rejects.toThrow(/100%/);
    await upd(`fases = '[{"nome":"No início","bps":3000},{"nome":"No fim","bps":7000}]'::jsonb`);
    await expect(setStatus(P2, other, 'submetida')).rejects.toThrow(/pelo menos uma linha/);
    await setStatus(P, mine, 'submetida');
    const r = await one<{ base_cents: string; iva_cents: string; request_version: number; pintor_verificado: boolean }>(
      'select base_cents, iva_cents, request_version, pintor_verificado from public.proposals where id = $1',
      [mine],
    );
    expect([Number(r.base_cents), Number(r.iva_cents), r.request_version, r.pintor_verificado]).toEqual([137275, 31573, 1, true]);
    await expect(as(P, () => db.query(`update public.proposals set notas = 'x' where id = $1`, [mine]))).rejects.toThrow(/não pode ser alterada/);
    await expect(addLine(P, mine, 1)).rejects.toThrow(/row-level security/);
    await addLine(P2, other, 900);
    await setStatus(P2, other, 'submetida');
    const ok = async (id: string) => (await one<{ habilitacao_ok: boolean }>('select habilitacao_ok from public.proposals where id = $1', [id])).habilitacao_ok;
    expect([await ok(mine), await ok(other)]).toEqual([true, false]);
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

  it('com código, a contratação usa o desconto ambiente e nasce a comissão do fornecedor por volume', async () => {
    const e = await one<{ id: string; rules_version: string; referral_discount_bp: number }>(
      'select e.id, e.rules_version, e.referral_discount_bp from public.engagements e where e.proposal_id = $1',
      [mine],
    );
    // A versão em vigor fica sem sufixo: o desconto do pintor vive em referral_discount_bp (0,25 p.p., 1 fornecedor ligado).
    expect(e.rules_version).toBe(CURRENT_RULES.version);
    expect(e.referral_discount_bp).toBe(25);
    const pay = await one<{ id: string; amount_cents: number; estado: string; fee_recebido_em: string | null; supplier_org_id: string }>(
      'select id, amount_cents, estado, fee_recebido_em, supplier_org_id from public.referral_payouts where engagement_id = $1',
      [e.id],
    );
    expect([pay.amount_cents, pay.estado, pay.fee_recebido_em]).toEqual([1373, 'adjudicada', null]); // 1% de 1372,75 € (1.ª obra do fornecedor)
    const S = '00000000-0000-4000-8000-0000000000f5';
    expect(await as(S, async () => (await db.query('select 1 from public.referral_payouts')).rows)).toHaveLength(1);
    expect(await as(P2, async () => (await db.query('select 1 from public.referral_payouts')).rows)).toEqual([]);
    // Sem dados de pagamento nem saldo (a comissão do pintor ainda não entrou), não há resgate.
    await expect(as(S, () => db.query(`select public.referral_request_redemption($1)`, [pay.supplier_org_id]))).rejects.toThrow(/IBAN/);
  });

  it('código de adesão: desconto ambiente por todos os fornecedores ligados, comissão do fornecedor por volume', async () => {
    // Um segundo fornecedor liga-se ao mesmo pintor diretamente (sem passar por apply_referral_code, já testado).
    const S2 = '00000000-0000-4000-8000-0000000000f8';
    await db.query('insert into auth.users (id, email) values ($1, $2)', [S2, 'zz-test-forn4@exemplo.pt']);
    const supplier2 = (await createOrg(S2, 'fornecedor', 'Vernizes Dois', '123456789')).id;
    await db.query(`insert into public.referral_codes (supplier_org_id, code, painter_org_id) values ($1, 'EFGH5678', $2)`, [supplier2, painterOrg]);

    const buildingId = (await one<{ id: string }>('select id from public.buildings where org_id = $1 limit 1', [condo])).id;
    const win = async () => {
      requestId = (
        await as(A, () =>
          one<{ id: string }>(
            `insert into public.work_requests (org_id, building_id, titulo, tipo_obra, descricao, prazo_propostas)
             values ($1, $2, 'Rua A, 1 — outra obra', 'fachadas', 'Outra obra, para testar o código de adesão cumulativo.', current_date + 10) returning id`,
            [condo, buildingId],
          ),
        )
      ).id;
      await as(A, () => db.query(`insert into public.request_surfaces (request_id, kind, area_direta_cm2) values ($1, 'fachada', 16150)`, [requestId]));
      await as(A, () => db.query(`update public.work_requests set status = 'publicado' where id = $1`, [requestId]));
      const id = (await proposal(P, painterOrg)).id;
      await addLine(P, id, 850);
      await as(P, () => db.query(`select public.apply_referral_code($1, 'ABCD1234')`, [id]));
      await as(P, () =>
        db.query(
          `update public.proposals set confirma_mao_obra = true, seguro_rc = 'sim', seguro_at = 'nao',
             fases = '[{"nome":"No início","bps":3000},{"nome":"No fim","bps":7000}]'::jsonb where id = $1`,
          [id],
        ),
      );
      await setStatus(P, id, 'submetida');
      await as(A, () => db.query('select public.select_proposal($1)', [id]));
      return id;
    };

    // 2.ª obra deste fornecedor (a 1.ª foi no teste anterior): ainda 1%. Reaplicar o mesmo código já não falha com
    // "já foi utilizado" — a relação fica ativa até o fornecedor a desligar. O desconto do pintor já reflete os
    // DOIS fornecedores ligados (50 p.b.), nesta proposta tal como em qualquer outra: não é preciso voltar a
    // aplicar o código do segundo fornecedor em cada proposta.
    const id2 = await win();
    const e2 = await one<{ referral_discount_bp: number }>('select referral_discount_bp from public.engagements where proposal_id = $1', [id2]);
    expect(e2.referral_discount_bp).toBe(50);
    const pay2 = await one<{ amount_cents: number }>('select amount_cents from public.referral_payouts where proposal_id = $1', [id2]);
    expect(pay2.amount_cents).toBe(1373); // 1% de 1372,75 € (2.ª obra deste fornecedor, ainda antes da 3.ª)

    // 3.ª obra deste fornecedor nos últimos 2 meses: sobe a 2%. As duas primeiras não mudam (nunca retroativo).
    const id3 = await win();
    const pay3 = await one<{ amount_cents: number }>('select amount_cents from public.referral_payouts where proposal_id = $1', [id3]);
    expect(pay3.amount_cents).toBe(2746); // 2% de 1372,75 €
    const olderStillAt1 = await one<{ amount_cents: number }>('select amount_cents from public.referral_payouts where proposal_id = $1', [id2]);
    expect(olderStillAt1.amount_cents).toBe(1373);
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
    // A mais antiga: o teste do código de adesão cumulativo (acima) já selecionou mais propostas depois desta.
    const e = await one<{ id: string; request_id: string }>(
      `select e.id, e.request_id from public.engagements e join public.proposals p on p.id = e.proposal_id
       where p.status = 'selecionada' order by e.created_at asc limit 1`,
    );
    engagementId = e.id;
    requestId = e.request_id;
  });

  it('a escolha cria a contratação com a versão das regras em vigor e o adiantamento', async () => {
    const e = await one<{ rules_version: string; base_cents: string; advance_cents: string }>(
      'select rules_version, base_cents, advance_cents from public.engagements where id = $1',
      [engagementId],
    );
    // Esta proposta levou um código de adesão, mas isso já não muda a versão — vive em referral_discount_bp.
    expect(e.rules_version).toBe(CURRENT_RULES.version);
    expect([Number(e.base_cents), Number(e.advance_cents)]).toEqual([137275, 0]);
  });

  it('cada lado vê a contratação; o pintor não escolhido não', async () => {
    // 3: esta e as duas do teste do código de adesão cumulativo (acima), ambas também do pintor P.
    for (const u of [A, P]) {
      const rows = await as(u, async () => (await db.query('select id from public.engagements')).rows);
      expect(rows).toHaveLength(3);
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

  it('avaliação de cancelamento (AVA-01): revelada mas não assinada já pode ser avaliada, sem entrar na média', async () => {
    // A seguir ao teste anterior: engagementId está revelado (fee_recebido com reveal=true) mas
    // ainda não assinado — o caso que falta a AVA-01 (avaliação de obra cancelada, não só concluída).
    await expect(
      as(P, () => db.query(`insert into public.reviews (engagement_id, qualidade, prazo, comunicacao, comentario) values ($1, 5, 5, 5, 'x')`, [engagementId])),
    ).rejects.toThrow(/row-level security/); // o pintor não avalia, só o cliente
    await as(A, () =>
      db.query(
        `insert into public.reviews (engagement_id, qualidade, prazo, comunicacao, comentario) values ($1, 1, 2, 3, 'Desistiu depois de me conhecer.')`,
        [engagementId],
      ),
    );
    const saved = await one<{ obra_concluida: boolean }>('select obra_concluida from public.reviews where engagement_id = $1', [engagementId]);
    expect(saved.obra_concluida).toBe(false); // calculado no servidor: não há "pintor_assinou"
    const proposalId = (await one<{ proposal_id: string }>('select proposal_id from public.engagements where id = $1', [engagementId])).proposal_id;
    const rating = await as(P, () => one<{ n: number; media: number | null }>('select n, media from public.painter_rating($1)', [proposalId]));
    expect(rating).toEqual({ n: 0, media: null }); // excluída da média: é um sinal de cancelamento, não de qualidade do trabalho
    await db.query('delete from public.reviews where engagement_id = $1', [engagementId]); // não interfere com os testes seguintes
  });

  it('saldo e resgate: regime validado pela equipa, uma fatura por resgate, pagamento líquido de retenção', async () => {
    const S = '00000000-0000-4000-8000-0000000000f5';
    const pay = await one<{ id: string; supplier_org_id: string; fee_recebido_em: string | null; amount_cents: number }>(
      'select id, supplier_org_id, fee_recebido_em, amount_cents from public.referral_payouts where engagement_id = $1',
      [engagementId],
    );
    expect(pay.fee_recebido_em).not.toBeNull();
    const org = pay.supplier_org_id;
    const activity = (user: string) => as(user, async () => (await db.query('select code, pintor, estado from public.referral_activity($1)', [org])).rows);
    // 3: esta obra e as duas do teste do código de adesão cumulativo (acima) — o mesmo código, reutilizado.
    expect(await activity(S)).toEqual(Array(3).fill({ code: 'ABCD1234', pintor: expect.any(String), estado: 'adjudicada' }));
    await expect(activity(P)).rejects.toThrow(/Fornecedor não encontrado/);
    const request = (user: string) => as(user, () => one<{ referral_request_redemption: string }>(`select public.referral_request_redemption($1)`, [org]));
    await expect(request(S)).rejects.toThrow(/IBAN/);
    await expect(
      as(S, () => db.query(`insert into public.supplier_payout_details (org_id, iban, titular) values ($1, 'PT50123', 'Tintas Aderentes Lda')`, [org])),
    ).rejects.toThrow(/check/);
    // O fornecedor declara; não escolhe a retenção nem valida o próprio regime.
    await as(S, () =>
      db.query(
        `insert into public.supplier_payout_details (org_id, iban, titular, cobra_iva, declaracao_retencao, retencao_bps, regime_validado) values ($1, 'PT50000201231234567890154', 'Tintas Aderentes Lda', true, 'sujeito', 2500, true)`,
        [org],
      ),
    );
    const d = await one<{ retencao_bps: number; regime_validado: boolean }>('select retencao_bps, regime_validado from public.supplier_payout_details where org_id = $1', [org]);
    expect([d.retencao_bps, d.regime_validado]).toEqual([0, false]);
    expect(await as(P, async () => (await db.query('select 1 from public.supplier_payout_details')).rows)).toEqual([]);
    await expect(request(S)).rejects.toThrow(/validado/);
    await expect(as(S, () => db.query(`select public.referral_validate_regime($1, 2500, true)`, [org]))).rejects.toThrow(/Só a equipa/);
    await as(ADMIN, () => db.query(`select public.referral_validate_regime($1, 2500, true)`, [org]));
    // Mudar o regime depois de validado exige nova validação e repõe a retenção a zero.
    await as(S, () => db.query(`update public.supplier_payout_details set cobra_iva = false where org_id = $1`, [org]));
    expect((await one<{ regime_validado: boolean }>('select regime_validado from public.supplier_payout_details where org_id = $1', [org])).regime_validado).toBe(false);
    await as(S, () => db.query(`update public.supplier_payout_details set cobra_iva = true where org_id = $1`, [org]));
    await as(ADMIN, () => db.query(`select public.referral_validate_regime($1, 2500, true)`, [org]));
    await expect(request(P)).rejects.toThrow(/não encontrado/);
    const rid = (await request(S)).referral_request_redemption;
    // 1373 (1% da 1.ª obra do fornecedor) + IVA 316 (23%) - retenção 343 (25% de 1373) = 1346.
    const r = await one<{ comissao_cents: number; iva_cents: number; retencao_cents: number; liquido_cents: number; estado: string }>(
      'select comissao_cents, iva_cents, retencao_cents, liquido_cents, estado from public.referral_redemptions where id = $1',
      [rid],
    );
    expect([r.comissao_cents, r.iva_cents, r.retencao_cents, r.liquido_cents, r.estado]).toEqual([pay.amount_cents, 316, 343, 1346, 'pedido']);
    await expect(request(S)).rejects.toThrow(/em curso/);
    const invoice = (user: string, path = `${org}/${rid}.pdf`) =>
      as(user, () => db.query(`select public.referral_redemption_invoice($1, 'FT 2026/1', $2)`, [rid, path]));
    await expect(invoice(P)).rejects.toThrow(/não encontrado/);
    await expect(invoice(S, `${condo}/x.pdf`)).rejects.toThrow(/inválida/);
    await expect(as(S, () => db.query(`select public.referral_redemption_pay($1, 'x')`, [rid]))).rejects.toThrow(/Só a equipa/);
    await expect(as(ADMIN, () => db.query(`select public.referral_redemption_pay($1, 'transf. 1')`, [rid]))).rejects.toThrow(/fatura recebida/);
    await invoice(S);
    await expect(as(S, () => db.query(`select public.referral_redemption_cancel($1, 'x')`, [rid]))).rejects.toThrow(/Não se pode anular/);
    await expect(as(ADMIN, () => db.query(`select public.referral_void($1, 'x')`, [pay.id]))).rejects.toThrow(/Não se pode anular/);
    await as(ADMIN, () => db.query(`select public.referral_redemption_pay($1, 'transf. 1')`, [rid]));
    const done = await one<{ estado: string; paga: string }>(
      `select r.estado, p.estado as paga from public.referral_redemptions r join public.referral_payouts p on p.redemption_id = r.id where r.id = $1`,
      [rid],
    );
    expect([done.estado, done.paga]).toEqual(['paga', 'paga']);
    await expect(request(S)).rejects.toThrow(/saldo/);
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

  it('sem plano de catálogo ativo, o fornecedor não cria produtos', async () => {
    await expect(product(F, supplier)).rejects.toThrow(/row-level security/);
    await expect(
      as(F, () => db.query(`insert into public.supplier_subscriptions (org_id, plan, price_cents) values ($1, 'catalogo', 4900)`, [supplier])),
    ).rejects.toThrow(/row-level security/);
    await as(ADMIN, () => db.query(`insert into public.supplier_subscriptions (org_id, plan, price_cents) values ($1, 'vendedores', 3900)`, [supplier]));
    await expect(product(F, supplier)).rejects.toThrow(/row-level security/);
    await as(ADMIN, () => db.query(`update public.supplier_subscriptions set plan = 'catalogo', price_cents = 4900 where org_id = $1`, [supplier]));
    expect((await as(F, () => db.query('select plan from public.supplier_subscriptions'))).rows).toEqual([{ plan: 'catalogo' }]);
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
    supplier = (await one<{ id: string }>(`select o.id from public.organizations o join public.org_members m on m.org_id = o.id where o.kind = 'fornecedor' and m.user_id = $1`, [F])).id;
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
    await expect(createOrg(F, 'fornecedor', 'Tintas Dois', '504426290')).rejects.toThrow(/uma só empresa/);
    const F2 = '00000000-0000-4000-8000-0000000000f2';
    await db.query('insert into auth.users (id, email) values ($1, $2)', [F2, email(F2)]);
    const other = (await createOrg(F2, 'fornecedor', 'Tintas Dois', '504426290')).id;
    await db.query(`insert into public.supplier_subscriptions (org_id, plan, price_cents) values ($1, 'catalogo', 4900)`, [other]);
    await expect(
      as(F, () => db.query(`insert into public.supplier_discounts (org_id, product_id, desconto_bps) values ($1, $2, 500)`, [other, productId])),
    ).rejects.toThrow(/row-level security|foreign key/);
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

  it('o fornecedor responde a uma avaliação, sem alterar a nota (paridade com reviews.resposta)', async () => {
    await as(F, () => db.query(`update public.supplier_reviews set resposta = 'Obrigado pela compra.' where supplier_org_id = $1`, [supplier]));
    const saved = await one<{ resposta: string; resposta_at: string | null }>(
      'select resposta, resposta_at from public.supplier_reviews where supplier_org_id = $1',
      [supplier],
    );
    expect(saved.resposta).toBe('Obrigado pela compra.');
    expect(saved.resposta_at).not.toBeNull();
    await expect(
      as(F, () => db.query(`update public.supplier_reviews set produto = 1, resposta = 'y' where supplier_org_id = $1`, [supplier])),
    ).rejects.toThrow(/responde, mas não altera/);
    // O pintor continua a poder atualizar a sua avaliação; a resposta do fornecedor não se perde nem se altera.
    await as(painterOwner, () => db.query(`update public.supplier_reviews set entrega = 4 where supplier_org_id = $1`, [supplier]));
    const after = await one<{ entrega: number; resposta: string }>('select entrega, resposta from public.supplier_reviews where supplier_org_id = $1', [supplier]);
    expect(after).toEqual({ entrega: 4, resposta: 'Obrigado pela compra.' });
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

describe('contratos assinados', () => {
  it('cada parte só carrega o seu PDF; o pintor lê o anúncio fechado da sua contratação', async () => {
    const e = await one<{ id: string; painter_org_id: string; request_id: string }>(
      `select e.id, e.painter_org_id, e.request_id from public.engagements e join public.proposals p on p.id = e.proposal_id where p.status = 'selecionada'`,
    );
    const owner = (await one<{ user_id: string }>(`select user_id from public.org_members where org_id = $1 and role = 'proprietario'`, [e.painter_org_id])).user_id;
    const put = (user: string, file: string) => as(user, () => db.query(`insert into storage.objects (bucket_id, name) values ('contratos', $1)`, [`${e.id}/${file}`]));
    await expect(put(owner, 'cliente.pdf')).rejects.toThrow(/row-level security/);
    await expect(put(A, 'pintor.pdf')).rejects.toThrow(/row-level security/);
    await expect(put(B, 'cliente.pdf')).rejects.toThrow(/row-level security/);
    await put(A, 'cliente.pdf');
    await put(owner, 'pintor.pdf');
    expect(await as(owner, async () => (await db.query(`select name from storage.objects where bucket_id = 'contratos'`)).rows)).toHaveLength(2);
    expect(await as(B, async () => (await db.query(`select name from storage.objects where bucket_id = 'contratos'`)).rows)).toEqual([]);
    expect(await as(owner, async () => (await db.query('select ref from public.request_listings where request_id = $1', [e.request_id])).rows)).toHaveLength(1);
  });
});

describe('manutenção diária e avisos de versão', () => {
  it('expira documentos, fecha anúncios fora de prazo e avisa', async () => {
    const doc = await one<{ id: string; org_id: string }>(
      `insert into public.org_documents (org_id, kind, storage_path, nome_ficheiro, status, valido_ate, submitted_by)
       values ($1, 'outro', 'x/y.pdf', 'y.pdf', 'aprovado', current_date - 1, $2) returning id, org_id`,
      [condo, A],
    );
    const open = await one<{ request_id: string }>('select request_id from public.request_listings where aberto limit 1');
    await db.query('update public.request_listings set prazo_propostas = current_date - 1 where request_id = $1', [open.request_id]);
    await db.query('select private.daily_maintenance()');
    expect((await one<{ status: string }>('select status from public.org_documents where id = $1', [doc.id])).status).toBe('expirado');
    expect((await one<{ aberto: boolean }>('select aberto from public.request_listings where request_id = $1', [open.request_id])).aberto).toBe(false);
    const notes = await as(A, async () => (await db.query<{ texto: string }>('select texto from public.notifications')).rows.map((r) => r.texto));
    expect(notes).toContain('Um documento de verificação expirou: envie a versão atual.');
    expect(notes).toContain('Terminou o prazo de propostas: compare e escolha.');
  });

  it('ninguém corre a manutenção pela API', async () => {
    await expect(as(A, () => db.query('select private.daily_maintenance()'))).rejects.toThrow(/permission denied/);
  });
});

describe('habilitação pelo valor', () => {
  it('a base de dados usa os mesmos limites que o domínio', async () => {
    const { requiredLicense } = await import('../../src/domain/license');
    const org = (await one<{ id: string }>(`select id from public.organizations where nome = 'Pinturas Dois'`)).id;
    await db.query(
      `insert into public.org_documents (org_id, kind, storage_path, nome_ficheiro, status, classe, submitted_by) values ($1, 'alvara_impic', 'a/x.pdf', 'x.pdf', 'aprovado', 2, $2)`,
      [org, A],
    );
    for (const base of [4_000_000, 4_000_001, 20_000_000, 40_000_000, 40_000_001, 90_000_000]) {
      const need = requiredLicense(base);
      const ok = (await one<{ ok: boolean }>('select private.license_ok($1, $2) ok', [org, base])).ok;
      expect(ok).toBe(need.kind === 'certificado' || need.classe <= 2);
    }
  });
});

describe('licenças no anúncio', () => {
  it('a ocupação da via pública passa do pedido para o anúncio', async () => {
    const buildingId = (await one<{ id: string }>('select id from public.buildings where org_id = $1 limit 1', [condo])).id;
    const id = (
      await as(A, () =>
        one<{ id: string }>(
          `insert into public.work_requests (org_id, building_id, titulo, tipo_obra, descricao, prazo_propostas, ocupacao_via_publica)
           values ($1, $2, 'fachada rua', 'fachadas', $3, current_date + 10, 'sim') returning id`,
          [condo, buildingId, 'Pintura da fachada principal, com andaime no passeio.'],
        ),
      )
    ).id;
    await as(A, () => db.query(`insert into public.request_surfaces (request_id, kind, area_direta_cm2) values ($1, 'fachada', 9000)`, [id]));
    await as(A, () => db.query(`update public.work_requests set status = 'publicado' where id = $1`, [id]));
    expect((await one<{ v: string }>('select ocupacao_via_publica v from public.request_listings where request_id = $1', [id])).v).toBe('sim');
  });
});

describe('códigos promocionais dos fornecedores', () => {
  const F = '00000000-0000-4000-8000-0000000000f1'; // fornecedor criado acima
  it('só a equipa da plataforma cria e vê; o fornecedor confirma um código válido', async () => {
    await expect(as(A, () => db.query(`insert into public.promo_codes (code, discount_bps, created_by) values ('NAO-PODE', 1000, $1)`, [A]))).rejects.toThrow(
      /row-level security/,
    );
    await as(ADMIN, () => db.query(`insert into public.promo_codes (code, discount_bps, max_uses) values ('ARRANQUE', 5000, 1)`));
    await expect(as(ADMIN, () => db.query(`insert into public.promo_codes (code, discount_bps) values ('ZERO', 50)`))).rejects.toThrow(/check/);
    expect((await as(A, () => db.query('select * from public.promo_codes'))).rows).toHaveLength(0);
    const check = (u: string) => as(u, async () => (await one<{ d: number | null }>(`select public.check_promo_code(' arranque ') d`)).d);
    expect(await check(F)).toBe(5000);
    expect(await check(A)).toBeNull();
    await db.query(`update public.promo_codes set uses = 1 where code = 'ARRANQUE'`);
    expect(await check(F)).toBeNull();
  });
});

describe('subscrições e descontos por cliente', () => {
  const PAINTER3 = '00000000-0000-4000-8000-0000000000f3'; // cliente novo, só para o desconto/carteira por cliente
  it('lista de fornecedores ativos; desconto visível ao fornecedor e ao cliente escolhido, nunca a terceiros', async () => {
    const supplier = (await one<{ id: string }>(`select id from public.organizations where nome = 'Tintas Exemplo'`)).id;
    const active = await as(A, async () => (await db.query<{ s: string }>(`select public.active_suppliers('catalogo') s`)).rows.map((r) => r.s));
    expect(active).toContain(supplier);

    await db.query('insert into auth.users (id, email) values ($1, $2)', [PAINTER3, email(PAINTER3)]);
    const painter = (await createOrg(PAINTER3, 'pintor', 'Pinturas da Carteira Lda', '610000039')).id;
    const F = '00000000-0000-4000-8000-0000000000f1';
    await as(F, () => db.query(`insert into public.supplier_discounts (org_id, painter_org_id, desconto_bps) values ($1, $2, 2500)`, [supplier, painter]));

    expect(await as(A, async () => (await db.query(`select id from public.supplier_discounts where painter_org_id = $1`, [painter])).rows)).toHaveLength(0);
    expect(await as(F, async () => (await db.query(`select id from public.supplier_discounts where painter_org_id = $1`, [painter])).rows)).toHaveLength(1);
    expect(await as(PAINTER3, async () => (await db.query(`select id from public.supplier_discounts where painter_org_id = $1`, [painter])).rows)).toHaveLength(
      1,
    );
  });

  it('carteira de clientes: só o fornecedor classifica; a ficha é visível aos dois lados, nunca a terceiros', async () => {
    const supplier = (await one<{ id: string }>(`select id from public.organizations where nome = 'Tintas Exemplo'`)).id;
    const painter = (await one<{ id: string }>(`select id from public.organizations where nome = 'Pinturas da Carteira Lda'`)).id;
    const F = '00000000-0000-4000-8000-0000000000f1';
    await expect(
      as(A, () => db.query(`insert into public.supplier_customers (org_id, painter_org_id, premium, nota) values ($1, $2, true, 'x')`, [supplier, painter])),
    ).rejects.toThrow(/row-level security/);
    await as(F, () =>
      db.query(`insert into public.supplier_customers (org_id, painter_org_id, premium, nota) values ($1, $2, true, 'Paga sempre a pronto.')`, [
        supplier,
        painter,
      ]),
    );
    const seenBySupplier = await as(F, () =>
      one<{ premium: boolean; nota: string }>('select premium, nota from public.supplier_customers where org_id = $1 and painter_org_id = $2', [
        supplier,
        painter,
      ]),
    );
    expect(seenBySupplier).toEqual({ premium: true, nota: 'Paga sempre a pronto.' });
    const seenByClient = await as(PAINTER3, () =>
      one<{ premium: boolean }>('select premium from public.supplier_customers where org_id = $1 and painter_org_id = $2', [supplier, painter]),
    );
    expect(seenByClient).toEqual({ premium: true });
    expect(await as(B, async () => (await db.query('select org_id from public.supplier_customers where painter_org_id = $1', [painter])).rows)).toEqual([]);
    // Sob RLS, um update cujo "using" exclui a linha não rejeita — afeta zero linhas, em silêncio; por
    // isso confirma-se o efeito (nada mudou), não um erro.
    await as(PAINTER3, () => db.query(`update public.supplier_customers set premium = false where org_id = $1 and painter_org_id = $2`, [supplier, painter]));
    expect(
      await as(F, () =>
        one<{ premium: boolean }>('select premium from public.supplier_customers where org_id = $1 and painter_org_id = $2', [supplier, painter]),
      ),
    ).toEqual({ premium: true });
  });

  it('desconto "cliente premium": perfil aceite como os outros (a condição em si liga-se em src/lib/materials.ts)', async () => {
    const supplier = (await one<{ id: string }>(`select id from public.organizations where nome = 'Tintas Exemplo'`)).id;
    const F = '00000000-0000-4000-8000-0000000000f1';
    await as(F, () => db.query(`insert into public.supplier_discounts (org_id, desconto_bps, perfil) values ($1, 2000, 'cliente_premium')`, [supplier]));
  });
});

describe('descontos por perfil de compra', () => {
  it('aceita pagamento, quantidade e perfil válidos e recusa outros', async () => {
    const supplier = (await one<{ id: string }>(`select id from public.organizations where nome = 'Tintas Exemplo'`)).id;
    const F = '00000000-0000-4000-8000-0000000000f1';
    await as(F, () =>
      db.query(`insert into public.supplier_discounts (org_id, desconto_bps, pagamento, min_quantidade, perfil) values ($1, 2000, 'pronto', 20, 'primeira_compra')`, [supplier]),
    );
    await expect(
      as(F, () => db.query(`insert into public.supplier_discounts (org_id, desconto_bps, pagamento) values ($1, 2000, 'fiado')`, [supplier])),
    ).rejects.toThrow(/check/);
  });
});

describe('um perfil por conta', () => {
  it('quem já é cliente não cria uma empresa de pintura nem de fornecimento', async () => {
    await expect(createOrg(A, 'pintor', 'Pinturas do Cliente', '507722280')).rejects.toThrow(/outro perfil/);
    await expect(createOrg(A, 'fornecedor', 'Tintas do Cliente', '508140510')).rejects.toThrow(/outro perfil/);
  });

  // Reprodução do caso da auditoria de UX (23/10/2026): o formulário "Nova entidade" parecia nunca
  // gravar, com qualquer combinação de dados — a causa real era sempre esta regra (a conta de teste já
  // tinha outro perfil), só que a ação do Next.js (createOrganization, src/app/app/actions.ts) mostrava
  // sempre o aviso genérico "Não foi possível guardar", escondendo esta mensagem específica. Corrigido
  // ao mostrar `error.message` quando o código é 'P0001' (gatilho aplicado). Este teste confirma, do
  // lado da base de dados, que (a) uma conta nova e sem perfil nenhum consegue mesmo criar uma entidade
  // "particular" só com o nome (não é um problema de dados em falta), e (b) a mesma operação, pela conta
  // de um fornecedor já existente, falha com esta mensagem exata — a direção inversa da que já estava
  // testada acima.
  it('conta nova, sem perfil: criar "particular" só com o nome tem sucesso (não é problema de dados em falta)', async () => {
    const NOVO = '00000000-0000-4000-8000-0000000000f9';
    await db.query('insert into auth.users (id, email) values ($1, $2)', [NOVO, email(NOVO)]);
    const r = await as(NOVO, () =>
      one<{ id: string }>(`insert into public.organizations (kind, nome) values ('particular', 'Zé Cliente') returning id`),
    );
    expect(r.id).toBeDefined();
  });

  it('quem já é fornecedor (ou pintor) não cria uma entidade cliente com a mesma conta', async () => {
    const F = '00000000-0000-4000-8000-0000000000f1'; // já é "Tintas Exemplo" (fornecedor), descrito acima
    await expect(
      as(F, () => db.query(`insert into public.organizations (kind, nome) values ('particular', 'Outra Entidade do Fornecedor')`)),
    ).rejects.toThrow(/outro perfil/);
  });
});

describe('avisos e bloqueio por contactos', () => {
  it('o utilizador lê só as suas infrações e nunca escreve; um NIF bloqueado não se regista', async () => {
    await db.query(`insert into public.contact_violations (user_id, onde, motivos, texto) values ($1, 'mensagem', array['um email'], 'x@y.pt'), ($2, 'mensagem', array['uma morada'], 'rua x')`, [A, B]);
    const mine = await as(A, async () => (await db.query('select user_id from public.contact_violations')).rows);
    expect(mine.map((r) => (r as { user_id: string }).user_id)).toEqual([A]);
    await expect(as(A, () => db.query(`delete from public.contact_violations where user_id = $1`, [A]))).rejects.toThrow(/permission|row-level security/);
    expect((await one<{ n: string }>('select count(*) n from public.contact_violations where user_id = $1', [A])).n).toBe(1);
    await expect(as(A, () => db.query(`insert into public.blocked_users (user_id, motivo) values ($1, 'x')`, [A]))).rejects.toThrow(/permission|row-level security/);
    await expect(as(A, () => db.query(`insert into public.contact_violations (user_id, onde, motivos, texto) values ($1, 'x', array['y'], 'z')`, [A]))).rejects.toThrow(/permission|row-level security/);
    await db.query(`insert into public.blocked_identifiers (nif) values ('509999990')`);
    await expect(createOrg(A, 'particular', 'Pessoa Bloqueada', '509999990')).rejects.toThrow(/NIF pertence a uma conta bloqueada/);
  });
});

describe('pedido de revisão do segundo aviso', () => {
  it('cada utilizador lê só os seus pedidos, não escreve, e há um pedido por aviso', async () => {
    const va = (await one<{ id: string }>('select id from public.contact_violations where user_id = $1 limit 1', [A])).id;
    const vb = (await one<{ id: string }>('select id from public.contact_violations where user_id = $1 limit 1', [B])).id;
    const texto = 'Foi um engano: falava de um café como referência técnica.';
    await db.query('insert into public.strike_appeals (user_id, violation_id, texto) values ($1, $2, $3), ($4, $5, $3)', [A, va, texto, B, vb]);
    const mine = await as(A, async () => (await db.query('select user_id from public.strike_appeals')).rows);
    expect(mine.map((r) => (r as { user_id: string }).user_id)).toEqual([A]);
    await expect(as(A, () => db.query(`update public.strike_appeals set estado = 'aceite' where user_id = $1`, [A]))).rejects.toThrow(/permission|row-level security/);
    await expect(db.query('insert into public.strike_appeals (user_id, violation_id, texto) values ($1, $2, $3)', [A, va, texto])).rejects.toThrow(/duplicate|unique/);
    await expect(db.query('insert into public.strike_appeals (user_id, violation_id, texto) values ($1, $2, $3)', [A, vb, 'curto'])).rejects.toThrow(/check/);
  });
});

describe('avisos ao cliente', () => {
  it('nenhum aviso dirigido ao cliente fala em comissão', async () => {
    const n = await one<{ n: string }>(
      `select count(*) n from public.notifications x join public.engagements e on e.client_org_id = x.org_id where x.texto ilike '%comiss%'`,
    );
    expect(Number(n.n)).toBe(0);
    const total = await one<{ n: string }>(
      `select count(*) n from public.notifications x join public.engagements e on e.client_org_id = x.org_id`,
    );
    expect(Number(total.n)).toBeGreaterThan(0);
  });
});

describe('pagamentos Stripe', () => {
  it('ninguém escreve pela API; só leitura', async () => {
    const eng = (await one<{ id: string }>('select id from public.engagements limit 1')).id;
    await expect(
      as(A, () => db.query(`insert into public.stripe_payments (engagement_id, kind, amount_cents, payment_intent) values ($1, 'caucao', 100, 'pi_x')`, [eng])),
    ).rejects.toThrow(/row-level security|permission/);
  });
});

describe('eliminar entidade', () => {
  it('só o proprietário, e só sem histórico', async () => {
    const Z = '00000000-0000-4000-8000-00000000de11';
    await db.query('insert into auth.users (id, email) values ($1, $2)', [Z, 'zz-test-del@exemplo.pt']);
    const org = (await createOrg(Z, 'particular', 'Particular Apagável', null)).id;
    await expect(as(A, () => db.query('select public.delete_organization($1)', [org]))).rejects.toThrow(/proprietário/);
    await as(Z, () => db.query('select public.delete_organization($1)', [org]));
    expect((await db.query('select 1 from public.organizations where id = $1', [org])).rows).toHaveLength(0);
    const busy = (await one<{ client_org_id: string }>('select client_org_id from public.engagements limit 1')).client_org_id;
    const owner = (await one<{ user_id: string }>(`select user_id from public.org_members where org_id = $1 and role = 'proprietario' limit 1`, [busy])).user_id;
    await expect(as(owner, () => db.query('select public.delete_organization($1)', [busy]))).rejects.toThrow(/histórico/);
  });
});

describe('catálogo de referência', () => {
  it('todos leem; só a equipa da plataforma altera', async () => {
    const n = await as(A, async () => Number((await one<{ n: string }>('select count(*) n from public.reference_products')).n));
    expect(n).toBeGreaterThan(30);
    await expect(as(A, () => db.query(`insert into public.reference_products (marca, nome, tipo) values ('X', 'Y', 'outro')`))).rejects.toThrow(/row-level security/);
  });
});

describe('métodos de trabalho', () => {
  it('só a equipa da entidade os vê; só gestores alteram', async () => {
    const insert = (user: string, org: string, nome: string) =>
      as(user, () => db.query(`insert into public.work_templates (org_id, nome, dados) values ($1, $2, '{}')`, [org, nome]));
    await insert(A, adminOrg, 'Fachada completa');
    const seen = (user: string) => as(user, async () => (await db.query('select 1 from public.work_templates')).rows.length);
    expect(await seen(A)).toBe(1);
    expect(await seen(C)).toBe(1);
    expect(await seen(B)).toBe(0);
    await expect(insert(B, adminOrg, 'Intruso')).rejects.toThrow(/row-level security/);
    await as(B, () => db.query(`delete from public.work_templates`));
    expect(await seen(A)).toBe(1);
    await as(A, () => db.query(`delete from public.work_templates`));
    expect(await seen(A)).toBe(0);
  });
});

describe('livro de movimentos', () => {
  const post = (data: string, origemId: string, lines: unknown[], origem = 'teste') =>
    db.query<{ acc_post: string }>(`select public.acc_post($1::date, 'Lançamento de teste', $2, $3, $4::jsonb)`, [data, origem, origemId, JSON.stringify(lines)]);
  const balanced = [
    { conta: '13.1', debito: 18450, credito: 0 },
    { conta: '72.1', debito: 0, credito: 15000 },
    { conta: '24.33', debito: 0, credito: 3450 },
  ];

  it('grava lançamentos equilibrados, uma só vez por origem', async () => {
    const a = (await post('2026-10-05', 'x1', balanced)).rows[0]!.acc_post;
    const b = (await post('2026-10-05', 'x1', balanced)).rows[0]!.acc_post;
    expect(b).toBe(a);
    expect(Number((await one<{ n: string }>('select count(*) n from public.acc_lines where entry_id = $1', [a])).n)).toBe(3);
  });

  it('recusa lançamentos desequilibrados, contas inexistentes e valores nos dois lados', async () => {
    await expect(post('2026-10-05', 'x2', [{ conta: '13.1', debito: 100 }, { conta: '72.1', credito: 99 }])).rejects.toThrow(/desequilibrado/);
    await expect(post('2026-10-05', 'x3', [{ conta: '13.1', debito: 100 }])).rejects.toThrow(/desequilibrado/);
    await expect(post('2026-10-05', 'x4', [{ conta: '99.9', debito: 100 }, { conta: '72.1', credito: 100 }])).rejects.toThrow(/foreign key|violates/);
    await expect(post('2026-10-05', 'x5', [{ conta: '13.1', debito: 100, credito: 100 }, { conta: '72.1', credito: 0 }])).rejects.toThrow(/check/);
    // Nada ficou gravado dos que falharam.
    expect(Number((await one<{ n: string }>(`select count(*) n from public.acc_entries where origem_id in ('x2','x3','x4','x5')`)).n)).toBe(0);
  });

  it('nada se altera nem se apaga, nem pela equipa', async () => {
    await expect(db.query(`update public.acc_entries set descricao = 'x'`)).rejects.toThrow(/estorno/);
    await expect(db.query(`delete from public.acc_lines`)).rejects.toThrow(/estorno/);
    await expect(as(ADMIN, () => db.query(`delete from public.acc_entries`))).rejects.toThrow(/permission denied/);
  });

  it('só a equipa lê; ninguém grava pela API', async () => {
    expect(await as(ADMIN, async () => (await db.query('select 1 from public.acc_entries')).rows.length)).toBeGreaterThan(0);
    for (const u of [A, B]) expect(await as(u, async () => (await db.query('select 1 from public.acc_entries')).rows)).toEqual([]);
    await expect(as(ADMIN, () => post('2026-10-05', 'x6', balanced))).rejects.toThrow(/permission denied/);
    await expect(as(ADMIN, () => db.query(`insert into public.acc_entries (data, descricao, origem, origem_id) values ('2026-10-05', 'x', 't', 'x7')`))).rejects.toThrow(/permission denied/);
  });

  it('períodos: fecham-se por ordem, e um lançamento num mês fechado passa para o mês aberto', async () => {
    await expect(as(B, () => db.query(`select public.acc_close_period('2020-01-10')`))).rejects.toThrow(/Só a equipa/);
    await as(ADMIN, () => db.query(`select public.acc_close_period('2020-01-10')`));
    await expect(as(ADMIN, () => db.query(`select public.acc_close_period('2020-03-01')`))).rejects.toThrow(/por ordem/);
    await expect(as(ADMIN, () => db.query(`select public.acc_close_period(date_trunc('month', now())::date)`))).rejects.toThrow(/terminados|por ordem/);
    await as(ADMIN, () => db.query(`select public.acc_close_period('2020-02-01')`));
    const id = (await post('2020-01-15', 'x8', balanced)).rows[0]!.acc_post;
    expect((await one<{ data: string }>(`select to_char(data, 'YYYY-MM-DD') as data from public.acc_entries where id = $1`, [id])).data).toBe('2020-03-01');
    await expect(db.query(`insert into public.acc_entries (data, descricao, origem, origem_id) values ('2020-02-10', 'x', 't', 'x9')`)).rejects.toThrow(/fechado/);
    await as(ADMIN, () => db.query(`select public.acc_reopen_period()`));
    await as(ADMIN, () => db.query(`select public.acc_reopen_period()`));
    expect(Number((await one<{ n: string }>(`select count(*) n from public.acc_period_log`)).n)).toBe(4);
    const closed = await db.query(`select 1 from public.acc_periods where fechado`);
    expect(closed.rows).toHaveLength(0);
  });
});

describe('balancete do livro', () => {
  it('soma por conta, só para a equipa, e fecha a zeros', async () => {
    const rows = await as(ADMIN, async () => (await db.query<{ conta: string; debito_cents: string; credito_cents: string }>('select conta, debito_cents, credito_cents from public.acc_balancete')).rows);
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.reduce((n, r) => n + Number(r.debito_cents), 0)).toBe(rows.reduce((n, r) => n + Number(r.credito_cents), 0));
    expect(await as(B, async () => (await db.query('select 1 from public.acc_balancete')).rows)).toEqual([]);
    const monthly = await as(ADMIN, async () => (await db.query('select mes from public.acc_balancete_mensal')).rows);
    expect(monthly.length).toBeGreaterThan(0);
  });
});

describe('reconciliação com a Stripe', () => {
  it('só a equipa lê as cópias da Stripe; ninguém as grava pela API', async () => {
    await db.query(`insert into public.stripe_bt (id, type, reporting_category, amount_cents, fee_cents, net_cents, currency, created_at) values ('txn_t1', 'charge', 'charge', 18450, 400, 18050, 'eur', now())`);
    await db.query(`insert into public.stripe_payouts (id, amount_cents, status, currency, created_at) values ('po_t1', 10000, 'paid', 'eur', now())`);
    await db.query(`insert into public.stripe_balance_snapshots (available_cents, pending_cents, currency) values (1000, 0, 'eur')`);
    for (const t of ['stripe_bt', 'stripe_payouts', 'stripe_balance_snapshots']) {
      expect(await as(ADMIN, async () => (await db.query(`select 1 from public.${t}`)).rows.length)).toBe(1);
      expect(await as(B, async () => (await db.query(`select 1 from public.${t}`)).rows)).toEqual([]);
    }
    await expect(as(ADMIN, () => db.query(`insert into public.stripe_payouts (id, amount_cents, status, currency, created_at) values ('po_x', 1, 'paid', 'eur', now())`))).rejects.toThrow(/permission denied/);
    await expect(as(B, () => db.query(`delete from public.stripe_bt`))).rejects.toThrow(/permission denied/);
  });
});

describe('extrato bancário', () => {
  it('só a equipa lê, importa e classifica; os dados do extrato não se alteram', async () => {
    const imp = await as(ADMIN, () => one<{ id: string }>(`insert into public.bank_imports (ficheiro, formato, linhas, novas, duplicadas) values ('extrato.csv', 'csv', 1, 1, 0) returning id`));
    await expect(as(B, () => db.query(`insert into public.bank_imports (ficheiro, formato, linhas, novas, duplicadas) values ('x.csv', 'csv', 1, 1, 0)`))).rejects.toThrow(/row-level security/);
    const line = await as(ADMIN, () =>
      one<{ id: string }>(`insert into public.bank_lines (import_id, chave, data, descricao, valor_cents) values ($1, 'k1', '2026-10-21', 'TRF STRIPE', 10000) returning id`, [imp.id]),
    );
    await expect(as(ADMIN, () => db.query(`insert into public.bank_lines (import_id, chave, data, descricao, valor_cents) values ($1, 'k1', '2026-10-21', 'repetida', 1)`, [imp.id]))).rejects.toThrow(/unique|duplicate/);
    expect(await as(B, async () => (await db.query('select 1 from public.bank_lines')).rows)).toEqual([]);
    await expect(as(ADMIN, () => db.query(`update public.bank_lines set valor_cents = 1 where id = $1`, [line.id]))).rejects.toThrow(/só a classificação/);
    await expect(as(B, () => db.query(`update public.bank_lines set classificacao = 'outro' where id = $1`, [line.id]))).resolves.toBeDefined();
    expect((await one<{ classificacao: string }>('select classificacao from public.bank_lines where id = $1', [line.id])).classificacao).toBe('por_classificar');
    // A classificação tem de ser coerente com a ligação.
    await expect(as(ADMIN, () => db.query(`update public.bank_lines set classificacao = 'stripe_payout' where id = $1`, [line.id]))).rejects.toThrow(/check/);
    await as(ADMIN, () => db.query(`update public.bank_lines set classificacao = 'outro', notas = 'Taxa bancária' where id = $1`, [line.id]));
    const c = await one<{ classificacao: string; classificada_por: string | null }>('select classificacao, classificada_por from public.bank_lines where id = $1', [line.id]);
    expect([c.classificacao, c.classificada_por]).toEqual(['outro', ADMIN]);
    await expect(as(ADMIN, () => db.query(`delete from public.bank_lines`))).rejects.toThrow(/permission denied/);
    // Uma transferência da Stripe só casa com uma linha.
    await db.query(`insert into public.stripe_payouts (id, amount_cents, status, currency, created_at) values ('po_b1', 10000, 'paid', 'eur', now()) on conflict do nothing`);
    const other = await as(ADMIN, () => one<{ id: string }>(`insert into public.bank_lines (import_id, chave, data, descricao, valor_cents) values ($1, 'k2', '2026-10-21', 'TRF', 10000) returning id`, [imp.id]));
    await as(ADMIN, () => db.query(`update public.bank_lines set classificacao = 'stripe_payout', stripe_payout_id = 'po_b1' where id = $1`, [line.id]));
    await expect(as(ADMIN, () => db.query(`update public.bank_lines set classificacao = 'stripe_payout', stripe_payout_id = 'po_b1' where id = $1`, [other.id]))).rejects.toThrow(/unique|duplicate/);
  });
});

describe('revisão de movimentos da Stripe', () => {
  it('só a equipa deixa movimentos fora do livro, com nota e autor', async () => {
    await expect(as(B, () => db.query(`insert into public.stripe_bt_review (bt_id, nota) values ('txn_t1', 'resíduo de teste')`))).rejects.toThrow(/row-level security/);
    await expect(as(ADMIN, () => db.query(`insert into public.stripe_bt_review (bt_id, nota) values ('txn_t1', 'x')`))).rejects.toThrow(/check/);
    await as(ADMIN, () => db.query(`insert into public.stripe_bt_review (bt_id, nota) values ('txn_t1', 'resíduo de teste')`));
    expect((await one<{ por: string }>(`select por from public.stripe_bt_review where bt_id = 'txn_t1'`)).por).toBe(ADMIN);
    expect(await as(B, async () => (await db.query('select 1 from public.stripe_bt_review')).rows)).toEqual([]);
    await expect(as(ADMIN, () => db.query(`update public.stripe_bt_review set nota = 'outra nota'`))).rejects.toThrow(/permission denied/);
    await as(ADMIN, () => db.query(`delete from public.stripe_bt_review where bt_id = 'txn_t1'`));
    expect(await as(ADMIN, async () => (await db.query('select 1 from public.stripe_bt_review')).rows)).toEqual([]);
  });
});

describe('documentos fiscais', () => {
  it('só a equipa lê; ninguém grava pela API; emitido não se altera; não se apaga', async () => {
    expect(await as(ADMIN, async () => (await db.query('select 1 from public.fiscal_documents')).rows)).toEqual([]);
    expect(await as(B, async () => (await db.query('select 1 from public.fiscal_documents')).rows)).toEqual([]);
    await expect(
      as(ADMIN, () =>
        db.query(
          `insert into public.fiscal_documents (reason, origin_type, origin_id, tipo, data, cliente_nome, total_cents) values ('comissao', 'stripe_payment', 'pi_t1', 'FT', '2026-10-22', 'Pinturas X', 15000)`,
        ),
      ),
    ).rejects.toThrow(/permission denied/);
  });
});

describe('referências de fornecedores', () => {
  const RP = '00000000-0000-4000-8000-0000000000c1'; // pintor que refere fornecedores
  const RS1 = '00000000-0000-4000-8000-0000000000c2'; // fornecedor que usa o código
  const RS2 = '00000000-0000-4000-8000-0000000000c3'; // outro fornecedor, nunca aplica o código
  const RP2 = '00000000-0000-4000-8000-0000000000c4'; // pintor dedicado ao teste do Q(n)
  const RS3 = '00000000-0000-4000-8000-0000000000c5'; // fornecedor de materiais, código de adesão (sem relação com as referências)
  let painterOrg: string;
  let inviteCode: string;

  beforeAll(async () => {
    for (const u of [RP, RS1, RS2, RP2, RS3]) {
      await db.query('insert into auth.users (id, email) values ($1, $2)', [u, `zz-test-${u.slice(-2)}@exemplo.pt`]);
    }
    painterOrg = (await createOrg(RP, 'pintor', 'Pinturas Referências', '506226620')).id;
  });

  it('o pintor cria o convite; só pela sua organização de pintor', async () => {
    await expect(
      as(RS1, () => db.query(`insert into public.supplier_referral_invites (painter_org_id, code) values ($1, 'QRST1234')`, [painterOrg])),
    ).rejects.toThrow(/row-level security/);
    const created = await as(RP, () =>
      one<{ id: string; code: string }>(`insert into public.supplier_referral_invites (painter_org_id, code) values ($1, 'QRST1234') returning id, code`, [painterOrg]),
    );
    inviteCode = created.code;
  });

  it('ninguém altera os campos do sistema diretamente; só apply_supplier_referral_code', async () => {
    await expect(
      as(RP, () => db.query(`update public.supplier_referral_invites set nif = '999999990' where code = $1`, [inviteCode])),
    ).rejects.toThrow(/permission denied/);
    // active e nota continuam livres.
    await as(RP, () => db.query(`update public.supplier_referral_invites set nota = 'Resinas Um, feira de outubro' where code = $1`, [inviteCode]));
  });

  it('o fornecedor aplica o código no registo; entidade nova, não se reatribui, nunca ao próprio código', async () => {
    const supplier1 = (await createOrg(RS1, 'fornecedor', 'Resinas Um', '506226638')).id;
    await expect(as(RS1, () => db.query(`select public.apply_supplier_referral_code($1, 'ZZZZZZZZ')`, [supplier1]))).rejects.toThrow(/inválido/);
    await as(RS1, () => db.query(`select public.apply_supplier_referral_code($1, ' qrst1234 ')`, [supplier1]));
    const inv = await one<{ supplier_org_id: string; nif: string; convite_confirmado_em: string }>(
      'select supplier_org_id, nif, convite_confirmado_em from public.supplier_referral_invites where code = $1',
      [inviteCode],
    );
    expect(inv.supplier_org_id).toBe(supplier1);
    expect(inv.nif).toBe('506226638');
    expect(inv.convite_confirmado_em).not.toBeNull();
    // Entidade já referida: não se reatribui a um segundo fornecedor.
    const supplier2 = (await createOrg(RS2, 'fornecedor', 'Resinas Dois', '506226646')).id;
    await expect(as(RS2, () => db.query(`select public.apply_supplier_referral_code($1, 'QRST1234')`, [supplier2]))).rejects.toThrow(/já foi utilizado/);
  });

  it('a 1.ª subscrição do fornecedor marca a ativação elegível (início da janela de 12 meses)', async () => {
    const supplier1 = (await one<{ supplier_org_id: string }>('select supplier_org_id from public.supplier_referral_invites where code = $1', [inviteCode])).supplier_org_id;
    await as(ADMIN, () =>
      db.query(`insert into public.supplier_subscriptions (org_id, plan, price_cents) values ($1, 'vendedores', 3900)`, [supplier1]),
    );
    const inv = await one<{ adesao_elegivel_em: string }>('select adesao_elegivel_em from public.supplier_referral_invites where code = $1', [inviteCode]);
    expect(inv.adesao_elegivel_em).not.toBeNull();
  });

  it('Q(n): a fórmula em SQL concorda com src/domain/referralEligibility.ts', async () => {
    const painterOrgQ = (await createOrg(RP2, 'pintor', 'Pinturas Q', '606226613')).id;
    const discountNow = () => one<{ v: number }>('select private.referral_window_discount_bp($1, current_date) v', [painterOrgQ]);
    expect((await discountNow()).v).toBe(referralDiscountBp(0));
    const nifs = ['300000005', '350000003', '360000001', '370000000', '380000009'];
    for (let i = 0; i < nifs.length; i++) {
      await db.query(
        `insert into public.supplier_referral_invites (painter_org_id, code, supplier_org_id, nif, convite_confirmado_em, adesao_elegivel_em)
         values ($1, $2, null, $3, now(), current_date)`,
        [painterOrgQ, `QN${i}CODE${i}`, nifs[i]],
      );
      expect((await discountNow()).v).toBe(referralDiscountBp(i + 1));
    }
  });

  it('desconto combinado: código de adesão ligado + referência elegível, um só teto', async () => {
    // Um fornecedor de materiais, sem relação com as referências, liga-se a este pintor por código de adesão.
    const materialSupplier = (await createOrg(RS3, 'fornecedor', 'Tintas do Pintor Q2', '706226615')).id;
    await db.query(`insert into public.referral_codes (supplier_org_id, code, painter_org_id) values ($1, 'ADESAOQ1', $2)`, [materialSupplier, painterOrg]);

    const buildingId = (await one<{ id: string }>('select id from public.buildings where org_id = $1 limit 1', [condo])).id;
    const reqId = (
      await as(A, () =>
        one<{ id: string }>(
          `insert into public.work_requests (org_id, building_id, titulo, tipo_obra, descricao, prazo_propostas)
           values ($1, $2, 'Rua A, 1 — referências', 'fachadas', 'Obra para testar o desconto combinado das duas referências.', current_date + 10) returning id`,
          [condo, buildingId],
        ),
      )
    ).id;
    await as(A, () => db.query(`insert into public.request_surfaces (request_id, kind, area_direta_cm2) values ($1, 'fachada', 16150)`, [reqId]));
    await as(A, () => db.query(`update public.work_requests set status = 'publicado' where id = $1`, [reqId]));
    const propId = (
      await as(RP, () =>
        one<{ id: string }>(`insert into public.proposals (request_id, painter_org_id, validade, duracao_dias) values ($1, $2, current_date + 30, 20) returning id`, [reqId, painterOrg]),
      )
    ).id;
    await as(RP, () =>
      db.query(
        `insert into public.proposal_lines (proposal_id, categoria, descricao, superficie, quantidade, preco_unitario_cents, inclusao) values ($1, 'pintura', 'Pintura', 'fachada', 16150, 850, 'incluido')`,
        [propId],
      ),
    );
    await as(RP, () =>
      db.query(
        `update public.proposals set confirma_mao_obra = true, seguro_rc = 'sim', seguro_at = 'nao',
           fases = '[{"nome":"No início","bps":3000},{"nome":"No fim","bps":7000}]'::jsonb where id = $1`,
        [propId],
      ),
    );
    await as(RP, () => db.query(`update public.proposals set status = 'submetida' where id = $1`, [propId]));
    await as(A, () => db.query('select public.select_proposal($1)', [propId]));
    const e = await one<{ referral_discount_bp: number }>('select referral_discount_bp from public.engagements where proposal_id = $1', [propId]);
    // 25 (1 fornecedor com código de adesão ligado) + 100 (Q(1), o fornecedor referido e já elegível) = 125.
    expect(e.referral_discount_bp).toBe(25 + referralDiscountBp(1));
  });
});

describe('termos de aceitação do pintor', () => {
  const TP = '00000000-0000-4000-8000-0000000000d1'; // pintor (gestor)
  const TP2 = '00000000-0000-4000-8000-0000000000d2'; // colega, sem papel de gestor
  let painterOrg: string;

  beforeAll(async () => {
    await db.query('insert into auth.users (id, email) values ($1, $2), ($3, $4)', [TP, email(TP), TP2, email(TP2)]);
    painterOrg = (await createOrg(TP, 'pintor', 'Pinturas Termos', '606226621')).id;
    await db.query(`insert into public.org_members (org_id, user_id, role) values ($1, $2, 'leitor')`, [painterOrg, TP2]);
  });

  it('só um gestor da entidade regista a aceitação, e só para a sua', async () => {
    await expect(
      as(TP2, () => db.query(`insert into public.painter_terms_acceptances (painter_org_id, version) values ($1, '2026-10-22')`, [painterOrg])),
    ).rejects.toThrow(/row-level security/);
    await expect(
      as(TP, () => db.query(`insert into public.painter_terms_acceptances (painter_org_id, version) values ($1, '2026-10-22')`, [condo])),
    ).rejects.toThrow(/row-level security/);
    await as(TP, () => db.query(`insert into public.painter_terms_acceptances (painter_org_id, version) values ($1, '2026-10-22')`, [painterOrg]));
    expect(await as(TP2, async () => (await db.query('select version from public.painter_terms_acceptances where painter_org_id = $1', [painterOrg])).rows)).toEqual([
      { version: '2026-10-22' },
    ]);
  });

  it('não se altera nem se apaga; uma versão nova é outra linha', async () => {
    await expect(
      as(TP, () => db.query(`update public.painter_terms_acceptances set version = 'x' where painter_org_id = $1`, [painterOrg])),
    ).rejects.toThrow(/permission denied/);
    await expect(
      as(TP, () => db.query(`delete from public.painter_terms_acceptances where painter_org_id = $1`, [painterOrg])),
    ).rejects.toThrow(/permission denied/);
    await as(TP, () => db.query(`insert into public.painter_terms_acceptances (painter_org_id, version) values ($1, '2026-11-01')`, [painterOrg]));
    const rows = await one<{ n: string }>('select count(*) n from public.painter_terms_acceptances where painter_org_id = $1', [painterOrg]);
    expect(Number(rows.n)).toBe(2);
  });
});

describe('convite direto do cliente ("traga o seu pintor")', () => {
  const IC = '00000000-0000-4000-8000-0000000000d3'; // pintor convidado (gestor)
  const IC2 = '00000000-0000-4000-8000-0000000000d4'; // outra empresa, nunca convidada
  let inviteCode: string;
  let reqId: string;
  let painterOrg: string;

  beforeAll(async () => {
    await db.query('insert into auth.users (id, email) values ($1, $2), ($3, $4)', [IC, email(IC), IC2, email(IC2)]);
    painterOrg = (await createOrg(IC, 'pintor', 'Pinturas Convidadas', '606226702')).id;
  });

  it('o cliente cria o convite só numa obra publicada e sua; só um gestor', async () => {
    const buildingId = (await one<{ id: string }>('select id from public.buildings where org_id = $1 limit 1', [condo])).id;
    reqId = (
      await as(A, () =>
        one<{ id: string }>(
          `insert into public.work_requests (org_id, building_id, titulo, tipo_obra, descricao, prazo_propostas)
           values ($1, $2, 'Rua A, 1 — convite direto', 'fachadas', 'Obra para testar o convite direto ao pintor de confiança.', current_date + 10) returning id`,
          [condo, buildingId],
        ),
      )
    ).id;
    await as(A, () => db.query(`insert into public.request_surfaces (request_id, kind, area_direta_cm2) values ($1, 'fachada', 16150)`, [reqId]));
    // Antes de publicar, ainda não há convite possível (listing_open falha).
    await expect(
      as(A, () => db.query(`insert into public.request_invites (request_id, code) values ($1, 'CONVITE1')`, [reqId])),
    ).rejects.toThrow(/row-level security/);
    await as(A, () => db.query(`update public.work_requests set status = 'publicado' where id = $1`, [reqId]));
    await expect(
      as(B, () => db.query(`insert into public.request_invites (request_id, code) values ($1, 'CONVITE2')`, [reqId])),
    ).rejects.toThrow(/row-level security/);
    const created = await as(A, () =>
      one<{ id: string; code: string }>(`insert into public.request_invites (request_id, code, nota) values ($1, 'CONVITE1', 'O pintor do prédio ao lado') returning id, code`, [reqId]),
    );
    inviteCode = created.code;
  });

  it('a pré-visualização mostra só o que já era público', async () => {
    const info = await as(IC, () =>
      one<{ request_id: string; tipo_obra: string; concelho: string; ja_redimido: boolean }>('select * from public.request_invite_info($1)', [inviteCode]),
    );
    expect([info.request_id, info.tipo_obra, info.ja_redimido]).toEqual([reqId, 'fachadas', false]);
  });

  it('o pintor segue o código; liga-se à sua empresa, nunca a outra', async () => {
    await expect(as(IC, () => db.query(`select public.redeem_request_invite('ZZZZZZZZ', $1)`, [painterOrg]))).rejects.toThrow(/inválido/);
    const r = await as(IC, () => one<{ redeem_request_invite: string }>(`select public.redeem_request_invite($1, $2)`, [inviteCode, painterOrg]));
    expect(r.redeem_request_invite).toBe(reqId);
    // Idempotente para a mesma empresa.
    await as(IC, () => db.query(`select public.redeem_request_invite($1, $2)`, [inviteCode, painterOrg]));
    // Já associado: outra empresa não o pode seguir.
    const other = (await createOrg(IC2, 'pintor', 'Outra Empresa', '606226710')).id;
    await expect(as(IC2, () => db.query(`select public.redeem_request_invite($1, $2)`, [inviteCode, other]))).rejects.toThrow(/já foi associado/);
  });

  it('ganhar a obra por este caminho aplica a comissão do convite direto (9%, o piso do algoritmo), não a normal (3%)', async () => {
    const propId = (
      await as(IC, () =>
        one<{ id: string }>(`insert into public.proposals (request_id, painter_org_id, validade, duracao_dias) values ($1, $2, current_date + 30, 20) returning id`, [reqId, painterOrg]),
      )
    ).id;
    await as(IC, () =>
      db.query(
        `insert into public.proposal_lines (proposal_id, categoria, descricao, superficie, quantidade, preco_unitario_cents, inclusao) values ($1, 'pintura', 'Pintura', 'fachada', 16150, 850, 'incluido')`,
        [propId],
      ),
    );
    await as(IC, () =>
      db.query(
        `update public.proposals set confirma_mao_obra = true, seguro_rc = 'sim', seguro_at = 'nao',
           fases = '[{"nome":"No início","bps":3000},{"nome":"No fim","bps":7000}]'::jsonb where id = $1`,
        [propId],
      ),
    );
    await as(IC, () => db.query(`update public.proposals set status = 'submetida' where id = $1`, [propId]));
    await as(A, () => db.query('select public.select_proposal($1)', [propId]));
    const e = await one<{ rules_version: string }>('select rules_version from public.engagements where proposal_id = $1', [propId]);
    expect(e.rules_version).toBe('2026-10-20+convite');
  });

  it('convite numa obra que deixou de estar publicada: nem a pré-visualização nem o resgate funcionam', async () => {
    const buildingId = (await one<{ id: string }>('select id from public.buildings where org_id = $1 limit 1', [condo])).id;
    const closedReqId = (
      await as(A, () =>
        one<{ id: string }>(
          `insert into public.work_requests (org_id, building_id, titulo, tipo_obra, descricao, prazo_propostas)
           values ($1, $2, 'Rua A, 1 — convite depois de fechar', 'fachadas', 'Obra para testar o convite depois de a obra deixar de estar publicada.', current_date + 10) returning id`,
          [condo, buildingId],
        ),
      )
    ).id;
    await as(A, () => db.query(`insert into public.request_surfaces (request_id, kind, area_direta_cm2) values ($1, 'fachada', 16150)`, [closedReqId]));
    await as(A, () => db.query(`update public.work_requests set status = 'publicado' where id = $1`, [closedReqId]));
    const { code } = await as(A, () =>
      one<{ code: string }>(`insert into public.request_invites (request_id, code) values ($1, 'FECHOU01') returning code`, [closedReqId]),
    );
    // A obra deixa de estar publicada (ex.: o cliente volta a rascunho) com o convite ainda ativo.
    await as(A, () => db.query(`update public.work_requests set status = 'rascunho' where id = $1`, [closedReqId]));
    expect((await db.query('select * from public.request_invite_info($1)', [code])).rows).toHaveLength(0);
    await expect(as(IC, () => db.query(`select public.redeem_request_invite($1, $2)`, [code, painterOrg]))).rejects.toThrow(/já não está publicada/);
  });
});

describe('convite de adesão do fornecedor (fornecedor convida um pintor que ainda não está na plataforma)', () => {
  const FM = '00000000-0000-4000-8000-0000000000d5'; // fornecedor, gestor — envia o convite
  const FM2 = '00000000-0000-4000-8000-0000000000d6'; // colega no fornecedor, sem papel de gestor
  const IP = '00000000-0000-4000-8000-0000000000d7'; // pintor que aceita o convite
  const IP2 = '00000000-0000-4000-8000-0000000000d8'; // outro pintor, sem relação com o convite
  let supplierOrg: string;
  let codeId: string;

  beforeAll(async () => {
    await db.query('insert into auth.users (id, email) values ($1, $2), ($3, $4), ($5, $6), ($7, $8)', [
      FM, email(FM), FM2, email(FM2), IP, email(IP), IP2, email(IP2),
    ]);
    supplierOrg = (await createOrg(FM, 'fornecedor', 'Tintas Convites Lda', '606226729')).id;
    await db.query(`insert into public.org_members (org_id, user_id, role) values ($1, $2, 'leitor')`, [supplierOrg, FM2]);
    codeId = (
      await as(FM, () => one<{ id: string }>(`insert into public.referral_codes (supplier_org_id, code) values ($1, 'CONVF1234') returning id`, [supplierOrg]))
    ).id;
  });

  it('só um gestor do fornecedor cria o convite, pela sua organização', async () => {
    const ins = (user: string, org: string) =>
      as(user, () =>
        db.query(
          `insert into public.supplier_painter_invites (org_id, referral_code_id, nome, email, telefone, morada) values ($1, $2, 'Zé Pintor', 'ze@exemplo.pt', '912345678', 'Lisboa')`,
          [org, codeId],
        ),
      );
    await expect(ins(FM2, supplierOrg)).rejects.toThrow(/row-level security/);
    await expect(ins(IP, supplierOrg)).rejects.toThrow(/row-level security/);
    await as(FM, () => ins(FM, supplierOrg));
  });

  it('só quem acede à organização do fornecedor vê o convite; não se altera nem se apaga', async () => {
    expect(await as(FM, async () => (await db.query('select nome from public.supplier_painter_invites where org_id = $1', [supplierOrg])).rows)).toEqual([
      { nome: 'Zé Pintor' },
    ]);
    expect(await as(IP, async () => (await db.query('select 1 from public.supplier_painter_invites where org_id = $1', [supplierOrg])).rows)).toEqual([]);
    await expect(
      as(FM, () => db.query(`update public.supplier_painter_invites set nome = 'Outro Nome' where org_id = $1`, [supplierOrg])),
    ).rejects.toThrow(/permission denied/);
    await expect(as(FM, () => db.query(`delete from public.supplier_painter_invites where org_id = $1`, [supplierOrg]))).rejects.toThrow(/permission denied/);
  });

  it('supplier_invite_info mostra só o fornecedor e se já foi aceite — nunca quem foi convidado', async () => {
    const info = await as(IP, () => one<{ fornecedor: string; ja_aceite: boolean }>(`select * from public.supplier_invite_info('CONVF1234')`));
    expect(info).toEqual({ fornecedor: 'Tintas Convites Lda', ja_aceite: false });
    expect((await db.query(`select * from public.supplier_invite_info('ZZZZZZZZ')`)).rows).toHaveLength(0);
  });

  it('claim_supplier_invite: só um gestor da entidade de pintura, código inválido, sucesso, não se reatribui', async () => {
    const painterOrg = (await createOrg(IP, 'pintor', 'Pinturas do Convite', '606226737')).id;
    await expect(as(IP2, () => db.query(`select public.claim_supplier_invite('CONVF1234', $1)`, [painterOrg]))).rejects.toThrow(/não encontrada/);
    await expect(as(FM, () => db.query(`select public.claim_supplier_invite('CONVF1234', $1)`, [supplierOrg]))).rejects.toThrow(/não encontrada/);
    await expect(as(IP, () => db.query(`select public.claim_supplier_invite('ZZZZZZZZ', $1)`, [painterOrg]))).rejects.toThrow(/inválido/);

    const r = await as(IP, () => one<{ claim_supplier_invite: string }>(`select public.claim_supplier_invite('CONVF1234', $1)`, [painterOrg]));
    expect(r.claim_supplier_invite).toBe('Tintas Convites Lda');
    expect((await one<{ painter_org_id: string }>('select painter_org_id from public.referral_codes where id = $1', [codeId])).painter_org_id).toBe(painterOrg);
    expect((await as(IP, () => one<{ fornecedor: string; ja_aceite: boolean }>(`select * from public.supplier_invite_info('CONVF1234')`))).ja_aceite).toBe(true);

    // Idempotente para a mesma empresa.
    await as(IP, () => db.query(`select public.claim_supplier_invite('CONVF1234', $1)`, [painterOrg]));

    // Já associado: outra empresa de pintura não o pode seguir.
    const otherPainterOrg = (await createOrg(IP2, 'pintor', 'Outra Empresa de Pintura', '606226745')).id;
    await expect(as(IP2, () => db.query(`select public.claim_supplier_invite('CONVF1234', $1)`, [otherPainterOrg]))).rejects.toThrow(/já foi associado a outra empresa/);
  });

  it('bónus de adesão: um convite aceite dá exatamente um crédito ao fornecedor, nunca repetido', async () => {
    // O convite acima (código CONVF1234) já foi aceite nos testes anteriores, incluindo uma segunda
    // chamada idempotente — mesmo assim, só pode haver um crédito (unique em invite_id).
    const inviteId = (await one<{ id: string }>('select id from public.supplier_painter_invites where referral_code_id = $1', [codeId])).id;
    const credits = await db.query('select org_id, estado from public.avaliador_bonus_credits where invite_id = $1', [inviteId]);
    expect(credits.rows).toEqual([{ org_id: supplierOrg, estado: 'disponivel' }]);

    // Só a plataforma concede e gasta créditos: o fornecedor vê o seu, não o altera nem o apaga.
    expect(await as(FM, async () => (await db.query('select estado from public.avaliador_bonus_credits where org_id = $1', [supplierOrg])).rows)).toEqual([
      { estado: 'disponivel' },
    ]);
    expect(await as(IP, async () => (await db.query('select 1 from public.avaliador_bonus_credits where org_id = $1', [supplierOrg])).rows)).toEqual([]);
    await expect(
      as(FM, () => db.query(`update public.avaliador_bonus_credits set estado = 'usado' where org_id = $1`, [supplierOrg])),
    ).rejects.toThrow(/permission denied/);
    await expect(as(FM, () => db.query(`delete from public.avaliador_bonus_credits where org_id = $1`, [supplierOrg]))).rejects.toThrow(/permission denied/);
  });
});

describe('levantamento por vendedor (reserva por zona, prazo, repartição)', () => {
  const VEND = '00000000-0000-4000-8000-0000000000e5'; // vendedor (papel novo) de um fornecedor
  let vendorOrg: string;
  let requestId: string;
  let surveyId: string;

  beforeAll(async () => {
    await db.query('insert into auth.users (id, email) values ($1, $2)', [VEND, email(VEND)]);
    vendorOrg = (await createOrg(VEND, 'fornecedor', 'Tintas do Levantamento Lda', '610000004')).id;
    await db.query(`update public.org_members set role = 'vendedor' where org_id = $1 and user_id = $2`, [vendorOrg, VEND]);
    const buildingId = (await one<{ id: string }>('select id from public.buildings where org_id = $1 limit 1', [condo])).id;
    requestId = (
      await as(A, () =>
        one<{ id: string }>(
          `insert into public.work_requests (org_id, building_id, titulo, tipo_obra, descricao) values ($1, $2, 'levantamento', 'fachadas', 'Obra para levantamento.') returning id`,
          [condo, buildingId],
        ),
      )
    ).id;
  });

  it('o pedido de ajuda abre-se sozinho ao criar o pedido; já ninguém o insere à mão', async () => {
    surveyId = (await one<{ id: string }>('select id from public.request_surveys where request_id = $1', [requestId])).id;
    expect((await one<{ status: string }>('select status from public.request_surveys where id = $1', [surveyId])).status).toBe('aberto');
    await expect(as(A, () => db.query(`insert into public.request_surveys (request_id) values ($1)`, [requestId]))).rejects.toThrow(/permission denied/);
  });

  it('um fornecedor com o papel "vendedor" vê o pedido aberto; um estranho não', async () => {
    const seen = await as(VEND, async () => (await db.query('select id from public.request_surveys where id = $1', [surveyId])).rows);
    expect(seen).toHaveLength(1);
    expect(await as(B, async () => (await db.query('select id from public.request_surveys where id = $1', [surveyId])).rows)).toEqual([]);
    // Pré-visualização antes de reservar: só concelho e tipo de obra, nunca título nem morada.
    const preview = await as(VEND, () => one<{ concelho: string; tipo_obra: string }>('select concelho, tipo_obra from public.survey_preview($1)', [surveyId]));
    expect(preview).toEqual({ concelho: 'Lisboa', tipo_obra: 'fachadas' });
    expect(await as(B, async () => (await db.query('select concelho from public.survey_preview($1)', [surveyId])).rows)).toEqual([]);
  });

  it('reservar: o primeiro vendedor avança; um segundo fornecedor chega tarde', async () => {
    await as(VEND, () => db.query('select public.reserve_survey($1, $2)', [surveyId, vendorOrg]));
    const row = await one<{ status: string; vendedor_org_id: string }>('select status, vendedor_org_id from public.request_surveys where id = $1', [surveyId]);
    expect(row).toEqual({ status: 'reservado', vendedor_org_id: vendorOrg });
    const OTHERVEND = '00000000-0000-4000-8000-0000000000e6';
    await db.query('insert into auth.users (id, email) values ($1, $2)', [OTHERVEND, email(OTHERVEND)]);
    const other = (await createOrg(OTHERVEND, 'fornecedor', 'Outra Tinta Lda', '610000012')).id;
    await expect(as(OTHERVEND, () => db.query('select public.reserve_survey($1, $2)', [surveyId, other]))).rejects.toThrow(/já não está disponível/);
  });

  it('o vendedor que reservou vê a morada real e regista o levantamento (superfícies, contacto, conclusão)', async () => {
    const seenByVendor = await as(VEND, () =>
      one<{ morada: string }>('select b.morada from public.buildings b join public.work_requests wr on wr.building_id = b.id where wr.id = $1', [requestId]),
    );
    expect(seenByVendor.morada).toBe('Rua A, 1');
    await as(VEND, () => db.query(`insert into public.request_surfaces (request_id, kind, area_direta_cm2) values ($1, 'fachada', 12000)`, [requestId]));
    await as(VEND, () => db.query(`update public.request_surveys set contact_notes = 'Agendado para 3.ª feira.' where id = $1`, [surveyId]));
    await as(VEND, () => db.query('select public.conclude_survey($1)', [surveyId]));
    expect((await one<{ status: string }>('select status from public.request_surveys where id = $1', [surveyId])).status).toBe('concluido');
  });

  it('avaliação do vendedor: "primeira obra" antes, 5 estrelas depois — só o cliente avalia, e só depois de concluído', async () => {
    const before = await one<{ n: number; media: number | null }>('select n, media::float8 as media from public.survey_vendor_rating($1)', [VEND]);
    expect(before).toEqual({ n: 0, media: null });
    await expect(as(VEND, () => db.query(`insert into public.survey_reviews (request_survey_id, nota) values ($1, 5)`, [surveyId]))).rejects.toThrow(/Só se avalia/);
    await as(A, () => db.query(`insert into public.survey_reviews (request_survey_id, nota, comentario) values ($1, 5, 'Rigoroso e rápido.')`, [surveyId]));
    const after = await one<{ n: number; media: number | null }>('select n, media::float8 as media from public.survey_vendor_rating($1)', [VEND]);
    expect(after).toEqual({ n: 1, media: 5 });
  });

  it('ao concluir, o cliente é avisado (sem nomear o fornecedor nem o vendedor)', async () => {
    const notes = await as(A, async () => (await db.query<{ texto: string }>('select texto from public.notifications')).rows.map((r) => r.texto));
    expect(notes).toContain('O levantamento da obra foi concluído: pode rever e avaliar.');
    expect(notes.some((t) => /Tintas do Levantamento|vendedor\b/i.test(t))).toBe(false);
  });

  it('reserva vencida: liberta-se, o vendedor perde o acesso e o cliente é avisado', async () => {
    const buildingId = (await one<{ id: string }>('select id from public.buildings where org_id = $1 limit 1', [condo])).id;
    const reqId = (
      await as(A, () =>
        one<{ id: string }>(
          `insert into public.work_requests (org_id, building_id, titulo, tipo_obra, descricao) values ($1, $2, 'levantamento 2', 'fachadas', 'Segunda obra.') returning id`,
          [condo, buildingId],
        ),
      )
    ).id;
    const survey2 = (await one<{ id: string }>('select id from public.request_surveys where request_id = $1', [reqId])).id;
    await as(VEND, () => db.query('select public.reserve_survey($1, $2)', [survey2, vendorOrg]));
    await db.query(`update public.request_surveys set reserve_deadline = now() - interval '1 hour' where id = $1`, [survey2]);
    await db.query('select private.daily_maintenance()');
    const row = await one<{ status: string; vendedor_org_id: string | null }>('select status, vendedor_org_id from public.request_surveys where id = $1', [
      survey2,
    ]);
    expect(row).toEqual({ status: 'aberto', vendedor_org_id: null });
    const stillSeesAddress = await as(VEND, async () =>
      (await db.query('select b.morada from public.buildings b join public.work_requests wr on wr.building_id = b.id where wr.id = $1', [reqId])).rows,
    );
    expect(stillSeesAddress).toEqual([]);
    const notes = await as(A, async () => (await db.query<{ texto: string }>('select texto from public.notifications')).rows.map((r) => r.texto));
    expect(notes).toContain(
      'O profissional que tinha reservado a visita não concluiu o levantamento a tempo: o pedido voltou a ficar disponível para outro profissional.',
    );
  });

  it('o cliente preenche sozinho e publica antes de qualquer vendedor reservar: o levantamento aberto cancela-se', async () => {
    const buildingId = (await one<{ id: string }>('select id from public.buildings where org_id = $1 limit 1', [condo])).id;
    const reqId = (
      await as(A, () =>
        one<{ id: string }>(
          `insert into public.work_requests (org_id, building_id, titulo, tipo_obra, descricao, prazo_propostas)
           values ($1, $2, 'levantamento 3', 'fachadas', 'Terceira obra, cliente preencheu sozinho.', current_date + 10) returning id`,
          [condo, buildingId],
        ),
      )
    ).id;
    const survey3 = (await one<{ id: string }>('select id from public.request_surveys where request_id = $1', [reqId])).id;
    expect((await one<{ status: string }>('select status from public.request_surveys where id = $1', [survey3])).status).toBe('aberto');
    await as(A, () => db.query(`insert into public.request_surfaces (request_id, kind, area_direta_cm2) values ($1, 'fachada', 12000)`, [reqId]));
    await as(A, () => db.query(`update public.work_requests set status = 'publicado' where id = $1`, [reqId]));
    expect((await one<{ status: string }>('select status from public.request_surveys where id = $1', [survey3])).status).toBe('cancelado');
  });

  it('uma reserva já ativa não se cancela ao publicar', async () => {
    const buildingId = (await one<{ id: string }>('select id from public.buildings where org_id = $1 limit 1', [condo])).id;
    const reqId = (
      await as(A, () =>
        one<{ id: string }>(
          `insert into public.work_requests (org_id, building_id, titulo, tipo_obra, descricao, prazo_propostas)
           values ($1, $2, 'levantamento 4', 'fachadas', 'Quarta obra, com reserva ativa.', current_date + 10) returning id`,
          [condo, buildingId],
        ),
      )
    ).id;
    const survey4 = (await one<{ id: string }>('select id from public.request_surveys where request_id = $1', [reqId])).id;
    await as(VEND, () => db.query('select public.reserve_survey($1, $2)', [survey4, vendorOrg]));
    await as(A, () => db.query(`insert into public.request_surfaces (request_id, kind, area_direta_cm2) values ($1, 'fachada', 12000)`, [reqId]));
    await as(A, () => db.query(`update public.work_requests set status = 'publicado' where id = $1`, [reqId]));
    expect((await one<{ status: string }>('select status from public.request_surveys where id = $1', [survey4])).status).toBe('reservado');
  });
});

describe('pedido de esclarecimento ao vendedor (dois marcos, escalada sem crédito parcial)', () => {
  const VEND = '00000000-0000-4000-8000-0000000000e7'; // vendedor que fez o levantamento
  const VEND2 = '00000000-0000-4000-8000-0000000000e8'; // segundo vendedor, depois da escalada
  const CP = '00000000-0000-4000-8000-0000000000e9'; // pintor que pede esclarecimento
  const CP2 = '00000000-0000-4000-8000-0000000000ea'; // segundo pintor, junta-se à mesma tentativa
  let vendorOrg: string;
  let vendor2Org: string;
  let requestId: string;
  let surveyId: string;

  beforeAll(async () => {
    for (const u of [VEND, VEND2, CP, CP2]) await db.query('insert into auth.users (id, email) values ($1, $2)', [u, email(u)]);
    vendorOrg = (await createOrg(VEND, 'fornecedor', 'Tintas do Esclarecimento Lda', '610000055')).id;
    await db.query(`update public.org_members set role = 'vendedor' where org_id = $1 and user_id = $2`, [vendorOrg, VEND]);
    vendor2Org = (await createOrg(VEND2, 'fornecedor', 'Tintas do Esclarecimento Dois Lda', '610000063')).id;
    await db.query(`update public.org_members set role = 'vendedor' where org_id = $1 and user_id = $2`, [vendor2Org, VEND2]);
    await createOrg(CP, 'pintor', 'Pinturas do Esclarecimento Lda', '610000071');
    await createOrg(CP2, 'pintor', 'Pinturas do Esclarecimento Dois Lda', '610000080');

    const buildingId = (await one<{ id: string }>('select id from public.buildings where org_id = $1 limit 1', [condo])).id;
    requestId = (
      await as(A, () =>
        one<{ id: string }>(
          `insert into public.work_requests (org_id, building_id, titulo, tipo_obra, descricao, prazo_propostas)
           values ($1, $2, 'levantamento esclarecimento', 'fachadas', 'Obra para pedido de esclarecimento.', current_date + 10) returning id`,
          [condo, buildingId],
        ),
      )
    ).id;
    surveyId = (await one<{ id: string }>('select id from public.request_surveys where request_id = $1', [requestId])).id;
    await as(VEND, () => db.query('select public.reserve_survey($1, $2)', [surveyId, vendorOrg]));
    await as(VEND, () => db.query(`insert into public.request_surfaces (request_id, kind, area_direta_cm2) values ($1, 'fachada', 12000)`, [requestId]));
    await as(VEND, () => db.query('select public.conclude_survey($1)', [surveyId]));
    await as(A, () => db.query(`update public.work_requests set status = 'publicado' where id = $1`, [requestId]));
  });

  it('um pintor pede esclarecimento sobre um levantamento concluído; a comissão continua do vendedor', async () => {
    await as(CP, () => db.query('select public.request_painter_doubt($1, $2)', [surveyId, 'Falta saber se há andaime montado.']));
    const c = await one<{ status: string; vendedor_org_id: string }>(
      'select status, vendedor_org_id from public.survey_clarifications where request_survey_id = $1',
      [surveyId],
    );
    expect(c).toEqual({ status: 'aberto', vendedor_org_id: vendorOrg });
    expect((await one<{ vendedor_org_id: string }>('select vendedor_org_id from public.request_surveys where id = $1', [surveyId])).vendedor_org_id).toBe(
      vendorOrg,
    );
  });

  it('a lista é conjunta e não identificada: o vendedor vê os textos, nunca quem perguntou', async () => {
    const clarificationId = (await one<{ id: string }>('select id from public.survey_clarifications where request_survey_id = $1', [surveyId])).id;
    await as(CP2, () => db.query('select public.request_painter_doubt($1, $2)', [surveyId, 'Há acesso de andaime ou é preciso contratar?']));
    const stillOne = await one<{ n: string }>('select count(*)::text as n from public.survey_clarifications where request_survey_id = $1', [surveyId]);
    expect(stillOne.n).toBe('1'); // a segunda dúvida juntou-se à mesma tentativa, não abriu outra
    const batch = await as(VEND, async () => (await db.query<{ texto: string }>('select texto from public.clarification_batch($1) order by texto', [clarificationId])).rows);
    expect(batch.map((r) => r.texto)).toEqual(['Falta saber se há andaime montado.', 'Há acesso de andaime ou é preciso contratar?']);
    expect(await as(B, async () => (await db.query('select texto from public.clarification_batch($1)', [clarificationId])).rows)).toEqual([]);
    const items = await one<{ n: string }>('select count(*)::text as n from public.survey_clarification_items where clarification_id = $1', [clarificationId]);
    expect(items.n).toBe('2');
  });

  it('dia 1 falhado: perde a comissão por completo e fica impedido de reservar a tentativa seguinte', async () => {
    const clarificationId = (await one<{ id: string }>('select id from public.survey_clarifications where request_survey_id = $1', [surveyId])).id;
    await db.query(`update public.survey_clarifications set confirm_deadline = now() - interval '1 hour' where id = $1`, [clarificationId]);
    await db.query('select private.daily_maintenance()');
    expect((await one<{ status: string }>('select status from public.survey_clarifications where id = $1', [clarificationId])).status).toBe('expirado');
    const excluded = await one<{ clarification_excluded_orgs: string[] }>(
      'select clarification_excluded_orgs from public.request_surveys where id = $1',
      [surveyId],
    );
    expect(excluded.clarification_excluded_orgs).toEqual([vendorOrg]);
    // a comissão só se transfere quando outro vendedor reservar — não se solta por si só.
    expect((await one<{ vendedor_org_id: string }>('select vendedor_org_id from public.request_surveys where id = $1', [surveyId])).vendedor_org_id).toBe(
      vendorOrg,
    );
    const next = await one<{ id: string; vendedor_org_id: string | null }>(
      `select id, vendedor_org_id from public.survey_clarifications where request_survey_id = $1 and status = 'aberto'`,
      [surveyId],
    );
    expect(next.vendedor_org_id).toBeNull();
    // as duas dúvidas, ainda sem resposta, passaram para a tentativa nova.
    const items = await one<{ n: string }>('select count(*)::text as n from public.survey_clarification_items where clarification_id = $1', [next.id]);
    expect(items.n).toBe('2');
    await expect(as(VEND, () => db.query('select public.claim_clarification($1, $2)', [next.id, vendorOrg]))).rejects.toThrow(/já não pode reservar/);
  });

  it('o segundo vendedor reserva o esclarecimento e herda a comissão de todo o levantamento', async () => {
    const next = await one<{ id: string }>(`select id from public.survey_clarifications where request_survey_id = $1 and status = 'aberto'`, [surveyId]);
    await as(VEND2, () => db.query('select public.claim_clarification($1, $2)', [next.id, vendor2Org]));
    expect((await one<{ vendedor_org_id: string }>('select vendedor_org_id from public.request_surveys where id = $1', [surveyId])).vendedor_org_id).toBe(
      vendor2Org,
    );
    await as(VEND2, () => db.query('select public.confirm_clarification($1)', [next.id]));
    await as(VEND2, () => db.query('select public.respond_clarification($1, $2)', [next.id, 'Há andaime próprio montado, inclui-se no preço.']));
    const done = await one<{ status: string; resposta: string }>('select status, resposta from public.survey_clarifications where id = $1', [next.id]);
    expect(done).toEqual({ status: 'respondido', resposta: 'Há andaime próprio montado, inclui-se no preço.' });
  });

  it('avaliação do pintor sobre a informação do levantamento: uma por pintor, corrige em vez de duplicar', async () => {
    await as(CP, () => db.query('select public.rate_survey_info($1, $2, $3)', [surveyId, 4, 'Faltava saber a altura das paredes.']));
    await as(CP2, () => db.query('select public.rate_survey_info($1, $2, $3)', [surveyId, 2, null]));
    const mediaAntes = await one<{ media: number }>(
      'select avg(nota)::float8 as media from public.survey_info_reviews where request_survey_id = $1',
      [surveyId],
    );
    expect(mediaAntes.media).toBe(3);
    // o mesmo pintor avalia outra vez: corrige a sua nota, não duplica.
    await as(CP, () => db.query('select public.rate_survey_info($1, $2, $3)', [surveyId, 5, null]));
    const n = await one<{ n: string }>('select count(*)::text as n from public.survey_info_reviews where request_survey_id = $1', [surveyId]);
    expect(n.n).toBe('2');
    // só o próprio pintor e o cliente veem; um vendedor ou um estranho, não.
    const seenByPainter = await as(CP, async () => (await db.query('select nota from public.survey_info_reviews where painter_user_id = $1', [CP])).rows);
    expect(seenByPainter).toEqual([{ nota: 5 }]);
    expect(await as(VEND2, async () => (await db.query('select nota from public.survey_info_reviews where request_survey_id = $1', [surveyId])).rows)).toEqual(
      [],
    );
    expect(await as(B, async () => (await db.query('select nota from public.survey_info_reviews where request_survey_id = $1', [surveyId])).rows)).toEqual(
      [],
    );
    const seenByClient = await as(A, async () => (await db.query('select nota from public.survey_info_reviews where request_survey_id = $1', [surveyId])).rows);
    expect(seenByClient).toHaveLength(2);
  });
});
