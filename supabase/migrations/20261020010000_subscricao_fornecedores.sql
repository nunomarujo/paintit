-- Subscrição dos fornecedores (decisão de 20/10/2026), preços em src/domain/subscription.ts:
--   vendedores: 39 €/mês + IVA, presença na listagem de vendedores;
--   catalogo:   49 €/mês + IVA, também produtos (editáveis um a um) e descontos por perfil de compra.
-- A cobrança será feita pelo Stripe (Billing); até lá a equipa da plataforma ativa o plano no backoffice.
create table public.supplier_subscriptions (
  org_id uuid primary key references public.organizations (id) on delete cascade,
  plan text not null check (plan in ('vendedores', 'catalogo')),
  status text not null default 'ativa' check (status in ('ativa', 'suspensa', 'cancelada')),
  price_cents integer not null check (price_cents >= 0),
  promo_code_id uuid references public.promo_codes (id),
  discount_bps integer not null default 0 check (discount_bps between 0 and 10000),
  stripe_subscription_id text,
  started_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) default auth.uid(),
  updated_at timestamptz not null default now()
);
create index supplier_subscriptions_promo_idx on public.supplier_subscriptions (promo_code_id);
create index supplier_subscriptions_updated_by_idx on public.supplier_subscriptions (updated_by);
alter table public.supplier_subscriptions enable row level security;
revoke all on public.supplier_subscriptions from anon;

create policy supplier_subscriptions_select on public.supplier_subscriptions for select to authenticated
  using ((select private.is_platform_admin()) or private.can_access_org(org_id));
create policy supplier_subscriptions_admin_insert on public.supplier_subscriptions for insert to authenticated
  with check ((select private.is_platform_admin()) and private.is_supplier_org(org_id));
create policy supplier_subscriptions_admin_update on public.supplier_subscriptions for update to authenticated
  using ((select private.is_platform_admin())) with check ((select private.is_platform_admin()));

create function private.supplier_has_plan(p_org uuid, p_plan text) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.supplier_subscriptions s
    where s.org_id = p_org and s.status = 'ativa'
      and (s.plan = 'catalogo' or s.plan = p_plan)
  )
$$;
revoke all on function private.supplier_has_plan(uuid, text) from public, anon;
grant execute on function private.supplier_has_plan(uuid, text) to authenticated;

-- Produtos e descontos só com o plano de catálogo ativo.
drop policy products_insert on public.products;
create policy products_insert on public.products for insert to authenticated
  with check (private.can_manage_org(org_id) and private.is_supplier_org(org_id)
    and private.supplier_has_plan(org_id, 'catalogo') and created_by = (select auth.uid()));

-- Descontos por cliente (pintor): visíveis só ao fornecedor e a esse pintor.
alter table public.supplier_discounts add column painter_org_id uuid references public.organizations (id) on delete cascade;
create index supplier_discounts_painter_idx on public.supplier_discounts (painter_org_id);

drop policy supplier_discounts_select on public.supplier_discounts;
create policy supplier_discounts_select on public.supplier_discounts for select to authenticated
  using (painter_org_id is null or private.can_access_org(painter_org_id) or private.can_access_org(org_id));
drop policy supplier_discounts_insert on public.supplier_discounts;
create policy supplier_discounts_insert on public.supplier_discounts for insert to authenticated
  with check (private.can_manage_org(org_id) and private.is_supplier_org(org_id)
    and private.supplier_has_plan(org_id, 'catalogo') and created_by = (select auth.uid()));

-- Fornecedores com plano ativo, para o catálogo e as sugestões ao orçamentar. Os produtos
-- continuam legíveis (propostas e encomendas antigas citam-nos); só deixam de ser sugeridos.
create function public.active_suppliers(p_plan text) returns setof uuid
language sql stable security definer set search_path = '' as $$
  select s.org_id from public.supplier_subscriptions s
  where s.status = 'ativa' and (s.plan = 'catalogo' or s.plan = p_plan)
$$;
revoke all on function public.active_suppliers(text) from public, anon;
grant execute on function public.active_suppliers(text) to authenticated;
