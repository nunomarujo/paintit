-- Eliminar uma entidade (decisão de 20/10/2026): só o proprietário, só sem histórico com
-- terceiros (pedidos publicados, propostas submetidas, contratações, produtos, encomendas,
-- avaliações). Rascunhos, prédios, documentos e equipa apagam-se em cascata.
create function public.delete_organization(p_org uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not private.has_role(p_org, array['proprietario']::public.member_role[]) then
    raise exception 'Só o proprietário pode eliminar a entidade.' using errcode = 'P0001';
  end if;
  if exists (select 1 from public.work_requests where org_id = p_org and status <> 'rascunho')
     or exists (select 1 from public.proposals where painter_org_id = p_org and status <> 'rascunho')
     or exists (select 1 from public.engagements where client_org_id = p_org or painter_org_id = p_org)
     or exists (select 1 from public.products where org_id = p_org)
     or exists (select 1 from public.material_orders where supplier_org_id = p_org or painter_org_id = p_org)
     or exists (select 1 from public.reviews where painter_org_id = p_org)
     or exists (select 1 from public.organizations where gerida_por = p_org)
  then
    raise exception 'Esta entidade já tem histórico (pedidos publicados, propostas, contratações, produtos ou condomínios geridos) e não pode ser eliminada.'
      using errcode = 'P0001';
  end if;
  delete from public.organizations where id = p_org;
end $$;
revoke all on function public.delete_organization(uuid) from public, anon;
grant execute on function public.delete_organization(uuid) to authenticated;
