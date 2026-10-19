-- PDF assinados com Chave Móvel Digital / Cartão de Cidadão (Autenticação.gov).
-- Caminho "<engagement_id>/cliente.pdf" e "<engagement_id>/pintor.pdf". Cada
-- parte só carrega o seu e ninguém os altera nem apaga depois.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('contratos', 'contratos', false, 20971520, array['application/pdf']);

create policy contratos_select on storage.objects for select to authenticated
  using (
    bucket_id = 'contratos'
    and (
      private.can_access_org(private.engagement_client(private.org_from_path(name)))
      or private.can_access_org(private.engagement_painter(private.org_from_path(name)))
    )
  );
create policy contratos_insert on storage.objects for insert to authenticated
  with check (
    bucket_id = 'contratos'
    and (
      (split_part(name, '/', 2) = 'cliente.pdf'
        and private.can_manage_org(private.engagement_client(private.org_from_path(name))))
      or (split_part(name, '/', 2) = 'pintor.pdf'
        and private.can_manage_org(private.engagement_painter(private.org_from_path(name))))
    )
  );

-- O pintor da contratação lê o anúncio (já fechado) para gerar o mesmo contrato.
create function private.engagement_painter_of_request(p_request uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.engagements e where e.request_id = p_request and private.can_access_org(e.painter_org_id));
$$;
revoke all on function private.engagement_painter_of_request(uuid) from public, anon;
grant execute on function private.engagement_painter_of_request(uuid) to authenticated;

alter policy request_listings_select on public.request_listings
  using (
    (aberto and private.is_painter())
    or private.can_access_org(private.request_org(request_id))
    or private.is_platform_admin()
    or private.engagement_painter_of_request(request_id)
  );
