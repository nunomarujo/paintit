-- Entrega simultânea das propostas (26/10/2026, decisão do promotor).
--
-- O percurso é: o cliente abre a obra com um prazo para receber propostas; no fim desse prazo as
-- propostas são entregues **todas ao mesmo tempo**; seguem-se três dias para esclarecimentos pelo
-- canal anónimo que já existe; e só então o cliente escolhe (ou não).
--
-- Até hoje faltava a primeira parte, e não era só no ecrã: `proposals_select` autorizava o cliente a
-- ler qualquer proposta que não fosse rascunho, no instante em que era submetida. O primeiro pintor a
-- entregar ficava com o preço à vista durante dias, enquanto os outros ainda orçamentavam — e quem
-- entrega no último dia leva vantagem. A concorrência deixava de ser cega por construção.
--
-- A porta fica na base de dados, não no ecrã: é a regra de acesso que a garante.

create or replace function private.propostas_entregues(p_request uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.request_listings l
    where l.request_id = p_request
      -- Ou o prazo acabou, ou o cliente encerrou o anúncio mais cedo (e aí não há concorrente
      -- nenhum exposto: encerrar fecha a porta a novas propostas).
      and (not l.aberto or (now() at time zone 'Europe/Lisbon')::date > l.prazo_propostas)
  );
$$;

-- O cliente só lê a proposta depois da entrega. O pintor lê sempre a sua.
drop policy if exists proposals_select on public.proposals;
create policy proposals_select on public.proposals for select to authenticated
  using (
    private.can_access_org(painter_org_id)
    or (
      status <> 'rascunho'
      and private.can_access_org(private.request_org(request_id))
      and private.propostas_entregues(request_id)
    )
  );

-- As linhas da proposta seguem a mesma porta: sem isto, o preço lia-se na mesma, linha a linha.
create or replace function private.proposal_visible(p_proposal uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.proposals p
    where p.id = p_proposal
      and (
        private.can_access_org(p.painter_org_id)
        or (
          p.status <> 'rascunho'
          and private.can_access_org(private.request_org(p.request_id))
          and private.propostas_entregues(p.request_id)
        )
      )
  );
$$;

-- E as mensagens: o pintor pode escrever antes da entrega, mas o cliente não as lê antes dela.
drop policy if exists proposal_messages_select on public.proposal_messages;
create policy proposal_messages_select on public.proposal_messages for select to authenticated
  using (
    private.can_access_org(private.proposal_painter(proposal_id))
    or (
      private.can_access_org(private.proposal_client(proposal_id))
      -- `request_id` está na própria linha da mensagem; não é preciso ir buscá-lo à proposta.
      and private.propostas_entregues(request_id)
    )
  );

revoke all on function private.propostas_entregues(uuid) from public, anon;
grant execute on function private.propostas_entregues(uuid) to authenticated;

comment on function private.propostas_entregues(uuid) is
  'As propostas deste pedido já foram entregues ao cliente? Só depois do prazo, ou de o anúncio ser encerrado.';

-- A escolha corre com os direitos de quem chama (`escolha_invoker`, 19/10), por isso a porta acima já
-- a bloqueia sozinha — mas com a mensagem errada: "Proposta não encontrada" a quem só está adiantado.
create or replace function private.proposal_request(p_proposal uuid) returns uuid
language sql stable security definer set search_path = '' as $$
  select request_id from public.proposals where id = p_proposal;
$$;

revoke all on function private.proposal_request(uuid) from public, anon;
grant execute on function private.proposal_request(uuid) to authenticated;

create or replace function public.select_proposal(p_proposal uuid) returns void
language plpgsql security invoker set search_path = '' as $$
declare
  p public.proposals%rowtype;
  current_version int;
  r uuid;
  prazo date;
begin
  select * into p from public.proposals where id = p_proposal for update;
  if not found then
    -- Só se diz "ainda não foi entregue" a quem gere o pedido; a um estranho a proposta continua a
    -- não existir, que é o que ele tem direito a saber.
    r := private.proposal_request(p_proposal);
    if r is not null and private.can_manage_org(private.request_org(r)) and not private.propostas_entregues(r) then
      select l.prazo_propostas into prazo from public.request_listings l where l.request_id = r;
      raise exception 'As propostas só são entregues no fim do prazo, a %. Até lá ninguém as vê, nem o senhor nem os outros pintores.', to_char(prazo, 'DD/MM/YYYY')
        using errcode = 'P0001';
    end if;
    raise exception 'Proposta não encontrada.' using errcode = 'P0001';
  end if;
  if not private.can_manage_org(private.request_org(p.request_id)) then
    raise exception 'Proposta não encontrada.' using errcode = 'P0001';
  end if;
  if p.status <> 'submetida' then
    raise exception 'Só se escolhe uma proposta submetida.' using errcode = 'P0001';
  end if;
  if p.validade < (now() at time zone 'Europe/Lisbon')::date then
    raise exception 'A proposta expirou: peça ao pintor que a reconfirme.' using errcode = 'P0001';
  end if;
  select version into current_version from public.work_requests where id = p.request_id;
  if p.request_version is distinct from current_version then
    raise exception 'A proposta responde a uma versão anterior do pedido: peça ao pintor que a reveja.' using errcode = 'P0001';
  end if;
  if exists (select 1 from public.proposals where request_id = p.request_id and status = 'selecionada') then
    raise exception 'Já foi escolhida uma proposta para este pedido.' using errcode = 'P0001';
  end if;

  update public.proposals set status = 'selecionada' where id = p_proposal;
  update public.proposals set status = 'nao_selecionada' where request_id = p.request_id and status = 'submetida';
  update public.work_requests set status = 'encerrado' where id = p.request_id and status = 'publicado';
end $$;

-- Quantas propostas já chegaram, sem revelar nenhuma.
--
-- O cliente deixa de as poder contar sozinho: a regra de acesso esconde-lhas até à entrega, e um
-- `count` dá zero. Mas ele precisa do número antes do fim do prazo — é com ele que decide prolongar
-- quando ainda não chegou nenhuma. Devolve só a contagem, nunca uma linha, e só a quem gere o pedido.
create or replace function public.propostas_a_caminho(p_request uuid) returns integer
language sql stable security definer set search_path = '' as $$
  select case
    when private.can_access_org(private.request_org(p_request))
      then (select count(*)::int from public.proposals p where p.request_id = p_request and p.status <> 'rascunho')
    else 0
  end;
$$;

revoke all on function public.propostas_a_caminho(uuid) from public, anon;
grant execute on function public.propostas_a_caminho(uuid) to authenticated;

comment on function public.propostas_a_caminho(uuid) is
  'Quantas propostas já chegaram a este pedido, sem revelar nenhuma. Para o cliente decidir se prolonga o prazo.';

-- Prolongar o prazo, enquanto ainda não houver nada revelado.
--
-- Prolongar depois de o cliente ver as propostas dava-lhe vantagem sobre quem entrasse a seguir: ele
-- já conhece um preço e os novos não. Por isso só se prolonga **antes da entrega**, ou quando não
-- chegou proposta nenhuma — aí não há nada para revelar e o prolongamento é inofensivo.
--
-- É `security definer` porque tem de escrever no anúncio (`request_listings`), que o cliente não
-- altera à mão; a verificação de quem é fica explícita na primeira linha.
create or replace function public.prolongar_prazo(p_request uuid, p_prazo date) returns void
language plpgsql security definer set search_path = '' as $$
declare
  r public.work_requests%rowtype;
  l public.request_listings%rowtype;
  hoje date := (now() at time zone 'Europe/Lisbon')::date;
begin
  select * into r from public.work_requests where id = p_request for update;
  if not found or not private.can_manage_org(r.org_id) then
    raise exception 'Pedido não encontrado.' using errcode = 'P0001';
  end if;
  if r.status <> 'publicado' then
    raise exception 'Só se prolonga o prazo de um pedido publicado.' using errcode = 'P0001';
  end if;

  select * into l from public.request_listings where request_id = p_request for update;
  if not found or not l.aberto then
    raise exception 'O anúncio já está encerrado.' using errcode = 'P0001';
  end if;

  if hoje > l.prazo_propostas
     and exists (select 1 from public.proposals p where p.request_id = p_request and p.status <> 'rascunho') then
    raise exception 'O prazo já acabou e as propostas foram entregues: prolongar agora dava-lhe vantagem sobre quem entrasse depois.'
      using errcode = 'P0001';
  end if;

  if p_prazo <= l.prazo_propostas then
    raise exception 'O prazo novo tem de ser depois do actual.' using errcode = 'P0001';
  end if;
  if p_prazo < hoje + 3 then
    raise exception 'Dê pelo menos três dias: menos do que isso não chega para orçamentar.' using errcode = 'P0001';
  end if;

  -- O gatilho recusa qualquer alteração a um pedido publicado, e bem: o pintor orçamenta sobre o que
  -- leu. A porta abre-se aqui, para esta transacção e só para o prazo — ver `work_request_transition`.
  perform set_config('app.prolongar_prazo', 'on', true);
  update public.work_requests set prazo_propostas = p_prazo where id = p_request;
  update public.request_listings set prazo_propostas = p_prazo where request_id = p_request;
  perform set_config('app.prolongar_prazo', 'off', true);
end $$;

revoke all on function public.prolongar_prazo(uuid, date) from public, anon;
grant execute on function public.prolongar_prazo(uuid, date) to authenticated;

comment on function public.prolongar_prazo(uuid, date) is
  'Adia o fim do prazo de propostas. Só antes da entrega, ou sem propostas nenhumas.';

-- O gatilho do pedido, com a porta estreita do prolongamento.
--
-- Tudo o resto é igual à versão de 24/10 (`forma_de_implantacao`), copiada tal e qual: um pedido
-- publicado não se altera, porque o pintor orçamenta sobre o que leu.

create or replace function private.work_request_transition() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  b public.buildings%rowtype;
  total int;
begin
  if old.status = new.status then
    -- A porta estreita do prolongamento: o prazo a andar para a frente, e nada mais, quando vem de
    -- `prolongar_prazo` — que é quem verifica se ainda não houve entrega. Sem a marca da transacção,
    -- a regra de acesso deixava o cliente mudar o prazo à mão e saltar por cima dessa verificação.
    if old.status = 'publicado'
       and coalesce(current_setting('app.prolongar_prazo', true), 'off') = 'on'
       and new.prazo_propostas > old.prazo_propostas
       and (to_jsonb(new) - 'prazo_propostas' - 'updated_at') = (to_jsonb(old) - 'prazo_propostas' - 'updated_at')
    then
      return new;
    end if;
    if old.status <> 'rascunho' then
      raise exception 'Um pedido % não pode ser alterado.', old.status using errcode = 'P0001';
    end if;
    return new;
  end if;

  if not (
    (old.status = 'rascunho' and new.status in ('publicado', 'cancelado'))
    or (old.status = 'publicado' and new.status in ('rascunho', 'encerrado', 'cancelado'))
  ) then
    raise exception 'Transição inválida: % para %.', old.status, new.status using errcode = 'P0001';
  end if;

  if new.status = 'publicado' then
    select coalesce(sum(area_cm2), 0) into total from public.request_surfaces where request_id = new.id;
    if total <= 0 then raise exception 'Indique pelo menos uma superfície com área.' using errcode = 'P0001'; end if;
    if length(btrim(new.descricao)) < 30 then raise exception 'Descrição demasiado curta.' using errcode = 'P0001'; end if;
    if new.prazo_propostas is null or new.prazo_propostas < (now() at time zone 'Europe/Lisbon')::date + 7 then
      raise exception 'O prazo de propostas tem de ser de pelo menos 7 dias.' using errcode = 'P0001';
    end if;
    select * into b from public.buildings where id = new.building_id;
    new.published_at := now();
    insert into public.request_listings (
      request_id, ref, aberto, tipo_obra, descricao, trabalhos, cor_acabamento, prazo_propostas,
      execucao_desde, execucao_ate, concelho, tipo_imovel, pisos, fachadas, tem_varandas, forma_implantacao,
      area_total_cm2, published_at, version
    ) values (
      new.id, new.ref, true, new.tipo_obra, new.descricao, new.trabalhos, new.cor_acabamento, new.prazo_propostas,
      new.execucao_desde, new.execucao_ate, b.concelho, b.tipo, b.pisos, b.fachadas, b.tem_varandas, b.forma_implantacao,
      total, new.published_at, new.version
    )
    on conflict (request_id) do update set
      aberto = true, tipo_obra = excluded.tipo_obra, descricao = excluded.descricao, trabalhos = excluded.trabalhos,
      cor_acabamento = excluded.cor_acabamento, prazo_propostas = excluded.prazo_propostas,
      execucao_desde = excluded.execucao_desde, execucao_ate = excluded.execucao_ate, concelho = excluded.concelho,
      tipo_imovel = excluded.tipo_imovel, pisos = excluded.pisos, fachadas = excluded.fachadas,
      tem_varandas = excluded.tem_varandas, forma_implantacao = excluded.forma_implantacao,
      area_total_cm2 = excluded.area_total_cm2,
      published_at = excluded.published_at, version = excluded.version;
  else
    update public.request_listings set aberto = false where request_id = new.id;
    if new.status = 'rascunho' then
      new.version := old.version + 1;
    end if;
  end if;
  return new;
end $$;
