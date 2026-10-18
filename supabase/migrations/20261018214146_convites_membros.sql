-- Paint it — convites para membros de uma organização.
-- O proprietário convida um email com um papel. A pessoa entra com esse email
-- (a entrada por link prova que o email é dela) e aceita: só então passa a
-- membro, com o papel exato do convite.

create function private.current_email() returns text
language sql stable set search_path = '' as $$
  select lower(coalesce((select auth.jwt()) ->> 'email', ''));
$$;
revoke all on function private.current_email() from public, anon;
grant execute on function private.current_email() to authenticated;

create table public.org_invitations (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  email text not null check (email = lower(email) and email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'),
  role public.member_role not null,
  invited_by uuid not null default auth.uid() references auth.users (id),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '14 days',
  accepted_at timestamptz,
  accepted_by uuid references auth.users (id)
);
create unique index org_invitations_pending_key on public.org_invitations (org_id, email) where accepted_at is null;
create index org_invitations_email_idx on public.org_invitations (email);
create index org_invitations_invited_by_idx on public.org_invitations (invited_by);
create index org_invitations_accepted_by_idx on public.org_invitations (accepted_by);

alter table public.org_invitations enable row level security;
revoke all on public.org_invitations from anon;
-- Quem aceita só pode marcar a aceitação; nunca mudar o papel, o email ou a organização.
revoke update on public.org_invitations from authenticated;
grant update (accepted_at, accepted_by) on public.org_invitations to authenticated;

create policy org_invitations_select on public.org_invitations for select to authenticated
  using (
    private.has_role(org_id, array['proprietario']::public.member_role[])
    or email = private.current_email()
  );
create policy org_invitations_insert on public.org_invitations for insert to authenticated
  with check (
    private.has_role(org_id, array['proprietario']::public.member_role[])
    and invited_by = (select auth.uid())
    and accepted_at is null
    and accepted_by is null
  );
create policy org_invitations_delete on public.org_invitations for delete to authenticated
  using (private.has_role(org_id, array['proprietario']::public.member_role[]) and accepted_at is null);
create policy org_invitations_accept on public.org_invitations for update to authenticated
  using (email = private.current_email() and accepted_at is null and expires_at > now())
  with check (email = private.current_email() and accepted_by = (select auth.uid()));

-- Perfis: email da conta, copiado de auth.users, e visibilidade entre colegas
-- da mesma organização (para a lista de membros).
alter table public.profiles add column email text;

create function private.sync_profile_email() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (user_id, email) values (new.id, lower(new.email))
  on conflict (user_id) do update set email = excluded.email;
  return new;
end $$;
revoke all on function private.sync_profile_email() from public, anon, authenticated;

create trigger on_auth_user_email after insert or update of email on auth.users
  for each row execute function private.sync_profile_email();

insert into public.profiles (user_id, email)
select id, lower(email) from auth.users
on conflict (user_id) do update set email = excluded.email;

create function private.shares_org(p_user uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1
    from public.org_members mine
    join public.org_members theirs on theirs.org_id = mine.org_id
    where mine.user_id = (select auth.uid()) and theirs.user_id = p_user
  );
$$;
revoke all on function private.shares_org(uuid) from public, anon;
grant execute on function private.shares_org(uuid) to authenticated;

create policy profiles_colleagues_select on public.profiles for select to authenticated
  using (private.shares_org(user_id));

-- O perfil é criado pelo gatilho e o email vem da conta: o utilizador só
-- altera o nome e o telefone.
-- (Sem privilégio de insert, a política profiles_own_insert deixa de ter efeito.)
revoke insert, update on public.profiles from authenticated;
grant update (nome, telefone) on public.profiles to authenticated;

-- Um convidado pode juntar-se a si próprio, com o papel do convite pendente.
-- Soma-se à política org_members_insert (o proprietário adiciona membros).
create policy org_members_join_by_invite on public.org_members for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1
      from public.org_invitations i
      where i.org_id = org_members.org_id
        and i.email = private.current_email()
        and i.role = org_members.role
        and i.accepted_at is null
        and i.expires_at > now()
    )
  );
