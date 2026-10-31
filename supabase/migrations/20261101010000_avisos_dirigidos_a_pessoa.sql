-- O aviso dirigido a uma pessoa, e não só a uma entidade.
--
-- Defeito encontrado a 31/10/2026, depois de a regra dos prazos entrar: **o avaliador não via nenhum aviso.**
-- A política de `notifications` deixa ler a quem tem papel `proprietario`, `gestor`, `financeiro` ou
-- `leitor` — e o avaliador é `vendedor`, que não está na lista. Os avisos que as funções novas escrevem
-- («perdeu a reserva», «está em análise», «o cliente confirmou») ficavam invisíveis exactamente a quem
-- tinha de os ler.
--
-- Com o verificador de prazos a correr ao minuto, isto significava tirar a vaga a alguém por não ter
-- cumprido um prazo de uma hora que nunca lhe foi comunicado por via nenhuma. Em ensaio não teve
-- consequência; com um avaliador real seria indefensável.
--
-- Pôr `vendedor` na política da entidade toda era o remendo errado: passaria a ver avisos de dinheiro, de
-- documentos e de subscrição que não lhe dizem respeito. Em vez disso, um aviso passa a poder ter **dono**:
-- quem é dono vê-o, e o resto da entidade continua a ver o que já via. Mais estreito, não mais largo.

alter table public.notifications
  add column if not exists user_id uuid references auth.users (id) on delete cascade;

comment on column public.notifications.user_id is
  'Quando preenchido, o aviso é desta pessoa: ela vê-o qualquer que seja o seu papel, e os papéis que veem '
  'os avisos da entidade continuam a ver os que não têm dono. Serve para avisos de prazo do avaliador, que '
  'é `vendedor` e não aparece na política da entidade.';

create index if not exists notifications_user_idx on public.notifications (user_id, created_at desc)
  where user_id is not null;

-- Quem é dono do aviso vê-o e marca-o como lido. O resto fica como estava.
drop policy if exists notifications_select on public.notifications;
create policy notifications_select on public.notifications for select to authenticated
  using (
    user_id = (select auth.uid())
    or (user_id is null
        and private.has_role(org_id, array['proprietario', 'gestor', 'financeiro', 'leitor']::public.member_role[]))
  );
drop policy if exists notifications_update on public.notifications;
create policy notifications_update on public.notifications for update to authenticated
  using (
    user_id = (select auth.uid())
    or (user_id is null
        and private.has_role(org_id, array['proprietario', 'gestor', 'financeiro', 'leitor']::public.member_role[]))
  )
  with check (
    user_id = (select auth.uid())
    or (user_id is null
        and private.has_role(org_id, array['proprietario', 'gestor', 'financeiro', 'leitor']::public.member_role[]))
  );

-- Avisar uma pessoa. Fica também com a entidade, para o aviso ter contexto de onde pertence.
create or replace function private.notify_user(p_user uuid, p_org uuid, p_texto text, p_link text) returns void
language sql security definer set search_path = '' as $$
  insert into public.notifications (org_id, user_id, texto, link) values (p_org, p_user, p_texto, p_link);
$$;
revoke all on function private.notify_user(uuid, uuid, text, text) from public, anon, authenticated;

-- As funções dos prazos passam a avisar a pessoa que reservou, não a entidade. É ela que tem de telefonar
-- dentro da hora, e era ela que não estava a ver nada.
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
  perform private.notify_user(
    a.vendedor_user_id, a.vendedor_org_id,
    'Perdeu a reserva de um levantamento: ' || p_motivo,
    '/app/levantamentos'
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
  perform private.notify_user(
    a.vendedor_user_id, a.vendedor_org_id,
    'Um levantamento seu está em análise pela plataforma: ' || p_motivo,
    '/app/levantamentos'
  );
end $$;

create or replace function public.answer_survey_schedule(
  p_attempt uuid,
  p_resposta text,
  p_data timestamptz default null
) returns public.survey_attempts
language plpgsql security definer set search_path = '' as $$
declare
  a public.survey_attempts;
  req uuid;
begin
  select * into a from public.survey_attempts where id = p_attempt;
  if a.id is null then
    raise exception 'Levantamento não encontrado.' using errcode = 'P0001';
  end if;
  req := private.survey_request(a.survey_id);
  if not private.can_manage_org(private.request_org(req)) then
    raise exception 'Só quem gere este pedido pode responder.' using errcode = 'P0001';
  end if;
  if a.estado <> 'ativa' then
    raise exception 'Esta visita já não está à espera de resposta.' using errcode = 'P0001';
  end if;
  if p_resposta not in ('agendado_48h', 'adiado', 'nao_contactado') then
    raise exception 'Resposta desconhecida.' using errcode = 'P0001';
  end if;

  if p_resposta = 'nao_contactado' then
    update public.survey_attempts
      set resposta_cliente = p_resposta, resposta_cliente_em = now()
      where id = p_attempt returning * into a;
    perform private.por_em_revisao(p_attempt, 'o cliente declarou não ter sido contactado.');
    select * into a from public.survey_attempts where id = p_attempt;
    return a;
  end if;

  if a.contacto_registado_em is null or a.agendado_para is null then
    raise exception 'Ainda não há agendamento registado para confirmar.' using errcode = 'P0001';
  end if;

  if p_resposta = 'adiado' then
    if p_data is null then
      raise exception 'Indique a data e a hora que combinou.' using errcode = 'P0001';
    end if;
    if p_data <= now() then
      raise exception 'A visita tem de ser marcada para um momento futuro.' using errcode = 'P0001';
    end if;
    if p_data > a.limite_adiamento then
      raise exception 'Essa data passa o limite de sete dias úteis (até %).',
        to_char(a.limite_adiamento at time zone 'Europe/Lisbon', 'DD/MM/YYYY "às" HH24"h"MI')
        using errcode = 'P0001';
    end if;
    update public.survey_attempts
      set resposta_cliente = p_resposta, resposta_cliente_em = now(), adiado_para = p_data, agendado_para = p_data
      where id = p_attempt returning * into a;
    update public.request_surveys set scheduled_at = a.agendado_para where id = a.survey_id;
  else
    update public.survey_attempts
      set resposta_cliente = p_resposta, resposta_cliente_em = now()
      where id = p_attempt returning * into a;
  end if;

  perform private.notify_user(
    a.vendedor_user_id, a.vendedor_org_id,
    case p_resposta when 'adiado' then 'O cliente confirmou a visita para a data que combinaram.'
                    else 'O cliente confirmou a visita agendada.' end,
    '/app/levantamentos'
  );
  return a;
end $$;
revoke all on function public.answer_survey_schedule(uuid, text, timestamptz) from public, anon;
grant execute on function public.answer_survey_schedule(uuid, text, timestamptz) to authenticated;
