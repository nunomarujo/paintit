-- Decisão de 22/10/2026 (docs/DECISOES.md, "dois programas de referência, não um"): o código de adesão deixa de
-- ser "um código, uma obra". O desconto do pintor passa a ser ambiente: soma-se 0,25 p.p. por cada fornecedor com
-- código ligado e ativo, em TODAS as propostas futuras do pintor — não só nas que têm este código marcado — com
-- teto de 800 pontos-base. A comissão do fornecedor passa a variar por volume: 1%, ou 2% ao alcançar a 3.ª obra
-- (de qualquer pintor que referenciou) nos 2 meses anteriores a esta, nunca retroativo.
--
-- As fórmulas vivem em src/domain/referral.ts (linkedSupplierDiscountBp, supplierCommissionBpAt,
-- combinedPainterDiscountBp) e repetem-se aqui em SQL, como já acontecia com os 0,25% fixos — há um teste em
-- supabase/tests/rls.test.ts que confirma que os dois lados concordam.
--
-- max_wins fica na tabela (não se eliminam colunas sem confirmação manual) mas deixa de ser consultado: a relação
-- corta-se desativando o código (active = false), não por contagem de utilizações.

alter table public.engagements
  add column referral_discount_bp integer not null default 0 check (referral_discount_bp >= 0);
comment on column public.engagements.referral_discount_bp is
  'Desconto do pintor em pontos-base, resolvido e gravado uma vez por contratação (private.proposal_selected); nunca recalculado depois.';

create or replace function public.apply_referral_code(p_proposal uuid, p_code text) returns text language plpgsql security definer set search_path = '' as $$
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
  update public.referral_codes set painter_org_id = prop.painter_org_id where id = c.id and painter_org_id is null;
  update public.proposals set referral_code_id = c.id where id = p_proposal;
  select nome into sup from public.organizations where id = c.supplier_org_id;
  return sup;
end $$;

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

    -- Desconto do pintor: soma de 0,25 p.p. por fornecedor com código ligado e ativo, independente de qual (se
    -- algum) está marcado nesta proposta — linkedSupplierDiscountBp + combinedPainterDiscountBp.
    select count(distinct supplier_org_id) into linked_count
    from public.referral_codes
    where painter_org_id = new.painter_org_id and active;
    discount_bp := least(25 * linked_count, 800);

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
