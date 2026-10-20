-- Pintor e fornecedor: uma conta corresponde a uma só empresa (decisão de 20/10/2026).
-- Clientes (administradora, condomínios, particular) continuam a poder ter várias entidades.
-- Igual a allowedOrgKinds() em src/domain/organization.ts.
create or replace function private.one_profile_per_account() returns trigger
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
  if v_new <> 'cliente' and exists (
    select 1 from public.org_members m join public.organizations o on o.id = m.org_id
    where m.user_id = new.user_id and m.org_id <> new.org_id and private.account_profile(o.kind) = v_new
  ) then
    raise exception 'Uma conta de pintor ou de fornecedor corresponde a uma só empresa: use outro email.'
      using errcode = 'P0001';
  end if;
  return new;
end $$;
