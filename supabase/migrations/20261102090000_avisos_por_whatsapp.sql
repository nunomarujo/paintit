-- Avisos por WhatsApp (02/11/2026, pedido do promotor).
--
-- O canal é opcional e pessoal: cada pessoa liga-o em «Disponibilidade e alertas», dá o número, e só a
-- partir daí os avisos que já saem por email saem também por WhatsApp. Sem consentimento explícito não
-- sai nada — é exigência do próprio WhatsApp, além de ser a regra da casa.
--
-- A fila é a mesma (`avisos_por_email`): o WhatsApp é um segundo resultado por linha, não uma segunda
-- fila. Uma falha no WhatsApp não trava o email, nem o contrário.

alter table public.survey_availability
  add column if not exists alerta_whatsapp boolean not null default false,
  -- Em formato internacional («+351…»), validado pela aplicação (src/domain/whatsapp.ts).
  add column if not exists telemovel_whatsapp text
    check (telemovel_whatsapp is null or telemovel_whatsapp ~ '^\+[0-9]{8,15}$'),
  add constraint survey_availability_whatsapp_com_numero
    check (not alerta_whatsapp or telemovel_whatsapp is not null);

alter table public.avisos_por_email
  add column if not exists whatsapp_estado text
    check (whatsapp_estado is null or whatsapp_estado in ('enviado', 'falhou', 'sem_consentimento')),
  add column if not exists whatsapp_erro text check (whatsapp_erro is null or length(whatsapp_erro) <= 500),
  add column if not exists whatsapp_em timestamptz;

comment on column public.avisos_por_email.whatsapp_estado is
  'Resultado do envio por WhatsApp da mesma linha, quando o destinatário o ligou. Nulo: ainda não tentado.';

-- O esvaziamento corre com a chave de serviço e lê a preferência de cada destinatário daqui: a tabela não
-- ganha política nenhuma nova, porque continua a ser cada pessoa a ler e escrever só a sua linha.
