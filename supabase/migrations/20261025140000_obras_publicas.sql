-- Obras públicas (25/10/2026, docs/DECISOES.md).
--
-- A lista de concursos é curada pela equipa da plataforma, por distrito, e não recolhida
-- automaticamente: a fonte primária (feed da Parte L do Diário da República) está identificada, mas a
-- recolha fica para depois de confirmados os termos de utilização do portal BASE. Arrancar com dois ou
-- três distritos curados à mão e dizê-lo no ecrã é mais honesto do que cobertura nacional com ruído.

-- As subcategorias do título do IMPIC (1.ª categoria: b) pinturas, t) impermeabilizações e isolamentos,
-- g) restauro). Em obra particular não são precisas; em obra pública decidem a elegibilidade.
alter table public.org_documents add column if not exists subcategorias text[];
alter table public.org_documents drop constraint if exists org_documents_subcategorias_check;
alter table public.org_documents
  add constraint org_documents_subcategorias_check
  check (subcategorias is null or subcategorias <@ array['b', 't', 'g']::text[]);

create table if not exists public.public_tenders (
  id uuid primary key default gen_random_uuid(),
  -- Referência do procedimento e ligação ao anúncio, para o pintor poder confirmar na fonte.
  referencia text not null,
  anuncio_url text,
  objeto text not null,
  entidade text not null,
  distrito text not null,
  concelho text,
  cpv text,
  -- Valor global estimado da empreitada (toda, não só a pintura): é este que a classe tem de cobrir.
  valor_cents bigint,
  subcategorias text[] not null default '{}',
  plataforma text,
  prazo_entrega timestamptz not null,
  documentos_exigidos text[] not null default '{}',
  publicado_em date,
  created_at timestamptz not null default now()
);

alter table public.public_tenders drop constraint if exists public_tenders_subcategorias_check;
alter table public.public_tenders
  add constraint public_tenders_subcategorias_check
  check (subcategorias <@ array['b', 't', 'g']::text[]);

create index if not exists public_tenders_prazo_idx on public.public_tenders (prazo_entrega);
create index if not exists public_tenders_distrito_idx on public.public_tenders (distrito);

alter table public.public_tenders enable row level security;

-- Um anúncio de concurso público é, por definição, público: qualquer conta autenticada o vê. Só a
-- equipa da plataforma é que o cria ou altera — não há ecrã para isso fora do backoffice.
drop policy if exists public_tenders_select on public.public_tenders;
create policy public_tenders_select on public.public_tenders for select to authenticated using (true);

drop policy if exists public_tenders_write on public.public_tenders;
create policy public_tenders_write on public.public_tenders
  for all to authenticated
  using (exists (select 1 from public.platform_admins a where a.user_id = auth.uid()))
  with check (exists (select 1 from public.platform_admins a where a.user_id = auth.uid()));

-- Distritos onde a empresa trabalha, para a lista não ser ruído.
create table if not exists public.painter_tender_prefs (
  org_id uuid primary key references public.organizations (id) on delete cascade,
  distritos text[] not null default '{}',
  updated_at timestamptz not null default now()
);

alter table public.painter_tender_prefs enable row level security;

drop policy if exists painter_tender_prefs_select on public.painter_tender_prefs;
create policy painter_tender_prefs_select on public.painter_tender_prefs
  for select to authenticated
  using (exists (select 1 from public.org_members m where m.org_id = painter_tender_prefs.org_id and m.user_id = auth.uid()));

drop policy if exists painter_tender_prefs_write on public.painter_tender_prefs;
create policy painter_tender_prefs_write on public.painter_tender_prefs
  for all to authenticated
  using (exists (select 1 from public.org_members m where m.org_id = painter_tender_prefs.org_id and m.user_id = auth.uid()))
  with check (exists (select 1 from public.org_members m where m.org_id = painter_tender_prefs.org_id and m.user_id = auth.uid()));

comment on table public.public_tenders is
  'Concursos públicos de pintura e isolamento, curados pela equipa. Elegibilidade em src/domain/obrasPublicas.ts.';
