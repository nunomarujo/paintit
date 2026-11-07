# Prompt para o Claude no navegador — configurar `mail.quempinta.pt` no Resend

Copiar tudo o que está abaixo da linha para o Claude no navegador (com a sessão aberta no Resend e no painel de DNS).

---

Tarefa: configurar o subdomínio `mail.quempinta.pt` como domínio de envio no Resend, para os emails de divulgação da Quem Pinta (quempinta.pt). Fazer só isto.

1. No Resend (resend.com/domains), clicar em «Add Domain», escrever `mail.quempinta.pt`, escolher a região da UE (Ireland, eu-west-1) e confirmar. Se o domínio já existir, abri-lo.
2. O Resend mostra uma lista de registos DNS (tipicamente: um MX e um TXT de SPF em `send.mail`, e um TXT de DKIM em `resend._domainkey.mail`). **Copiar os valores exatamente como o Resend os mostra**, sem os alterar.
3. O DNS de `quempinta.pt` está nos servidores de nomes `dns1..dns4.host-redirect.com` (consultado a 07/11/2026): é o painel do registador onde o domínio foi comprado. Abrir o painel desse serviço. **O correio do domínio raiz passa pelo ImprovMX (MX `mx1/mx2.improvmx.com`) e o SPF da raiz inclui Google e ImprovMX: não mexer em nenhum destes.** O `mail.quempinta.pt` ainda não tem registo nenhum.
4. Acrescentar os registos do passo 2. Já existe um DMARC em `_dmarc.quempinta.pt` (`v=DMARC1; p=none;`): **não o alterar nem acrescentar outro**.
5. **Não alterar nem apagar nenhum registo existente** de `quempinta.pt` (sobretudo os MX do correio atual, os registos do site e os SPF/DKIM já em uso). Só acrescentar.
6. Voltar ao Resend e carregar em «Verify DNS Records». A propagação pode demorar minutos a horas; repetir de vez em quando. Em «Configuration» do domínio, desligar o «Open tracking» e o «Click tracking» (a Quem Pinta mede os cliques por conta própria).
7. Não criar nem mostrar chaves de API. Não copiar segredos para o chat.

Quando o domínio estiver «Verified», responder com: (a) o estado de cada registo (Verified/Pending), (b) onde está gerido o DNS, (c) qualquer registo que não tenha conseguido acrescentar e porquê.
