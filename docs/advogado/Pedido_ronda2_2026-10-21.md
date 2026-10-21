---
title: "Quem Pinta — segunda ronda de questões jurídicas"
subtitle: "O que mudou desde o parecer de 19/10/2026, para validação"
date: "21 de outubro de 2026"
---

# 0. Contexto

A plataforma chama-se agora **Quem Pinta** (quempinta.pt). Os documentos anteriores (`Pedido_minuta_contrato` e
`Seguimento_2026-10-19`) mantêm-se válidos, salvo no que este documento disser. Entretanto foi aplicado o percurso
recomendado no parecer (escolha preliminar, caução, apresentação antes da assinatura) e acrescentaram-se as funções
descritas abaixo. Cada ponto traz **o que fizemos**, **o risco que vemos** e **a pergunta**. Pedimos, por ordem de
importância, as secções 1 a 4; as restantes podem seguir depois.

# 1. Produto «ou equivalente» (orçamento do pintor)

**O que fizemos.** Em cada produto do orçamento, o pintor pode assinalar «ou equivalente». Regra única, igual na ajuda,
na proposta e no contrato:

> Produto «ou equivalente»: o pintor pode aplicar outro produto, desde que tenha características técnicas iguais ou
> superiores (tipo, uso, acabamento, rendimento e classe técnica) e que o preço de referência de mercado não difira mais
> de 10% do produto indicado.

Na proposta aparece um aviso destacado, que acrescenta: *qualquer diferença visível para o cliente (por exemplo, a cor)
tem de ser indicada pelo pintor e aceite por escrito antes da aplicação*. No contrato entra a cláusula 2-B com a mesma
regra e a exigência de aceitação escrita para diferenças visíveis. A plataforma **não arbitra** desacordos sobre
equivalência.

**Risco.** Conceito indeterminado; o preço de referência não é verificável com rigor; o cliente consumidor pode
alegar que não compreendeu.

**Perguntas.**

1. A formulação (características técnicas + limite de 10% no preço de referência) é suficiente e proporcionada?
2. O aviso na proposta e a cláusula 2-B cumprem o dever de informação ao consumidor? Que redação sugere?
3. Quem decide um desacordo sobre a equivalência, e como o contrato o deve prever, sem a plataforma ser parte?
4. A cor diferente deve exigir sempre aceitação escrita antes da aplicação? Em condomínio, de quem?

*Estado:* a função está desligada em produção até ao parecer.

# 2. Avisos e bloqueio de contas por partilha de contactos

**O que fizemos.** É proibido identificar as partes (nomes, moradas) ou partilhar contactos antes da apresentação.
Um filtro automático recusa o texto e conta um aviso: 1.ª tentativa, aviso; 2.ª, último aviso; 3.ª, conta bloqueada
para sempre (email banido e NIF das entidades da conta impedido de novo registo). No 2.º aviso o utilizador pode pedir
revisão, uma vez, decidida pela equipa com decisão escrita e comunicada por email. A equipa pode desbloquear.
Guardamos o texto de cada tentativa para análise.

**Risco.** Decisão com efeitos graves tomada com apoio automático; bloqueio permanente; tratamento de dados
(registo do texto); termos e condições ainda por redigir.

**Perguntas.**

1. O mecanismo (dois avisos, bloqueio, uma revisão) é admissível nas condições gerais de utilização? Exige
   comunicação prévia específica (cláusulas contratuais gerais) e aceitação expressa?
2. Há problema, à luz do art. 22.º do RGPD, em o bloqueio decorrer de deteção automática, dado haver revisão humana
   no 2.º aviso e desbloqueio manual? Convém garantir revisão humana também no 3.º?
3. Que fundamento de licitude e que prazo de conservação para o texto das tentativas?
4. É lícito impedir o novo registo do NIF de uma entidade bloqueada? Em que condições?
5. Cláusula de não evasão (F4 do parecer anterior): proporcional, com prazo (12 meses?) e consequência definida.
   Pedimos a redação.

# 3. Remuneração da plataforma: o cliente não a vê

**O que fizemos.** O cliente não vê, em nenhum ecrã, email ou resumo, o que a plataforma cobra ao pintor; fala-se em
«confirmação do pintor». A página pública Transparência diz apenas, sem números, que a plataforma cobra uma pequena
comissão pelo sucesso ao prestador de serviço. Os valores aparecem ao pintor e à plataforma.

**Risco.** O parecer pediu que a plataforma explique como ganha dinheiro (F2/G2). Pode a omissão do valor ao
consumidor ser enganosa (práticas comerciais desleais) ou contrariar o art. 30.º do DSA?

**Perguntas.**

1. A redação da Transparência cumpre a exigência de explicar como a plataforma ganha dinheiro?
2. Há dever de informar o consumidor do montante, ou basta a existência e a natureza da remuneração, paga pelo
   prestador?
3. Os critérios de ordenação das propostas e das sugestões de produtos (os produtos pedidos pelo cliente aparecem
   primeiro; os materiais de fornecedores aparecem com o desconto para a obra) devem constar das condições gerais?

# 4. Conteúdo obrigatório do orçamento

**O que fizemos.** Em cada orçamento: (a) o pintor confirma que inclui **mão-de-obra qualificada**; (b) declara os
**seguros** de responsabilidade civil e de acidentes de trabalho, e declarar «não tenho» não impede a submissão, mas
o cliente vê um aviso a vermelho; (c) **plano de pagamentos por fases**, somando 100% com o adiantamento (máximo 30%);
(d) **garantia legal** sempre indicada, **sem número**, com garantia adicional opcional do pintor; (e) a plataforma
**não verifica** o cumprimento: guarda a declaração.

**Perguntas.**

1. A garantia legal deve aparecer com texto ou prazo (art. 1225.º do Código Civil, 5 anos; prazos do DL 84/2021 para
   bens de consumo, se aplicável), ou a remissão genérica basta?
2. Permitir propor sem seguros, com aviso, é aceitável? A plataforma assume alguma responsabilidade?
3. Declarações de «mão-de-obra qualificada» e de seguros: valor probatório e consequência de falsidade (cláusula
   de resolução, exclusão da plataforma)?
4. Um empresário em nome individual precisa de algo diferente das empresas (habilitação IMPIC, valores)?

# 5. Caução e dinheiro (continuação)

1. **Mínimo de 150 € na caução do cliente.** Mantém-se (decisão do promotor, contra a sugestão do parecer B2 de o
   retirar). Em obras pequenas pode chegar a 30%. Pedimos redação que o torne defensável (por exemplo, justificação
   pelo custo do serviço de apresentação) ou a recomendação de o retirar.
2. **Devolução automática de pagamentos que a plataforma não pode aceitar** (pagamento tardio ou duplicado): é feita
   por instrução ao parceiro (Stripe). Confirmar que, juridicamente, a plataforma não detém os fundos e que o modelo
   está dentro do estatuto do parceiro (**A1**: pedido de confirmação escrita da Stripe ou do parceiro escolhido).
3. **Contrato cliente–plataforma (B3):** falta ainda o texto das condições gerais aceites antes do depósito.

# 6. Dados pessoais, anonimato e conteúdos

1. **Política de privacidade e termos**: pedimos a redação, para clientes e para pintores/fornecedores, incluindo
   conservação de documentos (**E3**: contratos e provas de assinatura 10 anos; verificação até 2 anos após
   inatividade; fiscais pelo prazo legal).
2. **Anonimato até à apresentação:** morada, nomes e fotografias originais não chegam à outra parte; as fotografias
   só geram um volume 3D não reconhecível. Há risco de dados pessoais nas fotografias carregadas? Que aviso
   aos utilizadores?
3. **Verificação de NIF e nome (nif.pt):** ao registar uma entidade empresarial, consultamos um serviço público para
   confirmar existência, estado e denominação. Não guardamos a resposta. Há reparos?
4. **Livro de Reclamações eletrónico** e resolução alternativa de litígios: obrigações e onde publicar.
5. **Avaliações** dos pintores e média só a partir de 3 obras: responsabilidade pelo conteúdo, moderação (DSA).
6. **Planos de fornecedores** (39 € e 49 €/mês, códigos promocionais): tratamento fiscal e condições de subscrição.
7. **Catálogo de referência** (marcas, fichas e preços públicos de fabricantes): uso de marcas e de informação
   pública; necessidade de aviso de que os preços são de tabela.

# 7. Assinatura

1. Aceitação simples (clicar «aceito») foi usada só em testes; em produção exige Chave Móvel Digital. Confirmar que a
   aceitação simples **não** vale como assinatura do contrato de empreitada.
2. **Identidades no PDF** (E4): o PDF assinado passa a ter nomes, depois da apresentação. Confirmar.

# 8. Pedidos de documentos

Pedimos, além das respostas: (i) condições gerais cliente; (ii) condições gerais pintor/fornecedor; (iii) revisão da
minuta, incluindo a cláusula 2-B; (iv) política de privacidade e de cookies; (v) cláusula de não evasão; (vi) modelo
de ponto de ordem de trabalhos para condomínios (D2).

*Anexos disponíveis:* código das regras (`src/domain/equivalence.ts`, `strikes.ts`), cláusulas do contrato
(`src/domain/contracting.ts`), página Transparência.
