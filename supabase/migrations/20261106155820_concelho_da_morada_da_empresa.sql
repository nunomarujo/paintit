-- Concelhos por omissão: os da morada da empresa (promotor, 06/11/2026).
--
-- «Quando não indicados, devem ficar associados à morada registada da empresa.» A seguir a
-- `cobertura_explicita` (sem concelhos não chegava nada), o que vale quando a empresa não escolheu:
--   - organizations.concelho: o concelho da morada fiscal, tirado do código postal (CTT) pelo servidor ao
--     gravar os dados da empresa;
--   - levantamentos: sem zona gravada, a empresa cobre o concelho da sua morada; sem morada, nenhum;
--   - entregas de produtos: «todo o país» deixa de ser o que fica quando a lista vai vazia — passa a ser
--     uma escolha marcada (supplier_delivery.todo_o_pais); sem concelhos, o servidor grava o concelho da
--     morada da empresa, e a base recusa uma condição de entrega sem escolha.
-- Em produção, a 06/11/2026: uma condição de entrega (3 concelhos, não muda); nenhuma com a lista vazia.

alter table public.organizations add column concelho text;

create or replace function private.supplier_covers(p_org uuid, p_concelho text) returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce(
    (select c.todo_o_pais or p_concelho = any (c.concelhos) from public.supplier_survey_coverage c where c.org_id = p_org),
    (select o.concelho = p_concelho from public.organizations o where o.id = p_org),
    false
  );
$$;

alter table public.supplier_delivery
  add column todo_o_pais boolean not null default false,
  add constraint supplier_delivery_escolhida check (todo_o_pais or cardinality(concelhos) > 0);
