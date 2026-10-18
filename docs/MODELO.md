# Modelo de contratação e dinheiro

Estado: decidido pelo promotor a 18/10/2026, com quatro pontos em aberto (ver `DECISOES.md`).
Implementação: `src/domain/engagement.ts`; testes: `src/domain/engagement.test.ts`.

A plataforma apresenta as partes e leva-as até à assinatura do contrato. O trabalho dela termina quando as
duas partes assinam; a partir daí só guarda a prova do que foi assinado, com imparcialidade. Até lá retém, num
parceiro de pagamentos autorizado, três valores: a garantia do cliente (3%), o fee do pintor (3% + IVA) e, se a
proposta o previr, o adiantamento de adjudicação.

## Percurso

1. **Escolha.** A assembleia aprova a proposta (ata). O administrador deposita a garantia de 3% do valor sem IVA
   e, se houver, o adiantamento de adjudicação.
2. **Minuta e assinatura do cliente.** A plataforma gera a minuta a partir da proposta e da ficha da obra. O
   cliente assina com Chave Móvel Digital.
3. **Aviso ao pintor.** O pintor sabe que ganhou e vê o valor reservado para ele, que só fica efetivo quando
   assinar.
4. **Fee do pintor.** 8 dias corridos para os 3% + IVA entrarem na conta (conta a receção, fuso de Lisboa, até
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

**Regra central:** a plataforma recebe 3% uma única vez, e nunca as duas garantias.

## Exemplo: obra de 100 000 € sem IVA, adiantamento de 10%

- Cliente deposita 13 000 € (3 000 € de garantia + 10 000 € de adiantamento).
- Pintor paga 3 690 € (3 000 € de comissão + 690 € de IVA).
- Na assinatura: o cliente recebe 3 000 €, o pintor recebe 10 000 €, a plataforma fica com 3 690 € (dos quais
  690 € são IVA a entregar ao Estado).

## Fora do âmbito da plataforma

Execução da obra, tranches seguintes, aditamentos e incumprimentos depois da assinatura são matéria entre as
partes. A plataforma pode arquivar aditamentos, mas não valida o seu teor.
