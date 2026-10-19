-- Manutenção diária (pg_cron, 06:00 de Lisboa ≈ 05:00 UTC):
-- - documentos aprovados fora de validade passam a "expirado"; aviso 30 dias antes;
-- - anúncios com o prazo de propostas ultrapassado fecham e o cliente é avisado;
-- E, sempre que um pedido volta a ser publicado numa versão nova, os pintores que
-- já tinham proposta são avisados (MED-09).

create function private.daily_maintenance() returns void
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
end $$;

create function private.notify_request_version() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  p record;
begin
  if new.status = 'publicado' and old.status = 'rascunho' and new.version > 1 then
    for p in select painter_org_id from public.proposals where request_id = new.id and status in ('rascunho', 'submetida') loop
      perform private.notify(p.painter_org_id, 'O cliente alterou um pedido em que tem proposta: reveja-a.', '/app/oportunidades/' || new.id);
    end loop;
  end if;
  return new;
end $$;

create trigger work_requests_notify_version after update on public.work_requests
  for each row execute function private.notify_request_version();

revoke all on function private.daily_maintenance(), private.notify_request_version() from public, anon, authenticated;

-- Agendamento: só onde existe pg_cron (no Supabase; não na base de testes).
do $$
begin
  if exists (select 1 from pg_available_extensions where name = 'pg_cron') then
    execute 'create extension if not exists pg_cron';
    execute $cron$select cron.schedule('paintit-manutencao-diaria', '0 5 * * *', 'select private.daily_maintenance()')$cron$;
  end if;
end $$;
