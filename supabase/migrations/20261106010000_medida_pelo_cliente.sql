-- A medição do cliente, pela fotografia, entra no pedido (06/11/2026).
--
-- Decisão do promotor (05/11/2026): o cliente também mede, na ferramenta de fotografia; a zona fica com
-- uma origem própria, «medida pelo cliente», e com a margem de erro da medição (± %). Nunca «confirmada»:
-- confirma-a quem mede no local. Regras e conversão em src/domain/medicaoDaFotografia.ts.
--
-- Porque é uma origem nova, e não «medição»: a origem «medicao» confirma a zona sozinha
-- (`confirmacaoDaOrigem`, src/domain/request.ts). E não se chama `medicao_cliente`: esse valor existe na
-- coluna antiga `origem` e a migração 20261030090000 converteu-o em «medicao» + «confirmada».
--
-- A base garante as duas regras que importam, e não só a ação do servidor — as políticas deixam quem gere
-- o pedido escrever qualquer coluna pela API:
--   1. uma zona medida pelo cliente tem sempre margem, e só ela tem margem;
--   2. uma zona medida pelo cliente fica sempre por confirmar.
--
-- A restrição da origem não tinha nome escrito (foi declarada na coluna); o nome que o Postgres lhe deu
-- foi confirmado na base real a 06/11/2026: `request_surfaces_origem_quantidade_check`. Troca-se por outra
-- com o valor novo (o mesmo padrão de 20261024180000_capoto_declarado.sql). Não se perde dado nenhum.

alter table public.request_surfaces drop constraint if exists request_surfaces_origem_quantidade_check;
alter table public.request_surfaces add constraint request_surfaces_origem_quantidade_check check (
  origem_quantidade is null or origem_quantidade in ('medicao', 'estimativa', 'documento', 'medida_pelo_cliente')
);

-- Pontos-base (regra 1): 600 = ± 6 %. Arredondada para cima na conversão, para nunca prometer menos erro
-- do que o calculado.
alter table public.request_surfaces
  add column if not exists margem_bps int check (margem_bps is null or margem_bps between 1 and 10000);

alter table public.request_surfaces add constraint request_surfaces_margem_so_da_medida_do_cliente check (
  (origem_quantidade = 'medida_pelo_cliente') = (margem_bps is not null)
);
alter table public.request_surfaces add constraint request_surfaces_medida_do_cliente_por_confirmar check (
  origem_quantidade is distinct from 'medida_pelo_cliente' or confirmacao = 'por_confirmar'
);

comment on column public.request_surfaces.margem_bps is
  'Margem de erro (± pontos-base) da área medida pelo cliente na ferramenta de fotografia. Só existe com origem_quantidade = medida_pelo_cliente. Migração 20261106010000.';
