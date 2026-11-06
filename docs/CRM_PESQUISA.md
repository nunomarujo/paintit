# CRM do workspace de developer — pesquisa de repositórios públicos (06/11/2026)

Pedido do promotor: um separador **CRM** na barra lateral do backoffice (conta `nm@quempinta.pt`) que pesquise
pintores, clientes e fornecedores por zona, faça outreach (email) com campanhas gratuitas, gere as respostas e
aprenda o que resulta. O mais automático possível; ao promotor cabe só rever campanhas e resultados. Começar pelo
mínimo. Esta nota é a pesquisa; **nada foi construído**.

## O que existe e o que serve

| Repositório | Licença | Para quê | Veredicto |
|---|---|---|---|
| `twentyhq/twenty` (60k★) | AGPL + comercial | CRM completo, desenhado para IA | Grande demais. Só como referência do modelo de dados (contactos, empresas, oportunidades). |
| `trycompai/crm`, `melgarafael/DeskcommCRM` (MIT) | MIT | CRM «para agentes», com WhatsApp | Referência de como um agente lê e escreve num CRM. Não adotar. |
| `krayin/laravel-crm`, `frappe/crm`, `SuiteCRM`, `Dolibarr` | MIT / AGPL / GPL | CRM clássico (PHP/Python) | Fora da stack; trariam uma segunda aplicação para manter. |
| `knadh/listmonk` (24k★) | AGPL | Campanhas de email, listas, desistências, ressaltos | Só se o Resend deixar de chegar. Serviço à parte, nunca dentro da aplicação (AGPL). |
| `mautic/mautic` (11k★) | GPL | Automação de marketing | Pesado (PHP). Não. |
| `gitroomhq/postiz-app` (41k★) + `postiz-agent` | AGPL | Agendar publicações em redes sociais, com API e CLI para agentes | **O candidato para redes sociais** (canal gratuito). Serviço autónomo, chamado por API. |
| `warmbly/warmbly` (Apache-2.0) | Apache-2.0 | Outreach B2B e aquecimento de caixas | Só a volume alto. No arranque não é preciso aquecimento. |
| `eracle/OpenOutreach` (GPL) | GPL | Agente de prospeção B2B (LinkedIn) | Boa ideia de fluxo; o LinkedIn proíbe-o nos termos. Não. |
| `omkarcloud/google-maps-scraper` (MIT) e afins | MIT | Descoberta de empresas por zona | Viola os termos da Google. Preferir fontes abertas (abaixo). |

Sem resultado útil: agente de resposta a caixa de correio e testes A/B. Ambos se fazem melhor dentro da aplicação.

## Recomendação: mínimo, dentro da aplicação, sem CRM externo

A aplicação já tem Supabase, Resend (`src/lib/notify.ts`), uma tarefa diária às 8h (`toques`), o catálogo de
flyers (`src/domain/campanhas.ts`) e QR com `?c=` por flyer, ainda não lido. Falta pouco:

1. **Tabelas** (com RLS só para `platform_admins`): `crm_zonas`, `crm_contactos` (tipo, zona, fonte, estado,
   base legal, desistência), `crm_envios`, `crm_mensagens` (entrada e saída), `crm_eventos` (clique no QR, adesão).
2. **Domínio puro e testado** (`src/domain/crm.ts`): a sequência por zona (campanha 1, 2, 3…), a regra de avançar
   ou parar por resultados, e a escolha entre variantes (bandido simples, Thompson). Zona nova começa na campanha 1.
3. **Descoberta** por fontes abertas: registo do IMPIC (empresas com alvará), OpenStreetMap/Overpass, nif.pt (CAE,
   já usado), administradoras de condomínio. Sem raspar a Google.
4. **Envio** pelo Resend, num subdomínio próprio (`mail.quempinta.pt`) para proteger a reputação do domínio
   principal. **Entrada** por webhook de email recebido.
5. **Claude (API)** só para classificar respostas e redigir rascunhos. Início: o agente **propõe**, o promotor
   aprova na caixa; só depois de meses de acertos se liberta o envio automático nas categorias seguras.
6. **Ler o `?c=`** na adesão e gravar a origem — fecha o ciclo campanha → adesão.
7. **Separador «CRM»** no grupo Backoffice: Painel (funil por zona), Zonas, Contactos, Caixa (a rever), Resultados.

Redes sociais ficam para uma segunda fase, com Postiz.

## Limite legal — a validar com o jurista antes de enviar o primeiro email

- Lei 41/2004 (art. 13.º-A): email de marketing a **pessoas singulares** exige consentimento prévio. Logo,
  **particulares não recebem email frio.** Chegam por canais gratuitos: QR dos flyers, SEO por zona, Google
  Business Profile, grupos locais, parcerias, recomendação.
- A **pessoas coletivas** (pintores, fornecedores, administradoras de condomínio) é permitido, com identificação
  do remetente, fonte do contacto, ligação de desistência em cada mensagem e lista de supressão. Empresários em
  nome individual são zona cinzenta: por defeito, tratar como singulares.
- RGPD: base de interesse legítimo documentada, e o contacto pode pedir a origem dos dados.
