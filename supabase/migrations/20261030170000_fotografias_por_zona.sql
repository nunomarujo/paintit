-- Quem Pinta — fotografias associadas às zonas do pedido (30/10/2026).
--
-- O promotor pediu uma galeria onde se possam «associar imagens às zonas». Até aqui uma fotografia
-- pertencia ao pedido e mais nada: quem olhava para dezoito fotografias de um prédio não sabia qual
-- era a fachada de trás nem qual a caixa de escadas, e o pintor que orçamenta ainda menos.
--
-- Três coisas, portanto:
--   1. a coluna `zona_id`, opcional — uma fotografia pode continuar a ser do pedido inteiro;
--   2. a zona tem de ser do mesmo pedido (um `references` não consegue verificar isso, porque a
--      ligação é entre duas colunas; fica nos gatilhos, que já existiam);
--   3. quem gere o pedido passa a poder corrigir a legenda e a zona enquanto o pedido é rascunho.
--
-- O ponto 3 abre a primeira alteração de uma fotografia fora da revisão, e por isso o gatilho da
-- revisão foi reescrito com cuidado: **quem revê não reescreve a legenda**, e as duas alterações
-- não podem vir no mesmo `update` — senão uma aprovação podia levar texto à boleia.

alter table public.request_photos
  add column zona_id uuid references public.request_surfaces (id) on delete set null;

create index request_photos_zona_idx on public.request_photos (zona_id) where zona_id is not null;

comment on column public.request_photos.zona_id is
  'Zona do pedido a que a fotografia diz respeito. Nulo = o pedido todo.';

-- A zona é do mesmo pedido, ou não é zona nenhuma.
create function private.photo_zone_belongs(p_zona uuid, p_request uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select p_zona is null or exists (
    select 1 from public.request_surfaces s where s.id = p_zona and s.request_id = p_request
  );
$$;
revoke all on function private.photo_zone_belongs(uuid, uuid) from public, anon;
-- Os gatilhos correm com o papel de quem escreve, e é por lá que esta função é chamada.
grant execute on function private.photo_zone_belongs(uuid, uuid) to authenticated;

create or replace function private.request_photo_new() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.revisao := case when new.kind = 'pormenor' then 'pendente'::public.photo_review end;
  new.notas_revisao := null;
  new.reviewed_by := null;
  new.reviewed_at := null;
  if not private.photo_zone_belongs(new.zona_id, new.request_id) then
    raise exception 'A zona da fotografia é de outro pedido.' using errcode = 'P0001';
  end if;
  return new;
end $$;

create or replace function private.request_photo_review() returns trigger
language plpgsql set search_path = '' as $$
declare
  mudou_legenda boolean := (new.legenda, new.zona_id) is distinct from (old.legenda, old.zona_id);
  mudou_revisao boolean := (new.revisao, new.notas_revisao, new.reviewed_by, new.reviewed_at)
    is distinct from (old.revisao, old.notas_revisao, old.reviewed_by, old.reviewed_at);
begin
  -- O que nunca muda: a que pedido pertence, o que é, que ficheiro é, quem a enviou e quando.
  if (new.request_id, new.kind, new.storage_path, new.submitted_by, new.created_at)
     is distinct from (old.request_id, old.kind, old.storage_path, old.submitted_by, old.created_at) then
    raise exception 'Uma fotografia só muda na revisão, na legenda ou na zona.' using errcode = 'P0001';
  end if;
  -- A política nova deixa quem gere o pedido escrever na linha, e por isso é aqui — e não na
  -- política — que se impede o cliente de aprovar as próprias fotografias.
  if mudou_revisao and not private.is_platform_admin() then
    raise exception 'Só a equipa da plataforma revê fotografias.' using errcode = 'P0001';
  end if;
  -- Quem gere o pedido e o vendedor do levantamento: as duas pessoas que já podiam juntar e apagar
  -- fotografias deste pedido. O vendedor é quem está no prédio e quem mediu a zona — é dele a melhor
  -- resposta à pergunta «de que zona é esta fotografia».
  if mudou_legenda
     and not (private.can_manage_org(private.request_org(new.request_id))
              or private.can_access_as_surveyor(new.request_id)) then
    raise exception 'Só quem gere o pedido altera a legenda ou a zona da fotografia.' using errcode = 'P0001';
  end if;
  -- Separadas de propósito: uma aprovação não leva texto à boleia.
  if mudou_legenda and mudou_revisao then
    raise exception 'Uma revisão não altera a legenda nem a zona da fotografia.' using errcode = 'P0001';
  end if;
  if mudou_legenda and not private.photo_zone_belongs(new.zona_id, new.request_id) then
    raise exception 'A zona da fotografia é de outro pedido.' using errcode = 'P0001';
  end if;
  if new.revisao = 'rejeitada' and coalesce(btrim(new.notas_revisao), '') = '' then
    raise exception 'Explique porque a fotografia não vai para o anúncio.' using errcode = 'P0001';
  end if;
  return new;
end $$;

-- Corrigir a legenda ou a zona: quem gere o pedido, enquanto for rascunho. As políticas somam-se,
-- por isso esta não tira nada à da revisão; o que limita o que cada um pode mexer é o gatilho.
create policy request_photos_legenda on public.request_photos for update to authenticated
  using (
    (private.can_manage_org(private.request_org(request_id)) or private.can_access_as_surveyor(request_id))
    and private.request_is_draft(request_id)
  )
  with check (
    (private.can_manage_org(private.request_org(request_id)) or private.can_access_as_surveyor(request_id))
    and private.request_is_draft(request_id)
  );
