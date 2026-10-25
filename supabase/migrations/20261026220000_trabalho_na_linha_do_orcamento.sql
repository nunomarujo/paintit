-- Código do trabalho nas linhas dos orçamentos privados (25/10/2026, docs/DECISOES.md).
--
-- A biblioteca de preços passa a usar o código do trabalho como chave quando a linha veio do
-- catálogo. Sem isto, "Duas demãos de tinta acrílica" e "2 demãos tinta acrílica" são dois itens e
-- cada um aprende metade — e o pintor nunca vê a sugestão que já deveria ter.

alter table public.painter_quote_lines add column if not exists trabalho text
  check (trabalho is null or length(trabalho) <= 40);

comment on column public.painter_quote_lines.trabalho is
  'Código do trabalho do catálogo (src/domain/works.ts) quando a linha veio de um modelo. Chave da biblioteca de preços.';
