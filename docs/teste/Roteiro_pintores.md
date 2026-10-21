---
title: "Quem Pinta — roteiro de teste para pintores"
subtitle: "Cerca de 45 minutos. Versão de teste: pagamentos em modo de teste, nada é real."
date: "21 de outubro de 2026"
---

# Antes de começar (promotor)

1. Criar **2 pedidos de teste**, com contas de cliente diferentes:
   - **Pedido A:** prédio de 3 pisos, 2 fachadas com áreas diferentes, pintura exterior com fissuras.
   - **Pedido B:** moradia simples, uma fachada, só pintura final.
2. Fechar o prazo de cada pedido só depois do teste (prazo de propostas de pelo menos 7 dias).
3. Dar a cada pintor o endereço https://quempinta.pt e o seu email de convite. Pagamentos em modo de teste:
   cartão `4242 4242 4242 4242`, qualquer data futura e CVC.
4. Combinar um canal para dúvidas durante o teste e pedir que **escrevam o que pensam enquanto fazem**.
5. Ligar `NEXT_PUBLIC_EQUIVALENTE=1` **só se** houver parecer; senão, a caixa «ou equivalente» não aparece e a
   tarefa 6 salta-se.

# O que pedir ao pintor

Não explicar nada antes: observar onde hesita. Tempo-alvo entre parênteses.

## 1. Entrar e criar a empresa (5 min)

- Criar conta e registar a empresa com o NIF real (o nome tem de corresponder ao titular do NIF).
- Carregar um documento (alvará ou certificado, seguro) e ver o estado «por validar».
- **Observar:** o NIF e o nome foram aceites? Alguma mensagem confusa?

## 2. Encontrar e perceber a obra (5 min)

- Abrir **Oportunidades** e escolher o Pedido A.
- Pergunta: *«Com o que vê aqui, consegue orçamentar? O que falta saber?»*

## 3. Preparar o orçamento, sem ajuda (15 min)

- «Começar proposta» e usar **Preparar orçamento**: Trabalhos → Preços → Condições → Rever.
- **Observar:**
  - Percebe o que é cada trabalho e escolhe os que fazem sentido?
  - Usa **zonas** (fachadas) e a quantidade sugerida?
  - Usa o botão **Sugestões** nos produtos? Os produtos sugeridos são os que usaria?
  - Passa de separador para separador e nada se perde?
  - Preços: prefere **discriminado por trabalho** ou **preço global**?
  - Condições: entende o plano de pagamentos (soma 100%), as declarações e os seguros?
- Perguntas depois: *«O que foi mais difícil? O que gostaria de ver que não aparece? Demorou mais ou menos do que
  o seu método habitual?»*

## 4. Guardar e reutilizar o método (5 min)

- No topo de **Preparar orçamento**, usar «Guardar como método…» com um nome.
- Abrir o **Pedido B**, começar proposta e **aplicar** o método. Ajustar zonas, quantidades e preços.
- Pergunta: *«Isto reflete o seu modo de trabalhar? O que falta no método?»*

## 5. Rever e submeter (5 min)

- Ver a folha de **Rever** (como o cliente vai ver) e as pendências.
- Submeter o Pedido A.
- Pergunta: *«Esta folha é o que mandaria a um cliente? Mudava alguma coisa?»*

## 6. «Ou equivalente» (só com parecer; 3 min)

- Num produto, assinalar «ou equivalente» e ler a explicação no «?».
- Pergunta: *«Percebe a regra dos 10% e das características? Usaria?»*

## 7. Mensagens e regras (3 min)

- Enviar uma pergunta técnica ao cliente através das **Mensagens**.
- **Não testar de propósito** a partilha de contactos (conta como aviso). Perguntar apenas: *«Percebe porque não
  pode pôr telefone ou morada?»*

# Perguntas finais (para todos)

1. De 0 a 10, qual a probabilidade de usar a plataforma para orçamentar obras reais?
2. O que o faria **não** usar?
3. Há trabalhos, produtos ou termos que não encontrou?
4. A comissão paga só se for escolhido e a obra for contratada: aceitável? (não mostrar valores; é matéria do
   promotor)
5. Quem do seu meio devia experimentar?

# Para registar (promotor)

| Pintor | Tempo no orçamento | Onde hesitou | Erros ou bloqueios | Sugestões | Nota (0–10) |
| --- | --- | --- | --- | --- | --- |
| | | | | | |

Registar também: mensagens de erro exatas, ecrã e hora, para o Claude do código corrigir.
