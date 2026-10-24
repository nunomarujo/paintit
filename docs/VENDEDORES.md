# Vendedores / avaliadores — estrutura proposta

**Estado: desenho decidido, nada construído.** Escrito a 24/10/2026 a pedido do promotor ("preciso da tua
ajuda para orquestrar") e **revisto no mesmo dia** com duas decisões dele que mudaram a arquitectura
escolhida (secção 3). Nada aqui está em vigor: `docs/MODELO.md` e `docs/ESTADO.md` continuam a valer.

**Em duas linhas:** o avaliador passa a ser uma entidade só dele, com o saldo das avaliações a ser dele e a
empresa a nunca o ver; o catálogo **fica onde está**, da empresa e com a mensalidade que já existe, e serve
ao vendedor de argumento para convencer o patrão a subscrever.

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

### Decidido a 24/10/2026, pelo promotor: nem A nem B — o híbrido barato

As duas respostas dele desfizeram a parte cara da recomendação anterior (que era a A, com o catálogo a
mudar de dono). Pela ordem em que importam:

**1. O dinheiro da avaliação é do vendedor, e ele decide como o recebe.** Palavras dele: *"se o vendedor
não ganhar diretamente não terá a mesma motivação, pois a empresa pode-lhe ficar com tudo — por isso
criamos o saldo em que ele resgata quando quiser, ou registado como recibo verde, ou ato único, mas ele
decide"*. A plataforma aceita **fatura-recibo de qualquer pessoa**, desde que refira o **código interno**
da plataforma e a descrição bata certo com o serviço (tipo "prestação de serviços de análise para a
plataforma quempinta.pt"). **A confirmar com o contabilista** — é o único ponto deste bloco que não está
fechado.

**2. O catálogo fica onde está, e passa a ser argumento de venda.** Palavras dele: *"o catálogo fica, não
espero que o paguem pois é mensalidade, mas como uma dica para apresentarem à empresa as vantagens de
aderirem e subscreverem, para os seus produtos passarem à frente"*. Ou seja: **o vendedor não paga
catálogo nenhum e não precisa de ter um**. O catálogo continua a ser da empresa, com a mensalidade que já
existe, e o papel do vendedor é **convencer o próprio patrão a subscrever**.

E é isto que muda tudo: a razão pela qual se tinha escolhido a arquitectura A era o vendedor precisar de
catálogo antes de a empresa existir na plataforma. **Deixou de precisar.** Logo, o catálogo, os descontos,
as entregas, os clientes e as encomendas **não mudam de dono** — morre a parte cara, e com ela o risco de
mexer em dados que já estão em produção.

### O que fica, então

| Camada | O que é | O que guarda |
| --- | --- | --- |
| **Conta pessoal do avaliador** | Entidade só dele: um proprietário, sem convites | Zonas cobertas, reservas, levantamentos, **saldo, comissões e resgates**, classificação |
| **Entidade da empresa** | O que já existe hoje, sem alterações | Catálogo, preços, descontos, entregas, clientes, encomendas, subscrição |
| **Declaração de vínculo** | Termo assinado pelo vendedor | Que empresa (NIF e nome) ele declara, versão e data |
| **Loja** | Só se as lojas precisarem de descontos ou zonas diferentes | Fica para depois; não bloqueia nada |

As comissões ficam privadas **por construção**: vivem noutra entidade, e não há política nenhuma a mexer.
A empresa não as vê porque não lhe pertencem — não porque se escondeu alguma coisa.

Nota sobre o ponto 10 (descontos iguais entre vendedores): **resolve-se sozinho**. Se o desconto continua a
ser da empresa, há um só conjunto de descontos, igual para todos por definição. O que falta é só o **rasto
de quem alterou e quando**, que não existe hoje e continua a ser o primeiro passo a construir.

---

## 4. Quem vê o quê (proposta)

Atualizada com as decisões de 24/10/2026. "Empresa" é a entidade que já existe hoje; o vendedor acede-lhe
como membro, com o papel `vendedor`.

| Dado | Onde vive | Vendedor | Outro vendedor da mesma empresa | Empresa |
| --- | --- | --- | --- | --- |
| Catálogo, preços, descontos, entregas | Empresa | Vê e edita (dentro dos tetos) | Vê e edita (dentro dos tetos) | Vê e edita; define tetos |
| Quem alterou o desconto e quando | Empresa | Vê | Vê | Vê |
| Encomendas de pintores | Empresa | Vê | Vê | Vê |
| Carteira de clientes (pintores) | Empresa | Vê | Vê | Vê |
| Métricas de materiais | Empresa | Vê | Vê | Vê |
| **Oportunidades de avaliação** | Conta pessoal | Vê as da sua zona | Vê as da sua zona, **em concorrência** | **Não participa** |
| **Saldo, comissões e resgates** | Conta pessoal | Só ele | **Não vê** | **Nunca vê** |
| Classificação como avaliador | Conta pessoal | Vê a sua | Não vê a do outro | Ver 4.1 |

### 4.1 A tensão que sobra, e que o promotor ainda não resolveu

O ponto 11 pede duas coisas que se mordem uma à outra: a empresa **vê métricas de performance da equipa**,
mas **nunca vê as comissões**. Só que as comissões do avaliador são uma função direta do trabalho que ele
fez — a fórmula é 1%-2,7% do valor adjudicado (`src/domain/survey.ts`). Logo:

- mostrar à empresa **quantas obras** ele avaliou, ou o valor delas, é mostrar-lhe a comissão por via
  indireta — basta uma multiplicação;
- mostrar só a **classificação em estrelas** não revela nada de dinheiro, e continua a servir para a
  empresa saber se a sua equipa trabalha bem.

Proposta: a empresa vê **estrelas e mais nada** — nunca contagem de obras, nunca valores, nunca datas. Se o
promotor quiser que veja volume de trabalho, então tem de aceitar que o sigilo da comissão é aproximado, e
isso devia ser dito ao vendedor no termo que ele assina, não escondido dele.

---

## 5. Decisões que faltam, por ordem de impacto

### 5.1 ~~Mover o catálogo?~~ — **Decidido a 24/10/2026: não se move.**
O catálogo fica da empresa, com a mensalidade que já existe. O vendedor não paga e não precisa de ter um;
usa-o como argumento para a empresa subscrever. Morre a parte cara desta mudança.

### 5.2 A comissão da avaliação é paga a quem, fiscalmente? — **decidido no desenho, por fechar com o contabilista**
Decidido: é do **vendedor**, em saldo que ele resgata quando quiser, por recibo verde ou ato único, à
escolha dele. A plataforma aceita fatura-recibo de qualquer pessoa desde que refira o **código interno** e
a descrição corresponda ao serviço.

O que isto obriga a mudar, e ainda não está construído:
- `supplier_payout_details` (IBAN, titular, `cobra_iva`) é hoje **por entidade**; passa a ser da conta
  pessoal — o titular é a pessoa, não a empresa.
- Passa a ser preciso um **código interno por resgate**, para casar a fatura-recibo recebida com o
  movimento — é o que o promotor pediu para a gestão interna.
- `cobra_iva` deixa de ser uma caixa: um ato isolado e uma atividade aberta têm tratamentos diferentes, e
  há quem esteja isento. Isto é precisamente a parte do contabilista.
- A verificação da fatura-recibo (código presente, descrição coerente) é **humana**, na equipa da
  plataforma, como já acontece com as faturas de adesão.

**Por fechar com o contabilista**, e até lá não se mexe em pagamentos reais (que continuam travados pela
Stripe em modo de teste e pela Moloni sem conta de testes — `docs/ESTADO.md`, secção 6).

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

### 5.7 "Produtos a passar à frente" — o que isso quer dizer ao certo
O promotor referiu, como vantagem a vender à empresa, que os produtos dela **passam à frente**. Falta
definir: à frente onde (catálogo, sugestões de material no orçamento, listagem de vendedores), por que
ordem entre subscritores, e se o pintor percebe que aquela ordem é paga. Esta última não é detalhe: uma
ordenação paga que se apresente como neutra é publicidade encapotada, e a página Transparência existe
precisamente para a plataforma não fazer isso.

---

## 6. Ordem de construção sugerida

Cada passo é útil por si, e nenhum obriga o seguinte. **Nada disto se começa antes de as quatro migrações
pendentes entrarem** (`docs/ESTADO.md`, secção 6) — a fila já não anda, e acrescentar-lhe peças só as
torna invisíveis.

1. **Rasto de alterações nos descontos** (`quem mudou e quando`) — não depende de decisão nenhuma, resolve
   o ponto 10 por inteiro agora que o desconto fica da empresa, e é uma lacuna real mesmo no modelo de
   hoje. **É por aqui que se começa.**
2. **Termo de declaração de vínculo** (ponto 5), no padrão já existente de `painter_terms_acceptances` e
   `survey_terms_acceptances`: versão, data, e o NIF e nome que o vendedor declarou.
3. **Conta pessoal de avaliador**: entidade só dele, com as zonas, os levantamentos e o saldo a mudarem-se
   para lá. É a peça central, e a única que mexe em dados existentes (os levantamentos e comissões do
   fornecedor de teste).
4. **Código interno por resgate** e dados de pagamento pessoais (depende de 3; fecho com o contabilista
   antes de valer para dinheiro real).
5. **Perfil da empresa**: equipa, métricas, tetos de desconto (depende de 1 e 2).
6. **Os dois avisos** ao exceder o teto (depende de 5 e da decisão 5.5).
7. **Mensagem às duas contas da mesma loja** para entrarem como equipa (ponto 9) — e só aqui é que a
   **loja** passa a ser precisa como registo.
