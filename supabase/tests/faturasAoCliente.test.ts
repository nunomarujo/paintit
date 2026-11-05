import type { PGlite } from '@electric-sql/pglite';
import { beforeAll, describe, expect, it } from 'vitest';
import { baseComMigracoes } from './baseEmMemoria';

// A fatura emitida chega a quem a deve (05/11/2026): proprietários e gestores da entidade leem as suas faturas
// emitidas e o PDF; mais ninguém, e nunca as que falharam (o campo `erro` traz texto interno da Moloni).
// O registo dos envios é só da equipa da plataforma.

let db: PGlite;

const DONO = '00000000-0000-4000-8000-00000000f001';
const GESTOR = '00000000-0000-4000-8000-00000000f002';
const VENDEDOR = '00000000-0000-4000-8000-00000000f003'; // membro sem papel de gestão
const ESTRANHO = '00000000-0000-4000-8000-00000000f004'; // dono de outra entidade
const EQUIPA = '00000000-0000-4000-8000-00000000f005';

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
let outra: string;
let emitida: string;
let falhada: string;
let deOutra: string;

const documento = async (orgId: string, estado: 'emitido' | 'falhou', origem: string) =>
  (
    await one<{ id: string }>(
      `insert into public.fiscal_documents (reason, org_id, origin_type, origin_id, tipo, estado, data, cliente_nome, total_cents, pdf_path, erro)
       values ('subscricao', $1, 'ensaio', $2, 'FT', $3, '2026-11-05', 'Entidade', 12300, $4, $5) returning id`,
      [orgId, origem, estado, estado === 'emitido' ? `ensaio/${origem}.pdf` : null, estado === 'falhou' ? 'erro interno da Moloni' : null],
    )
  ).id;

beforeAll(async () => {
  db = await baseComMigracoes();
  await db.query('insert into auth.users (id, email) values ($1, $2), ($3, $4), ($5, $6), ($7, $8), ($9, $10)', [
    DONO, 'dono@teste.invalid', GESTOR, 'gestor@teste.invalid', VENDEDOR, 'vend@teste.invalid', ESTRANHO, 'estranho@teste.invalid', EQUIPA, 'equipa@teste.invalid',
  ]);
  await db.query('insert into public.platform_admins (user_id) values ($1)', [EQUIPA]);
  org = (await as(DONO, () => one<{ id: string }>(`insert into public.organizations (kind, nome, nif) values ('fornecedor', 'Tintas de Ensaio', '503504564') returning id`))).id;
  outra = (await as(ESTRANHO, () => one<{ id: string }>(`insert into public.organizations (kind, nome, nif) values ('pintor', 'Outra Pintura', '501964843') returning id`))).id;
  await db.query(`insert into public.org_members (org_id, user_id, role) values ($1, $2, 'gestor'), ($1, $3, 'vendedor')`, [org, GESTOR, VENDEDOR]);
  emitida = await documento(org, 'emitido', 'a1');
  falhada = await documento(org, 'falhou', 'a2');
  deOutra = await documento(outra, 'emitido', 'b1');
  await db.query(`insert into storage.objects (bucket_id, name) values ('documentos-fiscais', 'ensaio/a1.pdf'), ('documentos-fiscais', 'ensaio/b1.pdf')`);
}, 60_000);

const ids = async (user: string) => (await as(user, () => db.query<{ id: string }>('select id from public.fiscal_documents'))).rows.map((r) => r.id);

describe('quem vê as faturas', () => {
  it('o proprietário e o gestor veem a fatura emitida à sua entidade', async () => {
    expect(await ids(DONO)).toContain(emitida);
    expect(await ids(GESTOR)).toContain(emitida);
  });
  it('um membro sem papel de gestão não vê nenhuma', async () => {
    expect(await ids(VENDEDOR)).toEqual([]);
  });
  it('ninguém vê as faturas de outra entidade', async () => {
    expect(await ids(DONO)).not.toContain(deOutra);
    expect(await ids(ESTRANHO)).toEqual([deOutra]);
  });
  it('as que falharam não saem da plataforma: o erro é texto interno', async () => {
    expect(await ids(DONO)).not.toContain(falhada);
    expect(await ids(GESTOR)).not.toContain(falhada);
  });
  it('a equipa vê tudo', async () => {
    expect((await ids(EQUIPA)).sort()).toEqual([emitida, falhada, deOutra].sort());
  });
});

describe('quem abre o PDF', () => {
  const pdfs = async (user: string) => (await as(user, () => db.query<{ name: string }>(`select name from storage.objects where bucket_id = 'documentos-fiscais'`))).rows.map((r) => r.name).sort();
  it('só o da sua entidade', async () => {
    expect(await pdfs(DONO)).toEqual(['ensaio/a1.pdf']);
    expect(await pdfs(ESTRANHO)).toEqual(['ensaio/b1.pdf']);
    expect(await pdfs(VENDEDOR)).toEqual([]);
  });
  it('a equipa abre todos', async () => {
    expect(await pdfs(EQUIPA)).toEqual(['ensaio/a1.pdf', 'ensaio/b1.pdf']);
  });
});

describe('o registo dos envios', () => {
  it('a entidade não o lê nem o escreve; a equipa lê', async () => {
    await db.query(`insert into public.fiscal_document_envios (document_id, para, estado) values ($1, 'dono@teste.invalid', 'enviado')`, [emitida]);
    expect((await as(DONO, () => db.query('select id from public.fiscal_document_envios'))).rows).toHaveLength(0);
    expect((await as(EQUIPA, () => db.query('select id from public.fiscal_document_envios'))).rows).toHaveLength(1);
    await expect(as(DONO, () => db.query(`insert into public.fiscal_document_envios (document_id, para, estado) values ($1, 'x@y.pt', 'enviado')`, [emitida]))).rejects.toThrow();
  });
  it('a fatura emitida continua imutável', async () => {
    await expect(db.query(`update public.fiscal_documents set org_id = $1 where id = $2`, [outra, emitida])).rejects.toThrow(/não se altera/);
  });
});
