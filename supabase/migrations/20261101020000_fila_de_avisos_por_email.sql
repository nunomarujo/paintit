-- A fila dos avisos por email, comum aos dois caminhos que a alimentam.
--
-- O problema: os avisos de prazo nascem dentro da base de dados, de minuto a minuto, e os emails saem da
-- aplicação. Sem ponte, o avaliador vê o aviso na aplicação e mais nada — e um prazo de uma hora que só
-- aparece a quem estiver a olhar não é um aviso.
--
-- Dois caminhos, uma só fila:
--
--   1. **pg_net**, imediato: quando um aviso entra na fila, a base pede à aplicação que a esvazie.
--   2. **a verificação ao minuto**, que já corre: se ficar alguma linha para trás, volta a pedir. É isto
--      que dá as repetições dentro da hora.
--   3. **uma tarefa diária na aplicação**, rede de último recurso, para o caso de o próprio pg_net estar em
--      baixo. Diária e não mais frequente porque o plano atual da Vercel (Hobby) só permite uma vez por dia
--      e recusa o deploy a qualquer expressão mais frequente.
--
-- Nada disto promete entrega: o que se desencadeia é o **envio**. A entrega na caixa de correio depende do
-- Resend e do correio de destino, e não é coisa que esta fila possa garantir. E o aviso pessoal continua
-- visível na aplicação mesmo que o email nunca saia — é essa a garantia que existe.

create table public.avisos_por_email (
  id uuid primary key default gen_random_uuid(),
  -- Unicidade: um aviso entra na fila uma vez e só uma. É isto que impede duplicados, e não a esperança de
  -- que ninguém chame a função duas vezes.
  notification_id uuid not null unique references public.notifications (id) on delete cascade,
  -- A tentativa a que o aviso pertence, para a pertinência poder ser reconfirmada antes do envio.
  attempt_id uuid references public.survey_attempts (id) on delete cascade,
  destinatario uuid not null references auth.users (id) on delete cascade,
  assunto text not null check (length(btrim(assunto)) between 1 and 200),
  estado text not null default 'pendente'
    check (estado in ('pendente', 'a_enviar', 'enviado', 'falhou', 'dispensado')),
  tentativas int not null default 0 check (tentativas >= 0),
  proxima_tentativa_em timestamptz not null default now(),
  ultima_tentativa_em timestamptz,
  ultimo_erro text check (ultimo_erro is null or length(ultimo_erro) <= 500),
  enviado_em timestamptz,
  created_at timestamptz not null default now(),
  constraint avisos_por_email_enviado check ((estado = 'enviado') = (enviado_em is not null))
);

create index avisos_por_email_por_fazer on public.avisos_por_email (proxima_tentativa_em)
  where estado in ('pendente', 'a_enviar');

comment on table public.avisos_por_email is
  'Fila dos avisos que têm de sair por email. Alimentada pela base (pg_net e a verificação ao minuto) e '
  'esvaziada pela aplicação, que é quem fala com o serviço de correio. Guarda o resultado de cada tentativa.';

-- Ninguém lê esta fila pela API: é correspondência interna, e quem a esvazia usa a chave de serviço.
-- Fica com RLS ligado e sem políticas de propósito — é o que faz a tabela ser invisível a quem tem sessão.
alter table public.avisos_por_email enable row level security;
revoke all on public.avisos_por_email from anon, authenticated;

-- ---------------------------------------------------------------------------------------------------------
-- Pertinência
-- ---------------------------------------------------------------------------------------------------------

-- Um aviso deixa de ser pertinente quando a tentativa a que pertence desapareceu, ou quando o destinatário
-- já não é o avaliador daquela tentativa. Pode acontecer: a vaga passa a outro, e o aviso ainda estava na
-- fila. Nesse caso não se envia a ninguém.
create function private.aviso_pertinente(p_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1
    from public.avisos_por_email f
    join public.notifications n on n.id = f.notification_id
    left join public.survey_attempts a on a.id = f.attempt_id
    where f.id = p_id
      and n.user_id = f.destinatario
      and (f.attempt_id is null or (a.id is not null and a.vendedor_user_id = f.destinatario))
  );
$$;

-- ---------------------------------------------------------------------------------------------------------
-- Reclamar, e registar o resultado
-- ---------------------------------------------------------------------------------------------------------

-- Reclama linhas para enviar. Marca-as logo como `a_enviar`, por isso dois caminhos a correr ao mesmo tempo
-- não apanham a mesma linha: o `for update skip locked` faz o segundo saltar o que o primeiro já tem na mão.
create function private.reclamar_avisos(p_limite int default 20)
returns table (
  id uuid,
  destinatario uuid,
  assunto text,
  texto text,
  link text
)
language plpgsql security definer set search_path = '' as $$
begin
  -- Quem morreu a meio do envio volta à fila. Sem isto, uma função que falhe deixa a linha presa para sempre.
  update public.avisos_por_email
    set estado = 'pendente'
    where estado = 'a_enviar' and ultima_tentativa_em < now() - interval '5 minutes';

  -- O que deixou de ser pertinente dispensa-se antes de chegar às mãos de quem envia.
  update public.avisos_por_email f
    set estado = 'dispensado', ultimo_erro = 'O aviso deixou de ser pertinente.'
    where f.estado = 'pendente' and not private.aviso_pertinente(f.id);

  return query
    with escolhidos as (
      select f.id from public.avisos_por_email f
      where f.estado = 'pendente' and f.proxima_tentativa_em <= now()
      order by f.proxima_tentativa_em
      for update skip locked
      limit greatest(1, least(coalesce(p_limite, 20), 100))
    ),
    reclamados as (
      update public.avisos_por_email f
        set estado = 'a_enviar', tentativas = f.tentativas + 1, ultima_tentativa_em = now()
        where f.id in (select escolhidos.id from escolhidos)
        returning f.id, f.destinatario, f.assunto, f.notification_id
    )
    select r.id, r.destinatario, r.assunto, n.texto, n.link
    from reclamados r join public.notifications n on n.id = r.notification_id;
end $$;

-- O resultado de uma tentativa. Em caso de falha, volta à fila com recuo progressivo; à quinta, desiste e
-- fica registada como falhada — o aviso continua visível na aplicação, que é a garantia que se dá.
create function private.resultado_do_aviso(p_id uuid, p_ok boolean, p_erro text default null) returns void
language plpgsql security definer set search_path = '' as $$
declare
  n int;
begin
  if p_ok then
    update public.avisos_por_email
      set estado = 'enviado', enviado_em = now(), ultimo_erro = null
      where id = p_id and estado = 'a_enviar';
    return;
  end if;
  select tentativas into n from public.avisos_por_email where id = p_id;
  update public.avisos_por_email
    set estado = case when coalesce(n, 0) >= 5 then 'falhou' else 'pendente' end,
        ultimo_erro = left(coalesce(p_erro, 'sem razão registada'), 500),
        proxima_tentativa_em = now() + make_interval(mins => least(60, power(3, coalesce(n, 1))::int))
    where id = p_id and estado = 'a_enviar';
end $$;

-- ---------------------------------------------------------------------------------------------------------
-- Pedir à aplicação que esvazie a fila
-- ---------------------------------------------------------------------------------------------------------

-- Endereço e segredo vêm do Vault, nunca do código. Se faltar algum, não se faz nada — e não se escreve o
-- segredo em sítio nenhum, nem em erro.
--
-- Tudo dentro de um bloco que engole qualquer falha: esta chamada corre no meio da reserva de um
-- levantamento e no meio da verificação dos prazos, e **não pode fazer falhar nem atrasar nenhuma das
-- duas**. O pg_net é assíncrono — entrega o pedido a um trabalhador e devolve logo — mas mesmo que o
-- `net` ou o `vault` não existam, o que se perde é o email, não a transação.
create function private.pedir_envio_de_avisos() returns void
language plpgsql security definer set search_path = '' as $$
declare
  destino text;
  segredo text;
begin
  begin
    select decrypted_secret into destino from vault.decrypted_secrets where name = 'avisos_url' limit 1;
    select decrypted_secret into segredo from vault.decrypted_secrets where name = 'avisos_segredo' limit 1;
    if destino is null or segredo is null then return; end if;
    perform net.http_post(
      url := destino,
      headers := jsonb_build_object('Authorization', 'Bearer ' || segredo, 'Content-Type', 'application/json'),
      body := '{}'::jsonb,
      timeout_milliseconds := 2000
    );
  exception when others then
    return;
  end;
end $$;

-- Escrever um aviso pessoal **e** pô-lo na fila do email. Quem só quer o aviso na aplicação continua a usar
-- `private.notify_user`.
create function private.notify_user_por_email(
  p_user uuid, p_org uuid, p_texto text, p_link text, p_assunto text, p_attempt uuid default null
) returns void
language plpgsql security definer set search_path = '' as $$
declare
  aviso uuid;
begin
  if p_user is null then return; end if;
  insert into public.notifications (org_id, user_id, texto, link)
    values (p_org, p_user, p_texto, p_link) returning id into aviso;
  insert into public.avisos_por_email (notification_id, attempt_id, destinatario, assunto)
    values (aviso, p_attempt, p_user, p_assunto)
    on conflict (notification_id) do nothing;
  perform private.pedir_envio_de_avisos();
end $$;

revoke all on function private.aviso_pertinente(uuid), private.reclamar_avisos(int),
  private.resultado_do_aviso(uuid, boolean, text), private.pedir_envio_de_avisos(),
  private.notify_user_por_email(uuid, uuid, text, text, text, uuid) from public, anon, authenticated;

-- ---------------------------------------------------------------------------------------------------------
-- Os avisos de prazo passam a sair também por email
-- ---------------------------------------------------------------------------------------------------------

create or replace function private.libertar_tentativa(p_attempt uuid, p_motivo text) returns void
language plpgsql security definer set search_path = '' as $$
declare
  a public.survey_attempts;
begin
  update public.survey_attempts set estado = 'libertada', fecho_em = now(), fecho_motivo = p_motivo
    where id = p_attempt and estado = 'ativa' returning * into a;
  if a.id is null then return; end if;
  update public.request_surveys
    set status = 'aberto', vendedor_org_id = null, vendedor_user_id = null,
        reserved_at = null, reserve_deadline = null, contact_notes = '', scheduled_at = null
    where id = a.survey_id and status = 'reservado';
  perform private.notify_user_por_email(
    a.vendedor_user_id, a.vendedor_org_id,
    'Perdeu a reserva de um levantamento: ' || p_motivo,
    '/app/levantamentos',
    'Perdeu a reserva de um levantamento',
    a.id
  );
end $$;

create or replace function private.por_em_revisao(p_attempt uuid, p_motivo text) returns void
language plpgsql security definer set search_path = '' as $$
declare
  a public.survey_attempts;
begin
  update public.survey_attempts set estado = 'em_revisao', fecho_motivo = p_motivo
    where id = p_attempt and estado = 'ativa' returning * into a;
  if a.id is null then return; end if;
  perform private.notify_user_por_email(
    a.vendedor_user_id, a.vendedor_org_id,
    'Um levantamento seu está em análise pela plataforma: ' || p_motivo,
    '/app/levantamentos',
    'Um levantamento seu está em análise',
    a.id
  );
end $$;

-- A verificação ao minuto passa a ser também o motor das repetições: se ficou alguma linha para trás, volta
-- a pedir o esvaziamento. É o que dá tentativas dentro da hora num plano onde as tarefas da aplicação só
-- podem correr uma vez por dia.
create or replace function private.vencimentos_de_levantamentos() returns void
language plpgsql security definer set search_path = '' as $$
declare
  a public.survey_attempts;
begin
  for a in
    select * from public.survey_attempts
    where estado = 'ativa' and contacto_registado_em is null and prazo_contacto < now()
  loop
    perform private.libertar_tentativa(a.id, 'não registou o contacto com o cliente na primeira hora útil.');
  end loop;

  for a in
    select * from public.survey_attempts
    where estado = 'ativa' and private.prazo_efetivo(survey_attempts.*) < now()
  loop
    if a.contacto_registado_em is null then
      perform private.libertar_tentativa(a.id, 'o prazo de conclusão venceu sem contacto registado.');
    elsif a.resposta_cliente is null and a.agendado_para is not null then
      perform private.por_em_revisao(a.id, 'o prazo venceu à espera da confirmação do cliente.');
    elsif a.resposta_cliente = 'nao_contactado' then
      perform private.por_em_revisao(a.id, 'o cliente declarou não ter sido contactado.');
    elsif a.resposta_cliente in ('agendado_48h', 'adiado') then
      perform private.libertar_tentativa(a.id, 'a visita estava confirmada e o prazo venceu sem conclusão.');
    else
      perform private.libertar_tentativa(a.id, 'o prazo venceu sem agendamento registado.');
    end if;
  end loop;

  if exists (
    select 1 from public.avisos_por_email
    where estado in ('pendente', 'a_enviar') and proxima_tentativa_em <= now()
  ) then
    perform private.pedir_envio_de_avisos();
  end if;
end $$;

revoke all on function private.vencimentos_de_levantamentos() from public, anon, authenticated;

-- O pg_net só se instala onde existe (no Supabase; não na base de testes).
do $$
begin
  if exists (select 1 from pg_available_extensions where name = 'pg_net') then
    execute 'create extension if not exists pg_net';
  end if;
end $$;

-- ---------------------------------------------------------------------------------------------------------
-- A porta por onde a aplicação entra
-- ---------------------------------------------------------------------------------------------------------

-- As funções acima vivem no esquema privado, que a API não expõe — e é onde devem viver. Mas quem esvazia a
-- fila é a aplicação, que fala pela API, por isso precisa de uma porta no esquema público. Esta porta abre
-- **só à chave de serviço**: quem tem sessão de utilizador não a vê, e não há `grant` para `authenticated`
-- nem para `anon`. A chave de serviço nunca sai do servidor.
create function public.reclamar_avisos(p_limite int default 20)
returns table (id uuid, destinatario uuid, assunto text, texto text, link text)
language sql security definer set search_path = '' as $$
  select * from private.reclamar_avisos(p_limite);
$$;
revoke all on function public.reclamar_avisos(int) from public, anon, authenticated;
grant execute on function public.reclamar_avisos(int) to service_role;

create function public.resultado_do_aviso(p_id uuid, p_ok boolean, p_erro text default null) returns void
language sql security definer set search_path = '' as $$
  select private.resultado_do_aviso(p_id, p_ok, p_erro);
$$;
revoke all on function public.resultado_do_aviso(uuid, boolean, text) from public, anon, authenticated;
grant execute on function public.resultado_do_aviso(uuid, boolean, text) to service_role;
