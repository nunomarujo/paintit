-- Durabilidade declarada dos produtos de referência (decisão do promotor, 28/10/2026).
--
-- "Quantos anos dura esta tinta" é a primeira pergunta de qualquer cliente, e o catálogo não sabia
-- responder: tem rendimento, demãos, secagem e preço, e o número de anos aparecia, quando aparecia,
-- dentro do nome comercial.
--
-- Guardar só o número seria pior do que não guardar nada. O promotor apanhou-o: «até 10 anos», numa
-- condição específica, não pode transformar-se em «dura 10 anos» no comparador. Por isso são seis
-- colunas e não uma — o número, o que ele é, como foi escrito, em que condições, onde está escrito
-- e quando foi verificado.
--
-- Três regras ficam na base, e não só no ecrã:
--
--   1. Vazio é "não indicada". Zero nunca é um valor — seria lido como "não dura".
--   2. Um número sem proveniência não existe: exige o tipo, a formulação original e a fonte. É isto
--      que impede preencher a partir do nome comercial, que é de onde a tentação vem.
--   3. A garantia do fabricante e a garantia de execução do pintor são coisas diferentes e vivem em
--      sítios diferentes: esta é do produto, a do pintor está na proposta (`garantia_anos`).

alter table public.reference_products
  add column if not exists durabilidade_anos smallint,
  add column if not exists durabilidade_tipo text,
  add column if not exists durabilidade_declaracao text,
  add column if not exists durabilidade_condicoes text,
  add column if not exists durabilidade_fonte text,
  add column if not exists durabilidade_verificada_em date;

alter table public.reference_products drop constraint if exists reference_products_durabilidade_anos_check;
alter table public.reference_products drop constraint if exists reference_products_durabilidade_tipo_check;
alter table public.reference_products drop constraint if exists reference_products_durabilidade_proveniencia_check;

alter table public.reference_products
  add constraint reference_products_durabilidade_anos_check
    check (durabilidade_anos is null or (durabilidade_anos > 0 and durabilidade_anos <= 50));

alter table public.reference_products
  add constraint reference_products_durabilidade_tipo_check
    check (durabilidade_tipo is null or durabilidade_tipo in ('declarada', 'garantia_fabricante'));

-- A regra 2: o número só entra acompanhado.
alter table public.reference_products
  add constraint reference_products_durabilidade_proveniencia_check
    check (
      durabilidade_anos is null
      or (durabilidade_tipo is not null and durabilidade_declaracao is not null and durabilidade_fonte is not null)
    );

comment on column public.reference_products.durabilidade_anos is
  'Anos declarados pelo fabricante. Nulo = não indicada (nunca zero). Só se grava com tipo, declaração e fonte.';
comment on column public.reference_products.durabilidade_tipo is
  'declarada: afirmação do fabricante. garantia_fabricante: compromisso contratual. Diferente da garantia de execução do pintor.';
comment on column public.reference_products.durabilidade_declaracao is
  'A formulação original, incluindo "até" se for o caso. É isto que se mostra, não o número solto.';
comment on column public.reference_products.durabilidade_condicoes is
  'Preparação, sistema, suporte e outras condições a que a declaração está sujeita.';
comment on column public.reference_products.durabilidade_fonte is
  'Documento ou URL que sustenta a declaração. Sem isto o número não se grava.';
comment on column public.reference_products.durabilidade_verificada_em is
  'Quando alguém da equipa conferiu a declaração contra a fonte.';
