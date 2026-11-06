-- Conclusão da obra, início da garantia e conservação dos registos (06/11/2026; `src/domain/garantia.ts`).
--
-- A plataforma é terceira isenta: guarda o registo e a prova e não decide quem tem razão. Aditiva.
--
-- 1. `engagements.garantia_anos` — a duração da garantia como número, tirada da proposta escolhida no
--    momento em que a contratação é criada (só nas contratações com a minuta nova; nas antigas fica nula
--    e o ecrã pede-a às partes antes de calcular nada). O contrato tem a garantia em texto; o número é
--    o que permite calcular o fim.
-- 2. `conclusao_da_obra` — cada passo (declarou, confirmou, discordou, juntou prova), só de acrescentar,
--    com a data do servidor. Só depois do contrato celebrado.
-- 3. `garantias_calculadas` — o início confirmado, a duração, o fim da garantia, o fim da conservação
--    (fim da garantia + 24 meses) e quando se calculou. Só de acrescentar: um novo cálculo é uma linha nova.
-- 4. O cofre `provas-da-obra`, privado, como o dos comprovativos.
-- Escreve só o servidor; leem as duas partes e a equipa. Nenhum caminho da aplicação apaga estes
-- registos, e não há apagamento automático: depois do período, só a pedido e pelo modo do jurista.

alter table public.engagements add column if not exists garantia_anos smallint check (garantia_anos is null or garantia_anos between 0 and 50);
comment on column public.engagements.garantia_anos is
  'Anos de garantia da proposta escolhida, guardados na criação (minuta 2026-11-06). Nula nas antigas.';

create or replace function private.garantia_da_proposta() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.minuta_versao is not null and new.garantia_anos is null then
    select p.garantia_anos into new.garantia_anos from public.proposals p where p.id = new.proposal_id;
  end if;
  return new;
end $$;
drop trigger if exists engagements_garantia_da_proposta on public.engagements;
create trigger engagements_garantia_da_proposta before insert on public.engagements
  for each row execute function private.garantia_da_proposta();

create table if not exists public.conclusao_da_obra (
  id uuid primary key default gen_random_uuid(),
  engagement_id uuid not null references public.engagements (id) on delete restrict,
  lado text not null check (lado in ('cliente', 'pintor')),
  passo text not null check (passo in ('declarou', 'confirmou', 'discordou', 'juntou_prova')),
  data_conclusao date,
  razao text check (razao is null or length(razao) between 1 and 2000),
  ficheiro_path text check (ficheiro_path is null or ficheiro_path like engagement_id::text || '/%'),
  ficheiro_sha256 text check (ficheiro_sha256 is null or ficheiro_sha256 ~ '^[0-9a-f]{64}$'),
  ficheiro_tipo text check (ficheiro_tipo is null or ficheiro_tipo in ('image/jpeg', 'image/png', 'application/pdf')),
  criado_por uuid not null references auth.users (id),
  criado_em timestamptz not null default now(),
  constraint conclusao_declarou_tem_data check ((passo = 'declarou') = (data_conclusao is not null)),
  constraint conclusao_discordou_tem_razao check (passo <> 'discordou' or razao is not null),
  constraint conclusao_prova_tem_ficheiro check (passo <> 'juntou_prova' or ficheiro_path is not null),
  constraint conclusao_ficheiro check ((ficheiro_path is null) = (ficheiro_sha256 is null))
);
create index if not exists conclusao_da_obra_engagement_idx on public.conclusao_da_obra (engagement_id, criado_em);
create index if not exists conclusao_da_obra_criado_por_idx on public.conclusao_da_obra (criado_por);

create or replace function private.conclusao_no_prazo() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from public.engagement_events v where v.engagement_id = new.engagement_id and v.kind = 'pintor_assinou') then
    raise exception 'A conclusão da obra regista-se depois de o contrato estar assinado pelas duas partes.';
  end if;
  if new.data_conclusao is not null and new.data_conclusao > (now() at time zone 'Europe/Lisbon')::date then
    raise exception 'A data de conclusão não pode ser futura.';
  end if;
  new.criado_em := now();
  return new;
end $$;
drop trigger if exists conclusao_da_obra_prazo on public.conclusao_da_obra;
create trigger conclusao_da_obra_prazo before insert on public.conclusao_da_obra
  for each row execute function private.conclusao_no_prazo();
drop trigger if exists conclusao_da_obra_so_acrescentar on public.conclusao_da_obra;
create trigger conclusao_da_obra_so_acrescentar before update or delete on public.conclusao_da_obra
  for each row execute function private.so_de_acrescentar();

alter table public.conclusao_da_obra enable row level security;
revoke insert, update, delete, truncate on public.conclusao_da_obra from anon, authenticated;
drop policy if exists conclusao_da_obra_select on public.conclusao_da_obra;
create policy conclusao_da_obra_select on public.conclusao_da_obra for select to authenticated
  using (private.parte_da_contratacao(engagement_id) or private.is_platform_admin());

create table if not exists public.garantias_calculadas (
  id uuid primary key default gen_random_uuid(),
  engagement_id uuid not null references public.engagements (id) on delete restrict,
  inicio date not null,
  anos smallint not null check (anos between 0 and 50),
  fim_garantia date not null,
  fim_conservacao date not null,
  calculado_em timestamptz not null default now(),
  constraint garantia_datas check (fim_garantia >= inicio and fim_conservacao > fim_garantia)
);
create index if not exists garantias_calculadas_engagement_idx on public.garantias_calculadas (engagement_id, calculado_em desc);
create or replace function private.carimbar_calculo() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.calculado_em := now();
  return new;
end $$;
drop trigger if exists garantias_calculadas_carimbo on public.garantias_calculadas;
create trigger garantias_calculadas_carimbo before insert on public.garantias_calculadas
  for each row execute function private.carimbar_calculo();
drop trigger if exists garantias_calculadas_so_acrescentar on public.garantias_calculadas;
create trigger garantias_calculadas_so_acrescentar before update or delete on public.garantias_calculadas
  for each row execute function private.so_de_acrescentar();

alter table public.garantias_calculadas enable row level security;
revoke insert, update, delete, truncate on public.garantias_calculadas from anon, authenticated;
drop policy if exists garantias_calculadas_select on public.garantias_calculadas;
create policy garantias_calculadas_select on public.garantias_calculadas for select to authenticated
  using (private.parte_da_contratacao(engagement_id) or private.is_platform_admin());

grant select, insert, update, delete on public.conclusao_da_obra to service_role;
grant select, insert, update, delete on public.garantias_calculadas to service_role;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('provas-da-obra', 'provas-da-obra', false, 10485760, array['image/jpeg', 'image/png', 'application/pdf'])
on conflict (id) do nothing;
drop policy if exists provas_da_obra_ler on storage.objects;
create policy provas_da_obra_ler on storage.objects for select to authenticated
  using (bucket_id = 'provas-da-obra' and (private.parte_da_contratacao(private.org_from_path(name)) or private.is_platform_admin()));

comment on table public.conclusao_da_obra is 'Declaração, confirmação, discordância e prova da conclusão da obra. Só de acrescentar; a plataforma não decide.';
comment on table public.garantias_calculadas is 'Início, fim da garantia e fim da conservação (fim da garantia + 24 meses), com a data do cálculo. Só de acrescentar.';
