# Faturação certificada (Moloni)

Estado: **escrito sem acesso à Moloni real** (22/10/2026). O código está pronto, testado na parte que não depende do
fornecedor, mas o cliente da API (`src/lib/moloni.ts`) foi escrito a partir da documentação pública conhecida, sem uma
conta para o confirmar. Cada ponto assinalado com **◆ CONFIRMAR** é o primeiro sítio a olhar se a emissão falhar.

## Porque a Moloni

Decisão do promotor (22/10/2026): preço, fase inicial. Comparação completa e as alternativas (InvoiceXpress, Vendus)
em `docs/contabilista/` (a pesquisa de 22/10/2026, não guardada em ficheiro — ver histórico da conversa se precisar de a
reconstituir) — resumo: Moloni tem a melhor documentação de API (OAuth 2.0, sandbox dedicado), mas não confirmou
devolver o PDF/ATCUD na resposta de criação (por isso o código volta a ler o documento depois de o criar) nem ter
endpoint de "anular" um documento comunicado à AT (o que é normal: corrige-se com nota de crédito, que a Moloni suporta).

## O que a plataforma fatura

Três motivos (`src/domain/invoicing.ts`), cada um com a sua origem e id, para nunca duplicar:

| Motivo | Quando | Tipo | Cliente |
| --- | --- | --- | --- |
| Comissão de sucesso | Comissão do pintor recebida no Stripe | FT (NC se devolvida) | O pintor (NIF da empresa) |
| Subscrição | Mensalidade do fornecedor paga | FT | O fornecedor |
| Caução retida | O motor de regras confirma a retenção | FT | O cliente (consumidor final sem NIF) |

**Não fatura:** a comissão de adesão a fornecedores. Aí é o fornecedor que fatura a plataforma (fluxo já feito, em
`referral_redemptions`), e a Moloni não entra nesse lado.

## Como funciona

1. `pendingInvoices()` (`src/lib/invoicing.ts`) calcula o que falta faturar, a partir dos pagamentos e contratações já
   existentes — não grava nada.
2. No backoffice, **Contabilidade → Faturação**, a equipa vê a lista e pode emitir um a um ou todos de uma vez.
3. `emitInvoice()` chama `emitDocument()` (Moloni), guarda o resultado em `fiscal_documents` (imutável: um documento
   emitido não se altera) e, se a Moloni devolver o PDF, grava-o no bucket `documentos-fiscais`.
4. Uma falha fica registada com o erro, pronta a repetir-se depois de corrigida a causa.
5. O mesmo documento nunca se repete (chave `origin_type` + `origin_id`): correr `pendingInvoices()` duas vezes não fatura duas vezes.

## Autenticação: OAuth por login no browser, não password (confirmado 22/10/2026)

A API da Moloni desta conta só se liga por **authorization_code**: um administrador abre `/api/moloni/connect`
(só a equipa da plataforma), entra na Moloni e autoriza; a Moloni devolve-o a `/api/moloni/callback`, que troca o
código por um token e o guarda em `moloni_token`. O `access_token` dura 1h e renova-se sozinho pelo `refresh_token`
(válido 14 dias); se passarem 14 dias sem a aplicação pedir nada à Moloni, é preciso ligar de novo pelo mesmo caminho
— não há forma de automatizar essa primeira ligação.

Pedidos como formulário (`application/x-www-form-urlencoded`), não JSON, com campos de lista no formato
`produtos[0][name]=...` (confirmado 22/10/2026). O pedido de token é GET, com os parâmetros na URL, não POST.

## Configuração (variáveis na Vercel, nunca no repositório)

`MOLONI_CLIENT_ID` (o "Developer ID" da Moloni, Configurações > Developers), `MOLONI_CLIENT_SECRET` (aparece ao
ativar a API), `MOLONI_REDIRECT_URI` (tem de ser **exatamente** `https://quempinta.pt/api/moloni/callback`, igual
nos dois lados), `MOLONI_COMPANY_ID`. Mais três, já confirmados na conta real (22/10/2026): `MOLONI_DOCUMENT_SET_ID`
(a série "M", a única que existe, usada para FT e NC — ◆ CONFIRMAR se a Moloni aceita a mesma série para os dois
tipos), `MOLONI_TAX_ID_NORMAL` (IVA Normal 23%) e `MOLONI_FINAL_CONSUMER_CUSTOMER_ID` (o cliente "Consumidor Final"
que a Moloni cria por omissão).

## ⚠ Não emitir nada até a sandbox existir

Esta conta não tem ambiente de demonstração: pedido ao apoio@moloni.pt em 22/10/2026, ainda sem resposta. Enquanto não
vier, qualquer documento emitido é **real**, na única série da conta ("M"), e não se apaga — só se anula com nota de
crédito, deixando sempre um número gasto. Não usar o botão "Emitir" na fila do backoffice até a sandbox estar confirmada.

## ◆ Pontos por confirmar (com a sandbox, quando existir)

1. **Nomes dos campos em `customers/getByVat`/`customers/insert`** e se `country_id: 1` é mesmo Portugal nessa conta.
2. **Se a resposta de `invoices/insert`/`creditNotes/insert` já traz `number`/`atcud`**, ou só depois de `getOne`.
3. **O formato de `taxes` nas linhas** (`tax_id` dentro de cada produto) e se `exemption_reason` é o nome certo do campo de isenção.
4. **Se a série única "M" serve para FT e para NC**, ou se a Moloni exige uma série própria por tipo de documento.
5. **Como ligar uma nota de crédito ao documento original** — hoje só vai uma nota de texto (`notes`); a Moloni pode ter um
   campo próprio (`associated_documents` ou semelhante).
6. **Se `invoices/getPDF` é mesmo o endpoint**, e se devolve o PDF em bruto ou um link.
7. **Limite de pedidos por minuto** — não confirmado.

## Testar

1. Pedido da conta de demonstração ao apoio@moloni.pt: feito a 22/10/2026, a aguardar resposta.
2. Ativar a API na conta (Configurações > Developers > Configuração da API e Plugins), com o callback
   `https://quempinta.pt/api/moloni/callback`; anotar o Client ID e o Client Secret (não vão para o repositório).
3. Preencher as variáveis na Vercel e fazer deploy.
4. Com a conta de administrador, abrir `/api/moloni/connect` e autorizar: confirma a ligação (token guardado).
5. **Só depois de a sandbox vir confirmada pela Moloni**: no backoffice, Contabilidade → Faturação, com um pagamento
   de teste pendente, tentar emitir um documento e corrigir o código conforme o erro devolvido (ver a lista de pontos acima).
6. Confirmar o PDF, o número e o ATCUD gravados.

## Falta

- Fase com software já escolhido: exportação SAF-T mensal e ligação ao contabilista (fora do âmbito desta integração).
- Webhooks: a Moloni não confirmou tê-los; por agora a emissão é sempre pedida pela equipa (botão), nunca automática.
