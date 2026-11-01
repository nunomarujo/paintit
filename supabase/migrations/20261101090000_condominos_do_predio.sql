-- Condóminos com acesso a um prédio (decisão do promotor, 01/11/2026).
--
-- A administradora trata de tudo, mas quer que os condóminos de **um** prédio acompanhem o processo:
-- vejam onde está o pedido, vejam as propostas quando abrirem, e votem — um voto indicativo, para o
-- administrador levar à assembleia já com o sentido do prédio, a que o gestor pode juntar a
-- permilagem da fração para a contagem valer em permilagem além de em cabeças.
--
-- O condómino **não é membro da entidade**: `org_members` dá acesso à entidade inteira e, numa
-- gestora, a todos os condomínios que ela gere. Aqui o acesso é a um prédio, e só a esse. Por isso há
-- uma tabela própria, `building_residents`, e as políticas de leitura dos pedidos e das propostas
-- ganham um ramo para ela — estreito: só pedidos já publicados, só propostas depois da abertura
-- simultânea (a mesma regra que vale para o próprio cliente; o condómino nunca vê antes dele).
--
-- Entrada: cada prédio pode ter um código (QR ou link). Quem o abre vê o prédio, escreve a fração, o
-- andar, o email e o telemóvel, e recebe no email o link de entrada. Na primeira sessão a linha fica
-- ligada ao utilizador pelo email (`reclamar_acesso_de_condomino`). O gestor também pode registar
-- condóminos à mão, com a permilagem; o condómino só consegue entrar se o email coincidir.
--
-- Catálogo: o condómino pode consultar as fichas e os preços de referência, mas **nunca os
-- descontos** dos fornecedores. `supplier_discounts` era legível por qualquer utilizador autenticado;
-- passa a exigir pertença a alguma entidade. Um condómino não pertence a nenhuma.

-- ── Tabelas ───────────────────────────────────────────────────────────────────────────────────────

create table public.building_residents (
  id uuid primary key default gen_random_uuid(),
  building_id uuid not null references public.buildings (id) on delete cascade,
  -- Denormalizado do prédio, para as políticas do gestor não precisarem de um join.
  org_id uuid not null references public.organizations (id) on delete cascade,
  -- Nulo até a pessoa entrar pela primeira vez com este email.
  user_id uuid references auth.users (id) on delete set null,
  email text not null check (position('@' in email) > 1),
  nome text not null default '',
  telemovel text not null default '',
  fracao text not null check (length(btrim(fracao)) > 0),
  andar text not null default '',
  -- ‰ da fração, registada pelo gestor. Nula enquanto não a registar.
  permilagem integer check (permilagem is null or (permilagem between 1 and 1000)),
  -- Nulo quando se registou pelo código do prédio; o gestor quando o registou à mão.
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  revoked_at timestamptz,
  constraint building_residents_same_org foreign key (building_id, org_id)
    references public.buildings (id, org_id) on delete cascade
);
create unique index building_residents_email_idx on public.building_residents (building_id, lower(email));
create index building_residents_user_idx on public.building_residents (user_id) where user_id is not null;
create trigger building_residents_touch before update on public.building_residents
  for each row execute function private.touch_updated_at();

comment on table public.building_residents is
  'Condóminos com acesso a um prédio: veem o pedido publicado, as propostas depois da abertura e votam. '
  'Não são membros da entidade; o acesso é ao prédio e só a ele.';

create table public.building_access_codes (
  building_id uuid primary key references public.buildings (id) on delete cascade,
  org_id uuid not null references public.organizations (id) on delete cascade,
  codigo text not null unique check (codigo ~ '^[a-z0-9]{10}$'),
  created_by uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  revoked_at timestamptz
);

create table public.proposal_votes (
  request_id uuid not null references public.work_requests (id) on delete cascade,
  resident_id uuid not null references public.building_residents (id) on delete cascade,
  proposal_id uuid not null references public.proposals (id) on delete cascade,
  updated_at timestamptz not null default now(),
  primary key (request_id, resident_id)
);
create index proposal_votes_proposal_idx on public.proposal_votes (proposal_id);

alter table public.building_residents enable row level security;
alter table public.building_access_codes enable row level security;
alter table public.proposal_votes enable row level security;

revoke all on public.building_residents, public.building_access_codes, public.proposal_votes from anon;

-- ── Quem é condómino de quê ─────────────────────────────────────────────────────────────────────

create or replace function private.is_resident_of_building(p_building uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.building_residents r
    where r.building_id = p_building and r.user_id = (select auth.uid()) and r.revoked_at is null
  );
$$;

create or replace function private.is_resident_of_org(p_org uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.building_residents r
    where r.org_id = p_org and r.user_id = (select auth.uid()) and r.revoked_at is null
  );
$$;

-- Só pedidos que já saíram de rascunho: o que o administrador ainda prepara não é do prédio.
create or replace function private.is_resident_of_request(p_request uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.work_requests w
    where w.id = p_request and w.status <> 'rascunho' and private.is_resident_of_building(w.building_id)
  );
$$;

-- Alguma entidade? Os descontos dos fornecedores passam a exigir isto.
create or replace function private.has_any_org() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.org_members m where m.user_id = (select auth.uid()))
      or private.is_platform_admin();
$$;

revoke all on function private.is_resident_of_building(uuid), private.is_resident_of_org(uuid),
  private.is_resident_of_request(uuid), private.has_any_org() from public, anon;
grant execute on function private.is_resident_of_building(uuid), private.is_resident_of_org(uuid),
  private.is_resident_of_request(uuid), private.has_any_org() to authenticated;

-- ── Políticas das tabelas novas ─────────────────────────────────────────────────────────────────

-- O gestor vê e gere todos os condóminos do prédio; cada condómino vê só a sua linha.
create policy building_residents_select on public.building_residents for select to authenticated
  using (private.can_manage_org(org_id) or user_id = (select auth.uid()));
create policy building_residents_insert on public.building_residents for insert to authenticated
  with check (private.can_manage_org(org_id) and created_by = (select auth.uid()));
create policy building_residents_update on public.building_residents for update to authenticated
  using (private.can_manage_org(org_id)) with check (private.can_manage_org(org_id));
create policy building_residents_delete on public.building_residents for delete to authenticated
  using (private.can_manage_org(org_id));

create policy building_access_codes_select on public.building_access_codes for select to authenticated
  using (private.can_manage_org(org_id));
create policy building_access_codes_insert on public.building_access_codes for insert to authenticated
  with check (private.can_manage_org(org_id) and created_by = (select auth.uid()));
create policy building_access_codes_update on public.building_access_codes for update to authenticated
  using (private.can_manage_org(org_id)) with check (private.can_manage_org(org_id));

-- Votos: o gestor lê a contagem; o condómino lê o seu. Escreve-se só pela função `votar`.
create policy proposal_votes_select on public.proposal_votes for select to authenticated
  using (
    private.can_manage_org(private.request_org(request_id))
    or exists (select 1 from public.building_residents r where r.id = resident_id and r.user_id = (select auth.uid()))
  );

-- ── O que o condómino passa a ver ───────────────────────────────────────────────────────────────
-- Cada política parte da sua versão em vigor (levantamento_por_vendedor, fornecedor_ve_pintor,
-- entrega_simultanea, subscricao_fornecedores) e ganha o ramo do condómino. Nada do que já lá estava sai.

alter policy work_requests_select on public.work_requests using (
  private.can_access_org(org_id) or private.request_revealed_to_me(id) or private.can_access_as_surveyor(id)
  or private.is_resident_of_request(id)
);

alter policy buildings_select on public.buildings using (
  private.can_access_org(org_id)
  or exists (select 1 from public.work_requests r where r.building_id = buildings.id and private.request_revealed_to_me(r.id))
  or exists (select 1 from public.work_requests wr where wr.building_id = buildings.id and private.can_access_as_surveyor(wr.id))
  or private.is_resident_of_building(id)
);

alter policy request_surfaces_select on public.request_surfaces using (
  private.can_access_org(private.request_org(request_id))
  or (
    private.is_painter()
    and exists (select 1 from public.request_listings l where l.request_id = request_surfaces.request_id and l.aberto)
  )
  or private.request_revealed_to_me(request_id)
  or private.can_access_as_surveyor(request_id)
  or private.is_resident_of_request(request_id)
);

alter policy organizations_select on public.organizations
  using (
    private.can_access_org(id) or created_by = (select auth.uid()) or private.org_revealed_to_me(id)
    or kind = 'fornecedor' or private.ordered_from_me(id)
    or private.is_resident_of_org(id)
  );

-- A regra da abertura simultânea é a mesma do cliente: antes dela ninguém do lado do prédio vê nada.
alter policy proposals_select on public.proposals
  using (
    private.can_access_org(painter_org_id)
    or (
      status <> 'rascunho'
      and (private.can_access_org(private.request_org(request_id)) or private.is_resident_of_request(request_id))
      and private.propostas_entregues(request_id)
    )
  );

create or replace function private.proposal_visible(p_proposal uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.proposals p
    where p.id = p_proposal
      and (
        private.can_access_org(p.painter_org_id)
        or (
          p.status <> 'rascunho'
          and (private.can_access_org(private.request_org(p.request_id)) or private.is_resident_of_request(p.request_id))
          and private.propostas_entregues(p.request_id)
        )
      )
  );
$$;

-- Descontos: a regra de sempre (desconto geral visível a quem tem entidade; o dirigido a um pintor, a esse
-- pintor e ao fornecedor), mais a condição de pertencer a alguma entidade. O condómino não pertence a
-- nenhuma: consulta preços de referência, não descontos.
alter policy supplier_discounts_select on public.supplier_discounts
  using (
    private.has_any_org()
    and (painter_org_id is null or private.can_access_org(painter_org_id) or private.can_access_org(org_id))
  );

-- ── Entrada pelo código do prédio ───────────────────────────────────────────────────────────────

-- Quem abre o QR ainda não tem conta: a função corre como `anon` e devolve só o que a página precisa
-- para a pessoa confirmar que é o prédio certo. Nada de morada.
create or replace function public.predio_por_codigo(p_codigo text)
returns table (nome_interno text, concelho text, condominio text)
language sql stable security definer set search_path = '' as $$
  select b.nome_interno, b.concelho, o.nome
  from public.building_access_codes c
  join public.buildings b on b.id = c.building_id
  join public.organizations o on o.id = b.org_id
  where c.codigo = lower(btrim(p_codigo)) and c.revoked_at is null;
$$;
revoke all on function public.predio_por_codigo(text) from public;
grant execute on function public.predio_por_codigo(text) to anon, authenticated;

-- Regista (ou completa) o condómino. Se o gestor já tinha a fração com este email, só acrescenta o
-- que faltava — a permilagem que o gestor pôs nunca é tocada daqui.
create or replace function public.registar_condomino(
  p_codigo text, p_fracao text, p_andar text, p_email text, p_telemovel text, p_nome text
) returns void
language plpgsql security definer set search_path = '' as $$
declare
  c public.building_access_codes;
begin
  select * into c from public.building_access_codes where codigo = lower(btrim(p_codigo)) and revoked_at is null;
  if c.building_id is null then raise exception 'código inválido' using errcode = 'P0001'; end if;
  if length(btrim(p_fracao)) = 0 then raise exception 'fração em falta' using errcode = 'P0001'; end if;
  if length(regexp_replace(coalesce(p_telemovel, ''), '\D', '', 'g')) < 9 then
    raise exception 'telemóvel em falta' using errcode = 'P0001';
  end if;
  if position('@' in coalesce(p_email, '')) <= 1 then raise exception 'email em falta' using errcode = 'P0001'; end if;

  insert into public.building_residents (building_id, org_id, email, nome, telemovel, fracao, andar)
  values (c.building_id, c.org_id, lower(btrim(p_email)), btrim(coalesce(p_nome, '')), btrim(p_telemovel), btrim(p_fracao), btrim(coalesce(p_andar, '')))
  on conflict (building_id, lower(email)) do update
    set nome = case when public.building_residents.nome = '' then excluded.nome else public.building_residents.nome end,
        telemovel = case when public.building_residents.telemovel = '' then excluded.telemovel else public.building_residents.telemovel end,
        andar = case when public.building_residents.andar = '' then excluded.andar else public.building_residents.andar end,
        revoked_at = public.building_residents.revoked_at;
end $$;
revoke all on function public.registar_condomino(text, text, text, text, text, text) from public;
grant execute on function public.registar_condomino(text, text, text, text, text, text) to anon, authenticated;

-- Na primeira sessão, liga as linhas com o email desta pessoa. Devolve quantas ligou.
create or replace function public.reclamar_acesso_de_condomino() returns integer
language plpgsql security definer set search_path = '' as $$
declare
  n integer;
begin
  if (select auth.uid()) is null then return 0; end if;
  update public.building_residents
    set user_id = (select auth.uid())
    where user_id is null and revoked_at is null and lower(email) = private.current_email();
  get diagnostics n = row_count;
  return n;
end $$;
revoke all on function public.reclamar_acesso_de_condomino() from public, anon;
grant execute on function public.reclamar_acesso_de_condomino() to authenticated;

-- ── O voto ──────────────────────────────────────────────────────────────────────────────────────

-- Um voto por fração e por pedido, alterável enquanto o pedido estiver publicado e sem proposta
-- escolhida. Só depois da abertura: antes dela a proposta nem é visível, e a função recusa na mesma.
create or replace function public.votar(p_request uuid, p_proposal uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  r public.building_residents;
  w public.work_requests;
begin
  select * into w from public.work_requests where id = p_request;
  if w.id is null or w.status <> 'publicado' then raise exception 'a votação está fechada' using errcode = 'P0001'; end if;
  select * into r from public.building_residents
    where building_id = w.building_id and user_id = (select auth.uid()) and revoked_at is null limit 1;
  if r.id is null then raise exception 'sem acesso a este prédio' using errcode = 'P0001'; end if;
  if not private.propostas_entregues(p_request) then raise exception 'as propostas ainda não abriram' using errcode = 'P0001'; end if;
  if not exists (select 1 from public.proposals p where p.id = p_proposal and p.request_id = p_request and p.status in ('submetida')) then
    raise exception 'proposta inválida' using errcode = 'P0001';
  end if;
  if exists (select 1 from public.proposals p where p.request_id = p_request and p.status = 'selecionada') then
    raise exception 'a votação está fechada' using errcode = 'P0001';
  end if;
  insert into public.proposal_votes (request_id, resident_id, proposal_id)
  values (p_request, r.id, p_proposal)
  on conflict (request_id, resident_id) do update set proposal_id = excluded.proposal_id, updated_at = now();
end $$;
revoke all on function public.votar(uuid, uuid) from public, anon;
grant execute on function public.votar(uuid, uuid) to authenticated;
