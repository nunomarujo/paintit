-- Capoto declarado antes de ser orçamentado (24/10/2026, pedido do promotor: "o capoto não era para
-- ser apresentado como separador — a menos que anteriormente já haja sido indicado esse tipo de
-- isolamento pelo cliente e pelo avaliador").
--
-- Até aqui ninguém o podia declarar: não existia nem nas obras pretendidas do prédio nem nos
-- trabalhos do pedido. Sem esta declaração, o campo do capoto não tem como saber se deve aparecer.

alter table public.buildings drop constraint if exists buildings_obras_pretendidas_check;
alter table public.buildings
  add constraint buildings_obras_pretendidas_check check (
    obras_pretendidas <@ array[
      'pintura_exterior', 'pintura_interior', 'revestimento_fachada', 'isolamento_capoto',
      'impermeabilizacao', 'caleiras_algerozes', 'telhado_cobertura', 'serralharia', 'carpintaria', 'outro'
    ]::text[]
  );

alter table public.work_requests drop constraint if exists work_requests_trabalhos_check;
alter table public.work_requests
  add constraint work_requests_trabalhos_check check (
    trabalhos <@ array['lavagem', 'reparacao_fissuras', 'tratamento_humidade', 'primario', 'pintura',
      'impermeabilizacao', 'tratamento_metais', 'capoto']::text[]
  );

alter table public.request_surfaces drop constraint if exists request_surfaces_trabalhos_check;
alter table public.request_surfaces
  add constraint request_surfaces_trabalhos_check check (
    trabalhos is null or trabalhos <@ array['lavagem', 'reparacao_fissuras', 'tratamento_humidade',
      'primario', 'pintura', 'impermeabilizacao', 'tratamento_metais', 'capoto']::text[]
  );
