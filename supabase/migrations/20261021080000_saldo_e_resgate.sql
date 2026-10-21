-- Saldo e resgate das comissões de adesão (decisão de 21/10/2026): a comissão do fornecedor acumula em saldo quando a comissão do pintor
-- entra na conta; o fornecedor resgata quando quiser, com os dados de pagamento e o regime declarados e validados pela equipa.
-- Cada resgate junta várias comissões e tem uma só fatura. Valor a pagar = comissão + IVA - retenção. Uma instrução por linha.
alter table public.supplier_payout_details add column declaracao_retencao text check (declaracao_retencao in ('nao_sujeito', 'sujeito', 'dispensa'));
alter table public.supplier_payout_details add column isencao_iva text check (isencao_iva is null or length(isencao_iva) <= 120);
alter table public.supplier_payout_details add column retencao_bps integer not null default 0 check (retencao_bps between 0 and 3000);
alter table public.supplier_payout_details add column regime_validado boolean not null default false;
create function private.guard_payout_regime() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if (select private.is_platform_admin()) then
    return new;
  end if;
  if tg_op = 'INSERT' then
    new.retencao_bps := 0;
    new.regime_validado := false;
  elsif new.declaracao_retencao is distinct from old.declaracao_retencao or new.cobra_iva is distinct from old.cobra_iva or new.isencao_iva is distinct from old.isencao_iva then
    new.retencao_bps := 0;
    new.regime_validado := false;
  else
    new.retencao_bps := old.retencao_bps;
    new.regime_validado := old.regime_validado;
  end if;
  return new;
end $$;
revoke all on function private.guard_payout_regime() from public, anon, authenticated;
create trigger supplier_payout_regime_guard before insert or update on public.supplier_payout_details for each row execute function private.guard_payout_regime();
create table public.referral_redemptions (id uuid primary key default gen_random_uuid(), supplier_org_id uuid not null references public.organizations (id), estado text not null default 'pedido' check (estado in ('pedido', 'fatura_recebida', 'paga', 'anulado')), comissao_cents integer not null check (comissao_cents > 0), iva_cents integer not null check (iva_cents >= 0), retencao_cents integer not null check (retencao_cents >= 0), liquido_cents integer not null check (liquido_cents >= 0), cobra_iva boolean not null, isencao_iva text, retencao_bps integer not null, iban text not null, titular text not null, invoice_numero text check (invoice_numero is null or length(invoice_numero) <= 40), invoice_path text, invoice_em timestamptz, paga_em timestamptz, referencia_pagamento text check (referencia_pagamento is null or length(referencia_pagamento) <= 80), motivo text check (motivo is null or length(motivo) <= 300), created_by uuid default auth.uid() references auth.users (id) on delete set null, created_at timestamptz not null default now(), check (comissao_cents + iva_cents = retencao_cents + liquido_cents));
create index referral_redemptions_supplier_idx on public.referral_redemptions (supplier_org_id);
create index referral_redemptions_created_by_idx on public.referral_redemptions (created_by);
alter table public.referral_redemptions enable row level security;
revoke all on public.referral_redemptions from anon;
revoke insert, update, delete on public.referral_redemptions from authenticated;
create policy referral_redemptions_select on public.referral_redemptions for select to authenticated using (private.can_access_org(supplier_org_id) or (select private.is_platform_admin()));
alter table public.referral_payouts add column redemption_id uuid references public.referral_redemptions (id);
create index referral_payouts_redemption_idx on public.referral_payouts (redemption_id);
revoke execute on function public.referral_submit_invoice(uuid, text, text) from authenticated;
revoke execute on function public.referral_mark_paid(uuid, text) from authenticated;
create function public.referral_request_redemption(p_org uuid) returns uuid language plpgsql security definer set search_path = '' as $$
declare
  d public.supplier_payout_details;
  total integer;
  iva integer;
  ret integer;
  rid uuid;
begin
  if not private.can_manage_org(p_org) then
    raise exception 'Fornecedor não encontrado.' using errcode = 'P0001';
  end if;
  select * into d from public.supplier_payout_details where org_id = p_org;
  if not found or d.declaracao_retencao is null then
    raise exception 'Indique o IBAN e declare o regime de IVA e de retenção.' using errcode = 'P0001';
  end if;
  if not d.regime_validado then
    raise exception 'O regime declarado ainda não foi validado pela plataforma.' using errcode = 'P0001';
  end if;
  if exists (select 1 from public.referral_redemptions r where r.supplier_org_id = p_org and r.estado in ('pedido', 'fatura_recebida')) then
    raise exception 'Já tem um resgate em curso.' using errcode = 'P0001';
  end if;
  select coalesce(sum(amount_cents), 0) into total from public.referral_payouts where supplier_org_id = p_org and estado = 'adjudicada' and fee_recebido_em is not null and redemption_id is null;
  if total <= 0 then
    raise exception 'Não há saldo disponível para resgatar.' using errcode = 'P0001';
  end if;
  iva := case when d.cobra_iva then (total * 2300 + 5000) / 10000 else 0 end;
  ret := (total * d.retencao_bps + 5000) / 10000;
  insert into public.referral_redemptions (supplier_org_id, comissao_cents, iva_cents, retencao_cents, liquido_cents, cobra_iva, isencao_iva, retencao_bps, iban, titular)
  values (p_org, total, iva, ret, total + iva - ret, d.cobra_iva, d.isencao_iva, d.retencao_bps, d.iban, d.titular)
  returning id into rid;
  update public.referral_payouts set redemption_id = rid where supplier_org_id = p_org and estado = 'adjudicada' and fee_recebido_em is not null and redemption_id is null;
  return rid;
end $$;
revoke all on function public.referral_request_redemption(uuid) from public, anon;
grant execute on function public.referral_request_redemption(uuid) to authenticated;
create function public.referral_redemption_invoice(p_redemption uuid, p_numero text, p_path text) returns void language plpgsql security definer set search_path = '' as $$
declare
  r public.referral_redemptions;
begin
  select * into r from public.referral_redemptions where id = p_redemption;
  if not found or not private.can_manage_org(r.supplier_org_id) then
    raise exception 'Resgate não encontrado.' using errcode = 'P0001';
  end if;
  if r.estado <> 'pedido' then
    raise exception 'Este resgate já tem fatura ou foi encerrado.' using errcode = 'P0001';
  end if;
  if p_numero is null or btrim(p_numero) = '' or length(p_numero) > 40 or split_part(coalesce(p_path, ''), '/', 1) <> r.supplier_org_id::text then
    raise exception 'Fatura inválida.' using errcode = 'P0001';
  end if;
  update public.referral_redemptions set estado = 'fatura_recebida', invoice_numero = btrim(p_numero), invoice_path = p_path, invoice_em = now() where id = p_redemption;
end $$;
revoke all on function public.referral_redemption_invoice(uuid, text, text) from public, anon;
grant execute on function public.referral_redemption_invoice(uuid, text, text) to authenticated;
create function public.referral_redemption_cancel(p_redemption uuid, p_motivo text) returns void language plpgsql security definer set search_path = '' as $$
declare
  r public.referral_redemptions;
begin
  select * into r from public.referral_redemptions where id = p_redemption;
  if not found then
    raise exception 'Resgate não encontrado.' using errcode = 'P0001';
  end if;
  if not ((r.estado = 'pedido' and private.can_manage_org(r.supplier_org_id)) or (r.estado in ('pedido', 'fatura_recebida') and private.is_platform_admin())) then
    raise exception 'Não se pode anular este resgate.' using errcode = 'P0001';
  end if;
  update public.referral_redemptions set estado = 'anulado', motivo = left(btrim(coalesce(p_motivo, '')), 300) where id = p_redemption;
  update public.referral_payouts set redemption_id = null where redemption_id = p_redemption;
end $$;
revoke all on function public.referral_redemption_cancel(uuid, text) from public, anon;
grant execute on function public.referral_redemption_cancel(uuid, text) to authenticated;
create function public.referral_redemption_pay(p_redemption uuid, p_ref text) returns void language plpgsql security definer set search_path = '' as $$
begin
  if not private.is_platform_admin() then
    raise exception 'Só a equipa da plataforma.' using errcode = 'P0001';
  end if;
  update public.referral_redemptions set estado = 'paga', paga_em = now(), referencia_pagamento = left(btrim(coalesce(p_ref, '')), 80) where id = p_redemption and estado = 'fatura_recebida';
  if not found then
    raise exception 'Só se paga um resgate com fatura recebida.' using errcode = 'P0001';
  end if;
  update public.referral_payouts set estado = 'paga', paga_em = now(), referencia_pagamento = left(btrim(coalesce(p_ref, '')), 80) where redemption_id = p_redemption;
end $$;
revoke all on function public.referral_redemption_pay(uuid, text) from public, anon;
grant execute on function public.referral_redemption_pay(uuid, text) to authenticated;
create function public.referral_validate_regime(p_org uuid, p_bps integer, p_validado boolean) returns void language plpgsql security definer set search_path = '' as $$
begin
  if not private.is_platform_admin() then
    raise exception 'Só a equipa da plataforma.' using errcode = 'P0001';
  end if;
  if p_bps < 0 or p_bps > 3000 then
    raise exception 'Retenção entre 0%% e 30%%.' using errcode = 'P0001';
  end if;
  update public.supplier_payout_details set retencao_bps = p_bps, regime_validado = p_validado where org_id = p_org;
  if not found then
    raise exception 'O fornecedor ainda não indicou os dados de pagamento.' using errcode = 'P0001';
  end if;
end $$;
revoke all on function public.referral_validate_regime(uuid, integer, boolean) from public, anon;
grant execute on function public.referral_validate_regime(uuid, integer, boolean) to authenticated;
create or replace function public.referral_void(p_payout uuid, p_motivo text) returns void language plpgsql security definer set search_path = '' as $$
begin
  if not private.is_platform_admin() then
    raise exception 'Só a equipa da plataforma.' using errcode = 'P0001';
  end if;
  update public.referral_payouts set estado = 'sem_efeito', motivo = left(btrim(coalesce(p_motivo, '')), 300) where id = p_payout and estado = 'adjudicada' and redemption_id is null;
  if not found then
    raise exception 'Não se pode anular esta comissão (já está num resgate ou já foi paga).' using errcode = 'P0001';
  end if;
end $$;
