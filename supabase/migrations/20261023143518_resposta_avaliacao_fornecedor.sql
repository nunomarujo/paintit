-- Paridade: o fornecedor passa a poder responder a uma avaliação de um pintor, como o pintor já
-- pode responder a uma avaliação do cliente (reviews.resposta). Decisão confirmada a 23/10/2026
-- (docs/ESTADO.md, item 10) — a resposta é só texto; a nota de 1 a 5 e o comentário continuam só
-- do pintor, protegidos pelo mesmo mecanismo de guarda que já existe em reviews.

alter table public.supplier_reviews add column resposta text check (resposta is null or length(resposta) <= 2000);
alter table public.supplier_reviews add column resposta_at timestamptz;

create function private.supplier_review_guard() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    new.resposta := null;
    new.resposta_at := null;
    return new;
  end if;
  if private.can_manage_org(new.painter_org_id) then
    -- O pintor atualiza a avaliação, não a resposta.
    new.resposta := old.resposta;
    new.resposta_at := old.resposta_at;
  else
    -- O fornecedor só responde.
    if (new.produto, new.entrega, new.atendimento, new.comentario) is distinct from
       (old.produto, old.entrega, old.atendimento, old.comentario) then
      raise exception 'O fornecedor responde, mas não altera a avaliação.' using errcode = 'P0001';
    end if;
    new.resposta_at := now();
  end if;
  new.supplier_org_id := old.supplier_org_id;
  new.painter_org_id := old.painter_org_id;
  new.created_by := old.created_by;
  return new;
end $$;

create trigger supplier_reviews_guard before insert or update on public.supplier_reviews
  for each row execute function private.supplier_review_guard();

alter policy supplier_reviews_update on public.supplier_reviews
  using (private.can_manage_org(painter_org_id) or private.can_manage_org(supplier_org_id))
  with check (private.can_manage_org(painter_org_id) or private.can_manage_org(supplier_org_id));

revoke all on function private.supplier_review_guard() from public, anon;
