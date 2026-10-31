-- Registar o contacto, e a resposta do cliente. As duas vias de escrita da tentativa.
--
-- Vivem em funções e não em políticas porque as regras são de prazo e de assimetria, não de pertença:
--
--   · o avaliador registra o contacto e a data acordada, mas **nunca pode marcar para além das 48 horas**.
--     «Não deixes o avaliador conceder a si próprio uma extensão» — só o cliente pode pedir data posterior;
--   · o cliente responde uma de três, e é a resposta dele que move (ou não) o prazo;
--   · «não fui contactado» não liberta nada nem penaliza ninguém: abre revisão da plataforma, com as duas
--     declarações guardadas. Quem decide é uma pessoa.
--
-- Regras do promotor, 31/10/2026.

-- ---------------------------------------------------------------------------------------------------------
-- O avaliador: registar o contacto e o agendamento
-- ---------------------------------------------------------------------------------------------------------

create function public.register_survey_contact(
  p_attempt uuid,
  p_notas text,
  p_agendado_para timestamptz
) returns public.survey_attempts
language plpgsql security definer set search_path = '' as $$
declare
  a public.survey_attempts;
begin
  select * into a from public.survey_attempts where id = p_attempt;
  if a.id is null then
    raise exception 'Levantamento não encontrado.' using errcode = 'P0001';
  end if;
  if not private.has_role(a.vendedor_org_id, array['proprietario', 'gestor', 'vendedor']::public.member_role[]) then
    raise exception 'Só quem reservou este levantamento pode registar o contacto.' using errcode = 'P0001';
  end if;
  if a.estado <> 'ativa' then
    raise exception 'Este levantamento já não está a decorrer.' using errcode = 'P0001';
  end if;
  if coalesce(trim(p_notas), '') = '' then
    raise exception 'Descreva o contacto: é o registo que fica como prova.' using errcode = 'P0001';
  end if;
  if p_agendado_para is null then
    raise exception 'Indique a data e a hora acordadas com o cliente.' using errcode = 'P0001';
  end if;
  if p_agendado_para <= now() then
    raise exception 'A visita tem de ser marcada para um momento futuro.' using errcode = 'P0001';
  end if;
  -- A assimetria, e é esta linha que a garante: o avaliador não se dá uma extensão a si próprio.
  if p_agendado_para > a.prazo_conclusao then
    raise exception 'Essa data passa as 48 horas. Só o cliente pode pedir data posterior, e tem de o fazer na confirmação.'
      using errcode = 'P0001';
  end if;
  update public.survey_attempts
    set contacto_registado_em = now(), contacto_notas = trim(p_notas), agendado_para = p_agendado_para,
        -- A resposta do cliente volta ao início: o que ele confirmou foi outra data.
        resposta_cliente = null, resposta_cliente_em = null, adiado_para = null
    where id = p_attempt returning * into a;
  -- Espelho nas colunas antigas, para os ecrãs que ainda não leem da tentativa.
  update public.request_surveys set contact_notes = a.contacto_notas, scheduled_at = a.agendado_para
    where id = a.survey_id;
  perform private.notify(
    private.request_org(private.survey_request(a.survey_id)),
    'A visita para o levantamento está marcada: confirme se corresponde ao que combinou.',
    '/app/pedidos/' || private.survey_request(a.survey_id)
  );
  return a;
end $$;
revoke all on function public.register_survey_contact(uuid, text, timestamptz) from public, anon;
grant execute on function public.register_survey_contact(uuid, text, timestamptz) to authenticated;

-- ---------------------------------------------------------------------------------------------------------
-- O cliente: o que ele vê, e as três respostas
-- ---------------------------------------------------------------------------------------------------------

-- O cliente tem de poder confirmar o agendamento sem saber quem é o avaliador (regra 6: anonimato até à
-- apresentação). Por isso não leva política na tabela — leva esta função, que devolve só o que lhe diz
-- respeito. Nada de `vendedor_org_id`, nada de notas internas do contacto.
create function public.survey_schedule_for_client(p_request uuid)
returns table (
  attempt_id uuid,
  agendado_para timestamptz,
  prazo_conclusao timestamptz,
  limite_adiamento timestamptz,
  resposta_cliente text,
  resposta_cliente_em timestamptz,
  adiado_para timestamptz,
  por_responder boolean
)
language sql stable security definer set search_path = '' as $$
  select a.id, a.agendado_para, coalesce(a.adiado_para, a.prazo_conclusao), a.limite_adiamento,
         a.resposta_cliente, a.resposta_cliente_em, a.adiado_para,
         (a.estado = 'ativa' and a.contacto_registado_em is not null and a.resposta_cliente is null)
  from public.survey_attempts a
  join public.request_surveys s on s.id = a.survey_id
  where s.request_id = p_request
    and a.estado in ('ativa', 'em_revisao')
    and private.can_manage_org(private.request_org(p_request));
$$;
revoke all on function public.survey_schedule_for_client(uuid) from public, anon;
grant execute on function public.survey_schedule_for_client(uuid) to authenticated;

-- As três respostas. A ordem em que são apresentadas está no ecrã, não aqui; aqui está o que cada uma faz.
create function public.answer_survey_schedule(
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
    -- Nem liberta a vaga, nem mexe na comissão, nem toca no ranking: fica uma pessoa a ver os dois registos.
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
    -- O teto são sete dias úteis depois do início das 48 horas, à mesma hora. A tabela também o verifica;
    -- aqui verifica-se para o erro ser legível em vez de uma violação de restrição.
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

  perform private.notify(
    a.vendedor_org_id,
    case p_resposta when 'adiado' then 'O cliente confirmou a visita para a data que combinaram.'
                    else 'O cliente confirmou a visita agendada.' end,
    '/app/levantamentos'
  );
  return a;
end $$;
revoke all on function public.answer_survey_schedule(uuid, text, timestamptz) from public, anon;
grant execute on function public.answer_survey_schedule(uuid, text, timestamptz) to authenticated;
