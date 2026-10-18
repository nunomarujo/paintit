-- Paint it — fase 2: pedidos de orçamento, superfícies e anúncios anónimos.
-- O pedido (work_requests) só é visível à entidade. Ao publicar, um gatilho
-- copia os campos públicos para request_listings, que é o que os pintores leem:
-- sem morada, sem identidade, sem o título interno.

create type public.request_status as enum ('rascunho', 'publicado', 'encerrado', 'cancelado');
create type public.work_type as enum ('fachadas', 'zonas_comuns', 'muros', 'moradia', 'interior');
create type public.surface_kind as enum (
  'fachada', 'empena', 'varandas', 'muro', 'escadas_atrio', 'beirais_cobertura',
  'elementos_metalicos', 'paredes_interiores', 'tetos', 'outro'
);
create type public.area_source as enum ('estimativa', 'medicao_cliente', 'planta');

create table public.work_requests (
  id uuid primary key default gen_random_uuid(),
  -- Referência anónima mostrada aos pintores (não deriva de nada identificável).
  ref text not null unique default upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8)),
  org_id uuid not null references public.organizations (id) on delete cascade,
  building_id uuid not null,
  status public.request_status not null default 'rascunho',
  -- Nome interno, só para a entidade (pode conter a morada).
  titulo text not null check (length(btrim(titulo)) > 0),
  tipo_obra public.work_type not null,
  descricao text not null default '',
  trabalhos text[] not null default '{}' check (
    trabalhos <@ array['lavagem', 'reparacao_fissuras', 'tratamento_humidade', 'primario', 'pintura',
      'impermeabilizacao', 'tratamento_metais']
  ),
  cor_acabamento text,
  prazo_propostas date,
  execucao_desde date,
  execucao_ate date,
  published_at timestamptz,
  version int not null default 1,
  created_by uuid not null default auth.uid() references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint work_requests_building_same_org foreign key (building_id, org_id)
    references public.buildings (id, org_id) on delete cascade,
  constraint work_requests_execucao check (execucao_ate is null or execucao_desde is null or execucao_ate >= execucao_desde)
);
create index work_requests_org_id_idx on public.work_requests (org_id);
create index work_requests_building_org_idx on public.work_requests (building_id, org_id);
create index work_requests_created_by_idx on public.work_requests (created_by);

create table public.request_surfaces (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.work_requests (id) on delete cascade,
  kind public.surface_kind not null,
  descricao text,
  -- Áreas em centésimos de m²; comprimentos em centímetros.
  area_direta_cm2 int check (area_direta_cm2 > 0),
  largura_cm int check (largura_cm > 0),
  altura_cm int check (altura_cm > 0),
  vaos_cm2 int check (vaos_cm2 >= 0),
  quantidade int not null default 1 check (quantidade between 1 and 500),
  -- Igual a surfaceArea() em src/domain/request.ts.
  area_cm2 int generated always as (
    case
      when area_direta_cm2 is not null then area_direta_cm2 * quantidade
      when largura_cm is not null and altura_cm is not null
        then greatest(0, round(largura_cm::numeric * altura_cm / 100)::int - coalesce(vaos_cm2, 0)) * quantidade
      else 0
    end
  ) stored,
  origem public.area_source not null default 'estimativa',
  created_at timestamptz not null default now(),
  constraint request_surfaces_measured check (area_direta_cm2 is not null or (largura_cm is not null and altura_cm is not null))
);
create index request_surfaces_request_id_idx on public.request_surfaces (request_id);

-- Anúncio anónimo: cópia dos campos públicos no momento da publicação.
create table public.request_listings (
  request_id uuid primary key references public.work_requests (id) on delete cascade,
  ref text not null,
  aberto boolean not null default true,
  tipo_obra public.work_type not null,
  descricao text not null,
  trabalhos text[] not null,
  cor_acabamento text,
  prazo_propostas date not null,
  execucao_desde date,
  execucao_ate date,
  concelho text not null,
  tipo_imovel public.building_kind not null,
  pisos smallint,
  fachadas smallint,
  tem_varandas boolean not null,
  area_total_cm2 int not null,
  published_at timestamptz not null,
  version int not null
);
create index request_listings_aberto_idx on public.request_listings (aberto, prazo_propostas);

create trigger work_requests_touch before update on public.work_requests
  for each row execute function private.touch_updated_at();

-- Utilizador é membro de uma entidade de pintura.
create function private.is_painter() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.org_members m join public.organizations o on o.id = m.org_id
    where m.user_id = (select auth.uid()) and o.kind = 'pintor'
  );
$$;

create function private.request_org(p_request uuid) returns uuid
language sql stable security definer set search_path = '' as $$
  select org_id from public.work_requests where id = p_request;
$$;

create function private.request_is_draft(p_request uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.work_requests where id = p_request and status = 'rascunho');
$$;

-- Transições de estado e publicação. Um pedido publicado não se altera: volta
-- a rascunho (nova versão) ou é encerrado/cancelado.
create function private.work_request_transition() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  b public.buildings%rowtype;
  total int;
begin
  if old.status = new.status then
    if old.status <> 'rascunho' then
      raise exception 'Um pedido % não pode ser alterado.', old.status using errcode = 'P0001';
    end if;
    return new;
  end if;

  if not (
    (old.status = 'rascunho' and new.status in ('publicado', 'cancelado'))
    or (old.status = 'publicado' and new.status in ('rascunho', 'encerrado', 'cancelado'))
  ) then
    raise exception 'Transição inválida: % para %.', old.status, new.status using errcode = 'P0001';
  end if;

  if new.status = 'publicado' then
    select coalesce(sum(area_cm2), 0) into total from public.request_surfaces where request_id = new.id;
    if total <= 0 then raise exception 'Indique pelo menos uma superfície com área.' using errcode = 'P0001'; end if;
    if length(btrim(new.descricao)) < 30 then raise exception 'Descrição demasiado curta.' using errcode = 'P0001'; end if;
    if new.prazo_propostas is null or new.prazo_propostas < (now() at time zone 'Europe/Lisbon')::date + 7 then
      raise exception 'O prazo de propostas tem de ser de pelo menos 7 dias.' using errcode = 'P0001';
    end if;
    select * into b from public.buildings where id = new.building_id;
    new.published_at := now();
    insert into public.request_listings (
      request_id, ref, aberto, tipo_obra, descricao, trabalhos, cor_acabamento, prazo_propostas,
      execucao_desde, execucao_ate, concelho, tipo_imovel, pisos, fachadas, tem_varandas,
      area_total_cm2, published_at, version
    ) values (
      new.id, new.ref, true, new.tipo_obra, new.descricao, new.trabalhos, new.cor_acabamento, new.prazo_propostas,
      new.execucao_desde, new.execucao_ate, b.concelho, b.tipo, b.pisos, b.fachadas, b.tem_varandas,
      total, new.published_at, new.version
    )
    on conflict (request_id) do update set
      aberto = true, tipo_obra = excluded.tipo_obra, descricao = excluded.descricao, trabalhos = excluded.trabalhos,
      cor_acabamento = excluded.cor_acabamento, prazo_propostas = excluded.prazo_propostas,
      execucao_desde = excluded.execucao_desde, execucao_ate = excluded.execucao_ate, concelho = excluded.concelho,
      tipo_imovel = excluded.tipo_imovel, pisos = excluded.pisos, fachadas = excluded.fachadas,
      tem_varandas = excluded.tem_varandas, area_total_cm2 = excluded.area_total_cm2,
      published_at = excluded.published_at, version = excluded.version;
  else
    update public.request_listings set aberto = false where request_id = new.id;
    if new.status = 'rascunho' then
      new.version := old.version + 1;
    end if;
  end if;
  return new;
end $$;

create trigger work_requests_transition before update on public.work_requests
  for each row execute function private.work_request_transition();

revoke all on all functions in schema private from public, anon;
grant execute on function private.is_painter(), private.request_org(uuid), private.request_is_draft(uuid)
  to authenticated;

-- RLS -------------------------------------------------------------------------

alter table public.work_requests enable row level security;
alter table public.request_surfaces enable row level security;
alter table public.request_listings enable row level security;
revoke all on public.work_requests, public.request_surfaces, public.request_listings from anon;
-- Os anúncios só são escritos pelo gatilho.
revoke insert, update, delete on public.request_listings from authenticated;

create policy work_requests_select on public.work_requests for select to authenticated
  using (private.can_access_org(org_id));
create policy work_requests_insert on public.work_requests for insert to authenticated
  with check (private.can_manage_org(org_id) and created_by = (select auth.uid()) and status = 'rascunho');
create policy work_requests_update on public.work_requests for update to authenticated
  using (private.can_manage_org(org_id)) with check (private.can_manage_org(org_id));
create policy work_requests_delete on public.work_requests for delete to authenticated
  using (private.can_manage_org(org_id) and status = 'rascunho');

create policy request_surfaces_select on public.request_surfaces for select to authenticated
  using (
    private.can_access_org(private.request_org(request_id))
    or (
      private.is_painter()
      and exists (select 1 from public.request_listings l where l.request_id = request_surfaces.request_id and l.aberto)
    )
  );
create policy request_surfaces_insert on public.request_surfaces for insert to authenticated
  with check (private.can_manage_org(private.request_org(request_id)) and private.request_is_draft(request_id));
create policy request_surfaces_update on public.request_surfaces for update to authenticated
  using (private.can_manage_org(private.request_org(request_id)) and private.request_is_draft(request_id))
  with check (private.can_manage_org(private.request_org(request_id)) and private.request_is_draft(request_id));
create policy request_surfaces_delete on public.request_surfaces for delete to authenticated
  using (private.can_manage_org(private.request_org(request_id)) and private.request_is_draft(request_id));

create policy request_listings_select on public.request_listings for select to authenticated
  using (
    (aberto and private.is_painter())
    or private.can_access_org(private.request_org(request_id))
    or private.is_platform_admin()
  );
