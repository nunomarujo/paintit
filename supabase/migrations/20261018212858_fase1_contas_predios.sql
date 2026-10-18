-- Paint it — fase 1: perfis, organizações, membros, prédios e documentos de
-- verificação. Toda a autorização é feita por RLS; as funções auxiliares vivem
-- no esquema `private`, que não é exposto pela API.

create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

create type public.org_kind as enum ('condominio', 'administradora', 'particular', 'pintor', 'fornecedor');
create type public.member_role as enum ('proprietario', 'gestor', 'financeiro', 'leitor');
create type public.building_kind as enum ('edificio_habitacao', 'edificio_misto', 'moradia', 'apartamento', 'comercial');
create type public.doc_kind as enum (
  'certidao_permanente',
  'ata_nomeacao_administrador',
  'ata_aprovacao_obra',
  'alvara_impic',
  'certificado_impic',
  'seguro_acidentes_trabalho',
  'seguro_responsabilidade_civil',
  'declaracao_nao_divida_at',
  'declaracao_nao_divida_ss',
  'autorizacao_marca',
  'outro'
);
create type public.doc_status as enum ('submetido', 'em_validacao', 'aprovado', 'rejeitado', 'expirado');

-- NIF português: igual a src/domain/nif.ts.
create function private.nif_valido(nif text) returns boolean
language plpgsql immutable set search_path = '' as $$
declare
  s int := 0;
  r int;
begin
  if nif is null or nif !~ '^[0-9]{9}$' then return false; end if;
  if left(nif, 1) = '0' or (left(nif, 1) = '4' and left(nif, 2) <> '45') then return false; end if;
  for i in 1..8 loop
    s := s + substr(nif, i, 1)::int * (10 - i);
  end loop;
  r := s % 11;
  return (case when r < 2 then 0 else 11 - r end) = substr(nif, 9, 1)::int;
end $$;

create function private.touch_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end $$;

-- Perfis ---------------------------------------------------------------------

create table public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  nome text not null default '',
  telefone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.platform_admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

-- Organizações ---------------------------------------------------------------

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  kind public.org_kind not null,
  nome text not null check (length(btrim(nome)) > 0),
  nif text check (nif is null or private.nif_valido(nif)),
  morada_fiscal text,
  codigo_postal text check (codigo_postal is null or codigo_postal ~ '^[0-9]{4}-[0-9]{3}$'),
  localidade text,
  email_contacto text,
  telefone text,
  -- Loja, escritório ou atendimento ao público (pintores e fornecedores).
  atendimento_publico text,
  zonas_servico text[] not null default '{}',
  -- Um condomínio pode ser gerido por uma empresa de administração.
  gerida_por uuid references public.organizations (id) on delete set null,
  created_by uuid not null default auth.uid() references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint so_condominio_e_gerido check (gerida_por is null or kind = 'condominio')
);
create index organizations_gerida_por_idx on public.organizations (gerida_por);
create index organizations_created_by_idx on public.organizations (created_by);

create table public.org_members (
  org_id uuid not null references public.organizations (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role public.member_role not null,
  created_at timestamptz not null default now(),
  primary key (org_id, user_id)
);
create index org_members_user_id_idx on public.org_members (user_id);

-- Prédios --------------------------------------------------------------------

create table public.buildings (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  nome_interno text not null check (length(btrim(nome_interno)) > 0),
  tipo public.building_kind not null,
  -- Morada exata: privada. Aos pintores só chega o concelho, antes da apresentação.
  morada text not null,
  codigo_postal text not null check (codigo_postal ~ '^[0-9]{4}-[0-9]{3}$'),
  localidade text not null,
  concelho text not null,
  artigo_matricial text,
  pisos smallint check (pisos between 0 and 100),
  fracoes smallint check (fracoes between 0 and 2000),
  fachadas smallint check (fachadas between 0 and 8),
  ano_construcao smallint check (ano_construcao between 1500 and 2100),
  tem_varandas boolean not null default false,
  tem_elevador boolean not null default false,
  acessos text,
  created_by uuid not null default auth.uid() references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index buildings_org_id_idx on public.buildings (org_id);
-- Permite que outras tabelas exijam que o prédio pertença à mesma organização.
alter table public.buildings add constraint buildings_id_org_key unique (id, org_id);
create index buildings_created_by_idx on public.buildings (created_by);

-- Documentos de verificação ---------------------------------------------------

create table public.org_documents (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  building_id uuid,
  kind public.doc_kind not null,
  storage_path text not null,
  nome_ficheiro text not null,
  status public.doc_status not null default 'submetido',
  valido_ate date,
  notas_validacao text,
  submitted_by uuid not null default auth.uid() references auth.users (id),
  validated_by uuid references auth.users (id),
  validated_at timestamptz,
  created_at timestamptz not null default now(),
  constraint org_documents_building_same_org foreign key (building_id, org_id)
    references public.buildings (id, org_id) on delete cascade
);
create index org_documents_org_id_idx on public.org_documents (org_id);
create index org_documents_building_id_idx on public.org_documents (building_id);
create index org_documents_submitted_by_idx on public.org_documents (submitted_by);
create index org_documents_validated_by_idx on public.org_documents (validated_by);

create trigger profiles_touch before update on public.profiles
  for each row execute function private.touch_updated_at();
create trigger organizations_touch before update on public.organizations
  for each row execute function private.touch_updated_at();
create trigger buildings_touch before update on public.buildings
  for each row execute function private.touch_updated_at();

-- Funções de autorização ------------------------------------------------------

create function private.is_platform_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.platform_admins where user_id = (select auth.uid()));
$$;

-- Papel do utilizador na organização ou na administradora que a gere.
create function private.has_role(p_org uuid, p_roles public.member_role[]) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1
    from public.org_members m
    where m.user_id = (select auth.uid())
      and m.role = any (p_roles)
      and (
        m.org_id = p_org
        or m.org_id = (select o.gerida_por from public.organizations o where o.id = p_org)
      )
  );
$$;

create function private.can_access_org(p_org uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select private.has_role(p_org, array['proprietario', 'gestor', 'financeiro', 'leitor']::public.member_role[])
      or private.is_platform_admin();
$$;

create function private.can_manage_org(p_org uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select private.has_role(p_org, array['proprietario', 'gestor']::public.member_role[]);
$$;

-- Primeiro segmento do caminho no armazenamento = id da organização.
create function private.org_from_path(p_name text) returns uuid
language sql immutable set search_path = '' as $$
  select case
    when split_part(p_name, '/', 1) ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    then split_part(p_name, '/', 1)::uuid
  end;
$$;

-- Quem cria uma organização fica como proprietário.
create function private.add_creator_as_owner() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.org_members (org_id, user_id, role) values (new.id, new.created_by, 'proprietario');
  return new;
end $$;

create trigger organizations_add_owner after insert on public.organizations
  for each row execute function private.add_creator_as_owner();

revoke all on all functions in schema private from public, anon;
grant execute on all functions in schema private to authenticated;

-- RLS -------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.platform_admins enable row level security;
alter table public.organizations enable row level security;
alter table public.org_members enable row level security;
alter table public.buildings enable row level security;
alter table public.org_documents enable row level security;

revoke all on public.profiles, public.platform_admins, public.organizations, public.org_members,
  public.buildings, public.org_documents from anon;

create policy profiles_own_select on public.profiles for select to authenticated
  using (user_id = (select auth.uid()));
create policy profiles_own_insert on public.profiles for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy profiles_own_update on public.profiles for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy platform_admins_self on public.platform_admins for select to authenticated
  using (user_id = (select auth.uid()));

-- O criador vê a organização logo após a inserção, antes de o gatilho o
-- registar como membro (necessário para insert ... returning).
create policy organizations_select on public.organizations for select to authenticated
  using (private.can_access_org(id) or created_by = (select auth.uid()));
create policy organizations_insert on public.organizations for insert to authenticated
  with check (
    created_by = (select auth.uid())
    and (gerida_por is null or private.can_manage_org(gerida_por))
  );
create policy organizations_update on public.organizations for update to authenticated
  using (private.can_manage_org(id))
  with check (private.can_manage_org(id) and (gerida_por is null or private.can_manage_org(gerida_por)));

create policy org_members_select on public.org_members for select to authenticated
  using (private.can_access_org(org_id));
create policy org_members_insert on public.org_members for insert to authenticated
  with check (private.has_role(org_id, array['proprietario']::public.member_role[]));
create policy org_members_delete on public.org_members for delete to authenticated
  using (private.has_role(org_id, array['proprietario']::public.member_role[]) and user_id <> (select auth.uid()));

create policy buildings_select on public.buildings for select to authenticated
  using (private.can_access_org(org_id));
create policy buildings_insert on public.buildings for insert to authenticated
  with check (private.can_manage_org(org_id) and created_by = (select auth.uid()));
create policy buildings_update on public.buildings for update to authenticated
  using (private.can_manage_org(org_id)) with check (private.can_manage_org(org_id));
create policy buildings_delete on public.buildings for delete to authenticated
  using (private.has_role(org_id, array['proprietario']::public.member_role[]));

create policy org_documents_select on public.org_documents for select to authenticated
  using (private.can_access_org(org_id));
create policy org_documents_insert on public.org_documents for insert to authenticated
  with check (
    private.has_role(org_id, array['proprietario', 'gestor', 'financeiro']::public.member_role[])
    and submitted_by = (select auth.uid())
    and status = 'submetido'
    and validated_by is null
    and validated_at is null
  );
-- Só a equipa da plataforma valida documentos.
create policy org_documents_validate on public.org_documents for update to authenticated
  using (private.is_platform_admin()) with check (private.is_platform_admin());

-- Armazenamento privado dos documentos: caminho "<org_id>/<ficheiro>".
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('documentos', 'documentos', false, 10485760, array['application/pdf', 'image/jpeg', 'image/png']);

create policy documentos_select on storage.objects for select to authenticated
  using (bucket_id = 'documentos' and private.can_access_org(private.org_from_path(name)));
create policy documentos_insert on storage.objects for insert to authenticated
  with check (
    bucket_id = 'documentos'
    and private.has_role(private.org_from_path(name), array['proprietario', 'gestor', 'financeiro']::public.member_role[])
  );
