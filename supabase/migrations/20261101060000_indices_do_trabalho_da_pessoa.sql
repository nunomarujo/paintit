-- Índices para as consultas do workspace do avaliador (01/11/2026).
--
-- A reformulação trocou o filtro: os ecrãs das Avaliações deixaram de procurar pelo que é da empresa
-- (`vendedor_org_id`) e passaram a procurar pelo que é da pessoa (`vendedor_user_id`) — é a regra de
-- privacidade entre pessoa e empresa. Essa coluna tem chave estrangeira mas não tinha índice: cada
-- abertura de «Hoje», de «Os meus levantamentos», das comissões ou da qualificação fazia uma leitura
-- sequencial da tabela inteira. Com cinco levantamentos não se nota; com cinco mil, nota-se em todas.
--
-- Aditiva: só acrescenta índices. `if not exists` em todos, para poder correr duas vezes.

create index if not exists survey_attempts_vendedor_user_idx
  on public.survey_attempts (vendedor_user_id);

create index if not exists request_surveys_vendedor_user_idx
  on public.request_surveys (vendedor_user_id);

-- «Os meus levantamentos» pede sempre as tentativas de uma pessoa num punhado de estados, pela ordem
-- de aceitação: o índice composto responde à consulta inteira sem ir à tabela ordenar.
create index if not exists survey_attempts_pessoa_estado_idx
  on public.survey_attempts (vendedor_user_id, estado, aceita_em desc);

-- A qualificação lê as avaliações de uma pessoa, da mais recente para a mais antiga.
create index if not exists survey_reviews_vendedor_user_idx
  on public.survey_reviews (vendedor_user_id, created_at desc);

-- As comissões pessoais cruzam os pagamentos pelos levantamentos da pessoa.
create index if not exists survey_payouts_request_survey_idx
  on public.survey_payouts (request_survey_id);
