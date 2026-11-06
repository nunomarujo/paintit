-- Catálogo de lançamento para fornecedores (promotor, 06/11/2026): «presença no catálogo sem subscrição até 31/01/2027».
--
-- Até aqui uma subscrição de fornecedor não tinha fim: conceder «grátis até janeiro» exigia uma data de validade honrada
-- por quem decide o acesso. `valida_ate` (nula = sem fim, como até agora) é lida por `supplier_has_plan` (produtos e
-- descontos) e por `active_suppliers` (catálogo e sugestões ao orçamentar); `origem = 'lancamento'` marca o que foi
-- concedido pela campanha e não subscrito.
--
-- A oferta gratuita não conta como adesão paga para as referências de fornecedores: a janela de 12 meses de desconto do
-- pintor que o indicou só abre quando o fornecedor passa a pagar (o gatilho também corre na conversão).

alter table public.supplier_subscriptions
  add column valida_ate date,
  add column origem text check (origem is null or origem = 'lancamento');

create or replace function private.supplier_has_plan(p_org uuid, p_plan text) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.supplier_subscriptions s
    where s.org_id = p_org and s.status = 'ativa'
      and (s.valida_ate is null or s.valida_ate >= (now() at time zone 'Europe/Lisbon')::date)
      and (s.plan = 'catalogo' or s.plan = p_plan)
  )
$$;

create or replace function public.active_suppliers(p_plan text) returns setof uuid
language sql stable security definer set search_path = '' as $$
  select s.org_id from public.supplier_subscriptions s
  where s.status = 'ativa'
    and (s.valida_ate is null or s.valida_ate >= (now() at time zone 'Europe/Lisbon')::date)
    and (s.plan = 'catalogo' or s.plan = p_plan)
$$;

create or replace function private.supplier_subscription_referral_eligibility() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.origem = 'lancamento' then
    return new;
  end if;
  update public.supplier_referral_invites
    set adesao_elegivel_em = case when tg_op = 'UPDATE' then (now() at time zone 'Europe/Lisbon')::date else new.started_at::date end
    where supplier_org_id = new.org_id and adesao_elegivel_em is null;
  return new;
end $$;

-- A conversão da oferta numa subscrição paga (o pagamento limpa a origem) também é a primeira adesão paga.
create trigger supplier_subscriptions_referral_conversao after update of origem on public.supplier_subscriptions
  for each row when (old.origem = 'lancamento' and new.origem is null)
  execute function private.supplier_subscription_referral_eligibility();

alter table public.ofertas_de_lancamento drop constraint ofertas_de_lancamento_concedida_check;
alter table public.ofertas_de_lancamento add constraint ofertas_de_lancamento_concedida_check
  check (concedida is null or concedida in ('pro', 'catalogo'));
