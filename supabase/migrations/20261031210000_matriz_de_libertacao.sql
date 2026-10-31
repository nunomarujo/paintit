-- A matriz de libertação, verificada ao minuto.
--
-- Regra do promotor, 31/10/2026: «A verificação de vencimentos corre a cada minuto», pela hora exata de
-- vencimento. A manutenção diária das 05:00 servia para um prazo de 48 horas e não serve para um marco de
-- uma hora útil: quem falhasse o contacto às 10h00 só perderia a vaga na madrugada seguinte, e o avaliador
-- seguinte só seria avisado aí.
--
-- A matriz, tal como ele a fechou:
--
--   | ao vencer                                              | o que acontece                               |
--   | 1.ª hora útil vencida, nada registado                  | liberta e redistribui                        |
--   | 48 h vencidas sem contacto registado                   | liberta                                      |
--   | 48 h vencidas COM contacto e agendamento, cliente      | revisão da plataforma; sem redistribuição    |
--   |   calado                                               |   nem penalização automáticas                |
--   | cliente respondeu «não fui contactado»                 | revisão, com as duas declarações preservadas |
--   | visita confirmada e prazo incumprido pelo avaliador     | liberta e redistribui                        |
--
-- A distinção entre as duas últimas linhas é toda a substância: cliente calado é revisão, porque quem cumpriu
-- não pode perder o trabalho pelo silêncio de outra pessoa; cliente que confirmou e avaliador que faltou é
-- libertação, porque o incumprimento está provado pela confirmação do próprio cliente.
--
-- E libertar NUNCA apaga: fecha a tentativa e abre a vaga. O contacto, o agendamento e a resposta do cliente
-- ficam na tentativa fechada, que é a única prova numa revisão. É por isso que o bloco de levantamentos sai
-- da manutenção diária — ele apagava tudo.

-- Quem já teve esta vaga e a perdeu não volta a concorrer a ELA. Noutra vaga concorre como qualquer outro.
-- Derivado das tentativas, não guardado à parte: dois sítios com a mesma verdade acabam sempre a divergir.
create function private.tentativa_excluida(p_survey uuid, p_org uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.survey_attempts a
    where a.survey_id = p_survey and a.vendedor_org_id = p_org and a.estado = 'libertada'
  );
$$;

-- O prazo que de facto conta: a data acordada com o cliente, quando houve adiamento, senão as 48 horas.
create function private.prazo_efetivo(a public.survey_attempts) returns timestamptz
language sql immutable set search_path = '' as $$
  select coalesce(a.adiado_para, a.prazo_conclusao);
$$;

-- Fecha uma tentativa e devolve a vaga à praça, sem apagar nada do que lá está registado.
create function private.libertar_tentativa(p_attempt uuid, p_motivo text) returns void
language plpgsql security definer set search_path = '' as $$
declare
  a public.survey_attempts;
begin
  update public.survey_attempts set estado = 'libertada', fecho_em = now(), fecho_motivo = p_motivo
    where id = p_attempt and estado = 'ativa' returning * into a;
  if a.id is null then return; end if;
  -- As colunas antigas de request_surveys continuam a existir e a ser lidas por ecrãs que ainda não passaram
  -- para a tentativa; limpá-las aqui é devolver a linha ao estado "aberto", não perder informação — o que
  -- estava registado ficou na tentativa fechada.
  update public.request_surveys
    set status = 'aberto', vendedor_org_id = null, vendedor_user_id = null,
        reserved_at = null, reserve_deadline = null, contact_notes = '', scheduled_at = null
    where id = a.survey_id and status = 'reservado';
  perform private.notify(
    a.vendedor_org_id,
    'Perdeu a reserva de um levantamento: ' || p_motivo,
    '/app/levantamentos'
  );
end $$;

-- Põe a tentativa em revisão da plataforma. Não liberta a vaga, não mexe na comissão, não toca no ranking.
create function private.por_em_revisao(p_attempt uuid, p_motivo text) returns void
language plpgsql security definer set search_path = '' as $$
declare
  a public.survey_attempts;
begin
  update public.survey_attempts set estado = 'em_revisao', fecho_motivo = p_motivo
    where id = p_attempt and estado = 'ativa' returning * into a;
  if a.id is null then return; end if;
  perform private.notify(
    a.vendedor_org_id,
    'Um levantamento seu está em análise pela plataforma: ' || p_motivo,
    '/app/levantamentos'
  );
end $$;

-- A verificação ao minuto. Lê a hora exata de vencimento; não arredonda nada.
create function private.vencimentos_de_levantamentos() returns void
language plpgsql security definer set search_path = '' as $$
declare
  a public.survey_attempts;
begin
  -- 1. Primeira hora útil vencida sem contacto registado → liberta e redistribui.
  for a in
    select * from public.survey_attempts
    where estado = 'ativa' and contacto_registado_em is null and prazo_contacto < now()
  loop
    perform private.libertar_tentativa(a.id, 'não registou o contacto com o cliente na primeira hora útil.');
  end loop;

  -- 2 a 5. Prazo de conclusão vencido. O que acontece depende do que está registado.
  for a in
    select * from public.survey_attempts
    where estado = 'ativa' and private.prazo_efetivo(survey_attempts.*) < now()
  loop
    if a.contacto_registado_em is null then
      -- 2. Sem contacto registado: a falta fala por si, não há nada para rever.
      perform private.libertar_tentativa(a.id, 'o prazo de conclusão venceu sem contacto registado.');
    elsif a.resposta_cliente is null and a.agendado_para is not null then
      -- 3. Contactou, agendou, e o cliente nunca respondeu. Revisão — não perde a vaga pelo silêncio dele.
      perform private.por_em_revisao(a.id, 'o prazo venceu à espera da confirmação do cliente.');
    elsif a.resposta_cliente = 'nao_contactado' then
      -- 4. Rede de segurança: a revisão abre-se no momento da resposta, mas se algo falhou, abre aqui.
      perform private.por_em_revisao(a.id, 'o cliente declarou não ter sido contactado.');
    elsif a.resposta_cliente in ('agendado_48h', 'adiado') then
      -- 5. O cliente confirmou e o prazo passou: o incumprimento é do avaliador, e está provado.
      perform private.libertar_tentativa(a.id, 'a visita estava confirmada e o prazo venceu sem conclusão.');
    else
      -- Contactou mas não agendou nada, e o cliente nada tinha para confirmar.
      perform private.libertar_tentativa(a.id, 'o prazo venceu sem agendamento registado.');
    end if;
  end loop;
end $$;

revoke all on function private.tentativa_excluida(uuid, uuid), private.prazo_efetivo(public.survey_attempts),
  private.libertar_tentativa(uuid, text), private.por_em_revisao(uuid, text),
  private.vencimentos_de_levantamentos() from public, anon, authenticated;

-- A reserva passa a recusar quem já teve esta vaga e a perdeu.
create or replace function public.reserve_survey(p_survey_id uuid, p_org uuid) returns public.request_surveys
language plpgsql security definer set search_path = '' as $$
declare
  r public.request_surveys;
  p record;
  n int;
begin
  if not exists (select 1 from public.organizations where id = p_org and kind = 'fornecedor') then
    raise exception 'Só um fornecedor pode reservar um levantamento.' using errcode = 'P0001';
  end if;
  if not private.has_role(p_org, array['proprietario', 'gestor', 'vendedor']::public.member_role[]) then
    raise exception 'Sem permissão para reservar por esta entidade.' using errcode = 'P0001';
  end if;
  if private.tentativa_excluida(p_survey_id, p_org) then
    raise exception 'Já teve este levantamento reservado e perdeu o prazo: esta oportunidade segue para outro fornecedor.'
      using errcode = 'P0001';
  end if;
  select * into p from private.prazos_da_reserva(now());
  update public.request_surveys s
    set status = 'reservado', vendedor_org_id = p_org, vendedor_user_id = (select auth.uid()),
        reserved_at = now(), reserve_deadline = p.prazo_conclusao,
        contact_notes = '', scheduled_at = null
    where s.id = p_survey_id and s.status = 'aberto'
      and private.supplier_covers(p_org, private.request_concelho(s.request_id))
    returning * into r;
  if r.id is null then
    raise exception 'Este levantamento já não está disponível (reservado por outro fornecedor, ou fora da sua zona).' using errcode = 'P0001';
  end if;
  select coalesce(max(a.numero), 0) + 1 into n from public.survey_attempts a where a.survey_id = r.id;
  insert into public.survey_attempts (
    survey_id, numero, vendedor_org_id, vendedor_user_id, aceita_em,
    prazo_contacto, prazo_conclusao, limite_adiamento
  ) values (r.id, n, p_org, (select auth.uid()), now(), p.prazo_contacto, p.prazo_conclusao, p.limite_adiamento);
  return r;
end $$;
revoke all on function public.reserve_survey(uuid, uuid) from public, anon;
grant execute on function public.reserve_survey(uuid, uuid) to authenticated;

-- A manutenção diária deixa de mexer em levantamentos. O bloco que o fazia apagava o contacto e o
-- agendamento, e isso passou a ser proibido; os prazos passam a ser verificados ao minuto, não de madrugada.
-- Os outros quatro blocos ficam exatamente como estavam.
create or replace function private.daily_maintenance() returns void
language plpgsql security definer set search_path = '' as $$
declare
  today date := (now() at time zone 'Europe/Lisbon')::date;
  r record;
begin
  for r in
    update public.org_documents set status = 'expirado'
    where status = 'aprovado' and valido_ate is not null and valido_ate < today
    returning org_id
  loop
    perform private.notify(r.org_id, 'Um documento de verificação expirou: envie a versão atual.', '/app/organizacoes/' || r.org_id);
  end loop;

  for r in
    select org_id from public.org_documents
    where status = 'aprovado' and valido_ate = today + 30
  loop
    perform private.notify(r.org_id, 'Um documento de verificação expira daqui a 30 dias.', '/app/organizacoes/' || r.org_id);
  end loop;

  for r in
    update public.request_listings set aberto = false
    where aberto and prazo_propostas < today
    returning request_id
  loop
    perform private.notify(
      private.request_org(r.request_id),
      'Terminou o prazo de propostas: compare e escolha.',
      '/app/pedidos/' || r.request_id || '/propostas'
    );
  end loop;

  -- (O bloco das reservas de levantamento vivia aqui. Passou para private.vencimentos_de_levantamentos,
  -- que corre ao minuto e nunca apaga registos.)

  for r in
    select c.* from public.survey_clarifications c
    where c.status = 'aberto' and c.vendedor_org_id is not null
      and ((c.confirmed_at is null and c.confirm_deadline < now()) or (c.confirmed_at is not null and c.respond_deadline < now()))
  loop
    update public.survey_clarifications set status = 'expirado' where id = r.id;
    update public.request_surveys set clarification_excluded_orgs = array_append(clarification_excluded_orgs, r.vendedor_org_id) where id = r.request_survey_id;
    perform private.notify(
      private.request_org(private.survey_request(r.request_survey_id)),
      'O profissional não esclareceu a tempo: outro vai assumir, se houver disponível na zona.',
      '/app/pedidos/' || private.survey_request(r.request_survey_id)
    );
    if exists (
      select 1 from public.org_members m join public.organizations o on o.id = m.org_id
      where o.kind = 'fornecedor' and m.role in ('proprietario', 'gestor', 'vendedor')
        and not private.clarification_excluded(r.request_survey_id, m.org_id)
        and private.supplier_covers(m.org_id, private.request_concelho(private.survey_request(r.request_survey_id)))
    ) then
      declare
        new_id uuid;
      begin
        insert into public.survey_clarifications (request_survey_id) values (r.request_survey_id) returning id into new_id;
        update public.survey_clarification_items set clarification_id = new_id where clarification_id = r.id;
      end;
    end if;
  end loop;
end $$;

-- Agendamento ao minuto: só onde existe pg_cron (no Supabase; não na base de testes).
do $$
begin
  if exists (select 1 from pg_available_extensions where name = 'pg_cron') then
    execute 'create extension if not exists pg_cron';
    execute $cron$select cron.schedule('quempinta-vencimentos-ao-minuto', '* * * * *', 'select private.vencimentos_de_levantamentos()')$cron$;
  end if;
end $$;
