-- Paint it — fase 3: propostas, linhas técnicas, mensagens e escolha.
-- O pintor só vê as próprias propostas. O cliente vê as propostas submetidas
-- aos seus pedidos, sem saber quem as fez (a identidade só é revelada na
-- apresentação, fase 4). A escolha passa por uma função que verifica quem
-- escolhe e fecha o pedido.

create type public.proposal_status as enum ('rascunho', 'submetida', 'retirada', 'selecionada', 'nao_selecionada');
create type public.line_category as enum ('preparacao', 'reparacao', 'pintura', 'acessos', 'outro');
create type public.line_unit as enum ('m2', 'ml', 'un', 'vg');
create type public.line_inclusion as enum ('incluido', 'opcional', 'condicionado');
create type public.message_side as enum ('cliente', 'pintor');

create table public.proposals (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.work_requests (id) on delete cascade,
  painter_org_id uuid not null references public.organizations (id) on delete cascade,
  status public.proposal_status not null default 'rascunho',
  -- Versão do pedido a que responde (PRO-01), fixada na submissão.
  request_version int,
  version int not null default 1,
  iva_bps int not null default 2300 check (iva_bps in (600, 1300, 2300)),
  validade date,
  inicio_possivel date,
  duracao_dias int check (duracao_dias between 1 and 730),
  adiantamento_bps int not null default 0 check (adiantamento_bps between 0 and 3000),
  preco_ajuste_m2_cents int check (preco_ajuste_m2_cents >= 0),
  garantia_anos int check (garantia_anos between 0 and 10),
  exclusoes text not null default '',
  notas text not null default '',
  -- Fixados na submissão a partir das linhas: igual a proposalTotals() em src/domain/proposal.ts.
  base_cents bigint,
  iva_cents bigint,
  -- O pintor tinha documentos aprovados quando submeteu (o cliente vê isto, não o nome).
  pintor_verificado boolean,
  submitted_at timestamptz,
  selected_at timestamptz,
  created_by uuid not null default auth.uid() references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (request_id, painter_org_id)
);
create index proposals_painter_org_idx on public.proposals (painter_org_id);
create index proposals_created_by_idx on public.proposals (created_by);
create unique index proposals_one_selected on public.proposals (request_id) where status = 'selecionada';

create table public.proposal_lines (
  id uuid primary key default gen_random_uuid(),
  proposal_id uuid not null references public.proposals (id) on delete cascade,
  categoria public.line_category not null,
  descricao text not null check (length(btrim(descricao)) > 0 and length(descricao) <= 500),
  superficie public.surface_kind,
  quantidade int not null check (quantidade > 0),
  unidade public.line_unit not null default 'm2',
  preco_unitario_cents int not null check (preco_unitario_cents >= 0),
  -- Igual a lineTotal() em src/domain/proposal.ts.
  total_cents bigint generated always as (round(quantidade::numeric * preco_unitario_cents / 100)) stored,
  demaos smallint check (demaos between 1 and 5),
  produto text check (produto is null or length(produto) <= 200),
  inclusao public.line_inclusion not null default 'incluido',
  created_at timestamptz not null default now()
);
create index proposal_lines_proposal_idx on public.proposal_lines (proposal_id);

create table public.proposal_messages (
  id uuid primary key default gen_random_uuid(),
  proposal_id uuid not null references public.proposals (id) on delete cascade,
  lado public.message_side not null,
  texto text not null check (length(btrim(texto)) between 1 and 2000),
  autor uuid not null default auth.uid() references auth.users (id),
  created_at timestamptz not null default now()
);
create index proposal_messages_proposal_idx on public.proposal_messages (proposal_id, created_at);
create index proposal_messages_autor_idx on public.proposal_messages (autor);

create trigger proposals_touch before update on public.proposals
  for each row execute function private.touch_updated_at();

-- Funções de acesso ------------------------------------------------------------

create function private.proposal_painter(p_proposal uuid) returns uuid
language sql stable security definer set search_path = '' as $$
  select painter_org_id from public.proposals where id = p_proposal;
$$;

create function private.proposal_client(p_proposal uuid) returns uuid
language sql stable security definer set search_path = '' as $$
  select r.org_id from public.proposals p join public.work_requests r on r.id = p.request_id where p.id = p_proposal;
$$;

create function private.proposal_visible(p_proposal uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.proposals p
    where p.id = p_proposal
      and (
        private.can_access_org(p.painter_org_id)
        or (p.status <> 'rascunho' and private.can_access_org(private.request_org(p.request_id)))
      )
  );
$$;

create function private.proposal_is_draft(p_proposal uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.proposals where id = p_proposal and status = 'rascunho');
$$;

create function private.is_painter_org(p_org uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.organizations where id = p_org and kind = 'pintor');
$$;

create function private.listing_open(p_request uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.request_listings where request_id = p_request and aberto);
$$;

-- Estados da proposta ----------------------------------------------------------

create function private.proposal_transition() returns trigger
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

  if new.status in ('selecionada', 'nao_selecionada') then
    -- Só quem gere o pedido escolhe (via public.select_proposal).
    if old.status <> 'submetida' or not private.can_manage_org(private.request_org(new.request_id)) then
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

create trigger proposals_transition before update on public.proposals
  for each row execute function private.proposal_transition();

-- Escolha do cliente: fixa a proposta, as outras ficam não selecionadas e o
-- pedido deixa de receber propostas (PRO-11, CLI-17).
create function public.select_proposal(p_proposal uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  p public.proposals%rowtype;
  current_version int;
begin
  select * into p from public.proposals where id = p_proposal for update;
  if not found or not private.can_manage_org(private.request_org(p.request_id)) then
    raise exception 'Proposta não encontrada.' using errcode = 'P0001';
  end if;
  if p.status <> 'submetida' then
    raise exception 'Só se escolhe uma proposta submetida.' using errcode = 'P0001';
  end if;
  if p.validade < (now() at time zone 'Europe/Lisbon')::date then
    raise exception 'A proposta expirou: peça ao pintor que a reconfirme.' using errcode = 'P0001';
  end if;
  select version into current_version from public.work_requests where id = p.request_id;
  if p.request_version is distinct from current_version then
    raise exception 'A proposta responde a uma versão anterior do pedido: peça ao pintor que a reveja.' using errcode = 'P0001';
  end if;
  if exists (select 1 from public.proposals where request_id = p.request_id and status = 'selecionada') then
    raise exception 'Já foi escolhida uma proposta para este pedido.' using errcode = 'P0001';
  end if;

  update public.proposals set status = 'selecionada' where id = p_proposal;
  update public.proposals set status = 'nao_selecionada' where request_id = p.request_id and status = 'submetida';
  update public.work_requests set status = 'encerrado' where id = p.request_id and status = 'publicado';
end $$;

revoke all on function private.proposal_painter(uuid), private.proposal_client(uuid), private.proposal_visible(uuid),
  private.proposal_is_draft(uuid), private.is_painter_org(uuid), private.listing_open(uuid),
  private.proposal_transition(), public.select_proposal(uuid) from public, anon;
grant execute on function private.proposal_painter(uuid), private.proposal_client(uuid), private.proposal_visible(uuid),
  private.proposal_is_draft(uuid), private.is_painter_org(uuid), private.listing_open(uuid),
  public.select_proposal(uuid) to authenticated;

-- RLS -------------------------------------------------------------------------

alter table public.proposals enable row level security;
alter table public.proposal_lines enable row level security;
alter table public.proposal_messages enable row level security;
revoke all on public.proposals, public.proposal_lines, public.proposal_messages from anon;
revoke update, delete on public.proposal_messages from authenticated;

create policy proposals_select on public.proposals for select to authenticated
  using (
    private.can_access_org(painter_org_id)
    or (status <> 'rascunho' and private.can_access_org(private.request_org(request_id)))
  );
create policy proposals_insert on public.proposals for insert to authenticated
  with check (
    private.can_manage_org(painter_org_id)
    and private.is_painter_org(painter_org_id)
    and private.listing_open(request_id)
    and status = 'rascunho'
    and created_by = (select auth.uid())
  );
create policy proposals_update on public.proposals for update to authenticated
  using (private.can_manage_org(painter_org_id) or private.can_manage_org(private.request_org(request_id)))
  with check (private.can_manage_org(painter_org_id) or private.can_manage_org(private.request_org(request_id)));
create policy proposals_delete on public.proposals for delete to authenticated
  using (private.can_manage_org(painter_org_id) and status = 'rascunho');

create policy proposal_lines_select on public.proposal_lines for select to authenticated
  using (private.proposal_visible(proposal_id));
create policy proposal_lines_insert on public.proposal_lines for insert to authenticated
  with check (private.can_manage_org(private.proposal_painter(proposal_id)) and private.proposal_is_draft(proposal_id));
create policy proposal_lines_update on public.proposal_lines for update to authenticated
  using (private.can_manage_org(private.proposal_painter(proposal_id)) and private.proposal_is_draft(proposal_id))
  with check (private.can_manage_org(private.proposal_painter(proposal_id)) and private.proposal_is_draft(proposal_id));
create policy proposal_lines_delete on public.proposal_lines for delete to authenticated
  using (private.can_manage_org(private.proposal_painter(proposal_id)) and private.proposal_is_draft(proposal_id));

-- O cliente vê as perguntas do pintor mesmo antes de a proposta ser submetida.
create policy proposal_messages_select on public.proposal_messages for select to authenticated
  using (
    private.can_access_org(private.proposal_painter(proposal_id))
    or private.can_access_org(private.proposal_client(proposal_id))
  );
create policy proposal_messages_insert on public.proposal_messages for insert to authenticated
  with check (
    autor = (select auth.uid())
    and (
      (lado = 'pintor' and private.can_manage_org(private.proposal_painter(proposal_id)))
      or (lado = 'cliente' and private.can_manage_org(private.proposal_client(proposal_id)))
    )
  );
