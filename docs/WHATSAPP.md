# Avisos por WhatsApp

Decidido a 02/11/2026. O código está feito e publicado; o canal só abre quando as quatro chaves estiverem
na Vercel. Até lá, a preferência «Receber também por WhatsApp» guarda-se e não faz nada — e o email
continua a sair como sempre.

## Como funciona

- A fila de avisos é a mesma do email (`avisos_por_email`). Por cada aviso, se a pessoa ligou o WhatsApp
  e deu o número, sai também uma mensagem. O resultado fica na própria linha (`whatsapp_estado`).
- Uma falha no WhatsApp nunca trava o email, nem o contrário. O aviso dentro da aplicação aparece sempre.
- Consentimento explícito, por pessoa, em «Disponibilidade e alertas»: sem ele não se envia. É regra do
  WhatsApp e regra da casa.
- **Um só modelo aprovado**, com três variáveis — assunto, texto, ligação — que são as colunas da fila. Um
  aviso novo na aplicação não precisa de aprovação nova na Meta.
- Número em formato internacional (`+351…`), normalizado pela aplicação (`src/domain/whatsapp.ts`).

Ficheiros: `src/domain/whatsapp.ts` (regras, testadas), `src/lib/whatsapp.ts` (a chamada ao serviço),
`src/lib/avisosPorEmail.ts` (o esvaziamento da fila), migração `20261102090000_avisos_por_whatsapp`.

## O que fica do lado do promotor (por ordem)

1. **Um número de telemóvel dedicado** que não esteja ligado a nenhuma conta WhatsApp (nem normal nem
   Business). Pode ser um cartão novo. Serve só para receber o SMS de verificação uma vez.
2. **Conta Twilio** (twilio.com), com os dados da Relevante Planeta, Lda. Guardar o *Account SID* e o
   *Auth Token* (Console › Account Info).
3. **WhatsApp Sender na Twilio** (Messaging › Senders › WhatsApp senders › New sender): associa o número
   do passo 1 a um *WhatsApp Business Account* da Meta. A Twilio guia o processo; pede o nome da empresa
   como aparece no WhatsApp («Quem Pinta»), o site (quempinta.pt) e a categoria.
4. **Verificação da empresa na Meta** (business.facebook.com › Definições › Centro de segurança ›
   Verificação): certidão permanente ou documento com o nome legal e morada da Relevante Planeta.
   Demora de horas a alguns dias. Sem isto o número fica limitado a poucos destinatários.
5. **O modelo de mensagem** (Twilio › Content Template Builder › Create):
   - Nome: `aviso_quem_pinta`; idioma: Português (PT); categoria: **Utility**.
   - Corpo, exatamente:
     ```
     {{1}}

     {{2}}

     Ver na Quem Pinta: {{3}}
     ```
   - Variáveis de exemplo: `{{1}}` = `Prazo de contacto a acabar`, `{{2}}` = `O levantamento QP-1042 em
     Viana do Castelo tem a primeira hora útil a terminar às 10h00.`, `{{3}}` =
     `https://quempinta.pt/app/levantamentos/…`
   - Submeter à aprovação da Meta (horas, por vezes um dia). Guardar o *Content SID* (começa por `HX`).
6. **As quatro chaves na Vercel** (projeto `paintit`, ambiente Production):
   `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_WHATSAPP_FROM` (`whatsapp:+351…`),
   `WHATSAPP_MODELO_AVISO` (o `HX…`). Depois, um *redeploy*.
7. **Ensaio:** em «Disponibilidade e alertas», ligar o WhatsApp com o próprio número e reservar um
   levantamento de teste; o primeiro aviso de prazo deve chegar ao telemóvel.

Custo: em Portugal, alguns cêntimos por conversa de 24 horas, cobrados pela Twilio. Para o volume atual é
irrelevante.
