-- Paint it — complementos: versões das propostas (PIN-18), convites da equipa
-- da plataforma a pintores (ADM-07), avaliações depois da assinatura (CLI-28,
-- PIN-29) e avisos na aplicação.

-- Versões das propostas -----------------------------------------------------------
-- Cada submissão fica guardada tal como foi: rever não apaga a anterior.

create table public.proposal_versions (
  id uuid primary key default gen_random_uuid(),
  proposal_id uuid not null references public.proposals (id) on delete cascade,
  version int not null,
  snapshot jsonb not null,
  submitted_at timestamptz not null default now(),
  unique (proposal_id, version)
);

create function private.proposal_snapshot() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.status = 'submetida' and old.status = 'rascunho' then
    insert into public.proposal_versions (proposal_id, version, snapshot)
    values (
      new.id, new.version,
      jsonb_build_object(
        'proposal', to_jsonb(new) - 'created_by',
        'lines', coalesce((select jsonb_agg(to_jsonb(l) order by l.created_at) from public.proposal_lines l where l.proposal_id = new.id), '[]')
      )
    )
    on conflict (proposal_id, version) do update set snapshot = excluded.snapshot, submitted_at = now();
  end if;
  return new;
end $$;

create trigger proposals_snapshot after update on public.proposals
  for each row execute function private.proposal_snapshot();

alter table public.proposal_versions enable row level security;
revoke all on public.proposal_versions from anon;
revoke insert, update, delete on public.proposal_versions from authenticated;
create policy proposal_versions_select on public.proposal_versions for select to authenticated
  using (private.proposal_visible(proposal_id));

-- Convites a pintores -------------------------------------------------------------

create table public.listing_invites (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.work_requests (id) on delete cascade,
  painter_org_id uuid not null references public.organizations (id) on delete cascade,
  invited_by uuid not null default auth.uid() references auth.users (id),
  created_at timestamptz not null default now(),
  unique (request_id, painter_org_id)
);
create index listing_invites_painter_idx on public.listing_invites (painter_org_id);
create index listing_invites_invited_by_idx on public.listing_invites (invited_by);

alter table public.listing_invites enable row level security;
revoke all on public.listing_invites from anon;
revoke update on public.listing_invites from authenticated;
create policy listing_invites_select on public.listing_invites for select to authenticated
  using (private.can_access_org(painter_org_id));
create policy listing_invites_insert on public.listing_invites for insert to authenticated
  with check (
    private.is_platform_admin()
    and invited_by = (select auth.uid())
    and private.is_painter_org(painter_org_id)
    and private.listing_open(request_id)
  );
create policy listing_invites_delete on public.listing_invites for delete to authenticated
  using (private.is_platform_admin());

-- Avaliações ----------------------------------------------------------------------
-- O cliente avalia depois de o contrato estar assinado; pode atualizar. O pintor
-- responde, mas não apaga nem altera a avaliação.

create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  engagement_id uuid not null unique references public.engagements (id) on delete restrict,
  painter_org_id uuid not null references public.organizations (id) on delete restrict,
  qualidade smallint not null check (qualidade between 1 and 5),
  prazo smallint not null check (prazo between 1 and 5),
  comunicacao smallint not null check (comunicacao between 1 and 5),
  comentario text not null default '' check (length(comentario) <= 2000),
  resposta text check (resposta is null or length(resposta) <= 2000),
  resposta_at timestamptz,
  created_by uuid not null default auth.uid() references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index reviews_painter_idx on public.reviews (painter_org_id);
create index reviews_created_by_idx on public.reviews (created_by);

create function private.engagement_signed(p_engagement uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.engagement_events where engagement_id = p_engagement and kind = 'pintor_assinou');
$$;

create function private.review_guard() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    new.painter_org_id := private.engagement_painter(new.engagement_id);
    new.resposta := null;
    new.resposta_at := null;
    return new;
  end if;
  new.updated_at := now();
  if private.can_manage_org(private.engagement_client(new.engagement_id)) then
    -- O cliente atualiza a avaliação, não a resposta.
    new.resposta := old.resposta;
    new.resposta_at := old.resposta_at;
  else
    -- O pintor só responde.
    if (new.qualidade, new.prazo, new.comunicacao, new.comentario) is distinct from
       (old.qualidade, old.prazo, old.comunicacao, old.comentario) then
      raise exception 'O pintor responde, mas não altera a avaliação.' using errcode = 'P0001';
    end if;
    new.resposta_at := now();
  end if;
  new.engagement_id := old.engagement_id;
  new.painter_org_id := old.painter_org_id;
  new.created_by := old.created_by;
  return new;
end $$;

create trigger reviews_guard before insert or update on public.reviews
  for each row execute function private.review_guard();

-- Média e número de avaliações de um pintor, para o comparador (sem revelar quem é).
create function public.painter_rating(p_proposal uuid) returns table (n int, media numeric)
language sql stable security definer set search_path = '' as $$
  select count(*)::int, round(avg((r.qualidade + r.prazo + r.comunicacao) / 3.0), 1)
  from public.reviews r
  where private.proposal_visible(p_proposal)
    and r.painter_org_id = (select painter_org_id from public.proposals where id = p_proposal);
$$;

alter table public.reviews enable row level security;
revoke all on public.reviews from anon;
revoke delete on public.reviews from authenticated;
create policy reviews_select on public.reviews for select to authenticated
  using (
    private.can_access_org(painter_org_id)
    or private.can_access_org(private.engagement_client(engagement_id))
  );
create policy reviews_insert on public.reviews for insert to authenticated
  with check (
    created_by = (select auth.uid())
    and private.can_manage_org(private.engagement_client(engagement_id))
    and private.engagement_signed(engagement_id)
  );
create policy reviews_update on public.reviews for update to authenticated
  using (private.can_manage_org(private.engagement_client(engagement_id)) or private.can_manage_org(painter_org_id))
  with check (private.can_manage_org(private.engagement_client(engagement_id)) or private.can_manage_org(painter_org_id));

-- Avisos --------------------------------------------------------------------------
-- Criados pela base de dados quando algo muda; cada entidade vê os seus.

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  texto text not null,
  link text not null,
  lida_em timestamptz,
  created_at timestamptz not null default now()
);
create index notifications_org_idx on public.notifications (org_id, created_at desc);

create function private.notify(p_org uuid, p_texto text, p_link text) returns void
language sql security definer set search_path = '' as $$
  insert into public.notifications (org_id, texto, link) values (p_org, p_texto, p_link);
$$;

create function private.notify_proposal() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.status = old.status then return new; end if;
  if new.status = 'submetida' then
    perform private.notify(private.request_org(new.request_id), 'Recebeu uma proposta nova.', '/app/pedidos/' || new.request_id || '/propostas');
  elsif new.status = 'selecionada' then
    perform private.notify(new.painter_org_id, 'A sua proposta foi escolhida.', '/app/oportunidades/' || new.request_id);
  elsif new.status = 'nao_selecionada' then
    perform private.notify(new.painter_org_id, 'O cliente escolheu outra proposta.', '/app/oportunidades/' || new.request_id);
  end if;
  return new;
end $$;

create trigger proposals_notify after update on public.proposals
  for each row execute function private.notify_proposal();

create function private.notify_message() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.lado = 'pintor' then
    perform private.notify(private.proposal_client(new.proposal_id), 'Nova mensagem de um pintor.', '/app/pedidos/' || new.request_id || '/propostas');
  else
    perform private.notify(private.proposal_painter(new.proposal_id), 'Nova mensagem do cliente.', '/app/oportunidades/' || new.request_id);
  end if;
  return new;
end $$;

create trigger proposal_messages_notify after insert on public.proposal_messages
  for each row execute function private.notify_message();

create function private.notify_engagement_event() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  e public.engagements%rowtype;
  link text;
begin
  select * into e from public.engagements where id = new.engagement_id;
  link := '/app/contratacoes/' || e.id;
  case new.kind
    when 'deposito_confirmado' then
      perform private.notify(e.client_org_id, 'Depósito confirmado: pode assinar a minuta.', link);
    when 'cliente_assinou' then
      perform private.notify(e.painter_org_id, 'Ganhou uma obra: pague a comissão em 8 dias para assinar.', link);
    when 'fee_recebido' then
      perform private.notify(e.painter_org_id, 'Comissão recebida: já pode ver o cliente e assinar.', link);
      perform private.notify(e.client_org_id, 'O pintor pagou a comissão: já pode ver os dados dele.', link);
    when 'pintor_assinou' then
      perform private.notify(e.client_org_id, 'Contrato assinado pelas duas partes.', link);
    when 'cliente_desistiu' then
      perform private.notify(e.painter_org_id, 'O cliente desistiu da contratação.', link);
    when 'litigio_aberto' then
      perform private.notify(e.client_org_id, 'Foi aberto um litígio.', link);
      perform private.notify(e.painter_org_id, 'Foi aberto um litígio.', link);
    when 'litigio_resolvido' then
      perform private.notify(e.client_org_id, 'O litígio foi resolvido.', link);
      perform private.notify(e.painter_org_id, 'O litígio foi resolvido.', link);
    else
      null;
  end case;
  return new;
end $$;

create trigger engagement_events_notify after insert on public.engagement_events
  for each row execute function private.notify_engagement_event();

create function private.notify_invite() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  perform private.notify(new.painter_org_id, 'Foi convidado a orçamentar um pedido.', '/app/oportunidades/' || new.request_id);
  return new;
end $$;

create trigger listing_invites_notify after insert on public.listing_invites
  for each row execute function private.notify_invite();

alter table public.notifications enable row level security;
revoke all on public.notifications from anon;
revoke insert, delete on public.notifications from authenticated;
-- Só se marca como lida.
revoke update on public.notifications from authenticated;
grant update (lida_em) on public.notifications to authenticated;
create policy notifications_select on public.notifications for select to authenticated
  using (private.has_role(org_id, array['proprietario', 'gestor', 'financeiro', 'leitor']::public.member_role[]));
create policy notifications_update on public.notifications for update to authenticated
  using (private.has_role(org_id, array['proprietario', 'gestor', 'financeiro', 'leitor']::public.member_role[]))
  with check (private.has_role(org_id, array['proprietario', 'gestor', 'financeiro', 'leitor']::public.member_role[]));

revoke all on function private.proposal_snapshot(), private.engagement_signed(uuid), private.review_guard(),
  public.painter_rating(uuid), private.notify(uuid, text, text), private.notify_proposal(), private.notify_message(),
  private.notify_engagement_event(), private.notify_invite() from public, anon;
grant execute on function private.engagement_signed(uuid), public.painter_rating(uuid) to authenticated;
