-- Paint it — o convite diz a que entidade a pessoa se vai juntar.
-- O convidado ainda não pode ler a entidade (só os membros a veem), por isso o painel mostrava
-- só o papel e a data. Guarda-se no convite o nome e o tipo da entidade, copiados no momento do
-- convite por um trigger: quem convida não os pode escolher, e quem é convidado não os pode mudar
-- (só tem permissão de update sobre accepted_at e accepted_by).

alter table public.org_invitations add column org_nome text, add column org_kind public.org_kind;

create function private.fill_invitation_org() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  select o.nome, o.kind into new.org_nome, new.org_kind from public.organizations o where o.id = new.org_id;
  return new;
end $$;
revoke all on function private.fill_invitation_org() from public, anon;

create trigger org_invitations_fill_org before insert on public.org_invitations
  for each row execute function private.fill_invitation_org();

update public.org_invitations i set org_nome = o.nome, org_kind = o.kind
  from public.organizations o
  where o.id = i.org_id and i.org_nome is null;
