# Ponto de situação — documento único e completo. Ler primeiro, do princípio ao fim, em cada sessão nova

Atualizado a 23/10/2026 (fim do dia).

**Como usar este ficheiro:** é feito para que uma sessão nova (Claude, ou o promotor) fique **completamente
inteirada só com esta leitura**, sem precisar de abrir mais nada. Não é um índice de apontadores — o essencial de
cada mecanismo, decisão e número está **escrito aqui**, não só referenciado. Os outros ficheiros em `docs/` são
aprofundamentos de uma área específica (ver secção 9) — consultam-se só para implementar essa área, e podem estar
mais atrasados do que este documento. **Em caso de contradição, este ficheiro é que vale**, e corrige-se o outro.
Nunca perguntar ao promotor algo que já está respondido aqui — se parecer em falta, procurar primeiro em
`docs/DECISOES.md` (histórico completo, por data, com o raciocínio de cada decisão) antes de perguntar.

**Regra permanente, antes de tudo o resto (CLAUDE.md):** este projeto nunca reutiliza código, dados ou decisões de
outro projeto do promotor. Qualquer pedido que pareça pertencer a outro projeto — parar e perguntar.

---

## 1. O produto, em poucas frases

**Quem Pinta** (quempinta.pt; nome de trabalho anterior "Paint it", que fica como nome do repositório GitHub e do
projeto Supabase, nunca mostrado ao utilizador) é um marketplace de orçamentação e contratação de empreitadas de
**pintura** em Portugal.

- **Quem usa:** condomínios (muitas vezes geridos por uma administradora com vários prédios), particulares, e
  pintores/empresas de pintura verificados. Também fornecedores de tintas e materiais (catálogo, descontos,
  encomendas, e agora um papel ativo no levantamento das obras — secção 5.3).
- **O percurso:** o cliente descreve a obra (prédio, superfícies, fotografias); pintores verificados orçamentam
  **sem saber quem é o cliente nem a morada** (anonimato até à apresentação, abaixo); o cliente compara propostas
  e escolhe; as duas partes assinam o contrato na plataforma, com Chave Móvel Digital.
- **Como a plataforma ganha dinheiro:** uma comissão de sucesso cobrada ao **pintor** quando ganha uma obra (nunca
  ao cliente, e nunca mostrada a ele — regra 13 do `CLAUDE.md`, ver secção 3), mais subscrições de fornecedores
  para estarem no catálogo de materiais.
- **O papel da plataforma termina na assinatura das duas partes.** Depois disso só guarda prova do que foi
  assinado, com imparcialidade; a execução da obra é entre as partes.
- **A plataforma nunca guarda dinheiro.** Cada cêntimo retido (caução, comissão) está num parceiro de pagamentos
  autorizado (Stripe Connect); a plataforma só dá instruções (devolver, transferir).
- **Anonimato até à apresentação:** morada, nomes, contactos e fotografias originais nunca chegam à outra parte
  antes do momento certo (quando a comissão do pintor é confirmada — secção 3). As fotografias só geram um volume
  3D não reconhecível; pormenores só depois de revisão humana da equipa.
- **Promotor:** Nuno (Nuno Marujo), conta `nunomarujo@gmail.com`, na equipa da plataforma (`platform_admins`)
  desde 18/10/2026. **Empresa dona da plataforma:** RELEVANTEPLANETA, UNIPESSOAL LDA, NIF 517588676, Rua Salvato
  Feijó, Torre Active Centre, loja Y, 4900-415 Viana do Castelo, CAE 74900 (a confirmar com o contabilista se
  cobre a intermediação), IVA trimestral, banco EuroBic (`src/config/company.ts`).
- **Estado de publicação:** `https://quempinta.pt` ativo (Vercel, projeto `paintit`, equipa `quempintapt-8835`, a
  partir do repositório `nunomarujo/paintit`); endereço provisório anterior `https://paintit-one.vercel.app`.
  Pagamentos e faturação ainda em modo de teste (ver secção 6).

---

## 2. Entidades e papéis

### 2.1 Tipos de entidade (`OrgKind`, `src/domain/organization.ts`)

| Tipo | O que é | Perfil da conta |
| --- | --- | --- |
| `condominio` | Um condomínio, com os seus prédios | cliente |
| `administradora` | Empresa que gere vários condomínios (cada um com o seu NIF, prédios e pedidos próprios) | cliente |
| `particular` | Uma pessoa, sem administração | cliente |
| `pintor` | Empresa ou profissional de pintura que orçamenta | pintor |
| `fornecedor` | Fornecedor de tintas e materiais (catálogo, descontos, e vendedores que fazem levantamentos) | fornecedor |

**Regra de uma conta, um perfil (20/10/2026):** cada conta Google/email é só **cliente**, só **pintor** ou só
**fornecedor** — nunca mistura. A base de dados recusa juntar a mesma conta a entidades de perfis diferentes
(trigger `um_perfil_por_conta`).

**Uma conta de pintor ou de fornecedor é sempre uma só empresa (`allowedOrgKinds`):** depois de criar a primeira
entidade desse perfil, não pode criar uma segunda — para outra empresa, outra conta; colegas entram por convite na
equipa dessa entidade. **Só as contas-cliente podem ter várias entidades** (uma administradora gere vários
condomínios). Isto é a base da decisão de nav de 23/10/2026 (secção 5.3): a Início mostra um atalho direto para a
única entidade de uma conta pintor/fornecedor, em vez de uma lista com um só item.

### 2.2 Papéis dentro de uma entidade (`MemberRole`)

| Papel | Significado geral | Num fornecedor | Num pintor |
| --- | --- | --- | --- |
| `proprietario` | Gere tudo, incluindo a equipa | — | — |
| `gestor` | Gere prédios, pedidos e documentos | Gere produtos, descontos, entregas e encomendas | Gere propostas, obras e documentos |
| `financeiro` | Envia documentos e acompanha pagamentos | Acompanha a subscrição e as encomendas | Envia documentos e acompanha comissões e pagamentos |
| `vendedor` | (só faz sentido num fornecedor) | **Recebe e faz o levantamento de obras na sua zona** (papel novo, 23/10/2026 — secção 5.3). Não gere produtos, descontos nem a equipa | — |
| `leitor` | Só consulta | — | — |

`can_access_org` (RLS) deixa entrar com qualquer papel, incluindo `vendedor` e `leitor`; `can_manage_org` (criar,
editar, gerir equipa e dinheiro) continua restrito a `proprietario`/`gestor`.

### 2.3 Equipa da plataforma

Tabela `platform_admins`, só alterável por SQL direto no Supabase (sem ecrã, de propósito). Uma conta "de equipa"
sem nenhuma entidade vê só o backoffice; a primeira conta (promotor) já criou também um condomínio para testar.

---

## 3. Como o dinheiro se move hoje (percurso v2, em vigor desde 19/10/2026)

Implementação: `src/domain/engagement.ts` (testado em `engagement.test.ts`); parâmetros versionados em
`src/domain/rules.ts`. Detalhe completo e exemplos: `docs/MODELO.md`.

### 3.1 O percurso

1. **Escolha preliminar**, ainda anónima — o cliente escolhe uma proposta, mas nada é definitivo.
2. **Caução do cliente** (3% do valor sem IVA, **mínimo 150 €**) depositada no Stripe, quando o cliente quiser
   (sem prazo). É este depósito que torna a escolha efetiva e avisa o pintor.
3. **Comissão do pintor** — ver a tabela de percentagens em vigor (3.2) — em **8 dias corridos** a contar da
   confirmação da caução (conta a receção, fuso de Lisboa, até às 23:59 do 8.º dia). IVA de 23% acresce.
4. **Apresentação:** com a comissão confirmada dentro do prazo, as partes ficam a conhecer-se — identidade, NIF,
   habilitação, contactos, morada da obra. Antes disto, nada disto é visível a ninguém de fora da própria
   entidade (ver excepção do vendedor, secção 5.3).
5. **Assinaturas** do contrato completo, já com identidades: primeiro o cliente, depois o pintor (8 dias cada).
6. Com as duas assinaturas, a **caução volta ao cliente** e a comissão fica com a plataforma.
7. O **adiantamento**, se a proposta o previr (até 30% do valor, somado com as outras fases a 100%), paga-se
   diretamente ao pintor depois da assinatura, como diz o contrato — **nunca passa pela plataforma**.

### 3.2 A comissão do pintor: qual percentagem se aplica

**Regra central: a plataforma recebe a comissão uma única vez, nunca as duas garantias.** A comissão de base é
3%, mas há canais e descontos que a alteram — cada contratação grava a versão exata de regras que aplicou
(`src/domain/rules.ts`), para nunca mudar depois:

| Situação | Comissão do pintor | Porquê |
| --- | --- | --- |
| **Normal** (`CURRENT_RULES`, `2026-10-20`) | **3%** do valor sem IVA, mínimo 150 € | Valor de base, decidido 18/10/2026 |
| Com código de adesão de 1 fornecedor ligado | **2,75%** (−0,25 p.p. por fornecedor, somando-se até um teto) | Ver "dois programas de referência", 5.6 |
| Convite direto do cliente ("traga o seu pintor") | **9%**, fixo | É o piso absoluto do próprio algoritmo de fee dinâmico (18% base − todos os descontos ao mesmo tempo) — ver 5.7 |
| **Algoritmo de fee dinâmico (18-23%)** | **Construído, testado, NÃO ligado a nada em produção** | Ver 5.8 — falta decisão do promotor e campos de ecrã que não existem |

- **Teto conjunto dos dois descontos do pintor** (códigos de adesão + referências de fornecedores): **8 pontos
  percentuais** (`combinedPainterDiscountBp`), para nunca ficar negativo nem abaixo do mínimo de 150 €.
- **O cliente nunca vê nenhum destes números** (regra 13 do `CLAUDE.md`): nem a existência de desconto, nem a
  percentagem, nem o valor — vê só "confirmação do pintor". A página pública Transparência diz, sem números, que
  a plataforma cobra uma pequena comissão de sucesso ao prestador de serviço (exigência do parecer jurídico). O
  pintor vê o valor da sua própria comissão com o detalhe do desconto, mas só depois de aceitar não revelar esse
  valor a ninguém (`painter_terms_acceptances`, antes de ver a ficha completa de uma obra — 22/10/2026).

### 3.3 Desvios (o que acontece se algo correr mal)

| Desfecho | Caução do cliente | Comissão do pintor | Adiantamento | Plataforma recebe |
| --- | --- | --- | --- | --- |
| Ambos assinam | Devolvida | Fica | Pago fora da plataforma | Comissão |
| Cliente desiste antes da apresentação | Devolvida | Devolvida (se paga) | — | Nada |
| Cliente desiste ou não assina no prazo, depois da apresentação | Perdida | Devolvida | — | Caução |
| Pintor não paga a comissão em 8 dias | Transita para a proposta seguinte, ou devolvida se o cliente não continuar | — | — | Nada |
| Pintor paga mas não assina no prazo | Transita ou devolvida | Perdida | — | Comissão |
| **Litígio, culpa do cliente** | Perdida | Devolvida | Devolvido ao abrir o litígio | Caução |
| **Litígio, culpa do pintor** | Devolvida | Perdida | Devolvido ao abrir o litígio | Comissão |
| **Litígio, repartido** (`'repartido'`, 23/10/2026) | Uma fração fica retida pela plataforma (`culpaClientePercent`, 1-99%); o resto volta ao cliente | A mesma fração volta ao pintor; o resto fica retido pela plataforma | Devolvido ao abrir o litígio | As duas fações, nunca trocadas entre as partes diretamente |

A caução protege contra o cliente que, depois de conhecer o pintor, contrata com ele por fora: nesse caso a
plataforma devolve a comissão ao pintor (que não teve culpa) e fica com a caução. O **litígio repartido** (DIS-07/
DIS-08) foi decidido com julgamento próprio a 23/10/2026 (autorização do promotor: "resolve as 3 questões com o
teu melhor julgamento") — um parâmetro só (`culpaClientePercent`), aplicado com o mesmo sentido às duas rubricas;
em 100% ou 0% reproduz exatamente os dois desfechos binários de sempre. Quem decide é sempre a equipa da
plataforma no backoffice, nunca um acordo direto entre as partes dentro da app. Detalhe completo:
`docs/DECISOES.md`, 23/10/2026.

### 3.4 Exemplo (percurso v1, para ordem de grandeza — o v2 muda só a ordem, não os valores)

Obra de 100 000 € sem IVA, adiantamento de 10%: cliente deposita 13 000 € (3 000 € caução + 10 000 €
adiantamento); pintor paga 3 690 € (3 000 € comissão + 690 € IVA); na assinatura, cliente recebe 3 000 €, pintor
recebe 10 000 €, a plataforma fica com 3 690 € (690 € dos quais são IVA a entregar ao Estado).

---

## 4. O percurso completo de uma obra, passo a passo (com os mecanismos extra encaixados)

1. **O cliente regista a sua entidade** (condomínio, administradora ou particular) e o(s) seu(s) prédio(s), com
   documentos de verificação (ata de nomeação, certidão permanente, etc. — secção 5.1).
2. **Cria um pedido de orçamento** sobre um prédio: superfícies (área direta ou largura×altura−vãos), fotografias
   (privadas; geram um volume 3D não reconhecível), produtos preferidos (opcional).
   - **Opção nova (23/10/2026):** em vez de preencher as superfícies sozinho, pode pedir a visita de um
     **profissional qualificado de um fornecedor** para o fazer por si — **sem custo**, com avaliação pública de
     0 a 5 estrelas. Ver secção 5.3, é o mecanismo mais recente e mais detalhado deste documento.
3. **Publica o pedido** — fica visível, de forma anónima (só tipo de obra e concelho), a todos os pintores da
   plataforma, por email e em `/app/oportunidades`.
4. **Pintores orçamentam** (depois de aceitar os termos de confidencialidade da comissão — 22/10/2026) com um
   orçamento guiado por trabalhos, zonas/fachadas, produtos do catálogo de referência e condições (seguros, plano
   de pagamentos, garantias). Podem usar um **código de adesão** de um fornecedor (desconto na própria comissão)
   ou ser convidados diretamente pelo cliente (**"traga o seu pintor"**, comissão de 9%) — secções 5.6 e 5.7.
5. **O cliente compara** propostas lado a lado, anonimamente, com cobertura dos trabalhos e produtos pedidos,
   avisos de demãos acima do esperado, e **escolhe**.
6. **Caução → comissão → apresentação → assinaturas**, exatamente como na secção 3.
7. **Durante a obra:** o pintor tem ferramentas discretas (materiais e encomendas a fornecedores, com desconto;
   equipa e horas; cronograma; custos) — a plataforma não intervém na execução.
8. **No fim:** o cliente avalia o pintor (ou, se a obra foi cancelada depois da apresentação, numa categoria
   separada — secção 5.10); o pintor avalia o fornecedor a quem comprou, e a pessoa que lhe fez o levantamento,
   se pediu esse apoio.

---

## 5. Cada mecanismo, em detalhe e estado atual

### 5.1 Contas, entidades, prédios, equipa, documentos — Feito

Entrada por link de email (sem palavra-passe). Entidades com NIF validado (dígito de controlo sempre; nome ↔ NIPC
pela API do nif.pt quando há chave) e morada fiscal (código postal validado pela base dos CTT). Administradora
gere vários condomínios. Equipa com papéis e convites (secção 2.2). Documentos de verificação por tipo de
entidade, com motivos pré-aprovados para rejeitar (22/10/2026) e aviso automático antes de expirarem (manutenção
diária, secção 5.13). Eliminar uma entidade exige escrever uma palavra ao acaso e só é possível sem histórico com
terceiros.

### 5.2 Pedido de orçamento, anonimato, fotografias — Feito

Superfícies por área direta ou fórmula; pré-visualização antes de publicar; publicação com verificação de
anonimato (nada que identifique o cliente passa para o anúncio). Fotografias nunca chegam cruas a um pintor: um
**volume 3D genérico**, gerado só a partir dos dados do prédio (pisos, fachadas, varandas) — nunca das próprias
fotografias — e fotografias de pormenor só depois de revisão humana da equipa (nunca automática por IA, decisão
explícita). Metadados (GPS, aparelho) removidos de todas. Ficheiros confirmados pelos bytes, não pela extensão
que o navegador diz (SEG-05, 23/10/2026) — já se aplicava a imagens, passou a aplicar-se também a PDF.

### 5.3 Levantamento da obra por um vendedor do fornecedor — Feito, núcleo completo (23/10/2026, a funcionalidade mais recente)

**Origem:** pedido direto do promotor, com base no documento "Quem Pinta — a oferta" (consolidação de um "painel
de compradores" em 3 rondas e de um "board" — feedback de uma sessão de IA externa sobre a oferta do produto,
colado nesta conversa). Ponto central do pedido, nas palavras do promotor: *"o cliente... pode preencher sozinho a
info necessária sobre o prédio, mas terá uma opção (cartão/botão bem destacado) onde pode acionar a ida de
profissional qualificado... SERÁ BEM EXPLÍCITO PARA O CLIENTE QUE ISTO NÃO ACRESCENTARÁ QUALQUER CUSTO AO
TRABALHO, mas que o auxílio não assume a responsabilidade por dados incorretos... terá nota-review-qualificação
(em estrelas de 0 a 5)... se for a primeira da plataforma, indica isso mesmo."*

**O papel `vendedor`** é a pessoa que vende tintas (do fornecedor) — nunca uma figura independente. Acede com
login normal à sua entidade (`can_access_org` inclui `'vendedor'`), mas não gere produtos, descontos nem a equipa
(isso continua reservado a `proprietario`/`gestor`).

**O mecanismo, ponta a ponta:**

1. O cliente pode **sempre** preencher superfícies e fotografias sozinho — isto é uma rede de segurança, **nunca
   uma obrigação**. Num pedido ainda em rascunho, um cartão destacado (`RequestSurveyCard.tsx`) oferece pedir a
   visita de um profissional, com o texto exigido pelo promotor: **não acrescenta nenhum custo à obra**, e a
   responsabilidade pelos dados continua do cliente, como se os tivesse preenchido sozinho.
2. O pedido fica **aberto** (`request_surveys`, uma linha por pedido) a qualquer fornecedor cuja zona cubra o
   concelho da obra (`supplier_survey_coverage`: sem linha, ou lista vazia, cobre **todo o país** — mesma
   convenção já usada em `supplier_delivery`). Antes de reservar, um fornecedor só vê uma pré-visualização segura
   (`survey_preview`): **só concelho e tipo de obra**, nunca o título do pedido nem a morada.
3. **O primeiro vendedor elegível a reservar avança** (`reserve_survey`, verificação atómica — não leitura seguida
   de escrita separada, para dois fornecedores nunca ficarem com a mesma reserva). Tem **48 horas**
   (`RESERVE_WINDOW_HOURS`, `src/domain/survey.ts`) para contactar o cliente, agendar e concluir.
4. **Só enquanto a reserva está ativa**, o vendedor que reservou vê a **morada exata** e regista o levantamento
   com os **mesmos componentes que o cliente usaria** (`SurfaceForm`, `PhotoUpload`, reutilizados sem alterações).
   Antes de ver a morada, tem de aceitar termos de confidencialidade (`survey_terms_acceptances`, **por pessoa**,
   não por entidade — decisão deliberada: é a pessoa que vai a casa de alguém).
5. **Reserva vencida (48h sem concluir):** a manutenção diária liberta a reserva de volta a `'aberto'` (limpa quem
   tinha reservado e o que tinha anotado), para outro vendedor poder reservar; o cliente é avisado, sem nenhum
   fornecedor ou vendedor ser nomeado.
6. **Ao concluir**, o cliente é avisado (a app já prometia isto no próprio texto do cartão) e pode **avaliar o
   vendedor de 1 a 5 estrelas** — se for a primeira obra avaliada desse vendedor na plataforma, diz-se isso mesmo
   em vez de uma média ("primeira obra na plataforma" — ao contrário do comparador de pintores, que exige um
   mínimo de 3 obras antes de mostrar média; aqui o promotor pediu explicitamente o inverso).
7. **O cliente nunca sabe que empresa ou que pessoa foi** — só a nota. É uma excepção nova e deliberada à regra 6
   do `CLAUDE.md` (anonimato), mas só num sentido: o **vendedor** vê a morada (sem isso não há visita); o
   **cliente** continua sem saber quem é o vendedor.

**Compensação:** uma fração da comissão que a **plataforma** recebe (nunca do valor da obra, nunca um custo extra
ao cliente), criada só quando essa comissão já entrou (`survey_payouts`, ciclo `adjudicada` → `paga`/`sem_efeito`
— mais simples que o das comissões de adesão, por não haver nada antes de a comissão chegar). **A percentagem
(`SURVEY_SHARE_BP_PROVISIONAL`, 10% em `src/domain/survey.ts`) é um valor provisório meu, não uma decisão do
promotor** — falta confirmar o número antes de qualquer pagamento real. O resgate reaproveita a mesma fórmula e os
mesmos dados de pagamento (IBAN, regime de IVA/retenção) das comissões de adesão — sem segundo formulário.

**Workspace do fornecedor, reorganizado a par disto:** a barra lateral só tinha "Encomendas"; ganhou
"Levantamentos" e acesso direto a "Produtos e descontos", "Referências" e "Comissões de adesão" (antes só
alcançáveis a partir da ficha da entidade). A Início (`/app`) troca a lista "As suas entidades" com um único item
por um atalho direto para essa entidade (pintor ou fornecedor), preservando avisos, convites e o resto do painel;
administradoras e condomínios continuam a ver a lista completa.

**Onde está no código:** domínio `src/domain/survey.ts` + `survey.test.ts` (puro, 6 testes); migrações
`20261023030000_papel_vendedor.sql` (o valor novo do enum `member_role` tem de estar numa migração à parte —
`alter type ... add value` não pode ser usado na mesma transação que o consome), `20261023031000_levantamento_
por_vendedor.sql` (esquema, RLS, RPCs) e `20261023040000_levantamento_avisos_e_expiracao.sql` (aviso ao cliente,
extensão da manutenção diária); `src/lib/surveys.ts` (liga-se a `contratacoes/actions.ts` no momento em que a
comissão é confirmada); páginas em `src/app/app/pedidos/[id]/` (cartão do cliente, `RequestSurveyCard.tsx`) e
`src/app/app/levantamentos/` (lista do vendedor, workspace por obra com termos, formulários de contacto e
conclusão). 7 casos novos em `supabase/tests/rls.test.ts` (reserva atómica, pré-visualização segura, morada real
só para quem reservou, avaliação com "primeira obra", aviso ao concluir, reserva vencida liberta-se e avisa).

**Decisões de desenho a registar (para não se repetirem os mesmos erros):**
- Quatro políticas RLS (`buildings_select`, `work_requests_select`, `request_surfaces_select`,
  `request_photos_select`) já tinham sido alteradas uma vez antes (para a apresentação pós-comissão); `alter
  policy` substitui a cláusula inteira, nunca soma — a condição nova teve de ser fundida com a anterior.
- Uma função partilhada que tentava evitar repetir a condição de acesso (extraída de `request_surveys_select` e
  `survey_preview`) partia o `insert ... returning`, por voltar a interrogar a própria tabela dentro da política
  de leitura da linha que ainda se está a inserir — revertida de propósito; a duplicação fica assumida e
  comentada nas duas migrações.
- **O estado `'expirado'` existe no esquema mas não tem nenhum gatilho que o use** — seria para um pedido
  `'aberto'` que nunca chega a ser reservado por ninguém, sem nenhuma especificação de prazo para isso; o cliente
  já pode sempre desistir ou continuar a preencher sozinho entretanto, o que já cobre "demorar demasiado" sem
  inventar um temporizador sem pedido nem número.
- **`survey_terms_acceptances` existe e está ligado** (ao contrário do que um resumo anterior desta sessão tinha
  registado como gap) — gate feito a 23/10/2026, mesma tarde: antes de ver a morada real, pede-se aceitação,
  exatamente como os termos do pintor antes da ficha completa de uma obra.

Detalhe completo, com cada decisão e porquê: `docs/DECISOES.md`, entrada "23/10/2026 — levantamento da obra por
um vendedor do fornecedor, papel novo e workspace do fornecedor".

### 5.4 Marketplace: oportunidades, orçamento guiado, comparador — Feito

Pintores veem pedidos abertos filtrados por tipo e zona; recebem email ao ser publicado um pedido. O **orçamento
é guiado**, em passos: Trabalhos (13 tipos, com os seus campos e estado — base/opcional/a confirmar/não incluído),
Preços (por unidade, por trabalho, ou um preço global da obra; IVA livre), Condições (seguros, plano de
pagamentos por fases, garantias) e Rever (folha A4). Zonas por fachada, soluções partilhadas por várias fachadas
e "duplicar solução". Catálogo de 39 produtos de referência (CIN, Robbialac, Barbot, Dyrup, Sika…) sugere produtos
nos campos certos; "ou equivalente" aguarda ligar (`NEXT_PUBLIC_EQUIVALENTE`, parecer jurídico). **Sinal de demãos
acima do esperado** (22/10/2026): nunca bloqueia, só avisa o cliente se as demãos declaradas excedem em mais de
uma as recomendadas pelo produto. O comparador do cliente é anónimo, lado a lado, com cobertura dos produtos E dos
trabalhos pedidos (mostra se cada proposta responde ao que foi pedido), sem avaliações do pintor visíveis com
menos de 3 obras avaliadas ("histórico insuficiente"). Métodos de trabalho (modelos próprios do pintor) para não
reescrever as mesmas condições em cada proposta. Detalhe de desenho: `docs/PROPOSTA.md`.

### 5.5 Fornecedores: catálogo, descontos, encomendas — Feito

O fornecedor sobe fichas técnicas (PDF), rendimento e preço de referência datado ao catálogo; liga produtos a
fichas de referência (aparece em "Onde comprar", por concelho). Descontos por produto/tipo, escalões de área,
forma de pagamento, quantidade mínima, primeira compra ou cliente frequente — nunca por quem é a pessoa. Entregas
por concelho (convenção "sem linha, ou vazio = todo o país", reutilizada no levantamento, 5.3). Pintor encomenda
materiais com confirmação do fornecedor; avalia o fornecedor depois (e agora o fornecedor também responde a essa
avaliação — paridade com a avaliação cliente↔pintor, 23/10/2026, secção 5.10). Dois planos pagos (Stripe
Billing, modo de teste): listagem de vendedores (39 €/mês+IVA) e catálogo de produtos completo (49 €/mês+IVA,
inclui descontos). Sem plano de catálogo ativo, não cria produtos nem descontos.

### 5.6 Os dois programas de referência — não confundir (Feito, em produção)

Há **dois mecanismos simétricos e distintos**, com nomes próprios desde 22/10/2026:

| | **Códigos de adesão** (já existia) | **Referências de fornecedores** (novo, 22/10/2026) |
| --- | --- | --- |
| Sentido | Fornecedor → pintor (o fornecedor convida pintores) | Pintor → fornecedor (o pintor convida fornecedores) |
| Quem cria o código | O fornecedor, em `/app/organizacoes/[id]/adesoes` | O pintor, em `/app/organizacoes/[id]/referencias` |
| O que desconta ao pintor | **0,25 p.p.** por fornecedor com código ligado e ativo, **somando-se** (2 fornecedores = 0,5 p.p.), em **todas** as propostas futuras enquanto o código estiver ativo | **Q(n)**, até 4 p.p., pelo número de fornecedores referidos **atualmente elegíveis** em simultâneo (janela de 12 meses a contar da 1.ª subscrição do fornecedor, não do registo) |
| O que ganha o fornecedor | Comissão de **1%** do valor sem IVA das obras ganhas por pintores que o referenciaram; sobe a **2%** ao alcançar a **3.ª obra** (de qualquer um desses pintores) nos **2 meses anteriores** (corridos, nunca retroativo) | Nada diretamente — o incentivo é entrar na plataforma |
| Quando conta como "entidade nova" | Não se aplica (pintores já existentes também usam) | Só NIF/NIPC **ainda não registado** na plataforma (índice único `organizations.nif` para fornecedores, 22/10/2026) |
| Teto conjunto dos dois descontos do pintor | **8 p.p.**, de propósito com margem — hoje só se aproxima com muitos fornecedores ligados e muitas referências elegíveis ao mesmo tempo | (o mesmo teto) |

O cliente nunca vê nada disto (regra 13). O fornecedor vê o nome do pintor e o concelho da obra; nunca o cliente,
a morada nem o valor. Sigilo garantido por RLS, não por convenção. A comissão do fornecedor em ambos os programas
é faturada pelo próprio fornecedor à plataforma (nunca pela Moloni, que só fatura o lado comissão-do-pintor/
subscrição-do-fornecedor/caução-retida — secção 5.14) — acumula em saldo e resgata-se quando o fornecedor quiser,
com uma só fatura por resgate (IBAN, regime de IVA e de retenção, validados pela plataforma).

### 5.7 "Traga o seu pintor" (convite direto do cliente) — Feito (22/10/2026)

O cliente que já tem um pintor da sua confiança gera um código ou QR ligado a **uma obra publicada específica**
(`/app/pedidos/[id]`) e partilha-o diretamente; qualquer entidade de pintura (nova ou já registada) que o resgate
(`/convite/[código]`) vai direta a essa oportunidade. **Comissão fixa de 9%** (não 1%, como uma primeira versão
errada tinha posto — corrigido antes de chegar à base real: 9% é o piso absoluto do próprio algoritmo de fee
dinâmico, secção 5.8, mesmo empilhando todos os seus descontos). Sem limite de usos nem validade por código. O
código tem de existir antes de qualquer proposta ser submetida — não é possível reclassificar depois um negócio
já descoberto pela via normal.

### 5.8 Algoritmo de fee dinâmico (18-23%) — "ponto 1" construído e testado, deliberadamente NÃO ligado

Documento "Algoritmo de determinação de fee QuemPinta v1" (22/10/2026) substitui a faixa fixa de 3% por uma faixa
dinâmica **18-23%**, com nove fatores (B/C/E/F/M/J/R/L/Q). Tem duas partes:

- **"Ponto 2" (descontos por referência, Q) — em produção.** É exatamente a secção 5.6 acima.
- **"Ponto 1" (a própria faixa dinâmica T) — motor construído e testado byte a byte contra os exemplos do
  documento (`src/domain/fee.ts`), mas NÃO ligado a nenhum fluxo real.** Decisão explícita, não falta de tempo:
  - Não há campos de ecrã para o cliente/pintor declararem C/E/F/M/J.
  - R (propostas anteriores) e L (janela de 180 dias) precisam de uma consulta ao histórico que não existe.
  - L depende de um indicador S ("ranking técnico e comercial") que o próprio documento diz vir de "um módulo
    separado ainda a fechar" — `fidelizacaoBp` recebe esse número já pronto, nunca o inventa.
  - O documento marca os seus próprios pesos como "propostas para teste", não decisões fechadas.
  - Falta decidir como isto compõe com os códigos de adesão (mecanismo à parte, que o promotor fez crescer nesta
    sessão, não previsto no documento).
  - **Quando o promotor quiser avançar:** o motor já está pronto; falta decidir o que falta acima e desenhar os
    ecrãs que alimentam cada fator.

### 5.9 Contratação: minuta, assinaturas, apresentação — Feito (falta ligar o parceiro de pagamentos a modo real)

Acontecimentos imutáveis (`engagement_events`); o estado reconstrói-se sempre a partir de `engagement.ts` — **não
há coluna de estado na base de dados**, nenhuma consulta deve tentar ler "o estado" diretamente, só replay. Minuta
gerada da proposta e da ficha da obra, com resumo SHA-256 dos bytes. **Assinatura:** PDF gerado pela plataforma,
assinado na app gratuita **Autenticação.gov** (Chave Móvel Digital ou Cartão de Cidadão) e carregado de volta; a
plataforma verifica que o PDF assinado começa exatamente pelos bytes que gerou, que a assinatura PAdES é
criptograficamente válida, a cadeia de confiança (encadeia nas entidades "Cartão de Cidadão" do Estado) e, desde
22/10/2026, a **revogação por OCSP** (falha aberto em qualquer caso que não seja "revogado", confirmado) — uma
assinatura cujo certificado não encadeia é aceite mas marcada "por confirmar" para a equipa. Para testes sem CMD:
`PERMITIR_ACEITACAO_SIMPLES=1` (nunca em produção). Prazos de 8 dias corridos cada lado; desistência, litígio
(secção 5.11) e transição para outra proposta já cobertos.

### 5.10 Avaliações — Feito, quatro mecanismos unificados por padrão

| Quem avalia quem | Quando | Nota | Observações |
| --- | --- | --- | --- |
| Cliente → pintor | Obra concluída (`assinado`) | 1-5 | Média só aparece com 3+ obras avaliadas; o pintor pode responder |
| Cliente → pintor, **cancelamento** (AVA-01, 23/10/2026) | Depois da apresentação, obra não concluída (desistência, litígio resolvido, etc.) | Categoria `'cancelamento'`, visível na íntegra na contratação, **nunca entra na média de 1-5** | `reviews.obra_concluida = false`; decidido com julgamento próprio |
| Pintor → fornecedor | Depois de uma encomenda | 1-5 | Fornecedor vê e **responde** (paridade adicionada 23/10/2026: `supplier_reviews.resposta`) |
| Cliente → vendedor (pessoa) | Levantamento concluído | 0-5 | "Primeira obra na plataforma" se ainda não houver nenhuma, **sempre visível** (sem mínimo de 3, ao contrário do pintor — pedido explícito do promotor); ver secção 5.3 |

Nenhuma destas avaliações tem notificação de "foi avaliado" (decisão consistente: nunca existiu esse aviso em
nenhuma delas, por isso não se inventou um novo só para o vendedor).

### 5.11 Litígios — Feito, com repartição

Aberto por qualquer parte dentro do prazo certo; resolvido só pela equipa da plataforma no backoffice
(`/app/backoffice/contratacoes/litigios`, fila própria desde 23/10/2026), com três desfechos possíveis — culpa do
cliente, culpa do pintor, ou **repartido** (secção 3.3) — e as duas partes avisadas por email com o resultado em
termos do seu próprio lado, nunca do que a contraparte especificamente ganhou/perdeu.

### 5.12 Anti-contorno (strikes) — Feito

Tentar partilhar contactos, localização ou convites para sair da plataforma (mensagens, pedido, legendas, linhas e
condições da proposta, resposta a avaliações) é recusado e conta como aviso: 1.ª tentativa aviso, 2.ª último
aviso (pode pedir revisão, uma vez, antes da 3.ª), 3.ª bloqueio permanente (email banido, NIFs bloqueados,
sessões caducam em ~1h). A equipa pode desbloquear à mão.

### 5.13 Backoffice — Feito

Organizado por secções com contagem do que espera por uma pessoa: Painel, Pedidos (propostas, denúncias,
fotografias), Entidades (documentos, subscrições, regimes de fornecedores, códigos promocionais), Contratações
(à espera da plataforma, todas, litígios, assinaturas a conferir), Moderação (revisões, avisos), Contabilidade
(secção 5.14), Sistema (estado do servidor, auditoria). **Manutenção diária** (`private.daily_maintenance`,
pg_cron às 05:00 UTC / 06:00 Lisboa): expira documentos fora de validade (com aviso 30 dias antes), fecha
anúncios com prazo de propostas ultrapassado, e desde 23/10/2026 **liberta reservas de levantamento vencidas**
(secção 5.3) — tudo com aviso a quem precisa de saber, nunca a quem não precisa.

### 5.14 Contabilidade, faturação, pagamentos — Parcialmente feito, pagamentos em modo de teste

- **Pagamentos:** Stripe Connect (contas Express), modo de teste. Caução e comissão pagam-se por Stripe Checkout a
  partir da página da contratação; devoluções automáticas (regras) e por cron diário. **Falta:** ativar a conta
  em modo real (dados da empresa).
- **Contabilidade:** livro de movimentos imutável em partidas dobradas (SNC simplificado), alimentado todos os
  dias; reconciliação com a Stripe (taxas, transferências); importação de extrato bancário (CSV/CAMT.053);
  separador Contabilidade no backoffice. **Falta:** IVA trimestral e fecho formal, acesso do contabilista
  (Nuno Branco), limpar dados de teste antes de produção real. Detalhe: `docs/CONTABILIDADE.md`.
- **Faturação certificada:** Moloni escolhida (preço, fase inicial). Código pronto (OAuth, emissão de FT/NC para
  comissão do pintor, subscrição do fornecedor e caução retida), mas **esta conta não tem ambiente de
  demonstração** — pedido enviado a `apoio@moloni.pt` em 22/10/2026, **ainda sem resposta confirmada** (ver
  secção 6). **Não emitir nenhum documento real até isso se confirmar.** Detalhe: `docs/FATURACAO.md`.
- **A comissão de adesão a fornecedores nunca passa pela Moloni** — é o fornecedor que fatura a plataforma (fluxo
  inverso, já feito, sem depender de nenhuma integração externa).

### 5.15 Domínio, email, alojamento — Feito

`quempinta.pt` ativo na Vercel (região `dub1`, Dublin — perto do Supabase em `eu-west-1`, decisão de 21/10/2026
por latência). Caixas `nm@`, `info@`, `suporte@quempinta.pt` (ImprovMX, entregues em `quempinta.pt@gmail.com`).
**Dois canais de email distintos, não confundir:**
1. **Emails do Supabase Auth** (confirmação de conta, magic link) — SMTP já configurado com Resend, **verificado
   e testado** (20/10/2026).
2. **Emails de negócio da própria app** (`src/lib/notify.ts`: proposta nova, prazos, litígio, avaliações,
   encomendas…) — enviados pela API do Resend diretamente do servidor da app, **precisam da sua própria
   `RESEND_API_KEY` nas variáveis da Vercel, que ainda falta colar.** Sem ela, a plataforma funciona sem estes
   avisos (não bloqueia nada, só não avisa).

---

## 6. Travões ativos agora (o que impede avançar, não é falta de código)

1. **Ligação MCP ao Supabase sem permissão nesta sessão**, desde meio da sessão autónoma de 23/10/2026 (antes
   funcionava — várias migrações desse dia e do dia anterior foram aplicadas com sucesso). Voltei a tentar
   (`list_migrations`) ao escrever este documento: **o erro é o mesmo**, não se resolveu por si só. Em
   consequência, **há 10 migrações escritas e testadas localmente (PGlite, `supabase/tests/`) que nunca chegaram
   ao projeto real**, por esta ordem exata (as duas primeiras do lote de 22/10 já estavam aplicadas antes do
   bloqueio; a partir da 3.ª é que ficou tudo pendente):
   - ~~`20261022010000_documentos_fiscais.sql`~~ — aplicada e confirmada
   - ~~`20261022020000_moloni_token.sql`~~ — aplicada e confirmada
   - `20261022030000_nif_unico_fornecedores.sql`
   - `20261022040000_codigos_de_adesao_cumulativos.sql`
   - `20261022050000_referencias_de_fornecedores.sql`
   - `20261022060000_termos_de_aceitacao_pintor.sql`
   - `20261022070000_convite_direto_do_cliente.sql`
   - `20261023010000_avaliacao_cancelamento.sql`
   - `20261023020000_resposta_avaliacao_fornecedor.sql`
   - `20261023030000_papel_vendedor.sql`
   - `20261023031000_levantamento_por_vendedor.sql`
   - `20261023040000_levantamento_avisos_e_expiracao.sql`

   **Antes de confirmar sem NIFs duplicados**, correr primeiro:
   `select nif, count(*) from organizations where kind='fornecedor' and nif is not null group by nif having count(*)>1;`
   Depois aplicar as 10 por ordem, correr `mcp__Supabase__get_advisors` (zero avisos novos de segurança, os de
   desempenho são esperados — SECURITY DEFINER e índices em tabelas ainda vazias), e **regenerar
   `src/lib/database.types.ts`** (`generate_typescript_types`) — hoje é **mantido à mão**, campo a campo, desde
   que a ligação falhou; já se encontrou e corrigiu nesta sessão um erro numa dessas edições manuais
   (`survey_terms_acceptances.user_id` marcado como opcional no tipo `Insert` sem ter valor por omissão na base
   de dados — teria deixado passar no `tsc` um `insert` que falharia sempre em produção real).
   **Para resolver:** confirmar a ligação em claude.ai → Connectors → Supabase e voltar a autorizar.

2. **Moloni sem ambiente de demonstração** — pedido enviado, sem resposta confirmada (ver histórico em
   `docs/FATURACAO.md`). Não emitir nenhum documento fiscal real até isto se confirmar: a conta não tem sandbox,
   um documento emitido é real e não se apaga (só se anula com nota de crédito).

3. **Stripe em modo de teste** — falta ativar a conta em modo real (dados da empresa) antes de qualquer
   pagamento real.

4. **`RESEND_API_KEY` em falta na Vercel** — os avisos de negócio da própria app (não os do Supabase Auth, já a
   funcionar) ainda não saem. Ver secção 5.15.

5. **`CRON_SECRET` em falta na Vercel** — necessário para `/api/cron/devolucoes` e `/api/cron/contabilidade`.

6. **Chave secreta do Supabase (`SUPABASE_SECRET_KEY`)** — confirmar em `/app/backoffice` → "Estado do servidor"
   que está colada; sem ela o webhook do Stripe falha.

---

## 7. Decisões e questões em aberto para o promotor (lista consolidada, substitui listas antigas e dispersas)

| Tema | Pergunta | Proposta em vigor, se nenhuma decisão nova |
| --- | --- | --- |
| Parecer jurídico (19/10/2026) | Nova ordem da apresentação, mínimo da caução, contrato cliente-plataforma, conservação, não evasão, transparência — ver `docs/advogado/Parecer_2026-10-19.md` | Percurso v2 já aplicado; o resto aguarda |
| Parecer jurídico, ronda 2 | Ver `docs/advogado/Pedido_ronda2_2026-10-21.md` | — |
| Advogado | Enviar `docs/advogado/Pedido_minuta_contrato.docx` com o contacto preenchido | Minuta gerada sem revisão jurídica |
| Email transacional | Confirmar Resend como definitivo para os avisos de negócio (`RESEND_API_KEY`) | Resend já escolhido, falta só a chave |
| Certificado de assinatura não confirmado | Hoje aceite e marcado "por confirmar" para a equipa — recusar logo? | Aceite, marcado |
| Pintores sem documentos aprovados | Hoje podem propor, com aviso no comparador — só deixar propor verificados? | Podem propor |
| "Percentagem dos 57%" | Não usada por falta de fonte; entra no texto se houver estudo | Fora do texto |
| Identidades no PDF assinado | O PDF não tem nomes, por causa do anonimato — confirmar que está bem assim | Sem nomes |
| **Algoritmo de fee dinâmico (ponto 1, 18-23%)** | Decidir os pesos finais (hoje "propostas para teste" no documento), desenhar os ecrãs de C/E/F/M/J, decidir o indicador S, decidir como compõe com os códigos de adesão | Motor pronto, não ligado (secção 5.8) |
| **Percentagem do levantamento por vendedor** | `SURVEY_SHARE_BP_PROVISIONAL` (10%) é um valor meu, provisório — confirmar antes de qualquer pagamento real | 10% (secção 5.3) |
| Contabilista | Validar o desenho completo (`docs/CONTABILIDADE.md`), o momento da fatura, a natureza fiscal da caução retida, retenção na fonte aos fornecedores, CAE | Desenho aplicado sem validação formal |
| Registo da marca | Pesquisa INPI/EUIPO do nome "Quem Pinta" | Por fazer |
| Piloto | Convidar 5-10 pintores e 2-3 fornecedores de Viana do Castelo para testar antes dos clientes | Por fazer |
| `PERMITIR_ACEITACAO_SIMPLES` | Apagar da Vercel antes de abrir a utilizadores reais (só serve para testar sem CMD) | Ligada |

---

## 8. Como trabalhar no código

```bash
npm install
npm run dev        # http://localhost:3000 (sem credenciais reais do Supabase nesta sessão — ver nota abaixo)
npm test           # regras de negócio + RLS em Postgres de memória (PGlite)
npm run typecheck
npm run lint
npm run build
```

- **Branch de trabalho:** `claude/sweet-brahmagupta-xd1vp7`, repositório `nunomarujo/paintit`.
- **Antes de declarar qualquer coisa feita** (regra do `CLAUDE.md`): os quatro comandos acima correm com código de
  saída 0 — nunca concluir "verde" a partir de texto filtrado do output — e `git status --porcelain` fica vazio
  depois de enviado para o repositório remoto.
- **Dinheiro sempre em cêntimos inteiros** (`src/domain/money.ts`); percentagens em pontos-base.
- **Regras de negócio só em `src/domain/`**, funções puras e testadas; interface e base de dados chamam-nas,
  nunca as reimplementam.
- **Parâmetros comerciais versionados** (`src/domain/rules.ts`, secção 3.2) — mudar um valor cria uma versão nova,
  nunca muda contratações já iniciadas.
- **Migrações:** nome igual à versão aplicada no Supabase; testadas primeiro em `supabase/tests/rls.test.ts`;
  uma tabela nova traz sempre políticas RLS e testes no mesmo commit; `drop` e operações destrutivas pedem
  confirmação manual — preferir sempre migrações aditivas.
- **`ALTER POLICY` substitui a cláusula inteira**, nunca soma à anterior — antes de alterar uma política, grep a
  todas as migrações anteriores para saber a condição REAL de hoje, não a original.
- **Funções SECURITY DEFINER chamadas diretamente de dentro de uma política RLS** precisam de `grant execute ...
  to authenticated` explícito, mesmo sendo definer; chamadas só entre funções não precisam.
- **Esta sessão não tem credenciais reais do Supabase em `npm run dev`** — páginas novas só se confirmam por
  tsc/lint/testes/build, nunca visualmente, até a ligação ao Supabase voltar a funcionar (secção 6).

---

## 9. Mapa do código e da documentação

### 9.1 `src/domain/` — regras de negócio puras (um ficheiro = uma área; `.test.ts` ao lado de cada um)

| Ficheiro | O que decide |
| --- | --- |
| `money.ts` | Cêntimos inteiros, arredondamentos, percentagens |
| `rules.ts` | Parâmetros comerciais versionados (secção 3.2) |
| `engagement.ts` | O percurso de contratação inteiro: acontecimentos → estado (secção 3) |
| `contracting.ts` | Camada acima de `engagement.ts`: ações disponíveis, textos, categorias de avaliação |
| `organization.ts` | Tipos de entidade, papéis, documentos exigidos (secção 2) |
| `request.ts` | Pedido de orçamento, superfícies |
| `proposal.ts` / `works.ts` / `templates.ts` / `equivalence.ts` | Orçamento guiado do pintor (secção 5.4) |
| `referral.ts` / `referralEligibility.ts` | Os dois programas de referência (secção 5.6) |
| `fee.ts` | Algoritmo de fee dinâmico, "ponto 1" — construído, não ligado (secção 5.8) |
| `commission.ts` | Comissão do pintor com descontos aplicados |
| `survey.ts` | Levantamento por vendedor (secção 5.3) |
| `painterTerms.ts` / `surveyTerms.ts` | Versões dos termos de aceitação (pintor / vendedor) |
| `review.ts` | Avaliações, motivos pré-aprovados de rejeição |
| `strikes.ts` | Anti-contorno (secção 5.12) |
| `catalog.ts` | Catálogo de referência, consumo, `materialCheck` |
| `signature.ts` | Verificações estruturais do PDF assinado (a criptografia está em `src/lib/pades.ts`) |
| `notifications.ts` | Textos dos avisos dentro da app, sem nunca revelar a outra parte antes da hora |
| `accounting/` | Partidas dobradas, plano de contas, reconciliação (secção 5.14) |
| `invoicing.ts` | O que falta faturar (Moloni) |
| `nif.ts`, `address.ts`, `fileSignature.ts`, `photo.ts` | Validações de baixo nível reutilizadas em todo o lado |

### 9.2 `src/app/app/` — rotas da área autenticada

`page.tsx` (Início), `perfil` (dados pessoais, nunca de entidade), `organizacoes/[id]` (ficha da entidade),
`pedidos` (pedidos do cliente), `oportunidades` (pedidos abertos, lado pintor), `contratacoes`, `catalogo`,
`encomendas` (lado fornecedor), `obras` (ferramentas do pintor depois de assinar), `levantamentos` (lado vendedor,
secção 5.3), `backoffice` (equipa da plataforma), `revisao`, `validacao`, `fichas`, `fotos`, `documentos`.

### 9.3 Os outros documentos em `docs/` — quando abrir cada um

| Ficheiro | Abrir quando |
| --- | --- |
| `DECISOES.md` | Precisar do **raciocínio completo** por trás de uma decisão específica já tomada (histórico cronológico, nunca resumido) |
| `MODELO.md` | Mexer em `src/domain/engagement.ts` — mas este documento (secção 3) já tem o essencial |
| `PROPOSTA.md` | Mexer no orçamento do pintor (`proposal.ts`, `ProposalForms.tsx`, `ProposalView.tsx`) |
| `CONTABILIDADE.md` | Mexer em `src/domain/accounting/` ou no separador Contabilidade do backoffice |
| `FATURACAO.md` | Mexer na integração Moloni (`src/lib/moloni.ts`, `src/domain/invoicing.ts`) |
| `PAGAMENTOS_E_ASSINATURA.md` | Mexer no Stripe ou na verificação de assinaturas (`src/lib/pades.ts`) |
| `DOMINIO.md` | Mexer em DNS, email ou alojamento |
| `ROADMAP.md` | Visão por fases do produto (histórica; este documento tem o estado atual mais completo) |
| `requisitos/Documento_Mestre_de_Requisitos_v0.3.txt` | Confirmar um requisito original (ex.: "SEG-05", "COM-05", "DIS-07") |
| Claude Docs "Questões jurídicas" (link em `DECISOES.md`) | Preparar algo para o advogado |

---

## 10. Linha do tempo resumida (datas, para orientação — razão completa em `docs/DECISOES.md`)

- **18/10/2026** — Fundações: domínio do dinheiro, site público. Comissão e caução a 3%. Stack decidida.
- **19/10/2026** — Percurso v2 (apresentação depois da comissão, antes das assinaturas), depois do parecer
  jurídico. Contratação, backoffice e fornecedores (catálogo, fichas técnicas) completos.
- **20/10/2026** — Marca "Quem Pinta"; domínio comprado; Stripe Connect escolhido; um perfil por conta; catálogo
  de referência; planos pagos dos fornecedores; avisos por email (Resend, Supabase Auth).
- **21/10/2026** — Orçamento guiado completo (4 fases); strikes anti-contorno; códigos de adesão; contabilidade
  (livro de movimentos, saldo e resgate); reconciliação Stripe; extrato bancário.
- **22/10/2026** — Faturação certificada (Moloni escolhida); backoffice reorganizado por secções; fundação do
  algoritmo de fee dinâmico (Q em produção, T construído e não ligado); referências de fornecedores (2.º
  programa); "traga o seu pintor"; termos de aceitação do pintor; OCSP; correções de uma passagem de
  `/code-review`.
- **23/10/2026** — Ficheiros confirmados pelos bytes (SEG-05); avisos de litígio e mensagens; avaliações e
  encomendas passam a avisar; fila de litígios no backoffice; **litígio com repartição**; **avaliação de obra
  cancelada**; **fornecedor responde a avaliações**; **levantamento da obra por um vendedor do fornecedor**
  (mecanismo completo, secção 5.3) e reorganização do workspace do fornecedor; **este documento**, reescrito do
  zero para ser completo e autossuficiente.
