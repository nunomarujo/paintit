# Prompt para o Claude no navegador — configurar `mail.quempinta.pt` no Resend

Copiar tudo o que está abaixo da linha para o Claude no navegador (com a sessão aberta no Resend e no painel de DNS).

---

Tarefa: configurar o subdomínio `mail.quempinta.pt` como domínio de envio no Resend, para os emails de divulgação da Quem Pinta (quempinta.pt). Fazer só isto.

1. No Resend (resend.com/domains), clicar em «Add Domain», escrever `mail.quempinta.pt`, escolher a região da UE (Ireland, eu-west-1) e confirmar. Se o domínio já existir, abri-lo.
2. O Resend mostra uma lista de registos DNS (tipicamente: um MX e um TXT de SPF em `send.mail`, e um TXT de DKIM em `resend._domainkey.mail`). **Copiar os valores exatamente como o Resend os mostra**, sem os alterar.
3. Descobrir onde o DNS de `quempinta.pt` está gerido (o registo NS do domínio indica-o; pode ser o registador do domínio ou um serviço de DNS). Abrir o painel desse serviço.
4. Acrescentar os registos do passo 2. Acrescentar também, se ainda não existir um `_dmarc.quempinta.pt`, este TXT: `v=DMARC1; p=none; rua=mailto:nm@quempinta.pt`. Se já existir um DMARC, não o alterar.
5. **Não alterar nem apagar nenhum registo existente** de `quempinta.pt` (sobretudo os MX do correio atual, os registos do site e os SPF/DKIM já em uso). Só acrescentar.
6. Voltar ao Resend e carregar em «Verify DNS Records». A propagação pode demorar minutos a horas; repetir de vez em quando. Em «Configuration» do domínio, desligar o «Open tracking» e o «Click tracking» (a Quem Pinta mede os cliques por conta própria).
7. Não criar nem mostrar chaves de API. Não copiar segredos para o chat.

Quando o domínio estiver «Verified», responder com: (a) o estado de cada registo (Verified/Pending), (b) onde está gerido o DNS, (c) qualquer registo que não tenha conseguido acrescentar e porquê.
