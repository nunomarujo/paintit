-- A resposta ao pedido de esclarecimento passa a somar ao dossiê da obra, e quem perguntou passa a ser
-- avisado (pedidos 3 e 4 do promotor, 24/10/2026).
--
-- Até aqui faltavam duas coisas ao mecanismo de 20261024010647:
--
-- 1. **A resposta não ia a lado nenhum.** Ficava na coluna `resposta` da tentativa, e o único ecrã que a
--    lia era o do próprio vendedor. O pintor que perguntou não a via, e os outros pintores a orçamentar a
--    mesma obra — que beneficiam da mesma informação, já que a lista de dúvidas é conjunta — muito menos.
--    O promotor pediu que a resposta "aumente a info do dossier de avaliação do prédio mantendo a
--    anterior": por isso `survey_addenda` devolve **todas as rondas**, pela ordem em que aconteceram, com
--    as perguntas e a resposta de cada uma. Nada se substitui; acrescenta-se.
--
-- 2. **Ninguém era avisado.** `respond_clarification` gravava a resposta e ficava-se por aí. Agora avisa
--    as entidades de pintura que perguntaram e o cliente da obra.
--
-- Porquê uma função e não políticas de leitura mais largas: as dúvidas vivem em
-- `survey_clarification_items`, que guarda `painter_user_id`. Abrir essa tabela aos pintores daria a um
-- concorrente a forma de saber quem perguntou o quê — exatamente o que a decisão de 23/10/2026 proíbe
-- (lista conjunta e não identificada, nos dois sentidos). A função devolve só os textos, como já fazia
-- `clarification_batch` para o vendedor.

create function public.survey_addenda(p_request_survey_id uuid)
returns table (ronda int, aberta_em timestamptz, estado text, duvidas text[], resposta text, respondido_em timestamptz)
language sql stable security definer set search_path = '' as $$
  select
    row_number() over (order by c.created_at)::int as ronda,
    c.created_at as aberta_em,
    c.status as estado,
    coalesce(
      (select array_agg(i.texto order by i.created_at) from public.survey_clarification_items i where i.clarification_id = c.id),
      '{}'::text[]
    ) as duvidas,
    c.resposta,
    c.respondido_em
  from public.survey_clarifications c
  where c.request_survey_id = p_request_survey_id
    and (
      -- o cliente dono da obra
      private.can_access_org(private.request_org(private.survey_request(p_request_survey_id)))
      -- o vendedor atualmente responsável (ou um gestor da sua entidade)
      or (c.vendedor_org_id is not null and private.has_role(c.vendedor_org_id, array['proprietario', 'gestor', 'vendedor', 'financeiro']::public.member_role[]))
      -- qualquer pintor, enquanto o anúncio da obra estiver aberto: a informação é da obra, não de quem
      -- perguntou, e serve para orçamentar melhor
      or (private.is_painter() and private.listing_open(private.survey_request(p_request_survey_id)))
    )
  order by c.created_at;
$$;
revoke all on function public.survey_addenda(uuid) from public, anon;
grant execute on function public.survey_addenda(uuid) to authenticated;

-- Mesma função de antes, com os avisos no fim. O corpo até ao `raise` fica igual, carácter a carácter:
-- a única diferença é o bloco de avisos depois de a resposta estar gravada.
create or replace function public.respond_clarification(p_id uuid, p_resposta text) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_survey uuid;
  v_request uuid;
  r record;
begin
  update public.survey_clarifications c
    set status = 'respondido', resposta = left(btrim(p_resposta), 2000), respondido_em = now()
    where c.id = p_id and c.status = 'aberto' and c.confirmed_at is not null and c.respond_deadline >= now()
      and private.has_role(c.vendedor_org_id, array['proprietario', 'gestor', 'vendedor']::public.member_role[])
    returning c.request_survey_id into v_survey;
  if not found then
    raise exception 'Não foi possível responder: confirme que ainda está dentro do prazo.' using errcode = 'P0001';
  end if;

  v_request := private.survey_request(v_survey);

  -- Quem perguntou: avisa-se a entidade de pintura de cada pintor que levantou uma dúvida nesta ronda.
  -- `distinct` porque o mesmo pintor pode ter feito mais do que uma pergunta, e dois pintores podem
  -- pertencer à mesma entidade.
  for r in
    select distinct m.org_id
    from public.survey_clarification_items i
    join public.org_members m on m.user_id = i.painter_user_id
    join public.organizations o on o.id = m.org_id and o.kind = 'pintor'
    where i.clarification_id = p_id
  loop
    perform private.notify(r.org_id, 'Chegou resposta às dúvidas sobre o levantamento desta obra.', '/app/oportunidades/' || v_request);
  end loop;

  -- E o cliente, que fica a saber que a informação da sua obra ficou mais completa.
  perform private.notify(
    private.request_org(v_request),
    'O profissional respondeu às dúvidas dos pintores: o levantamento da sua obra ficou mais completo.',
    '/app/pedidos/' || v_request
  );
end $$;
