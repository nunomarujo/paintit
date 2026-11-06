-- CRM: campanhas com aprovação, e o dossier de dores (promotor, 06/11/2026).
--
-- Regra do promotor: os envios de uma campanha JÁ aprovada não esperam por ninguém; só uma campanha nova (ou
-- corrigida) espera pela autorização dele. A regra vive na base: um envio só passa a «aprovado» ou «enviado» se a
-- campanha estiver «aprovada» e o contacto ainda puder receber (pessoa coletiva, sem desistência).
-- O dossier guarda dores, lacunas e acertos por perfil e zona, para decidir que mensagem pesa mais em cada campanha.

create table public.crm_campanhas (
  id text primary key check (length(btrim(id)) > 0),
  assunto text not null check (length(btrim(assunto)) > 0),
  corpo text not null check (length(btrim(corpo)) > 0),
  cta text not null check (length(btrim(cta)) > 0),
  estado text not null default 'rascunho' check (estado in ('rascunho', 'aprovada', 'correcao')),
  nota text,
  versao integer not null default 1 check (versao >= 1),
  decidida_por uuid references auth.users (id) on delete set null,
  decidida_em timestamptz,
  criada_em timestamptz not null default now()
);
create index crm_campanhas_decidida_por_idx on public.crm_campanhas (decidida_por);

create table public.crm_dossier (
  id uuid primary key default gen_random_uuid(),
  perfil text not null check (perfil in ('pintor', 'fornecedor', 'administradora', 'cliente')),
  zona_id uuid references public.crm_zonas (id) on delete set null,
  tema text not null check (length(btrim(tema)) > 0),
  tipo text not null check (tipo in ('dor', 'lacuna', 'acerto')),
  texto text not null check (length(btrim(texto)) > 0),
  fonte text not null check (length(btrim(fonte)) > 0),
  evidencias integer not null default 1 check (evidencias >= 1),
  solucao text,
  -- Quanto a plataforma resolve hoje: 0 nada, 1 em parte, 2 bem, 3 é um ponto forte.
  cobertura smallint not null default 0 check (cobertura between 0 and 3),
  estado text not null default 'aberta' check (estado in ('aberta', 'em_curso', 'resolvida')),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create index crm_dossier_zona_idx on public.crm_dossier (zona_id);
create index crm_dossier_tema_idx on public.crm_dossier (tema);

create or replace function private.crm_envio_permitido() returns trigger
language plpgsql set search_path = '' as $$
declare c public.crm_contactos;
begin
  if new.estado in ('proposto', 'aprovado', 'enviado') then
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
  end if;
  if new.estado in ('aprovado', 'enviado')
     and not exists (select 1 from public.crm_campanhas where id = new.campanha_id and estado = 'aprovada') then
    raise exception 'A campanha ainda não foi aprovada.' using errcode = 'check_violation';
  end if;
  return new;
end $$;

drop trigger crm_envios_permitido on public.crm_envios;
create trigger crm_envios_permitido before insert or update of estado on public.crm_envios
  for each row execute function private.crm_envio_permitido();

alter table public.crm_campanhas enable row level security;
alter table public.crm_dossier enable row level security;
create policy crm_campanhas_equipa on public.crm_campanhas for all to authenticated
  using ((select private.is_platform_admin())) with check ((select private.is_platform_admin()));
create policy crm_dossier_equipa on public.crm_dossier for all to authenticated
  using ((select private.is_platform_admin())) with check ((select private.is_platform_admin()));
revoke all on public.crm_campanhas, public.crm_dossier from anon, public;
grant select, insert, update, delete on public.crm_campanhas, public.crm_dossier to authenticated;
