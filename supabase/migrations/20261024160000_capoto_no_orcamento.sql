-- Capoto (ETICS) no orçamento: o sistema é uma escolha da proposta inteira, não de cada linha —
-- isolante, espessura e acabamento valem para a fachada toda. Guarda-se como objeto para não criar
-- cinco colunas que só fazem sentido juntas; as regras vivem em src/domain/etics.ts.
--
-- Vazio significa "esta proposta não tem capoto", que é o caso da esmagadora maioria.
alter table public.proposals
  add column if not exists capoto jsonb not null default '{}'::jsonb;

comment on column public.proposals.capoto is
  'Especificação do capoto: {situacao, isolante, espessuraMm, acabamento, demaos}. Vazio = sem capoto. Validado em src/domain/etics.ts.';
