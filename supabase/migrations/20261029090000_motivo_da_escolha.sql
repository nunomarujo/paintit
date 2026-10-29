-- O motivo da escolha, escrito pelo cliente (decisão do promotor, 28/10/2026).
--
-- O relatório para a assembleia mostra a análise da plataforma: preços, cobertura, a conta da
-- diferença. Nada disso é uma decisão — e o administrador que leva o relatório à assembleia tem de
-- justificar a dele, a trinta condóminos que não estiveram lá e que vão perguntar porque é que não
-- se escolheu a mais barata.
--
-- Por isso o motivo é dele e fica separado: no relatório aparece com o nome de quem o escreveu, ao
-- lado — nunca misturado com — o que a plataforma calculou. É a diferença entre um relatório que
-- ajuda a decidir e um que parece ter decidido.
--
-- Vive no pedido e não na contratação: escreve-se enquanto se compara, antes de haver contrato.

alter table public.work_requests
  add column if not exists motivo_escolha text,
  add column if not exists motivo_escolha_em timestamptz;

alter table public.work_requests drop constraint if exists work_requests_motivo_escolha_check;
alter table public.work_requests
  add constraint work_requests_motivo_escolha_check
    check (motivo_escolha is null or (length(btrim(motivo_escolha)) > 0 and length(motivo_escolha) <= 4000));

comment on column public.work_requests.motivo_escolha is
  'Porque é que o cliente escolheu a proposta que escolheu. Dele, não da plataforma: no relatório aparece à parte da análise.';
comment on column public.work_requests.motivo_escolha_em is
  'Quando foi escrito. Serve a quem lê o relatório mais tarde e precisa de saber se foi antes ou depois da escolha.';
