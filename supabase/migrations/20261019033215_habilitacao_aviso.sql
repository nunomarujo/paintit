-- Decisão de 19/10/2026: a falta de habilitação validada não bloqueia a proposta.
-- Fica registada (habilitacao_ok = false) e a app assinala-a a vermelho às duas partes.
create or replace function private.proposal_license() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.status = 'submetida' and old.status = 'rascunho' then
    new.habilitacao_ok := private.license_ok(new.painter_org_id, new.base_cents);
  end if;
  return new;
end $$;

-- A escolha só é efetiva com a caução: o pintor é avisado no primeiro depósito
-- confirmado (notify_engagement_event), não quando o cliente marca a preferência.
create or replace function private.notify_proposal() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.status = old.status then return new; end if;
  if new.status = 'submetida' then
    perform private.notify(private.request_org(new.request_id), 'Recebeu uma proposta nova.', '/app/pedidos/' || new.request_id || '/propostas');
  elsif new.status = 'nao_selecionada' then
    perform private.notify(new.painter_org_id, 'O cliente escolheu outra proposta.', '/app/oportunidades/' || new.request_id);
  end if;
  return new;
end $$;
