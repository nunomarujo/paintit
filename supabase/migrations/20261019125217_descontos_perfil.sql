-- Descontos por perfil de compra (decisão de 20/10/2026): forma de pagamento, quantidade,
-- primeira compra ou cliente frequente, além do produto/tipo e da dimensão da obra.
alter table public.supplier_discounts
  add column pagamento text check (pagamento in ('pronto', 'diferido')),
  add column min_quantidade integer check (min_quantidade > 0),
  add column perfil text check (perfil in ('primeira_compra', 'cliente_frequente'));
