# Vendedores / avaliadores — estrutura proposta

**Estado: proposta, nada construído.** Escrito a 24/10/2026 a pedido do promotor ("preciso da tua ajuda
para orquestrar"). Fixa o problema, o que existe hoje, duas arquitecturas possíveis com os seus custos, e
as decisões que faltam. Nada aqui está em vigor: `docs/MODELO.md` e `docs/ESTADO.md` continuam a valer.

---

## 1. O que o promotor pediu

1. O vendedor pertence a uma empresa de venda de tintas. Quer **vender, mostrar tintas, pôr tintas no
   catálogo**.
2. Mas também quer **tratar diretamente das avaliações, sem as incorporar na empresa**.
3. Por isso deve poder **abrir conta só sua — mais ninguém tem acesso**.
4. A empresa fica associada a ele, **mas não em exclusivo**: haverá mais vendedores a identificar a mesma
   empresa, o mesmo NIF, o mesmo nome.
5. **Assinam um termo** em que assumem trabalhar na empresa que identificam, e são legalmente
   responsáveis por falsas declarações.
6. Ao introduzir NIF e nome, alguns dados podem vir pré-preenchidos (sede, telefone), **editáveis**; e
   devem poder registar **lojas ou outros locais de trabalho** diferentes da sede.
7. Outros vendedores podem pertencer à **mesma loja**, ou a outra loja da mesma empresa.
8. Cada perfil acede às oportunidades de avaliação **de modo independente — o primeiro a responder é que
   conta**.
9. Se existirem duas contas na **mesma loja**, é enviada mensagem a ambas para entrarem como equipa.
10. Os **descontos sobre produtos a um determinado pintor têm de ser iguais** entre vendedores, e tem de
    ficar registado **quem mudou e quando** (última alteração de desconto ou preço).
11. A **empresa-mãe pode criar perfil**: vê produtos e preços, **nunca as comissões dos vendedores nem os
    resgates**. Gere os membros da equipa, vê métricas de performance (classificação na app), encomendas
    de pintores, novas obras, e métricas de materiais mais pesquisados e mais comprados (por unidades e
    por litro).
12. A empresa **edita descontos sobre a sua equipa**, e o vendedor fica limitado a esses valores com
    **dois avisos**: o primeiro diz que o valor foi definido pelo superior [nome]; o segundo diz que será
    enviada notificação a [nome]; se ainda assim confirmar, o desconto muda. A regra aplica-se a **todo o
    tipo de seleção** (por classe, por tipo, por cliente, um a um).

---

## 2. O que existe hoje, e porque é que isto não encaixa já

| Peça | Hoje | Problema face ao pedido |
| --- | --- | --- |
| Identidade | Uma conta tem **um só perfil**; uma conta de fornecedor **é uma só entidade** (`allowedOrgKinds`, `src/domain/organization.ts`) | O pedido quer conta pessoal do vendedor **e** ligação a uma empresa que não é dele |
| Catálogo, preços, descontos | `products`, `supplier_discounts` — **por entidade** (`org_id`) | Se cada vendedor for a sua própria entidade, cada um tem catálogo e descontos próprios: ponto 10 fica por cumprir |
| Comissões do levantamento | `survey_payouts.supplier_org_id`, `survey_redemptions.supplier_org_id`, lidos por `private.can_access_org(...)` | **Toda a equipa da entidade vê as comissões.** O ponto 11 proíbe exatamente isto |
| Dados de pagamento | `supplier_payout_details` (IBAN, titular, `cobra_iva`) — **por entidade** | Se a comissão é do vendedor e não da empresa, o IBAN e a fatura são de quem? (ver 5.2) |
| Reserva do levantamento | `reserve_survey(p_survey_id, p_org)`, primeiro a chegar; cobertura por concelho em `supplier_survey_coverage` (por entidade) | **Já funciona como o ponto 8 pede**, desde que cada avaliador seja uma entidade |
| Termo assinado | Padrão já existente: `painter_terms_acceptances`, `survey_terms_acceptances` (versão + data) | Reaproveita-se tal e qual para o termo do ponto 5 |
| Quem alterou o desconto | `supplier_discounts.created_by` (quem **criou**) | **Não há** registo de alteração: nem quem, nem quando. O ponto 10 exige-o |
| Pré-preenchimento pelo NIF | `lookupNif` (nif.pt) devolve **só o nome oficial e se está ativo** | **Sede e telefone não vêm** deste fornecedor. Ou se muda de fornecedor de dados, ou o vendedor preenche à mão |
| Relação "entidade-mãe" | `organizations.gerida_por` (administradora → condomínio) dá à mãe **acesso de leitura** ao filho (`can_access_org`) | É o **inverso** do que o ponto 11 quer. Não serve: precisa de uma ligação própria, sem acesso |

A conclusão que interessa: **a relação que já existe entre administradora e condomínio não serve de molde
aqui.** Ali a mãe vê tudo do filho; aqui a mãe não pode ver as comissões do vendedor. É uma ligação nova,
com regras de acesso próprias.

---

## 3. As duas arquitecturas possíveis

### A — A conta pessoal é a entidade de fornecedor; empresa e loja são camadas por cima

- Cada avaliador é uma entidade `fornecedor` só sua (um único proprietário, sem convites).
- `empresas` (identificadas por NIF, podendo estar **por reclamar**) e `lojas` são registos novos, criados
  pela declaração do primeiro vendedor.
- O catálogo, os preços e os descontos **sobem para a loja** (ou para a empresa).
- A empresa-mãe, quando se regista, **reclama** a empresa e passa a definir tetos, equipa e métricas.

**A favor:** cumpre "conta apenas sua" à letra; o vendedor funciona mesmo que a empresa nunca se registe;
as comissões ficam privadas sem mexer em nenhuma política de acesso, porque a entidade tem uma só pessoa.

**Contra:** obriga a **mudar de dono** o catálogo e tudo o que lhe está preso — `products`,
`supplier_discounts`, `supplier_delivery`, `supplier_customers`, `supplier_subscriptions`,
`supplier_referral_invites`, `supplier_painter_invites`, encomendas. É a parte cara, e mexe em dados que
já existem em produção.

### B — Duas identidades: a empresa vende, a pessoa avalia

- A entidade `fornecedor` continua a ser **a empresa**, como hoje, com o catálogo e os descontos onde já
  estão.
- O vendedor ganha, além da sua participação na empresa, uma **identidade pessoal de avaliador** que
  recebe os levantamentos, as comissões e os resgates.

**A favor:** quase nada se move; o ponto 10 (descontos iguais) sai de graça, porque o desconto continua a
ser um só, da empresa; as comissões ficam privadas por viverem noutra identidade.

**Contra:** o vendedor só pode vender se a empresa estiver registada — e o promotor diz que a empresa
"**pode** criar perfil", ou seja, é opcional. Obriga ainda a abrir uma excepção explícita à regra "uma
conta, um perfil".

### Recomendação: A, com a empresa criada "por reclamar"

O "pode" do ponto 11 é o que decide. Se o perfil da empresa é opcional, o vendedor tem de conseguir ter
catálogo **antes e sem** a empresa existir na plataforma — e isso só a A permite. Propõe-se a variante:

1. O primeiro vendedor que declara o NIF **cria a empresa por reclamar** e a sua loja.
2. Enquanto a empresa não for reclamada, **os vendedores da loja gerem o catálogo e os descontos dela**.
3. Quando a empresa se regista e reclama o NIF, ganha os tetos, a equipa e as métricas; os vendedores
   continuam a poder mexer nos descontos dentro dos tetos, com os dois avisos do ponto 12.
4. Os levantamentos, as comissões e os resgates **nunca** mudam de dono: são da conta pessoal, e a empresa
   não os vê em caso nenhum.

---

## 4. Quem vê o quê (proposta)

| Dado | Vendedor (conta pessoal) | Outro vendedor da mesma loja | Empresa-mãe reclamada |
| --- | --- | --- | --- |
| Catálogo, preços, descontos da loja | Vê e edita (dentro dos tetos) | Vê e edita (dentro dos tetos) | Vê e edita; define tetos |
| Quem alterou o desconto e quando | Vê | Vê | Vê |
| Encomendas de pintores | Vê as da sua loja | Vê as da sua loja | Vê todas |
| Carteira de clientes (pintores) | Vê a da loja | Vê a da loja | Vê todas |
| **Oportunidades de avaliação** | Vê as da sua zona | Vê as da sua zona, **em concorrência** | **Não participa** |
| **Comissões de avaliação e resgates** | Só ele | **Não vê** | **Nunca vê** |
| Classificação do avaliador na app | Vê a sua | Não vê a do outro | Vê a dos seus (métrica de equipa) |
| Métricas de materiais | Vê as da loja | Vê as da loja | Vê todas |

Duas notas que valem a pena discutir, porque não vinham no pedido:

- **Entre vendedores da mesma loja**, as comissões de avaliação ficam privadas um do outro? A tabela acima
  assume que sim (são concorrentes na reserva, ponto 8). Se o promotor quiser equipa a sério, isto muda.
- A **classificação** do avaliador é visível à empresa como métrica de equipa (ponto 11 pede), mas isso
  revela indiretamente quantas obras ele fez. Se o sigilo tiver de ser total, a métrica tem de ser só
  qualitativa (estrelas), nunca contagem.

---

## 5. Decisões que faltam, por ordem de impacto

### 5.1 Vale a pena mover o catálogo (arquitectura A) ou aceitar a dependência da empresa (B)?
É a decisão estruturante. Tudo o resto depende dela.

### 5.2 A comissão da avaliação é paga a quem, fiscalmente?
Se o dinheiro é do vendedor e não da empresa, é o **vendedor** que fatura a plataforma — a título pessoal,
com recibo verde ou atividade aberta. Isso muda `supplier_payout_details` (IBAN e `cobra_iva` deixam de
ser da empresa), muda a faturação (`docs/FATURACAO.md`) e tem consequências fiscais que não são minhas
para decidir. **Em aberto para o promotor e o contabilista.** Enquanto não estiver decidido, não se mexe no
pagamento.

### 5.3 A empresa pode contestar uma declaração falsa?
O termo do ponto 5 resolve a responsabilidade legal, mas não o caso prático: alguém declara trabalhar numa
empresa onde já não trabalha. Proposta: ao reclamar o NIF, a empresa vê a lista de quem se declarou seu e
pode **desassociar** — a conta pessoal e as avaliações dela ficam, perde-se a ligação comercial.

### 5.4 O nome da empresa aparece ao pintor como verificado?
A declaração é do vendedor, não da empresa. Proposta: enquanto a empresa não reclamar o NIF, o nome
aparece **sem selo de verificação**, e a plataforma não afirma a ligação como confirmada.

### 5.5 "Limitada a esses valores" é mesmo limite?
O ponto 12 diz que o vendedor fica **limitado** aos valores da empresa, mas depois descreve dois avisos e
a alteração a passar à mesma. Leitura adotada: **não é um teto rígido** — é um limite com atrito e
rasto (dois avisos, notificação ao superior, registo de quem mudou). Se for para ser rígido, diga-se, que
é mais simples de construir, não menos.

### 5.6 Sede e telefone pré-preenchidos
O nif.pt não os devolve. Ou se aceita só o nome pré-preenchido (sem custo), ou se procura outro fornecedor
de dados (custo e dependência novos). Proposta: só o nome, e o resto à mão.

---

## 6. Ordem de construção sugerida

Cada passo é útil por si, e nenhum obriga o seguinte:

1. **Rasto de alterações nos descontos** (`quem mudou e quando`) — não depende de nenhuma decisão acima,
   resolve metade do ponto 10 e é uma lacuna real mesmo no modelo de hoje.
2. **Termo de declaração de vínculo** (ponto 5), no padrão já existente das outras aceitações.
3. **Empresa e loja** como registos, com a declaração a criá-las por reclamar (depende de 5.1).
4. **Conta pessoal de avaliador** e a separação das comissões (depende de 5.1 e 5.2).
5. **Perfil da empresa-mãe**: equipa, métricas, tetos (depende de 3).
6. **Os dois avisos** sobre o teto (depende de 5 e de 5.5).
7. **Mensagem às duas contas da mesma loja** para entrarem como equipa (ponto 9).
