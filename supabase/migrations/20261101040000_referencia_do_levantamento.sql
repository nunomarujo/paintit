-- Referência do levantamento: um número que se diz ao telefone.
--
-- Até aqui um levantamento só tinha o seu uuid. Nos ecrãs novos («Hoje», «Os meus levantamentos») cada
-- linha tem de ser reconhecível à primeira — referência, concelho, estado, próxima obrigação e prazo — e um
-- uuid não serve para isso nem para o avaliador dizer ao cliente de que obra está a falar.
--
-- Sequência, não hash do uuid: dois levantamentos nunca podem partilhar a mesma referência, e quem a lê
-- percebe logo qual é o mais antigo. A coluna é gerada e imutável; o texto («QP-1042») monta-se na
-- aplicação, em src/domain/referencias.ts, para a forma poder mudar sem tocar na base.
--
-- Aditiva: nada se apaga, e os levantamentos que já existem recebem número pela ordem em que foram criados.

create sequence if not exists public.request_surveys_numero_seq as bigint start with 1000;

alter table public.request_surveys add column if not exists numero bigint;

-- Os que já existem, pela ordem de criação — para a sequência de números acompanhar a do tempo.
do $$
declare r record;
begin
  for r in select id from public.request_surveys where numero is null order by created_at, id loop
    update public.request_surveys set numero = nextval('public.request_surveys_numero_seq') where id = r.id;
  end loop;
end $$;

alter table public.request_surveys alter column numero set default nextval('public.request_surveys_numero_seq');
alter table public.request_surveys alter column numero set not null;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'request_surveys_numero_key') then
    alter table public.request_surveys add constraint request_surveys_numero_key unique (numero);
  end if;
end $$;

alter sequence public.request_surveys_numero_seq owned by public.request_surveys.numero;

-- A referência é parte da identidade do levantamento: nunca muda depois de atribuída.
create or replace function private.numero_do_levantamento_nao_muda() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.numero is distinct from old.numero then
    raise exception 'A referência de um levantamento não se altera.';
  end if;
  return new;
end $$;

drop trigger if exists request_surveys_numero_imutavel on public.request_surveys;
create trigger request_surveys_numero_imutavel
  before update on public.request_surveys
  for each row execute function private.numero_do_levantamento_nao_muda();
