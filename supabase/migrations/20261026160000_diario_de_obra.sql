-- Diário fotográfico da obra (25/10/2026, docs/DECISOES.md).
--
-- Seis meses depois aparecem bolhas ou manchas, e sem registo do estado do suporte antes de pintar a
-- discussão perde-se por omissão. A data que vale é a do servidor: os metadados da imagem perdem-se
-- ao exportar, mudam de fuso e alteram-se com facilidade — e são apagados antes de guardar, porque
-- levam GPS e modelo do aparelho que ninguém precisa de conservar.

create table if not exists public.worksite_photos (
  id uuid primary key default gen_random_uuid(),
  worksite_id uuid not null references public.worksites (id) on delete cascade,
  -- Preenchido pelo trigger a partir da obra; nunca vem do navegador.
  org_id uuid not null,
  storage_path text not null unique,
  fase text not null check (fase in ('antes', 'preparacao', 'durante', 'depois')),
  zona text check (zona is null or length(zona) <= 120),
  produto text check (produto is null or length(produto) <= 160),
  legenda text check (legenda is null or length(legenda) <= 300),
  -- Hora do servidor, e só dela: é esta a data que vale como prova.
  registada_em timestamptz not null default now(),
  created_by uuid not null default auth.uid() references auth.users (id)
);

create index if not exists worksite_photos_worksite_idx on public.worksite_photos (worksite_id, fase, registada_em);

create or replace function private.worksite_photo_org() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  new.org_id := private.worksite_org(new.worksite_id);
  -- A data de registo é do servidor mesmo que venha preenchida.
  new.registada_em := now();
  return new;
end $$;

drop trigger if exists worksite_photos_org on public.worksite_photos;
create trigger worksite_photos_org before insert on public.worksite_photos
  for each row execute function private.worksite_photo_org();

alter table public.worksite_photos enable row level security;
revoke all on public.worksite_photos from anon;

-- O diário é da empresa que faz a obra. Numa obra contratada pela plataforma, o cliente também o vê:
-- é prova do trabalho feito, e mostrá-lo é do interesse das duas partes.
drop policy if exists worksite_photos_select on public.worksite_photos;
create policy worksite_photos_select on public.worksite_photos for select to authenticated
  using (
    private.has_role(org_id, array['proprietario', 'gestor', 'financeiro', 'leitor']::public.member_role[])
    or private.has_role(private.worksite_client(worksite_id), array['proprietario', 'gestor', 'financeiro', 'leitor']::public.member_role[])
  );

drop policy if exists worksite_photos_insert on public.worksite_photos;
create policy worksite_photos_insert on public.worksite_photos for insert to authenticated
  with check (private.can_manage_org(private.worksite_org(worksite_id)));

-- Apagar sim, alterar não: uma fotografia que se pudesse reetiquetar depois do facto não serve de
-- prova nenhuma. Quem se enganou apaga e carrega outra vez, e isso fica visível na data.
drop policy if exists worksite_photos_delete on public.worksite_photos;
create policy worksite_photos_delete on public.worksite_photos for delete to authenticated
  using (private.can_manage_org(private.worksite_org(worksite_id)));

-- Armazenamento privado, caminho "<worksite_id>/<ficheiro>".
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('obra', 'obra', false, 10485760, array['image/jpeg', 'image/png'])
on conflict (id) do nothing;

drop policy if exists obra_select on storage.objects;
create policy obra_select on storage.objects for select to authenticated
  using (
    bucket_id = 'obra'
    and (
      private.can_access_org(private.worksite_org(private.org_from_path(name)))
      or private.can_access_org(private.worksite_client(private.org_from_path(name)))
    )
  );

drop policy if exists obra_insert on storage.objects;
create policy obra_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'obra' and private.can_manage_org(private.worksite_org(private.org_from_path(name))));

drop policy if exists obra_delete on storage.objects;
create policy obra_delete on storage.objects for delete to authenticated
  using (bucket_id = 'obra' and private.can_manage_org(private.worksite_org(private.org_from_path(name))));

comment on table public.worksite_photos is
  'Diário fotográfico de uma obra. A data é do servidor; os metadados da imagem são apagados antes de guardar.';
