-- Paint it — materiais certificados, descontos e entregas dos fornecedores,
-- encomendas certificadas, avaliações de fornecedores e ferramentas de obra.

-- Produtos: características gerais e preço para pintores -----------------------------

alter table public.products
  add column unidade text not null default 'L' check (unidade in ('L', 'kg')),
  add column descricao text check (descricao is null or length(descricao) <= 2000),
  add column modos_aplicacao text[] not null default '{}',
  add column acabamento text check (acabamento is null or acabamento in ('mate', 'acetinado', 'semibrilho', 'brilhante', 'texturado')),
  add column uso text check (uso is null or uso in ('interior', 'exterior', 'ambos')),
  add column base text check (base is null or base in ('aquosa', 'solvente')),
  add column secagem_horas smallint check (secagem_horas between 0 and 720),
  add column diluicao text check (diluicao is null or length(diluicao) <= 200),
  add column demaos_recomendadas smallint check (demaos_recomendadas between 1 and 5),
  -- Preço de tabela do fornecedor para pintores (antes dos descontos); o preço de
  -- referência existente é o preço de mercado.
  add column preco_fornecedor_cents int check (preco_fornecedor_cents >= 0);
alter table public.products add constraint products_id_org_key unique (id, org_id);

-- Fornecedores são empresas públicas: qualquer conta vê nome e contactos.
alter policy organizations_select on public.organizations
  using (
    private.can_access_org(id) or created_by = (select auth.uid()) or private.org_revealed_to_me(id)
    or kind = 'fornecedor'
  );

-- Descontos --------------------------------------------------------------------------

create table public.supplier_discounts (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  product_id uuid,
  tipo public.product_type,
  min_area_cm2 int check (min_area_cm2 >= 0),
  max_area_cm2 int check (max_area_cm2 > 0),
  desconto_bps int not null check (desconto_bps between 1 and 10000),
  valido_ate date,
  created_by uuid not null default auth.uid() references auth.users (id),
  created_at timestamptz not null default now(),
  constraint supplier_discounts_product_same_org foreign key (product_id, org_id)
    references public.products (id, org_id) on delete cascade,
  constraint supplier_discounts_range check (min_area_cm2 is null or max_area_cm2 is null or max_area_cm2 >= min_area_cm2)
);
create index supplier_discounts_org_idx on public.supplier_discounts (org_id);
create index supplier_discounts_product_org_idx on public.supplier_discounts (product_id, org_id);
create index supplier_discounts_created_by_idx on public.supplier_discounts (created_by);

-- Entregas ---------------------------------------------------------------------------

create table public.supplier_delivery (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  concelhos text[] not null default '{}',
  incluida boolean not null default false,
  custo_cents int check (custo_cents >= 0),
  minimo_cents int check (minimo_cents >= 0),
  condicoes text not null default '' check (length(condicoes) <= 500),
  created_at timestamptz not null default now()
);
create index supplier_delivery_org_idx on public.supplier_delivery (org_id);

alter table public.supplier_discounts enable row level security;
alter table public.supplier_delivery enable row level security;
revoke all on public.supplier_discounts, public.supplier_delivery from anon;

create policy supplier_discounts_select on public.supplier_discounts for select to authenticated using (true);
create policy supplier_discounts_insert on public.supplier_discounts for insert to authenticated
  with check (private.can_manage_org(org_id) and private.is_supplier_org(org_id) and created_by = (select auth.uid()));
create policy supplier_discounts_update on public.supplier_discounts for update to authenticated
  using (private.can_manage_org(org_id)) with check (private.can_manage_org(org_id));
create policy supplier_discounts_delete on public.supplier_discounts for delete to authenticated
  using (private.can_manage_org(org_id));

create policy supplier_delivery_select on public.supplier_delivery for select to authenticated using (true);
create policy supplier_delivery_insert on public.supplier_delivery for insert to authenticated
  with check (private.can_manage_org(org_id) and private.is_supplier_org(org_id));
create policy supplier_delivery_update on public.supplier_delivery for update to authenticated
  using (private.can_manage_org(org_id)) with check (private.can_manage_org(org_id));
create policy supplier_delivery_delete on public.supplier_delivery for delete to authenticated
  using (private.can_manage_org(org_id));

-- Material certificado nas linhas das propostas ----------------------------------------
-- O produto do catálogo e o preço com desconto ficam fixados na linha.

alter table public.proposal_lines
  add column product_id uuid references public.products (id),
  add column preco_fornecedor_cents int check (preco_fornecedor_cents >= 0),
  add column desconto_bps int check (desconto_bps between 0 and 10000);
create index proposal_lines_product_idx on public.proposal_lines (product_id);

-- Encomendas certificadas ----------------------------------------------------------------
-- Depois da assinatura, o pintor encomenda o material do contrato; o fornecedor
-- confirma a venda e a entrega em obra. O cliente vê a confirmação.

create type public.order_status as enum ('pedida', 'confirmada', 'entregue', 'cancelada');

create table public.material_orders (
  id uuid primary key default gen_random_uuid(),
  engagement_id uuid not null references public.engagements (id) on delete restrict,
  product_id uuid not null references public.products (id),
  supplier_org_id uuid not null references public.organizations (id),
  painter_org_id uuid not null references public.organizations (id),
  embalagens int not null check (embalagens between 1 and 100000),
  estado public.order_status not null default 'pedida',
  nota text check (nota is null or length(nota) <= 1000),
  created_by uuid not null default auth.uid() references auth.users (id),
  confirmed_by uuid references auth.users (id),
  confirmed_at timestamptz,
  delivered_at timestamptz,
  created_at timestamptz not null default now()
);
create index material_orders_engagement_idx on public.material_orders (engagement_id);
create index material_orders_supplier_idx on public.material_orders (supplier_org_id);
create index material_orders_painter_idx on public.material_orders (painter_org_id);
create index material_orders_product_idx on public.material_orders (product_id);
create index material_orders_created_by_idx on public.material_orders (created_by);
create index material_orders_confirmed_by_idx on public.material_orders (confirmed_by);

create function private.material_order_guard() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    new.painter_org_id := private.engagement_painter(new.engagement_id);
    new.supplier_org_id := (select org_id from public.products where id = new.product_id);
    new.estado := 'pedida';
    new.confirmed_by := null; new.confirmed_at := null; new.delivered_at := null;
    return new;
  end if;
  if (new.engagement_id, new.product_id, new.supplier_org_id, new.painter_org_id, new.embalagens, new.created_by)
     is distinct from (old.engagement_id, old.product_id, old.supplier_org_id, old.painter_org_id, old.embalagens, old.created_by) then
    raise exception 'A encomenda não se altera; cancele e faça outra.' using errcode = 'P0001';
  end if;
  if new.estado = old.estado then return new; end if;
  if new.estado = 'cancelada' then
    if old.estado <> 'pedida' or not private.can_manage_org(old.painter_org_id) then
      raise exception 'Só o pintor cancela uma encomenda ainda não confirmada.' using errcode = 'P0001';
    end if;
    return new;
  end if;
  if not private.can_manage_org(old.supplier_org_id) then
    raise exception 'Só o fornecedor confirma a venda e a entrega.' using errcode = 'P0001';
  end if;
  if old.estado = 'pedida' and new.estado = 'confirmada' then
    new.confirmed_by := auth.uid(); new.confirmed_at := now();
  elsif old.estado = 'confirmada' and new.estado = 'entregue' then
    new.delivered_at := now();
  else
    raise exception 'Transição inválida: % para %.', old.estado, new.estado using errcode = 'P0001';
  end if;
  return new;
end $$;

create trigger material_orders_guard before insert or update on public.material_orders
  for each row execute function private.material_order_guard();

alter table public.material_orders enable row level security;
revoke all on public.material_orders from anon;
revoke delete on public.material_orders from authenticated;
create policy material_orders_select on public.material_orders for select to authenticated
  using (
    private.can_access_org(painter_org_id)
    or private.can_access_org(supplier_org_id)
    or private.can_access_org(private.engagement_client(engagement_id))
  );
create policy material_orders_insert on public.material_orders for insert to authenticated
  with check (
    created_by = (select auth.uid())
    and private.can_manage_org(private.engagement_painter(engagement_id))
    and private.engagement_signed(engagement_id)
  );
create policy material_orders_update on public.material_orders for update to authenticated
  using (private.can_manage_org(painter_org_id) or private.can_manage_org(supplier_org_id))
  with check (private.can_manage_org(painter_org_id) or private.can_manage_org(supplier_org_id));

-- Avaliações de fornecedores pelos pintores -------------------------------------------

create table public.supplier_reviews (
  id uuid primary key default gen_random_uuid(),
  supplier_org_id uuid not null references public.organizations (id) on delete cascade,
  painter_org_id uuid not null references public.organizations (id) on delete cascade,
  produto smallint not null check (produto between 1 and 5),
  entrega smallint not null check (entrega between 1 and 5),
  atendimento smallint not null check (atendimento between 1 and 5),
  comentario text not null default '' check (length(comentario) <= 2000),
  created_by uuid not null default auth.uid() references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (supplier_org_id, painter_org_id)
);
create index supplier_reviews_painter_idx on public.supplier_reviews (painter_org_id);
create index supplier_reviews_created_by_idx on public.supplier_reviews (created_by);
create trigger supplier_reviews_touch before update on public.supplier_reviews
  for each row execute function private.touch_updated_at();

-- Só avalia quem encomendou a esse fornecedor.
create function private.bought_from(p_painter uuid, p_supplier uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.material_orders
    where painter_org_id = p_painter and supplier_org_id = p_supplier and estado in ('confirmada', 'entregue')
  );
$$;

alter table public.supplier_reviews enable row level security;
revoke all on public.supplier_reviews from anon;
revoke delete on public.supplier_reviews from authenticated;
create policy supplier_reviews_select on public.supplier_reviews for select to authenticated using (true);
create policy supplier_reviews_insert on public.supplier_reviews for insert to authenticated
  with check (
    created_by = (select auth.uid())
    and private.can_manage_org(painter_org_id)
    and private.bought_from(painter_org_id, supplier_org_id)
  );
create policy supplier_reviews_update on public.supplier_reviews for update to authenticated
  using (private.can_manage_org(painter_org_id))
  with check (private.can_manage_org(painter_org_id));

-- Ferramentas de obra (internas do pintor) ------------------------------------------------

create type public.worksite_entry_kind as enum ('custo', 'tranche', 'horas');

create table public.worksite_members (
  id uuid primary key default gen_random_uuid(),
  engagement_id uuid not null references public.engagements (id) on delete cascade,
  painter_org_id uuid not null references public.organizations (id) on delete cascade,
  nome text not null check (length(btrim(nome)) between 1 and 120),
  funcao text not null check (funcao in ('chefe_equipa', 'pintor', 'ajudante', 'subempreiteiro')),
  telefone text check (telefone is null or length(telefone) <= 30),
  custo_hora_cents int check (custo_hora_cents >= 0),
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);
create index worksite_members_engagement_idx on public.worksite_members (engagement_id);
create index worksite_members_painter_idx on public.worksite_members (painter_org_id);

create table public.worksite_phases (
  id uuid primary key default gen_random_uuid(),
  engagement_id uuid not null references public.engagements (id) on delete cascade,
  painter_org_id uuid not null references public.organizations (id) on delete cascade,
  nome text not null check (length(btrim(nome)) between 1 and 120),
  inicio date,
  fim date,
  estado text not null default 'por_iniciar' check (estado in ('por_iniciar', 'em_curso', 'concluida')),
  created_at timestamptz not null default now(),
  constraint worksite_phases_dates check (fim is null or inicio is null or fim >= inicio)
);
create index worksite_phases_engagement_idx on public.worksite_phases (engagement_id);
create index worksite_phases_painter_idx on public.worksite_phases (painter_org_id);

create table public.worksite_entries (
  id uuid primary key default gen_random_uuid(),
  engagement_id uuid not null references public.engagements (id) on delete cascade,
  painter_org_id uuid not null references public.organizations (id) on delete cascade,
  tipo public.worksite_entry_kind not null,
  data date not null default current_date,
  descricao text not null default '' check (length(descricao) <= 500),
  valor_cents bigint check (valor_cents >= 0),
  categoria text,
  prevista date,
  recebida_em date,
  meio text,
  horas int check (horas > 0),
  member_id uuid references public.worksite_members (id) on delete set null,
  created_at timestamptz not null default now(),
  constraint worksite_entries_shape check (
    (tipo = 'custo' and valor_cents is not null and categoria is not null)
    or (tipo = 'tranche' and valor_cents is not null)
    or (tipo = 'horas' and horas is not null)
  )
);
create index worksite_entries_engagement_idx on public.worksite_entries (engagement_id, tipo);
create index worksite_entries_painter_idx on public.worksite_entries (painter_org_id);
create index worksite_entries_member_idx on public.worksite_entries (member_id);

create function private.worksite_painter() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  new.painter_org_id := private.engagement_painter(new.engagement_id);
  return new;
end $$;

create trigger worksite_members_painter before insert or update on public.worksite_members
  for each row execute function private.worksite_painter();
create trigger worksite_phases_painter before insert or update on public.worksite_phases
  for each row execute function private.worksite_painter();
create trigger worksite_entries_painter before insert or update on public.worksite_entries
  for each row execute function private.worksite_painter();

alter table public.worksite_members enable row level security;
alter table public.worksite_phases enable row level security;
alter table public.worksite_entries enable row level security;
revoke all on public.worksite_members, public.worksite_phases, public.worksite_entries from anon;

create policy worksite_members_select on public.worksite_members for select to authenticated
  using (private.has_role(painter_org_id, array['proprietario', 'gestor', 'financeiro', 'leitor']::public.member_role[]));
create policy worksite_members_insert on public.worksite_members for insert to authenticated
  with check (private.can_manage_org(private.engagement_painter(engagement_id)));
create policy worksite_members_update on public.worksite_members for update to authenticated
  using (private.can_manage_org(private.engagement_painter(engagement_id)))
  with check (private.can_manage_org(private.engagement_painter(engagement_id)));
create policy worksite_members_delete on public.worksite_members for delete to authenticated
  using (private.can_manage_org(private.engagement_painter(engagement_id)));
create policy worksite_phases_select on public.worksite_phases for select to authenticated
  using (private.has_role(painter_org_id, array['proprietario', 'gestor', 'financeiro', 'leitor']::public.member_role[]));
create policy worksite_phases_insert on public.worksite_phases for insert to authenticated
  with check (private.can_manage_org(private.engagement_painter(engagement_id)));
create policy worksite_phases_update on public.worksite_phases for update to authenticated
  using (private.can_manage_org(private.engagement_painter(engagement_id)))
  with check (private.can_manage_org(private.engagement_painter(engagement_id)));
create policy worksite_phases_delete on public.worksite_phases for delete to authenticated
  using (private.can_manage_org(private.engagement_painter(engagement_id)));
create policy worksite_entries_select on public.worksite_entries for select to authenticated
  using (private.has_role(painter_org_id, array['proprietario', 'gestor', 'financeiro', 'leitor']::public.member_role[]));
create policy worksite_entries_insert on public.worksite_entries for insert to authenticated
  with check (private.can_manage_org(private.engagement_painter(engagement_id)));
create policy worksite_entries_update on public.worksite_entries for update to authenticated
  using (private.can_manage_org(private.engagement_painter(engagement_id)))
  with check (private.can_manage_org(private.engagement_painter(engagement_id)));
create policy worksite_entries_delete on public.worksite_entries for delete to authenticated
  using (private.can_manage_org(private.engagement_painter(engagement_id)));

revoke all on function private.material_order_guard(), private.bought_from(uuid, uuid), private.worksite_painter()
  from public, anon;
grant execute on function private.bought_from(uuid, uuid) to authenticated;
