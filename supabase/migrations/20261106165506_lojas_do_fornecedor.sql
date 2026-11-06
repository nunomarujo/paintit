-- Lojas do fornecedor (promotor, 06/11/2026: «avança com o registo de lojas»).
--
-- Até aqui só havia a morada fiscal da empresa. Uma loja tem nome e morada própria; o concelho é tirado do
-- código postal pelo servidor, como o da empresa. Para que servem, por agora:
--   - os concelhos por omissão: quando a empresa não indica concelhos de levantamento ou de entrega, valem
--     o da morada da empresa **e** os das suas lojas (decisão de 06/11/2026, «Sem concelhos indicados…»);
--   - a lista fica nos dados da empresa, gerida por quem gere a empresa.
-- Quem vê: a própria empresa e a equipa da plataforma. A morada de uma loja não se mostra a mais ninguém
-- por agora (mostrá-la aos pintores, para levantar encomendas, é uma decisão à parte).

create table public.supplier_stores (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  nome text not null check (length(btrim(nome)) between 1 and 120),
  morada text not null check (length(btrim(morada)) between 1 and 200),
  codigo_postal text not null check (codigo_postal ~ '^\d{4}-\d{3}$'),
  localidade text not null check (length(btrim(localidade)) between 1 and 120),
  concelho text,
  created_by uuid not null references auth.users (id),
  created_at timestamptz not null default now()
);
create index supplier_stores_org_idx on public.supplier_stores (org_id);

alter table public.supplier_stores enable row level security;
revoke all on public.supplier_stores from anon;
create policy supplier_stores_select on public.supplier_stores for select to authenticated
  using (private.can_access_org(org_id) or private.is_platform_admin());
create policy supplier_stores_insert on public.supplier_stores for insert to authenticated
  with check (private.can_manage_org(org_id) and private.is_supplier_org(org_id) and created_by = (select auth.uid()));
create policy supplier_stores_update on public.supplier_stores for update to authenticated
  using (private.can_manage_org(org_id)) with check (private.can_manage_org(org_id));
create policy supplier_stores_delete on public.supplier_stores for delete to authenticated
  using (private.can_manage_org(org_id));

-- Sem zona escolhida: o concelho da morada da empresa ou o de qualquer das suas lojas.
create or replace function private.supplier_covers(p_org uuid, p_concelho text) returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce(
    (select c.todo_o_pais or p_concelho = any (c.concelhos) from public.supplier_survey_coverage c where c.org_id = p_org),
    (select bool_or(x.concelho = p_concelho) from (
      select o.concelho from public.organizations o where o.id = p_org
      union all
      select s.concelho from public.supplier_stores s where s.org_id = p_org
    ) x),
    false
  );
$$;
