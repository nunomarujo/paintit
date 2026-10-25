-- Obras autónomas (25/10/2026, docs/DECISOES.md).
--
-- As ferramentas de obra estavam presas a uma contratação da plataforma: quem ainda não ganhou nenhuma
-- obra aqui abria o separador e via um ecrã vazio. Ora as ferramentas valem por si — uma empresa de
-- pintura tem obras suas, ganhas por fora, e é nelas que gere gente, consumíveis e custos todos os
-- dias. Passam a existir obras próprias, e uma contratação da plataforma passa a ser apenas uma obra
-- que tem contratação associada.
--
-- As tabelas de obra estão todas vazias em produção (verificado a 25/10/2026: members, phases,
-- entries e material_orders a zero), por isso a mudança de chave é feita de uma vez, sem período de
-- convivência. O único engagement existente recebe a sua obra no preenchimento abaixo.

create table if not exists public.worksites (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  -- Preenchido quando a obra nasce de uma contratação da plataforma; null numa obra própria.
  engagement_id uuid unique references public.engagements (id) on delete set null,
  nome text not null check (length(btrim(nome)) between 2 and 160),
  cliente_nome text check (cliente_nome is null or length(cliente_nome) <= 160),
  local text check (local is null or length(local) <= 160),
  -- Valor da obra sem IVA. Numa obra da plataforma vem da contratação; numa obra própria é o pintor
  -- que o indica, e pode nem o saber ainda.
  valor_cents bigint check (valor_cents is null or valor_cents >= 0),
  estado text not null default 'ativa' check (estado in ('ativa', 'concluida', 'cancelada')),
  inicio date,
  fim date,
  notas text check (notas is null or length(notas) <= 2000),
  created_at timestamptz not null default now()
);

create index if not exists worksites_org_idx on public.worksites (org_id, estado);

-- Uma obra por contratação, criada no momento em que a contratação aparece.
insert into public.worksites (org_id, engagement_id, nome, valor_cents)
select e.painter_org_id, e.id, coalesce('Obra ' || l.ref, 'Obra da plataforma'), e.base_cents
from public.engagements e
left join public.request_listings l on l.request_id = e.request_id
on conflict (engagement_id) do nothing;

create or replace function private.worksite_org(p_worksite uuid) returns uuid
language sql security definer stable set search_path = '' as $$
  select org_id from public.worksites where id = p_worksite
$$;

-- Dono da obra: quem a pode gerir. O cliente de uma contratação continua a ver o que lhe diz respeito
-- (as adendas), através do engagement_id da obra.
create or replace function private.worksite_client(p_worksite uuid) returns uuid
language sql security definer stable set search_path = '' as $$
  select e.client_org_id from public.worksites w
  join public.engagements e on e.id = w.engagement_id
  where w.id = p_worksite
$$;

-- Trocar a chave das tabelas filhas: worksite_id passa a mandar, engagement_id sai.
alter table public.worksite_members add column if not exists worksite_id uuid references public.worksites (id) on delete cascade;
alter table public.worksite_phases add column if not exists worksite_id uuid references public.worksites (id) on delete cascade;
alter table public.worksite_entries add column if not exists worksite_id uuid references public.worksites (id) on delete cascade;
alter table public.worksite_addenda add column if not exists worksite_id uuid references public.worksites (id) on delete cascade;

update public.worksite_members m set worksite_id = w.id from public.worksites w where w.engagement_id = m.engagement_id and m.worksite_id is null;
update public.worksite_phases p set worksite_id = w.id from public.worksites w where w.engagement_id = p.engagement_id and p.worksite_id is null;
update public.worksite_entries x set worksite_id = w.id from public.worksites w where w.engagement_id = x.engagement_id and x.worksite_id is null;
update public.worksite_addenda a set worksite_id = w.id from public.worksites w where w.engagement_id = a.engagement_id and a.worksite_id is null;

delete from public.worksite_members where worksite_id is null;
delete from public.worksite_phases where worksite_id is null;
delete from public.worksite_entries where worksite_id is null;
delete from public.worksite_addenda where worksite_id is null;

alter table public.worksite_members alter column worksite_id set not null;
alter table public.worksite_phases alter column worksite_id set not null;
alter table public.worksite_entries alter column worksite_id set not null;
alter table public.worksite_addenda alter column worksite_id set not null;

drop trigger if exists worksite_members_painter on public.worksite_members;
drop trigger if exists worksite_phases_painter on public.worksite_phases;
drop trigger if exists worksite_entries_painter on public.worksite_entries;
drop trigger if exists worksite_addenda_painter on public.worksite_addenda;

create or replace function private.worksite_owner() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  new.painter_org_id := private.worksite_org(new.worksite_id);
  return new;
end $$;

create trigger worksite_members_owner before insert or update on public.worksite_members
  for each row execute function private.worksite_owner();
create trigger worksite_phases_owner before insert or update on public.worksite_phases
  for each row execute function private.worksite_owner();
create trigger worksite_entries_owner before insert or update on public.worksite_entries
  for each row execute function private.worksite_owner();
create trigger worksite_addenda_owner before insert or update on public.worksite_addenda
  for each row execute function private.worksite_owner();

-- As políticas antigas apontam para engagement_id, por isso saem antes de a coluna sair — senão o
-- Postgres recusa-se a largar a coluna por haver objectos que dependem dela.
drop policy if exists worksite_members_select on public.worksite_members;
drop policy if exists worksite_members_insert on public.worksite_members;
drop policy if exists worksite_members_update on public.worksite_members;
drop policy if exists worksite_members_delete on public.worksite_members;
drop policy if exists worksite_phases_select on public.worksite_phases;
drop policy if exists worksite_phases_insert on public.worksite_phases;
drop policy if exists worksite_phases_update on public.worksite_phases;
drop policy if exists worksite_phases_delete on public.worksite_phases;
drop policy if exists worksite_entries_select on public.worksite_entries;
drop policy if exists worksite_entries_insert on public.worksite_entries;
drop policy if exists worksite_entries_update on public.worksite_entries;
drop policy if exists worksite_entries_delete on public.worksite_entries;
drop policy if exists worksite_addenda_select on public.worksite_addenda;
drop policy if exists worksite_addenda_insert on public.worksite_addenda;
drop policy if exists worksite_addenda_update_painter on public.worksite_addenda;
drop policy if exists worksite_addenda_update_client on public.worksite_addenda;
drop index if exists public.worksite_members_engagement_idx;
drop index if exists public.worksite_phases_engagement_idx;
drop index if exists public.worksite_entries_engagement_idx;
drop index if exists public.worksite_addenda_engagement_idx;

alter table public.worksite_members drop column if exists engagement_id;
alter table public.worksite_phases drop column if exists engagement_id;
alter table public.worksite_entries drop column if exists engagement_id;
alter table public.worksite_addenda drop column if exists engagement_id;

create index if not exists worksite_members_worksite_idx on public.worksite_members (worksite_id);
create index if not exists worksite_phases_worksite_idx on public.worksite_phases (worksite_id);
create index if not exists worksite_entries_worksite_idx on public.worksite_entries (worksite_id, tipo);
create index if not exists worksite_addenda_worksite_idx on public.worksite_addenda (worksite_id, criada_em);

alter table public.worksites enable row level security;
revoke all on public.worksites from anon;

drop policy if exists worksites_select on public.worksites;
create policy worksites_select on public.worksites for select to authenticated
  using (
    private.has_role(org_id, array['proprietario', 'gestor', 'financeiro', 'leitor']::public.member_role[])
    or (engagement_id is not null and private.has_role(private.engagement_client(engagement_id), array['proprietario', 'gestor', 'financeiro', 'leitor']::public.member_role[]))
  );

-- Criar uma obra própria: qualquer gestor da empresa, e sem contratação associada — uma obra da
-- plataforma nasce da contratação, nunca de um formulário (CLAUDE.md, regra 10).
drop policy if exists worksites_insert on public.worksites;
create policy worksites_insert on public.worksites for insert to authenticated
  with check (engagement_id is null and private.can_manage_org(org_id));

drop policy if exists worksites_update on public.worksites;
create policy worksites_update on public.worksites for update to authenticated
  using (private.can_manage_org(org_id))
  with check (private.can_manage_org(org_id) and engagement_id is not distinct from (select engagement_id from public.worksites w2 where w2.id = worksites.id));

drop policy if exists worksites_delete on public.worksites;
create policy worksites_delete on public.worksites for delete to authenticated
  using (engagement_id is null and private.can_manage_org(org_id));

-- Políticas das filhas, agora pela obra.
drop policy if exists worksite_members_select on public.worksite_members;
drop policy if exists worksite_members_insert on public.worksite_members;
drop policy if exists worksite_members_update on public.worksite_members;
drop policy if exists worksite_members_delete on public.worksite_members;
create policy worksite_members_select on public.worksite_members for select to authenticated
  using (private.has_role(painter_org_id, array['proprietario', 'gestor', 'financeiro', 'leitor']::public.member_role[]));
create policy worksite_members_insert on public.worksite_members for insert to authenticated
  with check (private.can_manage_org(private.worksite_org(worksite_id)));
create policy worksite_members_update on public.worksite_members for update to authenticated
  using (private.can_manage_org(private.worksite_org(worksite_id)))
  with check (private.can_manage_org(private.worksite_org(worksite_id)));
create policy worksite_members_delete on public.worksite_members for delete to authenticated
  using (private.can_manage_org(private.worksite_org(worksite_id)));

drop policy if exists worksite_phases_select on public.worksite_phases;
drop policy if exists worksite_phases_insert on public.worksite_phases;
drop policy if exists worksite_phases_update on public.worksite_phases;
drop policy if exists worksite_phases_delete on public.worksite_phases;
create policy worksite_phases_select on public.worksite_phases for select to authenticated
  using (private.has_role(painter_org_id, array['proprietario', 'gestor', 'financeiro', 'leitor']::public.member_role[]));
create policy worksite_phases_insert on public.worksite_phases for insert to authenticated
  with check (private.can_manage_org(private.worksite_org(worksite_id)));
create policy worksite_phases_update on public.worksite_phases for update to authenticated
  using (private.can_manage_org(private.worksite_org(worksite_id)))
  with check (private.can_manage_org(private.worksite_org(worksite_id)));
create policy worksite_phases_delete on public.worksite_phases for delete to authenticated
  using (private.can_manage_org(private.worksite_org(worksite_id)));

drop policy if exists worksite_entries_select on public.worksite_entries;
drop policy if exists worksite_entries_insert on public.worksite_entries;
drop policy if exists worksite_entries_update on public.worksite_entries;
drop policy if exists worksite_entries_delete on public.worksite_entries;
create policy worksite_entries_select on public.worksite_entries for select to authenticated
  using (private.has_role(painter_org_id, array['proprietario', 'gestor', 'financeiro', 'leitor']::public.member_role[]));
create policy worksite_entries_insert on public.worksite_entries for insert to authenticated
  with check (private.can_manage_org(private.worksite_org(worksite_id)));
create policy worksite_entries_update on public.worksite_entries for update to authenticated
  using (private.can_manage_org(private.worksite_org(worksite_id)))
  with check (private.can_manage_org(private.worksite_org(worksite_id)));
create policy worksite_entries_delete on public.worksite_entries for delete to authenticated
  using (private.can_manage_org(private.worksite_org(worksite_id)));

-- As adendas continuam a ser respondidas pelo cliente da contratação; numa obra própria não há
-- cliente na plataforma e, por isso, não há quem aceite — o pintor regista-as na mesma, como prova.
drop policy if exists worksite_addenda_select on public.worksite_addenda;
drop policy if exists worksite_addenda_insert on public.worksite_addenda;
drop policy if exists worksite_addenda_update_painter on public.worksite_addenda;
drop policy if exists worksite_addenda_update_client on public.worksite_addenda;
create policy worksite_addenda_select on public.worksite_addenda for select to authenticated
  using (
    private.has_role(painter_org_id, array['proprietario', 'gestor', 'financeiro', 'leitor']::public.member_role[])
    or private.has_role(private.worksite_client(worksite_id), array['proprietario', 'gestor', 'financeiro', 'leitor']::public.member_role[])
  );
create policy worksite_addenda_insert on public.worksite_addenda for insert to authenticated
  with check (estado = 'proposta' and private.can_manage_org(private.worksite_org(worksite_id)));
create policy worksite_addenda_update_painter on public.worksite_addenda for update to authenticated
  using (estado = 'proposta' and private.can_manage_org(private.worksite_org(worksite_id)))
  with check (estado in ('proposta', 'retirada', 'aceite') and private.can_manage_org(private.worksite_org(worksite_id))
              and (estado <> 'aceite' or private.worksite_client(worksite_id) is null));
create policy worksite_addenda_update_client on public.worksite_addenda for update to authenticated
  using (estado = 'proposta' and private.can_manage_org(private.worksite_client(worksite_id)))
  with check (estado in ('aceite', 'recusada') and private.can_manage_org(private.worksite_client(worksite_id)));

-- Consumíveis: o que a empresa gasta em obra e tem de repor. O stock não se guarda — soma-se dos
-- movimentos, para não haver dois números a discordar um do outro.
create table if not exists public.org_consumables (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  nome text not null check (length(btrim(nome)) between 2 and 120),
  unidade text not null default 'un' check (unidade in ('un', 'l', 'kg', 'm', 'm2', 'rolo', 'caixa')),
  -- Abaixo disto, a obra avisa que é altura de repor. Em centésimos da unidade.
  minimo int not null default 0 check (minimo >= 0),
  created_at timestamptz not null default now(),
  unique (org_id, nome)
);

create table if not exists public.consumable_moves (
  id uuid primary key default gen_random_uuid(),
  consumable_id uuid not null references public.org_consumables (id) on delete cascade,
  org_id uuid not null references public.organizations (id) on delete cascade,
  -- Null numa entrada (compra); preenchido quando sai para uma obra.
  worksite_id uuid references public.worksites (id) on delete set null,
  -- Centésimos da unidade, com sinal: positivo entra, negativo sai.
  quantidade int not null check (quantidade <> 0),
  data date not null default (now() at time zone 'Europe/Lisbon')::date,
  nota text check (nota is null or length(nota) <= 300),
  created_at timestamptz not null default now()
);

create index if not exists consumable_moves_consumable_idx on public.consumable_moves (consumable_id, data);
create index if not exists consumable_moves_worksite_idx on public.consumable_moves (worksite_id);

alter table public.org_consumables enable row level security;
alter table public.consumable_moves enable row level security;
revoke all on public.org_consumables, public.consumable_moves from anon;

drop policy if exists org_consumables_all on public.org_consumables;
create policy org_consumables_all on public.org_consumables for all to authenticated
  using (private.has_role(org_id, array['proprietario', 'gestor', 'financeiro', 'leitor']::public.member_role[]))
  with check (private.can_manage_org(org_id));

drop policy if exists consumable_moves_all on public.consumable_moves;
create policy consumable_moves_all on public.consumable_moves for all to authenticated
  using (private.has_role(org_id, array['proprietario', 'gestor', 'financeiro', 'leitor']::public.member_role[]))
  with check (private.can_manage_org(org_id));

comment on table public.worksites is
  'Obra de uma empresa de pintura. Com engagement_id quando veio da plataforma, sem ele quando é obra própria.';

-- Uma contratação nova traz a sua obra, para o pintor não ter de a criar à mão nem haver contratações
-- sem obra. A inserção é feita pelo servidor, com os direitos da função, porque as políticas de
-- `worksites` só deixam criar obras sem contratação.
create or replace function private.worksite_from_engagement() returns trigger
language plpgsql security definer set search_path = '' as $$
declare v_ref text;
begin
  select l.ref into v_ref from public.request_listings l where l.request_id = new.request_id;
  insert into public.worksites (org_id, engagement_id, nome, valor_cents)
  values (new.painter_org_id, new.id, coalesce('Obra ' || v_ref, 'Obra da plataforma'), new.base_cents)
  on conflict (engagement_id) do nothing;
  return new;
end $$;

drop trigger if exists engagements_worksite on public.engagements;
create trigger engagements_worksite after insert on public.engagements
  for each row execute function private.worksite_from_engagement();
