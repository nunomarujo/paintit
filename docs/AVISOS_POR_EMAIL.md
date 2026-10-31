# Avisos de prazo por email — como funciona, e o que falta configurar

Escrito a 31/10/2026, quando a regra dos prazos do levantamento entrou. Ler antes de ativar os prazos para
avaliadores reais.

## O problema que isto resolve

Os avisos de prazo nascem **dentro da base de dados**: a verificação de vencimentos corre ao minuto, em
`pg_cron`, e é ela que liberta uma vaga ou põe uma tentativa em revisão. Os emails saem **da aplicação**, que
é quem fala com o Resend. Sem ponte entre as duas coisas, o avaliador vê o aviso dentro da aplicação e mais
nada — e um prazo de uma hora que só aparece a quem estiver a olhar não é um aviso.

Antes disto havia um problema pior, já corrigido: o avaliador tem o papel `vendedor`, que não constava da
política de leitura de `notifications`. **Não via aviso nenhum**, nem dentro da aplicação. Hoje um aviso pode
ter dono, e o dono vê-o seja qual for o seu papel.

## O caminho, de uma ponta à outra

1. A verificação dos prazos fecha uma tentativa e chama `private.notify_user_por_email`.
2. Essa função escreve o aviso em `notifications`, **dirigido à pessoa**, e põe uma linha em
   `avisos_por_email`. A unicidade de `notification_id` é o que impede duplicados.
3. A seguir pede à aplicação que esvazie a fila, por `pg_net`. O endereço e o segredo vêm do **Vault**.
4. A aplicação reclama linhas com `public.reclamar_avisos` — porta aberta **só à chave de serviço**. A base
   reconfirma a pertinência imediatamente antes de entregar: um aviso cuja tentativa mudou de dono é
   **dispensado**, não enviado a quem já não é o avaliador daquela tentativa.
5. Envia pelo mecanismo que já existia e registra o resultado com `public.resultado_do_aviso`. Em caso de
   falha, a linha volta à fila com recuo progressivo; à quinta tentativa desiste e fica registada.

Há **três** coisas a pedir o esvaziamento, não uma:

| Quem pede | Quando | Para que serve |
|---|---|---|
| `pg_net`, na própria escrita do aviso | logo | o caminho normal |
| a verificação ao minuto | a cada minuto, se ficou alguma linha para trás | as repetições dentro da hora |
| `/api/cron/avisos` | uma vez por dia | rede de último recurso, se o `pg_net` estiver em baixo |

A tarefa da aplicação é diária porque o plano atual da Vercel é **Hobby**, que limita as tarefas a uma vez
por dia, com precisão à hora (±59 min), e **recusa o deploy** a qualquer expressão mais frequente. Num prazo
de uma hora, essa rede não substitui o caminho normal: apanha o que ele perdeu, no dia seguinte. É por isso
que as repetições dentro da hora vivem na verificação ao minuto, dentro da base. **Se um dia isto passar a
Pro, o caminho mais simples é mudar `/api/cron/avisos` para cada cinco minutos** e deixar de depender tanto
do `pg_net`.

## O que não se promete

O que se desencadeia é o **envio**. A entrega na caixa de correio depende do Resend e do correio de destino,
e não é coisa que esta fila possa garantir. A garantia que se dá é outra: **o aviso pessoal fica visível na
aplicação mesmo que o email nunca saia.**

## Configuração em produção

Variáveis de ambiente na Vercel — **as três já existem** (confirmado a 31/10/2026): `CRON_SECRET`,
`RESEND_API_KEY`, `SUPABASE_SECRET_KEY`.

A entrada da tarefa diária já está no `vercel.json` e entra com o deploy.

Falta **uma coisa só**, e é no painel do Supabase: os dois segredos do Vault. Sem eles, o pedido imediato não
acontece — nada falha, mas o email só sai na passagem diária. O SQL vai no fim do ficheiro do painel, com o
valor por preencher: tem de ser **o mesmo** `CRON_SECRET` que está na Vercel.

```
Supabase → Project Settings → Vault:
  avisos_url      = https://quempinta.pt/api/avisos/enviar
  avisos_segredo  = (o mesmo valor de CRON_SECRET na Vercel)
```

**Trocar o `CRON_SECRET` obriga a um deploy novo.** Isto custou um ensaio falhado a 31/10/2026: o segredo foi
trocado na Vercel às 22h23 e o pedido correu às 22h26, meio minuto depois de a versão nova ter *começado* a
construir — a função que respondeu era ainda a anterior, com o segredo antigo, e devolveu **401 Não
autorizado**. As variáveis de ambiente entram nas funções no momento da construção, não quando se gravam no
painel. Quem trocar o segredo tem de esperar que o deploy seguinte fique pronto; sem alteração de código,
força-se com um *redeploy* do último.

Um 401 neste caminho significa sempre uma destas duas coisas, e vale a pena saber distingui-las: ou os valores
divergem, ou o deploy em serviço é anterior à troca.

Depois de os guardar, confirma-se que o caminho está vivo pedindo o esvaziamento à mão:

```sql
select private.pedir_envio_de_avisos();
-- esperar uns segundos: o pedido é assíncrono, corre num trabalhador do pg_net
select status_code, left(content, 200) as resposta, timed_out, error_msg
  from net._http_response order by created desc limit 1;
```

Com a fila vazia não sai email a ninguém, e a resposta certa é esta — foi o que se obteve a 31/10/2026, às
22h27, depois de o deploy com o segredo novo ficar pronto:

```
status_code: 200
resposta:    {"reclamados":0,"enviados":0,"falhados":0,"semEndereco":0}
```

Quatro zeros e um 200 é o sinal de que a cadeia toda está viva: o Vault deu o endereço e o segredo, o `pg_net`
entregou o pedido, a aplicação autenticou-o e esvaziou uma fila que estava vazia.

## Aviso de segurança esperado

A tabela `avisos_por_email` fica com RLS ligado e **sem políticas**, de propósito: é correspondência interna,
ninguém a lê pela API, e quem a esvazia usa a chave de serviço. Por isso vai aparecer nos avisos do Supabase
como `rls_enabled_no_policy`, ao lado de `moloni_token` e `toques`, que estão na mesma situação e pela mesma
razão. **É esperado, e não se corrige com uma política** — uma política seria abrir o que se quer fechado.

## Para ver o caminho a funcionar

```bash
node scripts/percurso-dos-avisos.mjs
```

Corre as migrações numa base em memória e narra o percurso todo: a reserva, os três prazos, o prazo a vencer,
a libertação, o aviso dirigido à pessoa, a entrada na fila, a reclamação, uma falha de envio com recuo, a
repetição bem sucedida, e a reconfirmação da pertinência. Não toca em produção nem na rede.
