# Ponto de situação — documento único e completo. Ler primeiro, do princípio ao fim, em cada sessão nova

Atualizado a 27/10/2026, à tarde (**as duas ferramentas do plano Pro construídas e aplicadas**:
seguimento automático dos orçamentos e cobrança do que está na rua, ambas por uma máquina de avisos
nova — domínio `toques.ts`, tabela `toques` e tarefa diária às 8h —, mais o **email de segunda-feira**
que as torna visíveis e que não se envia quando não há matéria; e o **aviso de documento em falta
passou a âmbar** por decisão do promotor, fechando a contradição da regra 13 — `docs/DECISOES.md`,
entradas de 27/10/2026). Estado anterior, 26/10/2026, à noite (**a entrega das propostas passou a ser simultânea**: o cliente só as
vê no fim do prazo, com a porta na regra de acesso da base e não no ecrã — até aqui via cada uma no
instante em que era submetida, o que expunha o preço de quem entregava primeiro; mais a janela de
esclarecimentos de 3 dias, o prolongamento do prazo só antes da entrega e a contagem sem revelar —
`docs/DECISOES.md`, entrada "A entrega das propostas é simultânea"). Estado anterior, 26/10/2026, ao fim da tarde (**barra lateral com largura ajustável**, pedido do promotor a
ver o ecrã largo: arrastar a borda direita da barra muda a sua largura, entre 180 e 420px, com o cursor a
mudar para "col-resize" ao passar por cima — `SidebarResizer.tsx`, novo. Só mexe na variável CSS
`--sidebar-w` diretamente no `<html>` a cada pixel arrastado, sem passar pelo React; `layout.tsx` lê-a em
`grid-template-columns` (`md:grid-cols-[var(--sidebar-w,235px)_minmax(0,1fr)]`, 235px continua a ser o
valor de sempre). A largura escolhida guarda-se no `localStorage` do navegador — conveniência do
aparelho, não dados de conta; se o `localStorage` falhar (privado, bloqueado), fica na largura de sempre
em vez de rebentar. `npm test`/`typecheck`/`lint`/`build` verdes, 842 testes.). Estado anterior, 26/10/2026,
à tarde (**migração do CAE aplicada à base real**, por outra sessão — confirmado
agora por consulta direta: `organizations.cae` e `cae_atividade` existem em produção, migração registada
pelo Supabase como `20261026145117` e o ficheiro já renomeado para bater; uma entrada anterior deste
ficheiro dava isto como "em aberto" — já não está.

**Navegação em telemóvel, duas voltas na mesma sessão** — a primeira não serviu, o promotor viu-a ao vivo
e pediu para refazer: a barra lateral (`AppNav.tsx`) corria todos os grupos numa só linha horizontal sem
fim à vista, sem títulos de grupo nem indicação de que havia mais — cortava a meio do ecrã ("Opor..." em
vez de "Oportunidades"). Uma primeira correção pôs a barra a abrir fechada por omissão dentro de um
`<details>` a mostrar só onde se estava, a lista completa por baixo do conteúdo ao tocar — o promotor
rejeitou-a ("que bosta", "já viste alguma app mobile com este aspeto?") e pediu explicitamente **um botão
no canto superior direito com um dropdown, a fechar sozinho ao escolher um destino**. É o que está agora:
`MobileNavMenu.tsx`, novo — um botão só (ícone de hambúrguer) ao lado da marca, que abre um painel `absolute`
a flutuar sobre o conteúdo (não o empurra), com toda a navegação agrupada e, por baixo, "O meu Perfil"/
"Plano e subscrição"/"Referências de fornecedores"/"Sair" — tudo o que antes vivia em dois sítios diferentes
(barra lateral + rodapé "Empresa e conta") passa a um só menu. Cada link fecha o painel ao ser escolhido
(`<details>` nativo não fecha sozinho num clique lá dentro — precisa de uma `ref` + `onClick`, única
concessão a JavaScript nisto). `AppNav.tsx` fica só para ecrã largo (`hidden md:block`); a lógica de "quem
está activo" e "como desenhar um grupo" é partilhada entre os dois (`useAppNavGroups`), para nunca
divergirem. `LocalTabs.tsx` (separadores de Orçamentos, Oportunidades, Obra pública, e os três novos da
ficha da entidade) tinha o mesmo scroll horizontal sem indicação — "Equipa online" ficava cortado a meio
na ficha da entidade — e passa a dar a volta (flex-wrap) em vez de scroll; isto não mudou entre as duas
voltas. **Avisos no Início**, mesmo pedido: a lista corrida (sem separação nenhuma entre um aviso e o
seguinte) passa a um cartão por aviso, com `first-letter:uppercase` de defesa (os textos guardados já
começam maiúsculos — isto é para o caso de algum não vir). `npm test`/`typecheck`/`lint`/`build` verdes,
842 testes — mas **ninguém da equipa viu ainda esta segunda volta ao vivo no telemóvel**: é o mesmo risco
da primeira, que também passava todas as verificações automáticas e ainda assim não serviu.). Estado
anterior, 26/10/2026, de madrugada
(**"O meu Perfil"**: cartão novo na barra lateral com o nome da
empresa, não o email, só para pintor/fornecedor; ficha da entidade reorganizada em três separadores —
Dados da entidade [cartão editável + palavra-passe + mudança de mail de acesso], Documentos, Equipa
online [agora com troca de papel entre colegas, via política de RLS nova `org_members_update`, e um
quadro do que cada papel pode fazer]; CAE da nif.pt aproveitado para um aviso âmbar não bloqueante de
elegibilidade para pintura/construção, nos Orçamentos e na ficha. **Resolvido a 26/10/2026, à tarde:** a migração
do CAE e da gestão de acesso ficou por aplicar nessa sessão (o classificador recusou
`apply_migration`) e foi aplicada agora à base real; o Supabase registou-a como
`20261026145117` e o ficheiro passou a ter esse nome. As colunas `organizations.cae` e
`cae_atividade` existem, a política `org_members_update` existe, e os avisos de segurança e
desempenho não mudaram — `docs/DECISOES.md`, entrada "'O meu Perfil': cartão na barra lateral..."). Estado anterior, 26/10/2026, ao fim da noite (**o mapa
de contratos públicos ganhou cabeçalho de busca** — caixa de procura com sugestões tiradas dos próprios
dados, filtro por tipo de entidade, filtro por concelho e quatro ordens; e **abre no distrito da sede da
empresa** em vez de abrir no país inteiro, deduzido do código postal pelo serviço dos CTT que a app já
usa nas moradas, com saída para todo o país — secção 6.14). Estado anterior, 26/10/2026, à noite
(**caderno de desenho do promotor adoptado como fonte do desenho**:
cores funcionais novas — `field, selected, attention, error`, etc. —, ícones trocados pelos do caderno,
barra lateral reconstruída a dois níveis por perfil [Empresa de pintura / Cliente / Fornecedor] com
rodapé "Empresa e conta", três páginas [Gestão de obra, Orçamentos, Obra pública] com separadores
locais novos [`LocalTabs.tsx`] em vez de filhos na barra, função de domínio nova `urgenciaPrazo`/
`fraseDePrazo` aplicada em Oportunidades; os quatro ecrãs do caderno não foram portados ao pixel, só
os seus princípios — `docs/DECISOES.md`, entrada "O caderno de desenho do promotor como fonte do
desenho". **Em aberto, a confirmar pelo promotor:** o caderno repõe "Obra pública" como destino visível
na barra, invertendo a decisão de 23/10/2026 que a tinha descido a filho). Estado anterior, 26/10/2026,
à tarde (**barra lateral com ícone por item** e **primeiro passo da paleta de
marca** — ink/creme/laranja, começando pela barra lateral e com o laranja só no crachá de avisos e no
ícone ativo; `docs/DECISOES.md`, entrada "Barra lateral: ícone por item..."). Estado anterior,
26/10/2026, de madrugada (**Gestão de obra refeita** segundo o protótipo do promotor,
**letra maior em todo o site** depois de uma auditoria por três agentes, **mapa de contratos públicos
carregado** com 15 anos e somado na base, e o **artigo `/obra-publica`** publicado — secção 6.13).
Estado anterior, 25/10/2026, fim do dia (**Mapa de Contratos Públicos** construído, e um número de venda
corrigido — secção 6.12). O dia 25/10 teve várias sessões seguidas (plano Pro no Stripe, portão do Pro,
orçamentos em separadores, Gestão de Obra renomeada e redesenhada com a sua primeira entrega, página de
preços sem percentagens de comissão): **o registo completo, por ordem e com o raciocínio, está em
`docs/DECISOES.md`, nas entradas de 25/10/2026** — este ficheiro ainda não as absorveu todas. Estado
anterior, 24/10/2026, mesma tarde (item 12 decidido e construído — recusar logo um certificado com
cadeia mesmo inválida, nunca por ter ficado indeterminada por falha de rede; verificação direta encontrou
duas migrações que a atualização anterior, da mesma manhã, tinha concluído erradamente estarem aplicadas —
uma delas é um bug real ao vivo desde 23/10/2026; bloqueios de escrita desta sessão com o SQL já pronto
para o promotor correr — secção 6.7). Estado anterior, 24/10/2026 de manhã (sessão de auditoria de UX/UI
com conta de cliente nova: causa raiz do bug crítico "Nova entidade nunca grava" encontrada e corrigida —
três migrações em falta aplicadas — e a questão de acesso a admin das auditorias anteriores esclarecida,
sem falha real; secção 6.6). Estado anterior a esse, 23/10/2026 (fim do
dia, sessão de verificação de acessos Vercel/Supabase, aplicação das migrações pendentes, verificação cruzada
com a sessão original antes de esta tomar a frente do projeto — secção 6.2 —, recuperação de duas migrações
aplicadas sem ficheiro, e desenho do pedido de esclarecimento ao vendedor — secção 6.5, ainda só base de
dados, sem UI).

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
   uma obrigação**. **Desde 23/10/2026 (revisão à tarde, depois de reler o documento-fonte), já não é preciso
   pedir**: ao criar o pedido em rascunho, o levantamento abre-se logo por omissão (gatilho
   `work_requests_create_survey`), com um aviso (`RequestSurveyCard.tsx`) com o texto exigido pelo promotor:
   **não acrescenta nenhum custo à obra**, e a responsabilidade pelos dados continua do cliente, como se os
   tivesse preenchido sozinho. Pode sempre desistir ("Prefiro preencher sozinho") e preencher à mesma. Antes
   desta revisão, era o cliente a ter de pedir — o documento-fonte sempre descreveu isto como automático; a
   versão por pedido foi um desvio, corrigido no mesmo dia (`docs/DECISOES.md`).
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
`20261023143532_papel_vendedor.sql` (o valor novo do enum `member_role` tem de estar numa migração à parte —
`alter type ... add value` não pode ser usado na mesma transação que o consome), `20261023143643_levantamento_
por_vendedor.sql` (esquema, RLS, RPCs), `20261023143658_levantamento_avisos_e_expiracao.sql` (aviso ao cliente,
extensão da manutenção diária) e `20261023170000_levantamento_automatico.sql` (abertura automática ao criar o
pedido, cancelamento ao publicar sem reserva — **escrita, testada em PGlite, ainda não aplicada à base real**,
ver secção 6); `src/lib/surveys.ts` (liga-se a `contratacoes/actions.ts` no momento em que a comissão é
confirmada); páginas em `src/app/app/pedidos/[id]/` (aviso ao cliente, `RequestSurveyCard.tsx`) e
`src/app/app/levantamentos/` (lista do vendedor, workspace por obra com termos, formulários de contacto e
conclusão). 9 casos em `supabase/tests/rls.test.ts` (reserva atómica, pré-visualização segura, morada real só
para quem reservou, avaliação com "primeira obra", aviso ao concluir, reserva vencida liberta-se e avisa,
abertura automática ao criar o pedido, cancelamento ao publicar sem reserva, reserva ativa não se cancela ao
publicar).

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
e "duplicar solução". Catálogo de 267 produtos de referência (CIN, Robbialac, Barbot, Dyrup, Titan/Titanlux,
Luxens, Bondex, Xylophene e outros; preços da Leroy Merlin PT, atualizado 23/10/2026) sugere produtos
nos campos certos; "ou equivalente" aguarda ligar (`NEXT_PUBLIC_EQUIVALENTE`, parecer jurídico). **Sinal de demãos
acima do esperado** (22/10/2026): nunca bloqueia, só avisa o cliente se as demãos declaradas excedem em mais de
uma as recomendadas pelo produto. O comparador do cliente é anónimo, lado a lado, com cobertura dos produtos E dos
trabalhos pedidos (mostra se cada proposta responde ao que foi pedido), sem avaliações do pintor visíveis com
menos de 3 obras avaliadas ("histórico insuficiente"). Métodos de trabalho (modelos próprios do pintor) para não
reescrever as mesmas condições em cada proposta. Detalhe de desenho: `docs/PROPOSTA.md`.

### 5.5 Fornecedores: catálogo, descontos, carteira de clientes, encomendas — Feito

O fornecedor sobe fichas técnicas (PDF), rendimento e preço de referência datado ao catálogo; liga produtos a
fichas de referência (aparece em "Onde comprar", por concelho). Entregas por concelho (convenção "sem linha, ou
vazio = todo o país", reutilizada no levantamento, 5.3). Pintor encomenda materiais com confirmação do
fornecedor; avalia o fornecedor depois (e agora o fornecedor também responde a essa avaliação — paridade com a
avaliação cliente↔pintor, 23/10/2026, secção 5.10). Dois planos pagos (Stripe Billing, modo de teste): listagem
de vendedores (39 €/mês+IVA) e catálogo de produtos completo (49 €/mês+IVA, inclui descontos). Sem plano de
catálogo ativo, não cria produtos nem descontos.

**Descontos (`/produtos`, secção "Descontos para pintores"), redesenhados a 23/10/2026:** cada regra combina um
eixo de **artigo** (todo o catálogo, um tipo, ou um ou vários artigos concretos escolhidos por checkbox — a
lista mostra o que cada um já tem assinalado, para compor várias linhas seguidas sem repetir cobertura) com um
eixo de **cliente** (todos os pintores, ou um específico — carteira de clientes do fornecedor) e condições de
compra (escalão de área, forma de pagamento, quantidade mínima, classificação do cliente). **Classificação do
cliente**, três valores: *primeira compra* e *cliente frequente* (3+ encomendas entregues) deduzem-se sozinhos
de `material_orders`; ***cliente premium* é uma classificação manual do fornecedor**, sem número automático —
só se define na ficha do cliente. Sem data de validade, um desconto fica em vigor até se alterar.

**Carteira de clientes (`/clientes`, novo 23/10/2026):** lista os pintores que já encomendaram a este fornecedor
(derivada de `material_orders`), com a classificação e um atalho para a **ficha de cada um**
(`/clientes/[painterOrgId]`): histórico de encomendas, "cliente premium" (checkbox), uma nota de condições
específicas em texto livre (visível aos dois lados da relação, só editável pelo fornecedor), e descontos só
para esse cliente — mesmo mecanismo da secção acima, só pré-escolhido. Nada disto precisou de RLS nova para
ver o nome do cliente: a política `organizations_select` já deixa um fornecedor ver quem lhe comprou
(`private.ordered_from_me`, migração de 19/10/2026) — só a tabela de classificação/nota
(`supplier_customers`) é mesmo nova.

**Convite de adesão a quem ainda não está na plataforma (novo, 23/10/2026):** enquanto a carteira estiver
vazia, `/clientes` mostra em vez da lista um formulário para o fornecedor preencher nome, email, telefone e
morada/localização de um pintor que já conhece, mais um campo opcional para um código promocional próprio (em
vez de um gerado ao acaso); explica também, ao lado do formulário, a vantagem para cada lado (carteira e
descontos para o fornecedor; adesão gratuita e desconto na comissão para o pintor). A plataforma envia-lhe um
convite por email — identificando quem convidou, não só a empresa — ligado por baixo a um código de adesão
normal (`referral_codes`) — aparece de imediato no seletor "fornecedores já ligados" do pintor assim que ele
aceitar. Aceita-se em `/convite-fornecedor/[código]` (gémeo de "traga o seu pintor", 5.7) ou logo no registo
de uma entidade de pintura nova. Detalhe completo em `docs/DECISOES.md` e secção 6.3.

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
  comissão do pintor, subscrição do fornecedor e caução retida), mas **nunca testado contra a API real**. A
  Moloni respondeu a 23/10/2026: não há sandbox a pedir — cria-se uma **conta de testes separada** pelo registo
  normal, com NIF fictício (30 dias, API completa). **Não emitir nenhum documento com a conta real até a
  integração estar confirmada nessa conta de testes.** Detalhe: `docs/FATURACAO.md`.
- **A comissão de adesão a fornecedores nunca passa pela Moloni** — é o fornecedor que fatura a plataforma (fluxo
  inverso, já feito, sem depender de nenhuma integração externa).

### 5.15 Domínio, email, alojamento — Feito

`quempinta.pt` ativo na Vercel (região `dub1`, Dublin — perto do Supabase em `eu-west-1`, decisão de 21/10/2026
por latência). Caixas `nm@`, `info@`, `suporte@quempinta.pt` (ImprovMX, entregues em `quempinta.pt@gmail.com`).
**Dois canais de email distintos, não confundir:**
1. **Emails do Supabase Auth** (confirmação de conta, magic link) — SMTP já configurado com Resend, **verificado
   e testado** (20/10/2026).
2. **Emails de negócio da própria app** (`src/lib/notify.ts`: proposta nova, prazos, litígio, avaliações,
   encomendas…) — enviados pela API do Resend diretamente do servidor da app, com a sua própria `RESEND_API_KEY`,
   **já colada nas variáveis da Vercel** (confirmado 23/10/2026 — ver secção 6.1; uma sessão anterior tinha
   reportado isto como em falta por engano).

---

## 6. Travões ativos agora (o que impede avançar, não é falta de código)

1. **Moloni: falta a conta de testes** — a Moloni respondeu a 23/10/2026 (ticket J98-JYQ-L177): registo normal em
   `moloni.pt/registo` com NIF fictício dá 30 dias de API completa, e é essa a "sandbox". Falta o promotor criar
   essa conta e passar as credenciais dela (nunca as da conta real) para se testar fora da produção. Até lá, não
   emitir nenhum documento com a conta real: é real e não se apaga (só se anula com nota de crédito).

2. **Stripe em modo de teste** — falta ativar a conta em modo real (dados da empresa) antes de qualquer
   pagamento real.

3. **Migrações — `levantamento_automatico` aplicada a 24/10/2026, à tarde, a pedido direto do promotor**
   ("tenta aplicar a migração do levantamento automático"). Esta sessão não teve o bloqueio "Production
   Deploy" que travou a sessão anterior (ver histórico abaixo) — correu sem pedir confirmação extra.

   Estas quatro **estão todas aplicadas**, confirmado por SQL direto, e com o **ficheiro local já renomeado
   para a versão realmente registada no Supabase** (regra do `CLAUDE.md`, "nome igual à versão registada" —
   corrigido de vez, nunca o inverso, ver `docs/DECISOES.md`, 24/10/2026):
   - `20261024010647_pedido_esclarecimento_ao_vendedor.sql` — aplicada. Ainda sem caminho de UI (ver 6.5).
   - `20261024010704_avaliacao_informacao_pelo_pintor.sql` — aplicada. Ainda sem caminho de UI (ver 6.5).
   - `20261024010721_bonus_adesao_avaliador.sql` — aplicada. `claim_supplier_invite` já concede créditos e
     `organizations.alertas_autorizados` existe na base real — era a causa raiz do bug crítico "Nova
     entidade" nunca gravava (duas auditorias de UX independentes, commit `d09ee3e`): o código em produção já
     escrevia esta coluna antes de ela existir na base real, com todo o insere a falhar com `PGRST204`,
     escondido atrás da mensagem genérica.
   - `20261024015834_levantamento_automatico.sql` — aplicada agora. Resolve o bug ao vivo desde 23/10/2026
     (nenhum pedido novo recebia levantamento nenhum, nem automático nem por pedido manual, porque o botão
     de pedido já tinha sido removido do código a pressupor o gatilho que ainda não existia na base real).
   - `get_advisors` sem categorias novas de aviso. `npm test` (464), `typecheck`, `lint`, `build` — zero.

   **As outras quatro foram aplicadas a 24/10/2026, de madrugada, por ordem direta do promotor** ("a ordem
   neste momento é aplica as 4 escritas que referes estarem por aplicar"). Desta vez o classificador não
   recusou, ao contrário das tentativas anteriores. **Não sobra nenhuma migração por aplicar.** Todas
   confirmadas por SQL direto, não pelo "success" devolvido (ver 6.11):
   - `20261024034052_revoke_delete_clientes_fornecedor.sql` — `has_table_privilege` para DELETE em
     `supplier_customers` passou a `false`.
   - `20261024034105_pintor_ve_levantamento.sql` — a política já contém `is_painter`, e com a identidade de
     um pintor e RLS a valer o levantamento concluído passou a ser visível (era invisível).
   - `20261024034129_adendas_ao_dossie_e_avisos.sql` — `survey_addenda` existe e devolve a ronda com as
     duas dúvidas da simulação; `respond_clarification` já avisa quem perguntou e o cliente.
   - `20261024034142_obras_pretendidas_no_predio.sql` — as duas colunas existem, gravam valores válidos, e
     a restrição recusa um valor inventado.
   - `get_advisors` sem categorias novas de aviso. `npm test` (484), `typecheck`, `lint`, `build` — zero.

4. **`PERMITIR_ACEITACAO_SIMPLES`, confirmado na Vercel (24/10/2026)**: existe, tipo `sensitive`, só no
   ambiente **Production** (não está em Preview nem Development — o inverso do que fazia sentido para uma
   variável só de teste). Por ser `sensitive`, a Vercel nunca devolve o valor gravado a ninguém depois de
   criado, nem pela API nem pela interface — impossível confirmar se está "1" ou vazio sem o reescrever. Ver
   6.7 para a tentativa (bloqueada) de o neutralizar.

Travões de escrita nesta sessão (ver 6.7): aplicar as duas migrações em falta e tocar nesta variável da
Vercel foram ambos recusados pelo classificador automático desta sessão — precisam de ser feitos
diretamente pelo promotor, ou com o modo automático desligado. Nenhum outro travão ativo neste momento (a
ligação MCP ao Supabase está resolvida) — ver também a correção abaixo sobre a Vercel e o Supabase.

### 6.1 Resolvido nesta sessão (23/10/2026, sessão de verificação de acessos)

- **Ligação MCP ao Supabase e à Vercel**: ambas voltaram a funcionar nesta sessão (o projeto Supabase "Paint it"
  tinha sido transferido de organização, `mar-nordico` → `eehwjlguffmcpaudqspy`, pelo promotor com apoio de outra
  sessão; a autorização da equipa Vercel `quempintapt-8835` foi corrigida à mão no navegador). **As 10 migrações
  que estavam pendentes (lista antiga desta secção) foram todas aplicadas com sucesso**, por esta ordem, depois de
  confirmar que não há NIFs de fornecedor duplicados: `nif_unico_fornecedores`, `codigos_de_adesao_cumulativos`,
  `referencias_de_fornecedores`, `termos_de_aceitacao_pintor`, `convite_direto_do_cliente`,
  `avaliacao_cancelamento`, `resposta_avaliacao_fornecedor`, `papel_vendedor`, `levantamento_por_vendedor`,
  `levantamento_avisos_e_expiracao`.
  - **Importante para quem ler o histórico de migrações:** a transferência de organização tinha desincronizado a
    tabela `supabase_migrations.schema_migrations` da base real — 20 migrações (18/10 a 20/10, mais as duas
    primeiras de 22/10) já lá estavam aplicadas mas desapareceram da tabela de histórico; foram reconciliadas sem
    voltar a correr o SQL (só um `insert ... on conflict do nothing` na própria tabela de histórico). As 10
    genuinamente pendentes foram então aplicadas via `apply_migration`, que lhes atribuiu **novos números de
    versão** (ex.: `20261023143306`, não `20261022030000`) em vez de reaproveitar os números dos ficheiros locais.
    Os ficheiros em `supabase/migrations/` foram **renomeados para os números realmente registados no Supabase**
    (regra do `CLAUDE.md`: "nome igual à versão registada"), e as referências a esses nomes em
    `docs/DECISOES.md`, `src/lib/qrcode.ts` e `src/domain/rules.ts` foram atualizadas a par.
  - `mcp__Supabase__get_advisors` depois de aplicar: **zero avisos novos** de segurança; os avisos de desempenho
    existentes já estavam documentados em `docs/DECISOES.md` (duas políticas permissivas em `org_members`/
    `profiles`) e são esperados (SECURITY DEFINER, índices em tabelas ainda vazias).
  - `src/lib/database.types.ts` **comparado campo a campo** com o gerado agora pelo Supabase
    (`generate_typescript_types`): tabelas, colunas, funções e views coincidem todos; só faltavam dois enums no
    dicionário `Enums` (`order_status`, `worksite_entry_kind` — já usados nos tipos de coluna, mas não listados),
    corrigido.
  - `npm test`, `npm run typecheck`, `npm run lint`, `npm run build` — os quatro com código de saída 0 depois de
    todas estas alterações.

- **Variáveis de ambiente na Vercel — a secção 5.15/travões anteriores estava errada**: `RESEND_API_KEY`,
  `CRON_SECRET` e `SUPABASE_SECRET_KEY` **já estão todas coladas** no projeto Vercel. O que a sessão anterior
  reportou como "em falta" era um falso negativo de uma leitura com a equipa sem autorização — confirmado agora
  com `filter_project_envs` depois de corrigir a autorização.

- **As duas migrações da carteira de clientes, construídas em paralelo nesta mesma sessão sem saber ainda da
  reconciliação acima, foram aplicadas logo a seguir**, pela mesma via (`list_migrations` voltou a funcionar):
  `clientes_do_fornecedor` (versão real `20261023152645`) e `desconto_cliente_premium` (`20261023153053`) —
  ficheiros locais renomeados a par. `get_advisors`: zero avisos novos. `database.types.ts` confirmado campo a
  campo outra vez: a tabela `supplier_customers` gerada bate certo com a já escrita à mão; `perfil` continua
  `string` no gerador (é `check`, não `enum`, o próprio Supabase nunca lhe dá tipo literal) — o `'cliente_premium'`
  acrescentado ao tipo à mão é um reforço deliberado, não um erro a corrigir. **Dois erros de manutenção manual
  apanhados só pelos testes novos desta sessão, antes desta aplicação** (nenhum dos dois existia nas tabelas já
  reconciliadas acima): `survey_terms_acceptances.user_id` marcado como opcional no tipo `Insert` sem ter valor
  por omissão na base de dados; e um `check` em SQL (`supplier_discounts.perfil`) nunca alargado quando
  `'cliente_premium'` entrou só no TypeScript — `tsc`/lint/build não apanham nenhum dos dois, só um teste a
  inserir a sério.

### 6.2 Verificação cruzada entre as duas sessões em paralelo (23/10/2026, mesma tarde)

O promotor pediu uma ronda de perguntas e dúvidas entre esta sessão e a sessão original (`<>code`) antes de esta
tomar a frente do projeto, avisando explicitamente que a outra sessão já tinha sido apanhada a alucinar e a
esquecer decisões já tomadas. A outra sessão reportou 5 pontos de crash sem proteção e duas verificações ainda não
confirmadas ao vivo (lógica nova de `daily_maintenance()` antes do disparo das 05:00 UTC, e RLS de
`request_surveys`/`supplier_customers`). Tudo foi corrigido e/ou confirmado diretamente — nada do que a outra
sessão reportou era alucinação:

- **Os mesmos 5 pontos de crash** que já tinham sido corrigidos em `pendingEngagements` (secção 10, 23/10/2026)
  faltavam em mais 5 sítios que também chamam `loadReplay` por linha: Início (`src/app/app/page.tsx`),
  Contratações (`src/app/app/contratacoes/page.tsx`), dossiê do pedido (`src/app/app/pedidos/[id]/dossie/page.tsx`),
  conciliação do backoffice (`src/app/app/backoffice/contabilidade/contratacoes/page.tsx` e o seu export CSV) e a
  fila de faturação (`src/lib/invoicing.ts`). Todos isolam agora a linha malformada com try/catch, pelo mesmo
  padrão. `test`/`typecheck`/`lint`/`build` com saída 0; comentado onde a seguir este mesmo mecanismo.
- **`daily_maintenance()` (bloco novo de libertar reservas vencidas) e `notify_survey_status`** verificados ao
  vivo na base real com utilizadores `zz-test-*` (padrão do `CLAUDE.md`, bloco `do $$ … raise exception … $$`):
  reserva vencida liberta-se por completo, reserva ainda ativa não é tocada, levantamento já concluído é excluído
  pelo estado (não pelo prazo), e o aviso ao cliente sai com o texto e a hiperligação certos. Confirmado por
  consulta a seguir que não ficou nenhuma linha `zz-test` gravada.
- **RLS de `request_surveys` verificado ao vivo** (23 asserções, 0 falhas): pedido de levantamento só por quem tem
  acesso ao pedido; pré-visualização e reserva atómica respeitam a zona de cobertura; só quem reservou vê a morada
  real, e deixa de a ver depois de concluído (a janela de anonimato fecha-se mesmo); grant de coluna bloqueia
  escrita direta em `vendedor_org_id`; avaliação só pelo cliente, sobre levantamento concluído.
- **RLS de `supplier_customers` verificado ao vivo** (12 asserções, 0 falhas): insert exige ser gestor da própria
  entidade *e* ela ser fornecedora; select visível aos dois lados da relação, invisível a terceiros; update só
  pelo lado fornecedor; **DELETE confirmado bloqueado** mesmo com o grant de tabela presente (RLS sem política
  para esse comando nega por omissão) — mas faltava a revogação explícita do grant, que o resto do código sempre
  acrescenta como segunda camada (`material_orders`, `products`, `reviews`, `bank_imports`/`bank_lines`,
  `supplier_reviews` — todos com `revoke delete ... from authenticated`). Escrita a migração
  `20261024034052_revoke_delete_clientes_fornecedor.sql`, mas **ainda não aplicada à Supabase**: o modo automático
  bloqueou a aplicação direta ("Production Deploy" pede aprovação explícita do promotor). **Fica pendente —
  qualquer sessão que leia isto antes de a aplicar: confirmar com o promotor primeiro, o ficheiro no repositório
  não significa que já está em vigor na base real.**

### 6.3 Convite de adesão enviado pelo fornecedor (23/10/2026, logo a seguir à verificação cruzada acima)

Pedido do promotor a partir do separador `/clientes` vazio: o fornecedor passa a poder preencher nome e email de
um pintor que já conhece e enviar-lhe um convite por email, em vez de depender de ele descobrir por fora um
código de adesão já existente. Descrito em detalhe em `docs/DECISOES.md` (23/10/2026, "convite de adesão enviado
pelo fornecedor"). Resumo do que mudou e já está em produção:

- Migração nova `convite_de_adesao_do_fornecedor` (tabela `supplier_painter_invites`; funções
  `claim_supplier_invite` e `supplier_invite_info`), aplicada com sucesso — **versão real `20261023161107`**,
  ficheiro local já renomeado a par. `get_advisors` sem categorias novas de aviso. `database.types.ts`
  confirmado campo a campo contra o gerado pelo Supabase (única diferença deliberada: a relação
  `supplier_painter_invites → organizations` por `org_id` não está listada em `Relationships`, só a de
  `referral_code_id`, porque é a única usada por um embed no código — mesmo critério já seguido em
  `supplier_referral_invites`).
- Reaproveita por inteiro `referral_codes`; não é um segundo mecanismo de convites. `claim_supplier_invite` é
  nova (não reutiliza `apply_referral_code`, que está presa a uma proposta em rascunho), mas com a mesma
  validação de sempre.
- `supabase/tests/rls.test.ts` ganhou um bloco novo (+4 casos). `npm test` (438), `typecheck`, `lint`, `build` —
  os quatro com saída 0 depois desta migração.
- Esta secção 6.3 não altera nem resolve o ponto pendente da secção 6.2 acima
  (`revoke_delete_clientes_fornecedor`, ainda à espera de aprovação explícita do promotor) — são migrações
  independentes, sobre tabelas diferentes.
- **Afinado logo a seguir, mesmo pedido em duas voltas**: telefone e morada passam a obrigatórios (migração
  `convite_contactos_do_pintor`, versão real `20261023171829`); código promocional opcional no formulário, em
  vez de sempre gerado ao acaso; identificação de quem convidou (`profiles.nome`) no email; email e página de
  aceitação redesenhados para serem apelativos e apontar para "Como funciona" e perguntas frequentes
  (`notify.ts` ganhou a capacidade de pôr ligações secundárias nos emails). Detalhe completo em
  `docs/DECISOES.md`, entrada seguinte à do parágrafo anterior.

### 6.4 Seletor de concelhos por distrito (23/10/2026)

Os dois campos "concelho" do site (entrega em obra, `/produtos`; zona de cobertura do levantamento,
`/levantamentos`) eram texto livre "separados por vírgulas"; passaram a um seletor com um grupo por distrito
que se abre com um "+" (`src/components/ConcelhosPicker.tsx`, dados em `src/lib/concelhos.ts`). Os 308
concelhos vieram do próprio repositório open-source do geoapi.pt (não de memória), para garantir que batem
certo, carácter a carácter, com o que `buildings.concelho` já guarda. Só a camada de formulário mudou — sem
migração, sem alteração ao domínio. Verificado visualmente com Playwright (abre/fecha, contagem por
distrito). Detalhe completo em `docs/DECISOES.md`.

### 6.9 Ecrãs das três funcionalidades, gestora de condomínios e simulação de dados (24/10/2026, madrugada)

Detalhe completo em `docs/DECISOES.md`, entrada "24/10/2026, madrugada". O essencial, porque **corrige
o que as secções 6.5 e 7 diziam**:

- **As três funcionalidades não estavam só "sem UI"**: o pintor **não tinha leitura nenhuma** sobre
  `request_surveys` (confirmado nas políticas da base real). As funções dele são `security definer` e
  por isso funcionavam sem leitura — os testes passavam, mas nenhum ecrã as podia oferecer. Migração
  `20261024034105_pintor_ve_levantamento.sql`, +2 casos de RLS, **por aplicar** (DDL recusado nesta
  sessão, ver 6.7; escritas de dados passam).
- **Ecrãs construídos**: vendedor em `/app/levantamentos/{id}` (lista conjunta, marco 1, marco 2,
  estados) — **funciona já**; pintor em `/app/oportunidades/{id}` (pedir esclarecimento, ver resposta,
  avaliar 1-5) — só mostra conteúdo depois daquela migração.
- **`src/lib/database.types.ts`**: faltavam as seis funções destas migrações — nunca tinham sido
  chamadas pela app. Acrescentadas e confirmadas contra o gerado pelo Supabase.
- **Gestora de condomínios**: "Prédios sob administração" em cartões (NIPC, morada, prédios, frações);
  `/app/organizacoes/{gestora}/pedidos/novo` deixou de dar 404 e é o ecrã de escolha do condomínio,
  com "criar novo condomínio"; condomínio novo segue direto para a ficha do prédio. **Quem assina e é
  faturado continua a ser o condomínio, nunca a gestora** — decisão mantida.
- **Formulários**: erro de validação deixou de ser mudo (`useFormAction` salta para o primeiro campo
  com erro; `OrgForm` avisa junto ao botão). Era a causa do "não grava, não dá erro" reportado.
- **Dados de simulação na base real**, todos prefixados `SIMULACAO` (a limpar antes de produção, ver
  5.14): levantamento concluído na obra `9C480B95`, esclarecimento aberto com duas dúvidas, uma
  avaliação (média 3,0), uma gestora com dois condomínios (NIPC próprio e prédio com frações), e um
  crédito de bónus de adesão **concedido pela função real** `claim_supplier_invite` — primeira vez que
  esse caminho correu. Obrigou a ligar `alertas_autorizados` no fornecedor de teste (é condição do
  bónus).
- **Contas para testar** (todas do promotor, entrada por link mágico, sem palavra-passe):
  `nm+cliente1@` (condomínio), `nm+pintor1@` (Pintor Teste Lda), `nm+teste_fornecedor@` (Exotictarget,
  fornecedor/avaliador), `info@` (agora dona da gestora de simulação). Os reencaminhamentos `nm+*` e
  `info@` chegam a `quempinta.pt@gmail.com`.
- **Falta um clique do promotor** para ver o ecrã do esclarecimento: os termos de confidencialidade do
  levantamento, por aceitar na conta do fornecedor. Não os aceitei em nome dele de propósito.

### 6.5 Pedido de esclarecimento ao vendedor sobre o levantamento (23/10/2026) — base de dados feita; UI construída a 24/10 (ver 6.9)

Depois de o levantamento estar concluído, qualquer pintor com acesso ao pedido publicado pode achar a
informação insuficiente para orçamentar e pedir o que falta. Desenhado em detalhe (e com duas correções
explícitas do promotor a propostas minhas anteriores) em `docs/DECISOES.md`, entrada "pedido de esclarecimento
ao vendedor sobre o levantamento". Resumo do que está feito e do que falta:

- **Feito e testado**: `src/domain/clarification.ts`; migração
  `20261023190000_pedido_esclarecimento_ao_vendedor.sql` (tabelas `survey_clarifications`/
  `survey_clarification_items`; funções `request_painter_doubt`, `clarification_batch`, `confirm_clarification`,
  `respond_clarification`, `claim_clarification`; quinto bloco de `daily_maintenance()` para a escalada). Lista
  conjunta e não identificada para o vendedor; prazo em dois marcos fixos (24h+24h) sem perda parcial; ao
  falhar, o vendedor perde a comissão de toda a obra por completo e fica impedido de voltar a reservar este
  esclarecimento — qualquer outro fornecedor da zona que ainda não tenha falhado pode reservar a tentativa
  seguinte (primeiro a chegar, avança), herdando nesse momento `request_surveys.vendedor_org_id` (e por isso a
  comissão de todo o levantamento, não só do esclarecimento). `supabase/tests/rls.test.ts` ganhou um bloco novo
  (+4 casos, incluindo uma escalada completa de ponta a ponta). `npm test` (447), `typecheck`, `lint`, `build`
  — os quatro com saída 0.
- **Não aplicada à Supabase** (ver travão 3 acima) e **sem nenhuma peça de UI**: falta o formulário do pintor
  para pedir, o ecrã do vendedor para ver a lista conjunta e confirmar/responder, e o aviso ao cliente quando
  escala. Não publicar sem a migração aplicada a par, pelo mesmo motivo da `levantamento_automatico`.
- **Fórmula dinâmica (40/30/15/15) construída e ligada**, depois **a base de cálculo mudada para % do
  valor adjudicado** (23/10/2026, mesmo dia, duas sessões seguintes — proposta minha, pedida simples,
  aprovada pelo promotor, depois ajustada com números concretos dele): `surveyorShareBp`/
  `surveyorPayoutAmount` (`src/domain/survey.ts`) — banda **1%-2,7% do valor adjudicado** (`base`, sem IVA),
  nunca da comissão da plataforma, mas o pagamento nunca excede a comissão líquida de facto recebida
  (`platformFeeNet`) — teto que absorve, sem complicar a fórmula, a preocupação do promotor sobre canais de
  comissão baixa (ex. "traga o seu pintor", 9%). Nova migração `20261023200000_avaliacao_informacao_pelo_
  pintor.sql` (`survey_info_reviews`, `rate_survey_info` — a nota do pintor sobre a informação, que
  faltava); `settleSurveyPayout` (`src/lib/surveys.ts`) já lê os quatro componentes do avaliador atualmente
  entitulado e calcula o pagamento real, em vez do antigo 10% fixo da comissão. `npm test` (453), os quatro
  com saída 0. ~~Ainda sem UI~~ — **os dois ecrãs existem desde 24/10** e foram confirmados a 27/10:
  `oportunidades/[id]/SurveyInfoCard.tsx` (o pintor dá a nota, por `rateSurveyInfo` → `rate_survey_info`) e
  `levantamentos/[surveyId]/EarningCard.tsx` (o avaliador vê a sua fração, o que a compõe e a tradução em
  euros). Esta frase ficou desactualizada três dias e levou-me a anunciar como em falta trabalho que já
  estava feito. Detalhe completo em `docs/DECISOES.md`.
- **Nomenclatura**: o promotor passou a chamar **"avaliador"** a este papel no texto visível ao utilizador
  (23/10/2026) — "o papel que a pessoa faz é avaliar a obra, não vender tintas". Mudado: rótulo e descrição
  do papel (`MEMBER_ROLE_LABELS`, `roleDescription`), texto da página `/app/levantamentos`, comentários nos
  ficheiros de domínio relevantes. **Não mudado** (decisão de âmbito, à parte do pedido do promotor): os
  nomes internos — colunas `vendedor_org_id`/`vendedor_user_id`, o valor `'vendedor'` do enum `member_role`
  (já aplicado em produção, usado em muitas políticas RLS), nomes de funções/tabelas (`reserve_survey`,
  `survey_vendor_rating`, etc.). Uma mudança de nome a esse nível é maior e fica para decisão separada, só
  se o promotor a pedir. Não confundir com "vendedores"/"catálogo" (`src/domain/subscription.ts`,
  `src/app/app/catalogo/referencia/[id]/page.tsx`) — conceito diferente e anterior, o fornecedor que vende
  produtos de pintura no catálogo.
- **NIPC — esclarecido, nada a construir**: é o mesmo número que o NIF para pessoas coletivas (não há dois
  sistemas de numeração em Portugal); o bloqueio por NIF (`src/lib/strikes.ts`, `blocked_identifiers`) já
  cobre o NIPC. Fica só em aberto, por decidir, se o promotor quer também bloqueio por **nome** de empresa
  ou pessoa (mais arriscado por falsos positivos — nomes de empresa parecidos ou coincidentes) — ver secção 7.

### 6.6 Causa raiz do bug "Nova entidade nunca grava" encontrada e corrigida (24/10/2026, sessão de auditoria)

Duas auditorias de UX/UI independentes (23/10 e 24/10/2026), cada uma com uma conta de cliente nova,
reportaram o mesmo: o formulário "Nova entidade" falhava sempre a gravar, com qualquer combinação de
dados (tipo "Condomínio" ou "Particular", com ou sem NIF/morada/código postal). O commit `d09ee3e` (23/10,
tarde) só tinha trocado a mensagem genérica por uma mais específica quando o erro é `P0001` — mas a causa
real não é `P0001`, por isso continuava invisível.

**Causa real**, encontrada pela resposta do servidor interceptada no browser (`response.headers.proxy_status:
PostgREST; error=PGRST204`) e confirmada por SQL direto em produção: `orgColumns()`
(`src/app/app/actions.ts`) já escrevia a coluna `organizations.alertas_autorizados` desde o commit que
implementou o bónus de adesão do avaliador (secção 7) — mas a migração que cria essa coluna,
`20261023210000_bonus_adesao_avaliador.sql`, nunca tinha chegado à base de dados real (projeto Supabase
`phkfrabrjqbpnmocrrvj`), tal como outras duas migrações a seguir a ela
(`20261023190000_pedido_esclarecimento_ao_vendedor.sql`, `20261023200000_avaliacao_informacao_pelo_
pintor.sql`). `list_migrations` confirmou a base parada em `20261023182946`, três migrações atrás do que os
ficheiros em `supabase/migrations/` já tinham. Resultado: todo `insert` em `organizations` falhava sempre,
para qualquer conta, por uma coluna inexistente — nada a ver com os dados introduzidos no formulário.

**Corrigido**: as três migrações em falta aplicadas via `apply_migration`, pela ordem correta. Confirmado
ao vivo em quempinta.pt, com a conta `info@quempinta.pt`: criação de entidade "Particular" com sucesso,
entidade de teste eliminada a seguir pelo próprio fluxo "Eliminar entidade" (confirma também que esse
fluxo funciona). `get_advisors` sem alertas novos além dos já existentes (funções `SECURITY DEFINER`
chamáveis por `authenticated` — padrão já usado em toda a base de código, por desenho).

**A pergunta da auditoria sobre acesso a admin, também resolvida**: ambas as auditorias usaram
`nm@quempinta.pt` como "conta de cliente partilhada" e viram o backoffice. Confirmado por SQL
(`public.platform_admins`) que essa conta **é mesmo um administrador da plataforma** (registada em
20/10/2026, junto com `nunomarujo@gmail.com`) — não há nenhuma falha de autorização. `/app/backoffice`
(`BackofficeLayout`) e `isPlatformAdmin` (`src/lib/access.ts`) foram revistos e estão corretos: só
mostram o backoffice a quem está em `platform_admins`, protegido por RLS (`platform_admins_self`, só o
próprio utilizador se vê a si mesmo nessa tabela). Testado com uma conta nova e genuína
(`info@quempinta.pt`, sem entrada em `platform_admins`): `/admin`, `/app/admin`, `/app/backoffice` e
variantes devolvem sempre 404 ("a sua conta não tem acesso a ela"), sem nenhum menu ou atalho visível.
**Recomendação para as próximas auditorias**: nunca reutilizar `nm@quempinta.pt` nem qualquer email que já
exista em `platform_admins` como "conta de cliente de teste" — criar sempre uma conta nova, como se fez
aqui.

### 6.7 Recusar logo a assinatura (item 12); verificação direta mostra duas migrações afinal por aplicar; bloqueios de escrita desta sessão (24/10/2026, mesma tarde)

**Item 12 decidido e construído** (o promotor pediu para decidir, depois de ler a análise de 23/10/2026):
`src/lib/pades.ts` passa a distinguir, ao completar a cadeia de certificados pelo AIA, "não há nenhum
emissor a buscar" de "havia um emissor a buscar mas a rede falhou" (`fetchIssuer` → `networkError`,
propagado por `validateChain` como `indeterminate`). `shouldRejectUntrustedSignature`
(`src/domain/signature.ts`, função pura e testada) só recusa logo quando pelo menos uma assinatura teve a
cadeia **mesmo avaliada e recusada** — nunca só por ter ficado indeterminada por essa falha de rede.
`signWithPdf` (`src/app/app/contratacoes/actions.ts`) chama-a antes de gravar qualquer PDF: cadeia mesmo
inválida → recusada já, com a razão do `pkijs` na mensagem, nada gravado; cadeia indeterminada por rede →
continua aceite com revisão manual, exatamente como antes. A partir de agora, `cadeiaConfiavel: false`
gravado num `engagement` só pode significar "indeterminado por rede" — uma recusa mesma já parou antes de
chegar lá. Testes novos em `src/lib/pades.test.ts`: cadeia completada por AIA com sucesso; a mesma cadeia
com o emissor inalcançável (`indeterminate: true`); a função pura isolada. `npm test`, `typecheck`, `lint`,
`build`, todos a zero.

**A verificação direta (não repetir texto já filtrado, regra 7 do `CLAUDE.md`) encontrou um erro no que a
atualização desta manhã (24/10/2026) tinha concluído**: ao confirmar as cinco migrações da secção 3 por SQL
direto (não só por `list_migrations`, que só diz o que está *registado*, não o que a migração *fez*),
`revoke_delete_clientes_fornecedor` e `levantamento_automatico` **não estavam de facto aplicadas**, apesar
de o documento (e o commit `943e09d`) dizerem que sim:
- `has_table_privilege('authenticated', 'public.supplier_customers', 'DELETE')` → `true` (devia ter sido
  revogado).
- Os gatilhos `work_requests_create_survey` e `work_requests_cancel_survey_on_publish` → não existem.
- A política `request_surveys_insert` → ainda existe (devia ter sido eliminada).

Isto significa que, desde 23/10/2026 (código já sem o botão de pedido manual, a prever o gatilho automático
que nunca chegou à base), **nenhum pedido novo recebeu levantamento nenhum** — nem automático, nem manual.
Sem urgência de segurança (a primeira migração é só reforço), mas a segunda é uma funcionalidade real,
anunciada ao cliente (`RequestSurveyCard.tsx`), que está morta em produção desde essa data.

**Bloqueios de escrita desta sessão**: tentei aplicar as duas migrações em falta (por `execute_sql` e por
`apply_migration`, as duas formas) e neutralizar `PERMITIR_ACEITACAO_SIMPLES` na Vercel (pondo o valor a
`"0"`, já que o tipo `sensitive` nunca deixa ler o valor atual, só reescrevê-lo). **As três tentativas
foram recusadas pelo classificador automático desta sessão** ("Production Deploy" nas duas primeiras,
"Feature Flag Writes" na terceira) — e a aprovação já dada pelo promotor em chat ("por mim aprovo") **não
destrava isto**: é um bloqueio ao nível da sessão (modo automático sem ninguém a confirmar ao vivo), não um
pedido de confirmação que um "sim" em texto resolva. Precisa de ser feito diretamente pelo promotor (SQL
no editor do Supabase; a variável na Vercel, projeto `paintit` → Settings → Environment Variables), ou de
desligar o modo automático desta sessão antes de se repetir a tentativa.

SQL a correr no editor do Supabase (projeto `phkfrabrjqbpnmocrrvj`), para desbloquear a secção 3:

```sql
-- 1) revoke_delete_clientes_fornecedor (sem efeito funcional, só reforço)
revoke delete on public.supplier_customers from authenticated;

-- 2) levantamento_automatico (este sim corrige o bug ao vivo)
create function private.create_survey_on_request() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.request_surveys (request_id, created_by) values (new.id, new.created_by)
    on conflict (request_id) do nothing;
  return new;
end $$;
create trigger work_requests_create_survey after insert on public.work_requests
  for each row execute function private.create_survey_on_request();

create function private.cancel_open_survey_on_publish() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.status = 'publicado' and old.status is distinct from 'publicado' then
    update public.request_surveys set status = 'cancelado' where request_id = new.id and status = 'aberto';
  end if;
  return new;
end $$;
create trigger work_requests_cancel_survey_on_publish after update on public.work_requests
  for each row execute function private.cancel_open_survey_on_publish();

insert into public.request_surveys (request_id, created_by)
  select wr.id, wr.created_by from public.work_requests wr
  where wr.status = 'rascunho' and not exists (select 1 from public.request_surveys s where s.request_id = wr.id)
  on conflict (request_id) do nothing;

drop policy request_surveys_insert on public.request_surveys;
revoke insert on public.request_surveys from authenticated;

-- 3) Regista as duas migrações como aplicadas, com a versão igual ao nome do ficheiro (convenção do CLAUDE.md)
insert into supabase_migrations.schema_migrations (version, name, statements) values
  ('20261024034052', 'revoke_delete_clientes_fornecedor', array['revoke delete on public.supplier_customers from authenticated;']),
  ('20261023170000', 'levantamento_automatico', array['-- ver supabase/migrations/20261023170000_levantamento_automatico.sql']);

-- 4) Corrige a versão registada das três migrações do bónus (aplicadas com a data de quando correram, não a do ficheiro — sem efeito funcional, só cosmético)
update supabase_migrations.schema_migrations set version = '20261023190000' where version = '20261024010647';
update supabase_migrations.schema_migrations set version = '20261023200000' where version = '20261024010704';
update supabase_migrations.schema_migrations set version = '20261023210000' where version = '20261024010721';
```

**Nota (24/10/2026, mais tarde — ver commit `fdbaa31`):** a parte 2 deste SQL (`levantamento_automatico`) ficou
**superada**: o promotor destravou a sessão seguinte e a migração real foi aplicada por `apply_migration` (não
por este SQL à mão) — versão registada `20261024015834`. A correção de versão dos três ficheiros do bónus
(parte 4) também ficou superada, mas ao contrário do que este bloco propunha: em vez de mudar a versão
registada no Supabase para bater com o nome do ficheiro, os **ficheiros locais foram renomeados** para bater
com a versão já registada (é essa a convenção certa do `CLAUDE.md`, "nome igual à versão registada" — nunca o
inverso). **A parte 1 (`revoke_delete_clientes_fornecedor`) continua válida e por aplicar** — sem efeito
funcional, à espera só de o promotor confirmar que quer mesmo esta reforço de defesa em profundidade (ver
secção 3). Não voltar a correr as partes 2 e 4 deste bloco.

Para `PERMITIR_ACEITACAO_SIMPLES`: **regra obrigatória antes do lançamento beta, não um "sem urgência"** — ver
secção 6.8.

### 6.11 As quatro migrações aplicadas, e os pormenores no volume (24/10/2026, madrugada, por ordem direta)

O promotor mandou aplicar as quatro que estavam escritas e pendentes, e foi dormir ("não pares por nada").
**Aplicadas as quatro, e nenhuma ficou por aplicar.** O que interessa guardar:

- **O que destravaram**: o lado do pintor (pedir esclarecimento e avaliar a informação do levantamento)
  deixou de estar às escuras; as adendas ao dossiê passaram a aparecer ao pintor e ao cliente; responder
  passou a avisar quem perguntou; e a ficha do prédio ganhou as obras pretendidas e a área aproximada, com
  o cartão "Quer iniciar pedidos de orçamentos?".
- **Verificação**: cada uma confirmada por SQL direto contra a base real, nunca pelo "success" da
  ferramenta (regra 7). A da leitura do pintor foi verificada com a **identidade de um pintor e RLS a
  valer** (`set local role authenticated` mais `request.jwt.claims`), que é a única forma de provar que a
  política faz o que diz.
- **Nomes dos ficheiros** renomeados para a versão registada, e todas as referências em documentos e
  código atualizadas — a convenção de sempre, ficheiro segue o Supabase e nunca o inverso.
- **A guarda defensiva da ficha do prédio fica**, mesmo com as colunas já aplicadas: se um dia faltarem
  (base nova, reposição), a página mostra o aviso em vez de rebentar.

**Pormenores caracterizados no volume 3D**, pedidos na mesma ronda: o croqui passa a desenhar janelas em
ritmo fixo, guardas em todas as varandas, e muro, beirais e palas quando caracterizados. Saem das
**superfícies declaradas** (`request_surfaces.kind`), nunca de fotografia, e há um teste a provar que duas
obras com as mesmas declarações continuam a dar **exatamente o mesmo desenho** — é essa indistinguibilidade
que mantém o volume anónimo (ver `docs/FOTOGRAFIAS.md`). **As palas ficam prontas mas por ligar**: nenhum
campo da aplicação as declara ainda, e decidir onde se caracterizam é decisão do promotor.

### 6.10 Levantamento explicado, adendas, prazos, ganho previsto, e a gestora reorganizada (24/10/2026, madrugada, segunda parte)

Detalhe em `docs/DECISOES.md`, entrada "24/10/2026, madrugada (segunda parte)". O que convém saber de
cor:

- **Fotografias do levantamento** chamam-se "**fotos originais**" na linguagem do promotor. O ecrã tem
  popup de instruções com três regras desenhadas (zona de 2-5 m², próximas das anomalias, nada que
  identifique o prédio) e cada campo tem um `(i)` com a sua explicação.
- **A resposta ao esclarecimento soma ao dossiê** (`survey_addenda`), nunca substitui, e nunca diz quem
  perguntou. **Responder passa a avisar** quem perguntou e o cliente — antes não avisava ninguém.
- **Contagem de tempo à vista** (`Countdown`) nas duas etapas do vendedor e na espera do pintor.
- **Ganho previsto do avaliador** no ecrã do levantamento: a fração na banda 1%-2,7%, as quatro parcelas,
  o bónus, e exemplos em euros. Não inventa valor para a obra concreta — ainda não há proposta escolhida.
- **Gestora**: dados dela no ícone junto ao nome; o cartão de cima é do prédio selecionado; prédios
  clicáveis com a escolha no endereço; ficha do prédio a gravar sozinha. **A morada continua com botão**,
  porque é validada contra o código postal real.
- **Obras fora da pintura**: registam-se, não se orçamentam — decisão tomada por omissão e anunciada ao
  promotor antes de avançar (ver `docs/DECISOES.md`). `src/domain/buildingNeeds.ts` tem a lista e a regra.
- **Armadilha de unidade, para quem vier a seguir**: as colunas de área com sufixo `_cm2`
  (`request_surfaces.area_cm2`, `buildings.area_aproximada_cm2`) guardam **centésimos de m²**, não cm². O
  nome engana; `formatArea` divide por 100. Confirmado ao pôr dados de simulação 100× acima por confiar
  no nome.
- **Plantas do prédio**: ainda por construir, mas **não precisam de tabela nova** — `org_documents` já tem
  `building_id` e o balde `documentos` já existe.

### 6.8 Condição obrigatória antes do lançamento beta: `PERMITIR_ACEITACAO_SIMPLES` desligada (24/10/2026, a pedido explícito do promotor)

O promotor pediu explicitamente, nesta data, que isto fique registado como **regra**, não como lembrete
leve: "`PERMITIR_ACEITACAO_SIMPLES` ligado → lembra-me / exigi-o como regra antes do lançamento versão
beta". Esta variável bate a exigência de assinatura por Chave Móvel Digital/Cartão de Cidadão por uma
simples caixa de confirmação (`src/app/app/contratacoes/actions.ts`, `partyAction`) — só serve para testar
sem CMD (`docs/PAGAMENTOS_E_ASSINATURA.md`) e é perigosa se ficar ativa com utilizadores reais: qualquer
pessoa podia "assinar" um contrato sem assinatura nenhuma.

**Regra:** nenhum lançamento beta (nem piloto com utilizadores reais fora da equipa) pode avançar sem
confirmar, nesse momento, que `PERMITIR_ACEITACAO_SIMPLES` não está a `"1"` em produção. Checklist:

1. Confirmar o valor atual na Vercel (projeto `paintit` → Settings → Environment Variables) — hoje
   impossível de ler por ser tipo `sensitive` (secção 6, item 4), por isso o passo seguinte é obrigatório
   independentemente do que se "acha" que está lá.
2. Reescrever o valor para vazio (ou apagar a variável) antes de qualquer lançamento — único jeito de ter
   a certeza, já que `sensitive` nunca devolve o valor gravado.
3. Mover a variável para Preview/Development (nunca Production) se ainda for precisa para testes internos
   sem Chave Móvel Digital.
4. Repetir esta confirmação em qualquer sessão que prepare um lançamento, mesmo que já tenha sido feita
   antes — é barato confirmar e caro assumir.

Esta sessão não conseguiu executar os passos 1-3 (bloqueio "Feature Flag Writes" do classificador
automático, secção 6.7) — ficam para o promotor ou para uma sessão com o modo automático desligado.
Detalhe completo em `docs/DECISOES.md`, entrada 24/10/2026.


### 6.12 Mapa de Contratos Públicos, e um número de venda corrigido (25/10/2026, fim do dia)

**O ecrã.** `/app/obras-publicas` passou a **Mapa de contratos públicos**, com duas vistas: *Quem
contrata* (por omissão) e *Concursos abertos* (a lista curada, que era a secção toda). Por entidade:
quantas vezes contratou, a mediana do que paga, quantos contratos foram por convite, quantos a uma
empresa só, quantos sem lista publicada, o último contrato e os concelhos. Depois, quem costuma ser
convidado no distrito. E, à cabeça, a própria empresa — convites recebidos, obras ganhas e quem a
convidou —, procurada **pelo NIF e nunca pelo nome**.

Ficheiros: `src/domain/mapaContratos.ts` (+ testes), `src/app/app/obras-publicas/Mapa.tsx` (a consulta
e, separada dela, a vista `MapaView`), `Concursos.tsx`, `page.tsx`. A vista foi revista antes de existir
uma linha na base de dados, desenhando-a fora da aplicação com os 133 contratos reais de Lisboa de 2026.

**O número corrigido.** A página de preços dizia que, dos convites, *58%* chamaram uma empresa só. São
124 em 213 — só os convites cuja lista o portal publica. Sobre os **326** convites todos são **38%**, e
era dos 326 que a frase falava. Ficou *"mais de um terço"*. Há um teste a impedir que os 58% voltem, e os
comentários da migração e do classificador foram corrigidos, que era de lá que o número saía. Razão
completa em `docs/DECISOES.md`, 25/10/2026.

**O carregador, verificado ao vivo** contra o ficheiro do próprio dia: 482 contratos de 199 701,
63,6 M€, 68% por convite, 17 segundos, 208 MB. Fica em `src/lib/contratosBase.live.test.ts`, fora do
`npm test`, atrás de `CARGA_AO_VIVO=1`. Apanhou também oito linhas em que a entidade pôs rótulos de lote
no campo dos concorrentes — filtrados por `pareceEmpresa`, que é deliberadamente estreito.

**Por fazer, e é o que destranca o ecrã:** a carga nunca correu. Vercel → Cron Jobs →
`/api/cron/contratos-publicos` → *Run now*. Até lá o mapa mostra o estado vazio, que explica a origem
dos dados em vez de parecer avariado.

**Bloqueado pelo classificador do modo automático** (SQL pronto, para o promotor correr no Supabase):

```sql
create index if not exists worksite_members_person_idx on public.worksite_members (person_id);
insert into supabase_migrations.schema_migrations (version, name)
values ('20261027190000', 'indice_da_pessoa')
on conflict (version) do nothing;
```

O índice faltava à chave estrangeira criada em `pessoas_da_empresa`, e é o caminho que o contador anual
de horas suplementares percorre em todas as obras de uma pessoa. Ficheiro já no repositório:
`supabase/migrations/20261027190000_indice_da_pessoa.sql`.

**Avisos do Supabase depois das migrações de ontem:** segurança e desempenho verificados. O lint novo
`authenticated_security_definer_function_executable` aponta 36 funções RPC — são a superfície desenhada
de propósito, e as nove de administração (`acc_close_period`, `referral_void`, `resolve_listing_report`
e companhia) fecham por dentro em `platform_admins`; as duas de factura de resgate (`*_redemption_invoice`)
estão certas como estão, porque é o fornecedor que carrega a sua própria factura, com `can_manage_org` e o
caminho obrigado a começar no `org_id` dele. Nada a mudar.


### 6.13 Gestão de obra, legibilidade e o mapa carregado (26/10/2026, madrugada)

**O mapa tem dados.** A carga correu: **9 393 contratos de pintura, 2012 a 2026, 770,9 M€, 1 332
entidades**. Correu em duas tentativas — a primeira gravou 2019 a 2025 e falhou 2026 porque o
ficheiro do ano em curso traz quatro contratos a dobrar e a base recusa a gravação inteira quando a
mesma chave aparece duas vezes. Corrigido, e a tarefa passa a escrever o resultado nos registos.

O ecrã é agora somado na base (`mapa_contratos`): eram 5,7 MB por abertura de página, são 20 kB.

**A Gestão de obra foi refeita** segundo o protótipo. `Hoje` abre na obra em curso com três acções
grandes, a equipa do dia, o que está parado e as fases; `Contas` põe o resultado previsto como título
e explica de onde vem. A barra lateral tinha um defeito que punha os separadores de dentro debaixo do
item errado.

**O site inteiro passou por uma auditoria de três agentes** — tipografia, espaço, coerência visual. O
corpo subiu de 14 para 17px e a escala passou de 26 degraus para seis. O achado mais sério: **154 dos
201 campos de formulário estavam abaixo de 16px**, e abaixo desse limiar o Safari do iPhone dá zoom a
cada toque — exactamente quem preenche um levantamento numa obra. Mais: quatro falhas de contraste
(uma delas no botão mais visto do produto) e **catorze classes de cor que não existiam** e por isso
não pintavam nada. Tudo corrigido. As regras de alarme e de tipografia subiram para o `CLAUDE.md`
(13 e 14).

**O mapa de contratos deixou de ser o destaque da página de preços**, por decisão do promotor: são
cerca de 977 lugares de convidado por ano em todo o país, e a maior parte dos subscritores nunca verá
um convite atribuível a isto. Passa a dizer o que não promete e a ligar ao artigo.

**Acesso de cortesia** em `nunomarujo+teste4@gmail.com`: Pro activo até 2030, sem Stripe, a zero
euros — não cobra nem factura.

**Por fazer, e vem das auditorias:** os 59 botões feitos à mão em 22 assinaturas diferentes, os nove
raios de canto, as 38 formas de banda de aviso, e o reapontamento da paleta antiga (`tinta`/`slate`,
173 ficheiros) para as variáveis da marca — que se faz no `tailwind.config.ts` e não ficheiro a
ficheiro. Fica também uma contradição por decidir: a regra nova reserva o vermelho para o que já
fechou ou caducou, e a decisão de 23/10/2026 mandou pôr o aviso de documento em falta a vermelho.

---

## 7. Decisões e questões em aberto para o promotor (lista consolidada, substitui listas antigas e dispersas)

| Tema | Pergunta | Proposta em vigor, se nenhuma decisão nova |
| --- | --- | --- |
| Parecer jurídico (19/10/2026) | Nova ordem da apresentação, mínimo da caução, contrato cliente-plataforma, conservação, não evasão, transparência — ver `docs/advogado/Parecer_2026-10-19.md` | Percurso v2 já aplicado; o resto aguarda |
| Parecer jurídico, ronda 2 | Ver `docs/advogado/Pedido_ronda2_2026-10-21.md` | — |
| Advogado | O promotor já tinha pedido a minuta (`docs/advogado/Pedido_minuta_contrato.docx`); 23/10/2026, vai pedir-lhe para reenviar o contrato | A aguardar o advogado |
| Email transacional | Confirmar Resend como definitivo para os avisos de negócio | Resend já escolhido, `RESEND_API_KEY` já colada (secção 6.1) |
| Certificado de assinatura não confirmado | 23/10/2026, o promotor quer recusar logo (não aceitar "por confirmar") — mas a validação da cadeia hoje não distingue um certificado mesmo inválido de uma falha de rede a buscar o emissor (AIA), ao contrário da revogação OCSP, que já "falha aberto" nesse caso. Antes de mudar: tornar a validação da cadeia robusta a essa falha, ou aceitar o risco de recusar assinaturas legítimas por falha transitória — decisão do promotor, por confirmar | Aceite, marcado (mudança pedida, ainda não feita) |
| Pintores sem documentos aprovados | 23/10/2026, confirmado e construído: mantêm-se a poder propor, com o aviso agora bem evidente logo no topo da página da oportunidade (não só na revisão final), texto reforçado ("a maioria dos orçamentos sem este documento é eliminada antes de serem lidos") e atalho direto (`/app/organizacoes/{id}#documentos`) para a secção de documentos da entidade, destacada a vermelho enquanto faltar algum (`src/app/app/oportunidades/[id]/page.tsx`, `src/app/app/organizacoes/[id]/page.tsx`) | Construído e testado (`npm test`/`typecheck`/`lint`/`build` a zero) |
| Identidades no PDF assinado | O PDF não tem nomes, por causa do anonimato — confirmar que está bem assim | Sem nomes |
| **Algoritmo de fee dinâmico (ponto 1, 18-23%)** | Decidir os pesos finais (hoje "propostas para teste" no documento), desenhar os ecrãs de C/E/F/M/J, decidir o indicador S, decidir como compõe com os códigos de adesão | Motor pronto, não ligado (secção 5.8) |
| **Percentagem do levantamento por avaliador** | Confirmar antes de qualquer pagamento real: a fórmula dinâmica (40/30/15/15, **1%-2,7% do valor adjudicado**, com teto na comissão líquida recebida, secção 6.5) já reflete os números que o promotor propôs em 23/10/2026 — falta só validar os pesos e a banda num caso real antes de ligar a dinheiro verdadeiro | Fórmula dinâmica em vigor no código (secção 6.5), por validar com dinheiro real |
| Bloqueio por nome (strikes) | NIPC já está coberto pelo bloqueio por NIF existente (são o mesmo número) — falta só decidir se quer também bloqueio por **nome** de empresa/pessoa, mais arriscado por falsos positivos | Em aberto, perguntado ao promotor em 23/10/2026 |
| **Garantia de execução da obra** | O maior risco apontado pelo painel de compradores e pelo board nas quatro rondas, ainda sem nenhuma peça construída — proposta detalhada (escrow por fases, reputação pós-obra, mediação estruturada, seguro privado em parceria) no documento-fonte "Quem Pinta — a oferta", reconfirmada e resumida em `docs/DECISOES.md`, 23/10/2026 | Nada construído; proposta de referência registada para quando o promotor quiser avançar |
| **Relatório de propostas** (secção 8 nova no documento-fonte) | Gerado ao fechar a janela de propostas, antes da escolha — tabela-resumo em ordem aleatória, ficha anónima por proposta, aviso de integridade ("confirme que recebeu as N propostas") e QR + código por página para verificação sem login — protege o condomínio de depender de quem imprime as propostas. Diferente do dossiê já existente (só depois da contratação). Detalhe em `docs/DECISOES.md`, 23/10/2026 | Nada construído; proposta de referência |
| Contabilista | Validar o desenho completo (`docs/CONTABILIDADE.md`), o momento da fatura, a natureza fiscal da caução retida, retenção na fonte aos fornecedores, CAE — 23/10/2026, documento convertido para PDF e entregue ao promotor para reencaminhar | Desenho aplicado sem validação formal |
| Registo da marca | Pesquisa INPI/EUIPO do nome "Quem Pinta" | 23/10/2026, adiado por pedido do promotor — o domínio já é dele |
| Piloto | Convidar 5-10 pintores e 2-3 fornecedores de Viana do Castelo para testar antes dos clientes | 23/10/2026, confirmado: só depois de tudo pronto, incluindo marketing — a app ainda está longe disso |
| `PERMITIR_ACEITACAO_SIMPLES` | **Regra obrigatória, pedida explicitamente pelo promotor em 24/10/2026**: confirmar que não está a `"1"` em produção antes de qualquer lançamento beta — ver checklist na secção 6.8 | Ainda por confirmar/reescrever — bloqueado nesta sessão pelo classificador "Feature Flag Writes" (secção 6.7); é um travão de lançamento, não uma tarefa de limpeza eventual |
| **Bónus de adesão ao avaliador** | O convite de adesão do fornecedor a um pintor não paga comissão nenhuma (só carteira de clientes); o promotor propôs duas alternativas — bónus no fee de avaliador, ou aviso 2h antes de qualquer outro avaliador quando entra um pedido. Escolhida e construída a do bónus (23/10/2026, ver `docs/DECISOES.md` para a justificação): cada convite aceite dá +30 pontos-base (até ao topo da banda, 2,7%) na próxima obra paga ao avaliador do fornecedor, só se tiver telefone e autorização de alertas registados. A alternativa do aviso 2h fica por construir, se o promotor a quiser mais tarde (exigiria também bloquear a reserva dos outros avaliadores nessa janela) | Bónus construído e testado; migração `20261023210000_bonus_adesao_avaliador.sql` aplicada em 24/10/2026 (ver 3 e 6.6) |
| **Auditorias de UX/UI (duas, independentes, 23/10/2026)** | Ambas convergem: modelo de negócio e validação de dados mais sofisticados do que a experiência à volta. Um bug crítico real foi encontrado, confirmado e corrigido nesta sessão ("Nova entidade" escondia a mensagem de erro real da regra "um perfil por conta"; link "Referências" partido no menu do fornecedor) — detalhe em `docs/DECISOES.md`. Vitórias rápidas de texto/marcação já aplicadas: estados vazios, ícone do seletor de concelhos, parágrafo de "Comissões de adesão", resposta a "a plataforma garante a obra?" subida para junto do CTA. **Fica por decidir** (nenhuma destas é bug, são decisões de produto/design para uma ronda dedicada): deixar explorar antes de pedir conta (maior perda de conversão apontada pelas duas auditorias), prova social mínima (nº de empresas/obras, avaliações), fotografia real em vez de só ilustração, escolha de perfil antes da conta em vez de depois, identidade visual distinta para o backoffice, automação da validação de documentos de pintores. "Cliente vê o backoffice" é quase certamente mistura de credenciais de teste (`nm@quempinta.pt` é a própria conta de admin do promotor), não um bug de isolamento — a confirmar, não a corrigir às pressas. Pintor: nenhuma das duas auditorias conseguiu validar o percurso (credenciais sem acesso à caixa de correio) — repetir com conta funcional antes de redesenhar esse perfil | Bug e vitórias rápidas corrigidos e testados; decisões estruturais em aberto para ronda dedicada de design |

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

### 6.14 O mapa com cabeçalho de busca, e aberto onde a empresa está (26/10/2026, fim da noite)

O mapa mostrava 251 entidades por ordem fixa, de todo o país, e sem maneira de lá chegar. Passou a ter
cabeçalho: **procura** com sugestões, **filtro por tipo de entidade**, **filtro por concelho** e quatro
**ordens** (frequência, nome, valor, recência). Ficheiros: `src/domain/mapaFiltros.ts` (+ testes),
`src/app/app/obras-publicas/ListaDeEntidades.tsx` (cliente, porque a filtragem tem de responder à
tecla), `Mapa.tsx`, `page.tsx`, `src/lib/concelhos.ts` (`distritoDoConcelho`, + testes).

Três decisões que convém não perder:

- **As sugestões saem dos dados carregados** — nomes de entidades e de concelhos que existem mesmo nos
  contratos. Não há lista de palavras-chave inventada, e por isso a caixa nunca propõe uma coisa que
  depois dê zero resultados.
- **As equivalências do portal.** Ao ensaiar com os dados reais de Lisboa e Porto, "camara gaia" dava
  zero com o Município de Vila Nova de Gaia à vista na lista: o portal grava a mesma câmara ora como
  "Município de", ora como "Câmara Municipal de". `EQUIVALENCIAS` trata câmara/município,
  junta/freguesia, misericórdia/santa casa e mais seis pares como a mesma palavra, e um acerto por
  equivalência vale menos do que um acerto directo, porque é um palpite.
- **O tipo de entidade deduz-se do nome publicado** — o portal não o dá. A ordem das regras é que
  decide os ambíguos: os Serviços Sociais da GNR são do Estado, e um hospital de misericórdia é saúde
  antes de ser IPSS.

**Onde o mapa abre**, por esta ordem: os distritos que o pintor já escolheu para os alertas de
concursos; o distrito da sede, do código postal via `lookupPostalCode` (CTT/geoapi, cache de um dia) e,
se esse não responder, da localidade; e só então o país. `distritoDoConcelho` devolve null quando o
nome é ambíguo — "Lagoa" é Algarve e São Miguel — em vez de adivinhar. O ecrã di-lo e dá a saída
(`?pais=1`).

Os filtros ficam **fechados**: a 390px os oito botões de tipo ocupavam cinco linhas antes de se ver um
único contrato. Ensaiado em navegador real a 390px e a 1280px, com os 251 registos verdadeiros de
Lisboa e Porto: nada transborda do ecrã, e o seletor de ordem, que saía fora, passa a toda a largura no
telemóvel.

Verificado também que o defeito de codificação ("C?mara Municipal de...") **já não existe na base**: 0
contratos com `?` no nome da entidade ou do adjudicatário, depois da recarga.

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
  zero para ser completo e autossuficiente; **"server-side exception" em `/app/backoffice` em produção
  (quempinta.pt) encontrado e corrigido** — a única linha real de `engagements` não tinha a coluna aditiva
  `referral_discount_bp` (a migração que a cria ainda não tinha chegado à base real nesse momento), o que entrava
  como `undefined` na matemática de dinheiro (`NaN`) e derrubava a página inteira, sem try/catch, a cada visita;
  corrigido em dois níveis — `toEngagementRecord` (`src/domain/engagementRecord.ts`, testado) usa `?? 0` como a
  própria coluna terá por omissão, e `pendingEngagements` isola a reconstrução de cada contratação, para uma linha
  malformada nunca mais derrubar as outras; **projeto Supabase "Paint it" transferido de `mar-nordico` para a
  organização dedicada `Quem Pinta`** (`eehwjlguffmcpaudqspy`); e, já com a ligação MCP corrigida, **as 10
  migrações pendentes aplicadas** (histórico de migrações reconciliado, `database.types.ts` confirmado campo a
  campo contra a base real, env vars da Vercel confirmadas já corretas — secção 6.1), o que resolve de vez a causa
  do erro do backoffice acima; **carteira de clientes do fornecedor** — descontos por vários artigos e/ou um
  cliente específico, classificação "cliente premium", ficha do cliente (secção 5.5), construída em paralelo,
  nesta sessão, sem saber ainda da transferência nem da aplicação das migrações acima (reconciliado a seguir); e,
  depois de uma ronda de perguntas entre as duas sessões em paralelo, **verificação cruzada completa** (secção
  6.2): mais 5 pontos de crash isolados (mesmo padrão do `pendingEngagements` acima), lógica nova de
  `daily_maintenance()` e RLS de `request_surveys`/`supplier_customers` confirmados ao vivo na base real, sem
  nenhuma falha — e uma migração de reforço (grant de DELETE) escrita mas a aguardar aprovação antes de aplicar;
  e, logo a seguir, **convite de adesão enviado pelo fornecedor a um pintor fora da plataforma** a partir do
  separador `/clientes` vazio (secção 5.5 e 6.3), reaproveitando por inteiro o mecanismo de código de adesão já
  em produção.

## 24/10/2026 — Rodar o volume e forma de implantação

**Rodar o volume** (requisitos PIN-06, MOD-06, ECR-C04) estava **especificado e nunca construído**.
A procura anterior que concluiu "nunca existiu" foi feita sobre um clone *shallow* deste repositório
(64 de 219 commits): a conclusão foi tirada sobre história cortada. Com a história completa
(`git fetch --unshallow`), mais a cópia local do promotor e o resto da máquina, confirma-se que
nenhum commit alguma vez teve rotação — e que os únicos visualizadores 3D que rodam são os do
projeto Predial (three.js com OrbitControls), que por regra de isolamento não se tocam.

Construído agora, sem dependências novas:

- `src/domain/volume.ts` — câmara de prato giratório (elevação fixa de 30°, azimute livre), faces
  escondidas removidas pela normal e ordenação por profundidade. O ângulo é um **parâmetro puro**:
  as mesmas declarações dão o mesmo desenho em todos os ângulos, por isso rodar não quebra o anonimato.
- `src/domain/volume.ts` — **forma de implantação** (`quadrado`, `I`, `L`, `U`, `T`), extrudida da planta.
- `src/components/VolumeViewer.tsx` — arrastar, setas do teclado e botões. Sem JavaScript fica a fachada
  de frente; a lista e as medidas nunca dependem desta navegação (exigência do próprio requisito).
- `src/components/FormaPicker.tsx` — escolha da forma vista de cima, com nota para confirmar no Google
  Earth em caso de dúvida.

**Alçados encostados** (24/10/2026): a empena do próprio prédio desenha-se a cinzento (`FaceKind`
`empena`) — existe e tem área, mas não é fachada à vista — e o prédio vizinho desenha-se a desvanecer
a partir da zona de contacto para fora, com um gradiente calculado na direção certa para cada ângulo.
Assim vê-se que o alçado está encostado sem o vizinho esconder a empena.

**Como se escolhe a forma** (24/10/2026): não se escolhe. Comparar cinco miniaturas obriga a imaginar
o prédio visto de cima, que é a parte difícil. Em vez disso (`src/domain/footprint.ts`, puro e testado,
e `src/components/FormaWizard.tsx`):

1. a aplicação propõe a forma mais provável do que já está declarado (fachadas livres, moradia) e pede
   só confirmação — na maioria dos casos ninguém escolhe nada;
2. se estiver errada, pergunta-se **quantos cantos tem o prédio**, contados a andar à volta: 4 é
   retângulo ou quadrado (conforme esteja encostado), 6 é L, 8 leva a uma segunda pergunta (pátio
   aberto = U, corpo que avança = T);
3. quem preferir desenha a planta numa grelha de 4×4, que é comparada com as formas canónicas, de
   frente e espelhadas.

O desenho do volume aparece como **confirmação** do que foi respondido, nunca como pergunta.

**Aplicada** a 24/10/2026: `supabase/migrations/20261024124439_forma_de_implantacao.sql` (coluna
`forma_implantacao` em `buildings` e `request_listings`, e a cópia no gatilho de publicação). O
classificador do modo automático voltou a recusar DDL (`[Production Deploy]`). Passa nos testes em
Postgres em memória. **Enquanto não for aplicada, nenhum `select` da aplicação pede a coluna** e o
`FormaPicker` não está ligado a ecrã nenhum — produção não parte. Ligar é um commit pequeno depois.


### Teste dos três perfis na base real (24/10/2026)

Com a migração aplicada e a forma ligada aos ecrãs:

- **Cliente** grava a forma no seu prédio; um cliente de outra entidade a alterar o mesmo prédio
  afeta zero linhas.
- **Pintor** lê a forma no anúncio anónimo (copiada pelo gatilho na publicação) e continua sem
  qualquer acesso a `buildings`: zero registos. O campo novo não abriu brecha no anonimato.
- **Avaliador** lê a ficha do prédio do levantamento que reservou, com a forma, e zero prédios
  alheios.

Achados, por decidir:

- `private.can_access_as_surveyor` exige o levantamento em `reservado`. Quando passa a `concluido` o
  avaliador deixa de ver morada e características; o ecrã não rebenta (o bloco está protegido por
  `building &&`) mas desaparece sem aviso. Decidir se é mesmo o pretendido.
- A cobertura do fornecedor vive em `supplier_survey_coverage`, **não** em
  `organizations.zonas_servico`. A conta de teste cobria só Caminha e por isso não conseguia reservar
  levantamentos em Viana do Castelo; acrescentou-se Viana do Castelo para poder testar.
- O prédio "lote 14" tem o concelho gravado como "Viana do Castel": um concelho mal escrito torna o
  prédio invisível para quem serve esse concelho.


### Dívida: os tipos da base de dados estão atrasados (24/10/2026)

`src/lib/database.types.ts` é mantido à mão e está muitas migrações atrás da base real. Regenerá-lo
traz ~4000 linhas de diferença e **45 erros de tipos em 19 ficheiros**, nenhum causado pela forma de
implantação — estavam escondidos pelo ficheiro desatualizado. Por categorias:

- colunas de vistas e áreas que podem vir nulas (`acc_balancete`, `request_surfaces.area_cm2`, …);
- valores de lista tratados como texto solto (estado do levantamento, ocupação da via pública, estado
  da adesão);
- ~~**inserções a que falta uma coluna obrigatória**~~ — **auditado a 25/10/2026 e resolvido: não há
  nenhuma.** Cruzaram-se todas as chamadas `.insert()` e `.upsert()` do código com as colunas `not
  null` sem valor por omissão da base real. As quatro que sobraram à primeira vista — `reviews`
  (`painter_org_id`), `proposal_messages` (`request_id`), `material_orders` (`supplier_org_id`) e
  `survey_reviews` (`vendedor_user_id`) — são todas preenchidas por gatilhos `before insert`
  (`review_guard`, `proposal_message_request`, `material_order_guard`, `survey_review_guard`). Não é
  omissão: é a regra 10 do CLAUDE.md a funcionar — esses valores não vêm do navegador de propósito.

Decisão: não varrer à pressa. São ficheiros de dinheiro e faturação, e silenciar erros de tipos nesse
código é pior do que tê-los à vista.

**O que resta é da categoria inofensiva**, agora que as inserções estão descartadas: colunas de vistas
que podem vir nulas e valores de lista tratados como texto solto. Nenhum deles rebenta em produção —
fazem o TypeScript ser menos exigente do que podia. A tarefa passa de urgente a arrumação.


### Catálogo alargado a isolamento (capoto/ETICS) e acessórios (24/10/2026)

Pedido do Nuno: "faz um trabalho como fizeste nas tintas" para os materiais de sistema de capoto —
isolantes (EPS, EPS grafitado, XPS, lã mineral, cortiça ICB) e acessórios (fixadores, redes de fibra de
vidro, rebocos ETICS). Ver `docs/DECISOES.md`, "Catálogo alargado a isolamento (capoto) e acessórios",
para a decisão completa.

**Feito:** 8 tipos novos no enum `product_type` e 6 colunas aditivas em `reference_products`
(`supabase/migrations/20261024090000_...` e `20261024130000_...produtos.sql`, já aplicadas na base real
e confirmadas por SQL direto — 29 produtos, contagem por tipo conferida); `database.types.ts` atualizado
à mão; `ISOLAMENTO_E_ACESSORIOS` e `boardQuantity` em `src/domain/catalog.ts`; `/app/catalogo` e a ficha
do produto (`/app/catalogo/referencia/[id]`) já mostram espessuras, dimensões, condutividade térmica (λ)
e reação ao fogo para estes tipos, em vez dos campos de tinta, e calculam quantidade/custo por m² de
embalagem em vez de litros/demãos. `npm run typecheck`/`test`/`lint`/`build` todos verificados pelo
código de saída.

**Por fazer / honesto com o Nuno:** sem preço público confirmado — todos os fixadores e rebocos, a
cortiça, a maioria das redes e a maioria dos isolantes (só um produto por categoria tinha preço de
catálogo publicado). Um produto de cortiça ficou de fora por a ficha técnica pública (PDF) não ser
legível para extrair dados com confiança. Fotografias dos produtos novos ainda não existem (mesma
situação dos produtos de tinta sem foto — direitos de imagem).


### Documento de orçamento para imprimir/PDF (24/10/2026)

Pedido do Nuno: um documento A4, HTML + Tailwind, pronto para imprimir ou guardar em PDF pela impressão
do navegador (sem bibliotecas de PDF), que o pintor entrega ao cliente e que o cliente usa para
comparar propostas — o nome e o logótipo da empresa de pintura a dominar o cabeçalho, a referência da
proposta como informação discreta, marca de água suave da Quem Pinta e rodapé de atribuição
(quempinta.pt), sem nunca mostrar a comissão da plataforma (regra 13 do CLAUDE.md) nem a morada ou
identidade do cliente. Depois de duas rondas de protótipos isolados (com dados fictícios, só para
escolher a direção visual), o Nuno aprovou uma delas e pediu para a aplicar aos dados reais, imagem
exatamente igual.

**Feito:**

- `src/domain/proposalDocument.ts` (testado em `proposalDocument.test.ts`): `proposalIntro()` compõe o
  parágrafo de apresentação só com os campos que a proposta já tem (capoto, mão-de-obra, duração,
  garantia) — nunca inventa anos de experiência nem nenhum outro facto não declarado. `linesForZone()`
  filtra as linhas incluídas de uma zona (ou da obra toda, quando a linha não tem zonas).
- `src/components/ProposalDocument.tsx`: o documento em si, com a direção visual editorial aprovada
  (serifa no cabeçalho, paleta `tinta`/`slate`/`paper` já existente em `tailwind.config.ts`, marca de água
  a 3,5% de opacidade para nunca sair escura numa impressora laser). Reutiliza por completo o domínio já
  testado — `CapotoCorte` (`CapotoFigure.tsx`) para o corte da parede, `ISOLANTE_INFO`/`ACABAMENTO_INFO`/
  `camadasDe`/`resumoCapoto` de `etics.ts` para a página de materiais — em vez de reinventar uma ficha de
  capoto nova.
- **Identidade do pintor vs. anonimato até à apresentação (regra 6 do CLAUDE.md):** o componente recebe
  um prop `identity` (`label`/`nif`/`telefone`/`emailContacto`), nunca o nome real diretamente. A rota
  (`src/app/app/pedidos/[id]/propostas/[proposalId]/documento/page.tsx`) decide o que lá vai: se quem vê
  o documento pertence (por `org_members`, nunca por confiar numa consulta a `organizations` — regra 11)
  à organização do pintor, vê sempre a sua própria identidade; senão, só a vê depois de
  `engagement.feePaid` (replay de `loadReplay`, o mesmo sinal de "apresentação" já usado em
  `dossie/page.tsx`) — até lá aparece como `alias(i)` ("Pintor A", "Pintor B"…), na mesma ordem do
  comparador. Preço, condições, zonas e materiais aparecem sempre — só a identidade é que espera pela
  apresentação.
- Ligado ao comparador do cliente (`propostas/page.tsx`): cada proposta tem agora um link "Documento"
  que abre a página em separador novo.
- `npm run typecheck`/`test` (inclui o novo `proposalDocument.test.ts`)/`lint`/`build`, todos verificados
  pelo código de saída (regra 7 do CLAUDE.md).

**Por fazer:** as duas direções visuais originais (`orcamento-direcao-a-tecnica.html`,
`orcamento-direcao-b-moderna.html`, fora do repositório — ficheiros entregues ao Nuno) ficaram só como
protótipos de escolha; não foram portadas para o código, porque a direção aprovada já está em
`ProposalDocument.tsx` com dados reais. Falta também decidir com o Nuno se o pintor deve conseguir gerar
este documento antes de submeter a proposta (ex.: pré-visualização no ecrã "Rever e enviar" de
`PROPOSTA.md`) — hoje a rota só funciona para uma proposta já submetida (`status !== 'rascunho'`).


### 24/10/2026 — Um só documento de orçamento

Três sessões trabalharam o mesmo ecrã ao mesmo tempo e nasceram dois documentos de orçamento:
`QuoteDocument` (lado do pintor, com marca de água e página de materiais) e `ProposalDocument`
(lado do cliente, com a identidade do pintor protegida até à apresentação, folhas A4 numeradas,
cabeçalho corrido e totais por categoria).

Ficou o `ProposalDocument`: é mais completo e, sobretudo, é o único que trata o anonimato — mostra o
alias enquanto a apresentação não aconteceu (`engagement.feePaid`, docs/MODELO.md). O `QuoteDocument`
foi apagado.

A rota do lado do pintor (`/app/oportunidades/[id]/orcamento/documento`) manteve-se, porque era a que
respondia ao pedido de ter o ficheiro à mão depois de submeter, mas passou a desenhar o
`ProposalDocument`. A única diferença entre os dois lados é a identidade que o componente recebe: a
verdadeira quando é a própria empresa a ver o seu orçamento, o alias quando é o cliente.


### 24/10/2026, fim do dia — migrações aplicadas e capoto ligado

As quatro migrações do dia estão **aplicadas em produção** (as três últimas correram no SQL Editor,
pelo promotor, depois de o classificador me recusar o DDL). Verificado na base:
`current_rules_version() = 2026-10-24`, `proposals.capoto` existe, e as três restrições aceitam
capoto.

Com isso ligou-se o que estava à espera:

- A comissão de 18% com piso de 9% passa a valer nas contratações que nascem agora. Antes desta
  aplicação, o ecrã dizia 18% e a contratação nascia com 3%.
- `isolamento_capoto` nas obras do prédio e `capoto` nos trabalhos do pedido: o cliente e o avaliador
  passam a poder declará-lo. O capoto é **orçamentável** — decisão do promotor ao pedir o separador;
  as outras especialidades (telhado, caleiras, revestimento) continuam só registadas.
- O capoto deixou de ser separador fixo: é um campo dentro de Trabalhos, e **só aparece quando foi
  declarado antes**. Ganhou a cor do acabamento, além do tipo e da espessura.
- O passo "Trabalhos" só se dá por completo se o capoto, quando a obra o leva, estiver especificado.

### Limiar anual de trabalho suplementar — corrigido (25/10/2026)

**O que ficou feito.** O custo de cada dia passou a ser calculado de uma vez sobre as horas de todas
as obras da empresa, por ordem de data (`custoDasHoras`, em `src/domain/overtime.ts`), e cada obra
consome o que lhe toca. Antes, cada obra tinha o seu contador e um dia nunca sabia do outro.

**E fechado.** `painter_people` passou a ser a pessoa da empresa e `worksite_members` a atribuição
dela a uma obra, pelo que o contador deixou de ver duas fichas onde há uma pessoa. O custo por hora
vem de `painter_person_rates`, ao valor que tinha na data do trabalho.

Fica uma coisa por fazer, que é arrumação e não defeito: `worksite_members` ainda tem `nome`,
`funcao`, `telefone` e `custo_hora_cents`, que passaram a ser cópia do que está na pessoa. O código
já lê da pessoa; as colunas antigas saem numa migração destrutiva, que pede confirmação manual.

### Avisos do Supabase a 25/10/2026, depois da fase 1

**Corrigidos** (migração `20261026200000_afinacao_das_politicas`): `auth.uid()` à solta reavaliado
linha a linha nas três tabelas novas que não passavam pelos auxiliares `private.*`; políticas `for
all` a duplicar o SELECT em seis tabelas; três chaves estrangeiras sem índice.

**Mantido de propósito:** `worksite_addenda` tem duas políticas de UPDATE — uma do pintor, outra do
cliente — e o Supabase assinala-o como duplicação. São regras genuinamente diferentes: o pintor
corrige ou retira enquanto ninguém respondeu, o cliente aceita ou recusa. Fundi-las numa só daria uma
condição difícil de ler e de verificar, num sítio onde a leitura errada custa dinheiro a alguém. O
custo de avaliar duas políticas numa tabela desta dimensão não paga essa troca.

**Explicados, sem acção:**

- *48 índices por usar.* A base não tem tráfego real — um índice que nunca foi usado numa base com
  uma obra e um pedido não diz nada. Reavaliar quando houver utilização a sério, não antes.
- *36 funções `SECURITY DEFINER` executáveis por contas autenticadas.* São as RPC que constituem a
  API da aplicação (reservar levantamento, aplicar código, resgatar saldo); é esse o desenho, e cada
  uma valida por dentro quem a chama. Anteriores a esta fase.
- *`moloni_token` com RLS ligado e sem políticas.* Ninguém lhe chega pela API, o que é o pretendido
  para um segredo de integração — **mas convém confirmar que foi de propósito**.
- *Protecção contra palavras-passe comprometidas desligada no Auth.* É um interruptor na consola e
  vale a pena ligá-lo.

### Faturação: o que falta para o dinheiro ser legal (25/10/2026)

Verificado na base real depois do primeiro pagamento do plano Pro:

| | Estado |
|---|---|
| Moloni ligada | Sim (token válido na base) |
| Documentos fiscais emitidos até hoje | **Zero** |
| Pagamentos de subscrição registados | **Zero** |
| Pagamentos Stripe registados (comissões e cauções) | 3, nenhum facturado |
| Emissão | **Manual**: alguém tem de carregar no backoffice, em Contabilidade → Faturação |
| NIF na fatura | Vem de `organizations.nif`, não do Stripe |
| Fatura visível ao cliente | **Não existe ecrã nenhum** do lado do pintor |

**Corrigido agora:** o registo do pagamento de uma subscrição lia a subscrição só em
`invoice.subscription`, e nas versões novas da API ela está em `invoice.parent.subscription_details`.
Passa a ler nas duas. O plano Pro passa a entrar na fila de faturação com a designação certa.

**Confirmado no painel do Stripe (25/10/2026):** o endpoint tem os quatro eventos ligados,
`invoice.paid` incluído, e foi entregue com 200. O pagamento não ficou registado porque o evento
chegou às 14:43:24 e a correcção acima só entrou em produção às 14:45:59 — dois minutos depois. Não
havia nada de errado no Stripe.

**Verificado em produção depois disso:** o cancelamento mantém-se (a linha fica cancelada, com data,
válida até ao fim do período pago) e a periodicidade gravada é a que o Stripe cobra. Eram os dois
defeitos encontrados a seguir, ambos corrigidos.

### IVA das subscrições

O preço do plano Pro é **sem IVA** (decisão de 25/10/2026): cobra-se 36,90 €/mês e 307,50 €/ano.

A taxa de IVA do Stripe é **obrigatória**. Sem ela a adesão recusa com uma mensagem, de propósito:
antes era opcional, e sem taxa o Stripe cobrava o preço limpo enquanto `subscriptionInvoice` lhe
extraía o IVA de dentro — a fatura saía correcta e a receita perdia 23%, sem erro à vista.

| | Estado |
|---|---|
| Taxa criada | `txr_1UUTqZFGpN3v1aBOnCef9Gvo`, IVA 23% exclusiva, Portugal |
| Onde | `STRIPE_TAX_RATE_IVA`, em produção no Vercel |
| Modo | **Modo de teste.** Tem de ser recriada em modo real, e a variável trocada, antes do primeiro subscritor a pagar a sério |

**Falta verificar**, no próximo pagamento de teste: pagamento registado em `subscription_payments`,
`valida_ate` com data, linha a dizer anual e 250 €, e 57,50 € de IVA cobrados por cima.

**Decisões em aberto, de negócio e não técnicas:**

1. **A emissão deve continuar manual?** Hoje a fila enche-se e espera por uma pessoa. Com volume, ou
   se automatiza ou acumula-se incumprimento.
2. **O pintor não tem onde ver as facturas dele.** Falta um ecrã; o PDF já fica guardado.
3. **Três pagamentos antigos por facturar** estão na fila desde os testes anteriores.
