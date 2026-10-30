-- Quem Pinta — as medidas do prédio, separadas das zonas a pintar (30/10/2026).
--
-- «Separar a geometria do edifício das superfícies de intervenção» e «a alteração de largura,
-- profundidade ou altura deve atualizar o modelo» (promotor, 30/10/2026).
--
-- Até aqui o desenho do prédio tinha proporções canónicas e a única medida verdadeira era o número
-- de pisos. Tudo o resto — quanto mede de frente, de fundo, que pé-direito tem — não existia em
-- lado nenhum, e por isso o volume era uma ilustração, não um modelo. Estas três colunas são o que
-- falta para ser um modelo.
--
-- **Uma origem para as três.** As medidas de um prédio tiram-se de uma vez, pela mesma pessoa, na
-- mesma ocasião: ou alguém as mediu, ou leu-as numa planta, ou são de olho. Três colunas de origem
-- davam a entender uma precisão de registo que ninguém vai ter. Fica uma.
--
-- Em centímetros inteiros, como todas as medidas desta base.

alter table public.buildings
  add column largura_cm integer check (largura_cm is null or (largura_cm > 0 and largura_cm <= 50000)),
  add column profundidade_cm integer check (profundidade_cm is null or (profundidade_cm > 0 and profundidade_cm <= 50000)),
  add column pe_direito_cm integer check (pe_direito_cm is null or (pe_direito_cm between 180 and 800)),
  add column medidas_origem text not null default 'estimativa'
    check (medidas_origem in ('estimativa', 'medicao', 'planta'));

comment on column public.buildings.largura_cm is 'Frente do prédio, ao longo da fachada principal. Nulo = por medir; nunca calculado a partir de áreas.';
comment on column public.buildings.profundidade_cm is 'Fundo, da fachada principal ao tardoz. Nulo = por medir.';
comment on column public.buildings.pe_direito_cm is 'Pé-direito de um piso. A altura total é pisos × pé-direito, e só existe com as duas parcelas.';
comment on column public.buildings.medidas_origem is 'De onde vêm as três medidas acima: de olho, de uma medição, ou de uma planta.';
