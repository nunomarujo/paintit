-- Orçamentos para clientes próprios e biblioteca de preços (25/10/2026, docs/DECISOES.md).
--
-- O orçamento é a ferramenta de maior valor que falta: hoje leva 1 a 3 horas e sai num Word copiado
-- do orçamento anterior. Estes são os orçamentos que o pintor faz aos clientes dele, fora do mercado
-- da plataforma — não têm anonimato, não têm comissão e não entram em nenhum pedido. Levam o
-- logótipo e os contactos dele, e a plataforma só aparece como uma linha discreta no fundo.
--
-- Ficam numa tabela própria e não em `proposals` de propósito: as propostas carregam anonimato,
-- comissão, prazos e selecção, e nada disso se aplica aqui. Misturá-las era abrir caminho a que um
-- orçamento privado entrasse um dia num fluxo de mercado por engano.

create table if not exists public.painter_quotes (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  -- Número sequencial por empresa, para o documento ter referência própria.
  numero int not null,
  cliente_nome text not null check (length(btrim(cliente_nome)) between 2 and 160),
  cliente_contacto text check (cliente_contacto is null or length(cliente_contacto) <= 160),
  local text check (local is null or length(local) <= 160),
  titulo text check (titulo is null or length(titulo) <= 200),
  estado text not null default 'rascunho' check (estado in ('rascunho', 'enviado', 'ganho', 'perdido')),
  iva_bps int not null default 600 check (iva_bps in (0, 600, 1300, 2300)),
  validade date,
  inicio_possivel date,
  duracao_dias int check (duracao_dias is null or duracao_dias between 1 and 3650),
  garantia_anos int check (garantia_anos is null or garantia_anos between 0 and 50),
  exclusoes text not null default '' check (length(exclusoes) <= 2000),
  notas text not null default '' check (length(notas) <= 2000),
  -- Obra criada a partir deste orçamento quando ele é ganho.
  worksite_id uuid references public.worksites (id) on delete set null,
  enviado_em timestamptz,
  created_at timestamptz not null default now(),
  unique (org_id, numero)
);

create index if not exists painter_quotes_org_idx on public.painter_quotes (org_id, created_at desc);

-- A numeração é por empresa e é o servidor que a atribui: dois orçamentos feitos ao mesmo tempo não
-- podem receber o mesmo número, e o navegador não tem nada que o escolher.
create or replace function private.painter_quote_number() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  -- O número é sempre atribuído aqui, mesmo que venha preenchido: o que chega do navegador não decide
  -- a numeração da empresa (CLAUDE.md, regra 10).
  select coalesce(max(numero), 0) + 1 into new.numero from public.painter_quotes where org_id = new.org_id;
  return new;
end $$;

drop trigger if exists painter_quotes_number on public.painter_quotes;
create trigger painter_quotes_number before insert on public.painter_quotes
  for each row execute function private.painter_quote_number();

create table if not exists public.painter_quote_lines (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid not null references public.painter_quotes (id) on delete cascade,
  org_id uuid not null,
  categoria text not null check (categoria in ('preparacao', 'reparacao', 'pintura', 'acessos', 'licencas', 'outro')),
  descricao text not null check (length(btrim(descricao)) between 1 and 300),
  unidade text not null default 'm2' check (unidade in ('m2', 'ml', 'un', 'vg')),
  -- Centésimos da unidade, como no resto da aplicação.
  quantidade int not null default 0 check (quantidade >= 0),
  preco_unitario int not null default 0 check (preco_unitario >= 0),
  demaos int check (demaos is null or demaos between 1 and 10),
  produto text check (produto is null or length(produto) <= 160),
  inclusao text not null default 'incluido' check (inclusao in ('incluido', 'opcional', 'condicionado', 'nao_incluido')),
  ordem int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists painter_quote_lines_quote_idx on public.painter_quote_lines (quote_id, ordem);

create or replace function private.painter_quote_org() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  select org_id into new.org_id from public.painter_quotes where id = new.quote_id;
  return new;
end $$;

drop trigger if exists painter_quote_lines_org on public.painter_quote_lines;
create trigger painter_quote_lines_org before insert or update on public.painter_quote_lines
  for each row execute function private.painter_quote_org();

-- Biblioteca de preços: os preços que a própria empresa praticou, aprendidos dos orçamentos que fez.
-- Nunca médias de mercado nem valores sugeridos pela plataforma — ver src/domain/priceBook.ts.
create table if not exists public.org_price_book (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  chave text not null,
  descricao text not null check (length(btrim(descricao)) between 3 and 300),
  categoria text not null check (categoria in ('preparacao', 'reparacao', 'pintura', 'acessos', 'licencas', 'outro')),
  unidade text not null check (unidade in ('m2', 'ml', 'un', 'vg')),
  preco_unitario int not null check (preco_unitario > 0),
  vezes int not null default 1 check (vezes > 0),
  ultima_vez date not null default (now() at time zone 'Europe/Lisbon')::date,
  unique (org_id, chave)
);

create index if not exists org_price_book_org_idx on public.org_price_book (org_id, vezes desc);

create or replace function private.painter_quote_owner(p_quote uuid) returns uuid
language sql security definer stable set search_path = '' as $$
  select org_id from public.painter_quotes where id = p_quote
$$;

alter table public.painter_quotes enable row level security;
alter table public.painter_quote_lines enable row level security;
alter table public.org_price_book enable row level security;
revoke all on public.painter_quotes, public.painter_quote_lines, public.org_price_book from anon;

-- Um orçamento privado é da empresa e de mais ninguém: nem do cliente dele, que não tem conta aqui,
-- nem da equipa da plataforma.
drop policy if exists painter_quotes_select on public.painter_quotes;
create policy painter_quotes_select on public.painter_quotes for select to authenticated
  using (private.has_role(org_id, array['proprietario', 'gestor', 'financeiro', 'leitor']::public.member_role[]));
drop policy if exists painter_quotes_write on public.painter_quotes;
create policy painter_quotes_write on public.painter_quotes for all to authenticated
  using (private.can_manage_org(org_id))
  with check (private.can_manage_org(org_id));

drop policy if exists painter_quote_lines_select on public.painter_quote_lines;
create policy painter_quote_lines_select on public.painter_quote_lines for select to authenticated
  using (private.has_role(org_id, array['proprietario', 'gestor', 'financeiro', 'leitor']::public.member_role[]));
drop policy if exists painter_quote_lines_write on public.painter_quote_lines;
create policy painter_quote_lines_write on public.painter_quote_lines for all to authenticated
  using (private.can_manage_org(private.painter_quote_owner(quote_id)))
  with check (private.can_manage_org(private.painter_quote_owner(quote_id)));

drop policy if exists org_price_book_select on public.org_price_book;
create policy org_price_book_select on public.org_price_book for select to authenticated
  using (private.has_role(org_id, array['proprietario', 'gestor', 'financeiro', 'leitor']::public.member_role[]));
drop policy if exists org_price_book_write on public.org_price_book;
create policy org_price_book_write on public.org_price_book for all to authenticated
  using (private.can_manage_org(org_id))
  with check (private.can_manage_org(org_id));

comment on table public.painter_quotes is
  'Orçamentos que a empresa faz aos clientes dela, fora do mercado da plataforma. Sem comissão e sem anonimato.';
