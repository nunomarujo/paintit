-- Carteira de clientes do fornecedor (decisão de 23/10/2026, docs/DECISOES.md): classificação manual
-- ("cliente premium", para além de "primeira compra" e "cliente frequente", que já se deduzem das
-- encomendas entregues em material_orders — src/domain/catalog.ts) e uma nota de condições específicas
-- por cliente, para a ficha de cada pintor na página /clientes do fornecedor. Uma linha por relação
-- fornecedor↔pintor; não se apaga, só se corrige (o histórico de "porque é que este desconto existe"
-- não interessa guardar à parte do que está escrito na nota).
create table public.supplier_customers (
  org_id uuid not null references public.organizations (id) on delete cascade,
  painter_org_id uuid not null references public.organizations (id) on delete cascade,
  premium boolean not null default false,
  nota text not null default '' check (length(nota) <= 2000),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id),
  primary key (org_id, painter_org_id)
);
create index supplier_customers_painter_idx on public.supplier_customers (painter_org_id);
create trigger supplier_customers_touch before update on public.supplier_customers
  for each row execute function private.touch_updated_at();

alter table public.supplier_customers enable row level security;
revoke all on public.supplier_customers from anon;
-- Visível aos dois lados da relação (o pintor vê que tem uma nota/classificação, não só o efeito no
-- preço) — mesma condição já usada em supplier_discounts para um desconto por cliente (20261019103652).
-- Só o fornecedor escreve: nunca o pintor, que não gere a sua própria classificação.
create policy supplier_customers_select on public.supplier_customers for select to authenticated
  using (private.can_access_org(org_id) or private.can_access_org(painter_org_id));
create policy supplier_customers_insert on public.supplier_customers for insert to authenticated
  with check (private.can_manage_org(org_id) and private.is_supplier_org(org_id));
create policy supplier_customers_update on public.supplier_customers for update to authenticated
  using (private.can_manage_org(org_id)) with check (private.can_manage_org(org_id));
