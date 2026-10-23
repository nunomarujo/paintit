-- Pedido de esclarecimento ao vendedor sobre o levantamento (decisão de 23/10/2026, docs/DECISOES.md):
-- qualquer pintor que ache a informação do levantamento insuficiente para orçamentar pode pedir o que
-- falta. As dúvidas de todos os pintores dessa obra juntam-se numa única lista, sem identificar quem
-- perguntou (o vendedor nunca vê qual pintor perguntou o quê) nem o vendedor (o pintor nunca sabe quem
-- vai responder) — são mensagens associadas à obra e ao orçamento, nunca à pessoa, exatamente como o
-- resto da plataforma (CLAUDE.md, regra 6). Este mecanismo só serve para esclarecimentos: nunca para
-- pedir um levantamento novo nem qualquer outra tarefa (ver can_access_as_surveyor, que continua restrito
-- à reserva original).
--
-- Prazo em dois marcos fixos, sem perda parcial a meio (o promotor rejeitou um desconto proporcional por
-- atraso): um dia para confirmar, na aplicação, que vai à obra; mais um dia para lá ir e responder
-- (src/domain/clarification.ts). Falhar qualquer marco custa a comissão desta obra por completo — sem
-- valor parcial — e o esclarecimento passa a estar disponível para qualquer outro vendedor da zona que
-- ainda não tenha falhado nesta mesma obra reservar (primeiro a reservar, avança — mesmo padrão de
-- reserve_survey). Quem reserva o esclarecimento herda, a partir desse momento, a comissão de todo o
-- levantamento (request_surveys.vendedor_org_id/vendedor_user_id, de onde settleSurveyPayout já lê em
-- tempo real no momento em que a comissão do pintor é confirmada — não há aqui nenhuma duplicação das
-- regras de pagamento): é essa transferência de responsabilidade, não a visita original, que decide quem
-- fica aliado do processo.

alter table public.request_surveys
  add column clarification_excluded_orgs uuid[] not null default '{}';

create function private.survey_request(p_request_survey uuid) returns uuid
language sql stable security definer set search_path = '' as $$
  select request_id from public.request_surveys where id = p_request_survey;
$$;

-- Esta entidade já falhou um esclarecimento desta mesma obra? Função isolada (em vez da comparação
-- "= any (...)" direta na política) por ser a forma que o motor de testes em memória aceita sem ambiguidade.
create function private.clarification_excluded(p_request_survey uuid, p_org uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce((select p_org = any (clarification_excluded_orgs) from public.request_surveys where id = p_request_survey), false);
$$;

-- Uma linha por tentativa de resposta (nunca mais que uma "aberta" ao mesmo tempo, por levantamento).
-- vendedor_org_id/vendedor_user_id ficam nulos enquanto a tentativa está por reservar (só acontece depois
-- de uma escalada: a primeira tentativa já nasce atribuída ao vendedor do levantamento).
create table public.survey_clarifications (
  id uuid primary key default gen_random_uuid(),
  request_survey_id uuid not null references public.request_surveys (id) on delete cascade,
  status text not null default 'aberto' check (status in ('aberto', 'respondido', 'expirado')),
  vendedor_org_id uuid references public.organizations (id),
  vendedor_user_id uuid references auth.users (id),
  confirm_deadline timestamptz,
  confirmed_at timestamptz,
  respond_deadline timestamptz,
  resposta text check (resposta is null or length(resposta) <= 2000),
  respondido_em timestamptz,
  created_at timestamptz not null default now(),
  constraint survey_clarifications_assigned check (vendedor_org_id is null or confirm_deadline is not null)
);
create index survey_clarifications_survey_idx on public.survey_clarifications (request_survey_id);
-- Nunca duas tentativas abertas ao mesmo tempo para o mesmo levantamento.
create unique index survey_clarifications_one_open on public.survey_clarifications (request_survey_id) where status = 'aberto';
create index survey_clarifications_claimable_idx on public.survey_clarifications (request_survey_id) where status = 'aberto' and vendedor_org_id is null;

-- As dúvidas em si, uma por pintor e por pergunta. Ficam ligadas à tentativa em que foram levantadas;
-- uma escalada reatribui as que ainda não tiveram resposta à tentativa nova (não se perdem, nem o
-- vendedor seguinte começa do zero sem saber o que foi pedido).
create table public.survey_clarification_items (
  id uuid primary key default gen_random_uuid(),
  clarification_id uuid not null references public.survey_clarifications (id) on delete cascade,
  painter_user_id uuid not null references auth.users (id),
  texto text not null check (length(texto) between 1 and 2000),
  created_at timestamptz not null default now()
);
create index survey_clarification_items_clarification_idx on public.survey_clarification_items (clarification_id);
create index survey_clarification_items_painter_idx on public.survey_clarification_items (painter_user_id);

-- Ponto de entrada único do pintor: junta-se à tentativa já aberta para este levantamento, ou abre uma
-- nova (atribuída ao vendedor atual do levantamento). O texto já passou por guardContact na aplicação,
-- como qualquer outro campo livre (pedidos/actions.ts) — aqui só se guarda.
create function public.request_painter_doubt(p_request_survey_id uuid, p_texto text) returns void
language plpgsql security definer set search_path = '' as $$
declare
  s public.request_surveys;
  c public.survey_clarifications;
begin
  if not private.is_painter() then
    raise exception 'Só um pintor pode pedir esclarecimento.' using errcode = 'P0001';
  end if;
  select * into s from public.request_surveys where id = p_request_survey_id;
  if not found or s.status <> 'concluido' or not private.listing_open(s.request_id) then
    raise exception 'Não é possível pedir esclarecimento sobre este levantamento.' using errcode = 'P0001';
  end if;
  select * into c from public.survey_clarifications where request_survey_id = s.id and status = 'aberto';
  if not found then
    insert into public.survey_clarifications (request_survey_id, vendedor_org_id, vendedor_user_id, confirm_deadline)
      values (s.id, s.vendedor_org_id, s.vendedor_user_id, now() + interval '24 hours')
      returning * into c;
  end if;
  insert into public.survey_clarification_items (clarification_id, painter_user_id, texto)
    values (c.id, (select auth.uid()), left(btrim(p_texto), 2000));
  if c.vendedor_org_id is not null then
    perform private.notify(c.vendedor_org_id, 'Um pintor pediu esclarecimento sobre o levantamento desta obra.', '/app/levantamentos/' || s.id);
  end if;
end $$;
revoke all on function public.request_painter_doubt(uuid, text) from public, anon;
grant execute on function public.request_painter_doubt(uuid, text) to authenticated;

-- Lista conjunta e não identificada, para o vendedor responder de uma vez — nunca o pintor que perguntou
-- cada linha. Só quem está atualmente responsável por esta tentativa (ou um gestor da sua entidade) a vê.
create function public.clarification_batch(p_clarification_id uuid) returns table (texto text, created_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select i.texto, i.created_at
  from public.survey_clarification_items i
  join public.survey_clarifications c on c.id = i.clarification_id
  where i.clarification_id = p_clarification_id
    and private.has_role(c.vendedor_org_id, array['proprietario', 'gestor', 'vendedor']::public.member_role[]);
$$;
revoke all on function public.clarification_batch(uuid) from public, anon;
grant execute on function public.clarification_batch(uuid) to authenticated;

-- Dia 1: só confirma que vai. Começa a contar o dia 2 a partir deste momento, nunca do início do pedido.
create function public.confirm_clarification(p_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  update public.survey_clarifications c
    set confirmed_at = now(), respond_deadline = now() + interval '24 hours'
    where c.id = p_id and c.status = 'aberto' and c.confirmed_at is null and c.confirm_deadline >= now()
      and private.has_role(c.vendedor_org_id, array['proprietario', 'gestor', 'vendedor']::public.member_role[]);
  if not found then
    raise exception 'Não foi possível confirmar: o prazo pode já ter terminado.' using errcode = 'P0001';
  end if;
end $$;
revoke all on function public.confirm_clarification(uuid) from public, anon;
grant execute on function public.confirm_clarification(uuid) to authenticated;

-- Dia 2: a resposta à lista conjunta. O texto já passou por guardContact na aplicação.
create function public.respond_clarification(p_id uuid, p_resposta text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  update public.survey_clarifications c
    set status = 'respondido', resposta = left(btrim(p_resposta), 2000), respondido_em = now()
    where c.id = p_id and c.status = 'aberto' and c.confirmed_at is not null and c.respond_deadline >= now()
      and private.has_role(c.vendedor_org_id, array['proprietario', 'gestor', 'vendedor']::public.member_role[]);
  if not found then
    raise exception 'Não foi possível responder: confirme que ainda está dentro do prazo.' using errcode = 'P0001';
  end if;
end $$;
revoke all on function public.respond_clarification(uuid, text) from public, anon;
grant execute on function public.respond_clarification(uuid, text) to authenticated;

-- Reserva de uma tentativa escalada (sem vendedor ainda): primeiro a chegar, avança — mesmo padrão de
-- reserve_survey. Transfere já aqui a comissão de todo o levantamento para quem reservar: é o momento em
-- que este vendedor passa a ser o aliado do processo, não a visita original.
create function public.claim_clarification(p_id uuid, p_org uuid) returns public.survey_clarifications
language plpgsql security definer set search_path = '' as $$
declare
  c public.survey_clarifications;
  s public.request_surveys;
begin
  if not exists (select 1 from public.organizations where id = p_org and kind = 'fornecedor') then
    raise exception 'Só um fornecedor pode reservar um esclarecimento.' using errcode = 'P0001';
  end if;
  if not private.has_role(p_org, array['proprietario', 'gestor', 'vendedor']::public.member_role[]) then
    raise exception 'Sem permissão para reservar por esta entidade.' using errcode = 'P0001';
  end if;
  select * into s from public.request_surveys where id = (select request_survey_id from public.survey_clarifications where id = p_id) for update;
  if p_org = any (s.clarification_excluded_orgs) then
    raise exception 'Esta entidade já não pode reservar este esclarecimento.' using errcode = 'P0001';
  end if;
  update public.survey_clarifications sc
    set vendedor_org_id = p_org, vendedor_user_id = (select auth.uid()), confirm_deadline = now() + interval '24 hours'
    where sc.id = p_id and sc.status = 'aberto' and sc.vendedor_org_id is null
      and private.supplier_covers(p_org, private.request_concelho(s.request_id))
    returning * into c;
  if c.id is null then
    raise exception 'Este esclarecimento já não está disponível.' using errcode = 'P0001';
  end if;
  update public.request_surveys set vendedor_org_id = p_org, vendedor_user_id = c.vendedor_user_id where id = s.id;
  return c;
end $$;
revoke all on function public.claim_clarification(uuid, uuid) from public, anon;
grant execute on function public.claim_clarification(uuid, uuid) to authenticated;

alter table public.survey_clarifications enable row level security;
revoke all on public.survey_clarifications from anon;
revoke insert, update, delete on public.survey_clarifications from authenticated;
create policy survey_clarifications_select on public.survey_clarifications for select to authenticated
  using (
    private.can_access_org(private.request_org(private.survey_request(request_survey_id)))
    or (vendedor_org_id is not null and private.has_role(vendedor_org_id, array['proprietario', 'gestor', 'vendedor', 'financeiro']::public.member_role[]))
    or (
      status = 'aberto' and vendedor_org_id is null
      and exists (
        select 1 from public.org_members m join public.organizations o on o.id = m.org_id
        where m.user_id = (select auth.uid())
          and o.kind = 'fornecedor'
          and m.role in ('proprietario', 'gestor', 'vendedor')
          and not private.clarification_excluded(request_survey_id, m.org_id)
          and private.supplier_covers(m.org_id, private.request_concelho(private.survey_request(request_survey_id)))
      )
    )
    or exists (select 1 from public.survey_clarification_items i where i.clarification_id = survey_clarifications.id and i.painter_user_id = (select auth.uid()))
  );

alter table public.survey_clarification_items enable row level security;
revoke all on public.survey_clarification_items from anon;
revoke insert, update, delete on public.survey_clarification_items from authenticated;
-- Nunca uma política para o vendedor aqui: vê só pela função clarification_batch, sem identificação.
create function private.clarification_survey(p_clarification uuid) returns uuid
language sql stable security definer set search_path = '' as $$
  select request_survey_id from public.survey_clarifications where id = p_clarification;
$$;

create policy survey_clarification_items_select on public.survey_clarification_items for select to authenticated
  using (
    painter_user_id = (select auth.uid())
    or private.can_access_org(private.request_org(private.survey_request(private.clarification_survey(clarification_id))))
  );

revoke all on function private.listing_open(uuid) from public, anon;
grant execute on function private.listing_open(uuid) to authenticated;

-- Escalada automática: mesmo padrão de reserva vencida do levantamento original (daily_maintenance,
-- 20261023143658), agora com um quinto bloco. "create or replace" substitui o corpo todo — os quatro
-- blocos existentes ficam iguais.
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

  -- Reserva de um levantamento vencida: liberta-se para qualquer fornecedor da zona voltar a
  -- reservar (mesma obra, mesma linha); o aviso ao cliente é o próprio gatilho
  -- request_surveys_notify, que corre nesta mesma transação por causa deste update.
  update public.request_surveys
    set status = 'aberto', vendedor_org_id = null, vendedor_user_id = null,
        reserved_at = null, reserve_deadline = null, contact_notes = '', scheduled_at = null
    where status = 'reservado' and reserve_deadline < now();

  -- Pedido de esclarecimento vencido (dia 1 não confirmado, ou dia 2 sem resposta): o vendedor atual
  -- perde a comissão desta obra por completo e fica impedido de voltar a reservar este esclarecimento;
  -- se ainda houver outro fornecedor da zona por tentar, abre-se uma tentativa nova por reservar, com as
  -- dúvidas ainda sem resposta transferidas para ela. Sem fornecedor que sirva — fica por esclarecer,
  -- visível à equipa da plataforma pelo estado 'expirado' sem sucessora.
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
