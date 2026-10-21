-- Condições do orçamento (decisão de 21/10/2026): plano de pagamentos por fases, declaração de
-- mão-de-obra qualificada e declaração de seguros. Só se exigem na submissão (rascunhos antigos
-- continuam válidos). Igual a submitBlockers() em src/domain/proposal.ts.
alter table public.proposals
  add column fases jsonb not null default '[]'::jsonb,
  add column confirma_mao_obra boolean not null default false,
  add column seguro_rc text check (seguro_rc in ('sim', 'nao')),
  add column seguro_at text check (seguro_at in ('sim', 'nao')),
  add constraint proposals_fases_array check (jsonb_typeof(fases) = 'array' and jsonb_array_length(fases) <= 8);

create function private.proposal_conditions() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_sum bigint;
begin
  if old.status = 'rascunho' and new.status = 'submetida' then
    if not new.confirma_mao_obra then
      raise exception 'Confirme que o orçamento inclui mão-de-obra qualificada.' using errcode = 'P0001';
    end if;
    if new.seguro_rc is null or new.seguro_at is null then
      raise exception 'Declare os seguros (responsabilidade civil e acidentes de trabalho).' using errcode = 'P0001';
    end if;
    select coalesce(sum((f ->> 'bps')::int), 0) into v_sum from jsonb_array_elements(new.fases) f;
    if jsonb_array_length(new.fases) = 0 or new.adiantamento_bps + v_sum <> 10000 then
      raise exception 'O plano de pagamentos tem de somar 100%% do preço.' using errcode = 'P0001';
    end if;
  end if;
  return new;
end $$;
revoke all on function private.proposal_conditions() from public, anon, authenticated;

-- Corre antes de proposals_transition (ordem alfabética).
create trigger proposal_conditions_check before update on public.proposals
  for each row execute function private.proposal_conditions();
