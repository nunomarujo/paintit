-- Paint it — fase 4: contratação.
-- Uma contratação nasce quando o cliente escolhe uma proposta. A base de dados
-- guarda só os acontecimentos (quem fez o quê, quando e com que montante); o
-- estado reconstrói-se em src/domain/contracting.ts a partir de engagement.ts.
-- Cada tipo de acontecimento só pode ser registado por quem o pode fazer, e as
-- confirmações do parceiro de pagamentos só pela equipa da plataforma.
-- A identidade e os contactos das partes são revelados quando a comissão do
-- pintor é confirmada, e só para esta obra (PIN-22).

alter type public.proposal_status add value if not exists 'falhada';

create type public.engagement_event_kind as enum (
  'deposito_confirmado', 'cliente_assinou', 'fee_recebido', 'pintor_assinou', 'cliente_desistiu',
  'litigio_aberto', 'litigio_resolvido', 'transitar', 'encerrar_sem_contrato'
);

create table public.engagements (
  id uuid primary key default gen_random_uuid(),
  proposal_id uuid not null unique references public.proposals (id) on delete restrict,
  request_id uuid not null references public.work_requests (id) on delete restrict,
  client_org_id uuid not null references public.organizations (id) on delete restrict,
  painter_org_id uuid not null references public.organizations (id) on delete restrict,
  base_cents bigint not null check (base_cents > 0),
  advance_cents bigint not null check (advance_cents >= 0),
  -- Versão de src/domain/rules.ts aplicada; nunca muda depois de criada.
  rules_version text not null,
  -- Contratação anterior do mesmo pedido cujos valores transitaram para esta.
  carried_from uuid unique references public.engagements (id),
  created_at timestamptz not null default now()
);
create index engagements_request_idx on public.engagements (request_id);
create index engagements_client_idx on public.engagements (client_org_id);
create index engagements_painter_idx on public.engagements (painter_org_id);

create table public.engagement_events (
  id uuid primary key default gen_random_uuid(),
  engagement_id uuid not null references public.engagements (id) on delete restrict,
  kind public.engagement_event_kind not null,
  amount_cents bigint check (amount_cents >= 0),
  payload jsonb not null default '{}',
  -- Marca a apresentação: a partir daqui as partes veem-se.
  reveal boolean not null default false,
  actor uuid not null default auth.uid() references auth.users (id),
  at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index engagement_events_engagement_idx on public.engagement_events (engagement_id, at);
create index engagement_events_actor_idx on public.engagement_events (actor);
create index engagement_events_reveal_idx on public.engagement_events (engagement_id) where reveal;

-- Igual a CURRENT_RULES.version em src/domain/rules.ts (há um teste que o confirma).
create function private.current_rules_version() returns text
language sql immutable set search_path = '' as $$ select '2026-10-18' $$;

create function private.engagement_client(p_engagement uuid) returns uuid
language sql stable security definer set search_path = '' as $$
  select client_org_id from public.engagements where id = p_engagement;
$$;

create function private.engagement_painter(p_engagement uuid) returns uuid
language sql stable security definer set search_path = '' as $$
  select painter_org_id from public.engagements where id = p_engagement;
$$;

-- O utilizador está do lado do pintor numa contratação já apresentada deste pedido.
create function private.request_revealed_to_me(p_request uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.engagements e
    where e.request_id = p_request
      and private.can_access_org(e.painter_org_id)
      and exists (select 1 from public.engagement_events v where v.engagement_id = e.id and v.reveal)
  );
$$;

-- A organização é a contraparte de uma contratação já apresentada.
create function private.org_revealed_to_me(p_org uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.engagements e
    where exists (select 1 from public.engagement_events v where v.engagement_id = e.id and v.reveal)
      and (
        (e.client_org_id = p_org and private.can_access_org(e.painter_org_id))
        or (e.painter_org_id = p_org and private.can_access_org(e.client_org_id))
      )
  );
$$;

-- Escolha → contratação. Se o pedido teve uma contratação que falhou e cujos
-- valores transitam, a nova fica ligada a ela.
create function private.proposal_selected() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  previous uuid;
begin
  if new.status = 'selecionada' and old.status is distinct from 'selecionada' then
    select e.id into previous
    from public.engagements e
    where e.request_id = new.request_id
      and exists (select 1 from public.engagement_events v where v.engagement_id = e.id and v.kind = 'transitar')
      and not exists (select 1 from public.engagements n where n.carried_from = e.id)
    order by e.created_at desc
    limit 1;
    insert into public.engagements (
      proposal_id, request_id, client_org_id, painter_org_id, base_cents, advance_cents, rules_version, carried_from
    ) values (
      new.id, new.request_id, private.request_org(new.request_id), new.painter_org_id, new.base_cents,
      -- Igual a percentOf() em src/domain/money.ts: metade para cima.
      (new.base_cents * new.adiantamento_bps + 5000) / 10000,
      private.current_rules_version(), previous
    );
  end if;
  return new;
end $$;

create trigger proposals_selected after update on public.proposals
  for each row execute function private.proposal_selected();

-- A hora de um acontecimento é a do registo. Só a equipa da plataforma indica
-- outra (a hora a que o parceiro de pagamentos recebeu o dinheiro), nunca futura.
create function private.engagement_event_time() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if not private.is_platform_admin() or new.at > now() then
    new.at := now();
  end if;
  new.created_at := now();
  return new;
end $$;

create trigger engagement_events_time before insert on public.engagement_events
  for each row execute function private.engagement_event_time();

-- Estados novos da proposta: falhada (o pintor não cumpriu e os valores
-- transitaram) e a escolha de uma proposta anteriormente não selecionada.
create or replace function private.proposal_transition() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  l public.request_listings%rowtype;
begin
  if new.request_id <> old.request_id or new.painter_org_id <> old.painter_org_id then
    raise exception 'A proposta não muda de pedido nem de pintor.' using errcode = 'P0001';
  end if;

  if old.status = new.status then
    if old.status <> 'rascunho' then
      raise exception 'Uma proposta % não pode ser alterada.', old.status using errcode = 'P0001';
    end if;
    if not private.can_manage_org(new.painter_org_id) then
      raise exception 'Só o pintor altera a sua proposta.' using errcode = 'P0001';
    end if;
    return new;
  end if;

  if new.status = 'falhada' then
    if old.status <> 'selecionada'
       or not private.can_manage_org(private.request_org(new.request_id))
       or not exists (
         select 1 from public.engagements e join public.engagement_events v on v.engagement_id = e.id
         where e.proposal_id = new.id and v.kind = 'transitar'
       ) then
      raise exception 'Só uma proposta escolhida cujo pintor falhou passa a falhada.' using errcode = 'P0001';
    end if;
    return new;
  end if;

  if new.status in ('selecionada', 'nao_selecionada') then
    -- Só quem gere o pedido escolhe (via public.select_proposal ou public.reselect_proposal).
    if not private.can_manage_org(private.request_org(new.request_id))
       or not (
         old.status = 'submetida'
         or (old.status = 'nao_selecionada' and new.status = 'selecionada'
             and exists (select 1 from public.proposals f where f.request_id = new.request_id and f.status = 'falhada'))
       ) then
      raise exception 'Só o cliente escolhe entre propostas submetidas.' using errcode = 'P0001';
    end if;
    if new.status = 'selecionada' then new.selected_at := now(); end if;
    return new;
  end if;

  if not private.can_manage_org(new.painter_org_id) then
    raise exception 'Só o pintor altera o estado da sua proposta.' using errcode = 'P0001';
  end if;

  if old.status = 'rascunho' and new.status = 'submetida' then
    select * into l from public.request_listings where request_id = new.request_id;
    if not found or not l.aberto then
      raise exception 'O pedido já não aceita propostas.' using errcode = 'P0001';
    end if;
    if new.validade is null or new.validade < (now() at time zone 'Europe/Lisbon')::date then
      raise exception 'Indique uma validade futura.' using errcode = 'P0001';
    end if;
    if new.duracao_dias is null then
      raise exception 'Indique a duração estimada.' using errcode = 'P0001';
    end if;
    select coalesce(sum(total_cents), 0) into new.base_cents
      from public.proposal_lines where proposal_id = new.id and inclusao = 'incluido';
    if new.base_cents <= 0 then
      raise exception 'Inclua no preço pelo menos uma linha com valor.' using errcode = 'P0001';
    end if;
    new.iva_cents := round(new.base_cents::numeric * new.iva_bps / 10000);
    new.request_version := l.version;
    new.submitted_at := now();
    new.pintor_verificado := exists (
      select 1 from public.org_documents d where d.org_id = new.painter_org_id and d.status = 'aprovado'
    );
    return new;
  end if;

  if old.status = 'submetida' and new.status = 'retirada' then
    return new;
  end if;

  if old.status = 'submetida' and new.status = 'rascunho' then
    new.version := old.version + 1;
    new.base_cents := null;
    new.iva_cents := null;
    new.submitted_at := null;
    return new;
  end if;

  raise exception 'Transição inválida: % para %.', old.status, new.status using errcode = 'P0001';
end $$;

-- O pintor escolhido falhou e os valores transitaram: o cliente escolhe outra
-- das propostas que tinham ficado de fora.
create function public.reselect_proposal(p_proposal uuid) returns void
language plpgsql security invoker set search_path = '' as $$
declare
  p public.proposals%rowtype;
  current_version int;
begin
  select * into p from public.proposals where id = p_proposal for update;
  if not found or not private.can_manage_org(private.request_org(p.request_id)) then
    raise exception 'Proposta não encontrada.' using errcode = 'P0001';
  end if;
  if p.status <> 'nao_selecionada' then
    raise exception 'Escolha uma das propostas que ficaram de fora.' using errcode = 'P0001';
  end if;
  if p.validade < (now() at time zone 'Europe/Lisbon')::date then
    raise exception 'A proposta expirou: peça ao pintor que a reconfirme.' using errcode = 'P0001';
  end if;
  select version into current_version from public.work_requests where id = p.request_id;
  if p.request_version is distinct from current_version then
    raise exception 'A proposta responde a uma versão anterior do pedido.' using errcode = 'P0001';
  end if;
  update public.proposals set status = 'falhada' where request_id = p.request_id and status = 'selecionada';
  update public.proposals set status = 'selecionada' where id = p_proposal;
end $$;

revoke all on function private.current_rules_version(), private.engagement_client(uuid), private.engagement_painter(uuid),
  private.request_revealed_to_me(uuid), private.org_revealed_to_me(uuid), private.proposal_selected(),
  private.engagement_event_time(), public.reselect_proposal(uuid) from public, anon;
grant execute on function private.current_rules_version(), private.engagement_client(uuid), private.engagement_painter(uuid),
  private.request_revealed_to_me(uuid), private.org_revealed_to_me(uuid), public.reselect_proposal(uuid) to authenticated;

-- RLS -------------------------------------------------------------------------

alter table public.engagements enable row level security;
alter table public.engagement_events enable row level security;
revoke all on public.engagements, public.engagement_events from anon;
-- As contratações só são criadas pelo gatilho; os acontecimentos nunca se alteram.
revoke insert, update, delete on public.engagements from authenticated;
revoke update, delete on public.engagement_events from authenticated;

create policy engagements_select on public.engagements for select to authenticated
  using (private.can_access_org(client_org_id) or private.can_access_org(painter_org_id));

create policy engagement_events_select on public.engagement_events for select to authenticated
  using (
    private.can_access_org(private.engagement_client(engagement_id))
    or private.can_access_org(private.engagement_painter(engagement_id))
  );
create policy engagement_events_insert on public.engagement_events for insert to authenticated
  with check (
    actor = (select auth.uid())
    and (
      private.is_platform_admin()
      or (
        not reveal and amount_cents is null
        and (
          (kind in ('cliente_assinou', 'cliente_desistiu', 'transitar', 'encerrar_sem_contrato', 'litigio_aberto')
            and private.can_manage_org(private.engagement_client(engagement_id)))
          or (kind in ('pintor_assinou', 'litigio_aberto')
            and private.can_manage_org(private.engagement_painter(engagement_id)))
        )
      )
    )
  );

-- Apresentação: cada parte passa a ver a outra, o pedido, o prédio e as fotografias desta obra.
alter policy organizations_select on public.organizations
  using (private.can_access_org(id) or created_by = (select auth.uid()) or private.org_revealed_to_me(id));
alter policy work_requests_select on public.work_requests
  using (private.can_access_org(org_id) or private.request_revealed_to_me(id));
alter policy buildings_select on public.buildings
  using (
    private.can_access_org(org_id)
    or exists (
      select 1 from public.work_requests r
      where r.building_id = buildings.id and private.request_revealed_to_me(r.id)
    )
  );
alter policy request_surfaces_select on public.request_surfaces
  using (
    private.can_access_org(private.request_org(request_id))
    or (
      private.is_painter()
      and exists (select 1 from public.request_listings l where l.request_id = request_surfaces.request_id and l.aberto)
    )
    or private.request_revealed_to_me(request_id)
  );
alter policy request_photos_select on public.request_photos
  using (
    private.can_access_org(private.request_org(request_id))
    or private.photo_visible_to_painter(storage_path)
    or private.request_revealed_to_me(request_id)
  );
alter policy fotos_select on storage.objects
  using (
    bucket_id = 'fotos'
    and (
      private.can_access_org(private.request_org(private.org_from_path(name)))
      or private.photo_visible_to_painter(name)
      or private.request_revealed_to_me(private.org_from_path(name))
    )
  );
