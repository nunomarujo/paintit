-- "Traga o seu pintor" (decisão de 22/10/2026, docs/DECISOES.md): o cliente cria um código (ou QR, que é só uma
-- forma de o apresentar — o código é a única coisa que existe de facto) para a sua própria obra, publicada, e
-- entrega-o à empresa de pintura da sua confiança. Essa empresa, registada ou não ainda na plataforma, segue o
-- código diretamente para a obra. Se ganhar, a comissão fica muito mais baixa do que a normal — para não ser o
-- cliente a "pedir ao seu pintor para pagar mais para usar uma app". Nunca se tira a abertura a 3 orçamentos: o
-- convite é só mais uma proposta entre outras.

create table public.request_invites (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.work_requests (id) on delete cascade,
  code text not null unique check (code ~ '^[A-Z0-9]{6,12}$'),
  nota text check (nota is null or length(nota) <= 80),
  active boolean not null default true,
  -- Preenchidos só por redeem_request_invite: nunca pelo grant de authenticated (ver abaixo).
  painter_org_id uuid references public.organizations (id),
  redeemed_at timestamptz,
  created_by uuid not null default auth.uid() references auth.users (id),
  created_at timestamptz not null default now()
);
create index request_invites_request_idx on public.request_invites (request_id);
create index request_invites_painter_idx on public.request_invites (painter_org_id);
alter table public.request_invites enable row level security;
revoke all on public.request_invites from anon;
revoke update, delete on public.request_invites from authenticated;
grant update (active, nota) on public.request_invites to authenticated;
create policy request_invites_select on public.request_invites for select to authenticated
  using (
    private.can_access_org(private.request_org(request_id))
    or (painter_org_id is not null and private.can_access_org(painter_org_id))
    or (select private.is_platform_admin())
  );
create policy request_invites_insert on public.request_invites for insert to authenticated
  with check (
    private.can_manage_org(private.request_org(request_id))
    and private.listing_open(request_id)
    and painter_org_id is null and redeemed_at is null
  );
create policy request_invites_update on public.request_invites for update to authenticated
  using (private.can_manage_org(private.request_org(request_id)))
  with check (private.can_manage_org(private.request_org(request_id)));

-- A empresa de pintura segue o código: liga-se à sua organização (a primeira vez; depois é idempotente para a
-- mesma organização) e devolve a obra, para a app a abrir. Não revela nada de novo: a listagem já é visível a
-- qualquer pintor autenticado, uma vez publicada.
create function public.redeem_request_invite(p_code text, p_painter_org uuid) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  inv public.request_invites;
begin
  if not (private.can_manage_org(p_painter_org) and private.is_painter_org(p_painter_org)) then
    raise exception 'Entidade não encontrada.' using errcode = 'P0001';
  end if;
  select * into inv from public.request_invites where code = upper(btrim(p_code));
  if not found or not inv.active then
    raise exception 'Código inválido ou desativado.' using errcode = 'P0001';
  end if;
  if not private.listing_open(inv.request_id) then
    raise exception 'Esta obra já não está publicada.' using errcode = 'P0001';
  end if;
  if inv.painter_org_id is not null and inv.painter_org_id <> p_painter_org then
    raise exception 'Este convite já foi associado a outra empresa.' using errcode = 'P0001';
  end if;
  if inv.painter_org_id is null then
    update public.request_invites set painter_org_id = p_painter_org, redeemed_at = now() where id = inv.id;
  end if;
  return inv.request_id;
end $$;
revoke all on function public.redeem_request_invite(text, uuid) from public, anon;
grant execute on function public.redeem_request_invite(text, uuid) to authenticated;

-- Pré-visualização antes de escolher com qual organização seguir o código (se a conta gerir mais do que uma) —
-- só o que já é público numa listagem aberta (tipo de obra, concelho), nunca mais do que isso.
create function public.request_invite_info(p_code text)
returns table (request_id uuid, tipo_obra public.work_type, concelho text, ja_redimido boolean)
language sql stable security definer set search_path = '' as $$
  select l.request_id, l.tipo_obra, l.concelho, (i.painter_org_id is not null)
  from public.request_invites i
  join public.request_listings l on l.request_id = i.request_id
  where i.code = upper(btrim(p_code)) and i.active and l.aberto;
$$;
revoke all on function public.request_invite_info(text) from public, anon;
grant execute on function public.request_invite_info(text) to authenticated;

-- proposal_selected(): se a proposta ganhadora vem de uma empresa que seguiu um convite direto para esta mesma
-- obra, a versão das regras usa a comissão muito mais baixa (RULES_2026_10_20+convite, src/domain/rules.ts) em
-- vez da normal. Os descontos de códigos de adesão e referências (acima) compõem-se da mesma forma, sobre essa
-- base — não há razão para os impedir só porque a base já é baixa.
create or replace function private.proposal_selected() returns trigger language plpgsql security definer set search_path = '' as $$
declare
  previous uuid;
  eid uuid;
  v text := private.current_rules_version();
  c public.referral_codes;
  linked_count integer;
  discount_bp integer;
  supplier_wins integer;
  supplier_bp integer;
begin
  if new.status = 'selecionada' and old.status is distinct from 'selecionada' then
    select e.id into previous
    from public.engagements e
    where e.request_id = new.request_id
      and exists (select 1 from public.engagement_events v where v.engagement_id = e.id and v.kind = 'transitar')
      and not exists (select 1 from public.engagements n where n.carried_from = e.id)
    order by e.created_at desc
    limit 1;

    if exists (
      select 1 from public.request_invites
      where request_id = new.request_id and painter_org_id = new.painter_org_id and active
    ) then
      v := v || '+convite';
    end if;

    -- Desconto do pintor: códigos de adesão ligados (ambiente, qualquer que seja o marcado nesta proposta)
    -- somado às referências de fornecedores elegíveis, com o teto conjunto.
    select count(distinct supplier_org_id) into linked_count
    from public.referral_codes
    where painter_org_id = new.painter_org_id and active;
    discount_bp := least(25 * linked_count + private.referral_window_discount_bp(new.painter_org_id, current_date), 800);

    -- Comissão do fornecedor nesta obra: só se esta proposta tiver um código ligado e ainda ativo.
    if new.referral_code_id is not null then
      select * into c from public.referral_codes where id = new.referral_code_id and active;
      if not found then
        c := null;
      end if;
    end if;

    insert into public.engagements (
      proposal_id, request_id, client_org_id, painter_org_id, base_cents, advance_cents, rules_version,
      referral_discount_bp, carried_from
    ) values (
      new.id, new.request_id, private.request_org(new.request_id), new.painter_org_id, new.base_cents,
      (new.base_cents * new.adiantamento_bps + 5000) / 10000,
      v, discount_bp, previous
    ) returning id into eid;

    if c.id is not null then
      select count(*) into supplier_wins
      from public.referral_payouts p
      join public.referral_codes rc on rc.id = p.code_id
      where rc.supplier_org_id = c.supplier_org_id
        and p.estado <> 'sem_efeito'
        and p.created_at >= now() - interval '2 months';
      supplier_bp := case when supplier_wins + 1 >= 3 then 200 else 100 end;
      insert into public.referral_payouts (code_id, supplier_org_id, engagement_id, proposal_id, amount_cents)
      values (c.id, c.supplier_org_id, eid, new.id, (new.base_cents * supplier_bp + 5000) / 10000);
    end if;
  end if;
  return new;
end $$;
