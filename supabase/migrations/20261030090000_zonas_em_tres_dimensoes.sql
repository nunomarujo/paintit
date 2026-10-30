-- As três dimensões de uma zona do pedido (decisão do promotor, 30/10/2026).
--
-- O campo `origem` respondia a três perguntas ao mesmo tempo e não respondia bem a nenhuma:
-- "medicao_cliente" dizia o método E quem o usou, e nada dizia sobre se a zona entra na obra nem
-- se o número já foi verificado. Um profissional que vai ao local pode medir uma fachada e estimar
-- outra — "levantamento" é o processo, não o método.
--
-- Passam a ser três colunas independentes, mais o registo de quem pôs lá o número:
--
--   participacao        incluida | por_decidir | excluida
--   origem_quantidade   medicao | estimativa | documento
--   confirmacao         por_confirmar | confirmada
--
-- Uma zona EXCLUÍDA é uma decisão, não uma ausência: fica no pedido, identificada, para não restar
-- dúvida de que foi considerada e deixada de fora. Não exige quantidade, não entra no total nem nas
-- validações de publicação, e conserva os dados que já tivesse. Uma zona que simplesmente não está
-- na lista não é nada disto — e ninguém é obrigado a inventariar o imóvel inteiro.
--
-- Migração aditiva (CLAUDE.md): a coluna `origem` fica, com os valores antigos, até o promotor
-- confirmar que se pode largar. Enquanto lá estiver, é só história.

alter table public.request_surfaces
  add column if not exists participacao text not null default 'incluida'
    check (participacao in ('incluida', 'por_decidir', 'excluida')),
  add column if not exists origem_quantidade text
    check (origem_quantidade is null or origem_quantidade in ('medicao', 'estimativa', 'documento')),
  add column if not exists confirmacao text not null default 'por_confirmar'
    check (confirmacao in ('por_confirmar', 'confirmada')),
  -- Quem pôs lá o número, e quando. O promotor pediu-o de propósito: a revisão pelo cliente não
  -- deve transformar uma medida técnica em algo que se presume que ele verificou pessoalmente.
  add column if not exists registado_por uuid references auth.users (id),
  add column if not exists registado_em timestamptz,
  add column if not exists observacoes text check (observacoes is null or length(observacoes) <= 2000);

-- O que já lá estava, traduzido: o método antigo para o novo, e a confirmação segundo o método.
-- Uma medição do cliente é um número que alguém foi ver ao local, e por isso conta como
-- confirmada; uma estimativa e uma planta não, até alguém as verificar no sítio.
update public.request_surfaces
   set origem_quantidade = case origem
         when 'medicao_cliente' then 'medicao'
         when 'planta' then 'documento'
         else 'estimativa'
       end,
       confirmacao = case when origem = 'medicao_cliente' then 'confirmada' else 'por_confirmar' end
 where origem_quantidade is null;

comment on column public.request_surfaces.participacao is
  'A zona entra nesta obra? Excluída é uma decisão registada, não a ausência da zona na lista.';
comment on column public.request_surfaces.origem_quantidade is
  'Como se chegou à quantidade. Null quando a zona está excluída e não tem quantidade nenhuma.';
comment on column public.request_surfaces.confirmacao is
  'A quantidade já foi verificada no local? Uma estimativa por verificar não é um número errado — é um número por confirmar.';
comment on column public.request_surfaces.origem is
  'OBSOLETA desde 30/10/2026: substituída por origem_quantidade + confirmacao. Só história.';
