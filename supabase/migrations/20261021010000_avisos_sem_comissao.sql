-- O cliente não vê o que a plataforma cobra ao pintor (decisão de 21/10/2026): avisos do cliente passam a falar em
-- "confirmação do pintor". Os avisos do pintor mantêm a comissão.
create or replace function private.notify_engagement_event() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  e public.engagements%rowtype;
  link text;
  v2 boolean;
  deposits int;
begin
  select * into e from public.engagements where id = new.engagement_id;
  link := '/app/contratacoes/' || e.id;
  v2 := e.rules_version >= '2026-10-19';
  case new.kind
    when 'deposito_confirmado' then
      select count(*) into deposits from public.engagement_events where engagement_id = e.id and kind = 'deposito_confirmado';
      if v2 and deposits <= 1 then
        perform private.notify(e.client_org_id, 'Caução confirmada: o pintor tem 8 dias para confirmar a escolha.', link);
        perform private.notify(e.painter_org_id, 'A sua proposta foi escolhida: pague a comissão em 8 dias para conhecer o cliente.', link);
      elsif v2 then
        perform private.notify(e.client_org_id, 'Adiantamento confirmado: pode assinar o contrato.', link);
      else
        perform private.notify(e.client_org_id, 'Depósito confirmado: pode assinar a minuta.', link);
      end if;
    when 'cliente_assinou' then
      if v2 then
        perform private.notify(e.painter_org_id, 'O cliente assinou o contrato: assine em 8 dias.', link);
      else
        perform private.notify(e.painter_org_id, 'Ganhou uma obra: pague a comissão em 8 dias para assinar.', link);
      end if;
    when 'fee_recebido' then
      perform private.notify(e.painter_org_id, 'Comissão recebida: já pode ver o cliente.', link);
      if v2 then
        perform private.notify(e.client_org_id, 'O pintor confirmou a escolha: já vê quem é. Pode assinar o contrato.', link);
      else
        perform private.notify(e.client_org_id, 'O pintor confirmou a escolha: já pode ver os dados dele.', link);
      end if;
    when 'pintor_assinou' then
      perform private.notify(e.client_org_id, 'Contrato assinado pelas duas partes.', link);
    when 'cliente_desistiu' then
      perform private.notify(e.painter_org_id, 'O cliente desistiu da contratação.', link);
    when 'litigio_aberto' then
      perform private.notify(e.client_org_id, 'Foi aberto um litígio.', link);
      perform private.notify(e.painter_org_id, 'Foi aberto um litígio.', link);
    when 'litigio_resolvido' then
      perform private.notify(e.client_org_id, 'O litígio foi resolvido.', link);
      perform private.notify(e.painter_org_id, 'O litígio foi resolvido.', link);
    else
      null;
  end case;
  return new;
end $$;

-- Avisos já gravados, dirigidos a clientes.
update public.notifications set texto = 'Caução confirmada: o pintor tem 8 dias para confirmar a escolha.'
  where texto = 'Caução confirmada: o pintor tem 8 dias para pagar a comissão.';
update public.notifications set texto = 'O pintor confirmou a escolha: já vê quem é. Pode assinar o contrato.'
  where texto = 'O pintor pagou a comissão: já vê quem é. Deposite o adiantamento (se houver) e assine.';
update public.notifications set texto = 'O pintor confirmou a escolha: já pode ver os dados dele.'
  where texto = 'O pintor pagou a comissão: já pode ver os dados dele.';
