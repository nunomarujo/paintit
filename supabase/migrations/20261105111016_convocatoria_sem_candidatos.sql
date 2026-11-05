-- Sem candidatos não é esgotar (correção de 05/11/2026).
--
-- Na primeira passagem com as chaves do WhatsApp ligadas (10:28), três levantamentos abertos de Viana do
-- Castelo foram dados por esgotados com zero ondas, só porque ainda nenhum avaliador tinha configurado o
-- WhatsApp — e esgotado é para sempre: nunca mais seriam oferecidos, nem ao primeiro avaliador da zona.
--
-- Passa a haver dois estados distintos:
--   · sem candidatos (`convocatoria_sem_candidatos_em`): ninguém elegível antes da primeira onda. Avisa-se a
--     equipa uma vez e o levantamento continua à espera;
--   · esgotada (`convocatoria_esgotada_em`, já existente): houve ondas e ninguém aceitou, ou os convidados
--     acabaram. Fecha.
--
-- E desfaz-se o erro: os esgotados sem nenhuma onda voltam a estar à espera, marcados como «sem candidatos»
-- (a equipa já foi avisada por email às 10:28, não se avisa de novo).
alter table public.request_surveys
  add column if not exists convocatoria_sem_candidatos_em timestamptz;

update public.request_surveys s
  set convocatoria_sem_candidatos_em = s.convocatoria_esgotada_em, convocatoria_esgotada_em = null
  where s.convocatoria_esgotada_em is not null
    and not exists (select 1 from public.survey_waves w where w.survey_id = s.id);
