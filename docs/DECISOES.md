# Decisões

Questões jurídicas, fiscais e regulamentares, com propostas de resposta:
[Paint it — Questões jurídicas para validação](https://claude.ai/code/artifact/6ac31246-9446-4e07-a622-2022b58cdcb3)
(Claude Docs). Requisitos de base: Documento Mestre de Requisitos v0.3 (17/10/2026).

## 27/10/2026 — Documento em falta é âmbar, não vermelho

O promotor decidiu, fechando a contradição que estava aberta desde 26/10 na regra 13 do `CLAUDE.md`:
o aviso de documento em falta passa a **âmbar**, revogando a decisão de 23/10/2026 que o mandava pôr
a vermelho.

A razão é a da própria regra: um documento em falta **resolve-se** — submete-se e o aviso desaparece.
O vermelho fica reservado ao que já fechou, caducou ou foi recusado, e usá-lo para o que ainda se
pode resolver ensina a ignorá-lo.

Mudou em quatro sítios, e numa frase: a ficha da entidade (as duas bandas de "faltam documentos"), o
ecrã da oportunidade (o aviso no topo e o que está junto ao botão de submeter), o que o cliente vê na
proposta (seguros em falta, habilitação IMPIC não validada) e o texto que prometia ao pintor que "o
cliente verá a falta assinalada a vermelho".

## 26/10/2026 (noite) — A entrega das propostas é simultânea, e só depois se escolhe

Pedido do promotor, descrito em linguagem corrente: o cliente abre a obra com uma data para receber
candidaturas; **no fim do prazo as propostas são entregues ao cliente todas em simultâneo**; há dois
ou três dias para esclarecer questões, com respostas rápidas do pintor; e depois o cliente tem que
escolher (ou não). O número de pintores é indiferente — dois ou cinco.

**A aplicação não fazia isto.** O cliente via cada proposta no instante em que era submetida, e não
era só no ecrã: `proposals_select` (migração de 19/10) autorizava-o a ler qualquer proposta que não
fosse rascunho. O primeiro pintor a entregar ficava com o preço à vista durante dias enquanto os
outros ainda orçamentavam; quem entrega no último dia levava vantagem, e os pintores aprendem isso
depressa. A concorrência deixava de ser cega por construção.

Decidido e construído (migração `entrega_simultanea`, aplicada à base real a 26/10/2026 com a versão
`20261026230114`):

- **A porta está na base de dados**, não no ecrã: `private.propostas_entregues` — o prazo acabou, ou
  o anúncio foi encerrado — entra em `proposals_select`, em `proposal_visible` (as linhas, senão o
  preço lia-se na mesma) e no lado do cliente de `proposal_messages_select`. O pintor vê sempre a sua.
- **A janela de esclarecimentos são 3 dias** (`DIAS_DE_ESCLARECIMENTO`, `src/domain/entrega.ts`), e o
  cliente **pode escolher a qualquer momento** durante ela: quem já decidiu não espera.
- **Prolongar o prazo só antes da entrega, ou sem propostas nenhumas** (`prolongar_prazo`). Depois de
  ver uma proposta, prolongar dava ao cliente vantagem sobre quem entrasse a seguir. Mínimo de três
  dias. O aviso aparece a três dias do fim quando há zero ou uma proposta.
- **`propostas_a_caminho`** devolve a contagem sem revelar nenhuma linha: sem ela o cliente não tinha
  número nenhum para decidir se prolongava.
- O gatilho `work_request_transition` continua a recusar alterações a um pedido publicado; abre-se-lhe
  uma porta estreita (só o prazo, só para a frente, só com a marca de transacção posta por
  `prolongar_prazo`), para que a verificação não possa ser saltada por uma escrita directa.

Duas consequências assumidas: os avisos de `SECURITY DEFINER` do Supabase passam de 36 para 38
funções (as duas novas, ambas com a verificação de quem chama na primeira linha); e, ao aplicar, as
duas obras que existem na base não perderam visibilidade nenhuma (uma tem o anúncio encerrado, a
outra não tem propostas).

**Em aberto:** o aviso ao pintor de que a janela de esclarecimentos abriu, e o lembrete ao cliente de
que ela acaba — é aí que encaixam as duas ferramentas do Pro decididas no mesmo dia (seguimento dos
orçamentos e cobrança do que está na rua).

## 26/10/2026 — "O meu Perfil": cartão na barra lateral, "Dados da entidade" em separadores, CAE e mudança de mail

Pedido do promotor, com cinco capturas de ecrã da app em produção (ainda sem o caderno de desenho,
ver entrada seguinte): a barra lateral passa a ter um cartão **"O meu Perfil"** — nome da empresa, não
o email, e só para contas de pintor ou fornecedor (uma conta é sempre uma só empresa destes dois
tipos, `allowedOrgKinds`) — e o que estava disperso pela ficha da entidade (o cartão "A sua entidade"
no Início, "Dados da entidade", "Equipa", "Documentos de verificação") reorganiza-se lá dentro.

**Onde ficou cada coisa.**
- `src/app/app/layout.tsx`: o rodapé da barra lateral troca "{email} / Ficha da empresa / Perfil" por
  um cartão só, com o nome da empresa (`organizations.nome`, agora também pedido na consulta de
  membros do layout) a ligar a `/app/organizacoes/{id}`. Conta de cliente puro (sem pintor nem
  fornecedor) mantém o email e "Perfil" de sempre — não lhe mexemos.
- `src/app/app/page.tsx` (Início): o atalho "A sua entidade [Abrir →]" para quem tem uma só entidade de
  pintor/fornecedor desapareceu — já está sempre visível no cartão da barra lateral, repetir ali não
  ajudava.
- `src/app/app/organizacoes/[id]/page.tsx`: **só para `kind === 'pintor' || 'fornecedor'`** (condomínio,
  administradora e particular ficam exactamente como estavam — a página serve cinco tipos de entidade
  muito diferentes, e tocar em código partilhado por todos era o risco maior deste pedido), três
  separadores novos (`LocalTabs`, estado em `?ver=`, mesma convenção de Orçamentos/Oportunidades):
  1. **Dados da entidade** — cartão novo (`EntityCardForm.tsx`, `parseEntityCard` em
     `src/domain/organization.ts`): nome da empresa, nome do gerente (grava em `profiles.nome`,
     reaproveitando o que `updateProfile` já fazia), telefone e **mail de contacto obrigatório** ("um
     mail pelo menos tem que estar registado", pedido do promotor). NIF e morada fiscal continuam só na
     página `/editar` — não duplicámos essa validação. Debaixo: a palavra-passe (`PasswordForm`,
     reaproveitado de `/app/perfil`) e a **mudança do mail de acesso** (ver abaixo).
  2. **Documentos** — era "Documentos de verificação"; subtítulo novo "Documentos para candidaturas a
     obras". Conteúdo (lista de documentos em falta, incluindo o alarme vermelho já registado como
     "em aberto" mais abaixo, upload) é o mesmo de sempre, só a casa mudou.
  3. **Equipa online** — era "Equipa"; nome e subtítulo mudam para não soar à equipa que vai à obra
     (queixa do promotor: "soava como se fossem os pintores"). Fica igual na lista/convites/InviteForm,
     mais um `<select>` por linha (`MemberRoleSelect.tsx`) que o proprietário usa para mudar o papel de
     um colega sem reabrir nenhum formulário, e um quadro no fim com o que cada papel pode fazer.
  As ligações rápidas que estavam no topo da ficha ("Ver oportunidades de obra" / "Gestão de obra" /
  "Referências de fornecedores" para o pintor; "Subscrição" / "Encomendas" / "Descontos a novos
  aderentes" para o fornecedor) foram removidas — já vivem na barra lateral (grupos "Ganhar
  obra"/"Vender" e o novo cartão), repeti-las na página era o que o promotor queria evitar.
  Os sítios que apontavam para `#documentos` (`Dossier.tsx`, `oportunidades/[id]/page.tsx`) passaram a
  apontar para `?ver=documentos`, que é quem agora selecciona esse separador.

**Mudar o papel de um colega era impossível — a RLS nunca teve essa política.** `org_members` só tinha
`select`/`insert`/`delete`; não havia maneira de a aplicação mudar o papel de alguém, com interface ou
sem ela. Nova política aditiva `org_members_update` (migração `20261026210000_cae_e_gestao_de_acesso`):
só o proprietário, nunca o seu próprio papel (para nunca ficar uma entidade sem proprietário por
engano — o `using` já exclui essa linha, sem erro), e nunca para `'proprietario'` (o `with check`
recusa e dá erro de RLS — só há um, atribuído no gatilho da criação; promover alguém é decisão à
parte, não uma troca aqui). Nova acção `changeMemberRole` em `src/app/app/actions.ts`: o `role` chega
em `FormData`, do navegador, e valida-se contra `MEMBER_ROLES` antes de tocar na base (regra 10 do
`CLAUDE.md`) — a política é quem decide de facto. Cinco testes novos em `supabase/tests/rls.test.ts`
("mudar o papel de um colega em 'Equipa online'") cobrem os quatro casos (proprietário muda; não muda
o seu próprio; não promove a proprietário; nem gestor nem estranho mudam nada).

**Simplificação deliberada, a confirmar com o promotor:** o pedido falava em "tipo de user: admin,
user" com uma caixa de verificação por acção ("criar orçamentos, enviar orçamentos, editar dados da
empresa, etc"). Construir esse quadro à parte, sem o ligar à RLS real, seria segurança de fachada —
pareceria controlar acesso sem controlar nada. Em vez disso, `ROLE_CAPABILITIES`
(`src/domain/organization.ts`) **lê-se directamente das políticas que já existem** (quem pode editar a
entidade, carregar documentos, orçamentar) e mostra-se como quadro de leitura; quem de facto muda
alguma coisa é a troca de papel acima, sobre os cinco papéis que já existiam (`proprietario, gestor,
financeiro, vendedor, leitor`), não um "admin/user" novo. Fica a confirmar se o promotor queria mesmo
um sistema de permissões por acção, independente dos papéis actuais.

**CAE da nif.pt, aviso não bloqueante.** A consulta ao NIF (`src/lib/nifpt.ts`) já trazia o código CAE e
a descrição da actividade na resposta da nif.pt — ficavam a cair fora. Agora `lookupNif` devolve-os, e
`createOrganization`/`updateOrganization` gravam-nos em `organizations.cae`/`cae_atividade` (colunas
novas, mesma migração; `updateOrganization` só escreve por cima quando a consulta de agora trouxe
valor novo — nunca apaga um CAE já conhecido só porque a nif.pt está temporariamente indisponível).
`caeElegibilidade`/`caeAviso` (`src/domain/organization.ts`): secção F da CAE-Rev.3 (divisões 41-43 —
construção de edifícios, engenharia civil, actividades especializadas onde vive a pintura, 43341) conta
como elegível; o resto, ou a falta de código, dá aviso **âmbar, nunca bloqueante** (regra 13 do
`CLAUDE.md` — "o CAE da actividade deste empreiteiro precisa de ser confirmado quanto a elegibilidade",
tal como o promotor pediu). Aparece no cartão "Dados da entidade" e, nos Orçamentos, juntou-se à banda
de aviso que já lá estava ("orçamentos por enviar") em vez de abrir uma segunda banda de fundo de cor —
nunca duas no mesmo ecrã (mesma regra 13).

**Mudar o mail de acesso, sem perder a conta a meio.** Nova acção `changeEmail`
(`src/app/entrar/actions.ts`, mesmo padrão de `setPassword`): chama
`supabase.auth.updateUser({ email }, { emailRedirectTo })`. A sessão continua a entrar com o mail
antigo até o link no mail novo ser aberto; `/auth/confirmar` (PKCE,
`exchangeCodeForSession`) já trata este tipo de link sem precisar de nenhuma alteração, e o gatilho
`sync_profile_email` (já em produção) mantém `profiles.email` ao dia nesse momento — é só aí que "o
antigo deixa de servir", nunca antes, tal como o promotor pediu.

**Em aberto: a migração não foi aplicada à base real.** `mcp__Supabase__apply_migration` foi recusado
pelo classificador automático desta sessão ("Production Deploy"). O ficheiro
`supabase/migrations/20261026210000_cae_e_gestao_de_acesso.sql` está escrito, corre limpo nos testes
(Postgres em memória, via `supabase/tests/rls.test.ts`) e `src/lib/database.types.ts` já foi actualizado
à mão com as colunas novas — mas até o promotor a aplicar no Supabase real, `organizations.cae`/
`cae_atividade` não existem na base de produção e a política `org_members_update` não está em vigor
ali: o cartão de CAE fica sempre "por verificar" e a mudança de papel falha. Aplicar com
`mcp__Supabase__apply_migration` (ou directamente no painel do Supabase) antes de confiar nestas duas
funcionalidades em produção.

## 26/10/2026 — O caderno de desenho do promotor como fonte do desenho: tokens, ícones, navegação a dois níveis

O promotor anexou `QuemPinta_Desenho_Interface.html`, um "caderno de desenho da interface" próprio —
sistema visual completo, navegação dos três perfis com rotas concretas, e quatro ecrãs inteiramente
desenhados (Início, Oportunidades, Gestão de obra·Hoje, Orçamentos) — e perguntou se isso encurtava o
trabalho. Respondido que sim, com um plano em quatro passos; autorização do promotor: "avança, sim".

**Cores funcionais novas, extraídas do caderno.** `border` (`#E1D9C6`) não chega para o contorno de um
campo (~1,4:1 sobre branco); o caderno resolve com `field` (`#827765`, 4,40:1). Acrescentados a
`globals.css`/`tailwind.config.ts`: `surface, field, selected, attention, attention-bg, error,
error-bg, info-bg`. `selected` nunca vai só — acompanha sempre outro sinal (barra lateral,
`aria-current`); `attention` é o que ainda se resolve, `error` o que já fechou, caducou ou foi
recusado (regra 13 do `CLAUDE.md`).

**Ícones trocados pelos do caderno.** `src/components/NavIcons.tsx` reescrito com os traços exactos do
caderno (`viewBox 0 0 24 24`, `stroke-width 1.8`) em vez do conjunto inventado numa sessão anterior.
Confirmado por `Grep` que nenhum ícone retirado (`IconClipboard, IconFlag, IconReceipt, IconDocCheck,
IconHardHat, IconCard, IconLink, IconTag, IconUsers, IconPercent`) era usado fora do ficheiro antes de
apagar.

**Navegação a dois níveis: "Grupo + destino chegam".** O caderno é explícito: nada de um terceiro
nível em flyout. `src/app/app/layout.tsx` reconstruído com os grupos do caderno por perfil —
Empresa de pintura (Dia a dia / Ganhar obra / Materiais), Cliente (um só grupo, "Acompanhar a obra"),
Fornecedor (Dia a dia / Vender / Adesões) — derivados dos tipos de entidade reais da conta (`kinds`,
`pintorId`, `fornecedorId`), não de um perfil único como o caderno idealiza (uma conta pode, no
modelo de dados actual, ser simultaneamente coisas que o caderno trata como perfis separados; os
`NavItem[]` são montados condicionalmente). O rodapé da barra lateral deixou de ser só o email e
"Sair": ganhou "Empresa e conta" (ficha da empresa, plano e subscrição, referências de fornecedores,
perfil), exactamente como o caderno pede para nunca ocupar o corpo do menu principal.

Os sub-níveis que a barra lateral tinha como filhos (Hoje/Equipa/Contas em Gestão de obra; Novo/Em
preenchimento/Enviados/Arquivo em Orçamentos; Quem contrata/Concursos em Obra pública) passaram a
**separadores locais dentro da página**, componente novo `src/components/LocalTabs.tsx`, ligados aos
`?ver=`/`?grupo=` que já existiam nessas três páginas — sem estado de cliente, um link partilhado abre
no mesmo sítio, mesma convenção dos orçamentos (25/10/2026).

**Contradição a confirmar pelo promotor: "Obra pública" volta a ser visível na barra.** O caderno
põe "Obra pública" como destino de primeiro nível em "Ganhar obra". Isto inverte directamente uma
decisão já registada no código a 23/10/2026 ("ninguém lhe dá a relevância que tencionavas e, de facto,
não tem"), que a tinha descido a filho. Segui o caderno, por ser a instrução mais recente e explícita
do promotor ("avança, sim" sobre este documento), mas isto não foi perguntado uma segunda vez — fica
marcado em comentário no código e aqui para confirmação.

**Urgência do prazo, função nova em `src/domain/request.ts`** (regra 2): `urgenciaPrazo` e
`fraseDePrazo`, puras e testadas (`request.test.ts`), usadas em Oportunidades para a banda de alarme
("X pedidos terminam hoje", regra 13 — uma só banda, no topo) e o texto por linha ("Termina hoje" /
"N dias restantes" / data simples), substituindo a data nua que lá estava.

**Decisão de âmbito, para não sobrevender o que foi feito:** os quatro ecrãs do caderno **não foram
portados ao pixel** para as páginas reais — a `Oportunidades.tsx`/`orcamentos/page.tsx` reais têm
lógica de negócio e dados que o protótipo não modela, e replicar classes/markup ao pixel arriscava
duplicar regras de negócio ou partir funcionalidade. Em vez disso, adoptaram-se os **princípios** do
caderno (uma só banda de alarme, aviso em texto nunca em fundo, classificação de urgência por prazo)
sobre os dados reais, em Início, Oportunidades e Orçamentos; `obras/Hoje.tsx` foi revisto e já estava
conforme. **Por fazer, deliberadamente fora do âmbito de hoje:** o padrão do caderno de "quatro acessos
fixos" no telemóvel (barra inferior fixa com 4 ícones + sobreposição "Menu") é uma peça estrutural
maior, não construída nesta sessão; e o resto da app, ecrã a ecrã, continua por migrar aos princípios
do caderno, um ecrã de cada vez, como sempre foi entendido.

Verificado antes de declarar feito (regras 7/8 do `CLAUDE.md`): `npm test` (806 testes, 1 skip),
`typecheck`, `lint`, `build` — os quatro a 0.

**Integrado a seguir, antes de enviar: outra sessão corrigiu em paralelo uma produção em baixo.**
Ao tentar enviar este trabalho, o `git push` foi recusado — havia um commit novo na branch
(`d265e6f`, sessão `session_01LERBKkzxPdnsdihp37Wrh8`) que uma sessão diferente tinha feito entretanto:
`icon` nos itens de navegação ia como **componente React** de `layout.tsx` (servidor) para `AppNav.tsx`
(cliente), e uma função não atravessa essa fronteira — rebentava em execução (nunca na compilação,
`ComponentType` é válido em TypeScript) e tirava **todas** as páginas da app do ar. A correcção troca o
ícone por um **nome em string**, resolvido do lado do cliente por um mapa `ICONES` em `NavIcons.tsx`.

Essa correcção foi escrita sobre o código **anterior** a este, que esta sessão tinha acabado de
substituir inteiramente (ícones, estrutura da barra). `git merge` resolveu sem conflito textual em
`AppNav.tsx`/`NavIcons.tsx`, mas o mapa `ICONES` resultante apontava para ícones que já não existiam
(removidos aqui mesmo nesta sessão) — teria sido um erro de tipo visível ao primeiro `typecheck`, não
outra produção em baixo, mas foi corrigido antes de chegar lá: o mapa `ICONES` ficou com os nomes dos
ícones novos (`casa, recibo, capacete, caixa, lupa, publico, documento, pessoas, percentagem,
mostrador, entrada, predio, balanca, calculadora, servidor`) e `layout.tsx` passou a pedir cada ícone
pelo nome, nunca pelo componente — o mecanismo da correcção, mantido; os ícones em si, os do caderno.
`npm test`/`typecheck`/`lint`/`build` confirmados a 0 depois do merge.

## 26/10/2026 — Três bugs da auditoria de UI/UX corrigidos, um deixado para o promotor

Continuação da auditoria desta tarde (ver entrada seguinte, "Barra lateral").

**`chefe_equipa` em vez de "Chefe de equipa" no ecrã Hoje da Gestão de obra** (`Hoje.tsx`): o campo
`funcao` chega da base em bruto (é o valor do `enum` `member_role` de `src/domain/worksite.ts`) e o
ecrã mostrava-o sem passar por `CREW_ROLE_LABELS` — o mapeamento já existia e já era usado noutro
ecrã (`obras/[id]/page.tsx`), só não tinha chegado aqui.

**"1 pedidos abertos a propostas" no Início** (`src/app/app/page.tsx`): singular/plural em falta no
contador de oportunidades. Corrigido com o mesmo padrão já usado três linhas acima, no mesmo ficheiro
(`${n} proposta${n === 1 ? '' : 's'}`).

**Encoding partido numa entidade do Mapa de Contratos Públicos — não corrigido, por bloqueio do
classificador.** `C?mara Municipal de Vila Nova de Gaia` (NIF 505335018) é um registo isolado em
`public.public_contracts` (1 de 2668) com um byte partido a substituir o "â". Não é um bug de código:
`mapa_contratos()` agrupa por NIF e escolhe o nome com `min()` entre as variantes do grupo — as
outras 258 linhas do mesmo NIF chamam-se "Município de Vila Nova de Gaia", mas o carácter `?` (byte
63) ordena-se antes de qualquer letra, por isso essa uma linha partida ganhava a escolha do nome
mostrado para o concelho inteiro. Also encontrada, sem tocar: uma terceira variante do mesmo NIF,
"CAMARA MUNICIPAL DE GAIA" (maiúsculas, sem acento) — não é encoding partido, é só outra forma do
mesmo nome; fica por decidir se vale uma limpeza maior ao nome das entidades em todo o ficheiro
dos 15 anos, à parte desta correção pontual.

A escrita (`update public.public_contracts set entidade_nome = 'Município de Vila Nova de Gaia'
where entidade_nif = '505335018' and entidade_nome = 'C?mara Municipal de Vila Nova de Gaia'`) foi
recusada pelo classificador automático desta sessão (`[Modify Shared Resources]`) — o mesmo padrão
já descrito na secção 6 do `ESTADO.md` para as migrações e a variável da Vercel. Fica para o promotor
correr, ou para uma sessão com o modo automático desligado.

Verificado antes de enviar os dois ficheiros de código: `npm test` (804), `typecheck`, `lint`,
`build` — zero.

## 26/10/2026 — Barra lateral: ícone por item, e primeiro passo da paleta de marca

Pedido do promotor, depois de uma auditoria de UI/UX a capturas de ecrã da app (sessão desta tarde):
"o design está todo rasca e mal feito... começando pela reorganização dos separadores do lado
esquerdo". A auditoria não encontrou só bugs (encoding partido no Mapa de Contratos Públicos,
`chefe_equipa` por traduzir em Equipa — ambos já geridos à parte) mas uma falta de identidade visual:
nenhum ecrã tinha cor nenhuma que falasse de pintura.

**Ícone por item, traço próprio (sem dependência nova).** `src/components/NavIcons.tsx` — 20 ícones
desenhados à mão no mesmo espírito do prédio do `BrandMark.tsx` (`viewBox 0 0 24 24`, traço 1.6,
`currentColor`, sem biblioteca de terceiros). Um rolo de pintura para Catálogo de materiais, um
capacete para Gestão de obra, uma bandeira para Ganhar obra — não ícones genéricos de qualquer SaaS.
`NavItem` ganhou o campo opcional `icon` (`src/components/AppNav.tsx`).

**A pergunta sobre a paleta, feita e respondida.** `docs/DECISOES.md` de 25/10/2026 tinha deixado em
aberto, para o promotor, se a paleta de marca nova (`--ink #1F3D2E`, `--cream #F6F2E9`, laranja
`#E07B39`/`#C7601F`, já na página de Planos) devia migrar para o resto da app, ou se a página de
Planos ficava diferente das outras. Perguntado antes de tocar em código (`AskUserQuestion`):
**começar a migração pela barra lateral** — é a superfície mais visível, e a decisão fica reversível
sem arrastar o resto da app atrás de si. `BrandMark.tsx` ganhou a prop `tone` (`'tinta'` por omissão,
nas outras 6 páginas que o usam; `'marca'` só na barra lateral) em vez de reescrever o componente —
as outras páginas não mudam de cor por causa disto.

**Onde o laranja entra, e só aí:** o crachá de avisos por ler e o ícone do item ativo. O resto da
barra fica em creme + verde-escuro (fundo do item ativo em creme, texto em ink), para não gastar o
único acento em toda a parte — o "gastar a ousadia num só sítio" já era o problema a evitar. Os
rótulos de grupo (`Área de trabalho`, `Recursos`) mantêm o estilo de "eyebrow" (maiúsculas, traço
largo) só recoloridos para a paleta nova — é orientação estrutural persistente, não um título de
secção de marketing, por isso não se mexeu na classe `.eyebrow` partilhada pelo resto da app.

**Verificado antes de declarar feito** (regras 7/8 do `CLAUDE.md`): `npm test` (804 testes, 1 skip),
`typecheck`, `lint`, `build` — os quatro a 0. Pré-visualização visual à parte, com o CSS a sério do
projeto compilado por `npx tailwindcss` e screenshot por Playwright contra um ficheiro isolado (nunca
dentro do repositório) — confirma contraste e alinhamento antes de mostrar ao promotor.

**Por fazer, fora do âmbito de hoje:** o resto da aplicação continua na paleta antiga (tinta/sálvia).
Migrar mais ecrãs é decisão à parte, a pedir sempre que chegar a vez de cada um — não decidida aqui
de uma vez por todas.

## 26/10/2026 — Letra maior em todo o lado, e a Gestão de obra refeita

Três coisas, pedidas pelo promotor na mesma noite.

**A Gestão de obra estava uma confusão e não funcionava.** O ecrã de uma obra tinha oito separadores
horizontais e o ecrã de entrada era uma lista de obras com um cofre de documentos por cima. Refeito
segundo o protótipo do promotor: **Hoje** abre na obra em curso (com selector, para quem anda em
três), com três acções grandes — registar o dia, fotografar, despesa —, a equipa do dia com as horas
por confirmar, o que está parado à espera de decisão, e as fases como régua. **Contas** deixa de ser
uma lista de valores sem hierarquia: o resultado previsto é o título, e por baixo explica-se de onde
vem. Um número de margem que não se percebe é um número em que não se confia.

Havia também um defeito a sério na barra lateral: os separadores de dentro eram desenhados **depois
da lista toda do grupo**, o que punha Hoje/Equipa/Contas debaixo de "Referências de fornecedores".

**"As pessoas indicam que tem letras muito pequenas."** Três agentes auditaram o site em paralelo —
tipografia, aproveitamento do espaço, coerência visual — e o que encontraram vai além da queixa:

- O corpo da aplicação eram **14px** e a escala tinha **26 degraus** distintos, de 9px a 42px. Passa
  a seis: 13 / 15 / 17 / 20 / 26 / 34, com 17px de corpo.
- **154 de 201 campos de formulário estavam abaixo de 16px.** Abaixo desse limiar o Safari do iPhone
  **dá zoom a cada toque** — exactamente quem preenche um levantamento numa obra. Resolvido pela
  mesma linha que subiu o corpo.
- `text-slate-400` dava **2,33:1** de contraste e era usado onde o significado importa ("não
  elegível", "faltou"). Substituído em todo o lado.
- Branco sobre `terracota` — o botão mais visto do produto — dava 4,42:1. Escurecido para 5,98:1.
- O contorno dos campos dava **1,40:1** quando a norma pede 3:1 para um controlo.
- **14 classes de cor não existiam** (`tinta-300`, `tinta-400`, `tinta-800`): o Tailwind não as gera,
  a cor não pinta e o estado de rato não acontece. A rampa foi completada.
- `max-w-[70ch]` não dá 70 caracteres, dá **91** — `ch` é a largura do `0`, não a média.

E o espaço: a área útil passa de 1108 para 1588 px num monitor de 1920, os cartões deixam de ter 24px
de margem interior fixa no telemóvel, e as listas principais passam a duas colunas em ecrãs largos.
O artigo, que o promotor deu como exemplo de mau aproveitamento, passa a ter os números num painel
ao lado do texto que os explica, em vez de meio ecrã vazio.

**A regra de alarme e a escala tipográfica subiram para o `CLAUDE.md`** (regras 13 e 14). A de alarme
vivia num comentário de um ficheiro secundário e era violada em oito ficheiros — incluindo o que a
escreve. Fica uma contradição por decidir: a entrada de 23/10/2026 mandou pôr o aviso de documento em
falta a vermelho, e a regra reserva o vermelho para o que já fechou ou caducou.

**O mapa de contratos deixa de ser o destaque da página de preços.** Razão do promotor, e tem-na:
são cerca de 977 lugares de convidado por ano em todo o país. Mesmo com execução perfeita, a maior
parte dos subscritores nunca verá um convite atribuível a isto, e o retorno não é imediato nem
garantido. Prometê-lo à cabeça era montar a subscrição sobre o que ela menos consegue entregar. Passa
a estar a seguir às funcionalidades de todas as semanas, a dizer o que não promete, e a ligar ao
artigo. O destaque passa para "Fique com mais do que ganhou".

**Acesso de cortesia** dado a `nunomarujo+teste4@gmail.com`: plano Pro activo até 2030, sem subscrição
no Stripe associada, a zero euros — não cobra, não factura e a tarefa semanal não lhe toca.

## 26/10/2026 — O mapa soma-se na base, e o que os dados dizem sobre o clube fechado

Feita a carga dos quinze anos, o ecrã do mapa trazia os 9 393 contratos em bruto para somar depois de
os receber: **5,7 MB por abertura de página** para quem não tem distritos escolhidos, 2 MB para quem
tem só Lisboa. Nada se perdia — verificado, não há tecto de linhas configurado na base —, mas é
desperdício e cresce todos os anos. Trimar colunas dava 4,4 MB; o peso está nas linhas.

Passa a haver **`mapa_contratos`**, uma função `security invoker` que devolve as quatro peças do ecrã
em cerca de 20 kB. O que é contagem foi para lá; o que é juízo ficou onde estava:

- **A ordem** (frequência antes de valor) continua em `src/domain/mapaContratos.ts`, sobre as poucas
  centenas de linhas já somadas. É decisão de produto, não contagem.
- **As duas definições que são juízo** — o convite a uma empresa só, e o convite sem lista publicada —
  passaram a viver no SQL, o que é tensão com a regra 9 do CLAUDE.md. A mitigação são oito testes em
  `supabase/tests/`, que correm a função numa base em memória e falham se a definição divergir.

**O que os dados dizem, e que contraria o que eu assumia.** Media-se se há um clube fechado de
convidados. Não há, nacionalmente: das 1 235 empresas convidadas desde 2022, **828 foram-no uma única
vez**, e dentro de cada entidade que convida com regularidade a mais chamada fica em média com apenas
**24%** dos convites. As entidades rodam.

Mas há excepções fortes e **locais**: em Vila Franca de Xira, 21 dos 33 convites foram a uma empresa
só. É essa diferença que interessa ao pintor — não a média do país, que não é onde ele trabalha. O
ecrã passa a assinalar as entidades que concentram (`concentraConvites`), e a página de preços tem de
deixar de insinuar um círculo fechado, que os dados não sustentam.

**Outras duas afinações do ecrã:** entidades com menos de três contratos deixam de dizer "costuma
pagar" (uma ocorrência não é hábito), e o mapa mostra os últimos cinco anos por omissão, com ligação
para a série desde 2012 — uma câmara que contratava em 2013 e parou aparecia no topo por número de
contratos e não diz nada a quem quer bater à porta hoje.

**O limite que o promotor identificou, e que fica registado:** são cerca de **535 convites por ano em
todo o país**. Mesmo com execução perfeita — a plataforma a preparar tudo e o pintor só a assinar e
enviar — a maioria dos subscritores nunca verá um convite atribuível a esta ferramenta, e o retorno
não é imediato nem garantido. **O valor da subscrição não pode assentar aqui.** A página de preços dá
hoje a esta funcionalidade o lugar de destaque, e isso tem de mudar.

## 25/10/2026 — Quatro linhas repetidas deitavam fora o ano inteiro

A primeira carga correu e devolveu 500. Gravou 4 087 contratos de 2019 a 2025 — e **zero de 2026**,
que é o ano que interessa. O painel do Vercel não mostrava razão nenhuma: estado 500 e registos vazios.

A causa estava no ficheiro, não no código do carregamento: **o ficheiro do ano em curso traz quatro
contratos duas vezes** (482 linhas, 478 identificadores), e os anos já fechados nenhum. A gravação usa
o identificador do BASE como chave única, e o Postgres recusa a instrução inteira quando a mesma chave
aparece duas vezes nela — *ON CONFLICT DO UPDATE command cannot affect row a second time*. As quatro
linhas vinham no mesmo lote de 200, e levaram o ano todo atrás.

Duas correcções:

- **`semRepetidos`** em `src/lib/contratosBase.ts`, aplicado a cada lote antes de gravar. Comparadas as
  duas cópias de cada um dos quatro, são iguais campo a campo — não se perde nada. Fica a última.
- **A tarefa passa a escrever o resultado nos registos**, e não só a devolvê-lo. Quem a dispara pelo
  painel vê o estado mas não o corpo da resposta; foi preciso ir à base de dados perceber que ano tinha
  falhado, o que não pode voltar a acontecer.

Aviso para quem lá voltar: o 500 continua a aparecer quando **um** ano falha, mesmo que sete entrem.
É deliberado — um ano em falta merece atenção —, mas lê-se nos registos qual foi, não no código.

## 25/10/2026 — O mapa de contratos públicos, e um número corrigido na página de venda

**O ecrã.** `Obras públicas` passa a `Mapa de contratos públicos`, com duas vistas no segundo nível
da barra: *Quem contrata*, por omissão, e *Concursos abertos*, à parte. A inversão é a decisão: a
lista de concursos anunciados era a secção toda, e é a minoria do mercado.

Por entidade, o mapa diz quantas vezes contratou, quanto costuma pagar (a mediana, não a média — uma
obra grande desloca a média e mente sobre o que a entidade paga de hábito), quantos contratos foram
por convite, e os concelhos. As entidades vêm ordenadas por **frequência** e não por valor: ao pintor
interessa a quem vale a pena bater à porta, e isso mede-se em quantas vezes contrata, não numa obra
grande que apareceu uma vez. Depois, quem costuma ser convidado — contando convites e não obras
ganhas, que é a lista em que vale a pena entrar. E, à cabeça, a própria empresa: quantos convites
recebeu, quantos ganhou e quem a convidou, procurada pelo NIF e nunca pelo nome.

**O número que estava errado.** A página de preços dizia *"dois terços foram por convite directo, e
em 58% desses casos foi convidada uma única empresa"*. Os 58% são verdadeiros noutra pergunta:

- 482 empreitadas de pintura em 2026, de 199 701 contratos; 63,6 M€.
- 326 (68%) por ajuste directo ou consulta prévia, sem anúncio.
- Desses 326, o portal **não publica a lista de convidados em 113**. Publica em 213.
- 124 convidaram uma empresa só — **58% dos 213 com lista**, mas **38% dos 326**.

A frase dizia "desses casos" referindo-se aos 326, com a conta feita sobre 213. Fica *"mais de um
terço"*, que é o número que não precisa de rodapé. Um número verdadeiro na base errada engana quem o
lê tanto como um inventado, e numa página de venda isso não passa. Há um teste a impedir que os 58%
voltem (`painterPlan.test.ts`), e os comentários da migração e do classificador foram corrigidos —
era de lá que o número saía de cada vez.

**O carregador, verificado ao vivo.** Contra o ficheiro do próprio dia: 482 linhas, 17 segundos,
208 MB de memória. Fica em `contratosBase.live.test.ts`, fora do `npm test` e atrás de
`CARGA_AO_VIVO=1`, porque descarrega 44 MB. Existe por uma avaria silenciosa: `ficheiroDoAno` procura
o recurso cujo título é exactamente `contratos<ano>.zip` — se o portal lhe mudar o nome, devolve
`null`, a tarefa semanal não carrega nada e a tabela fica como estava sem ninguém dar por isso.

**O que falta.** A tabela está vazia: a carga ainda não correu uma vez (Vercel → Cron Jobs →
`/api/cron/contratos-publicos`). Até lá o ecrã mostra o estado vazio, que explica a origem dos dados
em vez de parecer avariado.

## 25/10/2026 — Primeira entrega da Gestão de Obra

Os seis pontos da proposta revista, construídos. O que mudou em cada um, e porquê.

**O dia confirma-se num toque.** O ecrã abria com a equipa em lista e botões de mais e menos por
pessoa — para um dia normal, uma lista inteira para não mudar nada nela. Passa a abrir com o dia em
palavras e um botão. Quem tem uma excepção carrega em Alterar. Depois de gravado diz "Dia registado"
e oferece Corrigir, em vez de convidar a gravar por cima sem se dar por isso.

**O dia de uma pessoa soma-se em todas as obras.** O limite de 24 horas era por linha, o que deixava
a mesma pessoa com um dia inteiro em dois sítios. Um dia repartido continua a passar; um dia
impossível não, e a recusa diz onde estão as outras horas.

**Hoje, Equipa e Contas** no segundo nível da barra, como nos orçamentos. Equipa só passou a ser
possível depois de a equipa pertencer à empresa.

**A despesa são dois campos:** o documento e o valor. Vai para um cofre próprio e não para o da
obra — o da obra é legível pelo cliente, por desenho, e uma factura traz os preços a que o pintor
compra. Misturá-los dava ao cliente a margem do fornecedor.

**O custo por hora tem data** e **o limiar anual atravessa obras**, ambos resolvidos pela mudança de
fundo: `painter_people` é a pessoa e `worksite_members` a atribuição dela a uma obra.

**O que ficou deliberadamente de fora**, e consta da proposta: a voz, a leitura automática de
facturas, o trabalho sem rede, as contas de trabalhador, os cinco estados de material, a imputação a
fases e a barra inferior no telemóvel.

## 25/10/2026 — A equipa pertence à empresa, não à obra

Primeira peça da proposta revista de Gestão de Obra, e a que destranca as outras.

Até aqui, uma pessoa numa obra era uma linha de `worksite_members` com `worksite_id` obrigatório: a
mesma pessoa em duas obras eram **duas fichas com identificadores diferentes**. Isso fazia três
estragos ao mesmo tempo.

1. O limiar das 100 horas anuais de trabalho suplementar é por trabalhador e por ano civil. Com uma
   ficha por obra, quem andava em três obras nunca lá chegava em nenhuma, e o custo saía por baixo.
2. O custo por hora tinha de ser escrito outra vez em cada obra, e divergia.
3. Não havia "as pessoas da empresa", só "as pessoas desta obra" — e sem isso não há separador de
   equipa nenhum.

A partir daqui, `painter_people` é a pessoa e `worksite_members` é a **atribuição** dela a uma obra.
As fichas que já existiam foram juntas por empresa e por nome.

**O custo por hora passa a ter data.** `painter_person_rates` guarda cada valor com o dia em que
passou a valer, e `custoHoraEm` devolve o que valia na data do trabalho: um aumento não reescreve o
custo das obras já feitas. Sem custo anterior à data devolve `null`, e **`null` não é zero** — é uma
lacuna que as contas têm de assinalar em vez de fingirem que o trabalho foi de graça.

O custo por hora é salário: as políticas de acesso fecham-no à empresa, pela mesma lógica da regra 13.

## 25/10/2026 — A página de planos lidera com a poupança, e ganha a paleta da marca

Três ajustes pedidos pelo promotor, com o desenho do site como referência.

**O número grande passa a ser a poupança.** A faixa no topo mostrava "Comissão hoje 5 400 €, 18%"
em corpo 26, logo à entrada — exactamente o contrário do que a reescrita se propunha fazer, que era
tirar a percentagem da frente. Fica uma frase só: **Poupa 1 500,00 €**, e os 18% e 13% em texto
pequeno por baixo. A percentagem é a mecânica; os euros é que são o argumento.

**A etiqueta "Por lançar" volta a cada item.** Tinha-a tirado por se repetir com o cabeçalho do
grupo. Numa página de vendas essa repetição paga-se: uma promessa por cumprir tem de estar marcada
onde é lida, não três linhas acima.

**A estatística dos dois terços foi verificada e fica.** Não é suposição: saiu da análise do ficheiro
"Contratos Públicos — Portal Base — IMPIC" (dados.gov.pt, domínio público), sobre os 199 701
contratos de 2026. Das 482 empreitadas de pintura, fachadas e isolamento, 326 foram por ajuste
directo ou consulta prévia — 68%. Das 173 com lista de convidados publicada, 98 tinham uma única
empresa convidada. O que ainda não existe é a funcionalidade, e por isso o item está marcado.

**A paleta da marca entra, exacta.** `--ink #1F3D2E`, `--cream #F6F2E9`, `--orange-deep #C7601F` e as
restantes, em `:root` e no tema do Tailwind como `marca`. Não são aproximações da paleta antiga: a
aplicação usava um petróleo (`#173f42`) e a marca é um verde-escuro. O tipo de letra já era Inter.

**Consequência, e é uma decisão por tomar:** a página de planos deixou de condizer com o resto da
aplicação, que continua na paleta do protótipo v05. Ou se migra tudo, ou fica uma página diferente
das outras. Isto é do promotor.

## 25/10/2026 — Os orçamentos arrumados em três estados, e o aviso de que ficaram por enviar

Pedido do promotor, e a razão dele é a que interessa: **um orçamento preenchido e nunca enviado
parece feito**. O botão de dar como enviado fica no fim da página do orçamento, e o pintor sai de lá
convencido de que tratou do assunto. Perde a obra por não ter carregado num botão.

A secção divide-se em **Novo orçamento** e **Orçamentos feitos**, e os feitos em três: **em
preenchimento**, **enviados** e **arquivo**. Os separadores vivem no endereço, sem estado de cliente,
e um link partilhado abre no mesmo sítio.

**Onde ficam, e porquê isso deu uma volta.** À primeira, puseram-se numa coluna à esquerda da página.
O promotor corrigiu: a aplicação já tem uma barra de navegação à esquerda, e uma segunda coluna ao
lado dela são duas barras a competir pelo mesmo papel. Os estados passaram para dentro da barra que
já existe, por baixo de "Orçamentos", visíveis só quando se está lá dentro. A navegação ganhou um
segundo nível (`NavItem.children`), que serve qualquer secção que venha a precisar.

O arquivo são os ganhos e os perdidos: o orçamento já cumpriu o que tinha a cumprir. Não foi preciso
estado novo nem migração.

**O aviso** aparece em qualquer dos separadores, porque é a coisa que não pode passar despercebida.
Só conta um orçamento com linhas e com valor, parado há três dias ou mais: um rascunho aberto e
abandonado no primeiro ecrã é uma desistência, não um esquecimento, e avisar sobre ele seria ruído.

**O que se pode apagar.** Um rascunho e um não ganho, sim. Um enviado não — é a prova do que foi
proposto ao cliente, e para o tirar da frente existe o "não ganhei". Um ganho também não: deu origem
a uma obra, e apagá-lo deixava-a sem princípio. O estado lê-se da base, nunca do navegador (regra 10),
e a recusa explica porquê em vez de esconder o botão.

**Por fazer, a seguir:** o separador de Agenda, que reúne isto com os documentos a caducar e as
adendas à espera de resposta. Ficou decidido ser **um só** e não dois (agenda e lembretes): são a
mesma pergunta — o que tenho de fazer — e dois sítios obrigariam o pintor a verificar ambos.

## 25/10/2026 — A página de planos passa a falar da dor, e o convite entra como promessa maior

Reescrita segundo a especificação preparada noutra sessão, com três desvios, todos por causa do que
se mediu nos contratos públicos nesse mesmo dia.

**Como ficou.** Cada título deixou de nomear a funcionalidade e passa a nomear o que custa ao pintor:
"Nunca mais perca uma obra por um documento caducado", "Já fez trabalho a mais e não lhe pagaram?".
Os números crus — 18%, os cinco pontos percentuais — saíram da frente e vivem atrás de "+ saber
mais", que é `<details>` em CSS puro: estado por item, rótulo a trocar para "Mostrar menos", sem
JavaScript de cliente. Os benefícios do Pro estão separados em "Já disponível" e "A chegar em breve",
e cada um foi confirmado em produção antes de ser posto de um lado ou do outro.

**Desvio 1: entra um benefício que a especificação não tinha.** Dois terços das obras públicas de
pintura nunca são anunciadas — a entidade convida directamente. É a maior promessa que a plataforma
pode fazer e muitos pintores nem sabem que o mercado funciona assim, por isso o título explica antes
de prometer e o detalhe traz os números medidos: 401 empreitadas em 2026, 55,2 M€, dois terços por
convite, e 57% desses com uma única empresa convidada. Tem moldura própria, por ser a única coisa na
página que nenhum concorrente oferece.

**Desvio 2: as Obras Públicas ficam em "a chegar", não em "já disponível".** O ecrã está construído e
a tabela de concursos está vazia. Enquanto não houver dados lá dentro, prometê-las como feitas seria
mentir ao primeiro subscritor pago.

**Desvio 3: a etiqueta "Por lançar" por item saiu.** O cabeçalho do grupo já diz a mesma coisa, e nos
títulos longos a etiqueta partia para a linha seguinte. Vê-se a renderizar a página; não se vê nos
testes.

## 25/10/2026 — O preço de lançamento passa a ser oferta de lançamento

Decisão do promotor. Os 30 €/mês e 250 €/ano mantêm-se, mas deixam de ser "um preço mais baixo
porque falta lançar coisas" e passam a ser **oferta de lançamento** contra o preço normal, que é
anunciado ao lado: 50 €/mês e 500 €/ano, riscado.

A razão de ser é outra desde hoje. As funcionalidades estão no ar; o que ainda não existe é massa
crítica de pedidos na plataforma, e sem ela o desconto de comissão vale pouco na prática. A oferta
compensa isso, e quem subscrever durante o lançamento mantém o preço enquanto não cancelar — a
assinatura guarda a versão de preços que aplicou (regra 3).

## 25/10/2026 — O plano Pro vendia quatro coisas e só reservava uma

Ao ir avançar no que a página do plano dizia estar "Por lançar", verificou-se que estava tudo no ar
— tinha sido construído nesse mesmo dia. O problema era o inverso do anunciado: das quatro
funcionalidades vendidas como Pro, só as Obras Públicas verificavam a subscrição. Um pintor no plano
gratuito já tinha o cofre de documentos, as adendas, as ferramentas de obra, e já exportava
orçamentos com o logótipo dele e sem marca de água — exactamente o que o promotor tinha dito que
devia ser do plano pago.

Não havia subscritor real nenhum, por isso ninguém perdeu nada ao fechar.

**Passa a ser exclusivo do Pro** (decisão do promotor):
- **Orçamento com marca própria.** No plano gratuito o documento sai na mesma — orçamentar e entregar
  ao cliente nunca se fecha —, mas com a marca Quem Pinta.pt. O aviso aparece antes de imprimir, não
  depois, para ninguém entregar ao cliente um documento com a marca errada sem saber.
- **Cofre de documentos com aviso de validade.** Carregar documentos continua aberto, porque é o que
  a plataforma exige para verificar um pintor; o que é do Pro é o cofre consolidado com os avisos.

**Fica aberto a toda a gente, de propósito:**
- **Trabalhos a mais.** Fechá-los tiraria margem registada à plataforma, que é o contrário do que se
  quer.
- **Ferramentas de gestão de obras.** São o hábito diário que traz o pintor cá. Fechadas, ele não
  entra — e o plano vende-se a quem entra.

A resposta à pergunta "isto é do Pro?" passa a viver num sítio só, `FUNCIONALIDADES_PRO` e `temPro`
(regra 2). Era a falta disso que deixava três ecrãs a responder de maneira diferente.

**Em aberto:** o preço de lançamento (30 €/mês, 250 €/ano) era justificado por as funcionalidades
ainda não estarem no ar. Estão. A página deixou de o prometer, mas a decisão de subir para o preço de
tabela — ou de manter o de lançamento enquanto a plataforma não tiver massa crítica de pedidos — é do
promotor e está por tomar.

## 25/10/2026 — O preço do plano Pro é sem IVA

Decisão do promotor. Os 30 €/mês e 250 €/ano são **sem IVA**: cobra-se 36,90 € e 307,50 €, e a
Relevante Planeta recebe o preço anunciado por inteiro.

A alternativa era o preço ser com IVA incluído, e nesse caso a empresa receberia 203,25 € por cada
subscrição anual e entregaria 46,75 € ao Estado. Como quem subscreve é sempre uma empresa de pintura
com contabilidade organizada, o IVA é dedutível para ela: paga mais, deduz, e o custo real não muda.
A diferença era toda da plataforma. É também a convenção que as subscrições de fornecedores já
seguiam, pelo que a aplicação fica coerente consigo mesma.

Encontrado ao testar o pagamento: a página do Stripe não mostrava linha de IVA nenhuma, porque
`STRIPE_TAX_RATE_IVA` nunca foi configurada. O código tratava-a como opcional, e isso era o pior dos
desenhos: sem taxa, o Stripe cobrava 250 € limpos e `subscriptionInvoice` extraía-lhe o IVA de
dentro — a fatura ficava correcta e a receita desaparecia 23%, sem erro nenhum à vista.

A taxa passa a ser **obrigatória**: sem ela a adesão recusa com uma mensagem, em vez de cobrar mal.
Mais vale não haver subscrição do que haver uma que custa 23% sem ninguém perceber.

Nos ecrãs, o preço aparece sempre com "+ IVA" e o total com IVA é dito antes de se sair da página,
para que ninguém chegue ao Stripe e veja um valor diferente do que leu.

## 25/10/2026 — Um cancelamento não se desfaz a si mesmo

Ao testar o cancelamento, a conta ficou num estado impossível: `estado: ativa` **com**
`cancelada_em` preenchido. Não se conseguia nem cancelar nem voltar a aderir — a adesão respondia
"Já tem o plano Pro activo" e o ecrã, esse, já não mostrava plano nenhum.

A causa: cancelar marca `cancel_at_period_end` no Stripe, onde a subscrição **continua `active`** até
ao fim do período pago. O Stripe responde com `customer.subscription.updated`, o nosso webhook lia só
o `status`, e escrevia "ativa" por cima do cancelamento que o tinha provocado. O cancelamento
desfazia-se a si mesmo, meio segundo depois.

O webhook passa a ler `cancel_at_period_end` como cancelamento. A data de cancelamento é a primeira,
não a de cada aviso, e um cancelamento desfeito no Stripe limpa-a. Só o plano Pro cancela ao fim do
período, por isso as subscrições de fornecedores não tinham este problema.

Isto destapou duas lacunas no ecrã, ambas corrigidas:

- **Não dizia o que se estava a pagar.** Dizia "Plano Pro activo" e mais nada: nem a periodicidade,
  nem o valor, nem a data da próxima cobrança. Nem o próprio subscritor conseguia ver quanto lhe era
  debitado sem abrir o Stripe. Quem paga tem de poder ver isso no sítio onde subscreveu.
- **Oferecia cancelar uma subscrição já cancelada.** O botão seguia o desconto, que continua em vigor
  até ao fim do período pago; o que faltava oferecer era voltar a aderir.

A leitura destes estados passou a viver numa função pura, `situacaoDe` (regra 2), porque havia três
definições diferentes de "activa" espalhadas pelo ecrã, pela adesão e pelo webhook — e era a
divergência entre elas que produzia o estado impossível.

## 25/10/2026 — A periodicidade que vai para a fatura é a que o Stripe cobrou

O primeiro pagamento de teste destapou duas coisas, uma delas séria.

O webhook do Stripe estava bem configurado: os quatro eventos ligados, `invoice.paid` entre eles,
entregue com 200. O pagamento não ficou registado porque o evento chegou às 14:43:24 e a correcção
que o lia no sítio certo só entrou em produção às 14:45:59 — dois minutos depois. Não havia nada a
corrigir no Stripe.

A séria foi outra. A linha da subscrição dizia "mensal, 30 €" e o Stripe tinha cobrado "anual,
250 €". Uma adesão mensal abandonada a meio ficava em `por_pagar` e era reaproveitada pela adesão
anual seguinte **sem lhe escrever a periodicidade nova**. O valor errado não ficava só no ecrã: era
o que `src/lib/invoicing.ts` punha no descritivo do documento fiscal. Uma fatura emitida com a
periodicidade errada é um erro de contabilidade, não de interface.

Corrigido nos dois lados:
- `subscribePro` **não** reescreve a linha que reaproveita: a política de acesso só deixa o pintor
  cancelar a sua própria linha, e é isso que o impede de a pôr activa ou de lhe mudar o preço sem
  pagar. Tentar reescrevê-la dava "Não foi possível registar a adesão". A linha por pagar é só uma
  intenção; o valor cobrado sai de `PRECO_ATUAL` no servidor, nunca dela.
- O webhook, que é a autoridade, grava a periodicidade dos metadados da sessão paga e o preço da
  versão que a assinatura guardou (`precoDe`, regra 3 — a versão fica presa à assinatura).

`isPeriodicidade` e `precoDe` passaram para `src/domain/painterPlan.ts` (regra 2). `precoDe` devolve
`null` numa versão desconhecida, em vez de gravar um preço inventado em silêncio.


## Decididas pelo promotor

| Data | Tema | Decisão |
| --- | --- | --- |
| 18/10/2026 | Comissão | 3% do valor sem IVA, mínimo 150 €, sem teto; IVA acresce; paga pelo pintor |
| 18/10/2026 | Garantia do cliente | 3% do valor sem IVA, depositada depois da aprovação do condomínio |
| 18/10/2026 | Adiantamento de adjudicação | Depositado com a garantia, se a proposta o previr; guardado até à assinatura |
| 18/10/2026 | Momento da comissão | Gerada na apresentação, definitiva na assinatura |
| 18/10/2026 | Ordem de assinatura | O cliente assina a minuta primeiro; o pintor assina depois de pagar o fee |
| 18/10/2026 | Prazo do fee | 8 dias corridos; conta a receção na conta |
| 18/10/2026 | Perda das garantias | Só a parte culpada perde a sua; a plataforma nunca fica com as duas |
| 18/10/2026 | Papel da plataforma | Termina na assinatura das duas partes; depois só guarda prova |
| 18/10/2026 | Assinatura eletrónica | Chave Móvel Digital é suficiente |
| 18/10/2026 | Fotografias | Só servem para o volume 3D não reconhecível; pormenores só se não identificarem o prédio |
| 18/10/2026 | Volume 3D e fotografias | O volume é gerado dos dados do prédio (pisos, fachadas, varandas), nunca de fotografias. Fotografias gerais ficam privadas; as de pormenor só chegam aos pintores depois de revisão humana pela equipa da plataforma. Metadados (GPS, aparelho) retirados de todas |
| 19/10/2026 | Materiais certificados | Facultativo no orçamento: tipo de material e produto concreto do catálogo, com características, ficha técnica, preço de mercado, preço para pintores com o desconto do fornecedor para a área da obra, entrega por concelho e contactos. O produto escolhido entra no contrato; o fornecedor confirma a venda e a entrega e o cliente vê a confirmação |
| 19/10/2026 | Descontos dos fornecedores | Por produto, tipo ou catálogo inteiro, com escalões de área da obra; a app aplica o melhor desconto para a área orçamentada |
| 19/10/2026 | Ferramentas de obra | Depois da assinatura, o pintor tem um separador discreto com materiais e encomendas, equipa e horas, cronograma, custos e tranches. Dados internos do pintor; a plataforma não intervém na execução |
| 19/10/2026 | Avaliações | O cliente avalia o pintor e pode alterar mais tarde; o pintor avalia o fornecedor a quem comprou e pode alterar |
| 19/10/2026 | Percurso v2 | Escolha preliminar → caução → comissão → apresentação → adiantamento → assinaturas → devolução da caução (ver `MODELO.md`) |
| 19/10/2026 | Licenças camarárias | O anúncio diz se há ocupação da via pública; o pintor obtém as licenças dos trabalhos (incluindo via pública) e, se prevista, a proposta tem linha de licenças; licenciamento especial (vãos, fachada) é do cliente |
| 19/10/2026 | Parecer jurídico | Aplicado o que não muda o modelo (ver `docs/advogado/Parecer_2026-10-19.md`); a ordem da apresentação, o mínimo da caução e a política de conservação aguardam decisão |
| 19/10/2026 | Habilitação | A proposta só é submetida com alvará ou certificado IMPIC validado suficiente para o valor (decisão da sessão, a confirmar pelo promotor) |
| 18/10/2026 | Código existente | O protótipo v0.5 é referência funcional; a app é escrita de raiz |
| 18/10/2026 | Stack | Next.js, TypeScript, Postgres na UE, parceiro de pagamentos autorizado |
| 18/10/2026 | Base de dados | Projeto Supabase "Paint it" na organização mar-nordico, região eu-west-1 |
| 18/10/2026 | Entrada | Link por email, sem palavra-passe |
| 18/10/2026 | Administradoras | Uma administradora gere vários condomínios; cada condomínio tem NIF, prédios e pedidos próprios |

## Notas técnicas em aberto

- Dois avisos de desempenho no Supabase ("várias políticas permissivas" em `org_members` e `profiles`): as políticas
  foram somadas em vez de substituídas, porque o `drop` exige confirmação manual. Sem efeito na segurança; fundir
  numa migração futura, com confirmação.
- Índice redundante `org_documents_building_id_idx`: remover na mesma migração.

## Passos pendentes do promotor

| Onde | O quê | Valor |
| --- | --- | --- |
| Supabase › Authentication › URL Configuration | Site URL e Redirect URLs, quando houver domínio | `https://<domínio>` e `https://<domínio>/auth/confirmar` |
| Supabase › Authentication › SMTP | Envio de emails por um serviço próprio (o envio de origem tem limites baixos e cai no spam) | Por escolher |
| Alojamento | Publicar a app (por exemplo Vercel, região UE) com as variáveis de `.env.example` | Por decidir |

## Em aberto (com a proposta implementada por omissão)

| Tema | Proposta em vigor no código | Onde |
| --- | --- | --- |
| Prazo para o pintor assinar depois de pagar | 8 dias corridos | `rules.ts`, `signDeadlineDays` |
| Garantia quando o pintor falha e o cliente não continua | Devolvida por inteiro | `closeWithoutContract` |
| Adiantamento durante um litígio | Devolvido logo ao cliente | `openDispute` |
| Mínimo de 150 € na garantia do cliente | Aplica-se | `rules.ts`, `guaranteeMinCents` |
| Nome e marca | "Paint it", provisório | `src/config/brand.ts` |
| Parceiro de pagamentos | Sugestão: Stripe Connect ou Mangopay (ver `docs/PAGAMENTOS_E_ASSINATURA.md`); por escolher (questão A1). Até lá, a equipa da plataforma regista à mão cada confirmação do parceiro (depósito e comissão), com a hora de receção | `/app/contratacoes/[id]` |
| Assinatura com Chave Móvel Digital | Proposta: PDF gerado pela app, assinado na Autenticação.gov e carregado de volta; a app confirma que o PDF assinado começa pelos bytes que gerou (ver `docs/PAGAMENTOS_E_ASSINATURA.md`). Por implementar; até lá regista a aceitação, a hora e o resumo SHA-256 | `src/app/app/contratacoes/actions.ts` |
| Momento da apresentação | Quando a comissão do pintor é confirmada dentro do prazo: as partes passam a ver-se, só para essa obra | `isRevealed` em `contracting.ts` |
| Função `resolve_listing_report` | Corre com direitos de dono (o aviso do Supabase é esperado): verifica que quem chama é da equipa da plataforma antes de suspender | migração `backoffice` |
| Função `painter_rating` | Corre com direitos de dono (aviso do Supabase esperado): devolve só a média e o número de avaliações do autor de uma proposta que quem chama pode ver, sem identificar o pintor | migração `extras` |
| Avaliações no comparador | Só se mostra a média com 3 ou mais obras avaliadas; abaixo disso, "histórico insuficiente" (CMP-10) | `pedidos/[id]/propostas` |
| Texto da minuta | Gerado da proposta e da ficha da obra; deve ser revisto por um advogado | `contractDraft` em `contracting.ts` |

## 19/10/2026 — percurso v2 afinado (decisão do promotor)

- A escolha é preliminar; torna-se efetiva quando o cliente deposita a caução, **sem prazo**. O pintor só é
  avisado nesse momento e tem 8 dias para pagar a comissão; depois as partes ficam a conhecer-se.
- O cliente assina, depois o pintor. Com as duas assinaturas a caução volta ao cliente.
- **O adiantamento não passa pela plataforma:** paga-se diretamente ao pintor depois da assinatura, como diz o
  contrato ("excede as nossas competências").
- Habilitação IMPIC em falta ou certificado de assinatura não confirmado **não bloqueiam**: a app assinala a
  vermelho às partes; quem continua assume a responsabilidade (migração `habilitacao_aviso`).

## 20/10/2026 — pagamentos, caução e fornecedores (decisão do promotor)

- **Parceiro de pagamentos: Stripe Connect.**
- **Caução do cliente: 3% com mínimo de 150 €**, como a comissão (corrigido pelo promotor no mesmo dia: a caução garante contra a desistência fraudulenta e o contorno da plataforma). A versão `2026-10-20` tem os mesmos valores da de 19/10.
- **Prazo de 8 dias** para o cliente assinar depois da apresentação: confirmado.
- **Fornecedores:** a plataforma não recebe nada pelas transações. Os fornecedores pagam uma subscrição para
  estarem no catálogo. O backoffice cria códigos promocionais de 1% a 100% de desconto (`promo_codes`). O
  fornecedor confirma um código por `check_promo_code` (é `security definer` de propósito: só devolve o
  desconto de um código válido a quem pertence a um fornecedor). Cobrança pelo Stripe Billing, ainda por ligar.
- Domínio e email: o promotor indica mais tarde.

## 20/10/2026 — planos dos fornecedores

- **Listagem de vendedores:** 39 €/mês + IVA.
- **Catálogo de produtos:** 49 €/mês + IVA. Inclui a listagem, produtos editáveis um a um e descontos por perfil
  de compra (produto ou tipo, área da obra, e por cliente: só pintores que já encomendaram ao fornecedor).
- Sem plano de catálogo ativo, o fornecedor não cria produtos nem descontos e os produtos deixam de ser sugeridos
  (continuam legíveis nas propostas antigas). Até o Stripe estar ligado, a equipa ativa o plano no backoffice,
  com código promocional opcional. Migração `subscricao_fornecedores`.

## 20/10/2026 — descontos por perfil de compra

O desconto é dado pelo interesse da compra, não pela pessoa. O fornecedor combina: produto ou tipo, dimensão da
obra, forma de pagamento (pronto ou diferido/crédito), quantidade mínima de embalagens, primeira compra (para
atrair pintores) e cliente frequente (3 ou mais encomendas entregues). Vale para todos os pintores. Ao orçamentar,
o pintor vê o melhor desconto garantido e, à parte, os que dependem do pagamento ou da quantidade. (A coluna
`painter_org_id` fica na base mas a interface já não a usa.)

## 20/10/2026 — marca

A marca passa a **Quem Pinta** (domínio quempinta.pt). "Paint it" fica só como nome do repositório e do projeto
Supabase. Falta confirmar o registo da marca no INPI/EUIPO.

## 20/10/2026 — Stripe

Conta Stripe criada (modo de teste), id `acct_1USIiAFGpN3v1aBO`. Falta: ativar o Connect e ligar o conector do
Stripe ao Claude numa sessão nova; as chaves secretas vão só para as variáveis do alojamento.

## 20/10/2026 — mensalidades dos fornecedores no Stripe (modo de teste)

Connect configurado como marketplace (contas Express, a plataforma paga as taxas do Stripe). Preços:
listagem de vendedores `price_1USKbMFGpN3v1aBOO9dJFUps` (39 €), catálogo `price_1USKbtFGpN3v1aBOvyB2ExdN` (49 €),
sem IVA. O fornecedor subscreve na página de produtos (Stripe Checkout, com código promocional convertido em
cupão). O plano só fica ativo quando o webhook `/api/stripe/webhook` recebe `checkout.session.completed`;
alterações e cancelamentos chegam por `customer.subscription.*`. Variáveis no alojamento: `STRIPE_SECRET_KEY`,
`STRIPE_WEBHOOK_SECRET`, `SUPABASE_SECRET_KEY`, opcional `STRIPE_TAX_RATE_IVA`.

## 20/10/2026 — um perfil por conta

Cada conta é só de **cliente** (condomínio, administradora ou particular), **pintor** ou **fornecedor**. A
interface só oferece os tipos de entidade do perfil da conta; a base de dados recusa juntar a mesma conta a
entidades de perfis diferentes (migração `um_perfil_por_conta`, trigger em `org_members`). Contas de teste
anteriores com vários perfis mantêm-se.

## 20/10/2026 — caução e comissão pelo Stripe (modo de teste)

O cliente paga a caução e o pintor a comissão no Stripe Checkout, a partir da página da contratação. O valor vem
sempre das regras (`onlinePaymentDue`). O webhook regista o acontecimento (`deposito_confirmado` /
`fee_recebido`, com o pagador como autor) e guarda o pagamento em `stripe_payments`. As devoluções que as regras
mandam fazer (`devolucao_garantia`, `devolucao_fee`) são executadas no Stripe depois de cada passo e, uma vez por
dia, pelo cron `/api/cron/devolucoes` (variável `CRON_SECRET`). Um pagamento recusado pelas regras (ex.: comissão
fora de prazo) é devolvido logo. Caução transitada para outra proposta continua a ser devolvida a partir do
pagamento original só por intervenção manual (caso raro, a tratar).

## 20/10/2026 — moradas reais e eliminar entidades

- Moradas (prédios e morada fiscal): o código postal tem de existir e a rua tem de ser uma das ruas desse
  código (base dos CTT via geoapi.pt). O formulário preenche localidade e concelho e sugere as ruas; o servidor
  volta a validar. Se o serviço não responder, não se bloqueia.
- NIPC ↔ nome: por fazer; precisa de uma chave da API do nif.pt (ou equivalente). Até lá: dígito de controlo e
  certidão permanente validada pela equipa.
- Eliminar entidade: só o proprietário, com janela que obriga a escrever uma palavra ao acaso, e só sem histórico
  com terceiros (migração `eliminar_entidade`).

## 20/10/2026 — catálogo de referência e produtos preferidos no pedido

- 39 produtos de mercado (CIN, Robbialac, Barbot, Dyrup, Sika…) a partir das fichas públicas dos fabricantes, sem
  fotografias das marcas (direitos de autor): ícone genérico. Preço de referência só quando há fonte pública datada.
- O cliente indica produtos preferidos no pedido; “fixo” quer dizer que o pintor não os deve substituir.
- O comparador mostra, por produto pedido, se cada proposta segue, substitui (por qual, e a diferença por litro face
  ao preço de referência sem descontos nem entrega) ou não indica. Substituir um produto fixo aparece a vermelho.
- O fornecedor liga os seus produtos a uma ficha de referência; passa a aparecer em “Onde comprar”, com filtro por concelho.

## 20/10/2026 — uma empresa por conta de pintor ou fornecedor

- Uma conta de pintor ou de fornecedor é uma só empresa (um NIPC). Para outra empresa, outra conta; colegas entram
  por convite na equipa. A base de dados recusa (trigger `org_members_one_profile`).
- Clientes podem ter várias entidades: uma administradora gere vários condomínios, cada um com o seu NIF.

## 20/10/2026 — avisos por email (Resend)

- Avisos transacionais, só a quem gere a entidade (proprietário e gestor; e a administradora que gere o condomínio):
  nova proposta recebida; proposta escolhida e prazo da comissão; partes apresentadas e assinaturas; contrato
  assinado; comissão ou assinatura fora de prazo; desistência; litígio.
- O texto nunca identifica a outra parte antes da apresentação (testado em `src/domain/notifications.test.ts`).
- Envio com `RESEND_API_KEY` (chave própria da Vercel, só envio) a partir de `suporte@quempinta.pt`. Falhas de envio
  não interrompem a ação do utilizador.
- Por fazer: lembretes de prazo (comissão a 2 dias do fim), aviso de nova oportunidade a pintores da zona,
  mensagens do fio da proposta, e preferências de aviso por utilizador.

## 21/10/2026 — orçamento do pintor: condições obrigatórias e resumo + discriminado

- Todo o orçamento declara que inclui **mão-de-obra qualificada** para a execução proposta (confirmação obrigatória).
- **Seguros** (responsabilidade civil e acidentes de trabalho): declaração obrigatória. Declarar "não tenho" não bloqueia,
  mas o cliente vê um aviso a vermelho (mesmo critério das licenças).
- **Plano de pagamentos por fases**: o pintor cria as fases e a % de cada; com o adiantamento (até 30%) somam 100%.
  O dinheiro da obra continua a ser pago entre as partes. Verificado também na base de dados (`proposal_conditions_check`).
- **Garantia**: a legal aparece sempre, sem número (a validar no parecer jurídico); o pintor pode acrescentar anos.
- O cliente vê sempre o mesmo **resumo por capítulo** e, em cada proposta, "Ver orçamento discriminado" com todas as linhas.
- Por fazer (fases seguintes, ver `docs/PROPOSTA.md`): orçamento guiado em 5 passos por trabalho e estado
  (incluído / opcional / não incluído / não aplicável / a confirmar), zonas por fachada no pedido e na proposta,
  soluções partilhadas por várias fachadas, módulos técnicos (rede, reboco, primário, pintura final) e catálogo de produtos.

## 21/10/2026 — funções da Vercel em Dublin (`dub1`)

- O Supabase está em eu-west-1 (Irlanda) e as funções da Vercel corriam por omissão em iad1 (EUA): cada consulta
  atravessava o Atlântico, e ações com muitas consultas (webhook do Stripe, escolha de proposta) demoravam 10 a 15 s.
  `vercel.json` fixa `regions: ["dub1"]`.

## 21/10/2026 — o cliente não vê a comissão do pintor

- Retirada dos ecrãs, resumos e emails do cliente: valores da contratação, passos, prazos, estados, "retido agora",
  aviso de desistência, resumo em linguagem simples e aviso de comissão não paga. O cliente vê "confirmação do pintor".
- Mantida: ecrãs do pintor, backoffice e página pública Transparência (por decisão a confirmar com o parecer jurídico,
  que pede para a plataforma explicar como ganha dinheiro).

- Decidido a 21/10/2026: a página Transparência refere só que a plataforma cobra uma pequena comissão pelo sucesso ao prestador
  de serviço, sem percentagem nem mínimo (podem mudar). Os valores ficam no ecrã do pintor.

## 21/10/2026 — correções do teste de ponta a ponta

- Avisos dentro da aplicação, histórico e "Acerto final" do cliente deixam de falar em comissão (migração
  `20261021010000_avisos_sem_comissao.sql` e notas neutras em `engagement.ts`). Teste novo na base de dados.
- Emails: envio um de cada vez e com repetição em caso de limite do Resend (429): o aviso de "contrato assinado"
  não chegou ao cliente por causa dele.
- Contactos: o email da conta é sugerido como contacto da entidade nova; na revelação aparece "Não indicado" em vez de "—".

## 21/10/2026 — avisos e bloqueio por contactos (strikes)

- Tentar enviar contactos, localização ou convites para sair da plataforma (mensagens, pedido, zonas, legendas, linhas e
  condições da proposta, resposta a avaliações) é recusado e conta como aviso, com janela de aviso:
  **1.ª tentativa: aviso; 2.ª: último aviso (a próxima bloqueia); 3.ª: conta bloqueada para sempre.**
- O bloqueio proíbe o email (Supabase `ban`), impede registar de novo os NIF das entidades da conta (`blocked_identifiers`) e
  a área reservada passa a mostrar só `/conta-bloqueada`. Sessões abertas noutros aparelhos caducam em cerca de 1 hora.
- A equipa da plataforma vê as tentativas (com o texto) e pode desbloquear no backoffice; desbloquear anula os avisos.
- Risco assumido: o filtro é por padrões e pode errar. Por isso há 2 avisos antes do bloqueio e desbloqueio manual.

## 21/10/2026 — pedido de revisão do segundo aviso

- Só se pode pedir revisão **no 2.º aviso** (último aviso), **uma vez**: nem ao 1.º, nem depois do bloqueio. O pedido é feito
  na aplicação (`/app/revisao`), por quem ainda tem sessão, e decidido no backoffice com motivo escrito (a pessoa recebe a decisão por email).
- **Aceite:** o 2.º aviso é anulado e a conta volta a 1 aviso (se repetir, conta como 2.º). **Recusado:** mantém-se o último
  aviso (a próxima infração bloqueia). Infringir com o pedido pendente bloqueia a conta e o pedido fica prejudicado.
- Depois do bloqueio não há recurso na aplicação; a equipa pode desbloquear à mão no backoffice, para corrigir erros.

## 21/10/2026 — orçamento guiado (fase 3)

- O pintor monta o orçamento em quatro separadores: **Trabalhos** (lista à esquerda; cada trabalho tem só os campos que lhe
  dizem respeito, a zona onde se executa e a quantidade, pré-preenchida com a área das fachadas), **Preços**, **Condições** e
  **Rever** (folha A4, com "Submeter" ou "Voltar e editar"). Um trabalho preenchido muda de cor.
- Estados de cada trabalho: proposta base, opcional, a confirmar (obriga a dizer o quê) e não incluído (obriga a justificar).
- Preços: por unidade (€/m², €/m) ou valor global do trabalho; ou **um preço global da obra** (os trabalhos ficam descritos sem preço).
  O IVA é livre, de 0 a 30% (23% por omissão).
- Cada trabalho gera uma linha de preço (a descrição para o cliente é gerada dos campos): totais, comissão, comparador e
  contrato continuam a usar as linhas. As linhas avulsas antigas (e com material de fornecedor) mantêm-se no passo Preços.

## 21/10/2026 — sugestões de produtos no orçamento

- Nos campos de produto do orçamento (primário, pintura final, impermeabilização, metais e madeiras, fissuras, rebocos,
  barramento, lavagem, humidade) há um botão **Sugestões** com os produtos do catálogo de referência que servem **ao
  trabalho** e ao uso do pedido (interior/exterior), por `productSuggestions()` em `src/domain/works.ts`.
- Os produtos que o cliente pediu aparecem primeiro, assinalados (e "não substituir" se forem fixos). Cada sugestão liga à ficha do produto.
- Escolher uma sugestão escreve "Marca Nome" no campo, que o comparador reconhece ao verificar se a proposta segue o pedido.

## 21/10/2026 — Métodos de trabalho e separadores sem perda de dados

- Em "Preparar orçamento", os quatro separadores ficam montados ao mesmo tempo (`BudgetShell`): andar entre eles não apaga
  nada. O separador que se deixa guarda-se sozinho; se falhar (ex.: campo inválido), avança-se na mesma e aparece o aviso.
  Há aviso do navegador ao sair da página com alterações por guardar.
- **Método de trabalho** (`work_templates`, por entidade pintora): trabalhos, produtos/campos, preço unitário por tipo de trabalho
  e condições habituais (IVA, adiantamento, garantia, plano de pagamentos, seguros, exclusões, notas). Não leva zonas nem
  quantidades (vêm do pedido) nem validade/duração/início. No topo: escolher e **Aplicar** (substitui trabalhos e condições
  do rascunho, com confirmação) ou **Guardar como método…** (mesmo nome = substitui). Lógica em `src/domain/templates.ts`.

## 21/10/2026 — Produto «ou equivalente»

- Nos campos de produto com Sugestões há uma caixa pequena **«ou equivalente»**, com um «?» que explica a regra. Texto único em
  `src/domain/equivalence.ts`: características técnicas iguais ou superiores (tipo, uso, acabamento, rendimento, classe) e preço de
  referência de mercado a **não mais de 10%** do produto indicado (o promotor falou também em 5% no contrato: usa-se um só valor,
  `EQUIVALENT_TOLERANCE_BPS`, a confirmar).
- Na proposta aparece bem destacado (aviso âmbar + etiqueta na linha, com a cor como exemplo de diferença a declarar); o contrato leva
  a cláusula 2-B com os mesmos termos. Quem decide um desacordo é matéria jurídica, não da plataforma.
- **Aguarda parecer jurídico:** a opção só aparece com `NEXT_PUBLIC_EQUIVALENTE=1` (por omissão desligada na Vercel). Ligar depois do parecer.

## 21/10/2026 — convite por email aos pintores quando um pedido é publicado

- Antes, o pintor não recebia nada de novos pedidos. Agora, ao publicar, cada entidade pintora recebe um email, para o
  contacto indicado (`email_contacto`) ou, se faltar, para os gestores; sem repetir endereços e sem contas bloqueadas.
- Assunto: «Pedido de Orçamento - pintura em [concelho]». Usa o **concelho** (o que o anúncio anónimo já mostra), não a localidade.
  Imagem do prédio no topo, convite a orçamentar, botão e ligação direta ao pedido (`/app/oportunidades/[id]`).
- Todos os pintores veem todos os pedidos abertos (não há zona de atuação por entidade); filtrar por zona é uma melhoria futura.
- Envio depois da resposta (`after`), um de cada vez; falhas não afetam a publicação. Rodapé: para deixar de receber, responder ao email.

## 21/10/2026 — códigos de adesão dos fornecedores (descontos a novos aderentes)

- No espaço do fornecedor (`/app/organizacoes/[id]/adesoes`): criar códigos (8 caracteres), indicar IBAN/titular/se cobra IVA, ver candidaturas e
  comissões, enviar a fatura (PDF) quando a comissão do pintor entrar na conta.
- O pintor aplica o código no passo **Condições** do orçamento (`apply_referral_code`: só o rascunho; o código fica atribuído a essa empresa; uma empresa não usa o seu
  próprio código). Cada código vale **uma obra ganha** (`max_wins`, por omissão 1).
- Se ganhar: a contratação usa as regras `2026-10-20+ref` (comissão **2,75%**, isto é, 3% − 0,25 pontos; o mínimo de 150 € mantém-se, por isso só se nota
  acima de ~5 455 €) e nasce uma comissão do fornecedor de **0,25% do valor sem IVA** (+ IVA se o cobrar), em `referral_payouts`.
- Estados: obra adjudicada → comissão do pintor recebida (o fornecedor é avisado e pede-se IBAN e fatura) → fatura recebida → paga (a equipa paga por transferência
  e regista a referência no backoffice). A equipa pode anular (ex.: a obra cai e a comissão do pintor é devolvida).
- Emails ao fornecedor: candidatura (proposta submetida com o código), obra ganha (com o valor), comissão recebida (pedir fatura/IBAN) e paga.
- O cliente nunca vê nada disto (regra 13). O fornecedor vê o nome do pintor e o concelho; nunca o cliente, a morada nem o valor da obra.
- Aguarda: parecer jurídico (comissão a fornecedores e neutralidade das sugestões de produtos) e contabilista (IVA e faturação).

- Confirmado pelo promotor (21/10/2026): 2,75%; mínimo de 150 € mantido, com o limiar do desconto dito nos ecrãs (acima de 5 000 €, pleno acima de 5 455 €);
  **um código por obra ganha** (o fornecedor emite outro se o pintor pedir); pagamento manual por agora, com o backoffice a ajudar (ver `docs/CONTABILIDADE.md`);
  a comissão do fornecedor é anulada à mão se a obra cair.

## 21/10/2026 — saldo e resgate das comissões de adesão; livro de movimentos

- A comissão do fornecedor passa a **saldo** quando a comissão do pintor entra; o fornecedor **resgata** quando quiser, com IBAN, regime de IVA e de retenção declarados e **validados pela plataforma**.
  Valor a pagar = comissão + IVA − retenção, com uma só fatura (emitida à empresa) por resgate. Um resgate em curso de cada vez.
- Livro de movimentos imutável em partidas dobradas (ver `docs/CONTABILIDADE.md` §11). Caução retida: rendimento com IVA incluído (23/123).

## 22/10/2026 — backoffice organizado por secções

- A conta da equipa da plataforma vê na barra lateral o grupo **Backoffice**, com as secções e a contagem do que espera por uma pessoa:
  **Painel** (o que espera, agrupado por secção, e alerta se o servidor tiver problema) · **Pedidos** (com poucas propostas, denúncias, fotografias por rever) ·
  **Entidades** (documentos por validar, subscrições de fornecedores, códigos promocionais) · **Contratações** (à espera da plataforma, todas, assinaturas a conferir) ·
  **Moderação** (pedidos de revisão, avisos e bloqueios) · **Contabilidade** (painel, movimentos, reconciliação Stripe, banco, a pagar, períodos, por contratação) ·
  **Sistema** (estado do servidor, auditoria).
- Cada secção tem sub-separadores (`src/components/SubTabs.tsx`). Uma conta só de equipa, sem entidades, já não vê a «Área de trabalho».
- Os endereços antigos (`/app/validacao`, `/app/backoffice/conciliacao`, `/app/backoffice/auditoria`, `contabilidade?v=…`) redirecionam para os novos.

## 22/10/2026 — validação do regime dos fornecedores passa para Entidades

- A validação do regime de IVA/retenção declarado por um fornecedor (para as comissões de adesão) passou de
  Contabilidade → A pagar para **Entidades → Regimes de fornecedores**, por ser uma validação de dados da entidade,
  como os documentos. Contabilidade → A pagar fica só com dinheiro: resgates por pagar e comissões ainda fora de resgate.

## 22/10/2026 — motivos pré-aprovados para rejeitar fotos e documentos

- Ao rejeitar uma fotografia de pormenor ou um documento de verificação, a equipa escolhe agora um motivo pré-aprovado
  (`src/domain/review.ts`) que preenche o texto, continuando editável, ou "Outro motivo" para escrever livremente. Não
  houve alteração à base de dados: o campo continua a ser só texto (`notas_revisao`/`notas_validacao`).
- Descartado, por agora: o motor sugerir o motivo sozinho (exigiria reconhecimento de imagem por IA, que a página de
  Aviso Legal exclui explicitamente) e a edição da foto (tapar zonas) pela equipa antes de aprovar — fica como melhoria
  futura se a recusa por pormenores pequenos continuar frequente.

## 22/10/2026 — fundação do desconto por referências do novo algoritmo de fee (ponto 2)

- Documento "Algoritmo de determinação de fee QuemPinta v1" (22/10/2026): substitui a faixa fixa de 3% por uma faixa
  dinâmica 18–23%, com nove fatores. Trabalho em curso, por fases — ver nota no início deste ficheiro.
- **Feito agora:** a fórmula Q(n) (desconto por fornecedores referidos elegíveis, até 4 p.p.) e a janela de 12 meses
  de elegibilidade (ativação validada, aniversário exclusive, 29 de fevereiro), em `src/domain/referralEligibility.ts`,
  pura e testada contra os exemplos do próprio documento (secção 9).
  - ◆ Por decidir: a data que inicia a janela é a da inscrição ou a da ativação validada — usei a ativação validada,
    que é a opção que o documento justifica, mas falta confirmar.
- **Ainda não tocado** (decisão a tomar antes de avançar): como isto substitui o que está em produção.
  - Hoje (`src/domain/referral.ts`, `REFERRAL_BPS`): o pintor aplica um código a **uma proposta**; ganhar a obra
    consome o código (`max_wins`) e dá 0,25 p.p., só nessa contratação.
  - No documento: o desconto é **ambiente**, aplica-se a **todas** as propostas do pintor enquanto tiver fornecedores
    referidos elegíveis, e varia com a contagem (Q(n)) — não há "um código, uma obra".
  - Isto muda a UX do pintor (hoje: `ReferralField` no passo Condições do orçamento) e o esquema (`referral_codes`,
    `proposals.referral_code_id`, o sufixo `+ref` na versão das regras). Não decidido se o "convite" ainda passa por
    um código escrito pelo pintor ou se é automático a partir de quem o fornecedor indica ter convidado.
  - **Não parece afetado:** a comissão que o fornecedor recebe (0,25%, `referral_payouts`/`referral_redemptions`,
    já faturada via Moloni) — o documento só fala do desconto ao pintor, nunca do que o fornecedor ganha.

## 22/10/2026 — dois programas de referência, não um: correção e decisões

- O ponto anterior assumia um só sentido (pintor → fornecedor, o do documento). O promotor esclareceu que há
  **dois programas simétricos**, com nomes próprios a partir de agora:
  - **Códigos de adesão** (já em produção, fornecedor → pintor): o fornecedor convida pintores; cada um que usa o
    código de um fornecedor e ganha a obra desconta ao pintor e paga ao fornecedor.
  - **Referências de fornecedores** (a construir, pintor → fornecedor, o do documento): o pintor convida
    fornecedores; ganha um desconto quando o fornecedor convidado se valida como entidade nova (NIF/NIPC que ainda
    não estava na plataforma, mesmo que o mail seja diferente).
  - Correção ao ponto anterior: os códigos de adesão **mudam, sim**, a comissão do fornecedor — o documento do
    algoritmo de fee não trata deste programa, mas o promotor decidiu, nesta conversa, subir essa comissão e
    torná-la progressiva.
- **Decidido pelo promotor (22/10/2026):**
  1. Nos códigos de adesão, o desconto do pintor **não** cresce com o volume do fornecedor (isso só sobe o que o
     fornecedor recebe). Continuam os mesmos 0,25 p.p. de sempre, **um por fornecedor com código ligado**, somados
     — ex.: dois fornecedores ligados dão 0,5 p.p. Deixa de ser "um código, uma obra": passa a desconto em vigor em
     todas as propostas futuras do pintor enquanto o código estiver ativo (`max_wins` deixa de ser o mecanismo
     certo para isto — o fornecedor corta a relação desativando o código).
  2. A comissão do fornecedor nos códigos de adesão sobe de 0,25% para **1%, e 2% ao alcançar a 3.ª obra** (de
     qualquer pintor que referenciou, não só de um código) **nos 2 meses anteriores**, contados corridos a partir
     de cada vitória (não um bimestre fixo de calendário) e **nunca retroativo** — as obras já contadas a 1% não
     sobem com o tempo.
  3. Teto conjunto dos dois descontos do pintor (códigos de adesão + referências de fornecedores): **8 pontos
     percentuais** — "dá margem" de propósito; com os valores de hoje só se aproxima com muitos fornecedores
     ligados e muitas referências elegíveis em simultâneo.
  4. Índice único em `organizations.nif`, só para fornecedores, para impedir a mesma empresa registar-se duas
     vezes com mails diferentes — buraco encontrado ao verificar a regra de "entidade nova" das referências de
     fornecedores (nada o impedia até aqui).
- **Porque não bloqueia a Moloni:** a comissão de adesão a fornecedores nunca passou pela Moloni — é o fornecedor
  que fatura a plataforma (fluxo inverso, já feito). Subir ou tornar progressiva essa taxa muda o número, não o
  mecanismo. A Moloni só depende de receber o valor certo da comissão do pintor, resolvido noutro sítio (ver abaixo).
- **Sigilo fornecedor → pintor:** já garantido por RLS, não por convenção — `referral_payouts`/`referral_redemptions`
  só deixam ver quem acede à organização fornecedora; um pintor não vê isto por nenhum caminho de junção.
- **Feito agora:**
  - Índice único `organizations_fornecedor_nif_idx` (`supabase/migrations/20261023143306_nif_unico_fornecedores.sql`),
    parcial (só `kind = 'fornecedor'`), com teste em `supabase/tests/rls.test.ts`.
  - Funções puras e testadas em `src/domain/referral.ts`: `linkedSupplierDiscountBp`, `supplierCommissionBpAt` (com
    `priorWinsInSupplierWindow`), `combinedPainterDiscountBp` (teto de 800 p.b.) e `applyPainterDiscount` (aplica o
    desconto à comissão sem nunca a tornar negativa — o mínimo de 150 € continua a proteger a plataforma).
  - `addCalendarMonths` mudou de `referralEligibility.ts` para `deadline.ts` (é utilidade genérica de datas,
    passou a ser usada também em `referral.ts`; sem mudança de comportamento, só de sítio).

## 22/10/2026 — códigos de adesão: ligação ao esquema e ao `proposal_selected()`

- `supabase/migrations/20261023143330_codigos_de_adesao_cumulativos.sql`:
  - `engagements` ganha `referral_discount_bp` (pontos-base, resolvido e gravado uma vez, nunca recalculado — o
    sufixo `+ref` na versão das regras deixa de se produzir; `RULES_2026_10_20_REF` fica só para reconstruir
    contratações antigas que já o têm, imutáveis).
  - `proposal_selected()`: o desconto do pintor passa a contar, a cada contratação, quantos fornecedores distintos
    têm código ligado e ativo a este pintor (`referral_codes.painter_org_id`) — **não** só o código marcado nesta
    proposta — e aplica `least(25 × contagem, 800)`. A comissão do fornecedor (só se esta proposta tiver um código
    próprio ligado e ativo) passa a contar as obras desse fornecedor — de qualquer pintor que referenciou — nos
    2 meses anteriores a esta (`now() - interval '2 months'`, corrido, não bimestre de calendário) e escolhe
    100 ou 200 pontos-base; nunca retroativo, porque só conta as já registadas antes de inserir esta.
  - `apply_referral_code()`: deixou de rejeitar com "este código já foi utilizado" — o mesmo código serve a
    relação enquanto estiver ativa, não uma só obra. `max_wins` fica na tabela (sem remover colunas sem
    confirmação manual) mas deixa de ser consultado.
  - Desativar um código (`active = false`) corta a comissão do fornecedor em obras futuras de imediato — e também
    deixa de contar para o desconto ambiente do pintor, porque ambos se calculam de novo a cada contratação, a
    partir do estado atual, nunca de um valor guardado.
- Testado em `supabase/tests/rls.test.ts`: o desconto ambiente reflete *todos* os fornecedores ligados (não só o
  código desta proposta); o mesmo código reaplica-se a uma 2.ª e 3.ª obra do mesmo fornecedor; a 3.ª sobe a 2% sem
  alterar as duas primeiras (confirmado por leitura direta depois).
- **Ainda não tocado** (até aqui): `src/lib/engagements.ts`/`src/domain/contracting.ts` (`replay()`, linha ~132)
  ainda não leem `referral_discount_bp` nem aplicam `applyPainterDiscount` — a comissão mostrada e cobrada ao
  pintor **ainda não reflete este desconto** até essa ligação se fazer (precisa dos tipos gerados depois de as
  migrações serem aplicadas à base real — `src/lib/database.types.ts`).

## 22/10/2026 — referências de fornecedores: tabela de convites, ativação e Q(n) em SQL

- `supabase/migrations/20261023143405_referencias_de_fornecedores.sql`: tabela nova `supplier_referral_invites`
  (painter_org_id, code, nota, active, e — só graváveis pelas funções próprias, nunca por `authenticated` — 
  supplier_org_id, nif, convite_confirmado_em, adesao_elegivel_em). Simétrica a `referral_codes`, mas de sentido
  contrário: o **pintor** cria o código (só uma organização `pintor`), o **fornecedor** aplica-o no momento do
  registo (`apply_supplier_referral_code`) — e, ao contrário dos códigos de adesão, cada convite serve uma só vez
  (entidade nova, não se reatribui).
- `adesao_elegivel_em` (início da janela de 12 meses) grava-se pela 1.ª linha em `supplier_subscriptions` desse
  fornecedor, não pelo registo — como já estava decidido em `referralEligibility.ts`, para não encurtar a janela
  pelo tempo até subscrever.
- `private.referral_window_discount_bp(pintor, data)`: repete em SQL o Q(n) de
  `src/domain/referralEligibility.ts` (um benefício por NIF, o convite confirmado mais antigo, só os atualmente
  elegíveis) — testado contra a função do domínio para n=0..5.
- `proposal_selected()` soma este valor ao desconto dos códigos de adesão, com o mesmo teto único de 800 p.b.
  (`combinedPainterDiscountBp`) — um pintor com um fornecedor de código ligado (25 p.b.) e um fornecedor referido
  já elegível (Q(1)=100 p.b.) fica com 125 p.b., testado de ponta a ponta.
- Nenhum gatilho de guarda além do `grant update (active, nota)`: como em `referral_codes.painter_org_id`, o
  grant por si só impede `authenticated` de tocar nos campos do sistema — não precisa de um gatilho a verificar
  uma bandeira de sessão (mais simples do que o equivalente em `proposals`, que tem muitas colunas livres e por
  isso usa esse mecanismo).
## 22/10/2026 — UX das referências de fornecedores e dos códigos de adesão; liga-se o desconto à comissão

- `src/lib/database.types.ts` atualizado à mão com `supplier_referral_invites`, `engagements.referral_discount_bp`
  e `apply_supplier_referral_code` — o cabeçalho do ficheiro já previa isto ("atualizar depois de cada migração");
  confirma-se com `generate_typescript_types` quando as migrações forem aplicadas à base real.
- Com os tipos disponíveis, `src/domain/contracting.ts` (`replay()`) e `src/lib/engagements.ts` passam a ler
  `referral_discount_bp` e a aplicá-lo com `applyPainterDiscount` — a comissão que o pintor vê e paga **já reflete
  os dois descontos**. Contratações antigas (versão com sufixo `+ref`) não mudam: `referralDiscountBp` vem a 0 e
  `applyPainterDiscount` com 0 não altera nada.
- **Pintor** — página nova `/app/organizacoes/[id]/referencias`: cria e desativa códigos de convite, vê a quantos
  fornecedores já referidos (com o nome, desde que confirmado) e o estado de cada um (a aguardar subscrição /
  elegível até [data] / terminado), e um resumo com os dois descontos separados e o total.
- **Fornecedor** — `/app/organizacoes/nova`: campo opcional "Código de quem o indicou", só quando o tipo é
  fornecedor e só no registo (não na edição). Um código inválido ou já usado não impede o registo, só não regista
  a referência (`createOrganization`, `src/app/app/actions.ts`).
- Texto desatualizado corrigido em `adesoes/page.tsx` (já não "0,25%/cada código vale uma obra") e em
  `ReferralField.tsx` (aplicar o código liga-o a obras futuras, não só a esta) — o texto, não a interação: a forma
  de ligar um código a uma proposta continua "um código por proposta" (`ReferralField.tsx`) e falta decidir se
  deve passar a uma ligação visível fora desse fluxo, como já estava registado.
- Testado (tsc, lint, 357 testes, build) mas não visto a correr: o `npm run dev` desta sessão não tem credenciais
  reais do Supabase (confirmado com a página `adesoes`, já existente, a falhar da mesma forma) — falta a
  confirmação visual depois de as migrações estarem aplicadas.

## 22/10/2026 — `ReferralField.tsx`: separa "associar esta obra" de "ligar um fornecedor novo"

- O código deixou de identificar uma só obra; passou a identificar uma relação permanente (acima). O formulário
  antigo (uma caixa de texto, "aplicado"/"retirar") já não fazia sentido com mais de um fornecedor ligado — não
  havia forma de escolher qual.
- Agora: com pelo menos um fornecedor já ligado, um menu escolhe qual fica associado a **esta** obra (ou nenhum) —
  não muda o desconto do pintor, só a quem vai a comissão por volume do fornecedor, se ganhar. Sem nenhum ligado,
  mantém-se a caixa de texto de sempre; com algum ligado, "+ Novo código de outro fornecedor" abre-a à parte.
  `apply_referral_code` não mudou — já aceitava reaplicar um código já ligado.
- Corrigido também um valor que ficou errado com a mudança anterior: a pré-visualização da comissão ao pintor, a
  meio do orçamento, ainda calculava com a versão fixa `RULES_2026_10_20_REF` (sempre 0,25 p.p.) em vez do desconto
  real, ambiente e somado — agora usa `applyPainterDiscount(CURRENT_RULES, painterDiscountBp(...))`, a mesma conta
  de `src/domain/contracting.ts`. `painterDiscountBp` e `linkedSupplierCodes`, novos em `src/lib/queries.ts`,
  partilham-se entre esta página e a futura.
- Texto desatualizado corrigido também em `orcamento-actions.ts` (`applyReferral`).

## 22/10/2026 — termos de aceitação do pintor antes da ficha completa de uma obra

Decisão do promotor: os pintores são alertados caso a caso do valor/percentagem do fee da plataforma (com detalhe
se tiverem desconto), mas para ver a ficha completa de uma obra (fotografias, superfícies e descrição) têm de
aceitar termos — comprometendo-se a não revelar a comissão daquele caso. Reforço explícito: **o condomínio/cliente
sabe que existe comissão, nunca sabe quanto** (regra 13 do `CLAUDE.md`, já em vigor — isto não a muda, acrescenta
o lado do pintor).

- **Detalhe do fee por proposta:** `/app/oportunidades/[id]`, a pré-visualização da comissão ganha "Ver o detalhe
  do desconto" (um `<details>`, só aparece se houver desconto) — comissão sem desconto, cada componente (códigos
  de adesão / referências, com a contagem) e a comissão aplicada. `painterDiscountBp` (`src/lib/queries.ts`) passou
  a `painterDiscountBreakdown`, devolvendo os dois lados separados, não só o total.
- **Termos de aceitação:** tabela nova `painter_terms_acceptances` (`painter_org_id`, `version`, `accepted_at`,
  `accepted_by`) — uma linha por versão aceite, nunca se altera nem apaga. Versão em `src/domain/painterTerms.ts`
  (`CURRENT_PAINTER_TERMS_VERSION`); mudar o texto muda a versão, o que pede aceitação de novo a toda a gente.
  Só um gestor da entidade de pintura regista a aceitação (como as outras ações consequentes desta natureza).
- **Onde pega:** `/app/oportunidades/[id]` só mostra a ficha completa (hoje tudo dentro de `ListingPreview`:
  fotografias, superfícies, descrição) e o resto da página (orçamento, propostas) a quem já aceitou a versão em
  vigor; sem isso, mostra só o que já era público na lista (tipo de obra, concelho, referência) e o formulário de
  aceitação. A lista (`/app/oportunidades`) não muda — já só mostra isso.
- **Decisão de desenho, não pedida explicitamente — a registar:** a imposição é ao nível da interface/processo
  (esta página), não das políticas RLS das tabelas de base (`work_requests`, `request_photos`, `request_surfaces`).
  Uma aceitação de termos de utilização não precisa de ser uma barreira de segurança ao nível dos dados — é um
  passo de processo, como aceitar quaisquer termos de utilização de um serviço. Mudar isto, se vier a ser
  necessário (ex.: impedir aceder à informação por fora da aplicação), é um passo maior e separado.
- **Texto** (rascunho, em `src/app/app/oportunidades/[id]/AcceptTerms.tsx`, impessoal, cinco pontos curtos):
  comissão confidencial; uso só para orçamentar (não partilhar nem usar para contactar o cliente fora da
  plataforma); sem contacto direto antes da apresentação; a obra contrata-se na plataforma (sem contornar);
  dados verdadeiros sobre a entidade. **Por rever pelo promotor e, como os outros textos legais do projeto,
  pelo advogado** — não é um contrato assinado com Chave Móvel Digital (não é preciso: é aceitação de termos de
  utilização, não um contrato entre duas partes com dinheiro a mudar de mãos).
- Testado em `supabase/tests/rls.test.ts` (só um gestor regista, só para a sua entidade, imutável) e tsc/lint/359
  testes/build. `database.types.ts` atualizado à mão, como as tabelas anteriores desta sessão — confirmar com
  `generate_typescript_types` quando a migração for aplicada (é a 4.ª e última, por agora, da fila por aplicar).

## 22/10/2026 — sinal de demãos acima do esperado, no comparador e no rascunho

Ponto 2 de uma leitura de uma sessão externa (painel de comprador + board, noutro contexto, sem conhecer este
projeto) sobre a oferta do Quem Pinta — trazida pelo promotor para ver o que adaptar, não para copiar às
cegas (ver a resposta anterior a essa leitura, acima na conversa, não registada aqui por ser só análise, sem
código). O ponto escolhido para avançar: nada impede hoje um pintor de declarar mais demãos do que um material
precisa, insuflando o custo — mesmo com o preço de referência do fornecedor fixo.

- `materialCheck` (`src/domain/catalog.ts`, ao lado de `consumption`, já existente): dada a área, as demãos
  declaradas e o produto, devolve a conta de litros/embalagens/custo esperada e sinaliza quando as demãos
  excedem em mais de uma as recomendadas pelo próprio produto (`demaos_recomendadas`, já no catálogo). Sem
  recomendação do produto, ou sem demãos declaradas, não sinaliza — falta de dados não é motivo para alarme.
  Nunca bloqueia: é transparência para o cliente notar, decidir ele (CMP-04, o catálogo já evita dizer que o mais
  caro é melhor — isto segue o mesmo espírito).
- Mostra-se em `ProposalView` (por isso chega automaticamente às três páginas que o usam: o rascunho do pintor,
  o comparador do cliente e o dossiê para imprimir) — uma etiqueta âmbar só quando sinalizado, e a conta de
  litros/custo sempre que há produto comprometido, sinalizado ou não. `productsFor`, novo em `src/lib/materials.ts`,
  traz os dados do produto (rendimento, embalagem, preço, demãos recomendadas) para quem chama.
- Sem migração: usa só colunas que já existiam. Testado em `src/domain/catalog.test.ts`; tsc, lint, 360 testes,
  build, zero.
- O que ficou de fora desta leitura, por pedir decisão de negócio (não código): o levantamento feito por um
  vendedor de tintas, com partilha de comissão (modelo novo, sem número definido); a garantia de execução da
  obra (sem resposta nossa nem na leitura externa); "traga o seu pintor" (hoje só a equipa convida pintores a um
  anúncio — `listing_invites`, restrito a `is_platform_admin()` — alargar ao cliente é pequeno, mas é uma UX nova,
  não decidida ainda).

## 22/10/2026 — convite direto do cliente ("traga o seu pintor")

Pedido do promotor: o cliente que já tem um pintor da sua confiança pode querer insistir em contratá-lo mesmo
assim, mas sem que a plataforma pareça um custo extra imposto a esse pintor ("então quer que eu vá para uma
plataforma para subir 10% ao custo?"). Mecanismo pedido: um código ou QR (o mesmo link) ligado a **uma obra
publicada específica**, que o cliente gera e partilha diretamente; qualquer entidade de pintura (nova ou já
registada) que o resgate vai direta a essa oportunidade, sem precisar de a encontrar na lista pública — e com
uma comissão de base bem mais baixa, precisamente para não criar esse atrito.

- **Feito agora:** tabela `request_invites` (`supabase/migrations/20261023143445_convite_direto_do_cliente.sql`),
  só criável por um gestor da entidade do pedido, numa obra já publicada. `redeem_request_invite` liga o código à
  primeira entidade de pintura que o resgata (idempotente para a mesma entidade; recusa se já estiver ligado a
  outra). `request_invite_info` mostra uma pré-visualização com só o que já é público (tipo de obra, concelho).
  `proposal_selected()` deteta este caminho e acrescenta o sufixo `+convite` à versão das regras.
- **A comissão fica em 9%** (`RULES_2026_10_20_CONVITE`, mínimo de 150 € mantido) — **corrigido** depois de o
  promotor notar que a primeira versão (1%) contradizia o que já estava estabelecido no documento
  `Algoritmo_determinacao_fee_QuemPinta_v1.docx`: esse 1% tinha sido reaproveitado de outro sítio do sistema (a
  comissão do *fornecedor* nos códigos de adesão), sem o confrontar com o modelo de fee do *pintor*. O documento
  já fixa 9% como o piso absoluto do próprio algoritmo dinâmico, mesmo empilhando todos os seus descontos ao
  mesmo tempo (18% de base − 3 p.p. resposta inicial − 2 p.p. fidelização − 4 p.p. referências = 9%); usar esse
  piso aqui, antes de o motor dinâmico ("ponto 1") estar construído, fica muito abaixo do alvo de 18-23% sem
  nunca ficar abaixo do que o negócio já decidiu ser sustentável — mesmo acima dos 3% interinos de hoje, que já
  se sabe estarem temporariamente baixos demais. Os descontos de códigos de adesão e referências continuam a
  aplicar-se sobre esta base nova, não por cima da base de 3%.
- **Confirmado pelo promotor (22/10/2026):** o desconto aplica-se sempre que este convite específico for usado
  para ganhar uma obra, sem limite de vezes nem de validade — é a mesma relação cliente-pintor a repetir-se.
- **Interface do cliente:** `/app/pedidos/[id]`, só em obras publicadas — criar código (com nota opcional), ver
  o estado de cada um (disponível / associado a [pintor] / desativado) e o link a partilhar
  (`quempinta.pt/convite/CÓDIGO`). Pode desativar um código; nunca apagar.
- **Interface do pintor:** `/convite/[código]` (fora de `/app`, pede sessão com `?seguinte=` de volta para aqui —
  `safeNext()` alargado para aceitar este caminho). Mostra a pré-visualização, pede para escolher a entidade (ou
  criar uma, se não tiver nenhuma) e exige uma confirmação explícita antes de resgatar — mesmo havendo só uma
  entidade, para não ligar o código com um simples GET.
- **Porque não parece um risco de desvio:** o código tem de existir *antes* de qualquer proposta ser submetida e
  está ligado a uma obra específica — não é possível reclassificar depois um negócio já descoberto pela via normal.
- **Imagem do QR code:** `src/lib/qrcode.ts` (pacote `qrcode`, só no servidor), gerada de novo em cada pedido da
  página a partir do mesmo link de sempre — nunca guardada como ficheiro. Não precisa de nenhuma lógica própria
  de associação: o que já impede a distribuição em massa (código amarrado a uma obra publicada desde que nasce,
  e a uma só empresa depois de resgatado) protege a imagem por extensão, porque ela não é mais do que a
  representação visual desse código. Em `/app/pedidos/[id]`, um `<details>` ("Ver código QR") ao lado do link.
- Testado (tsc, lint, 367 testes, build, zero) — `npm run dev` falha da mesma forma ambiental de sempre (sem
  credenciais reais do Supabase), confirmando que não há erro novo. Migração por aplicar à base real, depois da
  `...060000_termos_de_aceitacao_pintor.sql` (ver `docs/ESTADO.md`).

## 22/10/2026 — consulta de revogação (OCSP) nas assinaturas de contrato

Item já listado em `docs/ESTADO.md` como "a seguir, sem depender do promotor". `src/lib/pades.ts`
(`checkRevocation`, chamada de dentro de `validateChain`): depois de a cadeia de certificados ser válida,
consulta por OCSP (RFC 6960) o emissor direto do certificado do signatário — a mesma extensão *Authority
Information Access* já usada para completar a cadeia, agora também pelo método `id-ad-ocsp`. Uma resposta
assinada com autoridade a confirmar "revogado" muda `trusted` para `false` (`'Certificado revogado.'`); qualquer
outro caso (sem URL no certificado, responder em baixo, resposta malformada ou sem autoridade para responder)
**falha aberto** — mantém o que a cadeia já tinha decidido, nunca lê "sem resposta" como "garantidamente válido"
nem bloqueia por um responder indisponível, seguindo o mesmo princípio já usado para completar a cadeia por AIA
(`fetchIssuer`) e a decisão de 19/10/2026 sobre habilitação/certificado não confirmado (não bloqueia; só o
positivo — revogado de facto — é que impede confiança).

- Testes de ponta a ponta com um responder OCSP real (servidor HTTP local + `BasicOCSPResponse` assinada pela
  própria CA de teste, como o pkijs documenta): resposta "boa" mantém a confiança, resposta "revogado" derruba-a,
  responder inacessível não bloqueia. Ao escrevê-los foi apanhado um bug real (não hipotético): o conteúdo da
  resposta OCSP vinha como vista (`Uint8Array`) sobre o `ArrayBuffer` completo da mensagem, não cortada ao seu
  próprio intervalo — sem o corte, o `BasicOCSPResponse` lia bytes de fora de si e falhava sempre de forma
  silenciosa (sempre `null`/inconclusivo), nunca chegando a confirmar nem "bom" nem "revogado" — só os testes com
  um responder real o revelaram; um teste que só verificasse "não rebenta" teria passado da mesma forma com o
  bug lá.
- 391 testes (24 destes são novos, de `pades.ts`), tsc, lint, build — zero.

## 22/10/2026 — "ponto 1" do algoritmo de fee: motor construído e testado, de propósito não ligado

Sessão autónoma (o promotor pediu para avançar o máximo possível sem parar para perguntar). O documento
`Algoritmo_determinacao_fee_QuemPinta_v1.docx` tem duas partes: o "ponto 2" (descontos por referência, já
construído e em produção — ver entradas anteriores de 22/10/2026) e o "ponto 1" (a própria faixa dinâmica
18-23%, substituindo os 3% fixos), que o promotor decidiu deixar para depois.

`src/domain/fee.ts` implementa o "ponto 1" por inteiro como funções puras, testadas byte a byte contra os
cenários da secção 9 do documento (os quatro exemplos de B/A/T e os montantes em euros em 40.000€, incluindo o
piso de 9% e o exemplo do mínimo monetário de 150€) — não há nenhum valor inventado; tudo o que o código produz
foi conferido contra um número que o próprio documento já mostrava.

**Decisão desta sessão: construir o motor, não o ligar a nada.** Não por cautela genérica, mas porque faltam
peças que não são minhas para inventar:
- Não há onde declarar C/E/F/M/J no pedido ou na proposta — são campos de ecrã que não existem.
- R e L precisam de uma consulta ao histórico (propostas anteriores da oportunidade; janela de 180 dias) que
  não existe hoje.
- A parcela de qualidade competitiva de L depende de um indicador S que o próprio documento diz vir de "um
  módulo de ranking separado ainda a fechar" — `fidelizacaoBp` recebe esse número já pronto, nunca o inventa.
- O documento assinala os seus próprios pesos (referência de 21%, cada fator, os escalões de R/L) como
  "propostas para teste", não decisões fechadas — trocar a comissão real por eles sem o promotor ver e aprovar
  cada número seria exatamente o género de decisão de negócio que não me cabe tomar sozinho.
- Falta decidir como isto se compõe com os códigos de adesão (mecanismo à parte, não previsto no documento, que
  o promotor manteve e fez crescer nesta mesma sessão) — hoje somam-se por cima da comissão em produção; juntar
  os dois motores sem decidir a ordem e o teto certo muda dinheiro real, não é só código.

Q (referências de fornecedores) não foi reimplementado: `fee.ts` chama `referralDiscountFor`
(`src/domain/referralEligibility.ts`), já construído e testado, exatamente a fórmula da secção 7. A comissão em
euros também não inventa uma conta nova: reaproveita `percentOf` de `money.ts`, o mesmo arredondamento de
sempre, só com T a variar em vez de ser fixo.

Quando o promotor quiser avançar: o motor já está pronto, validado, e pode ser ligado assim que existirem os
campos de ecrã, a consulta de R/L e uma decisão sobre o indicador S e a composição com os códigos de adesão.

## 22/10/2026 — comparador do cliente: cobertura dos trabalhos pedidos (fase 4 do `docs/PROPOSTA.md`)

O comparador já mostrava, produto a produto, se cada proposta seguia o que o cliente pediu (20/10/2026); não
mostrava o mesmo para **trabalhos** (ex.: o cliente pediu tratamento de humidade — alguma proposta responde a
isso, e como?). A ligação já existia no modelo (`WorkDef.requested` em `src/domain/works.ts`, usada até agora só
nas pendências do lado do pintor, `budgetIssues`) — faltava só mostrá-la do lado do cliente.

- `requestedCoverage(requested, lines)`, nova em `works.ts`, pura e testada: para cada trabalho pedido, procura a
  linha da proposta com esse código (`ProposalLine.trabalho`) e devolve o estado (proposta base / opcional / a
  confirmar / não incluído) ou `null` se a proposta não tiver essa linha — nunca filtra a lista de entrada, para
  o comparador poder cruzar pelo índice sem risco de desalinhar.
- `/app/pedidos/[id]/propostas`: uma linha por trabalho pedido, ao lado das já existentes por produto pedido, com
  a mesma lógica de cor (vermelho só quando explicitamente não incluído; "Não indicado" quando a proposta nem
  fala no trabalho — nunca se lê silêncio como "incluído").
- Testado (`src/domain/works.test.ts`) e tsc/lint/392 testes/build, zero.
- Fica por fazer, da mesma fase do `docs/PROPOSTA.md`: "duplicar solução" (copiar os campos de uma fachada para
  outra no passo Trabalhos) — é conveniência de preenchimento para o pintor, não uma lacuna de informação ao
  cliente, por isso ficou de fora desta entrada. (Feito separadamente nesta sessão — ver commit `5f399c4`.)

## 22/10/2026 — correções encontradas por uma passagem de `/code-review` sobre os commits da sessão

Seis achados reais, todos corrigidos no mesmo lote, tsc/lint/395 testes/build, zero:

- **`src/lib/pades.ts`, OCSP:** `basic.verify()` recusa-se logo à partida ("No certificates attached") quando a
  resposta não inclui o certificado do próprio responder — o que a RFC 6960 permite (o cliente pode já o
  conhecer). Sem isto, esses responders ficavam sempre "inconclusivos", nunca confirmando "revogado" nem "bom".
  Corrigido: se a resposta não trouxer certificados, usa-se o emissor (e as âncoras) como candidatos antes de
  chamar `verify()` — e simplificou-se o parsing para `BasicOCSPResponse.fromBER`/`OCSPResponse.fromBER`
  (herdados de `PkiObject`), que aceita a vista tal como vem, em vez da conversão manual para `ArrayBuffer`.
  Novo teste prova o caso (falha sem a correção, confirmado antes de reverter).
- **`src/domain/works.ts`, `requestedCoverage`:** só olhava para a primeira linha da proposta com aquele código
  de trabalho; com várias zonas (ex.: pintura incluída numa fachada, não incluída noutra), mostrava "não
  incluído" ao cliente mesmo que a proposta cobrisse o trabalho noutra zona. Corrigido para contar o melhor
  estado encontrado entre todas as linhas desse trabalho, como `budgetIssues` já fazia do lado do pintor.
- **Migração do convite direto, `redeem_request_invite`/`request_invite_info`:** não verificavam se a obra ainda
  estava publicada (ao contrário da política de inserção, que já o fazia) — um convite de uma obra fechada
  entretanto podia ainda ser resgatado, levando a um beco sem saída (404 na oportunidade já fechada) em vez de
  um erro claro. Corrigido com a mesma verificação (`private.listing_open`) nos dois sítios.
- **`/app/organizacoes/[id]/referencias`:** a lista de "fornecedores com código de adesão ligado" mostrava uma
  linha por código, não por fornecedor — se um fornecedor tivesse dois códigos ligados, aparecia duas vezes,
  sugerindo visualmente o dobro do desconto realmente aplicado (que já contava só fornecedores distintos).
  `linkedSupplierCodes` passou a devolver também o `supplierOrgId`; a página usa-o para mostrar cada fornecedor
  uma só vez.
- **`/app/pedidos/[id]/propostas`:** a cobertura dos trabalhos pedidos (acima) recalculava tudo a cada célula da
  tabela em vez de uma vez por pintor — sem impacto real com as listas pequenas de hoje, mas corrigido para um
  mapa calculado uma vez.

## 23/10/2026 — ficheiros enviados: confirmar o tipo pelos bytes, não pelo que o navegador diz (SEG-05)

Levantamento contra o documento de requisitos (secção 25.2, SEG-05: "o nome da extensão não é suficiente para
confiar num documento"). As fotografias já faziam isto bem (`sniffImage`, `src/domain/photo.ts`, com remoção de
metadados a seguir) — mas os três sítios que recebem **PDF** confiavam no `file.type` que o navegador envia, que
quem submete o formulário controla por inteiro (um pedido direto à *server action*, sem passar pelo ecrã, pode
dizer `application/pdf` sobre qualquer conteúdo, incluindo HTML/script). Um ficheiro assim ficava guardado no
armazenamento com esse rótulo e podia mais tarde ser servido como se fosse PDF a outra pessoa.

- `src/domain/fileSignature.ts`: `sniffPdf(bytes)`, pura e testada — confirma `%PDF-` nos primeiros bytes, o
  mesmo princípio de `sniffImage`, não uma abstração nova.
- Documentos de entidade (`uploadDocument`, `src/app/app/actions.ts`): deixou de confiar em `file.type`; sniffa
  PDF ou imagem a partir dos bytes recebidos e usa esse resultado (não o que o pedido alegava) para o tipo
  gravado no armazenamento.
- Fatura de resgate de comissão (`submitRedemptionInvoice`, `.../adesoes/actions.ts`): o mesmo, só para PDF.
- Ficha técnica de um produto (`addProduct`, `.../catalogo/actions.ts`): já fazia a confirmação pelos bytes à
  mão (`String.fromCharCode(...head) !== '%PDF-'`) — só passou a usar a função partilhada, sem mudar o
  comportamento.
- O PDF do contrato assinado (`contratacoes/actions.ts`) já não precisava disto: `checkSignedPdf`/
  `verifySignature` (`src/lib/pades.ts`) já validam a estrutura e a assinatura criptográfica do ficheiro
  inteiro, uma verificação de conteúdo muito mais forte do que confirmar só os primeiros bytes.
- O extrato bancário (`bank-actions.ts`) não precisa disto por outra razão: o próprio `parseBankFile` lê e
  interpreta o conteúdo como texto — um ficheiro que não seja um extrato simplesmente falha a interpretar-se,
  não há um rótulo de tipo a confiar cegamente.
- Testado (`src/domain/fileSignature.test.ts`) e tsc, lint, 397 testes, build, zero.

## 23/10/2026 — litígio resolvido passa a avisar as duas partes

Levantamento contra o documento de requisitos (secção 24.1, COM-05, lista de eventos que merecem aviso).
`engagementNotices` (`src/domain/notifications.ts`) já cobria a abertura de um litígio (`em_litigio`), mas não a
sua resolução com culpa atribuída (`litigio_culpa_cliente`/`litigio_culpa_pintor`) — as duas partes só saberiam
o resultado abrindo a app, sem nenhum gatilho a avisar que havia novidade. São estados com dinheiro a mudar de
mãos (a caução ou a comissão ficam retidas, conforme o lado — ver `engagement.ts`, `resolveDispute`), por isso
pareceu-me claramente a faltar, não uma decisão de negócio nova: o resultado (quem perde o quê) já estava
decidido pela função pura; faltava só dizê-lo.

- Dois casos novos no `switch` de `engagementNotices`, no mesmo formato dos já existentes: cada parte sabe se
  o seu lado fica retido ou devolvido, nunca o que a outra parte especificamente perdeu ou ganhou em termos que
  não sejam os seus próprios.
- `notifyEngagementChange` (`src/lib/notify.ts`) já chama `engagementNotices` genericamente a cada evento
  registado (incluindo a resolução de um litígio, em `contratacoes/actions.ts`) — não precisou de nenhuma
  alteração para os novos casos chegarem a quem deve.
- Testado em `src/domain/notifications.test.ts`. tsc, lint, 398 testes, build, zero.
- **Não acrescentado, por decisão própria e não por esquecimento:** `encerrado_sem_contrato` continua sem aviso
  próprio — acontece só depois de o pintor já ter falhado (o que já gerou um aviso) e de o cliente, pela sua
  própria ação na app, escolher não continuar; um novo email aí informaria cada parte de algo que já sabe (o
  cliente, porque é ele que o faz; o pintor, porque já sabia que tinha falhado). Se preferires avisar mesmo
  assim, é uma linha igual às outras.

## 23/10/2026 — mensagem nova numa proposta passa a avisar por email

Mesmo levantamento (COM-05): "esclarecimento recebido" está na lista de eventos que merecem aviso, mas
`sendMessage` (`src/app/app/oportunidades/actions.ts`) só gravava a mensagem — quem a recebia só saberia se
voltasse a abrir essa proposta específica. Era o único canal de comunicação da plataforma sem nenhum aviso.

- `notifyNewMessage(proposalId, lado)`, nova em `notify.ts`: avisa só quem não escreveu, nunca repete o texto da
  mensagem no email (já passou pelo filtro de contactos — `guardContact` — mas não há razão para o repetir) e
  mantém o anonimato de sempre antes da apresentação ("uma das propostas", nunca a empresa).
- Um só ponto de inserção (`sendMessage`) serve as duas páginas que mostram conversas (`MessageThread.tsx`), por
  isso uma só chamada cobre tudo — cliente a perguntar numa proposta ainda rascunho incluído.
- `notify.ts` não tem testes diretos (é `server-only`, como as outras funções de envio neste ficheiro) — tsc,
  lint, 398 testes, build, zero.

## 23/10/2026 — avaliações e encomendas passam a avisar; fornecedor passa a ver as suas avaliações

Mesmo levantamento (COM-05: "avaliação" e "compra confirmada"). Duas partes:

- **Cliente avalia o pintor** (`saveReview`, `src/app/app/extras-actions.ts`): `notifyNewReview`, nova em
  `notify.ts`, avisa a empresa de pintura na primeira vez que o cliente avalia (não nas edições seguintes, que já
  tinham o texto "Avaliação atualizada" a distinguir), sem repetir a nota nem o comentário no email.
- **Pintor ↔ fornecedor**: `orderMaterial`/`setOrderState`/`reviewSupplier` (`src/app/app/obras/actions.ts`) são
  as três ações que atravessam esta relação (encomendas com confirmação, avaliações) e nenhuma avisava ninguém —
  o fornecedor só saberia de uma encomenda nova abrindo `/app/encomendas` por iniciativa própria, e o pintor só
  saberia que foi confirmada/entregue da mesma forma.

- `notifyNewOrder`, `notifyOrderState`, `notifyNewSupplierReview`, novas em `notify.ts`, no mesmo padrão das
  outras: nunca repetem o comentário nem outro conteúdo gerado pelo utilizador, só dizem que há novidade e para
  onde ir vê-la. `setOrderState` só é chamado por quem gere o fornecedor (a única entidade com acesso de escrita
  a partir de `/app/encomendas`), confirmado na política RLS antes de assumir a direção do aviso.
- **Buraco maior encontrado ao construir isto, não só a faltar o aviso:** o fornecedor não tinha *nenhuma forma*
  de ver as avaliações que os pintores lhe fazem (`supplier_reviews` só era lida do lado do pintor, em
  `obras/[id]/page.tsx`) — o aviso ia apontar para lado nenhum. Acrescentada uma secção "Avaliações de pintores"
  em `/app/organizacoes/[id]` (visível só a entidades fornecedor), com o nome de quem avaliou — não há regra de
  anonimato entre pintor e fornecedor equivalente à do cliente antes da apresentação, por isso não escondi nada.
- **Deixado de fora, por ser uma funcionalidade nova e não só a ligação de uma já construída:** responder a uma
  avaliação de fornecedor (`supplier_reviews` nunca teve campos `resposta`/`resposta_at`, ao contrário de
  `reviews`) — parece ter sido uma escolha deliberada na migração original (`20261019012701_materiais_obra.sql`),
  não um esquecimento igual aos avisos; se quiseres que o fornecedor possa responder, como já pode o pintor, é
  uma migração pequena, mas é uma decisão a confirmar, não só uma lacuna a fechar.
- Testado por tsc, lint, 398 testes, build (sem teste direto novo: a secção é leitura simples e as funções de
  aviso são `server-only`, como as outras). Smoke-test confirma o mesmo erro ambiental de sempre, sem erro novo.

## 23/10/2026 — fila de litígios no backoffice (não existia nenhuma)

A secção "5. Backoffice: filas, denúncias, litígios, conciliação, auditoria" de `docs/ESTADO.md` diz "Feito",
mas ao construir a fila de avisos (acima) notei que resolver um litígio (`litigio_resolvido`, única ação por
`contratacoes/[id]/page.tsx`) não tinha nenhuma fila a levar a equipa até lá — uma contratação em litígio só
aparecia a quem já soubesse o seu ID, ou a quem percorresse "Todas" uma a uma. DIS-05 (documento de requisitos)
pede precisamente que a equipa consiga reunir e encontrar os casos.

- `/app/backoffice/contratacoes/litigios`, novo separador junto de "Assinaturas a conferir": lista as
  contratações em litígio, reaproveitando `EngagementList`/`pendingEngagements` já existentes — nenhuma
  consulta nova à base de dados, só um filtro sobre o que a página "Todas" já calcula.
- A contagem no Painel principal usa a mesma reconstrução já feita por `pendingEngagements` (sem custo extra).
  **Não foi posta em `queueCounts`/`backofficeCounts.ts`** (tentei primeiro; `status` não é uma coluna real —
  reconstrói-se sempre a partir de `engagement_events`, CLAUDE.md já o explica — e esse ficheiro existe
  precisamente para contagens baratas, uma coluna direta; adicionar uma reconstrução completa ali tornaria cara
  a barra lateral em todas as páginas do backoffice, não só nesta). Por isso o separador em si não tem número
  (como o separador "Todas", ao lado, também não tem) — só o Painel principal, que já paga esse custo de
  qualquer forma.
- Testado por tsc, lint, 398 testes, build, zero; smoke-test com o mesmo erro ambiental de sempre.

## 23/10/2026 — litígio com repartição (DIS-07/DIS-08), decidido com julgamento próprio

Terceira questão registada em `docs/ESTADO.md` (item 8) a 23/10/2026, autorizada pelo promotor a resolver com o
meu melhor julgamento ("continua, resolve as 3 questões com o teu melhor julgamento"). O documento de requisitos
(DIS-07/DIS-08, UAT-26) pede um acordo "60%/40%" entre as partes; `resolveDispute` só tinha os dois desfechos
binários. Faltava decidir **para onde vai cada fração — não só que existe uma fração.**

- **Para onde vai o dinheiro, confirmado por `docs/MODELO.md` antes de tocar em `engagement.ts` (regra do
  CLAUDE.md):** a tabela de desfechos e a frase "a plataforma devolve a comissão ao pintor (que não teve culpa)
  e fica com a caução" confirmam que nos dois desfechos binários o dinheiro nunca passa de uma parte para a
  outra — só entre cada parte e a plataforma (a caução retida é receita da plataforma, nunca paga ao pintor; a
  comissão retida também). Uma primeira leitura minha do DIS-12 genérico ("devolução de caução ao pintor")
  tinha-me feito pensar o contrário; é exatamente a hipótese que o CLAUDE.md pede para verificar no MODELO.md
  antes de mudar isto, e o próprio `settlement()` (campo `plataforma.recebeu`, que já soma `retencao_fee` e
  `retencao_garantia`) confirma a leitura do MODELO.md.
- **Desenho (minha decisão):** um parâmetro só, `culpaClientePercent` (1-99, inteiro), aplicado com o mesmo
  sentido às duas rubricas: essa fração da caução fica retida pela plataforma (o resto volta ao cliente); essa
  mesma fração da comissão volta ao pintor (o resto fica retido pela plataforma). Em 100% e 0% reproduz
  exatamente os dois desfechos binários já existentes — por isso ficaram como estavam (`culpa_cliente`,
  `culpa_pintor`), e o novo caminho (`outcome: 'repartido'`) cobre só o meio-termo, 1 a 99. Os dois lados nunca
  trocam dinheiro diretamente, só com a plataforma — consistente com o resto do modelo.
- **Quem decide e como se fecha a conta:** a equipa da plataforma, no mesmo formulário que já tinha as duas
  decisões binárias (não é um acordo que as partes propõem uma à outra na aplicação — isso ficaria para o
  documento jurídico da minuta, fora do que hoje existe). Os dois valores (retido/devolvido) são sempre
  complementares por construção (`total - percentOf(total, pct)`), nunca por dois arredondamentos
  independentes — fecha sempre ao cêntimo, sem resto.
- **Construído:** `DisputeOutcome` ganha `'repartido'`; `EngagementStatus` ganha `'litigio_repartido'`;
  `resolveDispute` valida a percentagem (inteiro 1-99) e lança `EngagementError` fora disso. `contracting.ts`
  (payload, `apply`, `STATUS_LABELS`), `notifications.ts` (aviso genérico, sem dizer quem "ganhou", como os
  outros dois já não dizem valores), `contratacoes/actions.ts` (`OUTCOMES`, validação da percentagem) e
  `ActionForms.tsx` (campo numérico que só aparece com "Repartido" escolhido). Nenhuma migração: `payload` de
  `engagement_events` é `jsonb` sem restrição de esquema.
- Testado em `engagement.test.ts` (37% e 60%, incluindo o fecho exato ao cêntimo e a rejeição de percentagens
  fora de 1-99) e `notifications.test.ts`. tsc, lint, 407 testes, build, zero.

## 23/10/2026 — avaliação de uma obra cancelada (AVA-01), decidido com julgamento próprio

Segunda das 3 questões ("continua, resolve as 3 questões com o teu melhor julgamento"). O documento (AVA-01)
pede avaliações de uma obra concluída e de um cancelamento em categorias distinguíveis; `reviews` só aceitava
uma avaliação quando `pintor_assinou` tinha acontecido.

- **Quando é possível avaliar um cancelamento (a decisão em falta):** só depois de as partes se terem
  conhecido — `reviewCategory` (`contracting.ts`) usa `isRevealed` (o mesmo `feePaid`) e uma lista explícita de
  estados finais (`pintor_nao_assinou`, `cliente_desistiu`, os três desfechos de litígio, `encerrado_sem_contrato`,
  `transitado`), devolvendo `'concluida'` só para `assinado` e `'cancelamento'` para o resto, ou `null` se ainda
  não há nada a avaliar (litígio aberto sem desfecho, ou nunca revelado). Antes da apresentação não há o que
  avaliar — ninguém conheceu ninguém; um litígio só é avaliável depois de resolvido.
  - **Porque não dava para usar só o estado, no SQL da política de inserção:** `pintor_nao_assinou`/
    `pintor_nao_pagou` são estados calculados pela passagem do tempo (`expire()`), sem nenhum acontecimento
    próprio gravado — não há forma barata de os reconstruir em SQL puro (o motivo, já conhecido neste projeto,
    por que `backofficeCounts.ts` teve de voltar a `loadReplay`). Por isso a política RLS (`reviews_insert`)
    ficou mais larga que a regra exata — exige só `engagement_signed() OR engagement_revealed()` (a marca
    `reveal` já existe em `engagement_events`) — e a regra precisa (os estados finais de cima) fica em
    `saveReview` (`extras-actions.ts`), que já carrega o replay para outras verificações. É a mesma repartição
    que o resto do projeto já usa: SQL protege a identidade de quem faz o quê, `engagement.ts`/`contracting.ts`
    decide se o estado é válido.
- **Com que efeito na reputação (a outra decisão em falta):** a categoria fica gravada em
  `reviews.obra_concluida` (calculada no servidor, no gatilho de inserção — nunca escolhida pelo cliente, como
  já acontecia a `painter_org_id`), e `painter_rating()` (a média que o comparador mostra) passa a somar só
  `obra_concluida = true`. Decidi não misturar: um cancelamento depois da apresentação é um sinal diferente de
  "qualidade do trabalho" — fica visível na íntegra na própria contratação (comentário incluído, com rótulo
  "obra cancelada"), mas não entra numa média de 1 a 5 pensada para trabalho executado.
- **Construído:** migração `20261023143504_avaliacao_cancelamento.sql` (coluna `obra_concluida`, função
  `private.engagement_revealed`, `review_guard`/`reviews_insert`/`painter_rating` atualizados); `reviewCategory`
  em `contracting.ts`; `saveReview` passa a verificar a categoria antes de gravar; `/app/contratacoes/[id]`
  mostra o rótulo da categoria e já não esconde a secção fora de `assinado`.
- Testado em `contracting.test.ts` (5 casos novos: concluída, cancelamento por prazo do pintor, sem categoria
  antes da apresentação, sem categoria em litígio aberto, cancelamento por litígio) e um teste novo em
  `supabase/tests/rls.test.ts` (avaliação revelada-mas-não-assinada aceite, excluída da média, pintor continua
  sem poder avaliar). tsc, lint, 413 testes, build, zero.
- **Travão genuíno, não lacuna de código:** a ligação MCP ao Supabase passou a devolver "sem permissão" a meio
  desta sessão (via `list_migrations`/`apply_migration`, que tinham funcionado antes nesta mesma sessão) — a
  migração está escrita e testada localmente (PGlite, `supabase/tests/`), mas **não chegou ao projeto real**;
  falta também regenerar `src/lib/database.types.ts` e correr os avisos de segurança/desempenho. Ver
  `docs/ESTADO.md`, "Pendente do promotor".

## 23/10/2026 — fornecedor responde a uma avaliação (paridade com `reviews.resposta`)

Terceira e última das 3 questões. Simples como o item 10 de `docs/ESTADO.md` já previa: `supplier_reviews`
nunca teve `resposta`/`resposta_at`, só `reviews` (cliente ↔ pintor) os tinha.

- **Mesmo mecanismo, não um novo:** migração `20261023143518_resposta_avaliacao_fornecedor.sql` acrescenta as
  duas colunas e um gatilho `private.supplier_review_guard()` que é a mesma lógica de `private.review_guard()`
  aplicada a `supplier_reviews` — o pintor (dono da avaliação) atualiza a nota sem tocar na resposta; o
  fornecedor só altera a resposta, nunca a nota (erro claro se tentar as duas coisas na mesma atualização). A
  política `supplier_reviews_update` passou a aceitar também `can_manage_org(supplier_org_id)`, antes só o
  pintor podia sequer atualizar a linha.
- **Sem `guardContact` na resposta** (ao contrário de `answerReview`, do lado cliente/pintor): confirmei que
  `reviewSupplier`, o lado que já existia, também nunca lhe aplicou esse filtro ao `comentario` — não há regra
  de anonimato nesta relação (confirmado na decisão de 23/10/2026 sobre as avaliações de fornecedor, acima), por
  isso segui o precedente da própria tabela, não o de uma tabela de outra relação.
- **Sem aviso novo ao pintor quando o fornecedor responde**, pela mesma razão por que `answerReview` (o espelho
  do lado cliente/pintor) também não avisa: seria uma funcionalidade a mais, não paridade.
- `answerSupplierReview` (`obras/actions.ts`); formulário novo `SupplierReviewAnswer.tsx` em
  `/app/organizacoes/[id]` (secção "Avaliações de pintores", já existente); a resposta também passou a
  aparecer do lado do pintor, em `/app/obras/[id]`, onde já via a própria avaliação.
- **`src/lib/database.types.ts` editado à mão** (campos `reviews.obra_concluida` e `supplier_reviews.resposta`/
  `resposta_at`): sem este ficheiro ao corrente, `tsc` recusava compilar as consultas tipadas a estas duas
  colunas novas — o mesmo travão de ligação ao Supabase da decisão anterior. A regenerar quando a ligação
  voltar (deve substituir sem diferença, mas confirmar).
- Testado em `supabase/tests/rls.test.ts` (fornecedor responde; não pode alterar a nota pela resposta; a
  resposta sobrevive a uma atualização do pintor). tsc, lint, 414 testes, build, zero.

## 23/10/2026 — levantamento da obra por um vendedor do fornecedor, papel novo e workspace do fornecedor

Pedido do promotor, com origem no documento "Quem Pinta — a oferta" (consolidação do "painel de compradores",
3 rondas, e do "board" — feedback de uma sessão de IA externa, colado nesta mesma conversa antes de uma
compactação de contexto; secções 3.1–3.6 especificam o mecanismo). Depois de eu ter perdido esse contexto e
feito perguntas sobre coisas já decididas, o promotor corrigiu de forma direta e pediu para pesquisar antes de
continuar — o que fiz (grep ao transcript bruto da sessão por palavra-chave, antes de voltar a escrever).

- **O papel `vendedor` é da pessoa que vende tintas (do fornecedor), nunca uma figura nova e independente.**
  Acede à sua entidade com login normal (`can_access_org` passa a incluir `'vendedor'`), mas não gere produtos,
  descontos nem a equipa — isso continua reservado a `proprietario`/`gestor` (`can_manage_org`, intocado). Pode
  receber e fazer o levantamento de obras na sua zona (`roleDescription`, `organization.ts`).
- **O mecanismo do levantamento (o pedido central, com todo o pormenor):** o cliente pode sempre preencher
  superfícies e fotografias sozinho — isto é uma rede de segurança, nunca uma obrigação. Um cartão bem
  destacado no pedido (`RequestSurveyCard.tsx`) deixa pedir a visita de um profissional qualificado, com o
  texto exigido pelo promotor, literal: **não acrescenta nenhum custo à obra**, e a responsabilidade pelos
  dados continua do cliente, como se os tivesse preenchido sozinho. O primeiro vendedor elegível a reservar
  avança (`reserve_survey`, verificação atómica no `where`, não leitura-depois-escrita); tem 48h
  (`RESERVE_WINDOW_HOURS`, `src/domain/survey.ts`) para contactar, agendar e concluir.
- **Zona por concelho**, `supplier_survey_coverage`: sem linha, ou lista vazia, cobre todo o país — mesma
  convenção já em produção em `supplier_delivery`, para não introduzir uma segunda forma de dizer a mesma coisa.
- **Anonimato mantido, com uma excepção nova e deliberada:** o cliente nunca sabe que empresa ou que pessoa vai
  (só uma nota de 0 a 5, "primeira obra na plataforma" se ainda não houver nenhuma — pedido explícito do
  promotor, ao contrário do comparador de pintores, que exige um mínimo de obras antes de mostrar média). Mas o
  vendedor que reserva passa a ver a morada exacta (`buildings_select`, `work_requests_select` e as políticas de
  `request_surfaces`/`request_photos`/`fotos`, com um `can_access_as_surveyor` novo) — excepção à regra 6 do
  CLAUDE.md, documentada em comentário na própria migração: sem morada não há visita. Antes de a ver, aceita
  termos de confidencialidade (`survey_terms_acceptances`, por pessoa — não por entidade como
  `painter_terms_acceptances`, de propósito: é a pessoa que vai a casa de alguém, não a empresa); o gatilho é só
  na aplicação, nunca em RLS, pela mesma razão por que os termos do pintor também não o são.
- **Reutilização, não invenção:** o vendedor regista o levantamento com os componentes `SurfaceForm` e
  `PhotoUpload` já existentes, sem alterações — confirmei primeiro que as suas server actions não tinham
  nenhuma verificação de autorização redundante além da RLS, por isso a RLS por si só já os cobre para este
  novo actor. A fórmula de resgate (IVA, retenção, líquido) e a tabela de dados de pagamento
  (`supplier_payout_details`) são as mesmas das comissões de adesão — sem segundo formulário de IBAN.
- **Compensação:** uma fração da comissão que a *plataforma* recebe (nunca do valor da obra, nunca um custo
  extra ao cliente), criada só quando essa comissão já entrou (`settleSurveyPayout`, chamado de
  `contratacoes/actions.ts` no mesmo ponto em que se liquidam reembolsos) — ciclo de vida mais simples que
  `referral_payouts` (`adjudicada` → `paga`/`sem_efeito`), por não haver nada antes de a comissão chegar.
  **A percentagem (`SURVEY_SHARE_BP_PROVISIONAL`, 10%, `src/domain/survey.ts`) é um valor provisório meu, não
  uma decisão do promotor** — só a estrutura e a fórmula estão decididas; falta confirmar o número antes de
  qualquer pagamento real.
- **Avisos, sem nomear o fornecedor nem o vendedor:** o cliente é avisado quando o levantamento é concluído
  (a app já prometia isto no próprio texto do cartão: "Avisamos quando o levantamento estiver registado") e
  quando uma reserva vencida liberta o pedido para outro profissional — mesmo padrão já em
  `private.daily_maintenance` para um anúncio cujo prazo de propostas termina. **Decidi não avisar** na
  reserva inicial (o próprio texto do cartão não promete isso) **nem quando o vendedor recebe uma avaliação**
  (não há esse precedente em nenhuma avaliação da plataforma) — para não inventar notificações que ninguém
  pediu.
- **Reserva vencida volta a `'aberto'` na mesma linha** (limpa `vendedor_org_id`, notas de contacto e
  agendamento, para o próximo vendedor não herdar o que ficou do anterior) — acrescentado a
  `private.daily_maintenance` (`create or replace`, corpo completo; os três blocos já existentes ficam iguais).
  **O estado `'expirado'` fica definido mas sem nenhum gatilho que o use**: seria para um pedido `'aberto'` que
  nunca chega a ser reservado por ninguém, e não há nenhuma especificação de prazo para isso — o próprio cliente
  já pode sempre desistir (`cancel_survey`) ou continuar a preencher sozinho entretanto, o que já cobre
  "demorar demasiado" sem inventar um temporizador novo sem pedido nem número.
- **Workspace do fornecedor, antes pobre e quase vazio:** a barra lateral só tinha "Encomendas"; ganhou
  "Levantamentos" e acesso directo a "Produtos e descontos", "Referências" e "Comissões de adesão"
  (`layout.tsx`), antes só alcançáveis a partir da ficha da entidade. Contas de pintor e de fornecedor são
  sempre uma só entidade (`allowedOrgKinds`) — a Início troca a lista "As suas entidades" com um único item por
  um atalho directo para essa entidade, preservando avisos, convites e o resto do painel; administradoras e
  condomínios (que podem ter várias) continuam a ver a lista.
- **Construído:** `src/domain/survey.ts` (puro); migrações `20261023143532_papel_vendedor.sql` (o valor novo do
  enum tem de estar numa migração à parte — `alter type ... add value` não pode ser usado na mesma transacção
  que o cria), `20261023143643_levantamento_por_vendedor.sql` (esquema, RLS, RPCs) e
  `20261023143658_levantamento_avisos_e_expiracao.sql` (gatilho de aviso, extensão da manutenção diária);
  `src/lib/surveys.ts`; páginas e acções em `src/app/app/pedidos/[id]/` (cartão do cliente) e
  `src/app/app/levantamentos/` (lista do vendedor, workspace por obra, termos, formulários).
- **Duas armadilhas de RLS, registadas em comentário nas próprias migrações para não se repetirem:** quatro
  políticas (`buildings_select`, `work_requests_select`, `request_surfaces_select`, `request_photos_select`)
  já tinham sido alteradas uma vez antes (apresentação pós-comissão); `alter policy` substitui a cláusula
  inteira, nunca soma — a nova condição teve de ser fundida com a anterior, não só acrescentada. E uma função
  partilhada que tentava evitar repetir a condição de acesso (`can_see_survey`, extraída de
  `request_surveys_select` e `survey_preview`) partia o `insert ... returning`, por se voltar a interrogar a
  própria tabela dentro da política de leitura da linha que ainda se está a inserir — revertido de propósito,
  com a duplicação assumida e comentada.
- Testado em `src/domain/survey.test.ts` (6 casos) e `supabase/tests/rls.test.ts` (7 casos: pedido só pelo
  gestor do cliente; pré-visualização segura antes de reservar, invisível a um estranho; reserva atómica,
  primeiro-a-chegar; morada real e registo completo pelo vendedor que reservou; avaliação com "primeira obra";
  aviso ao concluir sem nomear ninguém; reserva vencida liberta-se, o vendedor perde o acesso e o cliente é
  avisado). tsc, lint, 427 testes, build, zero.
- **Mesmo travão desta sessão, ainda sem resolução:** a ligação MCP ao Supabase continua sem permissão
  (`list_migrations`/`apply_migration`) — todo este esquema existe só como ficheiros locais, testados em
  PGlite, **nunca aplicados ao projeto real**; `src/lib/database.types.ts` continua a ser mantido à mão (e um
  erro meu nessa manutenção manual foi encontrado e corrigido nesta mesma sessão: `survey_terms_acceptances`
  tinha `user_id` marcado como opcional no tipo `Insert`, quando a coluna não tem valor por omissão na base de
  dados — teria deixado passar no `tsc` um `insert` que falharia sempre em produção).

## 23/10/2026 — carteira de clientes do fornecedor: descontos por vários artigos, por cliente específico e "cliente premium"

Pedido do promotor, a olhar diretamente para `/produtos` em produção (captura de ecrã): a secção "Descontos
para pintores" mostrava "Sem descontos." sem nenhuma forma de criar um. Pediu dois eixos — **artigo** (um
tipo, vários artigos concretos à escolha, ou o catálogo inteiro) e **cliente** (todos os pintores, um grupo por
classificação — novo/frequente/**premium** — ou um cliente específico, "personalizado", a partir da ficha
desse cliente) — e que a interface permitisse compor várias linhas seguidas, cada uma cobrindo o que faltava.

- **A maior descoberta desta tarefa foi o que já existia, por baixo da interface que faltava:**
  `DiscountRule.painterOrgId`, `bestDiscount`/`baseMatch` (`src/domain/catalog.ts`) e a própria coluna
  `supplier_discounts.painter_org_id` com a RLS certa (visível só ao fornecedor e ao cliente visado, nunca a
  terceiros) já estavam construídos e testados desde 20/10/2026 (`20261019103652_subscricao_fornecedores.sql`)
  — só nunca tinham chegado a nenhum formulário. O mesmo para a visibilidade do nome do cliente: a política
  `organizations_select` já deixa um fornecedor ver um pintor que lhe tenha comprado
  (`private.ordered_from_me`, `20261019013353_fornecedor_ve_pintor.sql`) — não foi preciso nenhuma RLS nova
  para a ficha do cliente mostrar o nome e os contactos. **Confirmar isto primeiro, a grep e a ler as
  migrações, evitou reconstruir em duplicado um mecanismo que já estava certo** — ficou só por construir a
  interface e, de novo, a classificação manual (abaixo), essa sim nova.
- **"Cliente premium" é classificação manual do fornecedor, nunca contada pelas encomendas** — ao contrário de
  "primeira compra"/"cliente frequente" (que se deduzem de `material_orders`), não há nenhum número óbvio para
  a tornar automática, e o pedido não trouxe nenhum. Tabela nova `supplier_customers` (um par
  fornecedor↔pintor, `premium boolean`, `nota text`) — é também onde fica a "ficha" com condições específicas
  em texto livre ("personalizado"). Decidi não esconder a nota do próprio cliente (RLS: visível aos dois
  lados, só editável pelo fornecedor) — reli o pedido como descrevendo condições combinadas (ex.: "pagamento a
  30 dias"), não comentário interno a esconder; se um dia servir para notas privadas, isso muda a RLS, não o
  resto.
- **"Não precisa de gravar, grava a cada alteração" — interpretado, não citado à letra:** um clique por linha
  ("Criar desconto"), que fica imediatamente guardada e pronta para a próxima (o formulário limpa-se sozinho,
  `resetOnSuccess`), em vez de um botão único de "Guardar tudo" no fim da página. Um verdadeiro gravar a cada
  tecla (cada checkbox marcado) não é o que as `server actions` deste projeto fazem (regra 9 do `CLAUDE.md`,
  `useFormAction`) nem pareceu ganho real para um ecrã de configuração usado ocasionalmente — fica como
  decisão minha, a corrigir se não for isto que se pretendia.
- **Construído:**
  - `src/domain/catalog.ts`: `BUYER_PROFILES` ganha `'cliente_premium'`; `BuyerContext.premium`; `baseMatch`
    casa-o com `supplier_customers.premium`, nunca com a contagem de encomendas.
  - Migrações `20261023050000_clientes_do_fornecedor.sql` (tabela `supplier_customers`, RLS) e
    `20261023051000_desconto_cliente_premium.sql` (alarga o `check` de `supplier_discounts.perfil` — teria
    ficado esquecida sem os testes RLS novos, ver abaixo).
  - `src/lib/materials.ts` (`materialOptions`, `pricedProduct`): consulta `supplier_customers` e passa
    `premium` ao calcular o preço, exatamente como já fazia para `deliveredOrders`.
  - `addDiscount` (`catalogo/actions.ts`): aceita vários `produtos` (uma linha por artigo, no mesmo desconto)
    e um `cliente` opcional — reaproveita o campo `painter_org_id` já existente, nunca inventa um segundo
    mecanismo para "desconto só para alguém".
  - `DiscountForm` (`SupplierRules.tsx`) redesenhado: três modos de artigo (catálogo/tipo/artigos
    específicos, estes com etiqueta do desconto já atribuído) e dois de cliente (todos/um específico);
    reaproveitado tal e qual na ficha do cliente, com `fixedCliente` a esconder o seletor.
  - Páginas novas `/app/organizacoes/[id]/clientes` (carteira, a partir de `material_orders`) e
    `/clientes/[painterOrgId]` (ficha: histórico de encomendas, classificação e nota, descontos só para este
    cliente) — `supplierCustomers`, novo em `src/lib/queries.ts`, serve as duas e também o seletor de cliente
    no formulário geral. Nav do fornecedor ganha "Clientes".
- **Dois erros meus, apanhados só pelos testes novos, não pelo resto da verificação:** o `check` de
  `supplier_discounts.perfil` em SQL não tinha sido alargado quando acrescentei `'cliente_premium'` só no
  TypeScript (tsc/lint/build não o apanham — só um teste a inserir a sério); e a minha primeira asserção para
  "o cliente não pode alterar a própria classificação" esperava que a base rejeitasse — sob RLS, um `update`
  cujo `using` exclui a linha não rejeita, afeta zero linhas em silêncio; corrigido para confirmar o efeito
  (nada mudou), não um erro.
- Testado em `src/domain/catalog.test.ts` (+1: `cliente_premium` só casa com `ctx.premium`, nunca com muitas
  encomendas) e `supabase/tests/rls.test.ts` (+2 casos no bloco já existente, um deles a corrigir uma lacuna
  real: o teste anterior "desconto visível só ao cliente escolhido" só verificava a exclusão de terceiros,
  nunca confirmava que o próprio cliente visado o via). tsc, lint, 430 testes, build — zero.
- **Aplicadas à base real logo a seguir, já com a ligação MCP corrigida por outra sessão em paralelo**
  (`docs/ESTADO.md`, secção 6.1): `clientes_do_fornecedor` (versão real `20261023152645`) e
  `desconto_cliente_premium` (`20261023153053`) — ficheiros locais renomeados a par, `get_advisors` sem avisos
  novos, `database.types.ts` confirmado campo a campo contra o gerado pelo Supabase.

## 23/10/2026 — convite de adesão enviado pelo fornecedor a um pintor fora da plataforma

O separador `/clientes` estava vazio para qualquer fornecedor sem carteira ainda construída: nada nele dizia
o que fazer. Pedido do promotor: nesse estado vazio, dar ao fornecedor uma forma de preencher o nome e o
email de um pintor que já conhece (ex.: um cliente antigo, fora da plataforma) e convidá-lo a aderir — sem
ele ter de descobrir por fora um código de adesão já existente.

- **Reaproveitado por inteiro o mecanismo de código de adesão** (`referral_codes`,
  `20261021070000_codigos_de_adesao.sql`), em vez de inventar um segundo sistema de convites: o botão
  "Convidar" cria um `referral_codes` normal (mesma coluna `code`, gerado por `newReferralCode()`, já
  testado) e o acrescento é só uma segunda forma de o ligar a uma entidade de pintura — fora de uma proposta
  — mais uma tabela leve (`supplier_painter_invites`) só para o fornecedor ver a quem já convidou e se já
  aceitou. Um código ligado desta forma funciona depois exatamente como um código aplicado numa proposta:
  aparece de imediato no seletor "fornecedores já ligados" do pintor.
- **Duas formas de aceitar, as duas já tinham gémeo no código**: `/convite-fornecedor/[code]` (nova) é quase
  linha a linha `/convite/[code]` ("traga o seu pintor", 23/10/2026 mais cedo) — mesmo redirecionamento para
  `/entrar?seguinte=`, mesma mensagem para quem ainda não tem entidade de pintura, mesma forma de escolher
  entre várias; e o campo `codigoConvite` no registo de uma entidade de pintura nova espelha o
  `codigoReferencia` que já existia para o lado do fornecedor em `createOrganization` — aplicado de forma
  silenciosa (um código inválido não impede o registo, só não liga nada).
- **`claim_supplier_invite(p_code, p_org)` em vez de reutilizar `apply_referral_code`**: a função existente
  está presa à existência de uma proposta em rascunho (`p_proposal`) — aqui não há proposta nenhuma, só uma
  entidade de pintura. Escrita de novo, mas com a mesma validação (código ativo, não se reatribui a outra
  empresa depois de aceite) e sem o auto-uso defensivo (`supplier_org_id = p_org`) nunca testado em
  `apply_referral_code` pela mesma razão: o `kind` de uma organização é fixo, por isso um fornecedor nunca
  passa a verificação `is_painter_org` que vem antes.
- **Primeiro envio de email desta lista para um endereço que não é de nenhum utilizador da plataforma**
  (`notifySupplierInvite`, `src/lib/notify.ts`) — todos os anteriores resolviam o destinatário por
  `recipients(orgId)` ou `email_contacto` de uma organização já existente; aqui o endereço vem direto do
  formulário porque é precisamente a pessoa que ainda não tem conta nenhuma para resolver.
- **Construído:** migração `20261023161107_convite_de_adesao_do_fornecedor.sql` (tabela
  `supplier_painter_invites`, RLS — só o gestor do fornecedor cria e vê, ninguém altera nem apaga; funções
  `claim_supplier_invite` e `supplier_invite_info`, esta última a mostrar só o nome do fornecedor e se já foi
  aceite, nunca quem foi convidado); `SUPPLIER_INVITE_NOTICE` (`src/domain/notifications.ts`);
  `inviteSupplierPainter` (`clientes/actions.ts`) + `InviteForm.tsx`; estado vazio de `/clientes` reescrito
  para mostrar o formulário e a lista de convites (aceite/a aguardar) quando o fornecedor ainda não tem
  nenhum cliente; rota `/convite-fornecedor/[code]` (`page.tsx`, `ClaimForm.tsx`, `actions.ts`); campo
  `codigoConvite` em `OrgForm.tsx`, passado por `nova/page.tsx` via `?convite=` e aplicado em
  `createOrganization`.
- Testado em `supabase/tests/rls.test.ts` (+4 casos, bloco novo): só um gestor do fornecedor cria/vê os
  convites; `supplier_invite_info` nunca revela o nome/email escrito no formulário; `claim_supplier_invite`
  rejeita quem não gere a entidade de pintura, código inválido, e não se reatribui depois de aceite; é
  idempotente para a mesma empresa. tsc, lint, 438 testes, build — zero.
- **Aplicada à base real**: `convite_de_adesao_do_fornecedor` (versão real `20261023161107`) — ficheiro local
  renomeado a par, `get_advisors` sem categorias novas de aviso (as funções `security definer` executáveis
  por `authenticated` e o índice novo "nunca usado" são o mesmo padrão já presente em toda a lista de
  convites/códigos, não algo que este convite introduz), `database.types.ts` confirmado campo a campo contra
  o gerado pelo Supabase.

## 23/10/2026 — convite do fornecedor: contacto completo, código promocional, vantagens, remetente identificado

Pedido do promotor logo a seguir, a afinar o convite acima: o formulário deve pedir também telefone e
morada/sede/localização (não só nome e email); poder anexar um código promocional de adesão em vez de um
gerado ao acaso; o próprio separador `/clientes` deve explicar as vantagens para as duas partes; o email
deve identificar a pessoa que convidou, não só a empresa ("Cláudio da Cemtintas convida-o..."); e o email
tem de ser apelativo, cativante, com a imagem da Quem Pinta e a apontar para a página inicial, "como
funciona" e perguntas frequentes.

- **Telefone e morada passam a obrigatórios** na tabela e no formulário (migração aditiva
  `convite_contactos_do_pintor`, tabela confirmada vazia antes de aplicar — por isso `not null` direto, sem
  valor por omissão). "Morada" ficou livre (até 200 carateres) em vez de um endereço estruturado: o
  fornecedor está a descrever um contacto, não a registar uma entidade formal — isso faz-se a sério quando o
  pintor criar a sua própria organização.
- **"Anexar um promo-code de adesão, em que terá o desconto de adesão" — interpretado como um campo opcional
  de código personalizado**, não como um segundo mecanismo de desconto: o convite já reaproveita
  `referral_codes` e já traz consigo os 0,25 p.p. de desconto na comissão (`REFERRAL_BPS`,
  `src/domain/referral.ts`) de sempre, por fornecedor ligado. O que faltava era deixar o fornecedor escolher
  o próprio código (ex. o nome da empresa) em vez de um gerado ao acaso — útil para o transmitir verbalmente
  ou por fora do email. Se o campo ficar vazio, gera-se um ao acaso como antes; se o código escolhido já
  existir, o erro fica no campo (não se tenta outro em silêncio, ao contrário do caminho automático).
- **Remetente identificado pelo nome do perfil (`profiles.nome`), não só pela empresa**: a ação lê o perfil
  de quem está autenticado e passa esse nome ao aviso; se não houver (não devia acontecer, `profiles.nome`
  é `not null`, mas a leitura pode falhar por outra razão), cai para "A equipa da {empresa}".
- **Email redesenhado para se "ler" como um convite, não um aviso**: assunto e primeira linha identificam a
  pessoa e a empresa; o desconto concreto (0,25 p.p.) escrito por extenso, não como "um desconto" vago;
  acrescentada a `notify.ts` a capacidade de pôr ligações secundárias, pequenas, por baixo do botão
  principal — aqui "Como funciona" e "Perguntas frequentes", a apontar para as âncoras já existentes da
  página inicial (`/#como-funciona`, `/#perguntas`). A página `/convite-fornecedor/[code]` ganhou o mesmo
  texto e as mesmas ligações, e corrigiu de passagem uma imprecisão da versão anterior (dizia que o desconto
  só valia "ao usar produtos desta empresa" — não é assim, o desconto da ligação por código é incondicional).
- **Vantagens das duas partes, escritas com cuidado para não inventar nada que a plataforma não faça**: para
  o fornecedor, só a carteira de clientes e os descontos que pode aplicar — nunca uma comissão direta, que
  este programa não paga (ao contrário das "referências de fornecedores", pintor→fornecedor, essa sim paga
  1-2%, secção 5.6 do `docs/ESTADO.md`). Para o pintor, a entrada gratuita e o desconto concreto.
- Nenhuma imagem nova para o email: não havia nenhuma de pintura disponível em `/public/img` (só as de
  prédio, usadas noutros avisos) e não se inventou uma — a diferenciação ficou só no texto.
- Testes RLS ajustados (telefone/morada agora obrigatórios no insert do bloco já existente). `tsc`, lint,
  438 testes, build — zero. Migração aplicada à base real (`20261023171829`), ficheiro renomeado a par,
  `get_advisors` sem categorias novas, `database.types.ts` confirmado campo a campo.

## 23/10/2026 — levantamento automático: deixa de ser o cliente a pedir ajuda, passa a ser sempre aberto por omissão

Pedido do promotor, ao reler o documento-fonte "Quem Pinta — a oferta" (`e46e664a-offer.md`, o mesmo que
originou o mecanismo em 5.3 do `ESTADO.md`) lado a lado com o que tinha ficado implementado: a secção 3.1 do
documento descreve o levantamento como **automático** — todo o pedido publicado passa logo a concurso entre os
vendedores da zona, e o preenchimento pelo próprio cliente só entra como rede de segurança se nenhum vendedor
reclamar a vaga a tempo. O que tinha ficado construído (23/10/2026, mais cedo no mesmo dia) era o inverso: o
cliente tinha de clicar num cartão a pedir a ajuda, com o preenchimento sozinho como opção sempre disponível
por omissão. A tabela da equação de valor do próprio documento (secção 4) só atribui nota 7 ao esforço porque
"o condomínio só publica o pedido básico" — ou seja, sem mais nenhuma ação depois disso. Com pedido explícito,
o esforço só desaparece para quem repara no cartão e decide pedir; para os restantes, o problema #3 (esforço)
que este mecanismo foi inventado para matar continua por resolver.

- **Porque o automático não custa privacidade a mais:** o que um vendedor vê antes de reservar
  (`survey_preview`: só concelho e tipo de obra) já é visível a **todos os pintores da plataforma** a partir
  do momento da publicação. Abrir o levantamento desde o rascunho, em vez de depois de um clique, não expõe
  nada que não fosse já exposto, só mais cedo.
- **O desenho de reserva já estava pronto para um modelo automático, só faltava o gatilho:** a reserva
  atómica, com janela de 48h e libertação automática (`RESERVE_WINDOW_HOURS`, `reserve_survey`,
  `daily_maintenance`) só faz sentido a sério com vários vendedores da zona a competir pelo mesmo pedido ao
  mesmo tempo — exatamente o cenário que o pedido explícito nunca garantia (podia não haver concorrência
  nenhuma, por o cliente nem saber que podia pedir).
- **Construído:** dois gatilhos novos em `work_requests` (migração `20261023170000_levantamento_automatico.sql`):
  `work_requests_create_survey` (AFTER INSERT) abre sempre um `request_surveys` em `'aberto'`, com os
  privilégios do dono da função — mesmo padrão de `private.add_creator_as_owner()` — e
  `work_requests_cancel_survey_on_publish` (AFTER UPDATE) cancela esse levantamento se ainda estiver `'aberto'`
  no momento de publicar (já há superfícies, senão não publicava) sem tocar numa reserva já ativa, que fica
  para revisão humana. O insert direto por um cliente deixa de ser possível (`drop policy
  request_surveys_insert`, `revoke insert ... from authenticated`) — só o gatilho cria a linha. Backfill para
  pedidos já em rascunho sem levantamento ainda. `RequestSurveyCard.tsx`/`survey-actions.ts`: removida a ação
  `requestSurveyHelp` e o formulário de pedido; o estado `'aberto'` passa a mostrar logo o aviso ("pode visitar
  em breve, sem custo") com a opção de desistir ("Prefiro preencher sozinho") — `cancel_survey`, já existente,
  sem alterações.
- Testado em `supabase/tests/rls.test.ts` (2 casos novos no bloco já existente: publicar com levantamento
  ainda aberto cancela-o; uma reserva já ativa não se toca ao publicar) e os 2 casos antigos de
  inserção/leitura ajustados ao novo gatilho (já não se insere à mão, insere-se sozinho; o insert direto falha
  por permissão, não por RLS). tsc, lint, 436 testes, build — zero.
- **Ainda não aplicado à base real**: o modo automático bloqueou o `apply_migration` como "Production
  Deploy", a pedir aprovação explícita do promotor (mesma situação já registada em `docs/ESTADO.md`, secção
  6, para `revoke_delete_clientes_fornecedor`). Fica como ficheiro local, testado em PGlite, à espera de "sim,
  aplica".

## 23/10/2026 — seletor de concelhos por distrito, a substituir "separados por vírgulas"

Pedido do promotor: todos os campos de "concelho" no site (até agora só texto livre, "separados por
vírgulas") devem passar a um seletor tipo lista pendente, organizado por distrito, com um "+" a abrir os
concelhos de cada um. Dois sítios tinham exatamente este campo: "Concelhos servidos" (condição de entrega
em obra, `/produtos`) e "Concelhos" (zona de cobertura do levantamento, `/levantamentos`).

- **A lista dos 308 concelhos não veio de memória nem da Wikipédia — veio da mesma fonte que a aplicação já
  usa em produção**: `buildings.concelho` é preenchido em `AddressFields.tsx` a partir da resposta da API do
  geoapi.pt (`src/lib/postalCodes.ts`, `json.geoapi.pt/cp/{cp}`), que por sua vez serve os dados postais dos
  CTT. Para garantir que os valores deste seletor são exatamente os que a aplicação já guarda — maiúsculas,
  acentos e até os concelhos homónimos desambiguados pelos próprios CTT (ex.: "Lagoa (Algarve)" vs "Lagoa
  (São Miguel)", "Calheta (Madeira)" vs "Calheta (São Jorge)") — clonei o repositório público do próprio
  geoapi.pt (`github.com/iotechpis/geoapi.pt`, a fonte open-source desta API) e extraí os pares
  Distrito/Concelho dos ~193 mil ficheiros de dados postais que ele já gera (`res/postal-codes/data`), que
  são a mesma base que o site consulta ao vivo. Confirmado: 308 concelhos, 278 do continente (18 distritos) +
  19 dos Açores + 11 da Madeira — os totais oficiais. Uma lista escrita de memória arriscava-se a divergir em
  detalhes como "Mêda" (grafia "oficial") vs "Meda" (a grafia que os CTT realmente usam, e portanto a que
  fica gravada nos prédios) — por isso a nota no topo de `src/lib/concelhos.ts` a avisar para nunca
  "corrigir" um nome aqui sem confirmar primeiro contra essa fonte.
- **Açores e Madeira agrupados como duas regiões, não como 11 "ilhas" separadas**: os CTT guardam o campo
  Distrito dos códigos postais insulares por ilha (ex.: "Ilha Terceira", "Ilha do Pico"), não por região
  autónoma — mas isso é só a chave de agrupamento de exibição deste seletor, nunca gravada em lado nenhum;
  juntei as 9 ilhas dos Açores (19 concelhos) e as 2 da Madeira (11 concelhos) nos dois grupos que um
  utilizador português reconhece.
- **Construído:** `src/lib/concelhos.ts` (dados estáticos, `DISTRITOS`) e `src/components/ConcelhosPicker.tsx`
  — grupos `<details>`/`<summary>` nativos (sem JavaScript nenhum: o próprio HTML trata de abrir/fechar),
  uma checkbox por concelho sob o mesmo `name`, e a contagem de selecionados no cabeçalho de cada distrito
  (`group-open:` do Tailwind para o "+"/"−"). O servidor passa a ler `form.getAll('concelhos')` em vez de
  `.split(',')` em `addDelivery` (`catalogo/actions.ts`) e `setSurveyCoverage` (`levantamentos/actions.ts`) —
  o resto do caminho (coluna `text[]`, `coversZone`/`deliveryFor` em `src/domain/`) não mudou nada.
- Testado em `src/lib/concelhos.test.ts` (20 grupos, 308 concelhos, sem distrito nem concelho repetido dentro
  do mesmo distrito, sem concelho homónimo a aparecer em mais de um distrito ao mesmo tempo — só o
  desambiguado tal como os CTT). tsc, lint, 443 testes, build — zero. Não há migração nem mudança de domínio:
  é só a camada de formulário.
- **Verificado visualmente**: página de pré-visualização temporária, aberta com Playwright (screenshot antes
  e depois de clicar no "+" de um distrito) — abre/fecha, mostra a contagem de selecionados, e o distrito com
  um concelho já marcado (`defaultValue`) começa aberto. Página removida a seguir; não ficou nenhum vestígio
  (`git status --porcelain` confirmado vazio dela).

## 23/10/2026 — duas migrações aplicadas à Supabase sem ficheiro no repositório, recuperadas

Ao tentar enviar trabalho novo para o repositório, reparei que `mcp__Supabase__list_migrations` mostrava duas
versões (`20261023182915_limpeza_notas_e_estimativa_rendimento`, `20261023182946_limpeza_notas_so_importacao`,
ambas sobre `reference_products` — limpeza do texto interno de importação e estimativa de rendimento m2/L para
produtos sem ficha técnica oficial) que não existiam em `supabase/migrations/` em nenhum commit, de nenhuma das
duas sessões. A outra sessão (`<>code`) aplicou-as diretamente à base real sem as commitar — quebra a regra do
`CLAUDE.md` ("migrações em `supabase/migrations/`, com o nome igual à versão registada no Supabase").

- Recuperei o texto exato de cada uma via `select statements from supabase_migrations.schema_migrations where
  version in (...)` e escrevi os dois ficheiros, sem qualquer alteração ao conteúdo.
- **Não regenerei `database.types.ts` a par**: a regeneração completa a partir do schema atual revelou uma
  divergência bem maior do que estas duas migrações (quebra `typecheck`/`build` em vários ficheiros não
  relacionados — backoffice, materiais, invoicing, strikes). A tipagem à mão de hoje continua a compilar bem
  com estas duas migrações recuperadas; a reconciliação completa da tipagem fica para uma sessão dedicada, a
  corrigir ficheiro a ficheiro, não de uma vez.
- Fica como aviso para as duas sessões: aplicar uma migração ao Supabase sem a commitar aqui deixa o
  repositório a mentir sobre o estado real da base — a próxima pessoa (ou sessão) a ler `supabase/migrations/`
  vê uma coisa, a base tem outra.

## 23/10/2026 — pedido de esclarecimento ao vendedor sobre o levantamento

Depois de concluído o levantamento (secção 5.3/6.2), qualquer pintor com acesso ao pedido publicado pode achar
a informação insuficiente para orçamentar. O promotor pediu um mecanismo para pedir o que falta, com várias
regras explícitas:

- **Anonimato nos dois sentidos**: as dúvidas de todos os pintores dessa obra juntam-se numa lista única, sem
  identificar quem perguntou (o vendedor nunca sabe qual pintor pediu o quê); e o vendedor responde sempre pela
  plataforma, nunca diretamente — nenhuma mensagem pode conter contactos, moradas nem identificação de ninguém
  (a aplicação valida o texto com `guardContact`/`revealingContent` antes de chamar a função SQL, como qualquer
  outro campo livre).
- **Prazo em dois marcos fixos, sem perda parcial** — correção explícita do promotor a uma proposta minha
  anterior de desconto proporcional por atraso: um dia para confirmar, na aplicação, que vai à obra; mais um
  dia (a partir dessa confirmação, nunca do início do pedido) para lá ir e responder. Falhar qualquer marco
  perde a comissão desta obra **por completo** — nunca parcial — e o esclarecimento passa a estar disponível
  para outro fornecedor da zona reservar (primeiro a chegar, avança — confirmado pelo promotor como o mesmo
  padrão de `reserve_survey`, em vez de um "segundo vendedor" específico).
- **Âmbito estrito**: este mecanismo só serve para pedir esclarecimentos sobre o levantamento já feito — nunca
  para pedir um levantamento novo nem qualquer outra tarefa.
- **A comissão de todo o levantamento transfere-se com a reserva do esclarecimento, não com a visita
  original**: quem reserva uma tentativa escalada passa a ser, a partir desse momento,
  `request_surveys.vendedor_org_id`/`vendedor_user_id` — de onde `settleSurveyPayout` (`src/lib/surveys.ts`) já
  lê em tempo real, no momento em que a comissão do pintor é confirmada (bem depois de qualquer escalada se
  resolver). Não há nenhuma duplicação das regras de pagamento: é a mesma linha que já existia, só
  reatribuída.
- **Construído**: `src/domain/clarification.ts` (prazos); migração
  `20261023190000_pedido_esclarecimento_ao_vendedor.sql` — tabelas `survey_clarifications` (uma tentativa por
  vez, nunca duas abertas ao mesmo tempo) e `survey_clarification_items` (as dúvidas em si, reatribuídas à
  tentativa nova numa escalada, nunca perdidas); funções `request_painter_doubt`, `clarification_batch` (lista
  conjunta e não identificada, só visível a quem está atualmente responsável), `confirm_clarification`,
  `respond_clarification`, `claim_clarification`; quinto bloco em `daily_maintenance()` para a escalada
  automática. `supabase/tests/rls.test.ts` ganhou um bloco novo (+4 casos, incluindo a escalada completa de
  ponta a ponta). `npm test` (447), `typecheck`, `lint`, `build` — os quatro com saída 0.
- **Ainda não aplicada à Supabase** (modo automático bloqueia, como as outras duas pendentes — ver secção 6 de
  `docs/ESTADO.md`) e **sem UI nenhuma ainda** (nem para o pintor pedir, nem para o vendedor ver a lista e
  responder, nem para o cliente acompanhar) — só a camada de base de dados está feita e testada.
- **Em aberto, não decidido pelo promotor**: a fórmula dinâmica da comissão do vendedor (pesos 40/30/15/15:
  qualificação geral acumulada / nota do pintor sobre a informação do levantamento / resposta a pedidos de
  esclarecimento / outros incluindo nota do cliente a esta obra) ainda não está implementada — falta a própria
  avaliação do pintor sobre a qualidade da informação (mecanismo novo, não construído), e `respond_clarification`
  ainda não alimenta nenhum cálculo de comissão, só regista a resposta. A comunicação ao vendedor como "% do
  valor adjudicado" (em vez de "% da comissão da plataforma") também ainda não tem nenhuma peça de UI.

## 23/10/2026 — catálogo de referência: nota pública deixa de mostrar rasto de importação, produtos sem ficha confiável ficam escondidos, rendimento passa a ter estimativa quando não há valor oficial

- **Problema apanhado pelo promotor:** o campo `nota` de `reference_products` é mostrado tal e qual na página
  pública do produto (`src/app/app/catalogo/referencia/[id]/page.tsx`). Continha texto interno de importação
  ("Importado da Leroy Merlin PT (api-anything) em ..., SKU: ...") e o raciocínio do agente que foi buscar as
  fichas técnicas ("Ficha tecnica (agente): ...", incluindo referências a ids internos em alguns casos) — nada
  disto é apropriado para um visitante do site.
- **Decisão do promotor:** nunca mostrar texto deste tipo publicamente; produtos sem informação suficiente do
  fabricante ficam escondidos (não eliminados) até haver mais confiança; e, quando possível, estimar o
  rendimento (m²/L) mesmo sem ficha técnica oficial, usando valores típicos do setor por tipo de produto.
- **Construído:** três colunas novas em `reference_products`: `nota_interna` (guarda o texto antigo completo,
  nunca lido pela interface pública), `visivel` (default `true`; passa a `false` nos 33 produtos em que não foi
  possível confirmar com confiança nenhum produto oficial do fabricante — ficam fora de listagens, do catálogo
  e dos formulários de pedido, mas os dados continuam na base) e `rendimento_estimado` (marca quando
  `rendimento_m2_l` é uma estimativa, não um valor de ficha técnica). A nota pública foi limpa de qualquer
  rasto de importação/SKU/raciocínio interno; 64 produtos (tintas de interior/exterior, primários e esmaltes,
  sem valor oficial e ainda visíveis) receberam um rendimento estimado pelo extremo mais baixo do intervalo
  típico do setor. **Nota de correção (mesmo dia, sessão seguinte):** esta migração tinha sido aplicada
  diretamente à Supabase sem ficheiro no repositório, e o ficheiro que a trouxe de volta aqui chamava-se
  `20261023180000_...`, um número que não corresponde à versão realmente registada no Supabase — corrigido
  para os dois ficheiros com os números reais (`20261023182915` e `20261023182946`, ver a entrada "duas
  migrações aplicadas... recuperadas", acima nesta mesma data), que já cobrem exatamente este conteúdo (o
  passo "esvazia notas só com a linha de importação" é a segunda das duas).
- **Código:** `loadReferences` (`src/lib/reference.ts`) e a página de referência individual passam a filtrar
  `visivel = true`; a página de referência mostra "(estimativa típica, não confirmada pelo fabricante)" junto
  do rendimento quando `rendimento_estimado` é verdadeiro. `database.types.ts` atualizado à mão com os três
  campos novos (a geração automática de tipos trouxe uma versão do gerador incompatível com o resto do código
  e foi descartada — o mesmo problema, apanhado independentemente pelas duas sessões).
- Testado: tsc, lint, 440 testes de domínio + 138 de RLS — zero.

## 23/10/2026 — fórmula dinâmica da fração do vendedor, construída e ligada ao pagamento

O promotor aprovou a proposta (pedida para ficar simples) depois de confirmar os pesos 40/30/15/15
(qualificação geral acumulada / nota dos pintores sobre a informação do levantamento / resposta a tempo a
um esclarecimento / nota do cliente a esta obra) e os dois pontos em aberto sobre "% do valor adjudicado"
(fica internamente limitada pela comissão real, traduzida num número que nunca a revela) e NIPC (é o mesmo
número que o NIF para pessoas coletivas — o bloqueio por NIF já cobre o NIPC, nada a construir aí; fica por
confirmar só se quer também bloqueio por nome, mais arriscado por falsos positivos).

- **Construído**: `src/domain/survey.ts` ganhou `surveyorCommissionBp` (pura, testada: 11 casos) — cada um
  dos quatro componentes entra como estrelas 1-5 (ou um booleano para a resposta a tempo), normalizado e
  pesado; sem dados ainda (obra nova, sem avaliações, sem pedido de esclarecimento) entra neutro, nem
  penaliza nem beneficia. O resultado fica entre 5% e 15% (`SURVEY_SHARE_BP_MIN/MAX`), com o antigo
  provisório (10%) exatamente ao meio quando não há nenhum dado — ninguém fica pior do que estava.
  `surveyorDisplayShareBp` traduz para "% do valor adjudicado" (fração da comissão típica, nunca a
  comissão em si) — pronta para a UI, que ainda não existe.
- Nova migração `20261023200000_avaliacao_informacao_pelo_pintor.sql`: tabela `survey_info_reviews` (uma
  nota por pintor e por levantamento, corrige em vez de duplicar) e função `rate_survey_info`, mesma guarda
  de acesso que `request_painter_doubt`. Nunca visível ao vendedor por linha individual (identificaria o
  pintor) — só a média, lida com privilégios próprios.
- `src/lib/surveys.ts` (`settleSurveyPayout`) deixa de usar a percentagem fixa: lê os quatro componentes
  do vendedor **atualmente entitulado** (que pode já não ser quem fez a visita original, se houve escalada
  de um esclarecimento) no momento em que a comissão do pintor é confirmada, e passa o resultado de
  `surveyorCommissionBp` a `surveyPayoutAmount`.
- `supabase/tests/rls.test.ts` ganhou mais um caso (avaliação da informação: uma por pintor, corrige,
  nunca visível ao vendedor nem a um estranho). `npm test` (453), `typecheck`, `lint`, `build` — os quatro
  com saída 0. `database.types.ts` corrigido à mão (três tabelas novas, mais `clarification_excluded_orgs`
  em `request_surveys`) — a mesma reconciliação parcial que o Code já tinha feito para o catálogo; a
  regeneração completa continua a quebrar o build noutros ficheiros, por resolver numa sessão dedicada.
- **Ainda não aplicada à Supabase** (junta-se às três migrações já pendentes) e **sem nenhuma peça de UI**:
  falta o formulário do pintor para avaliar, e o ecrã do vendedor para ver a sua própria % traduzida.

## 23/10/2026 — base de cálculo muda para % do valor adjudicado; papel passa a chamar-se "avaliador" no texto visível

O promotor propôs números concretos que mudam a base económica da fórmula acima, ainda sem UI nem aplicada
à Supabase: "proponho que a comissão base seja 1% e que em alta performance (100%) vá até 2,7% (DO TOTAL
ADJUDICADO)". Ou seja, deixa de ser uma fração da comissão da plataforma e passa a ser uma fração direta do
valor adjudicado da obra (`base`, sem IVA, o mesmo campo de `engagement.ts`) — mais simples de explicar ao
vendedor/avaliador do que "uma fração de uma fração".

O promotor também levantou e respondeu a si próprio um quinto fator possível: a % de comissão que a
plataforma vai de facto receber nesta obra, que varia por canal (ex. "traga o seu pintor" cobra só 9%). Notou
que isto é circular — só se sabe depois de o próprio trabalho do avaliador já estar feito, com proposta
escolhida — e perguntou a opinião. Decisão: não entra como quinto fator pesado na fórmula; em vez disso, o
pagamento fica sempre limitado (`Math.min`) à comissão líquida que a plataforma de facto recebeu
(`platformFeeNet`). Isto absorve exatamente o caso que o promotor descreveu (comissão baixa → pagamento
efetivamente mais baixo) sem complicar a fórmula 40/30/15/15 nem exigir prever a comissão antes de ela
existir.

Na mesma mensagem, instrução explícita e separada: "mudemos a palavras de vendedor para avaliador". Decisão
de âmbito (sem confirmação à parte do promotor, por ser a leitura óbvia do pedido): muda só o texto visível
ao utilizador e a documentação; os nomes internos ficam como estão — colunas `vendedor_org_id`/
`vendedor_user_id`, o valor `'vendedor'` do enum `member_role` (já aplicado em produção,
`20261023143532_papel_vendedor.sql`, referenciado em muitas políticas RLS), e nomes de funções/tabelas
(`reserve_survey`, `survey_vendor_rating`, etc.). Uma mudança de nome a esse nível é uma decisão maior, à
parte, só se o promotor a pedir depois.

- **Construído** (`src/domain/survey.ts`): substituídas `surveyorCommissionBp`/`surveyorDisplayShareBp`/
  `surveyPayoutAmount` (antigo modelo, % da comissão) por `surveyorShareBp` (mesma fórmula 40/30/15/15,
  agora a interpolar na banda `SURVEYOR_SHARE_OF_VALUE_BP_MIN/MAX = 100/270`, i.e. 1%-2,7%) e
  `surveyorPayoutAmount(valorAdjudicado, shareBp, platformFeeNet)` (três argumentos; devolve
  `min(% do valor adjudicado, platformFeeNet)`). `src/domain/survey.test.ts` reescrito para a nova API.
- `src/lib/surveys.ts` (`settleSurveyPayout`) ganha um argumento novo (`valorAdjudicado`); o chamador
  (`src/app/app/contratacoes/actions.ts`) passa `after.engagement.base`.
- Texto visível renomeado para "avaliador": rótulo e descrição do papel em `MEMBER_ROLE_LABELS`/
  `roleDescription` (`src/domain/organization.ts`), o parágrafo de introdução e a frase "vendedores
  disponíveis" em `src/app/app/levantamentos/page.tsx` (agora fala em % do valor adjudicado, não em
  "fração da comissão"), e comentários em `src/domain/clarification.ts`, `src/domain/surveyTerms.ts` e
  `AcceptTerms.tsx`. Confirmado por grepping que nenhum ecrã do **cliente** nomeava "vendedor" — a regra
  13 do `CLAUDE.md` (cliente nunca vê comissões nem quem faz o quê) já impedia isso. Não tocado:
  "vendedores"/"catálogo" em `src/domain/subscription.ts` e na ficha de produto de referência — é um
  conceito diferente e anterior (fornecedor que vende produtos de pintura no catálogo, não o papel de
  levantamento).
- Testado: `npm test` (453), `typecheck`, `lint`, `build` — os quatro com saída 0.
- **Ainda não aplicada à Supabase** (mesmas quatro migrações pendentes de antes) e **sem nenhuma peça de
  UI** para o avaliador ver a sua própria %.

## 23/10/2026 — reconfirmado o fluxo do avaliador; proposta detalhada para a garantia de execução (ainda não construída)

O promotor confirmou, nas suas palavras, o fluxo já construído do avaliador: *"o alerta de trabalho de avaliador
fica lançado assim que o cliente submete o requisito do serviço, por defeito e se não o quiser dispensar e
fazê-lo ele mesmo, vai em simultâneo para os vendedores/avaliadores da zona. o que responde primeiro fica com o
trabalho, desaparece dos outros... a menos que haja pintor(es) que venha(m) a pedir mais info e o avaliador não
cumpra a regra"* — bate certo com o que já está em produção/por aplicar: abertura automática ao publicar o
pedido (`work_requests_create_survey`), notificação simultânea aos fornecedores da zona, reserva atómica
("primeiro a chegar, avança", `reserve_survey`), e a escalada por incumprimento de prazo quer no próprio
levantamento (reserva de 48h) quer no pedido de esclarecimento de um pintor (dois marcos de 24h+24h,
`claim_clarification`).

Também partilhou de novo o documento-fonte completo ("Quem Pinta — a oferta: problemas, soluções e porquês",
painel de compradores + board — [link no Claude Docs](https://claude.ai/artifact/J8TGcaAn21a1ZFZFPZL5Yc)), já
citado em decisões anteriores como origem do mecanismo do vendedor/avaliador. Lido de novo nesta sessão, de
ponta a ponta:

- **Confirma, sem contradizer nada do que está construído**: o fluxo 3.1 (publicação → notificação simultânea →
  só um avança → prazo "horas à vista" → rede de segurança self-service se ninguém reservar a tempo) é
  exatamente o que `reserve_survey`/`levantamento_automatico` já fazem. A nota "`'Traga o seu pintor' —
  (...) como mais uma das 3 (sem etiqueta visível)`" no documento confirma, por fora, o que já se tinha
  verificado por código: a proposta do convite direto aparece no comparador sem nenhuma marca distintiva
  (`Pintor A, B, C…`, mesma regra das outras).
- **Secção 7, "A garantia de execução, em detalhe"** — continua por construir (é o maior risco apontado pelo
  painel/board nas quatro rondas, "ainda não é 8-9 porque a garantia de execução continua sem resposta
  aplicada"), mas o documento tem agora uma proposta detalhada, em quatro peças que se encadeiam, nenhuma delas
  "a plataforma garante a obra" no sentido legal:
  1. **Escrow por fases** (7.1): o valor da obra (além do sinal de 3%) fica depositado no mesmo parceiro de
     pagamentos, libertado por marcos (materiais, preparação, 1.ª demão, demão final, limpeza) com fotos
     datadas; o condomínio confirma cada fase em 48-72h (silêncio = aprovação automática; contestação aciona a
     mediação); as percentagens de cada fase são propostas pelo próprio pintor, dentro de limites da
     plataforma; retenção final de garantia (5-10%) ~30 dias após a entrega. **Nota própria**: isto implica
     dinheiro a circular pela plataforma/parceiro de pagamentos de forma continuada ao longo da obra, não só no
     momento da adjudicação como hoje — possível licença de intermediário de pagamentos a confirmar, o
     documento já o assinala como questão em aberto.
  2. **Reputação pós-obra** (7.2): dentro do prazo de garantia legal da proposta, o condomínio abre um "chamado
     de garantia"; a empresa tem prazo para responder; não responder ou recusar sem razão fica visível no
     perfil (métrica agregada) e pode levar a suspensão do catálogo — pressão reputacional/económica, nunca
     coerção legal.
  3. **Mediação estruturada** (7.3): uma contestação do escrow ou um chamado de garantia não resolvido em 5-7
     dias vai a um perito técnico independente (nunca funcionário da Quem Pinta), pago pela parte considerada
     em erro; parecer não vinculativo como sentença, mas decide o desfecho prático dentro da app.
  4. **Seguro privado em parceria** (7.4) — para mais tarde: distribuição de produtos de seguro de
     caução/bom cumprimento já existentes no mercado, nunca um fundo mutualizado próprio; só faz sentido com
     dados reais de volume/incumprimento que 7.1-7.3 ajudam a gerar entretanto.
- **Também no documento, secção "6. O que fica em aberto"**, por decidir: a % da comissão partilhada com o
  avaliador (já resolvido nesta sessão, 1%-2,7% do valor adjudicado — ver entrada anterior), o prazo exato do
  avaliador para agendar/atualizar (`RESERVE_WINDOW_HOURS = 48`, ainda provisório), e as implicações
  regulatórias do escrow por fases, se avançar.

**Nada disto está construído** — fica registado aqui como a proposta de referência para quando o promotor
quiser avançar com a garantia de execução, sem repetir a leitura do documento. Acrescentado à tabela de
questões em aberto, `docs/ESTADO.md`, secção 7.

## 23/10/2026 — nova secção no documento-fonte: "relatório de propostas" (proposta, nada construído)

O promotor pediu para ler sempre o documento-fonte ("Quem Pinta — a oferta",
[link](https://claude.ai/artifact/J8TGcaAn21a1ZFZFPZL5Yc)) porque pode ter atualizações — lido de novo, ganhou
uma secção 8 nova ("O relatório de propostas") desde a última leitura desta sessão. Resumo, para não se perder:

**O problema que resolve**: o condomínio que decide e paga depende inteiramente de quem imprime/distribui as
propostas (tipicamente o gestor de condomínio) para ver o quadro completo — nada impede hoje esse gestor de
"esquecer" de entregar uma proposta à assembleia. **Gerado assim que a janela de propostas fecha, antes de
qualquer escolha** — as propostas continuam anónimas, consistente com o resto do modelo (diferente do dossiê já
existente, `/app/pedidos/[id]/dossie`, que só existe depois de haver contratação e já pode nomear o pintor
escolhido).

Quatro peças:
1. **Tabela-resumo** (8.1): uma linha por proposta, em **ordem aleatória a cada geração** (evita viés de a
   primeira da lista receber mais atenção). Colunas: número da proposta, preço, anos de experiência, garantia
   legal (anos), reputação interna, prazo de execução, material principal sugerido e preço de referência.
2. **Ficha independente por proposta** (8.2): todos os dados já definidos no perfil (trabalhos discriminados,
   datas, materiais, alvará, dívidas, garantia legal) — sem identidade da empresa. Mostra sempre, de forma
   saliente, "Proposta X de N".
3. **Aviso de integridade** (8.3): texto fixo no topo da tabela-resumo e de cada ficha — *"Este relatório
   contém N propostas, numeradas de 1 a N. Se recebeu menos do que N fichas, falta pelo menos uma — confirme
   através do código QR antes de aprovar qualquer decisão."* Formulação deliberadamente neutra (não acusa
   ninguém de má-fé — pode ser erro de impressão), mas dá ao condómino uma forma objetiva de detetar a falha.
4. **QR code e código por página** (8.4): um QR que aponta para a mesma versão online do relatório, acessível
   **sem login** (link-token longo, não adivinhável, específico daquele pedido, nunca listado nem pesquisável)
   — qualquer condómino confirma que o impresso bate certo com o registo original, sem conta na plataforma. Mais
   um código visível a olho nu por página, formato `AAAAA-BBBBB` (primeiros 5 caracteres = obra/pedido, iguais
   em todas as páginas do mesmo relatório; os 5 seguintes = proposta/página específica). O código por si só não
   aumenta a segurança (é copiável); a verificação real continua a ser o QR — o código só torna visível a olho,
   sem telemóvel, se uma página pertence ao mesmo relatório.

**Nada disto está construído.** Fica registado como proposta de referência — mesmo padrão do que se fez para a
garantia de execução (entrada anterior desta mesma data). Acrescentado a `docs/ESTADO.md`, secção 7.

## 23/10/2026 — catálogo com dois separadores: "Produtos de referência" e "Produtos e descontos"

Pedido do promotor a partir de um ecrã concreto: a secção "Produtos dos fornecedores" (`/app/catalogo`),
vazia com os filtros aplicados, "deve passar para separador 'produtos e descontos'". A página empilhava os
dois conceitos na mesma vista — fichas públicas de fabricante, sem ninguém a vender, e o que os fornecedores
da plataforma realmente vendem — confundindo os dois.

- **Construído em cima do trabalho paralelo de outra sessão nesta mesma página** (seleção "Escolhas e
  descobertas do mês" na primeira visita, fotos dos produtos, ordenar por preço, filtro automático): não
  reescrevi nada disso, só acrescentei a navegação por separadores por cima. Dois separadores: "Produtos de
  referência" (cobre tanto a vista "Escolhas do mês" como a lista filtrada — a mesma distinção que já existia)
  e "Produtos e descontos" (antes "Produtos dos fornecedores"). Um `?tab=` na URL guarda qual está ativo,
  preservando os outros filtros (`q`, `tipo`, `area`, `demaos`, `ordenar`) ao trocar de separador.
- **Conflito real de ficheiro com a outra sessão** (`src/app/app/catalogo/page.tsx` tinha sido reescrito em
  paralelo, 165 linhas): resolvido fazendo `git checkout` à minha versão mais simples, mesclando o trabalho da
  outra sessão limpo (sem conflito nenhum), e só depois voltando a aplicar os separadores por cima da versão
  deles — em vez de tentar resolver um conflito de `git merge` a direito, com as duas versões a reestruturar o
  mesmo JSX de formas diferentes.
- Verificado visualmente com Playwright (página de pré-visualização temporária, removida a seguir): o
  separador "Produtos e descontos" mostra agora "Sem produtos com estes filtros." exatamente onde o promotor
  apontou. tsc, lint, 453 testes, build — zero.

## 23/10/2026 — ronda de confirmação do promotor sobre `docs/ESTADO.md` secção 7 (19 pontos)

O promotor respondeu a uma lista de 19 perguntas preparadas a partir das questões em aberto de `docs/ESTADO.md`
e de decisões que a sessão Code tomou sozinha nesse intervalo, sinalizando em vários pontos que **a sessão Code
não foi atualizada com o trabalho desta sessão** (fórmula do avaliador, por exemplo) e pode não refletir o
estado real. Registo ponto a ponto, para as duas sessões lerem o mesmo:

**Dinheiro e comissões**
1. **Algoritmo de fee dinâmico (18-23%)**: mantém-se **desligado**, 3% fixos, até o promotor decidir os pesos
   finais — não ligar sem essa decisão.
2. **`SURVEY_SHARE_BP_PROVISIONAL` (10%)**: pergunta desatualizada — este número já não existe no código. Foi
   substituído nesta mesma sessão (ver entradas anteriores de 23/10/2026) pela fórmula dinâmica 40/30/15/15,
   **1%-2,7% do valor adjudicado**, com teto na comissão líquida recebida (`surveyorShareBp`/
   `surveyorPayoutAmount`, `src/domain/survey.ts`). A sessão Code precisa de ler isto antes de continuar a
   trabalhar na área do avaliador.
3. **Parceiro de pagamentos**: já é o **Stripe** (Connect, modo de teste) — `src/lib/stripe.ts`,
   `src/lib/payments.ts`, migração `pagamentos_stripe` (aplicada desde 20/10/2026). O `CLAUDE.md` tinha uma
   linha desatualizada ("ainda por escolher"), **corrigida nesta sessão**. Falta só confirmar com a Stripe e o
   advogado que o modelo de retenção (reter semanas, devolver por instrução) é aceite — ver
   `docs/PAGAMENTOS_E_ASSINATURA.md`.
4. **Assimetria de comissão no convite de adesão** (fornecedor não ganha nada; pintor que indica um fornecedor
   ganha 1-2%): o promotor confirma a assimetria, mas quer compensar o fornecedor de outra forma — **não por
   comissão de adesão**, por um bónus no próprio fee de avaliador, **ou** por ser avisado 2 horas antes de
   qualquer outro avaliador da zona sempre que entra um pedido de orçamento (uma vez, não repetível). Condição
   explícita: para não desperdiçar essa vantagem, exige **telefone ativo e email com autorização de envio de
   alertas** registados. **Nada construído** — é uma funcionalidade nova (campos de contacto + consentimento de
   alerta, mecanismo de notificação antecipada, e decidir entre bónus de fee vs. janela de 2h, ou os dois) que
   fica para uma sessão dedicada, não implementada nesta ronda.

**Decisões do Code a confirmar**
5. **Código de adesão escolhido no convite do fornecedor**: confirmado — é exatamente o que o Code construiu
   (`supplier_painter_invites`/`claim_supplier_invite`, migração `convite_de_adesao_do_fornecedor`): o fornecedor
   pode escolher o código (texto livre, 6-12 carateres, valida formato e unicidade) ou deixar gerar ao acaso; o
   desconto continua a ser sempre o automático e igual de qualquer código de adesão — não há desconto à parte
   por ser convite direto. Leitura certa, nada a mudar.
6. **Telefone e morada obrigatórios** no mesmo convite: confirmado, mantêm-se **obrigatórios**. Nada a mudar.
7. **Levantamento automático ao criar o pedido**: promotor deu luz verde para aplicar a migração
   `20261023170000_levantamento_automatico.sql`. **Tentativa de aplicação nesta sessão bloqueada pelo
   classificador "Production Deploy"** (o mesmo bloqueio de sempre, independente de aprovação em chat) —
   continua à espera de aprovação direta do promotor na própria ferramenta/ambiente, não só aqui. Junta-se às
   outras três já na fila (`20261024034052_revoke_delete_clientes_fornecedor.sql`,
   `20261023190000_pedido_esclarecimento_ao_vendedor.sql`, `20261023200000_avaliacao_informacao_pelo_pintor.sql`)
   — as quatro já testadas, só à espera da aprovação direta.

**Jurídico e conformidade**
8-9. Rondas 1 e 2 do parecer jurídico: sem resposta nova do promotor nesta ronda — continuam em aberto.
10. **Minuta do contrato**: o promotor vai pedir ao advogado para reenviar — ação dele, não há nada a fazer no
    código.
11. **Pintores sem documentos aprovados**: mantêm-se a poder orçamentar, mas os avisos devem ficar **muito mais
    evidentes** — no comparador do cliente e, ainda mais, **ao próprio pintor enquanto elabora a proposta**:
    pedido um texto do tipo "a maioria dos orçamentos sem estes dados é eliminada pelos clientes antes da
    consulta, preencha já os dados em falta", com um botão que leva diretamente aos campos por preencher,
    destacados visualmente. **Não construído nesta ronda** — fica como próximo passo de UI (localizar onde o
    aviso a vermelho já existe hoje no rascunho do pintor e reforçá-lo com este texto + navegação direta aos
    campos).
12. **Certificado de assinatura "por confirmar"**: **decidido e construído em 24/10/2026** (o promotor,
    perante a escolha registada abaixo, pediu para decidir — "decide tu"). Resolvida primeiro a distinção
    que faltava: `src/lib/pades.ts` passa a saber se a cadeia ficou sem validar porque foi mesmo avaliada e
    recusada, ou só porque uma falha de rede impediu completar o passo da AIA (nunca por o certificado não
    ser do Cartão de Cidadão/CMD). Com essa distinção, `recusar logo` passou a ser seguro: uma cadeia mesmo
    recusada não grava o PDF; uma indeterminada por rede continua aceite com revisão manual, como até aqui.
    Detalhe técnico completo e testes em `docs/ESTADO.md` secção 6.7.
13. **Identidades fora do PDF assinado**: sem resposta nova do promotor — mantém-se como está (sem nomes),
    por decidir confirmação explícita mais tarde.
14. **Contabilista**: o promotor pediu o `docs/CONTABILIDADE.md` num formato que possa reencaminhar — convertido
    para PDF e enviado nesta sessão (`pandoc` → `.docx` → `soffice --convert-to pdf`, sem alterar o conteúdo).

**Lançamento**
15. **Piloto de Viana do Castelo**: confirmado que vai precisar de ajuda a identificar contactos, mas só depois
    de tudo pronto (incluindo marketing) — a app ainda está longe disso. Sem ação agora.
16. **`PERMITIR_ACEITACAO_SIMPLES`**: confirmado na Vercel em 24/10/2026 — existe, tipo `sensitive`, só no
    ambiente Production (devia estar em Preview/Development, não lá). Por ser `sensitive`, o valor nunca se
    consegue ler de volta, nem pela API nem pela interface, só reescrever — tentei pô-lo a `"0"` para o
    neutralizar sem precisar de apagar, recusado pelo classificador "Feature Flag Writes" desta sessão (ver
    `docs/ESTADO.md` 6.7). **Atualizado mais tarde no mesmo dia, 24/10/2026 — ver entrada "Regra obrigatória
    antes do lançamento beta" ao fundo deste documento: o promotor pediu explicitamente que isto deixe de
    ser recomendação e passe a regra.**
17. **Pesquisa de marca INPI/EUIPO**: adiada por pedido do promotor — o domínio já é dele, fica para mais tarde.
18. **"Percentagem dos 57%"**: perguntei e não encontrei, em nenhum ficheiro deste repositório, a que estudo ou
    estatística esta linha se refere — só existe como uma linha órfã na tabela de questões em aberto, sem
    nenhuma entrada de decisão correspondente nem uso no texto do site. O promotor também não reconhece do que
    se trata. **Removida da tabela de questões em aberto** (`docs/ESTADO.md`) por não haver nada a decidir sem
    saber a que se refere — se aparecer memória do contexto original, volta a entrar com a fonte identificada.
19. **Indicador "S" e pesos do fee dinâmico**: mesma situação do ponto 1 — continua desligado, por decisão do
    promotor nesta ronda (não decide sozinho, espera dados reais do piloto).

**Bloqueios desta sessão**: a tentativa de aplicar a migração do ponto 7 e a leitura dos projetos Vercel (ponto
16) foram ambas recusadas pelo classificador automático "Production Deploy", independentemente da aprovação já
dada em conversa — precisam de aprovação direta do promotor na própria ferramenta/ambiente.

## 23/10/2026 — construídos os dois pontos deferidos (4 e 11): avisos de documentos ao pintor, e bónus de adesão ao avaliador

O promotor confirmou explicitamente ("SIm, quero") que queria avançar com os dois pontos que tinham ficado
registados como "por construir" na ronda anterior, "para não apressar código sensível a dinheiro/assinatura/
notificações". Com a confirmação, deixou de haver razão para esperar.

**Ponto 11 — avisos mais evidentes ao pintor, com atalho para os campos em falta.** O aviso de licença/
certificado IMPIC em falta (`licenseWarning`, `src/app/app/oportunidades/[id]/page.tsx`) só aparecia no último
passo do orçamento ("rever"), com um texto ameno. Passou a aparecer logo no topo da página da oportunidade,
visível em todos os passos do orçamento guiado (não só na revisão), com borda vermelha, o texto pedido pelo
promotor ("a maioria dos orçamentos sem este documento é eliminada pelos clientes antes de serem lidos —
preencha já os dados em falta") e um botão que leva direto a `/app/organizacoes/{id}#documentos`. Essa secção
(`src/app/app/organizacoes/[id]/page.tsx`) ganhou `id="documentos"` como destino do atalho e passou a destacar-se
a vermelho (antes era amarelo) enquanto faltar algum documento, com o mesmo texto de urgência. O aviso breve que
ficava na revisão mantém-se, mas reduzido a um apontador para o aviso principal, para não duplicar o texto.

**Ponto 4 — compensação ao avaliador pelo convite de adesão que não paga comissão.** O convite de adesão do
fornecedor a um pintor (`supplier_painter_invites`) continua sem comissão nenhuma (só carteira de clientes e
descontos) — ao contrário do pintor que indica um fornecedor (1-2%). O promotor propôs duas alternativas, como
"ou": um bónus no fee de avaliador, ou avisar este fornecedor 2h antes de todos os outros sempre que surge um
pedido na sua zona (ambas condicionadas a ter telefone e email com autorização de alertas registados).

Escolhi e construí a do **bónus**, por decisão própria (o promotor deixou as duas em aberto, sem fechar qual):
- A plataforma **não tem hoje nenhum aviso push** aos avaliadores quando um levantamento abre — descobrem-no
  navegando a lista (`/app/levantamentos`). Dar a um só fornecedor uma janela de exclusividade de 2h exigiria
  também **bloquear a reserva dos outros avaliadores** durante essa janela, uma mudança bem maior à regra "quem
  chega primeiro" do levantamento (`reserve_survey`) — e mais uma peça nova (lógica de bloqueio temporal) por
  cima de outra ainda por construir (o próprio aviso push).
- O bónus reaproveita por inteiro a fórmula já construída e testada (`surveyorShareBp`, 1%-2,7% do valor
  adjudicado) — só soma pontos-base dentro da mesma banda, sem tocar na reserva nem exigir nenhum mecanismo de
  notificação novo.
- Se o bónus não se mostrar suficiente para o promotor, a alternativa da janela de aviso fica registada aqui
  para decidir construir depois — não foi descartada, só adiada por ser a opção mais simples e de menor risco
  das duas, dado que o próprio promotor pediu "não apressar" este código.

Desenho: cada convite de adesão aceite (`claim_supplier_invite` liga com sucesso um pintor novo) dá um crédito
único ("por uma vez") de **+30 pontos-base**, consumido na próxima obra em que o avaliador do fornecedor for
pago (`settleSurveyPayout`), sem exceder o topo da banda (2,7%). Só concedido/gasto se o fornecedor tiver
telefone **e** email de contacto **e** uma nova autorização de alertas (`organizations.alertas_autorizados`,
checkbox no formulário da entidade, só visível a fornecedores) — exigência do próprio promotor. Migração
`20261023210000_bonus_adesao_avaliador.sql` (nova coluna, nova tabela `avaliador_bonus_credits` com RLS e
testes próprios, função `claim_supplier_invite` substituída por inteiro para conceder o crédito) — pendente de
aplicar, bloqueada pelo mesmo classificador "Production Deploy" das migrações anteriores.

Verificado: `npm test` (457 testes, incluindo RLS novo), `typecheck`, `lint`, `build`, todos a zero.

## 23/10/2026 — duas auditorias de UX/UI independentes: bug crítico corrigido, triagem do resto

O promotor mandou duas auditorias de UX/UI independentes ao site (uma em texto, outra num documento
partilhado), cada uma a navegar como cliente, pintor e fornecedor, pedindo decisão e aplicação do que
fosse necessário. As duas convergem no mesmo diagnóstico geral — modelo de negócio e validação de dados
mais sofisticados do que a experiência à volta deles — mas uma encontrou um bloqueio concreto que a outra
não isolou da mesma forma. Prioridade dada: primeiro confirmar e corrigir o que for mesmo um bug, só depois
decidir o resto.

**Bug crítico confirmado e corrigido: "Nova entidade" parecia nunca gravar.** Uma das auditorias reproduziu
isto 5/5 vezes, com qualquer combinação de dados, incluindo só o nome. Investigado até à causa: não é um
problema de dados nem de validação — é a regra "um perfil por conta" (`private.one_profile_per_account`,
20261020030000/20261020070000), que bloqueia criar uma entidade "cliente" numa conta que já é pintor ou
fornecedor (e vice-versa), com uma mensagem clara em português. A conta de teste usada na auditoria
(`nm@quempinta.pt`) já tem outro perfil de testes anteriores — por isso falhava sempre, com qualquer dado.
O bug real não era a regra (que está correta e já testada), mas `createOrganization`
(`src/app/app/actions.ts`): mostrava sempre o aviso genérico "Não foi possível guardar. Confirme os dados
e tente de novo.", escondendo a mensagem específica que a base de dados já devolvia. Corrigido para mostrar
essa mensagem quando o erro é da regra de negócio (`error.code === 'P0001'`), mantendo o aviso genérico só
para erros técnicos inesperados. Acrescentados dois testes em `rls.test.ts` que confirmam, do lado da base:
(a) uma conta nova e sem perfil nenhum cria "particular" só com o nome sem problema — não há bug de dados
em falta — e (b) a mesma operação, pela conta de um fornecedor já existente, falha com a mensagem exata.

**Link de navegação partido, confirmado e corrigido.** O item "Referências" aparecia no menu do
*fornecedor*, mas a página (`/app/organizacoes/[id]/referencias/page.tsx`) é só para `kind === 'pintor'`
— é o pintor que indica um fornecedor (desconto na própria comissão), não o inverso. Resultado: qualquer
fornecedor que clicasse via sempre "Não encontrado". Corrigido em `src/app/app/layout.tsx`: o link sai do
menu do fornecedor e entra no do pintor (que, por este erro, nunca tinha link nenhum para esta página).

**Vitórias rápidas aplicadas** (texto e marcação, sem risco de negócio):
- Estados vazios reescritos com explicação + o que fazer a seguir, seguindo o padrão já bom da página
  "Clientes" (`encomendas/page.tsx`, `organizacoes/[id]/produtos/page.tsx`, `catalogo/page.tsx`).
- `ConcelhosPicker.tsx`: ícone "+"/"−" trocado por um chevron (▸/▾) e legenda fixa — o "+" era lido como
  "adicionar o distrito inteiro" quando só abre a lista para escolher concelho a concelho.
- `organizacoes/[id]/adesoes/page.tsx`: parágrafo único com vários números (0,25 p.p., 1%/2%, 2 meses)
  quebrado numa lista curta, números em destaque.
- Página inicial: a resposta a "A plataforma garante a obra?" (a pergunta de maior risco percebido para
  quem vai propor despesa a uma assembleia) subida para junto do botão "Pedir orçamentos", além de
  continuar no acordeão — sem mencionar comissões (regra 13 do `CLAUDE.md` mantida).

**Decisões e triagem do resto — fica registado, não construído nesta ronda:**
- *"Cliente vê o backoffice"* (as duas auditorias notaram isto, uma delas até como "crítico"): quase
  certamente não é um bug de permissões — `nm@quempinta.pt` é a própria conta de admin/testes do
  promotor, corretamente um `platform_admin`. É uma mistura de credenciais de teste entre perfis, não uma
  falha de isolamento de sessões. Fica como suspeita a confirmar, não como bug a corrigir; a recomendação
  de dar uma identidade visual distinta ao backoffice mantém-se válida por si (ver abaixo).
- *Mudanças estruturais* (sistema de design, fotografia real, prova social, pré-visualização antes do
  login, escolha de perfil antes de criar conta, identidade visual do backoffice, automação da validação
  de documentos de pintores): todas de acordo entre as duas auditorias, nenhuma é um bug — são decisões de
  produto e de design que merecem uma ronda dedicada (direção visual, não só correção), não encaixadas
  às pressas por cima de uma sessão de correção de bugs. Registadas em `docs/ESTADO.md` secção 7 para essa
  ronda, com a prioridade que as duas auditorias já dão (prova social e fotografia primeiro; depois a
  separação do backoffice e a automação de documentos).
- *Percurso do pintor não verificado em nenhuma das duas auditorias* (credenciais de teste sem acesso à
  caixa de correio) — recomendação de ambas: repetir com uma conta de pintor funcional antes de fechar
  decisões de redesign específicas para esse perfil.

Verificado: `npm test` (459 testes), `typecheck`, `lint`, `build`, todos a zero.

---

## 24/10/2026, mesma tarde — item 12 construído; verificação direta desfaz uma conclusão errada desta manhã

Resumo (detalhe completo, com o SQL pronto a correr, em `docs/ESTADO.md` secção 6.7):

- **Item 12 decidido e construído** (pontos 12 e 16 acima, atualizados). `shouldRejectUntrustedSignature`
  (`src/domain/signature.ts`) é a nova função pura que decide: só recusa logo quando a cadeia foi mesmo
  avaliada e recusada para alguma assinatura, nunca só por ter ficado indeterminada por falha de rede a
  obter o certificado do emissor. `npm test`, `typecheck`, `lint`, `build`, todos a zero.
- **Verificação direta por SQL** (regra 7 do `CLAUDE.md`: nunca concluir a partir de texto já filtrado)
  mostrou que a atualização desta manhã estava errada em dois pontos: `revoke_delete_clientes_fornecedor`
  e `levantamento_automatico` **não estavam de facto aplicadas**, apesar de o `docs/ESTADO.md` (e o commit
  `943e09d`) dizerem que sim. A segunda é um bug real ao vivo desde 23/10/2026 (nenhum pedido novo recebe
  levantamento, nem automático nem por pedido manual).
- **Três tentativas de escrita recusadas pelo modo automático desta sessão** (duas migrações + a variável
  `PERMITIR_ACEITACAO_SIMPLES` na Vercel) — a aprovação do promotor dada em chat não destrava isto; é um
  bloqueio de sessão, não um pedido de confirmação. SQL exato deixado pronto para ele correr.

## 24/10/2026 — `levantamento_automatico` aplicada; quatro ficheiros de migração renomeados para a versão real

Pedido direto do promotor: "tenta aplicar a migração do levantamento automático". Esta sessão não teve o
bloqueio "Production Deploy" que travou a sessão anterior — `apply_migration` correu sem pedir confirmação
extra e aplicou com sucesso, resolvendo o bug ao vivo descrito na entrada anterior (nenhum pedido novo
recebia levantamento desde 23/10/2026).

- **Aplicada**: `levantamento_automatico` — versão real `20261024015834`. `get_advisors` sem categorias
  novas de aviso (mesmo padrão de sempre). `npm test` (464), `typecheck`, `lint`, `build` — zero, com o
  ficheiro já renomeado.
- **Aproveitado para corrigir a "nota sobre a versão registada"** que a entrada de 24/10/2026 de manhã
  tinha deixado pronta mas por fazer: as três migrações que a outra sessão aplicou mais cedo
  (`pedido_esclarecimento_ao_vendedor`, `avaliacao_informacao_pelo_pintor`, `bonus_adesao_avaliador`)
  tinham ficado com o nome do ficheiro local (`20261023190000`/`200000`/`210000`), não com a versão
  realmente registada no Supabase (`20261024010647`/`010704`/`010721`) — contrariando a convenção do
  `CLAUDE.md`. Em vez de reescrever `supabase_migrations.schema_migrations` para corresponder aos
  ficheiros (a alternativa que a outra sessão tinha deixado pronta, SQL incluído), segui a convenção já
  estabelecida desde a reconciliação de 23/10/2026 (secção 6.1): **o ficheiro local é que se renomeia para
  bater com o Supabase, nunca o inverso** — sem efeito nenhum na base de dados, só nos quatro nomes de
  ficheiro em `supabase/migrations/`, já corrigidos.

## 24/10/2026, madrugada — Gestora de condomínios, ecrãs das três funcionalidades por validar, e simulação de dados

Sessão aberta com três pedidos do promotor: dados de simulação para poder ver e testar as três
funcionalidades que nunca tinham tido dados, printscreens, e contas abertas para testar ele próprio.
A meio, ele reportou um bug ao vivo que mudou a prioridade.

**1. "Não grava os dados, não dá erro, mas não avança"** — não era gravação: era o código postal
incompleto (`4900`), com o erro de campo a meio de um formulário longo, fora do campo de visão. Mesma
família do bug "Nova entidade" (`d09ee3e`): a mensagem existia, não chegava à pessoa. Corrigido de
forma genérica em `useFormAction` (serve todos os formulários): ao voltar com erros de campo, salta
para o primeiro **pela ordem do formulário** e põe-lhe o cursor; e `OrgForm` ganhou aviso junto ao
botão, para o botão nunca ficar mudo. Ficam identificados mais dois tropeços da mesma natureza nesse
formulário, agora visíveis: a morada é validada contra o código postal, e o NIF de empresa é
confirmado na nif.pt contra a denominação oficial.

**2. Empresa de administração de condomínios** (pedido dele, com o desenho dele): o modelo já separava
gestora de condomínio, mas a navegação escondia-o, e ele ficou sem saída. **Decisão mantida, tomada
por mim a pedido dele**: quem assina o contrato e é faturado continua a ser o **condomínio**, com o
NIPC dele, nunca a gestora — a alternativa (pôr o NIPC no prédio e a gestora contratar em nome dele)
obrigava a mexer em contratação e faturação. O que faltava era ligação e apresentação:
- "Condomínios geridos" (lista de texto) → **"Prédios sob administração" em cartões**, com NIPC do
  condomínio, morada, nº de prédios e total de frações, e atalhos (editar, acrescentar prédio, novo
  pedido). O que estiver por preencher aparece assinalado.
- `/app/organizacoes/{gestora}/pedidos/novo` **dava 404** — passa a ser o ecrã de escolha do
  condomínio e do prédio, com "o condomínio não está na lista → criar novo condomínio".
- Condomínio criado por uma gestora segue **direto para a ficha do prédio**, em vez de parar numa
  página sem passo seguinte.
- A ficha de prédio já pedia frações, pisos, fachadas, ano, artigo matricial e acessos — não foi
  preciso acrescentar campos.

**3. O que a construção dos ecrãs revelou — e que corrige o diagnóstico de 23/10/2026.** As três
funcionalidades não estavam só "sem UI": **o pintor não tinha leitura nenhuma sobre
`request_surveys`**. Confirmado nas políticas da base real, não nos ficheiros. Passou despercebido
porque `request_painter_doubt` e `rate_survey_info` são `security definer` — funcionam sem leitura, e
os testes delas passavam na mesma; só ao fazer o ecrã é que a falta aparece, porque a aplicação nem
sabe que há levantamento concluído para oferecer seja o que for. Migração
`20261024034105_pintor_ve_levantamento.sql` com o mesmo critério que já guarda as funções (só pintor,
só concluído, só com anúncio aberto), +2 casos de RLS. **Por aplicar: o classificador desta sessão
recusa DDL ("Production Deploy"); escritas normais de dados passam.**

Ecrãs construídos: lado do vendedor em `/app/levantamentos/{id}` (lista conjunta e não identificada
via `clarification_batch`, marco 1 "confirmo que vou à obra", marco 2 resposta, estados respondido e
expirado) — funciona já, porque o vendedor sempre teve leitura. Lado do pintor em
`/app/oportunidades/{id}` (pedir esclarecimento com `guardContact`, ver a resposta, avaliar a
informação de 1 a 5 e corrigir a própria nota) — só mostra conteúdo depois da migração acima.

`src/lib/database.types.ts`: faltavam as **seis funções** destas duas migrações (as tabelas já lá
estavam) — sinal de que nenhuma delas tinha sido chamada pela app alguma vez. Acrescentadas e
confirmadas uma a uma contra o que o Supabase gera.

**4. Simulação de dados, na base real** (pedido explícito; a base só tem dados de teste, zero
utilizadores reais). Tudo prefixado `SIMULACAO`, para sair com a limpeza antes de produção (secção
5.14). Inserido: levantamento concluído na obra publicada `9C480B95`, atribuído ao avaliador do
fornecedor; pedido de esclarecimento em aberto no marco 1, com duas dúvidas de dois pintores
diferentes; uma avaliação da informação (média 3,0); uma gestora de condomínios com dois condomínios
administrados, cada um com NIPC próprio e prédio com frações. O **bónus de adesão foi concedido pela
função real** `claim_supplier_invite` (com a identidade do pintor, como nos testes), não inserido à
mão — é a primeira vez que esse caminho correu: deu exatamente um crédito "disponivel". Para isso foi
preciso ligar `alertas_autorizados` no fornecedor de teste, que estava desligado (é condição do
bónus).

**Nota de método:** não aceitei os termos de confidencialidade do levantamento em nome do promotor —
é uma aceitação de termos, fica para ele, com um clique. É o único passo que falta para ver o ecrã do
esclarecimento.

## 24/10/2026, madrugada (segunda parte) — Cinco pontos do levantamento, e a gestora reorganizada

Pedidos do promotor, por ordem de chegada, com o que ficou feito:

1. **Submissão da informação pelo avaliador** — os campos ganharam um `(i)` que abre a explicação do
   campo (`Field`, propriedade `info`, com `<details>` nativo: sem estado, funciona sem JavaScript). O
   envio de fotografias ("**fotos originais**", o nome que o promotor lhes dá) avisa a vermelho que nada
   na imagem pode identificar o prédio, e tem popup "Instruções das fotografias" com três regras, cada
   uma com um desenho: zona representativa de 2-5 m², fotografias próximas das anomalias, e o que nunca
   fotografar. Pouco texto, como ele exigiu.
2. **Pedido de esclarecimento** — já construído na entrada anterior.
3. **A resposta soma ao dossiê** — `survey_addenda` (migração 20261024034129) devolve todas as rondas,
   com perguntas e resposta de cada uma, pela ordem em que aconteceram. Nada substitui o anterior.
   Aparece ao pintor e ao cliente. **Não devolve quem perguntou**: abrir
   `survey_clarification_items` aos pintores mostraria a concorrentes quem perguntou o quê, contra a
   decisão de 23/10/2026.
4. **Prazos e avisos** — `Countdown` com a contagem a correr, a vermelho abaixo de duas horas, nas duas
   etapas do vendedor e na espera do pintor. E `respond_clarification` passa a avisar as entidades de
   pintura que perguntaram e o cliente: **até aqui não avisava ninguém**, pelo que a resposta chegava
   sem sinal a quem esperava por ela.
5. **Ganho previsto** — cartão no ecrã do levantamento com a fração atual na banda 1%-2,7%, as quatro
   parcelas (40/30/15/15) com o valor de cada uma, o bónus quando há crédito, e a tradução em euros para
   obras de 10k/25k/50k. **Não inventa um valor para a obra concreta**: quando o levantamento se faz
   ainda não há proposta escolhida, e um número inventado seria prometer o que a plataforma não sabe.
   `surveyorEarningView` lê com privilégios próprios (o vendedor não vê notas individuais dos pintores,
   só a média) e a página confirma à mão que quem vê pertence à entidade do vendedor.

**Reorganização do ecrã da gestora**, depois de ele olhar para o cartão "Dados da entidade":
- Ícone de configuração junto ao nome — é aí que se editam os dados da própria gestora.
- O cartão de cima passa a ser do **prédio selecionado** (morada, condomínio, NIPC, pisos/frações/
  fachadas/ano), com "Configurar prédio". Os prédios são botões: clica-se, fica marcado, e a escolha
  vive no endereço (`?predio=`), para aguentar um recarregar e poder ser partilhada.
- **Gravação à medida que se escreve**, sem botão (`AutoSaveField`): características do prédio, obras
  pretendidas e área aproximada. **A morada ficou de fora disto**, com gravação explícita: é validada
  contra o código postal real e meio código postal é um código postal inválido — gravar a cada tecla daria
  erro a cada tecla.
- Duas armadilhas evitadas: `saveBuildingCharacteristic` não constrói consulta nenhuma com o nome do
  campo vindo do navegador (regra 10) e repete os limites de `parseBuilding` em vez de inventar outros; e
  criou-se `updateBuildingIdentity` porque o formulário da morada, a escrever o prédio inteiro, **apagava**
  as características que já não vinham nele.

**Decisão tomada por omissão, e anunciada antes de avançar — obras fora da pintura.** O promotor pediu
que a ficha do prédio deixasse descrever "pinturas, revestimento, caleiras, telhado, etc". A plataforma é
**só de pintura** (CLAUDE.md, tipos de obra, alvarás IMPIC exigidos ao pintor). Pus-lhe as duas leituras à
frente — (1) registar tudo e orçamentar só pintura; (2) alargar o âmbito, com alvarás, quem orçamenta e
comissão a decidir — e disse que assumiria a 1 na ausência de resposta, por ser a reversível. Ele mandou
continuar sem responder: **está construída a 1**. `src/domain/buildingNeeds.ts` guarda a lista e a regra de
quais se orçamentam (pintura e impermeabilização); as restantes ficam registadas para o avaliador saber o
que vai encontrar, e o ecrã diz isso por escrito em vez de as esconder. Alargar o âmbito continua
disponível, sem nada por desfazer.

## 24/10/2026, madrugada (terceira parte) — As quatro migrações aplicadas, e os pormenores no volume

Ordem direta do promotor, antes de ir dormir: *"a ordem neste momento é aplica as 4 escritas que referes
estarem por aplicar. não pares por nada"*. **Aplicadas as quatro; não sobra nenhuma por aplicar.** Desta
vez o classificador da sessão não recusou, ao contrário das tentativas de ontem — e convém registar que
**não foi a autorização dele que mudou isso**: a autorização em chat nunca destravou o classificador, como
já estava escrito em 6.7. Mudou o comportamento do classificador.

Cada uma confirmada por SQL direto, nunca pelo "success" devolvido (regra 7 do `CLAUDE.md`). A da leitura
do pintor foi verificada com **a identidade de um pintor e RLS a valer** (`set local role authenticated`
mais `request.jwt.claims`), porque é a única forma de provar que a política faz o que diz: o levantamento
concluído passou de invisível a visível.

**Pormenores caracterizados no volume 3D** (pedido da mesma ronda): o croqui passa a desenhar janelas em
ritmo fixo, guardas em todas as varandas — *"uma varanda sem guarda não existe"* —, e muro, beirais e palas
quando caracterizados. Tudo sai das **superfícies declaradas** (`request_surfaces.kind`), nunca de
fotografia, e há um teste a provar que duas obras com as mesmas declarações continuam a dar **exatamente o
mesmo desenho**: é essa indistinguibilidade que mantém o volume anónimo, e é o que distingue este desenho
de um filtro sobre a fotografia (ver `docs/FOTOGRAFIAS.md`).

**As palas ficam prontas mas por ligar**: nenhum campo da aplicação as declara. Não se inventou coluna nem
se adivinhou a partir de texto livre — decidir onde se caracterizam é decisão do promotor.

## 24/10/2026, mais tarde — Regra obrigatória antes do lançamento beta: `PERMITIR_ACEITACAO_SIMPLES` desligada

Pedido explícito do promotor, verbatim: "`PERMITIR_ACEITACAO_SIMPLES` ligado > lembra-me / exigi-o como
regra antes do lançamento versão beta". Até aqui (ponto 16 acima) isto estava registado como recomendação
"sem urgência enquanto o piloto estiver longe" — deixa de ser isso e passa a **condição de lançamento**,
registada com checklist em `docs/ESTADO.md` secção 6.8 e na tabela da secção 7. Resumo da regra: nenhum
lançamento beta avança sem reescrever/apagar esta variável na Vercel (o tipo `sensitive` nunca deixa
confirmar o valor atual por leitura) e, se ainda for precisa para testes, movê-la para Preview/Development —
nunca Production. Esta sessão continua sem conseguir executar essa escrita (mesmo bloqueio "Feature Flag
Writes" de antes) — fica para o promotor, ou para uma sessão com o modo automático desligado.

## 24/10/2026, mais tarde (segunda parte) — Catálogo alargado a isolamento (capoto) e acessórios

Pedido do Nuno, verbatim: alargar o catálogo de referência aos materiais de sistema de capoto (ETICS) —
isolantes (EPS, EPS grafitado, XPS, lã mineral/lã de rocha, cortiça ICB) e acessórios (fixadores mecânicos,
rede/malha de fibra de vidro, rebocos próprios) — "com as diferentes espessuras disponíveis... faz um
trabalho como fizeste nas tintas... tudo igual". Decisões tomadas:

- **8 tipos novos no enum `product_type`** (`isolamento_eps`, `isolamento_eps_grafitado`, `isolamento_xps`,
  `isolamento_la_mineral`, `isolamento_cortica`, `fixador_capoto`, `rede_fibra_vidro`, `reboco_capoto`), em
  migração própria (`20261024090000_catalogo_isolamento_capoto.sql`) separada da que insere produtos
  (`20261024130000_...produtos.sql`) — o Postgres não deixa usar um valor de enum na mesma transação em que
  foi criado.
- **Seis colunas aditivas em `reference_products`**, todas `null`/vazias por omissão e por isso inofensivas
  para os produtos de tinta existentes: `espessuras_mm` (array), `dimensoes`, `m2_por_embalagem`,
  `condutividade_termica_w_mk`, `reacao_fogo`, `unidade_venda`. Estes produtos não se medem em litros: os
  campos de tinta (`rendimento_m2_l`, `diluicao`, `secagem_horas`, `cores`, `base_aquosa`, `preco_embalagem_l`)
  ficam `null` para eles, tal como já acontecia com `massa_reparacao`/`outro`.
- **`ISOLAMENTO_E_ACESSORIOS`** (`src/domain/catalog.ts`) marca estes 8 tipos como "ficha de placa/rolo/
  acessório" — usado pela interface (`/app/catalogo` e a ficha do produto) para mostrar espessuras,
  dimensões, condutividade térmica (λ) e reação ao fogo em vez dos campos de tinta, e para calcular
  quantidade/custo por m² de embalagem (`boardQuantity`, `src/domain/catalog.ts`) em vez de litros/demãos
  (`consumption`) — não há "demãos" numa placa.
- **29 produtos reais inseridos** (investigação em paralelo, por categoria: 4 EPS, 2 EPS grafitado, 3 XPS,
  4 lã mineral, 2 cortiça, 4 fixadores, 5 redes de fibra de vidro, 5 rebocos ETICS), com a mesma disciplina
  da tinta: preço só quando confirmado por fonte pública e datado, nunca estimado; campos sem confirmação
  ficam em branco, nunca adivinhados. Sem preço público confirmado: todos os fixadores e rebocos, a cortiça,
  a maioria das redes e a maioria dos isolantes (só um produto por categoria tinha preço de catálogo
  publicado). Um produto de cortiça (ficha da Weber/Saint-Gobain) ficou de fora por a ficha técnica pública
  não ser legível para extrair dados com confiança.

## 24/10/2026, mais tarde (terceira parte) — Pesquisa do catálogo entende gíria e tolera erros de escrita

O Nuno escreveu "capoto" na pesquisa do catálogo (com e sem o tipo "Isolamento — EPS" já escolhido) e não
apareceu nenhum produto, apesar de "capoto" ser como toda a gente trata o sistema de isolamento térmico pelo
exterior (ETICS) em Portugal — nenhuma ficha de produto tem essa palavra escrita. Pedido dele, verbatim:
"Não esquecemos que existe gíria profissional, além que muitos users podem se enganar a escrever... temos
que auxiliar a encontrar e não criar este atrito". Pesquisa confirmou "capoto" como termo coloquial corrente
nos fóruns de construção portugueses para isolamento térmico pelo exterior (forumdacasa.com), e as técnicas
padrão para tolerância a erros de escrita em bases de dados (pg_trgm/unaccent do Postgres).

Decisão: não instalar `pg_trgm`/full-text search no Postgres (exigiria extensão nova, índices e mais uma
camada de infraestrutura para um catálogo ainda pequeno) — construiu-se antes **`src/domain/search.ts`**,
função pura e testada (regra 2 do `CLAUDE.md`), com duas partes:

1. **Dicionário de gíria do setor** (`CATALOG_JARGON`): mapeia palavras como "capoto", "esferovite", "bucha",
   "reboco", "massa" aos tipos de produto correspondentes — encontra o produto mesmo que a palavra escrita
   nunca apareça em nenhuma ficha. Alargar esta lista é a forma correta de resolver uma futura "a pesquisa de
   X não encontra nada".
2. **Tolerância a erros de escrita** (distância de Levenshtein, como a generalidade dos motores de pesquisa):
   sem tolerância em palavras muito curtas (3 carateres ou menos, para não confundir "eps" com "xps"), um
   erro em palavras até 7, dois a partir daí — aplica-se tanto ao texto do produto como ao próprio termo de
   gíria escrito com erro (ex.: "kapoto").

A pesquisa passou a correr em memória (antes do tipo de produto já filtrado na consulta SQL) em vez de um
`ilike` na base de dados, nas duas listas do catálogo (`/app/catalogo`): produtos de referência e produtos
dos fornecedores. Visitas com muitos produtos ativos podem, no limite, ficar menos eficientes do que um
`ilike` indexado — aceitável à escala atual do catálogo; revisitar se um dia isso pesar.

## 24/10/2026 — Comissão do pintor: 18% com piso de 9%

O promotor viu uma proposta de 34 800 € a cobrar ~3,5% e disse: "a comissão ficou abaixo do mínimo
estabelecido, apenas 3,5% e não 18% ou 20%… mínimo 9%".

Decisão: nova versão de regras `2026-10-24`, com `commissionBp` 1800 (18%) e um campo novo,
`commissionFloorBp` 900 (9%). Os 18% são a base do documento "Algoritmo de determinação de fee
QuemPinta v1"; os 9% são o piso que esse documento fixa com todos os descontos empilhados
(18 − 3 de resposta inicial − 2 de fidelização − 4 de referências).

O piso passa a ser cumprido pelo código: `applyPainterDiscount` nunca desce abaixo dele. Antes
limitava-se a não ficar negativo, e por isso dependia de quem configurava os descontos não se enganar.

As versões anteriores ficam como estavam, sem piso, para que contratações já iniciadas se
reconstruam exatamente como foram (regra 3 do CLAUDE.md). O canal "traga o seu pintor" mantém os 9%,
que agora coincidem com o piso.

**Por aplicar:** `supabase/migrations/20261024170000_comissao_18_porcento.sql`, que carimba a versão
nova nas contratações que nascem a partir daí. Enquanto não for aplicada, o ecrã do pintor mostra
18% mas a contratação nasce com a versão antiga, de 3% — a plataforma cobra a menos. É a primeira
coisa a aplicar.

## 24/10/2026, mais tarde (quarta parte) — Ecrã final do orçamento: a comissão, vendida como condicionada

Trabalho de texto e UI/UX com o Nuno sobre o último ecrã do percurso de orçamentação (o passo "Rever" do
assistente, logo antes de "Submeter a proposta") — o primeiro momento em que o pintor vê um custo, depois de
já ter feito todo o trabalho de orçamentar. Pedido dele, com três versões de tom testadas: "a ideia é
transmitires como se deve vender a proposta — sem pesar muito, sem passar despercebida"; escolheu a versão
calorosa, depois pediu para cortar a repetição da palavra "ganhar" em linhas seguidas.

Princípios do ecrã (**`src/components/FeeSummary.tsx`**, componente partilhado):

- **A condição vem antes do número.** Uma etiqueta discreta no topo ("Grátis para orçamentar; comissão só com
  adjudicação") enquadra tudo antes de qualquer valor aparecer.
- **Um só número grande: o total condicionado** (`fee.gross`), nunca a comissão isolada — dois números
  grandes a competir lia-se como "cobrado duas vezes".
- **A comissão, o IVA e os descontos vêm por baixo, mais pequenos, sempre visíveis** — nunca atrás de um
  "ver detalhe" a esconder a comissão (o padrão antigo, que este trabalho substituiu). Cada desconto tem o
  nome de quem o dá (ex.: "Código de adesão — [fornecedor]"), com o valor em euros, não só em pontos-base: o
  valor exato de cada linha reparte o desconto total (que já respeita o teto conjunto,
  `MAX_COMBINED_PAINTER_DISCOUNT_BP`) proporcionalmente aos pontos-base de cada origem — soma sempre certa,
  mesmo quando o teto corta.
- Duas linhas de confiança sem ênfase de alarme: o cliente paga só o valor do orçamento; paga-se 8 dias
  depois da assinatura, nunca antes; os contactos só se trocam depois do pagamento.
- Nada de vermelho/laranja (cores de alarme) na comissão; desconto a verde, como única boa notícia da lista.
- O componente é o mesmo no ecrã final do assistente e na vista de leitura de uma proposta já existente
  (antes eram dois textos diferentes a dizer coisas ligeiramente diferentes sobre a mesma comissão).

## 24/10/2026 — Documento de orçamento para imprimir/PDF

O Nuno pediu um documento A4 (HTML + Tailwind, impressão do navegador, sem bibliotecas de PDF) que o
pintor entrega ao cliente e que serve para comparar propostas, com a empresa de pintura a dominar o
cabeçalho e a Quem Pinta presente com uma marca de água discreta e uma linha de rodapé. Depois de ver
dois protótipos com dados fictícios e pedir ajustes (tipografia demasiado grande, aspeto de "startup"),
aprovou uma terceira versão e pediu: continuar a partir dela, aplicar o mesmo acabamento aos outros
protótipos, e ligar tudo a dados reais — mantendo a imagem exatamente igual.

Decisão: `src/components/ProposalDocument.tsx` + `src/domain/proposalDocument.ts`, com dados que vêm
sempre de campos reais da proposta (nunca inventados) e uma regra nova sobre identidade: o documento
não recebe o nome do pintor diretamente, recebe um `identity` que a rota resolve — o pintor vê sempre a
sua própria identidade; o cliente só a vê depois da apresentação (`engagement.feePaid`), exatamente como
já acontece no dossiê e no comparador. Antes disso, o documento mostra o alias ("Pintor A", …). Isto
evita que um documento pensado para "o pintor enviar ao cliente" se torne, sem querer, uma forma de
contornar o anonimato até à apresentação (regra 6 do CLAUDE.md) quando é visto a partir da plataforma.

Em aberto: as duas direções visuais descartadas (técnica e moderna) não foram portadas para código —
ficaram só como protótipos de escolha fora do repositório. Também por decidir: se o pintor deve poder
gerar/pré-visualizar este documento antes de submeter a proposta (ecrã "Rever e enviar",
`docs/PROPOSTA.md`), ou só depois de submetida, como está agora.

## 24/10/2026 — Como se apresenta ao pintor o custo da plataforma

**Problema.** O ecrã final do orçamento mostrava primeiro a etiqueta "Grátis para orçamentar", depois um
número grande (comissão + IVA) sem dizer de que total se tratava, e a comissão verdadeira em letra pequena
por baixo. Leitores externos disseram ao promotor que "não é perceptível o valor da plataforma, está
disfarçado". Estava — sem intenção, por ordem de leitura.

**Decisão.** `src/components/FeeSummary.tsx` passa a obedecer a cinco regras, que não se revertem sem nova
decisão aqui:

1. O número grande é a **comissão sem IVA**. O IVA não é custo para o pintor (deduz-o); mostrá-lo em corpo
   grande sobredimensionava o custo real em 23%. O desembolso total aparece na mesma caixa, na linha
   "A transferir".
2. A comissão aparece **sempre ao lado do valor da obra e do líquido** que fica para a empresa. Um número
   isolado não tem escala e o leitor inventa-lhe uma.
3. A condição vem na **mesma frase** do valor, afirmativa: "Se o cliente escolher esta proposta, paga X + IVA.
   Se escolher outra, não paga nada." Sem "grátis", "só" ou "apenas" — minimizadores apagam o número que
   acompanham.
4. Nada essencial atrás de acordeão, tooltip ou "ver detalhe".
5. O momento de pagamento diz-se por inteiro, **incluindo a parte incómoda**: paga-se 8 dias após a caução,
   isto é, antes de assinar e antes de receber do cliente qualquer valor da obra. Era o único custo
   verdadeiramente disfarçado do ecrã.

**Por fazer (decisão em aberto).** A percentagem e o valor em euros deviam aparecer também ao abrir o pedido
de obra, antes de horas de medição e orçamentação, e não só no fim: revelar o custo depois do esforço feito
converte por custo irrecuperável, o que produz ressentimento diferido num mercado pequeno. O ecrã final
passaria a confirmar em vez de revelar.

## 25/10/2026 — Plano Pro das empresas de pintura

**Decisão do promotor.** Dois planos: o gratuito, que é o de hoje, e o **Pro** — 30 €/mês ou 250 €/ano
(preço de lançamento; tabela 50 €/mês ou 500 €/ano quando as funcionalidades estiverem no ar). O Pro
desce **5 pontos percentuais** na comissão — 18% passa a 13% —, acumulável com os outros descontos e
travado pelo piso de 9%. A linha do desconto de subscritor aparece **sempre** no cartão da comissão,
tenha-o ou não: é assim que quem não subscreveu fica a saber que existe, no sítio onde decide.

**O que o estudo mostrou e que muda o conteúdo do plano.** A pergunta "o que falta mesmo a uma empresa
de pintura portuguesa" foi investigada antes de se escolher o que o Pro oferece. As conclusões que
contrariam o instinto:

- **As calculadoras não sustentam uma subscrição.** Rendimento de tinta, conversão de áreas e custo de
  andaime existem de graça nos sites da CIN, Robbialac e Dyrup, e um pintor experiente estima de
  cabeça. Um separador cheio de calculadoras demonstra bem e renova mal.
- **O valor verdadeiro é, por ordem:** ganhar obra; orçamentar depressa e com bom aspecto (1 a 3 h por
  orçamento hoje, e quem envia primeiro ganha vantagem desproporcionada em condomínios); não perder
  adjudicações por papelada caducada (as declarações de não dívida às Finanças e à Segurança Social
  valem 3 meses e ninguém controla os prazos); registar trabalhos a mais com aceitação do cliente, que
  é onde a margem desaparece.
- **O IVA é um problema a sério e caro.** Três regimes decididos caso a caso por quem não é
  contabilista: verba 2.27 (6% em habitação, com os materiais só a 6% se não excederem 20% do valor
  global), verba 2.42 do DL 97/2026 (desde 1 de Julho de 2026) e a inversão do sujeito passivo quando
  o adquirente é sujeito passivo com direito à dedução. Facturar mal custa centenas a milhares de
  euros, nos dois sentidos. O que a plataforma pode fazer é um questionário que devolve o regime
  provável e **guarda a prova** — nunca garantir conformidade, e isso tem de estar escrito no ecrã.
- **Prioridade de construção, inversa à facilidade:** orçamento → cofre de documentos com avisos de
  validade → trabalhos a mais → diário fotográfico datado → horas e margem real → integração com um
  software de facturação já existente (Vendus, Moloni, InvoiceXpress, Toconline — não construir
  facturação própria) → calculadoras.

**Por confirmar antes de construir:** limites em euros por classe de alvará e de certificado IMPIC e a
subcategoria aplicável a pinturas; estado do livro de obra electrónico e se obriga o subcontratado;
se o IMPIC permite consulta automatizada da validade de um alvará.

**Em aberto.** Se os 30 €/mês cobrem as ferramentas, o acesso a obra, ou ambos. O estudo aponta para o
acesso a obra ser o que sustenta o preço — e, se for esse o caso, vender o plano pelas ferramentas é
vender a coisa de menor valor.

## 25/10/2026 — Obras Públicas: o que o levantamento mudou

**O facto que muda o separador.** O DL n.º 177/2026, em vigor desde **1 de Outubro de 2026**, subiu os
limiares das empreitadas: ajuste directo de 30 000 € para **150 000 €**, consulta prévia de 150 000 €
para **1 000 000 €**, e uma consulta prévia especial até 2 000 000 €. Nenhum destes é anunciado
publicamente — a publicitação no BASE é posterior e só serve de condição de eficácia dos pagamentos.

Ou seja: **uma empreitada de pintura até 1 000 000 € pode hoje ser adjudicada sem qualquer anúncio
público.** O universo de concursos anunciados em pintura vai encolher, não crescer. Um separador
desenhado como alerta de concursos nasce num mercado em contracção.

**Reorientação.** O separador deve responder a "estou qualificado para quê, e quem tenho de conhecer",
e não a "que concursos abriram". As três peças, por ordem de valor:

1. **Cálculo de elegibilidade** (`src/domain/obrasPublicas.ts`, já construído e testado). Cruza o valor
   global da empreitada e as subcategorias exigidas com o alvará da empresa. A regra é o artigo 8.º da
   Lei 41/2015: a classe cobre o **valor global da obra**, não a parte de pintura — um pintor de classe
   1 não é empreiteiro de uma reabilitação de 400 000 € onde a pintura são 80 000 €. É o maior
   desperdício de tempo do sector e nenhum concorrente genérico o faz, porque exige conhecer o regime
   da construção.
2. **Memória de mercado a partir dos dados abertos do BASE** (licença domínio público, actualização
   quinzenal): quem adjudica pintura, a quem, a que preço, e sobretudo **quem é convidado
   recorrentemente** nos ajustes directos e consultas prévias de cada câmara. Num mercado que passou a
   ser de convite, saber quem está na lista diz à empresa onde tem de ir bater à porta. Ninguém vende
   isto em pintura.
3. **Alerta de concursos** — commodity, é o bilhete de entrada, não a vantagem. Fonte primária
   confirmada: o feed RSS oficial da Parte L da 2.ª série do Diário da República
   (`https://files.diariodarepublica.pt/rss/serie2&parte=l-html.xml`), gratuito, sem registo, com o PDF
   de cada anúncio a trazer CPV, distrito, concelho, preço base, prazo e plataforma. O alerta tem de
   cruzar CPV **com pesquisa de texto no objecto**: boa parte das empreitadas de pintura vem
   classificada como recuperação ou restauro, não em 4544xxxx. Já existe concorrência directa
   (ConcursosGov, da Caixa Mágica).

**Duas crenças comuns que o levantamento desmentiu.** As plataformas electrónicas são, em regra,
**gratuitas** para o concorrente — quem paga é a entidade adjudicante. E a **caução** deixou de ser
exigível abaixo de 1 000 000 €, pelo que praticamente nenhuma empreitada de pintura a leva. O atrito
real do pintor pequeno é a **assinatura digital qualificada**, documento a documento, antes do envio.

**Boa notícia para a papelada.** O novo artigo 81.º, n.º 10 do CCP obriga a entidade adjudicante a
obter **oficiosamente** as certidões de não dívida e o registo criminal. O que a plataforma deve dizer
mudou de natureza: já não é "vá buscar sete certidões", é "garanta que a sua situação na AT e na
Segurança Social está regularizada". Ressalva: mantém-se a Portaria 372/2017 até sair a nova portaria
do artigo 81.º, n.º 2 — por confirmar se já saiu.

**Por confirmar antes de construir a recolha:** a API do Portal BASE (anunciada em 2025; o portal
recusa acesso automatizado por robots.txt, o que também levanta a questão dos termos de utilização);
se existe consulta programática dos alvarás no IMPIC; e a lista actual de plataformas licenciadas (a
página do IMPIC está datada de 2015).

**O que não se oferece:** submissão de propostas em nome do cliente, garantia de resultado, e fixação
de preço. Risco jurídico sem retorno.

## 25/10/2026 — Cofre de documentos e trabalhos a mais

**Cofre de documentos** (`src/domain/dossier.ts`, bloco no topo de `/app/obras`). As declarações de não
dívida às Finanças e à Segurança Social valem três meses e ninguém controla os prazos: perder uma
adjudicação por causa disso é o desperdício mais evitável do sector. Aviso a 15 dias, que é tempo de
pedir uma certidão nova. Fechado quando está tudo em ordem, aberto sozinho quando há algo a resolver.
Todos os estados com problema têm acção — o caducado era o mais urgente e era o único que não levava a
lado nenhum.

**Trabalhos a mais** (`src/domain/addenda.ts`, `worksite_addenda`). "Aproveite e pinte também a escada"
sem adenda escrita é a fonte número um de conflito e de margem perdida. A adenda fica com descrição,
preço e fotografia, e **quem aceita é o cliente, dentro da plataforma, com data do servidor**. As
políticas de RLS recusam que o pintor marque como aceite uma adenda sua, por muito que o navegador lho
peça, e depois de respondida nem uma parte nem a outra lhe mexem.

Regra que não se contorna: **uma adenda só conta para o valor da obra depois de aceite**. Enquanto está
proposta aparece em separado, para o pintor não contar com dinheiro que ainda não tem.

Uma nota sobre o Postgres, para quem vier a escrever testes de RLS: um `update` cujo `using` não
encontra a linha afecta zero linhas e **não levanta erro** — o erro vem do `with check`. Um teste que
espere uma excepção nesse caso falha mesmo com a política correcta.

## 25/10/2026 — As ferramentas de obra deixam de depender de ter ganho obra aqui

**O problema, nas palavras do promotor:** "talvez exista para ti no código mas não existe para o
utilizador que não tem obra ganha". O separador só mostrava obras contratadas na plataforma, e por
isso estava vazio para quase toda a gente.

**Decisão.** As ferramentas de obra valem por si e passam a servir **qualquer obra da empresa**, venha
ou não da Quem Pinta. `worksites` passa a ser a entidade central: uma obra tem `engagement_id` quando
veio da plataforma e não tem quando é obra própria. As tabelas de equipa, fases, lançamentos e adendas
passaram a apontar para a obra em vez da contratação — mudança feita de uma vez, sem período de
convivência, porque estavam todas vazias em produção (verificado a 25/10/2026). Uma contratação nova
traz a sua obra por trigger, para não haver contratações sem obra nem o pintor ter de a criar à mão.

**Consumíveis.** `org_consumables` com os movimentos em `consumable_moves`. O stock **não se guarda**:
soma-se dos movimentos. Dois números a dizer o mesmo acabam sempre por discordar. Transporte não
precisou de tabela — já era uma categoria de custo.

**Encomendas a fornecedores continuam presas à contratação**, e é correcto que fiquem: exigem contrato
assinado na plataforma. Numa obra própria não há a quem encomendar por aqui, e o ecrã di-lo.

**Nota de migração, para a próxima vez:** o Postgres recusa largar uma coluna de que dependem
políticas de RLS. As políticas antigas têm de cair **antes** da coluna, não depois.

## 25/10/2026 — Orçamentos a clientes próprios, e onde estão as 3 horas

**A promessa, e o que a sustenta.** O orçamento leva hoje 1 a 3 horas. O tempo não está todo onde
parece, e só parte dele se elimina:

| Onde | Hoje | Depois | Como |
|---|---|---|---|
| Escrever e formatar o documento | 40-50 min | 0 | Gera-se sozinho, com o logótipo dele |
| Contas, IVA, totais | 15 min | 0 | Calculado, e com ele os erros |
| Decidir o que entra | 45 min | 5 min | Modelos por tipo de obra, pela ordem de execução |
| Preços | 25 min | 5 min | Biblioteca com os preços dele, a partir do 3.º orçamento |
| Medir | 30-60 min | igual | Medir é físico. Só desaparece a *segunda* vez: reconstruir as áreas em casa |

**O que se pode dizer sem mentir:** o primeiro orçamento leva cerca de 40 minutos, porque é ele que
ensina os preços à aplicação; **a partir do terceiro, 15 minutos**. A condição diz-se à frente do
número, não em letra pequena. Os que vêm de um pedido da plataforma arrancam em menos, porque o
levantamento do avaliador já traz as superfícies e as áreas.

**A regra que está por trás de tudo:** o orçamento **nunca começa em branco**. Ou nasce de um pedido
com levantamento feito, ou duplica um orçamento anterior dele — que é o que já faz hoje à mão com o
Word —, ou nasce de um modelo por tipo de obra.

**Decisões de desenho que não se revertem sem nova decisão aqui:**

- **A biblioteca guarda os preços dele, nunca médias de mercado.** Um preço sugerido que não seja dele
  ou está abaixo e ele perde dinheiro, ou está acima e ele perde a obra — e nos dois casos perde a
  confiança na aplicação. Aprende-se no momento em que ele dá o orçamento por enviado, porque é aí que
  os preços são os definitivos.
- **Os modelos não trazem preços nenhuns**, só capítulos pela ordem de execução. E deixam sempre
  acrescentar o que ficou de fora: um modelo de que não se possa fugir é uma gaiola.
- **Tabela própria, não `proposals`.** As propostas do mercado carregam anonimato, comissão, prazos e
  selecção, e nada disso se aplica a um orçamento privado. Misturá-las era abrir caminho a que um
  orçamento privado entrasse um dia num fluxo de mercado por engano.
- **Marca própria no documento:** logótipo, nome e contactos dele, sem marca de água, e a plataforma
  só na linha "Suportado por QuemPinta.pt" no rodapé. É o mesmo componente do documento do mercado —
  não existem dois documentos para a mesma coisa.
- **Lembretes, não bloqueios:** acessos e limpeza final são os dois capítulos que mais se esquecem e
  os dois que saem do bolso. A aplicação avisa; não impede.

**Avisos que a aplicação dá e não decide:** a taxa de 6% exige habitação e materiais abaixo de 20% do
valor global. O ecrã di-lo e guarda o que ele escolher; a decisão é dele e do contabilista.

## 25/10/2026 — "Registar o dia"

A picagem de horas tem o maior retorno de todas as ferramentas de obra — sem ela não há margem real,
porque ninguém sabe quantas horas foram a cada obra — e é a que corre maior risco de nunca ser usada:
exige disciplina diária de quem não gosta de aplicações e faz isto cansado, ao fim do dia.

**A aposta está toda numa ideia: pré-preencher o dia normal e pedir só as excepções.** Oito horas para
toda a equipa activa, ‹−› e ‹+› de meia em meia hora, e um "faltou" por pessoa. Quem teve um dia
normal faz dois toques: abrir e guardar. A nota e o custo do dia estão escondidos atrás de uma linha,
porque são a excepção e não a regra.

Decisões que acompanham:

- **Zero horas é ausência, não é uma linha de zero.** Quem faltou não gera lançamento nenhum.
- **Registar o mesmo dia outra vez substitui, não soma.** O ecrã di-lo. Sem isto, o engano mais
  provável — carregar duas vezes — corrompia a margem em silêncio.
- **O registo fica a um toque da lista de obras**, sem ser preciso abrir a obra: é a acção diária.

**Isto é uma aposta, não uma certeza.** Se não for usado duas semanas seguidas por um pintor real, a
margem nunca aparece e metade do valor das ferramentas de obra vai com ela. É a primeira coisa a pôr
à prova quando houver alguém a usar isto a sério, antes de se construir mais seja o que for em cima.

## 25/10/2026 — Horas a mais: trabalho suplementar

A pergunta do promotor — "e quem fizer horas extra?" — apanhou um buraco real: dava para escrever dez
horas, mas a aplicação tratava-as como horas normais, ao custo normal. Isso mente na margem, que é a
única razão por que estas horas se registam.

**Acréscimos do artigo 268.º do Código do Trabalho**, confirmados na web a 25/10/2026:

| | até 100 h/ano | acima de 100 h/ano |
|---|---|---|
| 1.ª hora em dia útil | +25% | +50% |
| horas seguintes em dia útil | +37,5% | +75% |
| descanso semanal ou feriado | +50% | +100% |

A duplicação acima das 100 horas anuais por trabalhador vem da Lei n.º 13/2023. São **mínimos
legais**: um contrato colectivo pode ser mais favorável, e por isso os acréscimos são parâmetros e
não constantes espalhadas pelo código.

**Decisões:**

- **Uma linha de horas é um dia de uma pessoa, nunca um acumulado.** Sem isto não há como separar
  horas normais de suplementares. O limite passou a 24 horas por lançamento, na base de dados e no
  formulário. O teste da margem tinha uma linha de 40 horas que deixou de fazer sentido e foi
  reescrito como cinco dias.
- **O limiar atravessa-se hora a hora, não dia a dia.** Quem está a 1 hora das 100 anuais e faz duas
  suplementares paga a primeira em singelo e a segunda em dobro — não o dia inteiro em dobro.
- **Em dia de descanso ou feriado não há horas normais**: todas levam acréscimo. É um visto no ecrã
  do dia, que avisa o que está a fazer.
- **A plataforma calcula, não decide.** Os limites anuais de horas dependem da dimensão da empresa e
  do contrato colectivo; o ecrã avisa e não impede.

Fica uma aproximação conhecida, anotada em `docs/ESTADO.md`: o acumulado anual conta só as horas da
mesma obra, não as da empresa toda.

## 25/10/2026 — Diário fotográfico da obra

Seis meses depois aparecem bolhas ou manchas de humidade. Sem registo do estado do suporte **antes** de
se pintar, e sem saber que produto foi aplicado, a discussão perde-se por omissão: a empresa não
consegue mostrar o que encontrou nem o que fez.

**Decisões que fazem a diferença entre um álbum e uma prova:**

- **A data é a do servidor, não a da fotografia.** Os metadados da imagem perdem-se ao exportar, mudam
  de fuso e alteram-se com facilidade. O trigger impõe `now()` mesmo que venha preenchida.
- **Os metadados são apagados antes de guardar**, como já acontece nas fotografias dos pedidos: levam
  GPS e modelo do aparelho, que ninguém precisa de conservar.
- **Apagar pode; alterar não.** Não há política de alteração nenhuma. Uma fotografia que se pudesse
  reetiquetar depois do facto não serve de prova. Quem se enganou apaga e carrega outra vez, e a data
  nova fica visível.
- **Quatro fases, com a razão à frente**, para o registo não parecer burocracia: o antes é o que a
  defende numa reclamação, a preparação prova o que ficou por baixo da tinta, o durante liga o produto
  ao trabalho, o depois serve de prova e de portefólio.
- **O cliente de uma obra contratada aqui também vê o diário.** É prova do trabalho feito e mostrá-lo
  é do interesse das duas partes.
- **Avisos, não bloqueios:** o ecrã diz quando faltam fotografias do antes ou quando nenhuma identifica
  o produto. Não impede nada — quando a obra já começou, a fotografia do antes já não é possível.

## 25/10/2026 — Como a biblioteca de preços cresce sozinha

Quatro caminhos bons e um mau, registados antes de se construir qualquer um deles:

1. **De lado** — aprender também das propostas ao mercado, não só dos orçamentos privados. São linhas
   iguais e já estão na base; duplica a entrada de dados sem pedir nada ao pintor. É a lacuna mais
   óbvia e a mais barata.
2. **Mais densa** — hoje a chave é o texto escrito, e "Duas demãos de tinta acrílica" e "2 demãos
   tinta acrílica" aprendem cada um metade. Quando a linha vem do orçamento guiado tem um código de
   trabalho por trás; usar esse código como chave junta o que hoje se divide.
3. **Mais verdadeira, e é a que vale mais** — a biblioteca guarda preços de venda, as ferramentas de
   obra guardam custos reais. Cruzadas, deixam de dizer "cobrou 11,80 €/m²" e passam a dizer "cobrou
   11,80 e custou-lhe 9,40; margem de 20%". É o que fecha o círculo entre registar o dia e ganhar
   dinheiro, e o que transforma a picagem de horas de obrigação em interesse próprio.
4. **Quente em vez de fria** — deixar importar um orçamento antigo (PDF ou Word), extrair as linhas e
   pedir confirmação. Troca "o primeiro orçamento leva 40 minutos" por "leva 15, se importar um
   antigo".

**O caminho que não se toma:** juntar os preços de todos os pintores e sugerir médias. Expõe
informação comercial de quem confiou na plataforma e devolve um preço que não é dele — e um preço
alheio ou está abaixo e ele perde dinheiro, ou está acima e perde a obra.

## 25/10/2026 — Preço cobrado contra custo real: o círculo fecha-se

Sem isto, registar o dia é um favor que o pintor faz à aplicação. Com isto, é informação que ele quer:
diz-lhe, obra a obra, se o preço a que vendeu dava lucro, e avisa-o quando o orçamento que está a
fazer fica abaixo do que as obras dele têm custado.

**Decisões:**

- **Uma obra sem horas registadas não tem margem fiável, e diz-se.** O custo da mão de obra seria zero
  e a margem apareceria excelente. Apresentá-la assim era pior do que não apresentar nada — ele
  acreditava e repetia o preço. A obra mostra o aviso e o atalho para registar o dia.
- **A média é ponderada pela área, não média das médias.** Uma obra de 40 m² não vale o mesmo que uma
  de 900 na hora de dizer quanto custa um metro quadrado.
- **Mostra-se a dispersão, não só a média.** O mínimo e o máximo por m² dizem mais sobre o risco do
  que qualquer média sozinha.
- **Abaixo de três obras a média aparece com a ressalva à frente**, não escondida.
- **O aviso diz o facto e devolve a decisão.** "Este preço fica abaixo do que as suas obras têm
  custado" — e não "suba o preço". O preço depende da obra, da concorrência e de quanto ele quer
  aquele trabalho, e nada disso está nesta base de dados.
- **A área vem das linhas em m²** do orçamento ou da proposta, sem perguntar nada a ninguém. Sem área
  há margem em euros, mas não há custo por m².

Com isto, a fase 1 fica completa: orçamento rápido com marca própria, cofre de documentos, obras
próprias com equipa e consumíveis, registo do dia com trabalho suplementar, trabalhos a mais com
aceitação do cliente, diário fotográfico, e a margem real a realimentar o orçamento seguinte.

## 25/10/2026 — Palavras-passe comprometidas, sem plano Pro

A consola do Supabase recusou ligar a verificação: *"Configuring leaked password protection via
HaveIBeenPwned.org is available on Pro Plans and up."* É funcionalidade paga.

**Decisão: faz-se em código, e pelo mesmo método que eles usariam** (`src/lib/pwned.ts` e
`src/domain/pwned.ts`). O modelo é o de k-anonimato do Have I Been Pwned: calcula-se o SHA-1 da
palavra-passe e enviam-se **só os primeiros cinco caracteres** do resumo. O serviço devolve algumas
centenas de resumos que começam por esses cinco e a comparação faz-se no nosso servidor. **A
palavra-passe nunca sai daqui**, e quem está do outro lado não consegue saber qual deles nos
interessava — nem sequer se algum lhe interessava. Vai com `Add-Padding`, que mistura linhas falsas
para o tamanho da resposta também não dizer nada.

Verificado contra o serviço real a 25/10/2026: `password123` aparece 2 266 543 vezes; uma palavra-passe
inventada no momento, zero.

**Decisões que acompanham:**

- **Só na criação de conta e na mudança de palavra-passe.** A quem já tem conta não se tranca a
  entrada por causa disto — seria castigar alguém por uma fuga noutro sítio, a meio do trabalho.
- **Se o serviço não responder, deixa-se passar.** Recusar contas novas por causa de uma dependência
  externa indisponível trocava um risco pequeno por um problema certo. Dois segundos e meio de espera,
  e segue. O mínimo de 8 caracteres continua a ser exigido de qualquer modo.
- **Uma única aparição chega para recusar.** Uma palavra-passe numa lista conhecida já está nos
  dicionários que os atacantes usam, mesmo que ele a julgue só sua — e a mensagem di-lo assim.
- **O SHA-1 aqui não guarda nada.** É o formato que aquele serviço usa e o que se compara é um
  prefixo público; não é, nem se torna, a forma como as palavras-passe são guardadas.

**Fica em aberto, e é decisão de negócio:** o plano Pro do Supabase é provavelmente necessário antes
de haver utilizadores a sério, não por causa desta verificação — que já está resolvida — mas pelas
cópias de segurança e por o plano gratuito suspender projetos sem actividade.

## 25/10/2026 — A biblioteca de preços aprende de duas origens, e por código de trabalho

Dois dos quatro caminhos escritos ontem, construídos:

**De lado:** a biblioteca passa a aprender também das **propostas submetidas ao mercado**, não só dos
orçamentos privados. São linhas iguais, já estavam na base, e deixá-las de fora desperdiçava metade
dos dados. A aprendizagem vive agora num auxiliar partilhado (`src/lib/priceBook.ts`), chamado nos
dois sítios onde um orçamento sai das mãos do pintor.

**Mais densa:** quando a linha veio do catálogo de trabalhos, a chave da biblioteca passa a ser o
**código do trabalho** e não o texto escrito. "Duas demãos de tinta acrílica" e "2 demãos tinta
acrílica" eram dois itens e cada um aprendia metade — e o pintor nunca via a sugestão que já devia
ter. Sem código, mantém-se a descrição normalizada, que é o melhor que há para texto à mão.

Ficam por fazer os outros dois: o cruzamento com os custos reais está feito ao nível da obra (ver a
entrada do preço cobrado contra custo real), falta descê-lo ao nível da linha; e a importação de um
orçamento antigo para arrancar com a biblioteca cheia.

## 25/10/2026 — O plano Pro passa a ser pago, não simulado

**O que o promotor encontrou, a testar:** aderir ao plano "aceitava" e não pedia pagamento nenhum.
Tinha razão. A adesão gravava a linha em `por_pagar` e parava aí — escrevi na altura que "a activação
é do lado do pagamento" e **nunca construí esse lado**. A regra estava certa (por pagar não desconta
nada), mas como não havia forma de pagar, ninguém lá chegava. Era um botão sem destino.

**Agora:** a adesão cria a intenção e manda para o Stripe Checkout, no mesmo desenho das subscrições
dos fornecedores. A linha **só passa a activa quando o Stripe confirma**, pelo webhook assinado —
nunca pelo regresso do navegador, que qualquer pessoa consegue forjar.

**Decisões que acompanham:**

- **O preço vai em `price_data`, não num preço criado no painel do Stripe.** A tabela de preços da
  aplicação (`PRECO_ATUAL`) é a fonte da verdade, e assim não há um valor no painel a divergir dela em
  silêncio. Também evita um passo manual sempre que o preço de lançamento mudar.
- **Uma adesão por pagar deixada para trás é reaproveitada**, para não acumularem linhas mortas de
  cada vez que alguém desiste a meio do pagamento.
- **Cancelar cancela no fim do período, não já.** Ele pagou aquele mês ou aquele ano e o desconto é
  dele até ao fim; a linha fica cancelada e o desconto dura enquanto `valida_ate` não passar.
- **Renovações e falhas de pagamento chegam pelo webhook:** uma renovação paga empurra a validade
  para a frente, um pagamento falhado devolve a subscrição a `por_pagar` — que é precisamente o
  estado que não desconta.
- **O ecrã deixa de mentir.** Com a adesão por pagar mostrava "Cancelar a subscrição", como se
  estivesse subscrito. Passa a dizer que ficou a meio, que a comissão se mantém nos 18%, e a oferecer
  retomar o pagamento.

**Por confirmar quando houver um pagamento real de ponta a ponta:** que o webhook recebe o evento com
`plano: 'pro'` nos metadados e que a validade fica preenchida. Em modo de teste do Stripe isto
verifica-se com um cartão de teste.

## 25/10/2026 — Primeiro pagamento real, e os dois erros que ele revelou

O primeiro pagamento de teste passou: a subscrição ficou `ativa` e com o identificador do Stripe. Mas
a **validade ficou vazia**, e isso destapou duas coisas.

**1. O fim do período mudou de sítio na API do Stripe.** `current_period_end` vive agora **nos itens**
da subscrição, não na subscrição. Lia-se no sítio errado, devolvia `undefined` em silêncio e a
validade ficava nula. Passa a ler-se nos itens, com a subscrição como alternativa para versões
antigas, e uma validade já conhecida nunca é apagada por um evento que não a traga.

**2. Um buraco no desconto, que só apareceu por causa do primeiro.** `subscriberDiscountBp` dava
desconto a uma subscrição **cancelada sem validade conhecida** — bastava cancelar antes de o Stripe
dizer até quando o período ia para ficar com os 5 pontos para sempre. Agora cancelada sem validade
não desconta. Activa sem validade continua a descontar, que é o estado normal no instante a seguir ao
pagamento.

Vale a pena guardar o padrão: foi um campo vazio numa linha da base — não um erro, não um teste
vermelho — que levou ao segundo problema, que era o grave. Olhar para os dados depois de uma
funcionalidade entrar paga-se.
