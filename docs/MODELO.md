# Modelo de contratação e dinheiro

> **Em vigor desde 19/10/2026: percurso v2** (secção no fim). As contratações iniciadas antes mantêm o
> percurso v1 descrito a seguir, com as regras que aplicaram.

Estado: decidido pelo promotor a 18/10/2026, com quatro pontos em aberto (ver `DECISOES.md`).
Implementação: `src/domain/engagement.ts`; testes: `src/domain/engagement.test.ts`.

A plataforma apresenta as partes e leva-as até à assinatura do contrato. O trabalho dela termina quando as
duas partes assinam; a partir daí só guarda a prova do que foi assinado, com imparcialidade. Até lá retém, num
parceiro de pagamentos autorizado, três valores: a garantia do cliente (3%), o fee do pintor (18% + IVA — a percentagem em vigor é sempre a de `src/domain/rules.ts`) e, se a
proposta o previr, o adiantamento de adjudicação.

## Percurso

1. **Escolha.** A assembleia aprova a proposta (ata). O administrador deposita a garantia de 3% do valor sem IVA
   e, se houver, o adiantamento de adjudicação.
2. **Minuta e assinatura do cliente.** A plataforma gera a minuta a partir da proposta e da ficha da obra. O
   cliente assina com Chave Móvel Digital.
3. **Aviso ao pintor.** O pintor sabe que ganhou e vê o valor reservado para ele, que só fica efetivo quando
   assinar.
4. **Fee do pintor.** 8 dias corridos para a comissão + IVA entrarem na conta (conta a receção, fuso de Lisboa, até
   às 23:59 do 8.º dia). Um pagamento que chegue depois é devolvido.
5. **Assinatura do pintor.** Com o fee confirmado, o pintor assina (prazo proposto: 8 dias). O contrato segue
   para as duas partes, a garantia volta ao cliente e o adiantamento fica disponível para o pintor.

## Desvios

| Desfecho | Garantia do cliente | Fee do pintor | Adiantamento | Plataforma recebe |
| --- | --- | --- | --- | --- |
| Ambos assinam | Devolvida | Fica | Libertado ao pintor | Fee do pintor |
| Pintor não paga em 8 dias | Transita para a proposta seguinte, ou devolvida se o cliente não continuar | — | Igual à garantia | Nada |
| Pintor paga e não assina no prazo | Transita ou devolvida | Perdido | Devolvido ao cliente | Fee do pintor |
| Cliente desiste antes de o pintor assinar | Perdida | Devolvido | Devolvido | Garantia do cliente |
| Litígio, culpa do pintor | Devolvida | Perdido | Devolvido ao abrir o litígio | Fee do pintor |
| Litígio, culpa do cliente | Perdida | Devolvido | Devolvido ao abrir o litígio | Garantia do cliente |
| Litígio, acordo para retomar | Retida | Retido | Devolvido ao abrir o litígio | Fee, quando o pintor assinar |

**Regra central:** a plataforma recebe a comissão uma única vez, e nunca as duas garantias.

> **Litígio com repartição (`'repartido'`, DIS-07/DIS-08, decidido com julgamento próprio a 23/10/2026):** além dos
> dois desfechos binários (culpa do cliente / culpa do pintor) acima e no percurso v2, existe um terceiro — um
> parâmetro só, `culpaClientePercent` (inteiro, 1-99), aplicado com o mesmo sentido às duas rubricas: essa fração
> da caução fica retida pela plataforma (o resto volta ao cliente); essa mesma fração da comissão volta ao pintor
> (o resto fica retido pela plataforma). Em 100% ou 0% reproduz exatamente os dois desfechos binários — por isso
> não têm linha própria nova na tabela. As duas partes nunca trocam dinheiro diretamente entre si, só com a
> plataforma. Decide sempre a equipa da plataforma no backoffice. Detalhe: `docs/DECISOES.md`, 23/10/2026;
> `docs/ESTADO.md`, secção 3.3.

## Exemplo: obra de 100 000 € sem IVA, adiantamento de 10%

- Cliente deposita 13 000 € (3 000 € de garantia + 10 000 € de adiantamento).
- Pintor paga 3 690 € (3 000 € de comissão + 690 € de IVA).
- Na assinatura: o cliente recebe 3 000 €, o pintor recebe 10 000 €, a plataforma fica com 3 690 € (dos quais
  690 € são IVA a entregar ao Estado).

## Fora do âmbito da plataforma

Execução da obra, tranches seguintes, aditamentos e incumprimentos depois da assinatura são matéria entre as
partes. A plataforma pode arquivar aditamentos, mas não valida o seu teor.

## Percurso v2 (19/10/2026, decisão do promotor depois do parecer jurídico)

1. **Escolha preliminar** do cliente, ainda anónima.
2. **Caução do cliente** (3%, garantia de interesse) depositada no parceiro de pagamentos, quando o cliente
   quiser (sem prazo). É este depósito que torna a escolha efetiva e avisa o pintor.
3. **Comissão do pintor** (18% + IVA, `src/domain/rules.ts`) em 8 dias corridos a contar da confirmação da caução.
4. **Apresentação:** com a comissão confirmada, as partes ficam a conhecer-se (identidade, NIF, habilitação,
   contactos, morada da obra).
5. **Assinaturas** do contrato completo, já com identidades: primeiro o cliente, depois o pintor (8 dias cada).
6. Com as duas assinaturas, a **caução volta ao cliente** e a comissão fica.
7. O **adiantamento**, se a proposta o previr, paga-se diretamente ao pintor depois da assinatura, como diz o
   contrato. Não passa pela plataforma.

| Desfecho | Caução do cliente | Comissão do pintor | Adiantamento | Plataforma recebe |
| --- | --- | --- | --- | --- |
| Ambos assinam | Devolvida | Fica | Pago fora da plataforma | Comissão |
| Cliente desiste antes da apresentação | Devolvida | Devolvida (se paga) | — | Nada |
| Cliente desiste ou não assina no prazo depois da apresentação | Perdida | Devolvida | — | Caução |
| Pintor não paga em 8 dias | Transita ou devolvida | — | — | Nada |
| Pintor não assina no prazo | Transita ou devolvida | Perdida | — | Comissão |

A caução protege contra o cliente que, depois de conhecer o pintor, contrata com ele por fora: nesse caso a
plataforma devolve a comissão ao pintor (que não teve culpa) e fica com a caução. Implementação:
`src/domain/engagement.ts` (ramos `isV2`), regras `RULES_2026_10_19` em `src/domain/rules.ts`.
