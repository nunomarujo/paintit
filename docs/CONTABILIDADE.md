# Contabilidade da plataforma

Estado: **desenho com as decisões do promotor de 21/10/2026 (§8), para validação com o contabilista certificado, Nuno Branco**. Nada disto está implementado. Cada decisão
fiscal marcada com ◆ tem de ser confirmada por ele antes de ir para código.

## 1. Princípios

1. **A plataforma não guarda dinheiro de terceiros** (regra 4 do projeto). A contabilidade regista; não movimenta. Nunca iniciamos
   pagamentos pela API do banco: pagar continua a ser uma transferência feita por uma pessoa, que depois se regista e reconcilia.
2. **Um livro único e imutável.** Cada acontecimento de negócio gera lançamentos em partidas dobradas (débitos = créditos),
   em cêntimos inteiros. Corrige-se com estorno, nunca com edição ou apagamento. Cada lançamento aponta para a origem
   (contratação, pagamento Stripe, comissão de fornecedor, linha de extrato).
3. **Funções puras e testadas em `src/domain/accounting/`**; a base de dados impede lançamentos desequilibrados e alterações a
   períodos fechados.
4. **Segredos fora do código** (credenciais do banco, do software de faturação, da AT): só variáveis na Vercel, coladas por si.
5. **Tudo auditável**: quem fez o quê e quando; o contabilista tem acesso só de leitura.

## 2. O que é possível ligar (e o que não é)

| Ligação | Realidade | Proposta |
| --- | --- | --- |
| **Portal das Finanças (AT)** | Não existe API geral para uma empresa enviar dados à vontade. As faturas têm de sair de **programa de faturação certificado pela AT** (nº de certificação, ATCUD, código QR), que comunica as séries e os documentos à AT. O SAF-T(PT), o IVA e a IES são entregues pelo contabilista, pelo portal ou pelo software dele. | **Integrar um software de faturação certificado com API** (a escolher: ver §7). A plataforma cria o documento por API; o software emite, comunica à AT e devolve PDF, número e ATCUD. Nós guardamos o resultado. |
| **Conta bancária** | O acesso a movimentos faz-se por *open banking* (PSD2), através de um agregador licenciado, ou por ficheiro de extrato. A cobertura depende do banco da empresa. | **Fase 1: importar extrato** (CSV, CAMT.053 ou MT940). **Fase 2: agregador** (leitura apenas), se o banco for coberto. |
| **Stripe** | API de transações de saldo, transferências (payouts) e reembolsos. | Reconciliação automática com o livro (já guardamos `stripe_payments`). |
| **Contabilidade (SNC)** | O contabilista usa o seu software. | Exportação mensal (CSV de lançamentos e mapa de faturas) para ele importar; plano de contas combinado com ele. |

## 3. Acontecimentos e tratamento

| Acontecimento | Lançamento (resumo) | Documento fiscal | Notas |
| --- | --- | --- | --- |
| Comissão do pintor recebida (Stripe) | Stripe a receber → Prestações de serviços + IVA liquidado | Fatura ao pintor (NIF dele) | ◆ Momento da fatura: no recebimento ou no prazo legal depois da prestação (apresentação). |
| Devolução da comissão ao pintor (cliente desistiu, etc.) | Estorno | Nota de crédito | |
| Caução do cliente depositada | Stripe a receber → **Valores de terceiros** (passivo), não é receita | Nenhum | O dinheiro está no parceiro de pagamentos. |
| Caução devolvida na assinatura | Estorno do passivo | Nenhum | |
| Caução retida (cliente não assinou depois da apresentação) | Passivo → receita | ◆ A decidir: natureza (cláusula penal ou preço do serviço) e IVA | Bloco D do documento jurídico. |
| Subscrição do fornecedor (39/49 € + IVA, Stripe) | Stripe a receber → Prestações de serviços + IVA liquidado | Fatura ao fornecedor | O PDF da Stripe **não** substitui a fatura certificada. |
| Comissão de adesão ao fornecedor | Gasto + IVA dedutível (se cobrado) → a pagar → banco | Fatura do fornecedor (recebida e guardada) | ◆ Retenção na fonte, se aplicável. |
| Taxas da Stripe | Gasto (Stripe a receber → gastos) | Fatura mensal da Stripe | |
| Reembolso Stripe | Estorno | Nota de crédito, se já havia fatura | |
| Transferência Stripe → banco | Stripe a receber → banco | Nenhum | É aqui que se confirma o dinheiro. |

## 4. Modelo de dados (resumo)

- `acc_accounts`: plano de contas (SNC simplificado), definido com o contabilista.
- `acc_entries` + `acc_lines`: lançamentos e linhas (conta, débito, crédito em cêntimos, origem). Trigger: soma dos débitos = soma dos
  créditos; sem `update`/`delete`; correção por estorno.
- `acc_periods`: mês aberto/fechado. Depois de fechado, só se lança no mês seguinte.
- `fiscal_documents`: fatura/nota de crédito/recibo, cliente e NIF, base, IVA, total, estado (por emitir, emitida, anulada), id e série no
  software certificado, ATCUD, PDF.
- `bank_lines`: movimentos do extrato; `stripe_lines`: transações de saldo; `acc_matches`: o que casa com o quê (e o que está por casar).
- Perfil **contabilista**: leitura de tudo isto e exportação, sem aceder a dados pessoais de clientes além do necessário (NIF e nome do titular da fatura).

## 5. Separador «Contabilidade» (backoffice, só equipa e contabilista)

1. **Painel**: saldos (Stripe, banco, valores de terceiros), por pagar, por faturar, discrepâncias, mês aberto.
2. **Movimentos**: livro diário filtrável por origem, conta, período; clicar abre a contratação ou o pagamento de origem.
3. **A faturar**: fila de comissões e subscrições recebidas sem fatura; botão «Emitir» (software certificado) e notas de crédito.
4. **A pagar**: comissões de fornecedores (fluxo atual, com fatura recebida, IBAN e referência), outros pagamentos.
5. **Reconciliação**: Stripe e banco lado a lado; sugestões automáticas de correspondência; tudo o que fica por casar a vermelho.
6. **IVA do período**: IVA liquidado e dedutível por taxa, pronto para o contabilista conferir.
7. **Fecho do mês**: lista de verificação (tudo faturado e reconciliado), fecho, exportação para o contabilista.

## 6. Fases

| Fase | Entrega | Depende de |
| --- | --- | --- |
| 0 | Decisões e validação do desenho com o contabilista | Promotor e contabilista |
| 1 | Livro de movimentos (plano de contas, partidas dobradas, estornos, fecho), alimentado pelos acontecimentos que já existem; painel e movimentos | Plano de contas |
| 2 | Faturação: fila «A faturar», ligação ao software certificado, notas de crédito | Software escolhido e credenciais |
| 3 | Reconciliação com a Stripe (transferências e taxas) | Fase 1 |
| 4 | Importação de extrato do banco e reconciliação; depois agregador | Banco da empresa |
| 5 | IVA do período, fecho do mês, exportações | Contabilista |
| 6 | Acesso do contabilista e relatórios | Fases anteriores |

## 7. Decisões que faltam (promotor e contabilista)

1. Quem é o **contabilista certificado**, e que software de contabilidade usa (para escolher a exportação)?
2. A **empresa dona** do quempinta.pt: NIF, regime de IVA, periodicidade (mensal ou trimestral), banco principal.
3. **Software de faturação certificado**: o da empresa já existe? Se não, comparar os que têm API (ex.: Moloni, InvoiceXpress, Vendus, Billin):
   preço, API, certificação, séries e comunicação à AT. A escolher com o contabilista.
4. ◆ **Momento da fatura** da comissão do pintor e da subscrição do fornecedor.
5. ◆ **Caução retida**: natureza e IVA. ◆ **Retenção na fonte** nas comissões aos fornecedores (empresas e empresários em nome individual).
6. **Plano de contas** a usar.
7. **Acesso** do contabilista à plataforma (perfil só de leitura) ou só por exportações.

## 8. Decisões do promotor (21/10/2026)

- **Empresa dona:** RELEVANTEPLANETA UNIPESSOAL LDA. IVA **trimestral**. Banco: **EuroBic** (o IBAN fica na configuração, nunca no repositório). NIF **517588676**, sede em Viana do Castelo, CAE 74900 (dados em `src/config/company.ts`).
- **Contabilista:** Nuno Branco. Software de contabilidade dele: por apurar. Objetivo: automatizar o máximo (faturação e dados para as Finanças).
- **Faturação:** **InvoiceXpress** ou outro mais barato, com API e certificação AT; a comunicação à AT é feita pelo próprio software (credenciais AT
  configuradas lá). A escolha final depende de preço e API: comparar InvoiceXpress, Moloni, Vendus e Billin.
- **Momento da fatura:** decidido pela lógica de negócio: comissão do pintor, quando o dinheiro é recebido e a obra se contrata; subscrição, no pagamento.
- **Caução retida:** é **sempre com IVA** (para garantir o IVA se o cliente falhar). O valor retido já é bruto: o IVA extrai-se dele (23/123); não se acrescenta ao cliente.
- **Comissões a fornecedores acumulam em saldo.** O fornecedor resgata quando quiser, desde que tenha os dados de transferência e de faturação e declare o regime (IVA e
  retenção na fonte). Só então a plataforma paga, líquido de retenção se aplicável. (Ver §10.)

## 9. Plano de contas proposto (SNC, simplificado)

Para o Nuno Branco validar ou ajustar. Os códigos seguem o SNC; as subcontas são nossas.

| Conta | Nome | Para quê |
| --- | --- | --- |
| 12.1 | Depósitos à ordem: EuroBic | O banco da empresa |
| 13.1 | Outros depósitos: saldo Stripe | Dinheiro já pago mas ainda não transferido para o banco |
| 21.1 | Clientes: pintores | Comissões de sucesso por receber/recebidas |
| 21.2 | Clientes: fornecedores | Subscrições |
| 21.3 | Clientes: cauções retidas | Cauções que se tornam receita |
| 22.1 | Fornecedores: tintas (comissões de adesão) | O que se deve aos fornecedores (o saldo deles) |
| 22.2 | Fornecedores: Stripe e outros | Taxas e serviços |
| 24.32 | IVA dedutível | IVA das faturas dos fornecedores e da Stripe |
| 24.33 | IVA liquidado | IVA das nossas faturas |
| 24.2 | Retenções na fonte (IRS/IRC) | Retido aos fornecedores no resgate |
| 27.8.1 | Cauções de clientes (valores de terceiros) | A caução enquanto não é receita nem devolvida |
| 62.2.1 | Comissões de adesão a fornecedores | Gasto |
| 62.2.2 | Comissões e taxas de pagamento (Stripe) | Gasto |
| 72.1 | Comissões de sucesso (pintores) | Rendimento |
| 72.2 | Subscrições de fornecedores | Rendimento |
| 72.3 | Cauções retidas | Rendimento |

Regra de ouro: **cada lançamento fecha a zeros** e aponta para o que o originou.

## 10. Saldo e resgate de comissões dos fornecedores (muda o fluxo atual)

Hoje cada comissão de adesão paga-se uma a uma, com a sua fatura. Passa a:

1. Quando a comissão do pintor entra na conta, a comissão do fornecedor passa a **saldo disponível** (e fica lançada a dívida em 22.1).
2. O fornecedor pede **resgate** do saldo quando quiser, se tiver: IBAN e titular, NIF, **regime de IVA** (cobra IVA ou isento, com o artigo) e **regime de retenção**
   (empresa; empresário em nome individual com ou sem retenção, a validar).
3. A plataforma calcula **comissão + IVA − retenção = a pagar**; o fornecedor envia **uma fatura** pelo total resgatado; a equipa paga por transferência e regista a referência.
4. Cada resgate junta várias comissões; o fornecedor vê o saldo, o histórico e o estado de cada resgate.

Estados de cada comissão: obra adjudicada (a aguardar a comissão do pintor) → disponível → em resgate → paga (ou sem efeito).

◆ **CAE:** a atividade registada é 74900 (outras atividades de consultoria técnicas). Pedir ao Nuno Branco que confirme se cobre a intermediação/portal e, se não,
acrescentar o CAE adequado antes de faturar.

## 11. Estado da implementação (21/10/2026)

- **Feito (fase 1):** plano de contas, lançamentos em partidas dobradas e imutáveis (trigger recusa alterar/apagar; equilíbrio verificado no fim de cada transação),
  estornos, períodos que se fecham por ordem (um lançamento tardio entra no primeiro mês aberto), balancete e balancete mensal, e o separador
  **Contabilidade** do backoffice (painel, movimentos, a pagar, períodos). Os lançamentos fazem-se sozinhos todos os dias (`/api/cron/contabilidade`) e por «Sincronizar agora».
- **O que já se lança:** comissão do pintor (com IVA), caução recebida/devolvida/retida (retida = rendimento com IVA), reembolsos, mensalidades de fornecedores (webhook `invoice.paid`),
  comissões de adesão (gasto quando a comissão do pintor entra), IVA da fatura do fornecedor no resgate e o pagamento líquido de retenção.
- **Saldo e resgate:** feito (migração `saldo_e_resgate`). O fornecedor declara IBAN, regime de IVA e de retenção; a equipa valida e fixa a taxa de retenção; o resgate junta o saldo disponível numa só fatura.
- **Falta:** taxas e transferências (payouts) da Stripe, faturação certificada (fase 2), importação do extrato (fase 4), IVA trimestral e fecho (fase 5), acesso do contabilista (fase 6).
- **Stripe:** o webhook tem de receber também o evento `invoice.paid` (Developers > Webhooks > editar o endpoint).
