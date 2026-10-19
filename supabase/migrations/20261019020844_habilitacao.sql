-- Habilitação do empreiteiro (parecer C1): classe do alvará no documento e
-- confirmação na submissão da proposta. Igual a src/domain/license.ts (há um
-- teste que compara os limites).

alter table public.org_documents
  add column classe smallint check (classe between 1 and 9),
  add constraint org_documents_classe_alvara check (classe is null or kind = 'alvara_impic');

alter table public.proposals add column habilitacao_ok boolean;

create function private.license_ok(p_org uuid, p_base bigint) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.org_documents d
    where d.org_id = p_org
      and d.status = 'aprovado'
      and (d.valido_ate is null or d.valido_ate >= (now() at time zone 'Europe/Lisbon')::date)
      and (
        (p_base <= 4000000 and d.kind in ('certificado_impic', 'alvara_impic'))
        or (d.kind = 'alvara_impic' and coalesce(d.classe, 0) >= case
              when p_base <= 20000000 then 1
              when p_base <= 40000000 then 2
              when p_base <= 80000000 then 3
              else 4 end)
      )
  );
$$;
revoke all on function private.license_ok(uuid, bigint) from public, anon;
grant execute on function private.license_ok(uuid, bigint) to authenticated;

-- Corre depois de proposals_transition (ordem alfabética), já com a base fixada.
create function private.proposal_license() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.status = 'submetida' and old.status = 'rascunho' then
    new.habilitacao_ok := private.license_ok(new.painter_org_id, new.base_cents);
    if not new.habilitacao_ok then
      raise exception 'Sem habilitação validada para este valor de obra (alvará ou certificado IMPIC).' using errcode = 'P0001';
    end if;
  end if;
  return new;
end $$;
revoke all on function private.proposal_license() from public, anon, authenticated;

create trigger proposals_zlicense before update on public.proposals
  for each row execute function private.proposal_license();
