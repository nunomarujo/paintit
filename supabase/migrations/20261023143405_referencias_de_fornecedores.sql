-- Referências de fornecedores (pintor → fornecedor): a segunda metade dos "dois programas de referência"
-- (docs/DECISOES.md, 22/10/2026). O pintor convida fornecedores; ganha um desconto quando o convidado se valida
-- como entidade NOVA (NIF novo na plataforma — já garantido por organizations_fornecedor_nif_idx) e esse desconto
-- cresce com Q(n), o número de fornecedores atualmente elegíveis (src/domain/referralEligibility.ts).
--
-- Duas datas por convite, como já estava pensado em referralEligibility.ts: quando o fornecedor se regista com o
-- código (convite_confirmado_em) e quando a sua subscrição ativa pela primeira vez (adesao_elegivel_em — início da
-- janela de 12 meses). Usa-se a ativação, não o registo, para não encurtar a janela pelo tempo até subscrever.

create table public.supplier_referral_invites (
  id uuid primary key default gen_random_uuid(),
  painter_org_id uuid not null references public.organizations (id),
  code text not null unique check (code ~ '^[A-Z0-9]{6,12}$'),
  nota text check (nota is null or length(nota) <= 80),
  active boolean not null default true,
  -- Preenchidos só pela função própria (apply_supplier_referral_code) ou pela ativação da subscrição: ver o gatilho
  -- guard_supplier_referral_invite abaixo.
  supplier_org_id uuid references public.organizations (id),
  nif text,
  convite_confirmado_em timestamptz,
  adesao_elegivel_em date,
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);
create index supplier_referral_invites_painter_idx on public.supplier_referral_invites (painter_org_id);
create index supplier_referral_invites_supplier_idx on public.supplier_referral_invites (supplier_org_id);
alter table public.supplier_referral_invites enable row level security;
revoke all on public.supplier_referral_invites from anon;
revoke update, delete on public.supplier_referral_invites from authenticated;
-- supplier_org_id, nif, convite_confirmado_em e adesao_elegivel_em ficam fora desta lista: só se gravam pelas
-- funções security definer abaixo (apply_supplier_referral_code e o gatilho da subscrição), que não passam pelo
-- grant de authenticated — como já acontece em referral_codes.painter_org_id (sem gatilho de guarda; o grant basta).
grant update (active, nota) on public.supplier_referral_invites to authenticated;
create policy supplier_referral_invites_select on public.supplier_referral_invites for select to authenticated
  using (
    private.can_access_org(painter_org_id)
    or (supplier_org_id is not null and private.can_access_org(supplier_org_id))
    or (select private.is_platform_admin())
  );
create policy supplier_referral_invites_insert on public.supplier_referral_invites for insert to authenticated
  with check (
    private.can_manage_org(painter_org_id) and supplier_org_id is null and nif is null
    and convite_confirmado_em is null and adesao_elegivel_em is null
    and exists (select 1 from public.organizations o where o.id = painter_org_id and o.kind = 'pintor')
  );
create policy supplier_referral_invites_update on public.supplier_referral_invites for update to authenticated
  using (private.can_manage_org(painter_org_id)) with check (private.can_manage_org(painter_org_id));

-- O fornecedor aplica o código de quem o indicou, uma só vez, no momento do registo (entidade nova — nunca se
-- reatribui). Chamada separada da criação da organização (a app faz as duas, nessa ordem).
create function public.apply_supplier_referral_code(p_org uuid, p_code text) returns void
language plpgsql security definer set search_path = '' as $$
declare
  org record;
  inv public.supplier_referral_invites;
begin
  select kind, nif into org from public.organizations where id = p_org and private.can_manage_org(p_org);
  if not found then
    raise exception 'Entidade não encontrada.' using errcode = 'P0001';
  end if;
  if org.kind <> 'fornecedor' then
    raise exception 'Só um fornecedor usa este código.' using errcode = 'P0001';
  end if;
  if p_code is null or btrim(p_code) = '' then
    return;
  end if;
  select * into inv from public.supplier_referral_invites where code = upper(btrim(p_code));
  if not found or not inv.active then
    raise exception 'Código inválido ou desativado.' using errcode = 'P0001';
  end if;
  if inv.painter_org_id = p_org then
    raise exception 'Uma empresa não pode usar o seu próprio código.' using errcode = 'P0001';
  end if;
  if inv.supplier_org_id is not null then
    raise exception 'Este código já foi utilizado.' using errcode = 'P0001';
  end if;
  update public.supplier_referral_invites
    set supplier_org_id = p_org, nif = org.nif, convite_confirmado_em = now()
    where id = inv.id;
end $$;
revoke all on function public.apply_supplier_referral_code(uuid, text) from public, anon;
grant execute on function public.apply_supplier_referral_code(uuid, text) to authenticated;

-- A 1.ª subscrição de um fornecedor marca a ativação validada — início da janela de 12 meses de elegibilidade.
create function private.supplier_subscription_referral_eligibility() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  update public.supplier_referral_invites
    set adesao_elegivel_em = new.started_at::date
    where supplier_org_id = new.org_id and adesao_elegivel_em is null;
  return new;
end $$;
revoke all on function private.supplier_subscription_referral_eligibility() from public, anon, authenticated;
create trigger supplier_subscriptions_referral_eligibility after insert on public.supplier_subscriptions
  for each row execute function private.supplier_subscription_referral_eligibility();

-- Q(n): desconto do pintor pelos fornecedores referidos atualmente elegíveis (um benefício por NIF, o convite
-- confirmado mais antigo). Repete em SQL a fórmula de referralDiscountBp (src/domain/referralEligibility.ts) — o
-- teste em rls.test.ts confirma que os dois lados concordam.
create function private.referral_window_discount_bp(p_painter uuid, p_at date) returns integer
language sql stable security definer set search_path = '' as $$
  select case when n = 0 then 0 when n = 1 then 100 else least(400, 175 + 50 * (n - 2)) end
  from (
    select count(*) as n from (
      select distinct on (nif) adesao_elegivel_em
      from public.supplier_referral_invites
      where painter_org_id = p_painter and convite_confirmado_em is not null and adesao_elegivel_em is not null
      order by nif, convite_confirmado_em asc
    ) e
    where p_at >= e.adesao_elegivel_em and p_at < (e.adesao_elegivel_em + interval '12 months')::date
  ) c;
$$;
revoke all on function private.referral_window_discount_bp(uuid, date) from public, anon, authenticated;

-- Liga-se ao desconto ambiente dos códigos de adesão, já em proposal_selected() (mesmo teto conjunto de 800 p.b.).
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

    -- Desconto do pintor: códigos de adesão (0,25 p.p. por fornecedor com código ligado e ativo, ambiente) somado
    -- às referências de fornecedores (Q(n), pelos fornecedores elegíveis hoje), com um só teto de 800 p.b.
    select count(distinct supplier_org_id) into linked_count
    from public.referral_codes
    where painter_org_id = new.painter_org_id and active;
    discount_bp := least(25 * linked_count + private.referral_window_discount_bp(new.painter_org_id, current_date), 800);

    -- Comissão do fornecedor nesta obra: só se esta proposta tiver um código ligado e ainda ativo — identifica QUAL
    -- fornecedor fica associado a ESTA obra, mesmo que o pintor tenha outros códigos ligados (acima).
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
      -- supplierCommissionBpAt: 1%, ou 2% ao alcançar a 3.ª obra (de qualquer pintor que referenciou este
      -- fornecedor) nos 2 meses anteriores a esta; nunca retroativo (só conta as já registadas antes desta).
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
