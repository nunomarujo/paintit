# WhatsApp — pela Meta, sem intermediário (05/11/2026)

> **Mudança de 05/11/2026.** O envio passava pela Twilio (decisão de 02/11). A Twilio exigia a fotografia do
> cartão de cidadão do gerente, por um terceiro (Persona), para aprovar a conta; o promotor recusou, e a
> Meta só verifica a empresa. A conta Twilio vai ser eliminada. O que está mais abaixo sobre a Twilio
> fica como história; **o que vale é esta secção.** O número +351 926 549 194 e os modelos aprovados
> (`avaliador_nova_oportunidade`, `levantamento_agendado`, `propostas_disponiveis`) são da conta WhatsApp
> Business da Relevante Planeta, não da Twilio: ficam.

## Como funciona agora

- `src/lib/whatsapp.ts` fala com `graph.facebook.com/<versão>/<numeroId>/messages`; `src/domain/whatsapp.ts`
  tem o que se testa sem rede (corpos dos pedidos, assinatura, leitura do webhook).
- `/api/whatsapp`: GET confirma o endereço à Meta (palavra combinada); POST verifica `X-Hub-Signature-256`
  sobre o corpo cru e trata o «Aceito» e os estados de entrega. O botão do convite leva o id do convite no
  payload (`aceito_avaliador:<id>`), por isso a resposta não precisa de adivinhar a que convite se refere.
- Variáveis na Vercel (Production): `WHATSAPP_TOKEN` (token permanente de um utilizador de sistema),
  `WHATSAPP_NUMERO_ID` (identificador do número, não o número), `WHATSAPP_SEGREDO_APP` (segredo da
  aplicação Meta), `WHATSAPP_TOKEN_VERIFICACAO` (uma palavra qualquer, a mesma no painel da Meta).
  Opcionais: `WHATSAPP_MODELO_CONVITE` (omissão `avaliador_nova_oportunidade`), `WHATSAPP_MODELO_AVISO`
  (modelo genérico dos avisos; sem ele só saem os convites), `WHATSAPP_IDIOMA` (`pt_PT`), `WHATSAPP_VERSAO_API`.
- As colunas `twilio_sid` das tabelas `survey_invites` e `whatsapp_messages` guardam agora o id da Meta
  (`wamid…`). O nome ficou: mudá-lo é uma migração sem ganho.

## Passos do promotor, por esta ordem

1. **Verificação da empresa** (business.facebook.com › Definições › Centro de segurança): a Relevante Planeta
   tem de aparecer «Verificada», com documentos da empresa.
2. **Aplicação** (developers.facebook.com › Criar aplicação › tipo Empresa), ligada a esse Business Manager,
   com o produto **WhatsApp**. Guardar o *segredo da aplicação* (Definições › Básico).
3. **Utilizador de sistema** (Business Manager › Utilizadores › Utilizadores do sistema): criar um, dar-lhe a
   aplicação e as permissões `whatsapp_business_messaging` e `whatsapp_business_management`, gerar o token
   **sem expiração**.
4. **Libertar o número da Twilio:** na Twilio, apagar o *WhatsApp sender* +351 926 549 194. Só depois a Meta
   o aceita. Os modelos aprovados mantêm-se na conta WhatsApp Business.
5. **Registar o número na Cloud API** (WhatsApp › Configuração da API › Adicionar número): confirmação por
   SMS/chamada para o cartão SIM. Anotar o *identificador do número*.
6. **Webhook** (WhatsApp › Configuração): URL `https://quempinta.pt/api/whatsapp`, palavra de verificação =
   `WHATSAPP_TOKEN_VERIFICACAO`; subscrever o campo **messages**.
7. **As quatro chaves na Vercel** e *redeploy*. Depois, fechar a conta Twilio e apagar as chaves `TWILIO_*`.
8. **Ensaio:** pedido de teste num concelho com avaliador configurado (ver mais abaixo).

---

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

Os passos 1 a 5 são do promotor e só dele: criar contas em nome da empresa e submeter documentos oficiais
não é coisa que uma sessão de Claude faça, mesmo que se lhe peça (confirmado a 02/11/2026). O que a
sessão faz é dar o texto exato de cada ecrã e, no passo 6, gravar as chaves na Vercel com confirmação.
São uns minutos de preenchimento; a espera é a verificação da Meta.

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

## Convites aos avaliadores — convocatória por ondas (05/11/2026)

Construído e publicado: regras em `src/domain/convocatoria.ts`, envio em `src/lib/convocatorias.ts`, rotas
`/api/convocatorias` (chamada pela base ao minuto, só em horário útil e só quando há trabalho) e
`/api/whatsapp` (o «Aceito» e os estados de entrega), migração `20261105094801_convocatoria_por_ondas`
(aplicada). Decisões em `docs/DECISOES.md`, «Convocatória por ondas».

Os convites **não** dependem do modelo genérico de avisos (`WHATSAPP_MODELO_AVISO`): chegam três chaves
da conta mais o modelo do convite. Sem elas a convocatória não envia nada e nada falha.

### O que fica do lado do promotor

1. **Chaves na Vercel** (projeto `paintit`, Production) — confirmado a 05/11/2026 que ainda não lá estão:
   `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_WHATSAPP_FROM` (`whatsapp:+351926549194`) e
   `WHATSAPP_MODELO_CONVITE` = `HXf935d8b59e7b691ef507936d14f3ee14` (modelo `avaliador_nova_oportunidade`,
   variáveis `{{1}}` concelho e `{{2}}` descrição, botão de resposta rápida «Aceito» com payload
   `aceito_avaliador`). Depois, um *redeploy*.
2. **Endereço das mensagens recebidas na Twilio** (Messaging › Senders › WhatsApp senders › o número ›
   *Webhook URL for incoming messages*): `https://quempinta.pt/api/whatsapp`, método POST. Tem de ser
   **exatamente** este endereço: a assinatura da Twilio é calculada sobre ele e a aplicação recusa (403)
   qualquer pedido cuja assinatura não bata. Se tiver de ser outro, pôr o mesmo valor em
   `WHATSAPP_WEBHOOK_URL`.
3. **Modelos de resposta** — não são precisos: as respostas ao «Aceito» («reservado», «já atribuída»)
   saem dentro das 24 horas a seguir à mensagem da própria pessoa, onde o WhatsApp aceita texto livre.
4. **Ensaio:** com uma conta de avaliador, em «Avaliações › Disponibilidade e alertas», ligar o WhatsApp
   com o próprio número, escolher concelho base e raio, e confirmar que a lista «falta» fica vazia. Criar
   um pedido de teste nesse concelho num dia útil entre as 9h e as 18h: o convite chega no minuto
   seguinte; carregar em «Aceito» reserva o levantamento e a resposta traz a ligação para a ficha.
