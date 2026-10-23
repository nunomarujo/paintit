-- Novo papel "vendedor" (fornecedor): recebe e faz o levantamento de obras na sua zona — ver a migração
-- seguinte. Sozinho nesta migração porque o Postgres não deixa usar um valor de enum na mesma transação
-- em que foi criado.

alter type public.member_role add value 'vendedor';
