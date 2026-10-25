-- Mapa de Contratos Públicos (25/10/2026, docs/DECISOES.md).
--
-- Mede-se nos próprios dados: em 2026 houve 482 empreitadas de pintura, fachadas e isolamento; 68%
-- foram por ajuste directo ou consulta prévia, que ninguém anuncia, e em 58% desses convites foi
-- chamada uma empresa só. Listar concursos abertos entrega pouco; dizer ao pintor quem contrata
-- pintura à volta dele, e quem costuma ser convidado, entrega o que ele não consegue saber sozinho.
--
-- Fonte: "Contratos Públicos — Portal Base — IMPIC", dados.gov.pt, domínio público, semanal. É um
-- ficheiro feito para ser descarregado por máquinas — não se lê o portal BASE por meios automáticos,
-- que o robots.txt dele proíbe.

create table if not exists public.public_contracts (
  id uuid primary key default gen_random_uuid(),
  -- O identificador do contrato no portal BASE. Único: cada carga actualiza em vez de duplicar.
  id_contrato text not null unique,
  ano smallint not null,
  objecto text not null,
  entidade_nif text,
  entidade_nome text not null,
  procedimento text not null,
  -- Ajuste directo ou consulta prévia: os que não são anunciados a ninguém.
  por_convite boolean not null,
  preco_cents bigint not null,
  distrito text,
  concelho text,
  data_celebracao date,
  adjudicatario_nif text,
  adjudicatario_nome text,
  -- As empresas convidadas, como o BASE as publica: [{"nif": "...", "nome": "..."}].
  convidados jsonb not null default '[]'::jsonb,
  n_convidados smallint not null default 0,
  cpv text[] not null default '{}',
  -- Como foi reconhecido como sendo de pintura, para se poder auditar a classificação depois.
  via text not null,
  confianca text not null,
  carregado_em timestamptz not null default now()
);

alter table public.public_contracts drop constraint if exists public_contracts_via_check;
alter table public.public_contracts
  add constraint public_contracts_via_check check (via in ('cpv', 'objecto', 'ambos'));

alter table public.public_contracts drop constraint if exists public_contracts_confianca_check;
alter table public.public_contracts
  add constraint public_contracts_confianca_check check (confianca in ('alta', 'media'));

alter table public.public_contracts drop constraint if exists public_contracts_preco_check;
alter table public.public_contracts
  add constraint public_contracts_preco_check check (preco_cents >= 0);

alter table public.public_contracts drop constraint if exists public_contracts_convidados_check;
alter table public.public_contracts
  add constraint public_contracts_convidados_check
  check (n_convidados >= 0 and jsonb_typeof(convidados) = 'array');

create index if not exists public_contracts_distrito_idx on public.public_contracts (distrito);
create index if not exists public_contracts_entidade_idx on public.public_contracts (entidade_nif);
create index if not exists public_contracts_ano_idx on public.public_contracts (ano);
create index if not exists public_contracts_convite_idx on public.public_contracts (por_convite);

alter table public.public_contracts enable row level security;

-- Um contrato público é público: qualquer conta autenticada o vê. O plano Pro decide-se no ecrã, e
-- não aqui — fechar dados do Estado na base de dados seria fingir uma exclusividade que não existe.
drop policy if exists public_contracts_select on public.public_contracts;
create policy public_contracts_select on public.public_contracts
  for select to authenticated using (true);

-- Escrever é só da equipa da plataforma. O carregamento semanal corre com a chave de serviço, que
-- não passa por estas políticas; esta existe para o caso de alguém mexer pelo backoffice.
drop policy if exists public_contracts_insert on public.public_contracts;
create policy public_contracts_insert on public.public_contracts
  for insert to authenticated
  with check (exists (select 1 from public.platform_admins a where a.user_id = (select auth.uid())));

drop policy if exists public_contracts_update on public.public_contracts;
create policy public_contracts_update on public.public_contracts
  for update to authenticated
  using (exists (select 1 from public.platform_admins a where a.user_id = (select auth.uid())))
  with check (exists (select 1 from public.platform_admins a where a.user_id = (select auth.uid())));

drop policy if exists public_contracts_delete on public.public_contracts;
create policy public_contracts_delete on public.public_contracts
  for delete to authenticated
  using (exists (select 1 from public.platform_admins a where a.user_id = (select auth.uid())));

comment on table public.public_contracts is
  'Contratos de empreitada de pintura, fachadas e isolamento, do portal BASE via dados.gov.pt. Classificação em src/domain/contratosPublicos.ts.';

-- Quando correu a última carga de cada ano, para a tarefa semanal saber o que já tem.
create table if not exists public.public_contracts_loads (
  ano smallint primary key,
  contratos integer not null default 0,
  corrida_em timestamptz not null default now(),
  origem text
);

alter table public.public_contracts_loads enable row level security;

drop policy if exists public_contracts_loads_select on public.public_contracts_loads;
create policy public_contracts_loads_select on public.public_contracts_loads
  for select to authenticated using (true);
