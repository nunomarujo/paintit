-- Livro de movimentos (docs/CONTABILIDADE.md): lançamentos em partidas dobradas, imutáveis (corrigem-se por estorno), com períodos que se fecham.
-- Só a equipa da plataforma lê; só o servidor (chave secreta) grava, pela função acc_post. Uma instrução por linha.
create table public.acc_accounts (codigo text primary key check (codigo ~ '^[0-9]{2}(\.[0-9]+)*$'), nome text not null, natureza text not null check (natureza in ('devedora', 'credora')), ativa boolean not null default true);
insert into public.acc_accounts (codigo, nome, natureza) values ('12.1', 'Depósitos à ordem: EuroBic', 'devedora'), ('13.1', 'Outros depósitos: saldo Stripe', 'devedora'), ('21.1', 'Clientes: pintores', 'devedora'), ('21.2', 'Clientes: fornecedores', 'devedora'), ('21.3', 'Clientes: cauções retidas', 'devedora'), ('22.1', 'Fornecedores: tintas (comissões de adesão)', 'credora'), ('22.2', 'Fornecedores: Stripe e outros', 'credora'), ('24.2', 'Retenções na fonte (IRS/IRC)', 'credora'), ('24.32', 'IVA dedutível', 'devedora'), ('24.33', 'IVA liquidado', 'credora'), ('27.8.1', 'Cauções de clientes (valores de terceiros)', 'credora'), ('62.2.1', 'Comissões de adesão a fornecedores', 'devedora'), ('62.2.2', 'Comissões e taxas de pagamento (Stripe)', 'devedora'), ('72.1', 'Comissões de sucesso (pintores)', 'credora'), ('72.2', 'Subscrições de fornecedores', 'credora'), ('72.3', 'Cauções retidas', 'credora');
create table public.acc_periods (mes date primary key check (mes = date_trunc('month', mes)::date), fechado boolean not null default true, atualizado_em timestamptz not null default now(), atualizado_por uuid default auth.uid() references auth.users (id) on delete set null);
create index acc_periods_atualizado_por_idx on public.acc_periods (atualizado_por);
create table public.acc_period_log (id uuid primary key default gen_random_uuid(), mes date not null, acao text not null check (acao in ('fechar', 'reabrir')), por uuid default auth.uid() references auth.users (id) on delete set null, em timestamptz not null default now());
create index acc_period_log_por_idx on public.acc_period_log (por);
create table public.acc_entries (id uuid primary key default gen_random_uuid(), data date not null, descricao text not null check (length(descricao) between 1 and 200), origem text not null, origem_id text not null, created_at timestamptz not null default now(), unique (origem, origem_id));
create index acc_entries_data_idx on public.acc_entries (data);
create table public.acc_lines (id uuid primary key default gen_random_uuid(), entry_id uuid not null references public.acc_entries (id), conta text not null references public.acc_accounts (codigo), debito_cents bigint not null default 0 check (debito_cents >= 0), credito_cents bigint not null default 0 check (credito_cents >= 0), check ((debito_cents > 0) <> (credito_cents > 0)));
create index acc_lines_entry_idx on public.acc_lines (entry_id);
create index acc_lines_conta_idx on public.acc_lines (conta);
alter table public.acc_accounts enable row level security;
alter table public.acc_periods enable row level security;
alter table public.acc_period_log enable row level security;
alter table public.acc_entries enable row level security;
alter table public.acc_lines enable row level security;
revoke all on public.acc_accounts, public.acc_periods, public.acc_period_log, public.acc_entries, public.acc_lines from anon;
revoke insert, update, delete, truncate on public.acc_accounts, public.acc_periods, public.acc_period_log, public.acc_entries, public.acc_lines from authenticated;
create policy acc_accounts_select on public.acc_accounts for select to authenticated using ((select private.is_platform_admin()));
create policy acc_periods_select on public.acc_periods for select to authenticated using ((select private.is_platform_admin()));
create policy acc_period_log_select on public.acc_period_log for select to authenticated using ((select private.is_platform_admin()));
create policy acc_entries_select on public.acc_entries for select to authenticated using ((select private.is_platform_admin()));
create policy acc_lines_select on public.acc_lines for select to authenticated using ((select private.is_platform_admin()));
create function private.acc_immutable() returns trigger language plpgsql set search_path = '' as $$
begin
  raise exception 'Os lançamentos não se alteram nem se apagam: corrija com um estorno.' using errcode = 'P0001';
end $$;
create trigger acc_entries_immutable before update or delete on public.acc_entries for each row execute function private.acc_immutable();
create trigger acc_lines_immutable before update or delete on public.acc_lines for each row execute function private.acc_immutable();
create function private.acc_check_open() returns trigger language plpgsql set search_path = '' as $$
begin
  if exists (select 1 from public.acc_periods p where p.fechado and p.mes = date_trunc('month', new.data)::date) then
    raise exception 'O período de % está fechado.', to_char(new.data, 'MM/YYYY') using errcode = 'P0001';
  end if;
  return new;
end $$;
create trigger acc_entries_open before insert on public.acc_entries for each row execute function private.acc_check_open();
create function private.acc_check_balance() returns trigger language plpgsql set search_path = '' as $$
declare
  d bigint;
  c bigint;
  n integer;
begin
  select coalesce(sum(debito_cents), 0), coalesce(sum(credito_cents), 0), count(*) into d, c, n from public.acc_lines where entry_id = new.entry_id;
  if n < 2 or d <> c then
    raise exception 'Lançamento desequilibrado: débitos % e créditos %.', d, c using errcode = 'P0001';
  end if;
  return null;
end $$;
create constraint trigger acc_lines_balance after insert on public.acc_lines deferrable initially deferred for each row execute function private.acc_check_balance();
create function public.acc_post(p_data date, p_descricao text, p_origem text, p_origem_id text, p_lines jsonb) returns uuid language plpgsql security definer set search_path = '' as $$
declare
  closed date;
  dt date := p_data;
  eid uuid;
  l jsonb;
begin
  select max(mes) into closed from public.acc_periods where fechado;
  if closed is not null and date_trunc('month', dt)::date <= closed then
    dt := (closed + interval '1 month')::date;
  end if;
  insert into public.acc_entries (data, descricao, origem, origem_id) values (dt, p_descricao, p_origem, p_origem_id) on conflict (origem, origem_id) do nothing returning id into eid;
  if eid is null then
    select id into eid from public.acc_entries where origem = p_origem and origem_id = p_origem_id;
    return eid;
  end if;
  for l in select * from jsonb_array_elements(p_lines) loop
    insert into public.acc_lines (entry_id, conta, debito_cents, credito_cents) values (eid, l->>'conta', coalesce((l->>'debito')::bigint, 0), coalesce((l->>'credito')::bigint, 0));
  end loop;
  return eid;
end $$;
revoke all on function public.acc_post(date, text, text, text, jsonb) from public, anon, authenticated;
create function public.acc_close_period(p_mes date) returns void language plpgsql security definer set search_path = '' as $$
declare
  m date := date_trunc('month', p_mes)::date;
  last_closed date;
begin
  if not private.is_platform_admin() then
    raise exception 'Só a equipa da plataforma.' using errcode = 'P0001';
  end if;
  select max(mes) into last_closed from public.acc_periods where fechado;
  if last_closed is not null and m <> (last_closed + interval '1 month')::date then
    raise exception 'Feche os meses por ordem: o próximo a fechar é %.', to_char(last_closed + interval '1 month', 'MM/YYYY') using errcode = 'P0001';
  end if;
  if m >= date_trunc('month', now())::date then
    raise exception 'Só se fecham meses já terminados.' using errcode = 'P0001';
  end if;
  insert into public.acc_periods (mes, fechado) values (m, true) on conflict (mes) do update set fechado = true, atualizado_em = now(), atualizado_por = (select auth.uid());
  insert into public.acc_period_log (mes, acao) values (m, 'fechar');
end $$;
revoke all on function public.acc_close_period(date) from public, anon;
grant execute on function public.acc_close_period(date) to authenticated;
create function public.acc_reopen_period() returns void language plpgsql security definer set search_path = '' as $$
declare
  m date;
begin
  if not private.is_platform_admin() then
    raise exception 'Só a equipa da plataforma.' using errcode = 'P0001';
  end if;
  select max(mes) into m from public.acc_periods where fechado;
  if m is null then
    raise exception 'Não há períodos fechados.' using errcode = 'P0001';
  end if;
  update public.acc_periods set fechado = false, atualizado_em = now(), atualizado_por = (select auth.uid()) where mes = m;
  insert into public.acc_period_log (mes, acao) values (m, 'reabrir');
end $$;
revoke all on function public.acc_reopen_period() from public, anon;
grant execute on function public.acc_reopen_period() to authenticated;
create table public.subscription_payments (id uuid primary key default gen_random_uuid(), stripe_invoice_id text not null unique, org_id uuid references public.organizations (id), amount_cents integer not null check (amount_cents >= 0), vat_cents integer check (vat_cents is null or vat_cents >= 0), paid_at timestamptz not null default now(), created_at timestamptz not null default now());
create index subscription_payments_org_idx on public.subscription_payments (org_id);
alter table public.subscription_payments enable row level security;
revoke all on public.subscription_payments from anon;
revoke insert, update, delete on public.subscription_payments from authenticated;
create policy subscription_payments_select on public.subscription_payments for select to authenticated using ((org_id is not null and private.can_access_org(org_id)) or (select private.is_platform_admin()));
create view public.acc_balancete with (security_invoker = true) as select l.conta, a.nome, a.natureza, sum(l.debito_cents)::bigint as debito_cents, sum(l.credito_cents)::bigint as credito_cents from public.acc_lines l join public.acc_accounts a on a.codigo = l.conta group by l.conta, a.nome, a.natureza;
create view public.acc_balancete_mensal with (security_invoker = true) as select to_char(e.data, 'YYYY-MM') as mes, l.conta, sum(l.debito_cents)::bigint as debito_cents, sum(l.credito_cents)::bigint as credito_cents from public.acc_lines l join public.acc_entries e on e.id = l.entry_id group by to_char(e.data, 'YYYY-MM'), l.conta;
revoke all on public.acc_balancete, public.acc_balancete_mensal from anon;
