-- Reforço de defesa em profundidade (consistente com material_orders, supplier_reviews, products, reviews,
-- bank_imports/bank_lines): supplier_customers já não tem nenhuma política RLS para DELETE (logo já bloqueado
-- por omissão — verificado ao vivo em 23/10/2026, delete não afetou nenhuma linha), mas faltava a revogação
-- explícita do grant ao nível da tabela, que o resto do código sempre acrescenta como segunda camada.
revoke delete on public.supplier_customers from authenticated;
