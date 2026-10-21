-- Extrato bancário importado (EuroBic): cada movimento guarda-se uma só vez (chave única) e casa-se com a plataforma
-- (transferência da Stripe ou resgate pago) ou classifica-se como outro movimento da empresa. Só a equipa da plataforma lê e classifica. Uma instrução por linha.
create table public.bank_imports (id uuid primary key default gen_random_uuid(), ficheiro text not null check (length(ficheiro) <= 200), formato text not null check (formato in ('csv', 'camt053')), iban text, linhas integer not null check (linhas >= 0), novas integer not null check (novas >= 0), duplicadas integer not null check (duplicadas >= 0), de date, ate date, created_by uuid default auth.uid() references auth.users (id) on delete set null, created_at timestamptz not null default now());
create index bank_imports_created_by_idx on public.bank_imports (created_by);
create table public.bank_lines (id uuid primary key default gen_random_uuid(), import_id uuid not null references public.bank_imports (id), chave text not null unique, data date not null, data_valor date, descricao text not null, valor_cents bigint not null, saldo_cents bigint, classificacao text not null default 'por_classificar' check (classificacao in ('por_classificar', 'stripe_payout', 'resgate', 'outro', 'ignorada')), stripe_payout_id text references public.stripe_payouts (id), redemption_id uuid references public.referral_redemptions (id), notas text check (notas is null or length(notas) <= 300), automatica boolean not null default false, classificada_por uuid references auth.users (id) on delete set null, classificada_em timestamptz, created_at timestamptz not null default now(), check ((classificacao = 'stripe_payout') = (stripe_payout_id is not null)), check ((classificacao = 'resgate') = (redemption_id is not null)));
create index bank_lines_import_idx on public.bank_lines (import_id);
create index bank_lines_data_idx on public.bank_lines (data);
create index bank_lines_payout_idx on public.bank_lines (stripe_payout_id);
create index bank_lines_redemption_idx on public.bank_lines (redemption_id);
create index bank_lines_classificada_por_idx on public.bank_lines (classificada_por);
create unique index bank_lines_one_per_payout on public.bank_lines (stripe_payout_id) where stripe_payout_id is not null;
create unique index bank_lines_one_per_redemption on public.bank_lines (redemption_id) where redemption_id is not null;
alter table public.bank_imports enable row level security;
alter table public.bank_lines enable row level security;
revoke all on public.bank_imports, public.bank_lines from anon;
revoke delete, truncate on public.bank_imports, public.bank_lines from authenticated;
create policy bank_imports_select on public.bank_imports for select to authenticated using ((select private.is_platform_admin()));
create policy bank_imports_insert on public.bank_imports for insert to authenticated with check ((select private.is_platform_admin()));
create policy bank_lines_select on public.bank_lines for select to authenticated using ((select private.is_platform_admin()));
create policy bank_lines_insert on public.bank_lines for insert to authenticated with check ((select private.is_platform_admin()) and classificacao = 'por_classificar');
create policy bank_lines_update on public.bank_lines for update to authenticated using ((select private.is_platform_admin())) with check ((select private.is_platform_admin()));
create function private.bank_lines_guard() returns trigger language plpgsql set search_path = '' as $$
begin
  if new.chave is distinct from old.chave or new.import_id is distinct from old.import_id or new.data is distinct from old.data or new.data_valor is distinct from old.data_valor or new.descricao is distinct from old.descricao or new.valor_cents is distinct from old.valor_cents or new.saldo_cents is distinct from old.saldo_cents then
    raise exception 'Os dados do extrato não se alteram: só a classificação.' using errcode = 'P0001';
  end if;
  if new.classificacao is distinct from old.classificacao then
    new.classificada_por := auth.uid();
    new.classificada_em := now();
  end if;
  return new;
end $$;
create trigger bank_lines_guard before update on public.bank_lines for each row execute function private.bank_lines_guard();
