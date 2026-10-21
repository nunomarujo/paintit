---
title: "Quem Pinta — questões para o contabilista certificado"
subtitle: "Para validação do desenho da contabilidade da plataforma"
date: "21 de outubro de 2026"
---

# Contexto

A RELEVANTEPLANETA, UNIPESSOAL LDA (NIF 517588676, IVA trimestral, CAE 74900) explora a plataforma Quem Pinta (quempinta.pt), que apresenta
clientes a empresas de pintura e a fornecedores de tintas. A plataforma **não guarda dinheiro de terceiros**: os pagamentos passam por um parceiro de
pagamentos (Stripe) e depois para a conta da empresa (EuroBic). Queremos automatizar o máximo: registo dos movimentos, emissão de faturas por software
certificado e dados prontos para o IVA e a IES. O desenho completo está no documento `CONTABILIDADE.md` (plano de contas, fluxos, fases).

# O que a plataforma recebe e paga

| Fluxo | Valor | Como pensamos tratá-lo |
| --- | --- | --- |
| Comissão de sucesso cobrada ao pintor | 3% do valor da obra sem IVA (mínimo 150 €), mais IVA. 2,75% se usar um código de adesão | Fatura ao pintor, emitida quando o dinheiro entra |
| Subscrição de fornecedores | 39 € ou 49 € por mês, mais IVA | Fatura ao fornecedor no pagamento |
| Caução do cliente | 3% do valor sem IVA (mínimo 150 €) | Valor de terceiros (passivo) até ser devolvida; se retida, receita **com IVA incluído** |
| Comissão de adesão a fornecedores | 0,25% do valor da obra sem IVA, mais IVA se cobrado | Gasto; acumula em saldo e paga-se por resgate, contra fatura do fornecedor |
| Taxas e reembolsos da Stripe | Variável | Gasto; nota de crédito se já havia fatura |

# Perguntas

1. **CAE.** O CAE 74900 cobre a intermediação e a exploração de um portal que cobra comissões e subscrições? Se não, qual acrescentar e quando?
2. **Software.** Que software de contabilidade usa? Prefere receber ficheiros (CSV de lançamentos, mapa de faturas) ou integração direta?
3. **Faturação certificada.** Vamos usar um software de faturação com API e comunicação automática à AT (a comparar: InvoiceXpress, Moloni, Vendus, Billin).
   Tem preferência ou experiência? É preciso criar um subutilizador da AT para a comunicação de séries e documentos?
4. **Momento da fatura.** Para a comissão do pintor e para a subscrição, concorda em faturar no recebimento? Qual o prazo legal e a exigibilidade do IVA em cada caso?
5. **Caução retida.** Quando o cliente desiste sem justa causa e a caução fica com a plataforma: é rendimento sujeito a IVA? A que taxa e com que documento (fatura ao cliente, que pode
   ser consumidor final ou condomínio)? O IVA extrai-se do valor retido (23/123); confirma?
6. **Valores de terceiros.** O tratamento da caução enquanto está no parceiro de pagamentos como passivo (conta 27) está correto? E o saldo na Stripe antes de ser transferido (conta 13 ou outra)?
7. **Comissões aos fornecedores.** Há **retenção na fonte** (IRC ou IRS) a aplicar quando a plataforma paga: (a) a empresas? (b) a empresários em nome individual, com ou sem contabilidade organizada?
   Que declarações o fornecedor deve fazer (regime de IVA, isenção do art. 53.º, dispensa de retenção) para a plataforma calcular o líquido a pagar?
8. **Fornecedores sem IVA liquidado.** Se um fornecedor estiver isento de IVA, a fatura dele não tem IVA: confirma que o gasto fica pelo valor da comissão?
9. **Plano de contas.** O plano proposto (secção 9 do documento) serve? Que contas e subcontas ajusta?
10. **IVA trimestral.** Que mapa precisa no fim de cada trimestre (IVA liquidado e dedutível por taxa, regularizações, notas de crédito)? Em que formato?
11. **Encerramentos.** Que checklist quer no fecho mensal e trimestral? E o acesso: só leitura na plataforma, ou apenas por exportação?
12. **Obrigações da plataforma digital.** Existe alguma obrigação de comunicação à AT para plataformas que intermedeiam serviços e recebem comissões (por exemplo, DAC7 e o regime de plataformas digitais) que
    nos obrigue a reportar dados dos pintores ou fornecedores? Se sim, que dados temos de recolher desde já?
