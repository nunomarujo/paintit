-- "Cliente premium" (decisão de 23/10/2026, docs/DECISOES.md): terceiro valor de perfil de comprador,
-- classificado manualmente pelo fornecedor (supplier_customers.premium, migração anterior), nunca
-- deduzido das encomendas como primeira_compra/cliente_frequente — ver src/domain/catalog.ts.
alter table public.supplier_discounts drop constraint supplier_discounts_perfil_check;
alter table public.supplier_discounts add constraint supplier_discounts_perfil_check
  check (perfil in ('primeira_compra', 'cliente_frequente', 'cliente_premium'));
