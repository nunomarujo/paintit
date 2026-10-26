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
create function private.proposal_request(p_proposal uuid) returns uuid
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
