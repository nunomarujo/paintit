-- Área da obra, para comparar preço cobrado com custo real (25/10/2026, docs/DECISOES.md).
--
-- A margem em euros diz se aquela obra deu lucro. O custo por m² é que diz quanto cobrar na próxima,
-- e para isso é preciso saber a área intervencionada — que a aplicação já conhece, das linhas em m²
-- do orçamento ou da proposta que deu origem à obra.

alter table public.worksites add column if not exists area_cm2 bigint
  check (area_cm2 is null or area_cm2 >= 0);

comment on column public.worksites.area_cm2 is
  'Área intervencionada em centésimos de m². Vem das linhas em m² do orçamento ou da proposta; o pintor pode corrigi-la.';

-- Preencher as obras que vieram da plataforma, somando as linhas em m² da proposta escolhida.
update public.worksites w
set area_cm2 = s.area
from (
  select e.id as engagement_id, sum(l.quantidade) as area
  from public.engagements e
  join public.proposal_lines l on l.proposal_id = e.proposal_id
  where l.unidade = 'm2' and l.inclusao = 'incluido'
  group by e.id
) s
where w.engagement_id = s.engagement_id and w.area_cm2 is null and s.area > 0;
