-- Pagamento do plano Pro no Stripe (25/10/2026, docs/DECISOES.md).
--
-- A adesão ficava gravada em 'por_pagar' e não havia como pagar: o ecrã deixava aderir e a subscrição
-- nunca passava a activa. Faltava a metade do pagamento.
--
-- Segue o mesmo desenho das subscrições dos fornecedores: a linha só passa a 'ativa' quando o Stripe
-- confirma, pelo webhook assinado — nunca pelo regresso do navegador, que é falsificável.

alter table public.org_subscriptions add column if not exists stripe_subscription_id text;
create unique index if not exists org_subscriptions_stripe_idx
  on public.org_subscriptions (stripe_subscription_id)
  where stripe_subscription_id is not null;

comment on column public.org_subscriptions.stripe_subscription_id is
  'Subscrição correspondente no Stripe. Preenchida pelo webhook; nunca pelo navegador.';
