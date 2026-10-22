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

## Configuração (variáveis na Vercel, nunca no repositório)

`MOLONI_CLIENT_ID`, `MOLONI_CLIENT_SECRET`, `MOLONI_USERNAME`, `MOLONI_PASSWORD`, `MOLONI_COMPANY_ID` — da conta e do
utilizador de API criados na Moloni. `MOLONI_DOCUMENT_SET_FT`, `MOLONI_DOCUMENT_SET_NC`, `MOLONI_TAX_ID_NORMAL`,
`MOLONI_FINAL_CONSUMER_CUSTOMER_ID` — só se obtêm depois de a conta existir (séries de documentos, a taxa de 23% e o
cliente "Consumidor final" que a Moloni cria por omissão têm ids próprios dessa conta).

## ◆ Pontos por confirmar com a sandbox real

1. **Endpoint e corpo do pedido de token** (`requestToken`/`refreshToken`): se a Moloni devolver 400, confirmar se o
   corpo é mesmo form-urlencoded e os nomes exatos dos campos.
2. **Nomes dos campos em `customers/insert`** e se `country_id: 1` é mesmo Portugal nessa conta.
3. **Se a resposta de `invoices/insert`/`creditNotes/insert` já traz `number`/`atcud`**, ou só depois de `getOne`.
4. **O formato de `taxes` nas linhas** (`tax_id` vs. outro campo) e se `exemption_reason` é o nome certo do campo de isenção.
5. **Como ligar uma nota de crédito ao documento original** — hoje só vai uma nota de texto (`notes`); a Moloni pode ter um
   campo próprio (`associated_documents` ou semelhante).
6. **Se `invoices/getPDF` é mesmo o endpoint**, e se devolve o PDF em bruto ou um link.
7. **Limite de pedidos por minuto** — não confirmado pela pesquisa.

## Testar

1. Pedir a conta de sandbox à Moloni (área de cliente ou apoio@moloni.pt).
2. Criar na conta: uma série de faturas, uma de notas de crédito, confirmar a taxa de 23% e o cliente "Consumidor final" — anotar os ids.
3. Preencher as variáveis na Vercel (ambiente de preview, não produção) e fazer deploy.
4. No backoffice, Contabilidade → Faturação, com um pagamento de teste pendente, tentar emitir um documento e corrigir
   o código conforme o erro devolvido (ver a lista de pontos acima).
5. Confirmar o PDF, o número e o ATCUD gravados.

## Falta

- Fase com software já escolhido: exportação SAF-T mensal e ligação ao contabilista (fora do âmbito desta integração).
- Webhooks: a Moloni não confirmou tê-los; por agora a emissão é sempre pedida pela equipa (botão), nunca automática.
