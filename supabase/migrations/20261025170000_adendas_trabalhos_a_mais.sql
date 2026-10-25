-- Trabalhos a mais (adendas) com aceitação do cliente — 25/10/2026, docs/DECISOES.md.
--
-- "Aproveite e pinte também a escada" sem adenda escrita é a fonte número um de margem perdida numa
-- empreitada. A adenda fica registada com descrição, preço e fotografia, e o cliente aceita ou recusa
-- dentro da plataforma, com data.
--
-- Quem aceita é o cliente da contratação, não o pintor: as políticas abaixo garantem que o pintor não
-- consegue marcar como aceite uma adenda sua, por muito que o navegador lho peça (CLAUDE.md, regra 10).

create table if not exists public.worksite_addenda (
  id uuid primary key default gen_random_uuid(),
  engagement_id uuid not null references public.engagements (id) on delete cascade,
  -- Preenchido pelo trigger, a partir da contratação: nunca vem do navegador.
  painter_org_id uuid not null,
  descricao text not null check (length(btrim(descricao)) between 8 and 600),
  valor_cents integer not null check (valor_cents > 0),
  foto_path text,
  estado text not null default 'proposta' check (estado in ('proposta', 'aceite', 'recusada', 'retirada')),
  criada_em timestamptz not null default now(),
  respondida_em timestamptz,
  -- Motivo da recusa, quando o cliente o quiser deixar escrito.
  nota_cliente text check (nota_cliente is null or length(nota_cliente) <= 600)
);

create index if not exists worksite_addenda_engagement_idx on public.worksite_addenda (engagement_id, criada_em);

create trigger worksite_addenda_painter before insert or update on public.worksite_addenda
  for each row execute function private.worksite_painter();

-- A data da resposta é do servidor, como a de qualquer outro marco: não se aceita do navegador.
create or replace function private.addenda_answer_time() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.estado is distinct from old.estado and new.estado in ('aceite', 'recusada') then
    new.respondida_em := now();
  end if;
  return new;
end $$;

create trigger worksite_addenda_answer before update on public.worksite_addenda
  for each row execute function private.addenda_answer_time();

alter table public.worksite_addenda enable row level security;
revoke all on public.worksite_addenda from anon;

-- Ver: as duas partes da contratação. O cliente tem de ver para poder aceitar.
drop policy if exists worksite_addenda_select on public.worksite_addenda;
create policy worksite_addenda_select on public.worksite_addenda for select to authenticated
  using (
    private.has_role(painter_org_id, array['proprietario', 'gestor', 'financeiro', 'leitor']::public.member_role[])
    or private.has_role(private.engagement_client(engagement_id), array['proprietario', 'gestor', 'financeiro', 'leitor']::public.member_role[])
  );

-- Criar e retirar: só o pintor da obra, e sempre no estado 'proposta'.
drop policy if exists worksite_addenda_insert on public.worksite_addenda;
create policy worksite_addenda_insert on public.worksite_addenda for insert to authenticated
  with check (estado = 'proposta' and private.can_manage_org(private.engagement_painter(engagement_id)));

-- Alterar: o pintor só mexe enquanto ninguém respondeu, e só para corrigir ou retirar — nunca para
-- aceitar. O cliente só responde, e só a uma adenda que ainda está proposta.
drop policy if exists worksite_addenda_update_painter on public.worksite_addenda;
create policy worksite_addenda_update_painter on public.worksite_addenda for update to authenticated
  using (estado = 'proposta' and private.can_manage_org(private.engagement_painter(engagement_id)))
  with check (estado in ('proposta', 'retirada') and private.can_manage_org(private.engagement_painter(engagement_id)));

drop policy if exists worksite_addenda_update_client on public.worksite_addenda;
create policy worksite_addenda_update_client on public.worksite_addenda for update to authenticated
  using (estado = 'proposta' and private.can_manage_org(private.engagement_client(engagement_id)))
  with check (estado in ('aceite', 'recusada') and private.can_manage_org(private.engagement_client(engagement_id)));

comment on table public.worksite_addenda is
  'Trabalhos a mais de uma obra, aceites ou recusados pelo cliente. Regras em src/domain/addenda.ts.';
