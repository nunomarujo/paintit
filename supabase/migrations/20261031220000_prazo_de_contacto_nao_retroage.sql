-- Uma regra nova não cai em cima de quem já tinha reservado.
--
-- A migração 20261031200000 copiou as reservas existentes para tentativas e, de propósito, manteve o prazo
-- de conclusão que cada uma já tinha prometido (`reserve_deadline`) em vez de o recalcular: ninguém vê o seu
-- prazo mudar por causa de uma migração. Mas calculou **o prazo de contacto pela regra nova**, e aí criou uma
-- obrigação que não existia quando aquela reserva foi aceite.
--
-- Visto em produção a 31/10/2026, numa reserva aceite nesse dia às 13h32 (sábado):
--
--   prazo de contacto  →  segunda, 2/11, 10h00   (regra nova, primeira hora útil)
--   prazo de conclusão →  segunda, 2/11, 13h32   (as 48 horas que já lhe tinham sido prometidas)
--
-- A verificação ao minuto teria libertado essa vaga às 10h00 por «não registou o contacto na primeira hora
-- útil» — um marco que o avaliador nunca soube que tinha. Eram reservas de ensaio, por isso não houve dano;
-- mas a regra estava errada e numa reserva real teria custado um trabalho a quem não falhou nada.
--
-- Correção: nas tentativas que vêm da cópia, o prazo de contacto passa a ser o próprio prazo de conclusão. O
-- marco da primeira hora útil deixa de poder vencer sozinho, e a tentativa continua a reger-se só pelo prazo
-- que lhe foi prometido — que é exactamente o que a manutenção diária fazia antes. A primeira hora útil
-- aplica-se a partir das reservas aceites já com a regra, que é o seu lugar.
--
-- Reconhecem-se pela aritmética, não por uma data escrita à mão: numa tentativa nascida da regra nova, a
-- conclusão são exactamente 48 horas depois do contacto. Nas copiadas, não é.
update public.survey_attempts
  set prazo_contacto = prazo_conclusao
  where estado in ('ativa', 'em_revisao')
    and prazo_conclusao <> prazo_contacto + interval '48 hours';
