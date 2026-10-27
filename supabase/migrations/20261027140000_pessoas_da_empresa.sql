-- A equipa pertence à empresa, não à obra (25/10/2026, docs/DECISOES.md).
--
-- NOTA DE REGISTO (27/10/2026): esta migração foi aplicada à base por outra via e não ficou no
-- registo do Supabase. Foi re-aplicada nesse dia — é inteiramente idempotente, e os dados não
-- mudaram — e ficou registada como `20261027190517`. **O nome do ficheiro não acompanha essa
-- versão, de propósito**, e é a única excepção à regra do CLAUDE.md: a versão de hoje punha este
-- ficheiro depois de `20261027190000_indice_da_pessoa`, que precisa da coluna `person_id` criada
-- aqui, e uma base construída de raiz pelo repositório deixava de arrancar. O teste das migrações
-- apanhou-o. O nome fica na posição verdadeira da sequência; a base real já estava certa.
--
-- Até aqui, uma pessoa numa obra era uma linha de `worksite_members` com `worksite_id` obrigatório:
-- a mesma pessoa em duas obras eram duas fichas com identificadores diferentes. Isso fazia três
-- estragos ao mesmo tempo.
--
--  1. O limiar das 100 horas anuais de trabalho suplementar é por trabalhador e por ano civil. Com
--     uma ficha por obra, quem andava em três obras nunca lá chegava em nenhuma e o custo saía por
--     baixo.
--  2. O custo por hora tinha de ser escrito outra vez em cada obra, e divergia.
--  3. Não havia "as pessoas da empresa" — só "as pessoas desta obra" —, e sem isso não há o separador
--     de equipa que a proposta de Gestão de Obra pede.
--
-- A partir daqui: `painter_people` é a pessoa, `worksite_members` é a atribuição dela a uma obra.

create table if not exists public.painter_people (
  id uuid primary key default gen_random_uuid(),
  painter_org_id uuid not null references public.organizations (id) on delete cascade,
  nome text not null,
  funcao text not null default 'pintor',
  telefone text,
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists painter_people_org_idx on public.painter_people (painter_org_id);

-- O custo por hora com a data em que passou a valer. Um aumento não reescreve o custo das obras já
-- feitas: cada dia é pago ao que valia nesse dia.
create table if not exists public.painter_person_rates (
  id uuid primary key default gen_random_uuid(),
  person_id uuid not null references public.painter_people (id) on delete cascade,
  desde date not null,
  custo_hora_cents integer not null check (custo_hora_cents >= 0),
  created_at timestamptz not null default now(),
  unique (person_id, desde)
);

create index if not exists painter_person_rates_pessoa_idx on public.painter_person_rates (person_id, desde desc);

alter table public.worksite_members add column if not exists person_id uuid references public.painter_people (id) on delete cascade;

-- Juntar as fichas que já existem, por empresa e por nome. São poucas e nunca houve forma de criar
-- duas pessoas diferentes com o mesmo nome na mesma empresa.
insert into public.painter_people (painter_org_id, nome, funcao, telefone, ativo)
select distinct on (m.painter_org_id, lower(trim(m.nome)))
  m.painter_org_id, trim(m.nome), m.funcao, m.telefone, m.ativo
from public.worksite_members m
where not exists (
  select 1 from public.painter_people p
  where p.painter_org_id = m.painter_org_id and lower(trim(p.nome)) = lower(trim(m.nome))
)
order by m.painter_org_id, lower(trim(m.nome)), m.created_at desc;

update public.worksite_members m
set person_id = p.id
from public.painter_people p
where m.person_id is null
  and p.painter_org_id = m.painter_org_id
  and lower(trim(p.nome)) = lower(trim(m.nome));

-- O custo por hora que existia passa a ser o primeiro valor da pessoa, a valer desde sempre.
insert into public.painter_person_rates (person_id, desde, custo_hora_cents)
select distinct on (m.person_id) m.person_id, date '2000-01-01', m.custo_hora_cents
from public.worksite_members m
where m.person_id is not null and m.custo_hora_cents is not null
  and not exists (select 1 from public.painter_person_rates r where r.person_id = m.person_id)
order by m.person_id, m.created_at desc;

alter table public.painter_people enable row level security;
alter table public.painter_person_rates enable row level security;

-- As pessoas são da empresa: vê-as e mexe-lhes quem é membro dela. O custo por hora é salário, e por
-- isso nunca sai daqui para o lado do cliente (CLAUDE.md, regra 13, e a mesma lógica).
drop policy if exists painter_people_select on public.painter_people;
create policy painter_people_select on public.painter_people
  for select to authenticated
  using (exists (select 1 from public.org_members m where m.org_id = painter_people.painter_org_id and m.user_id = (select auth.uid())));

drop policy if exists painter_people_insert on public.painter_people;
create policy painter_people_insert on public.painter_people
  for insert to authenticated
  with check (exists (select 1 from public.org_members m where m.org_id = painter_people.painter_org_id and m.user_id = (select auth.uid())));

drop policy if exists painter_people_update on public.painter_people;
create policy painter_people_update on public.painter_people
  for update to authenticated
  using (exists (select 1 from public.org_members m where m.org_id = painter_people.painter_org_id and m.user_id = (select auth.uid())))
  with check (exists (select 1 from public.org_members m where m.org_id = painter_people.painter_org_id and m.user_id = (select auth.uid())));

drop policy if exists painter_people_delete on public.painter_people;
create policy painter_people_delete on public.painter_people
  for delete to authenticated
  using (exists (select 1 from public.org_members m where m.org_id = painter_people.painter_org_id and m.user_id = (select auth.uid())));

drop policy if exists painter_person_rates_select on public.painter_person_rates;
create policy painter_person_rates_select on public.painter_person_rates
  for select to authenticated
  using (exists (
    select 1 from public.painter_people p
    join public.org_members m on m.org_id = p.painter_org_id
    where p.id = painter_person_rates.person_id and m.user_id = (select auth.uid())));

drop policy if exists painter_person_rates_insert on public.painter_person_rates;
create policy painter_person_rates_insert on public.painter_person_rates
  for insert to authenticated
  with check (exists (
    select 1 from public.painter_people p
    join public.org_members m on m.org_id = p.painter_org_id
    where p.id = painter_person_rates.person_id and m.user_id = (select auth.uid())));

drop policy if exists painter_person_rates_delete on public.painter_person_rates;
create policy painter_person_rates_delete on public.painter_person_rates
  for delete to authenticated
  using (exists (
    select 1 from public.painter_people p
    join public.org_members m on m.org_id = p.painter_org_id
    where p.id = painter_person_rates.person_id and m.user_id = (select auth.uid())));

comment on table public.painter_people is
  'As pessoas da empresa de pintura. worksite_members passa a ser a atribuicao de uma pessoa a uma obra.';
comment on table public.painter_person_rates is
  'Custo por hora de cada pessoa, com a data em que passou a valer. Um aumento nao reescreve obras passadas.';
