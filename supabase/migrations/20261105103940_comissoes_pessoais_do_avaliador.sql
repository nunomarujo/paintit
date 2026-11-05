-- A comissão do avaliador é da pessoa, não da empresa (decisão do promotor, 05/11/2026).
--
-- «As comissões de avaliador devem ir apenas para um separador na sua conta; a empresa onde trabalha não tem
-- essa informação, não tem acesso a isso. O avaliador acumula crédito — dinheiro real — na sua conta e,
-- quando quiser resgatar, basta apresentar recibo (fatura-recibo, ainda que em ato único).»
--
-- Até aqui o pagamento ficava em nome do fornecedor (`survey_payouts.supplier_org_id`), qualquer pessoa da
-- empresa o via (`can_access_org`), e quem resgatava era o responsável da empresa, com o IBAN e o regime da
-- empresa. Passa a ser:
--   · cada pagamento tem dono — a pessoa que fez o levantamento — e só ela (e a equipa) o vê;
--   · a pessoa declara os seus dados de pagamento (NIF de pessoa singular, nome, IBAN, documento que emite
--     e regime de IVA e retenção), que a equipa valida como já valida os das empresas;
--   · a pessoa pede o resgate do saldo, envia o recibo, e a equipa paga por transferência;
--   · a empresa deixa de poder resgatar comissões de levantamento.
--
-- Migração ADITIVA no que guarda (colunas e uma tabela novas); muda políticas e funções. Na base real não
-- havia nenhum pagamento nem resgate de levantamento quando foi aplicada (verificado a 05/11/2026), por isso
-- não há nada a converter — o preenchimento abaixo fica para as bases construídas de raiz.

-- ---------------------------------------------------------------------------------------------------------
-- Os pagamentos passam a ter dono
-- ---------------------------------------------------------------------------------------------------------
alter table public.survey_payouts
  add column if not exists vendedor_user_id uuid references auth.users (id);
update public.survey_payouts p set vendedor_user_id = s.vendedor_user_id
  from public.request_surveys s where s.id = p.request_survey_id and p.vendedor_user_id is null;
create index if not exists survey_payouts_pessoa_idx on public.survey_payouts (vendedor_user_id);

drop policy if exists survey_payouts_select on public.survey_payouts;
create policy survey_payouts_select on public.survey_payouts for select to authenticated
  using (vendedor_user_id = (select auth.uid()) or (select private.is_platform_admin()));

-- ---------------------------------------------------------------------------------------------------------
-- Os dados de pagamento da pessoa
-- ---------------------------------------------------------------------------------------------------------
-- documento: 'recibo_verde' (fatura-recibo, com atividade aberta) ou 'ato_isolado' (ato único, sem atividade).
-- O regime de IVA e de retenção é declarado pela pessoa e validado pela equipa antes do primeiro resgate,
-- exatamente como em supplier_payout_details: mudar o que se declara volta a pôr o regime por validar.
create table if not exists public.avaliador_payout_details (
  user_id uuid primary key references auth.users (id) on delete cascade,
  nif text not null check (private.nif_valido(nif) and nif !~ '^[5689]'),
  titular text not null check (length(btrim(titular)) between 2 and 120),
  iban text not null check (iban ~ '^PT50[0-9]{21}$'),
  documento text not null check (documento in ('recibo_verde', 'ato_isolado')),
  cobra_iva boolean not null default false,
  isencao_iva text check (isencao_iva is null or length(isencao_iva) <= 120),
  declaracao_retencao text check (declaracao_retencao in ('nao_sujeito', 'sujeito', 'dispensa')),
  retencao_bps integer not null default 0 check (retencao_bps between 0 and 3000),
  regime_validado boolean not null default false,
  updated_at timestamptz not null default now()
);

alter table public.avaliador_payout_details enable row level security;
revoke all on public.avaliador_payout_details from anon, authenticated;
grant select, insert, update on public.avaliador_payout_details to authenticated;

drop policy if exists avaliador_payout_details_le on public.avaliador_payout_details;
create policy avaliador_payout_details_le on public.avaliador_payout_details for select to authenticated
  using (user_id = (select auth.uid()) or (select private.is_platform_admin()));
drop policy if exists avaliador_payout_details_cria on public.avaliador_payout_details;
create policy avaliador_payout_details_cria on public.avaliador_payout_details for insert to authenticated
  with check (user_id = (select auth.uid()));
drop policy if exists avaliador_payout_details_altera on public.avaliador_payout_details;
create policy avaliador_payout_details_altera on public.avaliador_payout_details for update to authenticated
  using (user_id = (select auth.uid()) or (select private.is_platform_admin()))
  with check (user_id = (select auth.uid()) or (select private.is_platform_admin()));

-- Só a equipa fixa a taxa de retenção e dá o regime por validado; a pessoa que muda o que declarou (incluindo
-- o NIF ou o documento) volta a ficar por validar.
create or replace function private.guard_regime_do_avaliador() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  new.updated_at := now();
  if (select private.is_platform_admin()) then
    return new;
  end if;
  if tg_op = 'INSERT' then
    new.retencao_bps := 0;
    new.regime_validado := false;
  elsif new.declaracao_retencao is distinct from old.declaracao_retencao or new.cobra_iva is distinct from old.cobra_iva
     or new.isencao_iva is distinct from old.isencao_iva or new.nif is distinct from old.nif or new.documento is distinct from old.documento then
    new.retencao_bps := 0;
    new.regime_validado := false;
  else
    new.retencao_bps := old.retencao_bps;
    new.regime_validado := old.regime_validado;
  end if;
  return new;
end $$;
revoke all on function private.guard_regime_do_avaliador() from public, anon, authenticated;
drop trigger if exists avaliador_payout_regime_guard on public.avaliador_payout_details;
create trigger avaliador_payout_regime_guard before insert or update on public.avaliador_payout_details
  for each row execute function private.guard_regime_do_avaliador();

-- ---------------------------------------------------------------------------------------------------------
-- Os resgates passam a ser da pessoa
-- ---------------------------------------------------------------------------------------------------------
alter table public.survey_redemptions
  add column if not exists user_id uuid references auth.users (id),
  add column if not exists nif text check (nif is null or length(nif) = 9),
  add column if not exists documento text check (documento is null or documento in ('recibo_verde', 'ato_isolado'));
create index if not exists survey_redemptions_pessoa_idx on public.survey_redemptions (user_id);

-- Um resgate de pessoa só o vê a pessoa (e a equipa). Os antigos, de empresa (user_id nulo), continuam como
-- estavam — na base real não havia nenhum.
drop policy if exists survey_redemptions_select on public.survey_redemptions;
create policy survey_redemptions_select on public.survey_redemptions for select to authenticated
  using (
    user_id = (select auth.uid())
    or (user_id is null and private.can_access_org(supplier_org_id))
    or (select private.is_platform_admin())
  );

-- Pedir o resgate do saldo: tudo o que está por receber e fora de resgate, num só pedido, com os dados de
-- pagamento validados. Valor a pagar = comissão + IVA − retenção (a mesma fórmula dos outros resgates).
create or replace function public.avaliador_pedir_resgate() returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  eu uuid := (select auth.uid());
  d public.avaliador_payout_details;
  total integer;
  iva integer;
  ret integer;
  org uuid;
  rid uuid;
begin
  if eu is null then
    raise exception 'Sessão terminada.' using errcode = 'P0001';
  end if;
  select * into d from public.avaliador_payout_details where user_id = eu;
  if not found or d.declaracao_retencao is null then
    raise exception 'Indique os dados de pagamento e declare o regime de IVA e de retenção.' using errcode = 'P0001';
  end if;
  if not d.regime_validado then
    raise exception 'Os dados de pagamento ainda não foram validados pela plataforma.' using errcode = 'P0001';
  end if;
  if exists (select 1 from public.survey_redemptions r where r.user_id = eu and r.estado in ('pedido', 'fatura_recebida')) then
    raise exception 'Já tem um resgate em curso.' using errcode = 'P0001';
  end if;
  select coalesce(sum(amount_cents), 0), min(supplier_org_id::text)::uuid into total, org
    from public.survey_payouts where vendedor_user_id = eu and estado = 'adjudicada' and redemption_id is null;
  if total <= 0 then
    raise exception 'Não há saldo disponível para resgatar.' using errcode = 'P0001';
  end if;
  iva := case when d.cobra_iva then (total * 2300 + 5000) / 10000 else 0 end;
  ret := (total * d.retencao_bps + 5000) / 10000;
  insert into public.survey_redemptions (
    supplier_org_id, user_id, nif, documento, comissao_cents, iva_cents, retencao_cents, liquido_cents,
    cobra_iva, isencao_iva, retencao_bps, iban, titular
  ) values (
    org, eu, d.nif, d.documento, total, iva, ret, total + iva - ret,
    d.cobra_iva, d.isencao_iva, d.retencao_bps, d.iban, d.titular
  ) returning id into rid;
  update public.survey_payouts set redemption_id = rid
    where vendedor_user_id = eu and estado = 'adjudicada' and redemption_id is null;
  return rid;
end $$;
revoke all on function public.avaliador_pedir_resgate() from public, anon;
grant execute on function public.avaliador_pedir_resgate() to authenticated;

-- O recibo do resgate: da pessoa, no caminho <user_id>/…; os de empresa ficam como estavam.
create or replace function public.survey_redemption_invoice(p_redemption uuid, p_numero text, p_path text) returns void
language plpgsql security definer set search_path = '' as $$
declare
  r public.survey_redemptions;
  dono text;
begin
  select * into r from public.survey_redemptions where id = p_redemption;
  if not found or not (
    (r.user_id is not null and r.user_id = (select auth.uid()))
    or (r.user_id is null and private.can_manage_org(r.supplier_org_id))
  ) then
    raise exception 'Resgate não encontrado.' using errcode = 'P0001';
  end if;
  if r.estado <> 'pedido' then
    raise exception 'Este resgate já tem recibo ou foi encerrado.' using errcode = 'P0001';
  end if;
  dono := coalesce(r.user_id::text, r.supplier_org_id::text);
  if p_numero is null or btrim(p_numero) = '' or length(p_numero) > 40 or split_part(coalesce(p_path, ''), '/', 1) <> dono then
    raise exception 'Recibo inválido.' using errcode = 'P0001';
  end if;
  update public.survey_redemptions set estado = 'fatura_recebida', invoice_numero = btrim(p_numero), invoice_path = p_path, invoice_em = now() where id = p_redemption;
end $$;
revoke all on function public.survey_redemption_invoice(uuid, text, text) from public, anon;
grant execute on function public.survey_redemption_invoice(uuid, text, text) to authenticated;

create or replace function public.survey_redemption_cancel(p_redemption uuid, p_motivo text) returns void
language plpgsql security definer set search_path = '' as $$
declare
  r public.survey_redemptions;
begin
  select * into r from public.survey_redemptions where id = p_redemption;
  if not found then
    raise exception 'Resgate não encontrado.' using errcode = 'P0001';
  end if;
  if not (
    (r.estado = 'pedido' and r.user_id is not null and r.user_id = (select auth.uid()))
    or (r.estado = 'pedido' and r.user_id is null and private.can_manage_org(r.supplier_org_id))
    or (r.estado in ('pedido', 'fatura_recebida') and private.is_platform_admin())
  ) then
    raise exception 'Não se pode anular este resgate.' using errcode = 'P0001';
  end if;
  update public.survey_redemptions set estado = 'anulado', motivo = left(btrim(coalesce(p_motivo, '')), 300) where id = p_redemption;
  update public.survey_payouts set redemption_id = null where redemption_id = p_redemption;
end $$;
revoke all on function public.survey_redemption_cancel(uuid, text) from public, anon;
grant execute on function public.survey_redemption_cancel(uuid, text) to authenticated;

-- A empresa deixa de resgatar comissões de levantamento: são de quem as fez.
create or replace function public.survey_request_redemption(p_org uuid) returns uuid
language plpgsql security definer set search_path = '' as $$
begin
  if not private.can_manage_org(p_org) then
    raise exception 'Fornecedor não encontrado.' using errcode = 'P0001';
  end if;
  raise exception 'As comissões dos levantamentos são de cada avaliador e resgatam-se na conta de cada um (Avaliações › Comissões pessoais).'
    using errcode = 'P0001';
end $$;
revoke all on function public.survey_request_redemption(uuid) from public, anon;
grant execute on function public.survey_request_redemption(uuid) to authenticated;

-- A equipa valida o regime declarado e fixa a taxa de retenção (o mesmo passo que faz para as empresas).
create or replace function public.avaliador_validar_regime(p_user uuid, p_bps integer) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not private.is_platform_admin() then
    raise exception 'Só a equipa da plataforma.' using errcode = 'P0001';
  end if;
  if p_bps is null or p_bps < 0 or p_bps > 3000 then
    raise exception 'Taxa de retenção inválida.' using errcode = 'P0001';
  end if;
  update public.avaliador_payout_details set retencao_bps = p_bps, regime_validado = true
    where user_id = p_user and declaracao_retencao is not null;
  if not found then
    raise exception 'Dados de pagamento por declarar.' using errcode = 'P0001';
  end if;
end $$;
revoke all on function public.avaliador_validar_regime(uuid, integer) from public, anon;
grant execute on function public.avaliador_validar_regime(uuid, integer) to authenticated;

-- ---------------------------------------------------------------------------------------------------------
-- O recibo em PDF: o mesmo balde, na pasta da própria pessoa
-- ---------------------------------------------------------------------------------------------------------
drop policy if exists faturas_adesao_pessoa_select on storage.objects;
create policy faturas_adesao_pessoa_select on storage.objects for select to authenticated
  using (bucket_id = 'faturas-adesao' and split_part(name, '/', 1) = (select auth.uid())::text);
drop policy if exists faturas_adesao_pessoa_insert on storage.objects;
create policy faturas_adesao_pessoa_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'faturas-adesao' and split_part(name, '/', 1) = (select auth.uid())::text);
