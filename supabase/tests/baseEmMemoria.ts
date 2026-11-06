import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PGlite } from '@electric-sql/pglite';

// Uma base Postgres em memória com as migrações do repositório aplicadas por ordem de nome, e o mínimo do
// ambiente Supabase simulado (papéis, auth.uid(), storage). Não substitui os avisos de segurança do projeto
// real, que se consultam depois de aplicar.

export const SUPABASE_STUB = `
  create role anon nologin;
  create role authenticated nologin;
  -- A chave de serviço do Supabase corre como este papel. Existe aqui porque há portas abertas só a ele.
  create role service_role nologin bypassrls;
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
  -- No Supabase a chave de serviço chega a tudo; aqui, ao armazenamento, onde há carregamentos só dela.
  grant usage on schema storage to service_role;
  grant all on storage.objects to service_role;
  grant usage on schema public to anon, authenticated;
  alter default privileges in schema public grant all on tables to anon, authenticated;
`;

/** Corre o ambiente simulado e todas as migrações, pela ordem dos nomes dos ficheiros. */
export async function baseComMigracoes(): Promise<PGlite> {
  const db = new PGlite();
  await db.exec(SUPABASE_STUB);
  const dir = join(__dirname, '..', 'migrations');
  for (const file of readdirSync(dir).filter((f) => f.endsWith('.sql')).sort()) {
    await db.exec(readFileSync(join(dir, file), 'utf8'));
  }
  return db;
}
