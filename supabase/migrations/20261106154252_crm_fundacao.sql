-- CRM do workspace de developer: a fundação (promotor, 06/11/2026). Só a equipa da plataforma lê e escreve.
--
-- Zonas (concelhos), contactos de empresas a contactar, envios (propostos pelo agente, aprovados por uma pessoa)
-- e eventos (resposta, clique no QR, adesão, desistência). Nada envia email por si: esta migração só guarda.
--
-- Limite legal (Lei 41/2004, art. 13.º-A): email de marketing a pessoas singulares exige consentimento prévio.
-- Por isso a base de dados recusa um envio a quem não está marcado como pessoa coletiva, ou já desistiu —
-- a regra não depende de o ecrã ou o agente se lembrarem dela. Validação jurídica final por fazer.

create table public.crm_zonas (
  id uuid primary key default gen_random_uuid(),
  concelho text not null unique check (length(btrim(concelho)) > 0),
  ativa boolean not null default true,
  -- Posição na sequência de campanhas da zona (1 = a primeira). Uma zona nova começa sempre na 1.
  campanha_atual integer not null default 1 check (campanha_atual >= 1),
  criada_em timestamptz not null default now()
);

create table public.crm_contactos (
  id uuid primary key default gen_random_uuid(),
  zona_id uuid not null references public.crm_zonas (id) on delete restrict,
  tipo text not null check (tipo in ('pintor', 'fornecedor', 'administradora')),
  nome text not null check (length(btrim(nome)) > 0),
  email text check (email is null or email ~ '^[^\s@]+@[^\s@]+\.[^\s@]+$'),
  telefone text,
  website text,
  fonte text not null check (length(btrim(fonte)) > 0),
  -- Só pessoas coletivas recebem email frio. Empresário em nome individual conta como singular.
  pessoa_coletiva boolean not null default false,
  estado text not null default 'novo' check (estado in ('novo', 'contactado', 'respondeu', 'aderiu', 'recusou', 'desistiu')),
  desistiu_em timestamptz,
  criado_em timestamptz not null default now()
);
create unique index crm_contactos_email_key on public.crm_contactos (lower(email)) where email is not null;
create index crm_contactos_zona_idx on public.crm_contactos (zona_id);

create table public.crm_envios (
  id uuid primary key default gen_random_uuid(),
  contacto_id uuid not null references public.crm_contactos (id) on delete cascade,
  campanha_id text not null check (length(btrim(campanha_id)) > 0),
  estado text not null default 'proposto' check (estado in ('proposto', 'aprovado', 'enviado', 'falhou', 'rejeitado')),
  aprovado_por uuid references auth.users (id) on delete set null,
  enviado_em timestamptz,
  criado_em timestamptz not null default now(),
  unique (contacto_id, campanha_id)
);
create index crm_envios_contacto_idx on public.crm_envios (contacto_id);
create index crm_envios_aprovado_por_idx on public.crm_envios (aprovado_por);

create table public.crm_eventos (
  id uuid primary key default gen_random_uuid(),
  contacto_id uuid not null references public.crm_contactos (id) on delete cascade,
  envio_id uuid references public.crm_envios (id) on delete set null,
  tipo text not null check (tipo in ('resposta', 'clique', 'adesao', 'desistencia')),
  detalhe text,
  criado_em timestamptz not null default now()
);
create index crm_eventos_contacto_idx on public.crm_eventos (contacto_id);
create index crm_eventos_envio_idx on public.crm_eventos (envio_id);

-- A porta legal, na base: nenhum envio a quem não pode receber.
create function private.crm_envio_permitido() returns trigger
language plpgsql set search_path = '' as $$
declare c public.crm_contactos;
begin
  select * into c from public.crm_contactos where id = new.contacto_id;
  if c.email is null then
    raise exception 'Contacto sem email: não há para onde enviar.' using errcode = 'check_violation';
  end if;
  if not c.pessoa_coletiva then
    raise exception 'Só pessoas coletivas recebem email de marketing sem consentimento prévio.' using errcode = 'check_violation';
  end if;
  if c.desistiu_em is not null or c.estado = 'desistiu' then
    raise exception 'Este contacto pediu para não receber mais mensagens.' using errcode = 'check_violation';
  end if;
  return new;
end $$;

create trigger crm_envios_permitido before insert on public.crm_envios
  for each row execute function private.crm_envio_permitido();

alter table public.crm_zonas enable row level security;
alter table public.crm_contactos enable row level security;
alter table public.crm_envios enable row level security;
alter table public.crm_eventos enable row level security;

create policy crm_zonas_equipa on public.crm_zonas for all to authenticated
  using ((select private.is_platform_admin())) with check ((select private.is_platform_admin()));
create policy crm_contactos_equipa on public.crm_contactos for all to authenticated
  using ((select private.is_platform_admin())) with check ((select private.is_platform_admin()));
create policy crm_envios_equipa on public.crm_envios for all to authenticated
  using ((select private.is_platform_admin())) with check ((select private.is_platform_admin()));
create policy crm_eventos_equipa on public.crm_eventos for all to authenticated
  using ((select private.is_platform_admin())) with check ((select private.is_platform_admin()));

revoke all on public.crm_zonas, public.crm_contactos, public.crm_envios, public.crm_eventos from anon, public;
grant select, insert, update, delete on public.crm_zonas, public.crm_contactos, public.crm_envios, public.crm_eventos to authenticated;

-- A primeira zona, escolhida pelo promotor.
insert into public.crm_zonas (concelho) values ('Viana do Castelo');
