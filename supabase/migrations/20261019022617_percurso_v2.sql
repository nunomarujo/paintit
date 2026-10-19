-- Percurso v2 (decisão do promotor de 19/10/2026) e licenças camarárias.
-- Regras novas para contratações novas; as iniciadas mantêm a versão que aplicaram.

create or replace function private.current_rules_version() returns text
language sql immutable set search_path = '' as $$ select '2026-10-19' $$;

-- Licenças: o anúncio diz se a obra prevê ocupação da via pública. O pintor obtém
-- as licenças camarárias dos trabalhos (incluindo a via pública); o licenciamento
-- especial (alteração de vãos ou da fachada) cabe ao cliente.
alter table public.work_requests
  add column ocupacao_via_publica text not null default 'a_avaliar' check (ocupacao_via_publica in ('sim', 'nao', 'a_avaliar'));
alter table public.request_listings
  add column ocupacao_via_publica text not null default 'a_avaliar' check (ocupacao_via_publica in ('sim', 'nao', 'a_avaliar'));

create function private.listing_via_publica() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.status = 'publicado' then
    update public.request_listings set ocupacao_via_publica = new.ocupacao_via_publica where request_id = new.id;
  end if;
  return new;
end $$;
revoke all on function private.listing_via_publica() from public, anon, authenticated;

create trigger work_requests_listing_via_publica after update on public.work_requests
  for each row execute function private.listing_via_publica();

alter type public.line_category add value if not exists 'licencas';

-- Avisos do percurso v2: o primeiro depósito é a caução (o pintor tem de pagar a
-- comissão); o segundo é o adiantamento. A apresentação acontece com a comissão.
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
        perform private.notify(e.client_org_id, 'Caução confirmada: o pintor tem 8 dias para pagar a comissão.', link);
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
        perform private.notify(e.client_org_id, 'O pintor pagou a comissão: já vê quem é. Deposite o adiantamento (se houver) e assine.', link);
      else
        perform private.notify(e.client_org_id, 'O pintor pagou a comissão: já pode ver os dados dele.', link);
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
