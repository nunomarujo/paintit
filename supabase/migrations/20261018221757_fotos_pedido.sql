-- Paint it — fase 2B: fotografias do pedido.
-- As fotografias gerais ficam sempre na entidade (e na equipa da plataforma).
-- As de pormenor só chegam aos pintores depois de alguém da equipa da
-- plataforma confirmar que não identificam o prédio, e só enquanto o anúncio
-- estiver aberto. O nome original do ficheiro não é guardado.

create type public.photo_kind as enum ('geral', 'pormenor');
create type public.photo_review as enum ('pendente', 'aprovada', 'rejeitada');

create table public.request_photos (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.work_requests (id) on delete cascade,
  kind public.photo_kind not null,
  -- "<request_id>/<uuid>.<ext>" no armazenamento "fotos".
  storage_path text not null unique,
  legenda text check (legenda is null or length(legenda) <= 200),
  revisao public.photo_review,
  notas_revisao text,
  reviewed_by uuid references auth.users (id),
  reviewed_at timestamptz,
  submitted_by uuid not null default auth.uid() references auth.users (id),
  created_at timestamptz not null default now(),
  constraint request_photos_path check (split_part(storage_path, '/', 1) = request_id::text),
  -- Só as de pormenor passam por revisão.
  constraint request_photos_review check ((kind = 'pormenor') = (revisao is not null))
);
create index request_photos_request_id_idx on public.request_photos (request_id);
create index request_photos_pending_idx on public.request_photos (created_at) where revisao = 'pendente';
create index request_photos_submitted_by_idx on public.request_photos (submitted_by);
create index request_photos_reviewed_by_idx on public.request_photos (reviewed_by);

-- Uma fotografia nova entra sempre por rever, seja quem for que a envie.
create function private.request_photo_new() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.revisao := case when new.kind = 'pormenor' then 'pendente'::public.photo_review end;
  new.notas_revisao := null;
  new.reviewed_by := null;
  new.reviewed_at := null;
  return new;
end $$;

create trigger request_photos_new before insert on public.request_photos
  for each row execute function private.request_photo_new();

-- A revisão só muda os campos da revisão.
create function private.request_photo_review() returns trigger
language plpgsql set search_path = '' as $$
begin
  if (new.request_id, new.kind, new.storage_path, new.legenda, new.submitted_by, new.created_at)
     is distinct from (old.request_id, old.kind, old.storage_path, old.legenda, old.submitted_by, old.created_at) then
    raise exception 'Só a revisão de uma fotografia pode ser alterada.' using errcode = 'P0001';
  end if;
  if new.revisao = 'rejeitada' and coalesce(btrim(new.notas_revisao), '') = '' then
    raise exception 'Explique porque a fotografia não vai para o anúncio.' using errcode = 'P0001';
  end if;
  return new;
end $$;

create trigger request_photos_review before update on public.request_photos
  for each row execute function private.request_photo_review();

-- Pintor pode ver esta fotografia: pormenor aprovado num anúncio aberto.
create function private.photo_visible_to_painter(p_path text) returns boolean
language sql stable security definer set search_path = '' as $$
  select private.is_painter() and exists (
    select 1
    from public.request_photos f
    join public.request_listings l on l.request_id = f.request_id and l.aberto
    where f.storage_path = p_path and f.kind = 'pormenor' and f.revisao = 'aprovada'
  );
$$;

revoke all on function private.request_photo_new(), private.request_photo_review(),
  private.photo_visible_to_painter(text) from public, anon;
grant execute on function private.photo_visible_to_painter(text) to authenticated;

-- RLS -------------------------------------------------------------------------

alter table public.request_photos enable row level security;
revoke all on public.request_photos from anon;

create policy request_photos_select on public.request_photos for select to authenticated
  using (
    private.can_access_org(private.request_org(request_id))
    or private.photo_visible_to_painter(storage_path)
  );
create policy request_photos_insert on public.request_photos for insert to authenticated
  with check (
    private.can_manage_org(private.request_org(request_id))
    and private.request_is_draft(request_id)
    and submitted_by = (select auth.uid())
  );
create policy request_photos_review on public.request_photos for update to authenticated
  using (private.is_platform_admin() and kind = 'pormenor')
  with check (private.is_platform_admin() and reviewed_by = (select auth.uid()));
create policy request_photos_delete on public.request_photos for delete to authenticated
  using (private.can_manage_org(private.request_org(request_id)) and private.request_is_draft(request_id));

-- Armazenamento privado: caminho "<request_id>/<ficheiro>". O primeiro
-- segmento lê-se com org_from_path, que só converte um uuid.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('fotos', 'fotos', false, 10485760, array['image/jpeg', 'image/png']);

create policy fotos_select on storage.objects for select to authenticated
  using (
    bucket_id = 'fotos'
    and (
      private.can_access_org(private.request_org(private.org_from_path(name)))
      or private.photo_visible_to_painter(name)
    )
  );
create policy fotos_insert on storage.objects for insert to authenticated
  with check (
    bucket_id = 'fotos'
    and private.can_manage_org(private.request_org(private.org_from_path(name)))
    and private.request_is_draft(private.org_from_path(name))
  );
create policy fotos_delete on storage.objects for delete to authenticated
  using (
    bucket_id = 'fotos'
    and private.can_manage_org(private.request_org(private.org_from_path(name)))
    and private.request_is_draft(private.org_from_path(name))
  );
