# Receção das respostas do CRM (07/11/2026)

As respostas aos emails das campanhas entram por `POST /api/crm/entrada`, são classificadas e aparecem na secção **Caixa** do
separador CRM. Sem `CRM_ENTRADA_SEGREDO` na Vercel o ponto de entrada está fechado (401).

## O que a plataforma faz sozinha, e o que espera por uma pessoa

| Categoria | Exemplos | Faz sozinha | Espera por pessoa |
|---|---|---|---|
| desistência | «removam o meu email», «não quero receber», «unsubscribe», «isto é spam» | marca o contacto como desistiu, rejeita o que ia sair, conta como desistência | não |
| recusa | «não temos interesse», «não precisamos» | contacto «recusou», rejeita o que ia sair | não |
| ressalto | «Mail delivery failed», «Undeliverable» | tira o email ao contacto (o endereço lido da mensagem) | não |
| automática | «estou ausente», «out of office» | só guarda | não |
| interesse | «tenho interesse», «como funciona», «quanto custa», «liguem-me» | conta como resposta; **rascunho de resposta** | **sim** |
| pergunta | qualquer outra com «?» | conta como resposta | **sim**, sem rascunho |
| outro | o resto | conta como resposta | **sim** |

A nossa mensagem citada por baixo da resposta é ignorada: o rodapé dos nossos emails diz «não quero receber mais mensagens» e,
citado, faria de toda a resposta um pedido de saída. Nenhuma resposta é enviada sem uma pessoa a rever, e as perguntas não têm
rascunho (um rascunho errado custa mais do que nenhum). Fica por construir a classificação com IA para os casos que as regras
não apanham.

## Pôr a entrada a funcionar

1. **Um endereço só para as respostas**: `crm@quempinta.pt`. O correio do domínio passa pelo **ImprovMX** (os registos MX de `quempinta.pt` apontam para `mx1/mx2.improvmx.com`), por isso o alias cria-se **no ImprovMX** (Aliases → novo alias `crm` → reencaminhar para o Gmail que corre o script), e não no Gmail. Na Vercel (já feito a 07/11/2026):
   `CRM_RESPOSTAS_EMAIL=crm@quempinta.pt`. Todos os emails do CRM passam a ter esse `Reply-To`. **Sem isto, as respostas vão
   para a caixa pessoal e o script abaixo teria de ler tudo.**
2. **Um segredo**: `CRM_ENTRADA_SEGREDO` na Vercel (uma frase longa e aleatória, só sua).
3. **Quem entrega as mensagens.** Opção simples, um script do Google Apps Script na conta do Gmail que recebe `crm@`
   (script.google.com → novo projeto → Definições do projeto → Propriedades do script: `CRM_ENTRADA_SEGREDO`). **Não foi
   testado**; ensaiar primeiro com uma mensagem sua e ver a Caixa:

```javascript
const ENDERECO = 'https://quempinta.pt/api/crm/entrada';
const SO_AS_DO_CRM = 'to:crm@quempinta.pt -label:crm-entregue newer_than:3d';

function entregarRespostas() {
  const segredo = PropertiesService.getScriptProperties().getProperty('CRM_ENTRADA_SEGREDO');
  const etiqueta = GmailApp.getUserLabelByName('crm-entregue') || GmailApp.createLabel('crm-entregue');
  for (const fio of GmailApp.search(SO_AS_DO_CRM, 0, 30)) {
    let todas = true;
    for (const m of fio.getMessages()) {
      if (m.getFrom().indexOf('@quempinta.pt') >= 0) continue; // as nossas próprias
      const r = UrlFetchApp.fetch(ENDERECO, {
        method: 'post', contentType: 'application/json', muteHttpExceptions: true,
        headers: { Authorization: 'Bearer ' + segredo },
        payload: JSON.stringify({ de: m.getFrom(), assunto: m.getSubject(), texto: m.getPlainBody(), messageId: m.getHeader('Message-ID') || m.getId() }),
      });
      if (r.getResponseCode() >= 300) { todas = false; break; }
    }
    if (todas) fio.addLabel(etiqueta);
  }
}
```

   Acionador: «Orientado por tempo», a cada 5 minutos. A entrega é idempotente (`messageId`): repetir não duplica.
4. Os ressaltos chegam ao mesmo endereço (o servidor de correio responde a quem enviou), por isso entram pelo mesmo caminho.

## Segurança

O texto recebido é dados: é classificado e mostrado (o React escapa-o), nunca executado nem seguido. O ponto de entrada compara o
segredo em tempo constante, limita o tamanho (200 kB), e guarda no máximo 4000 caracteres por mensagem.
