-- Fachadas no pedido e na proposta (decisão de 21/10/2026, docs/PROPOSTA.md, fase 2).
-- Cada instrução numa só linha, para sobreviver a colagens que juntam linhas.
alter table public.work_requests add column trabalhos_modo text not null default 'iguais' check (trabalhos_modo in ('iguais', 'diferencas', 'nao_sei'));
alter table public.request_listings add column trabalhos_modo text not null default 'iguais' check (trabalhos_modo in ('iguais', 'diferencas', 'nao_sei'));
alter table public.request_surfaces add column trabalhos text[];
alter table public.request_surfaces add constraint request_surfaces_trabalhos_check check (trabalhos is null or trabalhos <@ array['lavagem', 'reparacao_fissuras', 'tratamento_humidade', 'primario', 'pintura', 'impermeabilizacao', 'tratamento_metais']::text[]);
alter table public.proposal_lines add column surface_ids uuid[] not null default '{}'::uuid[];
alter table public.proposal_lines add column motivo_diferenca text check (motivo_diferenca is null or length(motivo_diferenca) <= 300);

create or replace function private.listing_via_publica() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.status = 'publicado' then
    update public.request_listings set ocupacao_via_publica = new.ocupacao_via_publica, produtos_preferidos = new.produtos_preferidos, trabalhos_modo = new.trabalhos_modo where request_id = new.id;
  end if;
  return new;
end $$;

create function private.proposal_line_zones() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if cardinality(new.surface_ids) > 0 and exists (select 1 from unnest(new.surface_ids) z where not exists (select 1 from public.request_surfaces rs join public.proposals p on p.request_id = rs.request_id where p.id = new.proposal_id and rs.id = z)) then
    raise exception 'Há uma zona que não pertence a este pedido.' using errcode = 'P0001';
  end if;
  return new;
end $$;

revoke all on function private.proposal_line_zones() from public, anon, authenticated;

create trigger proposal_lines_zones before insert or update on public.proposal_lines for each row execute function private.proposal_line_zones();
