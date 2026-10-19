-- Uma conta tem um só perfil (decisão de 20/10/2026): cliente (condomínio, administradora,
-- particular), pintor ou fornecedor. Vale para novas entidades e para convites aceites;
-- as contas de teste anteriores mantêm-se. Igual a accountProfile() em src/domain/organization.ts.
create function private.account_profile(p_kind public.org_kind) returns text
language sql immutable set search_path = '' as $$
  select case p_kind when 'pintor' then 'pintor' when 'fornecedor' then 'fornecedor' else 'cliente' end
$$;
revoke all on function private.account_profile(public.org_kind) from public, anon;

create function private.one_profile_per_account() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_new text;
begin
  select private.account_profile(o.kind) into v_new from public.organizations o where o.id = new.org_id;
  if exists (
    select 1 from public.org_members m join public.organizations o on o.id = m.org_id
    where m.user_id = new.user_id and m.org_id <> new.org_id and private.account_profile(o.kind) <> v_new
  ) then
    raise exception 'Esta conta já tem outro perfil. Cada conta é só de cliente, de pintor ou de fornecedor: use outro email.'
      using errcode = 'P0001';
  end if;
  return new;
end $$;
revoke all on function private.one_profile_per_account() from public, anon, authenticated;

create trigger org_members_one_profile before insert on public.org_members
  for each row execute function private.one_profile_per_account();
