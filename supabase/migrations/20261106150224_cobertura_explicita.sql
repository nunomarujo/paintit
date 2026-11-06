-- Concelhos dos levantamentos: obrigatórios, e «todo o país» só quando escolhido (promotor, 06/11/2026).
--
-- «Ninguém trabalha para o país todo, e se o fizer tem de ser explícito.» Até aqui, sem linha em
-- supplier_survey_coverage, ou com a lista vazia, a empresa cobria todo o país (a convenção das entregas
-- de produtos, que fica como estava). Para os levantamentos:
--   - sem linha, não cobre nada: não vê oportunidades, não reserva, não pede esclarecimentos;
--   - «todo o país» é uma coluna própria, marcada de propósito no ecrã, com a confirmação escrita;
--   - uma linha gravada tem de ter uma escolha: pelo menos um concelho, ou todo o país.
-- Todas as regras que decidem a zona passam por private.supplier_covers: muda-se só ela.
-- Em produção, a 06/11/2026: um fornecedor com 2 concelhos (não muda) e um sem linha (deixa de ver
-- oportunidades até escolher os concelhos). Nenhum tinha a lista vazia.

alter table public.supplier_survey_coverage
  add column todo_o_pais boolean not null default false,
  add constraint supplier_survey_coverage_escolhida check (todo_o_pais or cardinality(concelhos) > 0);

create or replace function private.supplier_covers(p_org uuid, p_concelho text) returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce(
    (select c.todo_o_pais or p_concelho = any (c.concelhos) from public.supplier_survey_coverage c where c.org_id = p_org),
    false
  );
$$;
