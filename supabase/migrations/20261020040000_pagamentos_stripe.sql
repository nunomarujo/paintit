-- Pagamentos online da caução (cliente) e da comissão (pintor) pelo Stripe.
-- Só o servidor (chave secreta, a partir do webhook do Stripe) escreve aqui; as partes leem os seus.
create table public.stripe_payments (
  id uuid primary key default gen_random_uuid(),
  engagement_id uuid not null references public.engagements (id) on delete restrict,
  kind text not null check (kind in ('caucao', 'comissao')),
  amount_cents bigint not null check (amount_cents > 0),
  refunded_cents bigint not null default 0 check (refunded_cents >= 0 and refunded_cents <= amount_cents),
  payment_intent text not null unique,
  created_at timestamptz not null default now()
);
create index stripe_payments_engagement_idx on public.stripe_payments (engagement_id);
alter table public.stripe_payments enable row level security;
revoke all on public.stripe_payments from anon;

create policy stripe_payments_select on public.stripe_payments for select to authenticated
  using (
    (select private.is_platform_admin())
    or private.can_access_org(private.engagement_client(engagement_id))
    or private.can_access_org(private.engagement_painter(engagement_id))
  );
