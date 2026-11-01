-- Disponibilidade e alertas: a presença de cada avaliador, e por onde quer ser avisado.
--
-- Até aqui isto não existia em sítio nenhum: a cobertura geográfica era da empresa, vivia a meio da
-- página dos levantamentos, e não havia maneira de um avaliador dizer «esta semana não estou». Quem ia
-- de férias ou adoecia continuava a receber oportunidades, e a aceitar tarde — ou a não aceitar de todo,
-- o que é pior para o cliente, que fica à espera.
--
-- A linha é da **pessoa**, não da empresa: a privacidade entre pessoa e empresa é regra (01/11/2026), e
-- as férias de alguém não são assunto do responsável. Por isso o dono da linha é o único que a lê e a
-- escreve, e não há política que deixe a empresa espreitar.

create table if not exists public.survey_availability (
  user_id uuid primary key references auth.users (id) on delete cascade,
  -- Presença suspensa até ao fim deste dia, hora de Lisboa. Nulo: disponível.
  suspenso_ate date,
  -- Avisos por email: a única via construída. Desligar não cala o aviso dentro da aplicação, que é o
  -- que vale como prova de que a pessoa foi avisada.
  alerta_email boolean not null default true,
  updated_at timestamptz not null default now(),
  constraint survey_availability_suspensao_curta check (
    suspenso_ate is null or suspenso_ate <= (now() at time zone 'Europe/Lisbon')::date + 365
  )
);

alter table public.survey_availability enable row level security;

drop policy if exists survey_availability_dona_le on public.survey_availability;
create policy survey_availability_dona_le on public.survey_availability
  for select to authenticated using (user_id = (select auth.uid()));

drop policy if exists survey_availability_dona_escreve on public.survey_availability;
create policy survey_availability_dona_escreve on public.survey_availability
  for insert to authenticated with check (user_id = (select auth.uid()));

drop policy if exists survey_availability_dona_altera on public.survey_availability;
create policy survey_availability_dona_altera on public.survey_availability
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

grant select, insert, update on public.survey_availability to authenticated;

create or replace function private.survey_availability_carimbo() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists survey_availability_carimbo on public.survey_availability;
create trigger survey_availability_carimbo
  before update on public.survey_availability
  for each row execute function private.survey_availability_carimbo();

-- Quem está suspenso não é avisado de oportunidades novas. A função diz sim ou não, num sítio só, para
-- a aplicação e a base não divergirem.
create or replace function private.avaliador_disponivel(p_user uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce(
    (select suspenso_ate is null or suspenso_ate < (now() at time zone 'Europe/Lisbon')::date
     from public.survey_availability where user_id = p_user),
    true
  );
$$;
