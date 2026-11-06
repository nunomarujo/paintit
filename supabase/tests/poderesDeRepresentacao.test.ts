import type { PGlite } from '@electric-sql/pglite';
import { beforeAll, describe, expect, it } from 'vitest';
import { baseComMigracoes } from './baseEmMemoria';

// Poderes de representação (05/11/2026, migração `poderes_de_representacao`): utilizador a utilizador.
//
// - O código de acesso da certidão é um segredo: quem gere a entidade entrega-o (e troca-o), só a equipa da
//   plataforma o lê — nem quem o entregou o volta a ver.
// - A leitura (quem tem poderes, forma de obrigar, validade) só a equipa a regista; quem gere a entidade
//   lê-a com os nomes, para dar por um erro de transcrição; os outros membros só o estado; mais ninguém.
// - Trocar o código põe a leitura por fazer.

let db: PGlite;

const DONO = '00000000-0000-4000-8000-0000000c0d01'; // proprietário do pintor (sociedade)
const GESTOR = '00000000-0000-4000-8000-0000000c0d02';
const FINANCEIRO = '00000000-0000-4000-8000-0000000c0d03'; // membro sem papel de gestão
const ESTRANHO = '00000000-0000-4000-8000-0000000c0d04'; // dono de outra entidade
const EQUIPA = '00000000-0000-4000-8000-0000000c0d05';
const GESTORA = '00000000-0000-4000-8000-0000000c0d06'; // gestora da administradora que gere o condomínio
const FORNECEDOR = '00000000-0000-4000-8000-0000000c0d07'; // dono de um fornecedor (uma conta, um perfil)

const CODIGO = '1234-5678-9012';

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
const one = async <T>(sql: string, params: unknown[] = []) => (await db.query<T>(sql, params)).rows[0]!;
const rows = async <T>(user: string | null, sql: string, params: unknown[] = []) => (await as(user, () => db.query<T>(sql, params))).rows;

let pintor: string;
let particular: string;
let condo: string;

const definir = (user: string | null, org: string, codigo: string) =>
  as(user, () => db.query('select public.definir_codigo_certidao($1, $2)', [org, codigo]));

const membros = JSON.stringify([
  { nome: 'JOÃO LUIS MARQUES DA SILVA', cargo: 'Gerente', nif: '123456789' },
  { nome: 'ANA COSTA', cargo: 'Gerente', nif: null },
]);
const registar = (
  user: string | null,
  org: string,
  fonte = 'certidao',
  m = membros,
  validaAte = '2099-01-01',
  assinaturas: number | null = 2,
) =>
  as(user, () =>
    db.query('select public.registar_leitura_poderes($1, $2, $3, $4, $5, $6::jsonb)', [
      org,
      fonte,
      'Com a assinatura de dois gerentes.',
      assinaturas,
      validaAte,
      m,
    ]),
  );

beforeAll(async () => {
  db = await baseComMigracoes();
  for (const u of [DONO, GESTOR, FINANCEIRO, ESTRANHO, EQUIPA, GESTORA, FORNECEDOR]) {
    await db.query('insert into auth.users (id, email) values ($1, $2)', [u, `u${u.slice(-2)}@teste.invalid`]);
  }
  await db.query('insert into public.platform_admins (user_id) values ($1)', [EQUIPA]);
  pintor = (
    await as(DONO, () =>
      one<{ id: string }>(
        `insert into public.organizations (kind, nome, nif) values ('pintor', 'Pinturas de Ensaio, Lda', '503504564') returning id`,
      ),
    )
  ).id;
  particular = (
    await as(ESTRANHO, () =>
      one<{ id: string }>(`insert into public.organizations (kind, nome) values ('particular', 'Rui Mota') returning id`),
    )
  ).id;
  const gestora = (
    await as(GESTORA, () =>
      one<{ id: string }>(
        `insert into public.organizations (kind, nome, nif) values ('administradora', 'Gestão de Ensaio, Lda', '500000000') returning id`,
      ),
    )
  ).id;
  condo = (
    await as(GESTORA, () =>
      one<{ id: string }>(
        `insert into public.organizations (kind, nome, nif, gerida_por) values ('condominio', 'Condomínio de Ensaio', '901000000', $1) returning id`,
        [gestora],
      ),
    )
  ).id;
  await db.query(`insert into public.org_members (org_id, user_id, role) values ($1, $2, 'gestor'), ($1, $3, 'financeiro')`, [
    pintor,
    GESTOR,
    FINANCEIRO,
  ]);
}, 300_000);

describe('o código de acesso', () => {
  it('quem gere a entidade entrega-o; fica escrito no formato do portal', async () => {
    await definir(GESTOR, pintor, ' 1234 5678 9012 ');
    expect((await one<{ codigo: string }>('select codigo from public.certidao_codigos where org_id = $1', [pintor])).codigo).toBe(CODIGO);
  });

  it('um formato errado é recusado, sem repetir o que se escreveu', async () => {
    await expect(definir(DONO, pintor, '1234-5678-901')).rejects.toThrow(/12 algarismos/);
    await expect(definir(DONO, pintor, '1234-5678-901')).rejects.not.toThrow(/1234/);
    await expect(definir(DONO, pintor, 'abcd-efgh-ijkl')).rejects.toThrow(/12 algarismos/);
  });

  it('quem não gere a entidade não o define: membro sem gestão, estranho, equipa e anónimo', async () => {
    await expect(definir(FINANCEIRO, pintor, '9999-9999-9999')).rejects.toThrow(/Sem permissão/);
    await expect(definir(ESTRANHO, pintor, '9999-9999-9999')).rejects.toThrow(/Sem permissão/);
    await expect(definir(EQUIPA, pintor, '9999-9999-9999')).rejects.toThrow(/Sem permissão/);
    await expect(definir(null, pintor, '9999-9999-9999')).rejects.toThrow(/permission denied/);
    expect((await one<{ codigo: string }>('select codigo from public.certidao_codigos where org_id = $1', [pintor])).codigo).toBe(CODIGO);
  });

  it('um particular e um condomínio não têm certidão permanente', async () => {
    await expect(definir(ESTRANHO, particular, CODIGO)).rejects.toThrow(/não usa a certidão/);
    await expect(definir(GESTORA, condo, CODIGO)).rejects.toThrow(/não usa a certidão/);
  });

  it('só a equipa o lê: nem quem o entregou o volta a ver', async () => {
    expect(await rows(DONO, 'select codigo from public.certidao_codigos')).toEqual([]);
    expect(await rows(GESTOR, 'select codigo from public.certidao_codigos')).toEqual([]);
    expect(await rows(FINANCEIRO, 'select codigo from public.certidao_codigos')).toEqual([]);
    expect(await rows(ESTRANHO, 'select codigo from public.certidao_codigos')).toEqual([]);
    await expect(rows(null, 'select codigo from public.certidao_codigos')).rejects.toThrow(/permission denied/);
    expect(await rows(EQUIPA, 'select codigo from public.certidao_codigos where org_id = $1', [pintor])).toEqual([{ codigo: CODIGO }]);
  });

  it('ninguém o escreve à mão, nem a equipa', async () => {
    for (const u of [DONO, EQUIPA]) {
      await expect(as(u, () => db.query(`update public.certidao_codigos set codigo = '0000-0000-0000'`))).rejects.toThrow(
        /permission denied/,
      );
      await expect(
        as(u, () => db.query(`insert into public.certidao_codigos (org_id, codigo) values ($1, '0000-0000-0000')`, [particular])),
      ).rejects.toThrow(/permission denied/);
      await expect(as(u, () => db.query(`delete from public.certidao_codigos`))).rejects.toThrow(/permission denied/);
    }
  });

  it('a entidade vê que o entregou, e quando — o estado, não o código', async () => {
    const [estado] = await rows<{ codigo_entregue_em: string | null; lida_em: string | null }>(
      GESTOR,
      'select codigo_entregue_em, lida_em from public.poderes_de_representacao where org_id = $1',
      [pintor],
    );
    expect(estado!.codigo_entregue_em).not.toBeNull();
    expect(estado!.lida_em).toBeNull();
    const colunas = (
      await db.query<{ column_name: string }>(
        `select column_name from information_schema.columns where table_schema = 'public' and table_name in ('poderes_de_representacao', 'poderes_membros')`,
      )
    ).rows.map((c) => c.column_name);
    expect(colunas).not.toContain('codigo');
  });
});

describe('a leitura', () => {
  it('só a equipa a regista', async () => {
    await expect(registar(DONO, pintor)).rejects.toThrow(/Só a equipa/);
    await expect(registar(GESTOR, pintor)).rejects.toThrow(/Só a equipa/);
    await expect(registar(null, pintor)).rejects.toThrow(/permission denied/);
    await registar(EQUIPA, pintor);
    const l = await one<{ lida_por: string; assinaturas_exigidas: number; forma_de_obrigar: string }>(
      'select lida_por, assinaturas_exigidas, forma_de_obrigar from public.poderes_de_representacao where org_id = $1',
      [pintor],
    );
    expect(l).toEqual({ lida_por: EQUIPA, assinaturas_exigidas: 2, forma_de_obrigar: 'Com a assinatura de dois gerentes.' });
  });

  it('quem gere a entidade lê-a, com os nomes; o membro sem gestão só o estado; o estranho nada', async () => {
    const nomes = (u: string) =>
      rows<{ nome: string }>(u, 'select nome from public.poderes_membros where org_id = $1 order by ordem', [pintor]);
    expect((await nomes(DONO)).map((m) => m.nome)).toEqual(['JOÃO LUIS MARQUES DA SILVA', 'ANA COSTA']);
    expect(await nomes(GESTOR)).toHaveLength(2);
    expect(await nomes(EQUIPA)).toHaveLength(2);
    expect(await nomes(FINANCEIRO)).toEqual([]);
    expect(await nomes(ESTRANHO)).toEqual([]);
    // O estado não tem dados pessoais e diz ao resto da equipa se a certidão ainda falta.
    expect(await rows(FINANCEIRO, 'select org_id from public.poderes_de_representacao')).toEqual([{ org_id: pintor }]);
    expect(await rows(ESTRANHO, 'select org_id from public.poderes_de_representacao')).toEqual([]);
    await expect(rows(null, 'select org_id from public.poderes_de_representacao')).rejects.toThrow(/permission denied/);
    await expect(rows(null, 'select nome from public.poderes_membros')).rejects.toThrow(/permission denied/);
  });

  it('ninguém a altera à mão: só pela função', async () => {
    for (const u of [DONO, EQUIPA]) {
      await expect(as(u, () => db.query(`update public.poderes_de_representacao set assinaturas_exigidas = 1`))).rejects.toThrow(
        /permission denied/,
      );
      await expect(as(u, () => db.query(`update public.poderes_membros set nome = 'OUTRO NOME'`))).rejects.toThrow(/permission denied/);
      await expect(
        as(u, () => db.query(`insert into public.poderes_membros (org_id, ordem, nome, cargo) values ($1, 9, 'X', 'Gerente')`, [pintor])),
      ).rejects.toThrow(/permission denied/);
      await expect(as(u, () => db.query(`delete from public.poderes_membros`))).rejects.toThrow(/permission denied/);
    }
  });

  it('registar outra vez substitui a lista inteira', async () => {
    await registar(EQUIPA, pintor, 'certidao', JSON.stringify([{ nome: 'ANA COSTA', cargo: 'Gerente única' }]), '2099-01-01', 1);
    const m = await db.query<{ nome: string; ordem: number }>('select nome, ordem from public.poderes_membros where org_id = $1', [pintor]);
    expect(m.rows).toEqual([{ nome: 'ANA COSTA', ordem: 1 }]);
  });

  it('«a confirmar» fica sem número de assinaturas', async () => {
    await registar(EQUIPA, pintor, 'certidao', membros, '2099-01-01', null);
    expect(
      (await one<{ n: number | null }>('select assinaturas_exigidas n from public.poderes_de_representacao where org_id = $1', [pintor])).n,
    ).toBeNull();
  });

  it('recusa o que não faz sentido', async () => {
    await expect(registar(EQUIPA, pintor, 'certidao', membros, '2099-01-01', 3)).rejects.toThrow(/1, 2 ou/);
    await expect(registar(EQUIPA, pintor, 'certidao', membros, '2020-01-01')).rejects.toThrow(/já passou/);
    await expect(registar(EQUIPA, pintor, 'certidao', '[]')).rejects.toThrow(/entre 1 e 20/);
    await expect(
      registar(EQUIPA, pintor, 'certidao', JSON.stringify(Array.from({ length: 21 }, () => ({ nome: 'A B', cargo: 'Gerente' })))),
    ).rejects.toThrow(/entre 1 e 20/);
    await expect(
      registar(EQUIPA, pintor, 'certidao', JSON.stringify([{ nome: 'ANA COSTA', cargo: 'Gerente', nif: '123456780' }])),
    ).rejects.toThrow();
    await expect(registar(EQUIPA, pintor, 'certidao', JSON.stringify([{ nome: ' ', cargo: 'Gerente' }]))).rejects.toThrow();
    await expect(registar(EQUIPA, pintor, 'ata')).rejects.toThrow(/certidão permanente/);
    await expect(registar(EQUIPA, particular)).rejects.toThrow(/não tem poderes/);
    // Nenhuma das tentativas recusadas mexeu na leitura que lá estava.
    expect((await db.query('select nome from public.poderes_membros where org_id = $1', [pintor])).rows).toHaveLength(2);
  });
});

describe('trocar o código', () => {
  it('o mesmo código outra vez não mexe na leitura', async () => {
    await definir(DONO, pintor, CODIGO);
    expect(
      (await one<{ lida_em: string | null }>('select lida_em from public.poderes_de_representacao where org_id = $1', [pintor])).lida_em,
    ).not.toBeNull();
  });

  it('um código novo põe a leitura por fazer e apaga os nomes da anterior', async () => {
    await definir(GESTOR, pintor, '2222-3333-4444');
    const l = await one<{
      lida_em: string | null;
      forma_de_obrigar: string | null;
      valida_ate: string | null;
      codigo_entregue_em: string | null;
    }>('select lida_em, forma_de_obrigar, valida_ate, codigo_entregue_em from public.poderes_de_representacao where org_id = $1', [pintor]);
    expect(l.lida_em).toBeNull();
    expect(l.forma_de_obrigar).toBeNull();
    expect(l.valida_ate).toBeNull();
    expect(l.codigo_entregue_em).not.toBeNull();
    expect((await db.query('select id from public.poderes_membros where org_id = $1', [pintor])).rows).toEqual([]);
    expect(await rows(EQUIPA, 'select codigo from public.certidao_codigos where org_id = $1', [pintor])).toEqual([
      { codigo: '2222-3333-4444' },
    ]);
  });

  it('ler de novo guarda a data de entrega do código', async () => {
    await registar(EQUIPA, pintor);
    const l = await one<{ lida_em: string | null; codigo_entregue_em: string | null }>(
      'select lida_em, codigo_entregue_em from public.poderes_de_representacao where org_id = $1',
      [pintor],
    );
    expect(l.lida_em).not.toBeNull();
    expect(l.codigo_entregue_em).not.toBeNull();
  });
});

describe('condomínio: o administrador, pela ata de nomeação', () => {
  it('a equipa regista com a fonte «ata»; a certidão não serve', async () => {
    await expect(registar(EQUIPA, condo, 'certidao')).rejects.toThrow(/ata de nomeação/);
    await registar(EQUIPA, condo, 'ata', JSON.stringify([{ nome: 'MARIA SOUSA', cargo: 'Administradora' }]), '2099-01-01', 1);
  });

  it('a gestora da administradora que gere o condomínio lê-a; o estranho não', async () => {
    expect(await rows(GESTORA, 'select nome from public.poderes_membros where org_id = $1', [condo])).toEqual([{ nome: 'MARIA SOUSA' }]);
    expect(await rows(ESTRANHO, 'select nome from public.poderes_membros where org_id = $1', [condo])).toEqual([]);
    expect(await rows(DONO, 'select org_id from public.poderes_de_representacao where org_id = $1', [condo])).toEqual([]);
  });
});

describe('apagar a entidade apaga tudo o que é dela', () => {
  it('leitura, nomes e código', async () => {
    const tmp = (
      await as(FORNECEDOR, () =>
        one<{ id: string }>(
          `insert into public.organizations (kind, nome, nif) values ('fornecedor', 'Tintas Temporárias', '501964843') returning id`,
        ),
      )
    ).id;
    await definir(FORNECEDOR, tmp, CODIGO);
    await registar(EQUIPA, tmp);
    await db.query('delete from public.organizations where id = $1', [tmp]);
    for (const t of ['certidao_codigos', 'poderes_de_representacao', 'poderes_membros']) {
      expect((await db.query(`select 1 from public.${t} where org_id = $1`, [tmp])).rows).toEqual([]);
    }
  });
});
