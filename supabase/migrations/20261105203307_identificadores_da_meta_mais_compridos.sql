-- Os identificadores de mensagem da Meta (`wamid…`) das respostas recebidas passam dos 64 caracteres que se
-- tinham deixado para os da Twilio (05/11/2026). No ensaio do «Aceito», a reserva correu mas a linha da
-- mensagem recebida foi recusada em silêncio pelo limite. Passa a 255, que a Meta deixa de sobra.
alter table public.whatsapp_messages drop constraint if exists whatsapp_messages_twilio_sid_check;
alter table public.whatsapp_messages add constraint whatsapp_messages_twilio_sid_check
  check (twilio_sid is null or length(twilio_sid) <= 255);
alter table public.survey_invites drop constraint if exists survey_invites_twilio_sid_check;
alter table public.survey_invites add constraint survey_invites_twilio_sid_check
  check (twilio_sid is null or length(twilio_sid) <= 255);
