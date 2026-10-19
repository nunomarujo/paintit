-- Paint it — fase 6: catálogo de fornecedores. Produtos com ficha técnica,
-- rendimento e preço de referência datado. Qualquer conta vê o catálogo; só o
-- fornecedor gere os seus produtos. Um produto não se apaga (pode estar numa
-- proposta antiga, FOR-05): desativa-se.

create type public.product_type as enum (
  'tinta_exterior', 'tinta_interior', 'primario', 'impermeabilizante', 'esmalte', 'massa_reparacao', 'outro'
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete restrict,
  nome text not null check (length(btrim(nome)) between 1 and 200),
  marca text not null check (length(btrim(marca)) between 1 and 100),
  referencia text check (referencia is null or length(referencia) <= 100),
  tipo public.product_type not null,
  -- m² por litro e por demão, em centésimos; embalagem em mL; preço em cêntimos.
  rendimento int check (rendimento > 0),
  embalagem_ml int check (embalagem_ml > 0),
  preco_referencia_cents int check (preco_referencia_cents >= 0),
  preco_data date,
  -- "<org_id>/<uuid>.pdf" no armazenamento "fichas".
  ficha_path text,
  ativo boolean not null default true,
  created_by uuid not null default auth.uid() references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint products_price_dated check (preco_referencia_cents is null or preco_data is not null),
  constraint products_ficha_path check (ficha_path is null or split_part(ficha_path, '/', 1) = org_id::text)
);
create index products_org_idx on public.products (org_id);
create index products_active_type_idx on public.products (tipo) where ativo;
create index products_created_by_idx on public.products (created_by);

create trigger products_touch before update on public.products
  for each row execute function private.touch_updated_at();

create function private.is_supplier_org(p_org uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.organizations where id = p_org and kind = 'fornecedor');
$$;
revoke all on function private.is_supplier_org(uuid) from public, anon;
grant execute on function private.is_supplier_org(uuid) to authenticated;

alter table public.products enable row level security;
revoke all on public.products from anon;
revoke delete on public.products from authenticated;

create policy products_select on public.products for select to authenticated
  using (ativo or private.can_access_org(org_id));
create policy products_insert on public.products for insert to authenticated
  with check (private.can_manage_org(org_id) and private.is_supplier_org(org_id) and created_by = (select auth.uid()));
create policy products_update on public.products for update to authenticated
  using (private.can_manage_org(org_id))
  with check (private.can_manage_org(org_id) and private.is_supplier_org(org_id));

-- Fichas técnicas: legíveis por qualquer conta, escritas só pelo fornecedor.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('fichas', 'fichas', false, 10485760, array['application/pdf']);

create policy fichas_select on storage.objects for select to authenticated
  using (bucket_id = 'fichas');
create policy fichas_insert on storage.objects for insert to authenticated
  with check (
    bucket_id = 'fichas'
    and private.can_manage_org(private.org_from_path(name))
    and private.is_supplier_org(private.org_from_path(name))
  );
