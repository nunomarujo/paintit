-- Duas organizações-fornecedor com o mesmo NIF seriam a mesma empresa a inscrever-se outra vez com um mail
-- diferente — o que esvaziaria a regra de "entidade nova" das referências de fornecedores (docs/DECISOES.md,
-- 22/10/2026). Só se aplica a fornecedores: pintores, condomínios, administradoras e particulares não entram
-- nesta regra.
create unique index organizations_fornecedor_nif_idx on public.organizations (nif) where kind = 'fornecedor' and nif is not null;
