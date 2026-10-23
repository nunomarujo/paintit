-- Levantamento automático (23/10/2026, decisão do promotor depois de reler o documento-fonte "Quem
-- Pinta — a oferta", secção 3.1): o pedido de ajuda de um profissional deixa de depender de o cliente
-- clicar num botão. Passa a existir sempre, por omissão, desde o momento em que o pedido é criado —
-- "o condomínio só publica o pedido básico", como o próprio documento prevê na equação de valor. O
-- preenchimento pelo próprio cliente continua sempre disponível e nunca obrigatório: pode desistir
-- (`cancel_survey`, já existente) a qualquer momento, ou simplesmente preencher as superfícies sozinho.
--
-- Isto não expõe nada de novo: o que um vendedor vê antes de reservar (concelho e tipo de obra, via
-- `survey_preview`) já era visível a todos os pintores da plataforma a partir do momento da publicação —
-- só que agora também fica visível, da mesma forma pouco reveladora, a partir da criação em rascunho.
--
-- Criação deixa de ser possível pelo cliente (só pelo gatilho, com os privilégios do dono da função —
-- mesmo padrão de `private.add_creator_as_owner()`): revoga-se o insert e a política que o permitia.

create function private.create_survey_on_request() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.request_surveys (request_id, created_by) values (new.id, new.created_by)
    on conflict (request_id) do nothing;
  return new;
end $$;

create trigger work_requests_create_survey after insert on public.work_requests
  for each row execute function private.create_survey_on_request();

-- Se o cliente preencheu as superfícies sozinho e publica antes de qualquer vendedor reservar, o
-- levantamento já não faz sentido (publicar já exige superfícies — ver o gatilho de `pedidos.sql`):
-- cancela-se, para não ocupar a vaga de outra obra nem levar um vendedor a visitar sem necessidade.
-- Uma reserva já ativa ('reservado') não se toca aqui — esse caso raro (o cliente preencheu por fora
-- enquanto um vendedor já tinha a vaga) fica para revisão humana, não para esta migração decidir.
create function private.cancel_open_survey_on_publish() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.status = 'publicado' and old.status is distinct from 'publicado' then
    update public.request_surveys set status = 'cancelado' where request_id = new.id and status = 'aberto';
  end if;
  return new;
end $$;

create trigger work_requests_cancel_survey_on_publish after update on public.work_requests
  for each row execute function private.cancel_open_survey_on_publish();

-- Backfill: pedidos já em rascunho que ainda não tinham pedido ajuda ficam com o levantamento aberto
-- também, para não distinguir entre pedidos antigos e novos.
insert into public.request_surveys (request_id, created_by)
  select wr.id, wr.created_by from public.work_requests wr
  where wr.status = 'rascunho' and not exists (select 1 from public.request_surveys s where s.request_id = wr.id)
  on conflict (request_id) do nothing;

drop policy request_surveys_insert on public.request_surveys;
revoke insert on public.request_surveys from authenticated;
