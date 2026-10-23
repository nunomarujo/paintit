-- Avaliação de uma obra cancelada depois da apresentação, não só concluída (AVA-01).
-- O cliente passa a poder avaliar quando as partes se conheceram e a contratação chegou a
-- um estado final, mesmo sem assinatura; a categoria (concluída/cancelamento) é calculada no
-- servidor a partir do que já aconteceu, nunca escolhida pelo cliente, e fica gravada para
-- sempre (docs/DECISOES.md, 23/10/2026). "Revelada" usa a mesma marca `reveal` que já distingue
-- a apresentação em `engagement_events`.

alter table public.reviews add column obra_concluida boolean not null default true;

create function private.engagement_revealed(p_engagement uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.engagement_events where engagement_id = p_engagement and reveal);
$$;

create or replace function private.review_guard() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    new.painter_org_id := private.engagement_painter(new.engagement_id);
    new.obra_concluida := private.engagement_signed(new.engagement_id);
    new.resposta := null;
    new.resposta_at := null;
    return new;
  end if;
  new.updated_at := now();
  if private.can_manage_org(private.engagement_client(new.engagement_id)) then
    -- O cliente atualiza a avaliação, não a resposta.
    new.resposta := old.resposta;
    new.resposta_at := old.resposta_at;
  else
    -- O pintor só responde.
    if (new.qualidade, new.prazo, new.comunicacao, new.comentario) is distinct from
       (old.qualidade, old.prazo, old.comunicacao, old.comentario) then
      raise exception 'O pintor responde, mas não altera a avaliação.' using errcode = 'P0001';
    end if;
    new.resposta_at := now();
  end if;
  new.engagement_id := old.engagement_id;
  new.painter_org_id := old.painter_org_id;
  new.obra_concluida := old.obra_concluida;
  new.created_by := old.created_by;
  return new;
end $$;

alter policy reviews_insert on public.reviews with check (
  created_by = (select auth.uid())
  and private.can_manage_org(private.engagement_client(engagement_id))
  and (private.engagement_signed(engagement_id) or private.engagement_revealed(engagement_id))
);

-- A média pública do pintor só soma avaliações de obra concluída: uma obra cancelada depois da
-- apresentação é um sinal diferente (fica visível à parte, com a sua categoria), não se mistura
-- na nota de 1 a 5 sobre o trabalho feito.
create or replace function public.painter_rating(p_proposal uuid) returns table (n int, media numeric)
language sql stable security definer set search_path = '' as $$
  select count(*)::int, round(avg((r.qualidade + r.prazo + r.comunicacao) / 3.0), 1)
  from public.reviews r
  where private.proposal_visible(p_proposal)
    and r.painter_org_id = (select painter_org_id from public.proposals where id = p_proposal)
    and r.obra_concluida;
$$;

revoke all on function private.engagement_revealed(uuid) from public, anon;
grant execute on function private.engagement_revealed(uuid) to authenticated;
