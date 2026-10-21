-- Avisos e bloqueio por tentativas de partilhar contactos (decisão de 21/10/2026, src/domain/strikes.ts).
-- Cada instrução numa só linha. Só o servidor (chave secreta) escreve; o utilizador lê o que lhe diz respeito.
create table public.contact_violations (id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users (id) on delete cascade, onde text not null check (length(onde) <= 40), motivos text[] not null, texto text not null check (length(texto) <= 2000), anulada_em timestamptz, created_at timestamptz not null default now());
create index contact_violations_user_idx on public.contact_violations (user_id, created_at);
create table public.blocked_users (user_id uuid primary key references auth.users (id) on delete cascade, motivo text not null, blocked_at timestamptz not null default now());
create table public.blocked_identifiers (nif text primary key, user_id uuid references auth.users (id) on delete set null, created_at timestamptz not null default now());
alter table public.contact_violations enable row level security;
alter table public.blocked_users enable row level security;
alter table public.blocked_identifiers enable row level security;
revoke all on public.contact_violations, public.blocked_users, public.blocked_identifiers from anon;
revoke insert, update, delete on public.contact_violations, public.blocked_users, public.blocked_identifiers from authenticated;
create policy contact_violations_select on public.contact_violations for select to authenticated using (user_id = (select auth.uid()) or (select private.is_platform_admin()));
create policy blocked_users_select on public.blocked_users for select to authenticated using (user_id = (select auth.uid()) or (select private.is_platform_admin()));
create policy blocked_identifiers_select on public.blocked_identifiers for select to authenticated using ((select private.is_platform_admin()));
create function private.refuse_blocked_nif() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.nif is not null and exists (select 1 from public.blocked_identifiers b where b.nif = new.nif) then
    raise exception 'Este NIF pertence a uma conta bloqueada.' using errcode = 'P0001';
  end if;
  return new;
end $$;
revoke all on function private.refuse_blocked_nif() from public, anon, authenticated;
create trigger organizations_blocked_nif before insert or update of nif on public.organizations for each row execute function private.refuse_blocked_nif();
