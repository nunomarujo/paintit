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

## Estado dos modelos e da conta (lido a 05/11/2026)

- **A conta WhatsApp atual** («Relevante Planeta, Lda - Twilio, Inc», id 1776463656911573) foi criada pela
  Twilio e é **paga pela linha de crédito da Twilio**: a Meta bloqueia nela as definições de pagamento, e o
  seletor de contas não mostra outra. Decisão do promotor (B): criar uma conta WhatsApp nova, só da Relevante
  Planeta, com pagamento próprio, e passar o número +351 926 549 194 (id 1409052285626700) para lá. Os
  modelos não passam: recriam-se.
- **`avaliador_nova_oportunidade`** (categoria Serviços/Utility, idioma português, botão de resposta rápida
  «Aceito», sem cabeçalho nem rodapé). Corpo antigo (conta Twilio), que mandava
  ir ao site: «…Aceite-o em quempinta.pt…». Corpo novo, a submeter na conta nova, que
  `CORPO_DO_MODELO_DO_CONVITE` (`src/domain/convocatoria.ts`) repete: «Quem Pinta: há um levantamento
  disponível em {{1}} ({{2}}). Carregue em «Aceito» para ficar com ele: fica com o trabalho a primeira pessoa a
  aceitar. Depois de aceitar, tem uma hora útil para contactar o cliente.» Exemplos usados:
  Braga / prédio de 6 andares. O payload do botão não vai no modelo: a aplicação envia-o em cada mensagem.
- `propostas_disponiveis` (Marketing — mais cara que Utility; não usado) e `levantamento_agendado` (em
  revisão; não usado). Estado «Qualidade pendente» é o normal de um modelo ainda sem envios.

## A subscrição à conta (05/11/2026) — o que faltava depois de «tudo ligado»

Sintoma: o convite saía (a Meta aceitava o pedido e devolvia o id) mas **nunca chegava nenhum estado nem o
«Aceito»** ao `/api/whatsapp`, ao passo que o teste do painel («Test» ao lado de `messages`) chegava e era
guardado. Causa: subscrever o campo `messages` no painel da aplicação **não subscreve a aplicação à conta
WhatsApp**; a Meta só entrega à aplicação o que vem de contas a que ela está subscrita
(`/{conta}/subscribed_apps`), e o teste do painel ignora essa condição, o que disfarça a falha. A conta antiga
tinha-a (criada pela Twilio); a nova, criada à mão, nasceu sem ela.

- **O identificador a usar é o da conta de mensagens** (aqui 2334889570658270), não o da conta WhatsApp
  (1466775882007762): com este último a Meta responde «This API is not supported for this WhatsApp Business
  Account». O GET devolvia `data: []`; depois do POST, a lista traz a aplicação «Quem Pinta».
- Faz-se com `GET/POST /api/whatsapp/subscricao?waba=<id>` (protegida pelo segredo dos trabalhos internos), a
  chamar a Meta com o `WHATSAPP_TOKEN` do servidor. Foi chamada da base com pg_net, usando o segredo do cofre,
  para o segredo não passar por mãos humanas.
- Qualquer conta WhatsApp nova precisa disto, por ordem: criar conta → dar-lhe o utilizador de sistema →
  **subscrever a aplicação** → webhook → publicar a aplicação (modo Live).
- Para provar a entrega sem esperar por um levantamento: «Enviar mensagem» em WhatsApp › Configuração da API
  (modelo `hello_world`) para o telemóvel de ensaio; se chegar, a conta envia.

## Ensaio de ponta a ponta (05/11/2026, 20:31) — passou

Convite do QP-1009 reenviado por `/api/whatsapp/reenviar` → estado «delivered» → «Aceito» no botão → reserva
em nome da pessoa → resposta «Levantamento reservado…» entregue e lida. Dois achados: (1) o limite de 64
caracteres no identificador da mensagem recusava, em silêncio, a linha das mensagens **recebidas** (os
`wamid` delas são mais compridos): passou a 255 (`20261105203307`); (2) até a aplicação estar subscrita à
conta (secção acima) nada disto chega. O texto do modelo na Meta continua «Marketing», em revisão.

## O contrato pronto para assinar (05/11/2026)

Modelo `contrato_para_assinar` (Utilidade, Português de Portugal): {{1}} a referência da obra; botão «Visitar
website», «Abrir o contrato», com o identificador da contratação no fim de `https://quempinta.pt/app/contratacoes/{{1}}`.
Sai no mesmo momento do email, quando é a vez de uma parte assinar, a quem pode assinar pela entidade e deu o
consentimento e o número (`survey_availability`, a preferência de toda a aplicação; liga-se no Perfil e na página do
contrato). Só sai com `WHATSAPP_MODELO_CONTRATO` na Vercel, depois de a Meta aprovar o modelo. Código:
`contratoParaAssinarPorWhatsApp` em `src/lib/notify.ts`; botão de ligação em `corpoDoModelo` (`src/domain/whatsapp.ts`).


## Confirmar o número de quem recebe avisos (06/11/2026)

Os números não se escrevem: confirmam-se por mensagem recebida. A pessoa carrega em «Associar um número» (perfil,
inscrição de avaliador, página do contrato, «Disponibilidade e alertas»), recebe um código `QP-XXXX-XXXX` e abre o
WhatsApp já com a mensagem escrita para o número da plataforma (`BRAND.whatsapp`, `src/config/brand.ts`). O webhook
(`/api/whatsapp`) lê o código na mensagem e chama `confirmar_numero_whatsapp(código, número de quem escreveu)`; responde
em texto livre (a pessoa falou primeiro, por isso cabe na janela de 24 horas). Escrever «PARAR» do próprio número tira-o
(`parar_whatsapp`). Regras, limites e a razão: `docs/DECISOES.md`, 06/11/2026. Sem número confirmado nada se envia: todos
os sítios que enviam leem `survey_availability.telemovel_whatsapp`, agora derivado dos números confirmados.
