-- Regras 2026-10-20: caução do cliente sem mínimo (o mínimo de 150 € fica só na comissão).
create or replace function private.current_rules_version() returns text
language sql immutable set search_path = '' as $$ select '2026-10-20' $$;

-- Códigos promocionais para a subscrição dos fornecedores no catálogo (1% a 100%).
-- Só a equipa da plataforma os cria e vê; o fornecedor confirma um código pela função check_promo_code.
create table public.promo_codes (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[A-Z0-9-]{4,32}$'),
  discount_bps integer not null check (discount_bps between 100 and 10000),
  valid_until date,
  max_uses integer check (max_uses is null or max_uses > 0),
  uses integer not null default 0 check (uses >= 0),
  active boolean not null default true,
  notas text check (char_length(notas) <= 500),
  created_by uuid not null default auth.uid() references auth.users (id),
  created_at timestamptz not null default now()
);
alter table public.promo_codes enable row level security;

create policy promo_codes_admin_select on public.promo_codes for select to authenticated
  using ((select private.is_platform_admin()));
create policy promo_codes_admin_insert on public.promo_codes for insert to authenticated
  with check ((select private.is_platform_admin()) and created_by = (select auth.uid()));
create policy promo_codes_admin_update on public.promo_codes for update to authenticated
  using ((select private.is_platform_admin())) with check ((select private.is_platform_admin()));

create index promo_codes_created_by_idx on public.promo_codes (created_by);

-- O fornecedor só fica a saber o desconto de um código que conhece, e se é válido hoje.
create function public.check_promo_code(p_code text) returns integer
language sql stable security definer set search_path = '' as $$
  select discount_bps from public.promo_codes
  where code = upper(btrim(p_code))
    and active
    and (valid_until is null or valid_until >= (now() at time zone 'Europe/Lisbon')::date)
    and (max_uses is null or uses < max_uses)
    and exists (
      select 1 from public.org_members m join public.organizations o on o.id = m.org_id
      where m.user_id = (select auth.uid()) and o.kind = 'fornecedor'
    )
$$;
revoke all on function public.check_promo_code(text) from public, anon;
grant execute on function public.check_promo_code(text) to authenticated;
