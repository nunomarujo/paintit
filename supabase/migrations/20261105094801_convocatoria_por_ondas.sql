-- Convocatória por ondas: o avaliador diz onde está e até onde vai, a plataforma convida por ondas pelo
-- WhatsApp, e o «Aceito» reserva — o primeiro ganha, numa só transação.
--
-- Decisões do promotor de 05/11/2026 (docs/DECISOES.md, «Convocatória por ondas»). As regras de quem é
-- convidado e por que ordem vivem em `src/domain/convocatoria.ts` e correm na aplicação; aqui só ficam o
-- que essas regras precisam de guardar e a única coisa que tem de ser atómica: a reserva pelo convite.
--
-- Migração ADITIVA: nada existente muda de forma ou de comportamento, exceto um gatilho novo que fecha os
-- convites pendentes quando o levantamento deixa de estar aberto (por qualquer via).

-- ---------------------------------------------------------------------------------------------------------
-- O que o avaliador declara (linha pessoal de «Disponibilidade e alertas»)
-- ---------------------------------------------------------------------------------------------------------

-- Concelho base e raio: os anéis à volta da obra medem-se daqui. O nome é o dos CTT (`concelhos.ts`); o
-- raio só pode ser um dos quatro que o ecrã oferece. Recebimento: a comissão vai para a empresa (por
-- omissão, como até aqui) ou para a pessoa, com recibo verde — e só então existe NIF pessoal. A restrição
-- obriga às duas coisas juntas: sem nome próprio não se guarda NIF (minimização, RGPD), com nome próprio
-- não se recebe sem ele. O NIF tem de ser de pessoa singular — não começa por 5, 6, 8 ou 9.
alter table public.survey_availability
  add column if not exists concelho_base text check (concelho_base is null or length(concelho_base) between 1 and 80),
  add column if not exists raio_km smallint check (raio_km is null or raio_km in (15, 30, 60, 100)),
  add column if not exists recebimento text not null default 'empresa' check (recebimento in ('empresa', 'proprio')),
  add column if not exists nif_pessoal text check (
    nif_pessoal is null or (private.nif_valido(nif_pessoal) and nif_pessoal !~ '^[5689]')
  );

alter table public.survey_availability
  drop constraint if exists survey_availability_nif_so_em_nome_proprio;
alter table public.survey_availability
  add constraint survey_availability_nif_so_em_nome_proprio check ((recebimento = 'proprio') = (nif_pessoal is not null));

-- ---------------------------------------------------------------------------------------------------------
-- Ondas e convites
-- ---------------------------------------------------------------------------------------------------------

-- Uma linha por onda enviada. Guarda a versão das regras que a escolheu, para se poder afinar os números
-- sem reescrever o passado.
create table if not exists public.survey_waves (
  id uuid primary key default gen_random_uuid(),
  survey_id uuid not null references public.request_surveys (id) on delete cascade,
  numero int not null check (numero between 1 and 10),
  versao_regras text not null check (length(versao_regras) between 1 and 40),
  enviada_em timestamptz not null default now(),
  constraint survey_waves_numero_unico unique (survey_id, numero)
);

-- Uma linha por pessoa convidada. A mesma pessoa nunca é convidada duas vezes para o mesmo levantamento.
--   a_enviar → enviado → aceite | tarde | expirado ;  a_enviar → falhou
-- «tarde» é quem carregou em «Aceito» depois de a vaga ter dono — só a esses vai a mensagem «já
-- atribuída» (decisão 3 de 05/11/2026). «expirado» é quem não respondeu; não recebe nada.
create table if not exists public.survey_invites (
  id uuid primary key default gen_random_uuid(),
  wave_id uuid not null references public.survey_waves (id) on delete cascade,
  survey_id uuid not null references public.request_surveys (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  org_id uuid not null references public.organizations (id) on delete cascade,
  telemovel text not null check (telemovel ~ '^\+[0-9]{8,15}$'),
  estado text not null default 'a_enviar'
    check (estado in ('a_enviar', 'enviado', 'falhou', 'aceite', 'tarde', 'expirado')),
  twilio_sid text unique check (twilio_sid is null or length(twilio_sid) <= 64),
  erro text check (erro is null or length(erro) <= 500),
  enviado_em timestamptz,
  respondido_em timestamptz,
  created_at timestamptz not null default now(),
  constraint survey_invites_uma_vez unique (survey_id, user_id)
);
create index if not exists survey_invites_wave_idx on public.survey_invites (wave_id);
create index if not exists survey_invites_pessoa_idx on public.survey_invites (user_id, created_at desc);
create index if not exists survey_invites_telemovel_idx on public.survey_invites (telemovel, enviado_em desc)
  where estado in ('enviado', 'expirado');
create index if not exists survey_invites_org_idx on public.survey_invites (org_id);

-- Registo de cada mensagem WhatsApp do circuito dos convites, enviada ou recebida — a prova do que se
-- disse a quem, e o sítio onde a Twilio vem dizer se foi entregue ou lida.
create table if not exists public.whatsapp_messages (
  id uuid primary key default gen_random_uuid(),
  direcao text not null check (direcao in ('saida', 'entrada')),
  twilio_sid text unique check (twilio_sid is null or length(twilio_sid) <= 64),
  para text not null check (length(para) <= 40),
  de text not null check (length(de) <= 40),
  modelo text check (modelo is null or length(modelo) <= 64),
  variaveis jsonb,
  corpo text check (corpo is null or length(corpo) <= 2000),
  estado text not null default 'enviada' check (length(estado) <= 30),
  erro text check (erro is null or length(erro) <= 500),
  invite_id uuid references public.survey_invites (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists whatsapp_messages_invite_idx on public.whatsapp_messages (invite_id);

-- Ao fim das ondas sem resposta, a convocatória esgota-se: avisa-se a equipa e não se convida mais ninguém.
alter table public.request_surveys
  add column if not exists convocatoria_esgotada_em timestamptz;

-- RLS: cada pessoa vê os seus convites (o ecrã mostra-os); a equipa da plataforma vê tudo; ninguém escreve
-- pela API — escreve a aplicação com a chave de serviço, e a reserva passa pela função abaixo.
alter table public.survey_waves enable row level security;
alter table public.survey_invites enable row level security;
alter table public.whatsapp_messages enable row level security;
revoke all on public.survey_waves, public.survey_invites, public.whatsapp_messages from anon, authenticated;
grant select on public.survey_waves, public.survey_invites, public.whatsapp_messages to authenticated;

drop policy if exists survey_waves_equipa on public.survey_waves;
create policy survey_waves_equipa on public.survey_waves
  for select to authenticated using ((select private.is_platform_admin()));

drop policy if exists survey_invites_le on public.survey_invites;
create policy survey_invites_le on public.survey_invites
  for select to authenticated using (user_id = (select auth.uid()) or (select private.is_platform_admin()));

drop policy if exists whatsapp_messages_equipa on public.whatsapp_messages;
create policy whatsapp_messages_equipa on public.whatsapp_messages
  for select to authenticated using ((select private.is_platform_admin()));

-- ---------------------------------------------------------------------------------------------------------
-- O «Aceito»: reservar pelo convite
-- ---------------------------------------------------------------------------------------------------------

-- A versão da inscrição de avaliador. Repetida aqui, igual à de
-- 20261102120000_reserva_so_para_avaliadores_inscritos.sql, porque essa migração ainda não está na base real
-- (espera a decisão do promotor sobre quem já reserva hoje — HANDOFF_MIGRACOES.md) e esta precisa da função
-- já. Criar a mesma função duas vezes com o mesmo corpo não muda nada; quando a outra for aplicada, também
-- não. Mudar a versão continua a ser mudá-la em `src/domain/avaliador.ts` e numa migração nova.
create or replace function private.versao_da_autodeclaracao_do_avaliador() returns text
language sql immutable as $$ select 'avaliador-2026-11-02'::text $$;

-- A mesma reserva de `reserve_survey`, mas por quem foi convidado e não por quem tem sessão aberta: o
-- WhatsApp não traz sessão, traz o convite. As verificações que importam repetem-se aqui, contra a pessoa
-- do convite: inscrição de avaliador em vigor e não ter perdido esta mesma vaga por prazo. A zona não se
-- verifica pela cobertura da empresa — o convite já foi escolhido pelo raio que a pessoa declarou.
--
-- Atómica: o `update … where status = 'aberto'` só deixa passar um. Os outros recebem «tarde».
-- Idempotente: a Twilio repete pedidos; um segundo «Aceito» do mesmo convite devolve o mesmo resultado.
-- Devolve: 'aceite' | 'tarde' | 'sem_inscricao' | 'excluido'.
create or replace function public.aceitar_convite(p_invite uuid) returns text
language plpgsql security definer set search_path = '' as $$
declare
  i public.survey_invites;
  r public.request_surveys;
  p record;
  n int;
begin
  select * into i from public.survey_invites where id = p_invite for update;
  if i.id is null then
    raise exception 'Convite desconhecido.' using errcode = 'P0001';
  end if;
  if i.estado in ('aceite', 'tarde') then
    return i.estado;
  end if;
  if not exists (
    select 1 from public.survey_terms_acceptances a
    where a.user_id = i.user_id and a.version = private.versao_da_autodeclaracao_do_avaliador()
  ) then
    return 'sem_inscricao';
  end if;
  if private.tentativa_excluida(i.survey_id, i.org_id) then
    update public.survey_invites set estado = 'tarde', respondido_em = now() where id = i.id;
    return 'excluido';
  end if;

  select * into p from private.prazos_da_reserva(now());
  update public.request_surveys s
    set status = 'reservado', vendedor_org_id = i.org_id, vendedor_user_id = i.user_id,
        reserved_at = now(), reserve_deadline = p.prazo_conclusao,
        contact_notes = '', scheduled_at = null
    where s.id = i.survey_id and s.status = 'aberto'
    returning * into r;
  if r.id is null then
    update public.survey_invites set estado = 'tarde', respondido_em = now() where id = i.id;
    return 'tarde';
  end if;

  select coalesce(max(a.numero), 0) + 1 into n from public.survey_attempts a where a.survey_id = r.id;
  insert into public.survey_attempts (
    survey_id, numero, vendedor_org_id, vendedor_user_id, aceita_em,
    prazo_contacto, prazo_conclusao, limite_adiamento
  ) values (r.id, n, i.org_id, i.user_id, now(), p.prazo_contacto, p.prazo_conclusao, p.limite_adiamento);

  update public.survey_invites set estado = 'aceite', respondido_em = now() where id = i.id;
  return 'aceite';
end $$;
revoke all on function public.aceitar_convite(uuid) from public, anon, authenticated;
grant execute on function public.aceitar_convite(uuid) to service_role;

-- Quando o levantamento deixa de estar aberto — reservado pela aplicação, pelo convite, cancelado,
-- expirado — os convites que ainda esperavam resposta fecham. Quem carregar depois recebe «tarde».
create or replace function private.fechar_convites_pendentes() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if old.status = 'aberto' and new.status <> 'aberto' then
    update public.survey_invites set estado = 'expirado'
      where survey_id = new.id and estado in ('a_enviar', 'enviado');
  end if;
  return new;
end $$;
revoke all on function private.fechar_convites_pendentes() from public, anon, authenticated;

drop trigger if exists request_surveys_fecha_convites on public.request_surveys;
create trigger request_surveys_fecha_convites after update of status on public.request_surveys
  for each row execute function private.fechar_convites_pendentes();

-- ---------------------------------------------------------------------------------------------------------
-- O relógio: a base acorda a aplicação quando há convocatórias por avançar
-- ---------------------------------------------------------------------------------------------------------

-- Há trabalho? Um levantamento aberto, com concelho, não esgotado, e cuja última onda (se houve) saiu há
-- mais de uma hora — a janela de uma onda é uma hora útil, que nunca é menos do que uma hora de relógio. E
-- só em horário útil de Lisboa: fora dele a aplicação não envia, e acordá-la seria inútil.
create or replace function private.ha_convocatorias_por_avancar() returns boolean
language sql stable security definer set search_path = '' as $$
  select extract(isodow from (now() at time zone 'Europe/Lisbon')) between 1 and 5
    and (now() at time zone 'Europe/Lisbon')::time >= time '09:00'
    and (now() at time zone 'Europe/Lisbon')::time < time '18:00'
    and exists (
      select 1 from public.request_surveys s
      join public.work_requests wr on wr.id = s.request_id
      join public.buildings b on b.id = wr.building_id
      where s.status = 'aberto' and s.convocatoria_esgotada_em is null and btrim(b.concelho) <> ''
        and coalesce((select max(w.enviada_em) from public.survey_waves w where w.survey_id = s.id), '-infinity')
            < now() - interval '1 hour'
    );
$$;
revoke all on function private.ha_convocatorias_por_avancar() from public, anon, authenticated;

-- A chamada à aplicação. Mesmo endereço-base e mesmo segredo dos avisos (Vault: `avisos_url`,
-- `avisos_segredo`), noutra rota: o segredo é um só e não há segundo para gerir. Engole qualquer falha —
-- corre dentro da tarefa ao minuto e não pode parar nada.
create or replace function private.pedir_convocatorias() returns void
language plpgsql security definer set search_path = '' as $$
declare
  destino text;
  segredo text;
begin
  begin
    if not private.ha_convocatorias_por_avancar() then return; end if;
    select decrypted_secret into destino from vault.decrypted_secrets where name = 'avisos_url' limit 1;
    select decrypted_secret into segredo from vault.decrypted_secrets where name = 'avisos_segredo' limit 1;
    if destino is null or segredo is null then return; end if;
    perform net.http_post(
      url := regexp_replace(destino, '^(https?://[^/]+).*$', '\1') || '/api/convocatorias',
      headers := jsonb_build_object('Authorization', 'Bearer ' || segredo, 'Content-Type', 'application/json'),
      body := '{}'::jsonb,
      timeout_milliseconds := 5000
    );
  exception when others then
    return;
  end;
end $$;
revoke all on function private.pedir_convocatorias() from public, anon, authenticated;

-- Tarefa ao minuto, só onde existe pg_cron (no Supabase; não na base de testes).
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    execute $cron$select cron.schedule('quempinta-convocatorias', '* * * * *', 'select private.pedir_convocatorias()')$cron$;
  end if;
end $$;
