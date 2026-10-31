-- Dois segundos não chegam para um arranque a frio.
--
-- Visto em produção a 31/10/2026, no primeiro ensaio de ponta a ponta. O pedido chegou à aplicação — o
-- registo do pg_net mostra DNS em 119 ms e o aperto de mão em 37 ms — mas a resposta levou 1845 ms e o limite
-- de 2000 ms esgotou-se logo a seguir:
--
--   Timeout of 2000 ms reached. Total time: 2001.486 ms
--   (DNS 118.679 ms, TCP/SSL 36.820 ms, Request/Response 1844.946 ms)
--
-- Uma função sem tráfego arranca de frio, e isso leva segundos. O limite de dois segundos foi escolhido por
-- cautela errada: **o `net.http_post` é assíncrono** — entrega o pedido a um trabalhador do pg_net e devolve
-- logo —, por isso o tempo de espera não prende a transação da reserva nem a verificação dos prazos. Esperar
-- mais não custa nada a quem chamou; esperar menos custa a confirmação.
--
-- Quinze segundos. E note-se que, mesmo com o tempo esgotado, nada se perdia: o pedido tinha sido entregue, e
-- quem reclama linhas marca-as como `a_enviar`, por isso um pedido repetido no minuto seguinte não as envia
-- duas vezes. O que se perdia era a resposta — e com ela a possibilidade de saber se o caminho está vivo.
create or replace function private.pedir_envio_de_avisos() returns void
language plpgsql security definer set search_path = '' as $$
declare
  destino text;
  segredo text;
begin
  begin
    select decrypted_secret into destino from vault.decrypted_secrets where name = 'avisos_url' limit 1;
    select decrypted_secret into segredo from vault.decrypted_secrets where name = 'avisos_segredo' limit 1;
    if destino is null or segredo is null then return; end if;
    perform net.http_post(
      url := destino,
      headers := jsonb_build_object('Authorization', 'Bearer ' || segredo, 'Content-Type', 'application/json'),
      body := '{}'::jsonb,
      -- Folgado de propósito: a espera corre no trabalhador do pg_net, não na transação de quem chamou.
      timeout_milliseconds := 15000
    );
  exception when others then
    return;
  end;
end $$;
revoke all on function private.pedir_envio_de_avisos() from public, anon, authenticated;
