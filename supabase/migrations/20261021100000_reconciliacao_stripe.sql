-- Reconciliação com a Stripe: cópia dos movimentos de saldo (cobranças, reembolsos, taxas, transferências), das transferências para o banco
-- e fotografias do saldo. Só a equipa da plataforma lê; só o servidor (chave secreta) grava. Uma instrução por linha.
create table public.stripe_bt (id text primary key, type text not null, reporting_category text not null, amount_cents bigint not null, fee_cents bigint not null default 0, net_cents bigint not null, currency text not null, created_at timestamptz not null, available_on timestamptz, source_id text, payment_intent text, invoice_id text, description text, synced_at timestamptz not null default now());
create index stripe_bt_created_idx on public.stripe_bt (created_at);
create index stripe_bt_payment_intent_idx on public.stripe_bt (payment_intent);
create table public.stripe_payouts (id text primary key, amount_cents bigint not null, status text not null, currency text not null, created_at timestamptz not null, arrival_at timestamptz, synced_at timestamptz not null default now());
create table public.stripe_balance_snapshots (id uuid primary key default gen_random_uuid(), available_cents bigint not null, pending_cents bigint not null, currency text not null, taken_at timestamptz not null default now());
alter table public.stripe_bt enable row level security;
alter table public.stripe_payouts enable row level security;
alter table public.stripe_balance_snapshots enable row level security;
revoke all on public.stripe_bt, public.stripe_payouts, public.stripe_balance_snapshots from anon;
revoke insert, update, delete, truncate on public.stripe_bt, public.stripe_payouts, public.stripe_balance_snapshots from authenticated;
create policy stripe_bt_select on public.stripe_bt for select to authenticated using ((select private.is_platform_admin()));
create policy stripe_payouts_select on public.stripe_payouts for select to authenticated using ((select private.is_platform_admin()));
create policy stripe_balance_snapshots_select on public.stripe_balance_snapshots for select to authenticated using ((select private.is_platform_admin()));
