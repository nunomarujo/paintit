-- As mensagens guardam o pedido, para o cliente as filtrar por pedido mesmo
-- quando a proposta do pintor ainda é um rascunho que ele não vê.
alter table public.proposal_messages add column request_id uuid references public.work_requests (id) on delete cascade;
update public.proposal_messages m set request_id = p.request_id from public.proposals p where p.id = m.proposal_id;
alter table public.proposal_messages alter column request_id set not null;
create index proposal_messages_request_idx on public.proposal_messages (request_id);

create function private.proposal_message_request() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  select request_id into new.request_id from public.proposals where id = new.proposal_id;
  return new;
end $$;
revoke all on function private.proposal_message_request() from public, anon, authenticated;

create trigger proposal_messages_request before insert on public.proposal_messages
  for each row execute function private.proposal_message_request();
