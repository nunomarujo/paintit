-- Obras pretendidas e área aproximada, na ficha do prédio (pedido do promotor, 24/10/2026: "descrever
-- que obras quer neste momento fazer" e "áreas +/-", gravadas à medida que se escrevem).
--
-- `obras_pretendidas` é o que o condomínio quer fazer no prédio, independentemente de a plataforma
-- orçamentar isso ou não — a lista e a regra de quais se orçamentam vivem em
-- `src/domain/buildingNeeds.ts`, não aqui. A base de dados só garante que nada fora da lista entra; qual
-- delas gera pedido é regra de negócio, e muda sem migração.
--
-- A plataforma continua a ser **só de pintura**: os restantes trabalhos registam-se para o avaliador
-- saber o que vai encontrar, e não geram pedido de orçamento. Alargar o âmbito é decisão à parte.

alter table public.buildings
  add column obras_pretendidas text[] not null default '{}',
  -- Centésimos de m², como as restantes áreas do projeto (`request_surfaces.area_cm2`) — o sufixo
  -- "_cm2" dessas colunas é enganador, mas mantém-se a mesma unidade para não haver duas convenções.
  add column area_aproximada_cm2 integer,
  add constraint buildings_obras_pretendidas_check check (
    obras_pretendidas <@ array[
      'pintura_exterior', 'pintura_interior', 'revestimento_fachada', 'impermeabilizacao',
      'caleiras_algerozes', 'telhado_cobertura', 'serralharia', 'carpintaria', 'outro'
    ]::text[]
  ),
  add constraint buildings_area_aproximada_check check (area_aproximada_cm2 is null or (area_aproximada_cm2 >= 0 and area_aproximada_cm2 <= 100000000));
