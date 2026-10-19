-- O fornecedor vê a entidade de pintura que lhe fez uma encomenda certificada.
create function private.ordered_from_me(p_org uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.material_orders o
    where o.painter_org_id = p_org and private.can_access_org(o.supplier_org_id)
  );
$$;
revoke all on function private.ordered_from_me(uuid) from public, anon;
grant execute on function private.ordered_from_me(uuid) to authenticated;

alter policy organizations_select on public.organizations
  using (
    private.can_access_org(id) or created_by = (select auth.uid()) or private.org_revealed_to_me(id)
    or kind = 'fornecedor' or private.ordered_from_me(id)
  );
