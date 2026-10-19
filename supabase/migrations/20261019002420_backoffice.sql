-- Paint it — fase 5: backoffice. Denúncias de anúncios que identificam o
-- cliente (IMG-10) e suspensão pela equipa da plataforma (ADM-08). Quem
-- denuncia fica anónimo para o cliente; o cliente vê o motivo da suspensão.

create type public.report_status as enum ('pendente', 'suspenso', 'sem_fundamento');

create table public.listing_reports (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.work_requests (id) on delete cascade,
  motivo text not null check (length(btrim(motivo)) between 10 and 1000),
  status public.report_status not null default 'pendente',
  resolucao text,
  reporter uuid not null default auth.uid() references auth.users (id),
  resolved_by uuid references auth.users (id),
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);
create index listing_reports_request_idx on public.listing_reports (request_id);
create index listing_reports_pending_idx on public.listing_reports (created_at) where status = 'pendente';
create index listing_reports_reporter_idx on public.listing_reports (reporter);
create index listing_reports_resolved_by_idx on public.listing_reports (resolved_by);

-- Suspender: o anúncio sai do ar e o pedido volta a rascunho (nova versão),
-- com o motivo registado na denúncia, que o cliente vê.
create function public.resolve_listing_report(p_report uuid, p_suspend boolean, p_resolucao text) returns void
language plpgsql security definer set search_path = '' as $$
declare
  rep public.listing_reports%rowtype;
begin
  if not private.is_platform_admin() then
    raise exception 'Sem permissão.' using errcode = 'P0001';
  end if;
  if coalesce(btrim(p_resolucao), '') = '' then
    raise exception 'Explique a decisão.' using errcode = 'P0001';
  end if;
  select * into rep from public.listing_reports where id = p_report and status = 'pendente' for update;
  if not found then
    raise exception 'Denúncia não encontrada ou já resolvida.' using errcode = 'P0001';
  end if;
  update public.listing_reports
    set status = case when p_suspend then 'suspenso'::public.report_status else 'sem_fundamento'::public.report_status end,
        resolucao = p_resolucao, resolved_by = auth.uid(), resolved_at = now()
    where id = p_report;
  if p_suspend then
    -- O gatilho de transição fecha o anúncio e sobe a versão.
    update public.work_requests set status = 'rascunho' where id = rep.request_id and status = 'publicado';
  end if;
end $$;

revoke all on function public.resolve_listing_report(uuid, boolean, text) from public, anon;
grant execute on function public.resolve_listing_report(uuid, boolean, text) to authenticated;

alter table public.listing_reports enable row level security;
revoke all on public.listing_reports from anon;
revoke update, delete on public.listing_reports from authenticated;

create policy listing_reports_select on public.listing_reports for select to authenticated
  using (
    reporter = (select auth.uid())
    or private.is_platform_admin()
    or (status = 'suspenso' and private.can_access_org(private.request_org(request_id)))
  );
create policy listing_reports_insert on public.listing_reports for insert to authenticated
  with check (
    reporter = (select auth.uid())
    and status = 'pendente'
    and resolucao is null and resolved_by is null and resolved_at is null
    and private.is_painter()
    and private.listing_open(request_id)
  );
