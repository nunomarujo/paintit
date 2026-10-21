-- Códigos de adesão dos fornecedores (decisão de 21/10/2026): o fornecedor cria um código; o pintor aplica-o ao orçamento;
-- se ganhar a obra, a comissão da plataforma desce 0,25 pontos (3% para 2,75%) e o fornecedor recebe 0,25% do valor da obra
-- (+ IVA, se aplicável) quando a plataforma receber a comissão do pintor. Uma instrução por linha.
create table public.referral_codes (id uuid primary key default gen_random_uuid(), supplier_org_id uuid not null references public.organizations (id), code text not null unique check (code ~ '^[A-Z0-9]{6,12}$'), nota text check (nota is null or length(nota) <= 80), painter_org_id uuid references public.organizations (id), max_wins integer not null default 1 check (max_wins between 1 and 100), active boolean not null default true, created_by uuid default auth.uid() references auth.users (id) on delete set null, created_at timestamptz not null default now());
create index referral_codes_supplier_idx on public.referral_codes (supplier_org_id);
create index referral_codes_painter_idx on public.referral_codes (painter_org_id);
create index referral_codes_created_by_idx on public.referral_codes (created_by);
alter table public.referral_codes enable row level security;
revoke all on public.referral_codes from anon;
revoke update, delete on public.referral_codes from authenticated;
grant update (active, nota) on public.referral_codes to authenticated;
create policy referral_codes_select on public.referral_codes for select to authenticated using (private.can_access_org(supplier_org_id) or (select private.is_platform_admin()));
create policy referral_codes_insert on public.referral_codes for insert to authenticated with check (private.can_manage_org(supplier_org_id) and painter_org_id is null and exists (select 1 from public.organizations o where o.id = supplier_org_id and o.kind = 'fornecedor'));
create policy referral_codes_update on public.referral_codes for update to authenticated using (private.can_manage_org(supplier_org_id)) with check (private.can_manage_org(supplier_org_id));
alter table public.proposals add column referral_code_id uuid references public.referral_codes (id);
create index proposals_referral_code_idx on public.proposals (referral_code_id);
create function private.guard_referral_column() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if (tg_op = 'INSERT' and new.referral_code_id is not null) or (tg_op = 'UPDATE' and new.referral_code_id is distinct from old.referral_code_id) then
    if coalesce(current_setting('app.referral_apply', true), '') <> '1' then
      raise exception 'O código só se aplica pela função própria.' using errcode = 'P0001';
    end if;
  end if;
  return new;
end $$;
revoke all on function private.guard_referral_column() from public, anon, authenticated;
create trigger proposals_referral_guard before insert or update on public.proposals for each row execute function private.guard_referral_column();
create table public.supplier_payout_details (org_id uuid primary key references public.organizations (id) on delete cascade, iban text not null check (iban ~ '^PT50[0-9]{21}$'), titular text not null check (length(titular) between 2 and 120), cobra_iva boolean not null default true, updated_at timestamptz not null default now());
alter table public.supplier_payout_details enable row level security;
revoke all on public.supplier_payout_details from anon;
create policy supplier_payout_details_select on public.supplier_payout_details for select to authenticated using (private.can_access_org(org_id) or (select private.is_platform_admin()));
create policy supplier_payout_details_insert on public.supplier_payout_details for insert to authenticated with check (private.can_manage_org(org_id) and exists (select 1 from public.organizations o where o.id = org_id and o.kind = 'fornecedor'));
create policy supplier_payout_details_update on public.supplier_payout_details for update to authenticated using (private.can_manage_org(org_id)) with check (private.can_manage_org(org_id));
create table public.referral_payouts (id uuid primary key default gen_random_uuid(), code_id uuid not null references public.referral_codes (id), supplier_org_id uuid not null references public.organizations (id), engagement_id uuid not null unique references public.engagements (id), proposal_id uuid not null references public.proposals (id), amount_cents integer not null check (amount_cents >= 0), estado text not null default 'adjudicada' check (estado in ('adjudicada', 'fatura_recebida', 'paga', 'sem_efeito')), fee_recebido_em timestamptz, fee_avisado boolean not null default false, invoice_numero text check (invoice_numero is null or length(invoice_numero) <= 40), invoice_path text, invoice_em timestamptz, paga_em timestamptz, referencia_pagamento text check (referencia_pagamento is null or length(referencia_pagamento) <= 80), motivo text check (motivo is null or length(motivo) <= 300), created_at timestamptz not null default now());
create index referral_payouts_code_idx on public.referral_payouts (code_id);
create index referral_payouts_supplier_idx on public.referral_payouts (supplier_org_id);
create index referral_payouts_proposal_idx on public.referral_payouts (proposal_id);
alter table public.referral_payouts enable row level security;
revoke all on public.referral_payouts from anon;
revoke insert, update, delete on public.referral_payouts from authenticated;
create policy referral_payouts_select on public.referral_payouts for select to authenticated using (private.can_access_org(supplier_org_id) or (select private.is_platform_admin()));
create function public.apply_referral_code(p_proposal uuid, p_code text) returns text language plpgsql security definer set search_path = '' as $$
declare
  prop record;
  c public.referral_codes;
  sup text;
begin
  select id, painter_org_id, status into prop from public.proposals where id = p_proposal;
  if not found or not private.can_manage_org(prop.painter_org_id) then
    raise exception 'Proposta não encontrada.' using errcode = 'P0001';
  end if;
  if prop.status <> 'rascunho' then
    raise exception 'Só um rascunho se altera.' using errcode = 'P0001';
  end if;
  perform set_config('app.referral_apply', '1', true);
  if p_code is null or btrim(p_code) = '' then
    update public.proposals set referral_code_id = null where id = p_proposal;
    return null;
  end if;
  select * into c from public.referral_codes where code = upper(btrim(p_code));
  if not found or not c.active then
    raise exception 'Código inválido ou desativado.' using errcode = 'P0001';
  end if;
  if c.supplier_org_id = prop.painter_org_id then
    raise exception 'Uma empresa não pode usar o seu próprio código.' using errcode = 'P0001';
  end if;
  if c.painter_org_id is not null and c.painter_org_id <> prop.painter_org_id then
    raise exception 'Este código já foi atribuído a outra empresa.' using errcode = 'P0001';
  end if;
  if (select count(*) from public.referral_payouts p where p.code_id = c.id and p.estado <> 'sem_efeito') >= c.max_wins then
    raise exception 'Este código já foi utilizado.' using errcode = 'P0001';
  end if;
  update public.referral_codes set painter_org_id = prop.painter_org_id where id = c.id and painter_org_id is null;
  update public.proposals set referral_code_id = c.id where id = p_proposal;
  select nome into sup from public.organizations where id = c.supplier_org_id;
  return sup;
end $$;
revoke all on function public.apply_referral_code(uuid, text) from public, anon;
grant execute on function public.apply_referral_code(uuid, text) to authenticated;
create or replace function private.proposal_selected() returns trigger language plpgsql security definer set search_path = '' as $$
declare
  previous uuid;
  eid uuid;
  v text := private.current_rules_version();
  c public.referral_codes;
begin
  if new.status = 'selecionada' and old.status is distinct from 'selecionada' then
    select e.id into previous
    from public.engagements e
    where e.request_id = new.request_id
      and exists (select 1 from public.engagement_events v where v.engagement_id = e.id and v.kind = 'transitar')
      and not exists (select 1 from public.engagements n where n.carried_from = e.id)
    order by e.created_at desc
    limit 1;
    if new.referral_code_id is not null then
      select * into c from public.referral_codes where id = new.referral_code_id;
      if found and (select count(*) from public.referral_payouts p where p.code_id = c.id and p.estado <> 'sem_efeito') < c.max_wins then
        v := v || '+ref';
      else
        c := null;
      end if;
    end if;
    insert into public.engagements (
      proposal_id, request_id, client_org_id, painter_org_id, base_cents, advance_cents, rules_version, carried_from
    ) values (
      new.id, new.request_id, private.request_org(new.request_id), new.painter_org_id, new.base_cents,
      (new.base_cents * new.adiantamento_bps + 5000) / 10000,
      v, previous
    ) returning id into eid;
    if c.id is not null then
      insert into public.referral_payouts (code_id, supplier_org_id, engagement_id, proposal_id, amount_cents)
      values (c.id, c.supplier_org_id, eid, new.id, (new.base_cents * 25 + 5000) / 10000);
    end if;
  end if;
  return new;
end $$;
create function private.referral_fee_received() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.kind = 'fee_recebido' then
    update public.referral_payouts set fee_recebido_em = new.at where engagement_id = new.engagement_id and fee_recebido_em is null;
  end if;
  return new;
end $$;
revoke all on function private.referral_fee_received() from public, anon, authenticated;
create trigger engagement_events_referral after insert on public.engagement_events for each row execute function private.referral_fee_received();
create function public.referral_submit_invoice(p_payout uuid, p_numero text, p_path text) returns void language plpgsql security definer set search_path = '' as $$
declare
  p public.referral_payouts;
begin
  select * into p from public.referral_payouts where id = p_payout;
  if not found or not private.can_manage_org(p.supplier_org_id) then
    raise exception 'Comissão não encontrada.' using errcode = 'P0001';
  end if;
  if p.estado <> 'adjudicada' or p.fee_recebido_em is null then
    raise exception 'A fatura só se envia depois de a plataforma receber a comissão do pintor.' using errcode = 'P0001';
  end if;
  if not exists (select 1 from public.supplier_payout_details d where d.org_id = p.supplier_org_id) then
    raise exception 'Indique primeiro o IBAN.' using errcode = 'P0001';
  end if;
  if p_numero is null or btrim(p_numero) = '' or length(p_numero) > 40 or split_part(coalesce(p_path, ''), '/', 1) <> p.supplier_org_id::text then
    raise exception 'Fatura inválida.' using errcode = 'P0001';
  end if;
  update public.referral_payouts set estado = 'fatura_recebida', invoice_numero = btrim(p_numero), invoice_path = p_path, invoice_em = now() where id = p_payout;
end $$;
revoke all on function public.referral_submit_invoice(uuid, text, text) from public, anon;
grant execute on function public.referral_submit_invoice(uuid, text, text) to authenticated;
create function public.referral_mark_paid(p_payout uuid, p_ref text) returns void language plpgsql security definer set search_path = '' as $$
begin
  if not private.is_platform_admin() then
    raise exception 'Só a equipa da plataforma.' using errcode = 'P0001';
  end if;
  update public.referral_payouts set estado = 'paga', paga_em = now(), referencia_pagamento = left(btrim(coalesce(p_ref, '')), 80) where id = p_payout and estado = 'fatura_recebida';
  if not found then
    raise exception 'Só se paga uma comissão com fatura recebida.' using errcode = 'P0001';
  end if;
end $$;
revoke all on function public.referral_mark_paid(uuid, text) from public, anon;
grant execute on function public.referral_mark_paid(uuid, text) to authenticated;
create function public.referral_void(p_payout uuid, p_motivo text) returns void language plpgsql security definer set search_path = '' as $$
begin
  if not private.is_platform_admin() then
    raise exception 'Só a equipa da plataforma.' using errcode = 'P0001';
  end if;
  update public.referral_payouts set estado = 'sem_efeito', motivo = left(btrim(coalesce(p_motivo, '')), 300) where id = p_payout and estado in ('adjudicada', 'fatura_recebida');
  if not found then
    raise exception 'Não se pode anular esta comissão.' using errcode = 'P0001';
  end if;
end $$;
revoke all on function public.referral_void(uuid, text) from public, anon;
grant execute on function public.referral_void(uuid, text) to authenticated;
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values ('faturas-adesao', 'faturas-adesao', false, 5242880, array['application/pdf']);
create policy faturas_adesao_select on storage.objects for select to authenticated using (bucket_id = 'faturas-adesao' and (private.can_access_org(private.org_from_path(name)) or (select private.is_platform_admin())));
create policy faturas_adesao_insert on storage.objects for insert to authenticated with check (bucket_id = 'faturas-adesao' and private.can_manage_org(private.org_from_path(name)));
create function public.referral_activity(p_org uuid) returns table (code text, pintor text, concelho text, proposta_estado text, submetida_em timestamptz, payout_id uuid, amount_cents integer, estado text, fee_recebido_em timestamptz, invoice_numero text, paga_em timestamptz, referencia_pagamento text) language plpgsql stable security definer set search_path = '' as $$
begin
  if not (private.can_access_org(p_org) or private.is_platform_admin()) then
    raise exception 'Fornecedor não encontrado.' using errcode = 'P0001';
  end if;
  return query
    select c.code, o.nome, l.concelho, p.status::text, p.submitted_at, y.id, y.amount_cents, y.estado, y.fee_recebido_em, y.invoice_numero, y.paga_em, y.referencia_pagamento
    from public.proposals p
    join public.referral_codes c on c.id = p.referral_code_id and c.supplier_org_id = p_org
    join public.organizations o on o.id = p.painter_org_id
    left join public.request_listings l on l.request_id = p.request_id
    left join public.referral_payouts y on y.proposal_id = p.id
    where p.status <> 'rascunho'
    order by p.submitted_at desc nulls last;
end $$;
revoke all on function public.referral_activity(uuid) from public, anon;
grant execute on function public.referral_activity(uuid) to authenticated;
