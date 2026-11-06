# Decisões

Questões jurídicas, fiscais e regulamentares, com propostas de resposta:
[Paint it — Questões jurídicas para validação](https://claude.ai/code/artifact/6ac31246-9446-4e07-a622-2022b58cdcb3)
(Claude Docs). Requisitos de base: Documento Mestre de Requisitos v0.3 (17/10/2026).

## 01/11/2026 — Guia de desenho de ecrãs de aplicação (taste-skill) adoptado, com uma excepção de marca

O promotor pediu o «taste-skill» (Leonxlnx/taste-skill, capítulo `app-screens`) por os ecrãs parecerem
todos iguais. Regras adoptadas a partir de hoje, aplicadas ao que se fez neste dia: **sem numeração de
índice** (01/02/03) fora de sequências reais (os passos 1·2·3 ficam); **sem ícones em quadrados
tintados** — ícone de traço, cinzento, ao lado do título; **sem sombras em cartões parados** — a borda
ou um degrau de tom separa; **o acento fora do chrome** — o item ativo da barra marca-se por fundo e
brilho, sem risca; títulos de grupo cinzentos; **texto corrido no tom cheio**, cinzento só para notas;
título de ecrã a 24px. Frases longas de estado ficam atrás de um (i) (`src/components/Dica.tsx`).

**Excepção declarada:** o guia proíbe barras laterais escuras em ecrãs claros; a barra marinho é
decisão do promotor sobre maquete e identidade da marca, e mantém-se. A lima fica num único sítio da
barra: o rótulo do perfil.

Página do rascunho do pedido, corrigida no mesmo dia: cabeçalho numa linha («Orçamentos · nome» com (i);
estado, referência e dossiê à direita); o percurso passou de cartão com régua a **faixa de uma linha**
com a ação à direita (a régua duplicava os passos); áreas dos passos sem número e com moldura própria;
com visita pedida, os campos de medição ficam recolhidos em «Acrescentar informação que já sei»;
fotografias com uma linha e (i). Fica em aberto (EM_ABERTO): o resumo de três colunas no fim do passo 2
e a verificação de datas contraditórias (execução antes do fecho das propostas).

## 01/11/2026 — Barra lateral marinho e painel de cantos arredondados; formulário do pedido em grelha com ícones

**Aprovado pelo promotor sobre maquete no canvas** («Barra lateral e disposição do pedido — três
hipóteses»): barra lateral em marinho `#14213d` com o logótipo na versão escura, rótulos em lima,
item ativo com fundo translúcido e risca lima; o conteúdo num **painel névoa com os cantos esquerdos
arredondados** (16px) e margem em cima e em baixo, de modo que o marinho o envolve. Três planos:
moldura, tela, cartões. Aplica-se a toda a aplicação pelo layout comum.

Implementação: tokens `barra-*` (`globals.css`, `tailwind.config.ts`) com valores claros por omissão e
redefinidos em `.barra-escura` (a barra) e `.barra-clara` (o menu de telemóvel, que abre um painel
branco dentro da barra). A mesma lista de navegação (`AppNav`) serve os dois fundos.

Formulário do pedido (grelha A, reequilibrada a pedido do promotor): Local (1/3) + O que pretende (2/3)
em cima; Prazos · Descrição · Preferências (3·6·3) em baixo. Ícone em cada quadro e em cada pastilha;
um só campo de data mais a escolha «Datas flexíveis / Indicar datas»; preferências como linhas
recolhíveis com o valor à vista; contador dentro da caixa; sombra leve. O que o fez «deixar de parecer
básico» não foi profundidade, foi ícones, ausência de espaço morto e menos campos crus.

## 01/11/2026 — Condóminos com acesso ao prédio: acompanhar, ler as propostas, votar

**Pedido do promotor.** A administradora trata de tudo, mas quer abrir aos condóminos de um prédio o
acompanhamento do processo, a leitura das propostas e o voto — sem lhes dar acesso aos outros prédios
que gere. E todos podem consultar o catálogo com preços de referência, nunca com descontos.

**Decisões (respostas do promotor):**
- **Voto indicativo, com permilagem opcional.** O voto não adjudica; a escolha é do administrador, com a
  ata da assembleia. O gestor pode registar a permilagem de cada fração, e a contagem passa a valer em
  frações e em permilagem (`src/domain/votacao.ts`). A contagem só a vê o gestor; o condómino vê o seu voto.
- **Entrada por link ou por QR do prédio.** O gestor cria um código por prédio (`building_access_codes`),
  imprime o cartaz ou envia o link. Quem o abre escreve fração, andar, email e telemóvel — os quatro
  obrigatórios — e recebe no email o link de entrada (o link mágico de sempre, apontado a `/app/condominio`).
  O gestor também regista condóminos à mão, com a permilagem; quem entra com esse email fica ligado.
- **As propostas abrem ao mesmo tempo para todos**, administração e condóminos, e isso é dito explicitamente
  nos ecrãs — para não haver espaço a vícios na adjudicação. É a mesma regra `propostas_entregues` do cliente;
  o condómino nunca vê antes dele.

**Modelo:** o condómino **não é membro da entidade**. `org_members` dá acesso à entidade inteira (e, numa
gestora, a todos os condomínios). Há uma tabela própria, `building_residents`, presa ao prédio, e as
políticas de leitura de prédios, pedidos (nunca rascunhos), superfícies e propostas ganham um ramo para
ela — cada uma a partir da sua versão em vigor. `supplier_discounts` deixou de ser legível a qualquer
conta autenticada: exige pertencer a alguma entidade. Votos só se escrevem pela função `votar`
(um por fração e pedido, alterável até haver proposta escolhida ou o pedido sair de publicado).

Migração `20261101090000_condominos_do_predio.sql`; testes em `supabase/tests/condominos.test.ts`.
Ecrãs: `/app/organizacoes/[id]/predios/[predioId]/condominos` (gestor), `/predio/[codigo]` e `/cartaz`
(público), `/app/condominio`, `/app/condominio/pedidos/[id]`, `/app/condominio/catalogo` (condómino);
linha «Voto dos condóminos» na comparação do cliente.

## 31/10/2026 — Do aceitar ao agendamento confirmado: os prazos, e o que acontece ao vencer

Regras ratificadas pelo promotor neste dia, depois de duas rondas de correção. A primeira versão
destas contas estava **errada em aritmética** — dizia que uma aceitação à sexta às 17h30 dava
conclusão «quarta às 9h00», número que não sai de nenhuma contagem possível. O promotor conferiu e
corrigiu. Fica escrito porque a lição não é de regra, é de método: prazos verificam-se com código,
não de cabeça.

**Contacto:** até ao fim da **primeira hora útil** após aceitar, no relógio 9h–18h, segunda a sexta,
hora de Lisboa. Sem contacto registado nesse prazo, perde a reserva.

**Conclusão: 48 horas de calendário contadas do fim dessa primeira hora útil.** Foram consideradas
três contagens e esta é a escolhida; as outras duas ficam registadas para ninguém as repropor por
distração. 48 horas de calendário **desde a aceitação** é insustentável — à sexta às 17h30 venceria
domingo às 17h30, dezesseis horas **antes** do prazo do contacto, e a vaga morria no fim de semana
sem ninguém ter falhado nada. 48 horas **úteis** dariam cinco dias úteis e três horas, o que tornaria
a exceção dos sete dias quase inútil e faria «48 horas» significar dez dias de calendário. Contadas
do fim da primeira hora útil, nenhum marco posterior pode vencer antes de um anterior, e isso é
garantido pela fórmula, não por um remendo.

**O início é fixo e não depende da confirmação do cliente.** Os três prazos escrevem-se uma vez, no
momento da reserva, e não se movem com a resposta dele: é isto que faz o silêncio do cliente consumir
o prazo do avaliador. No ecrã, «A aguardar confirmação» aparece **ao lado** do prazo a correr —
nunca sugerir que a contagem parou.

**Adiamento:** só a pedido e com confirmação do cliente, nunca pelo avaliador. A data acordada
**substitui** o prazo normal, e não passa de **sete dias úteis depois do início das 48 horas,
mantendo a mesma hora**. Sábados e domingos não contam.

Exemplo de referência, verificado por teste: aceita sexta 6/11 às 17h30 → contacta até segunda 9/11
às 9h30 → conclui até quarta 11/11 às 9h30 → com adiamento, no máximo quarta 18/11 às 9h30.

**A verificação de vencimentos corre a cada minuto**, pela hora exata. De hora a hora deixaria uma
vaga retida quase mais uma hora depois de vencer. O bloco dos levantamentos saiu da manutenção
diária das 05:00.

**A matriz do que acontece ao vencer**, que é coisa diferente do relógio continuar a correr:

| Ao vencer | O que acontece |
|---|---|
| 1.ª hora útil vencida, nada registado | liberta e redistribui |
| 48 h vencidas sem contacto registado | liberta |
| 48 h vencidas **com** contacto e agendamento, cliente calado | **revisão da plataforma**, sem redistribuição nem penalização |
| Cliente respondeu «não fui contactado» | **revisão**, com as duas declarações preservadas |
| Visita confirmada e prazo incumprido pelo avaliador | liberta e redistribui |

A distinção entre as duas últimas linhas é a substância: cliente calado é revisão, porque quem
cumpriu não pode perder o trabalho pelo silêncio de outra pessoa; cliente que confirmou e avaliador
que faltou é libertação, porque o incumprimento está provado pela confirmação do próprio cliente.
**Nunca há perda de comissão nem descida no ranking automáticas** com base numa resposta
contraditória — decide uma pessoa, com os dois registos à frente.

**Libertar nunca apaga.** «Cada redistribuição cria uma nova tentativa; os registos anteriores
permanecem intactos.» A manutenção diária apagava o contacto e o agendamento ao libertar, e isso
passou a ser proibido: são a única prova numa revisão. Daí a tabela `survey_attempts` — o contacto, o
agendamento, os prazos e a resposta do cliente deixam de viver em colunas de `request_surveys` que
se reescrevem e passam a pendurar-se na tentativa, que se empilha e nunca se reescreve. A tentativa
nova começa em branco e não herda nada. **Quem perdeu uma vaga não volta a concorrer a ela**; noutra
concorre como qualquer outro.

**A redistribuição** reabre a oportunidade aos restantes elegíveis, com alertas escalonados pelo
ranking — não uma fila nominal. A parte do escalonamento espera pelo ranking existir; a exclusão de
quem acabou de perder já está feita.

**A ordem das três opções no aviso ao cliente:** primeiro «agendado dentro das 48 horas», depois
«combinámos data posterior», e **«não fui contactado» em último**. Nenhuma pré-selecionada, e a
última exige confirmação explícita antes de enviar: quem acusa alguém de não ter ligado tem de o
fazer de propósito, não por ser o caminho mais curto para fechar o aviso.

**Os dados do cliente** explicam-se a ele **antes** de lhe pedir a visita, e ficam visíveis apenas ao
avaliador com reserva válida **e** confidencialidade aceite. As duas condições, não uma.

*Nota de implementação:* o relógio das horas úteis existe em dois lugares — `src/domain/horasUteis.ts`
e `private.somar_minutos_uteis` — porque a reserva é atómica na base de dados e a interface precisa de
prever prazos antes de alguém aceitar. `supabase/tests/relogioUtil.test.ts` corre os dois sobre uma
semana inteira e sobre as duas mudanças de hora de 2026, e compara ao milissegundo. Duas
implementações da mesma regra só valem com essa prova.

## 30/10/2026 — A preparação do pedido, e o prédio como modelo

**As secções estavam escritas mas nunca montadas.** A 30/10/2026 ficou exigido que «os separadores
troquem o conteúdo visível, não apenas saltem para pontos de uma página interminável». O componente
foi escrito para isso e a página nunca o usou: ficou importado e a desenhar tudo seguido como antes.
Está montado. Fica a nota porque o erro não foi de desenho — foi dar por cumprida uma exigência sem
a ver a funcionar, e é o tipo de erro que se repete se não ficar escrito.

**Galeria de fotografias, com fila de envio.** Várias imagens de uma vez, o estado de cada ficheiro,
e um «Tentar de novo» por ficheiro que falhe. **Sem barra de progresso, por decisão:** um envio por
*server action* não devolve bytes transferidos e uma barra que anda sozinha é uma mentira animada.
Diz-se a posição na fila — «a enviar a 3.ª de 7» —, que é verdade.

**Fotografias por zona.** Coluna `zona_id` em `request_photos`. Quem gere o pedido **e o vendedor do
levantamento** podem corrigir a legenda e a zona enquanto o pedido é rascunho; quem revê, não. Essa
separação está no gatilho e não na política, porque a política nova deixa o cliente escrever na
linha — e o cliente não se aprova a si mesmo.

**A geometria do prédio separou-se das superfícies de intervenção.** Um muro que *existe* e um muro
que *vai ser pintado* são afirmações diferentes, e o desenho precisa da primeira. As medidas —
frente, fundo, pé-direito — passaram a viver no prédio (`buildings`), e o volume deixou de ter
proporções canónicas: tem as do prédio, e muda enquanto se escreve.

**Regra, e é a que manda em `src/domain/geometria.ts`: não se infere geometria a partir de áreas.**
Dividir a área de uma fachada por uma altura qualquer e anunciar a frente dá um número com cara de
medida e um palpite lá dentro. Um campo em branco diz «Por medir» e o eixo fica sem cota. Sem
pé-direito não se arbitra o corrente; sem pisos não se arbitra nada.

**Âmbito do volume com medidas:** é para os ecrãs do cliente e do levantamento, onde o prédio é de
quem está a olhar. O anúncio continua a mostrar o volume genérico, sem medidas — a regra 6 não muda.

**O logótipo da empresa de pintura**, que fechava a correcção de 29/10/2026 sobre o cabeçalho do
orçamento. O cofre `logotipos` é **público**, ao contrário de todos os outros desta base, e por duas
razões: um PDF guardado hoje e aberto daqui a um ano não pode ficar com um buraco no cabeçalho
quando o link assinado expirar, e o logótipo de uma empresa é a coisa que ela mais quer que se veja.
O anonimato defende-se onde sempre se defendeu — no que o documento mostra antes da apresentação.

**`AreaCm2` não são centímetros quadrados**, são centésimos de m². O nome fica por compatibilidade
com a coluna `area_cm2`, mas o comentário passou a ser de documentação, visível ao passar o rato:
escrever 899000 à espera de 89,9 m² dá 8 990 m², e foi o que aconteceu a preparar os ecrãs de ensaio.

**Auditoria às funções `security definer`.** O analisador do Supabase avisa que as 43 funções
`security definer` de `public` são chamáveis por qualquer utilizador autenticado, por
`/rest/v1/rpc/<nome>`. É verdade e não é defeito: o que as torna seguras é verificarem quem as
chamou lá dentro, que é a alternativa que a própria documentação aponta a revogar o `execute`.
Passei pelas 43 — as 32 que escrevem têm todas verificação, e a única sem ela (`acc_post`) está
revogada a `authenticated` e só corre pelo serviço. Não há buraco. Fica um teste
(`supabase/tests/securityDefiner.test.ts`) para a próxima não poder nascer sem verificação; o teste
lê texto e di-lo, por isso apanha a ausência de verificação, não a verificação mal feita.

**Continuam em aberto dois avisos da base**, ambos conhecidos e ambos inofensivos como estão:
`moloni_token` e `toques` têm RLS ligado e nenhuma política — ou seja, ninguém lhes toca a não ser o
serviço, que é exactamente o que se quer; e a protecção contra palavras-passe conhecidas
(HaveIBeenPwned) está desligada nas opções do Auth, que é um interruptor do painel e não do código.

## 29/10/2026 — Comparador: passos 1 a 3 feitos

**Passo 1 — mostrar o que já estava guardado.** As demãos e o produto vivem em cada linha desde que
o orçamento guiado existe e só apareciam dentro da proposta aberta. Na comparação, que é onde
decidem, não apareciam. Cinco estados explícitos, com «não indicado» distinto de «excluído», e a
cobertura dita por extenso em vez de em percentagem.

**Passo 2 — três leituras, e a ordenação que importa.** Cobertura, definição do orçamento e
correspondência técnica, cada uma em palavras. Por omissão, as propostas que incluem tudo **e** têm
preço firme vêm primeiro, por total a pagar; as outras num segundo grupo, com as pendências à
vista. No ensaio, a mais cara (18.450 €) fica à frente da mais barata (13.980 €), porque a barata
não indica três dos quatro trabalhos — **omitir trabalho deixa de pagar**, que é o incentivo que
este mercado precisa de ter. O número grande do cartão passou a ser o total com IVA: era o preço sem
IVA, que nenhum condomínio paga.

**Passo 3 — a reconciliação.** A invariante que a torna defensável numa assembleia: **as parcelas
com euros, mais a diferença não decomposta, dão exactamente a diferença de preço**. Está fixada em
teste, incluindo num caso com âmbito, quantidade, execução e condições ao mesmo tempo.

Decisões que tive de tomar para a cascata se implementar:

- **A ordem é fixa** — âmbito, quantidade, execução, condições, preço, não decomposta — e as
  parcelas aparecem nessa ordem no ecrã, não na ordem do cálculo. Sem ordem fixa, o mesmo euro é
  reclamado por duas causas conforme por onde se começa.
- **A repartição quantidade/preço segue uma convenção escrita:** `T(b) − T(a) = (Q(b) − Q(a))·P(a) +
  Q(b)·(P(b) − P(a))`, com a quantidade medida ao preço da proposta à esquerda. Não é a única
  repartição possível; é a que está escrita, e por isso auditável.
- **Execução diferente não leva euros atribuídos.** Separar quanto da diferença de preço unitário é
  a demão a mais exigiria saber o custo do pintor. Descreve-se, e os euros desse trabalho vão para a
  não decomposta. É a correcção do promotor aplicada onde ela tem consequência real.
- **Acessos e licenças:** só uma a incluir é âmbito; as duas a incluir com valores diferentes é
  condição de obra — tipicamente o período de andaime.
- **Preço global numa das duas:** não se decompõe nada, e diz-se. Nunca se inventa uma repartição
  proporcional.

Um teste verifica que a palavra **margem** não aparece em lado nenhum do texto gerado.

**No telemóvel**, duas propostas de cada vez em cinco blocos; a tabela de catorze linhas arrastava-se
para o lado e perdia-se a linha e a coluna ao mesmo tempo.

**Falta** o passo 4: esclarecimentos ligados às mensagens, versões da proposta, e o relatório para a
assembleia — no ecrã e impresso.

## 29/10/2026 (2) — Comparador, passo 4: perguntas, versões e o relatório para a assembleia

**O relatório** vive em `/app/pedidos/[id]/propostas/relatorio`, na folha A4 do projecto: lê-se no
ecrã, num tablet, e imprime-se. Cinco secções — resumo, diferenças, trabalho a trabalho,
pressupostos e a decisão.

Três decisões de desenho:

- **A referência das comparações é a primeira da ordenação por omissão**, e cada proposta é
  comparada com ela. Todos os pares dariam N×(N−1)/2 contas e nenhuma leitura; comparar com a
  referência responde à pergunta que a assembleia faz — *porque é que não se escolheu aquela*.
- **A secção dos pressupostos não é um rodapé.** Diz a versão de cada proposta e do pedido, a data
  de submissão, a origem das áreas, a convenção usada na repartição quantidade/preço, e que
  comissões e promoções não alteram a ordenação. Quem ler daqui a seis meses tem de poder verificar
  sobre que propostas é que a análise foi feita.
- **A decisão fica separada da análise.** O motivo da escolha é do cliente, escrito por ele, numa
  secção com o nome de quem o escreveu. É a diferença entre um relatório que ajuda a decidir e um
  que parece ter decidido. Precisa da migração `motivo_da_escolha` (escrita, por aplicar).

**As perguntas passam a ter destinatário.** Uma divergência de medição pergunta-se **aos dois** —
com duas propostas não há forma de saber qual mediu outra coisa, e perguntar só a um é tratá-lo
como suspeito. O texto vai na primeira pessoa e nunca diz que houve erro: pergunta pelo critério,
que é o que realmente varia.

**Corrigido ao ver o relatório impresso:** a frase das diferenças técnicas dizia "A 2 demãos com
CIN; B 2 demãos com Robbialac" quando as demãos eram iguais — obrigava o leitor a procurar a
diferença dentro da frase que devia apontá-la. Passa a nomear só o que difere.

## 28/10/2026 (noite, 5) — Comparador de propostas: o esquema, revisto pelo promotor

Esquema completo no documento **Comparador de propostas — esquema** (Claude Docs). O essencial, e as
correcções do promotor ao meu primeiro desenho, porque três delas eram erros a sério:

- **"Margem" passa a "diferença não decomposta".** Chamar margem ao que sobra era uma acusação
  disfarçada de aritmética: pode ser produtividade, equipamento, transporte, estrutura ou risco.
- **"Alguém mediu mal" passa a "divergência de medição".** Áreas diferentes podem ser critério —
  vãos descontados ou não, superfície desenvolvida, varandas à parte — e não erro.
- **A base comum não pode ser a referência.** É a intersecção de todas as propostas: uma proposta
  muito incompleta encolhe-a até à insignificância, e quem omitisse trabalho ganhava poder sobre a
  comparação dos outros. A referência passa a ser a **grelha do pedido** (zona → superfície →
  trabalho → quantidade → requisito); a base comum fica como leitura complementar e **não se mostra
  quando cobre pouco do pedido**.
- **Cinco causas, não quatro:** âmbito, quantidade, execução e materiais, **condições comerciais e
  de obra**, preço. Andaimes em falta são âmbito; andaimes nas duas com períodos diferentes são
  condições. Cada diferença conta uma só vez — e acrescentei a **cascata fixa** que torna isso
  determinístico, senão o mesmo euro é reclamado por duas causas conforme a ordem do cálculo.
- **Mais demãos não é melhor; tinta mais cara por litro não é melhor.** A segunda já estava escrita
  na nota do catálogo deste projecto e eu tinha-me afastado dela.
- **Cobertura não é percentagem.** Dez em doze não diz nada se os dois que faltam forem a
  impermeabilização. Enumera-se.
- **"Não indicado" não é exclusão:** é pergunta. Estados distintos, acções distintas.
- **Cenários usam primeiro o preço opcional do próprio pintor**, e só depois a referência observada
  nas outras propostas — que se diz ser isso, e nunca preço de mercado.

**Sem pontuação única** (confirmado pelo promotor): três classificações separadas — cobertura,
definição do orçamento, correspondência técnica — e ordenação por critério explícito. A estrutura de
dados admite uma pontuação mais tarde sem depender dela agora.

**Regra nova, proposta para a regra 18 do CLAUDE.md:** comissões da plataforma, promoções e relações
comerciais **nunca alteram a ordenação das propostas**. Mesma família da regra 15 — o dinheiro da
plataforma não entra na decisão do cliente, nem à vista nem escondido.

**Decidido a 29/10/2026 pelo promotor, e contra a minha proposta:** exige-se **âmbito, quantidade e
execução suficientemente equivalentes, materiais incluídos**. Eu defendia âmbito e quantidade, com o
argumento de que exigir execução faz a parcela de preço desaparecer em quase todas as linhas —
demãos e produtos diferem quase sempre. A resposta dele foi a certa: «a definição de directamente
comparável é mais importante para a validade das conclusões». Uma parcela que aparece muitas vezes
e está errada é pior do que uma que aparece poucas vezes e está certa.

**O que isto mudou em concreto.** Demãos ou produtos diferentes já tiravam a parcela de **preço**,
mas deixavam ficar a de **quantidade** — e essa valoriza os metros a mais ao preço unitário de quem
serve de referência, que traz lá dentro a execução dela. Aplicar o preço de quem dá duas demãos aos
metros de quem dá uma é comparar coisas diferentes e apresentar o resultado em euros. Agora, sem
execução equivalente, o trabalho inteiro fica por decompor.

**E a diferença não desaparece: muda de forma.** Passa a dizer-se por palavras, com as quantidades
e as demãos das duas propostas — antes a quantidade só aparecia se tivesse parcela em euros, e sem
ela o cliente ficava sem saber que um pinta 240 m² e o outro 310. É a segunda metade da instrução
do promotor: «mostrar a diferença sem a apresentar como comparação directa de preço».

A regra vive em `equivalenciaDeTrabalhos` (`src/domain/comparador.ts`), num sítio só, com os motivos
nomeados — âmbito, unidade, quantidade, demãos, produtos — e testada em `comparador.test.ts`. Por
trabalho, a proposta declara hoje quantidade, unidade, demãos e produtos: são esses os «materiais e
condições relevantes». Acessos, licenças e taxas comparam-se à parte, por serem da obra inteira.

## 28/10/2026 (noite, 4) — Meteorologia no cronograma: um veredicto, não um quadro de números

**Porquê o Open-Meteo e não o IPMA.** O pedido era temperatura, chuva e **humidade relativa**. O
IPMA seria o primeiro a considerar — é o nacional — mas a previsão diária que publica traz
temperatura, vento e probabilidade de chuva, **e não traz humidade**; e vem por concelho, não por
coordenadas. Sem a humidade, metade da decisão de pintar no exterior ficava de fora. O Open-Meteo dá
as três por coordenadas, sem chave nem registo — menos um segredo para gerir e menos uma conta para
expirar sem ninguém dar por isso.

**O que se mostra não são os números.** O pintor já tem meteorologia no telemóvel; o que não tem é a
leitura dela contra as regras de aplicação da tinta. Por isso cada dia traz um veredicto — *dá para
pintar / com cuidado / não dá* — **sempre com a razão à frente**, e os números mais pequenos por
baixo, para confirmar. Os limiares são os que as fichas técnicas das tintas de exterior repetem, e o
ecrã diz que a ficha do produto manda sempre.

Uma regra que não é óbvia: **o frio conta pela temperatura mínima, não pela máxima.** Uma demão
aplicada às três da tarde ainda está a curar às seis da manhã seguinte, e é aí que o filme se perde.

**Onde fica a obra.** O código postal vem do texto do local, onde o pintor já o escreve, ou do
prédio do contrato quando a obra veio da plataforma. As coordenadas vêm do geoapi.pt, o mesmo
serviço que já preenche as moradas: não se acrescentou fornecedor nenhum para isto.

**E um extra nunca derruba o ecrã.** Sem código postal, sem rede ou sem resposta em três segundos e
meio, o cronograma é o mesmo menos esta secção. É a lição do 404 desta manhã, aplicada de propósito.

## 28/10/2026 (noite, 3) — As tranches saem do contrato

O plano de pagamentos é escrito uma vez, na proposta: um adiantamento e as fases, a somar 100%.
Quando essa proposta é escolhida e assinada deixa de ser uma intenção — passa a ser o que o cliente
deve e quando o deve. Obrigar o pintor a copiá-lo à mão para as tranches é pedir-lhe que volte a
decidir o que já está decidido, e é aí que entram os enganos.

Três decisões:

- **Não se cria sozinho.** O cartão mostra o plano inteiro — descrições, valores e datas — e espera
  por um toque. O que ali se cria é o que o cliente vai ser lembrado de pagar, em nome do pintor;
  um toque é pouco preço para isso.
- **Só quando não há tranches nenhumas.** Acrescentar por cima de um plano que o pintor já montou à
  mão seria duplicar-lhe a cobrança, por isso nem se oferece.
- **Os cêntimos perdidos vão à última.** Quatro fases de 25% sobre um total ímpar perdem cêntimos no
  arredondamento. A última leva o resto, para a soma das tranches ser exactamente o contrato — de
  outro modo ficava sempre uma dívida de cêntimos por explicar.

As datas repartem-se pelo período previsto da obra: a primeira no início, a última no fim, as do
meio por igual. **Sem início e fim conhecidos ficam por datar**, e diz-se porquê: uma data inventada
faria a cobrança automática escrever ao cliente no dia errado.

## 28/10/2026 (noite, 2) — O catálogo a sugerir no diário, e uma falha na procura de toda a aplicação

**O campo "Produto aplicado" do diário** era texto livre com um exemplo lá dentro. Quem o preenche
está numa obra, de telemóvel, e escreve o que se lembra — "vinil branco", "a tinta da CIN". Três
meses depois nem o relatório de entrega nem a comparação de preços sabem o que foi aplicado.

A decisão que importa: **o que se sugere primeiro não vem do catálogo, vem da obra.** Os produtos
que o orçamento desta obra já previu aparecem **antes de se escrever uma letra** — são a resposta
certa quase sempre, e um toque resolve. O catálogo entra a partir de duas letras, para a lista não
saltar à frente de quem ainda está a pensar.

O que fica escrito é o nome canónico ("Barbot Acryl Plus VG (1279)"), não um código. Continua a ser
texto livre — quem aplicou algo fora do catálogo escreve-o à mesma — mas passa a ser o mesmo texto
de obra para obra, que é exactamente o que `usedProducts` (src/lib/reference.ts) já precisa para
reconhecer o produto mais tarde. **Sem coluna nova, sem migração.**

**A falha que apareceu ao testar.** Escrever "vinil" — como se escreve em português — não encontrava
"Vinylmatt". Não é prefixo exacto (y contra i) e, medidas por inteiro, as duas palavras estão a
quatro trocas de distância. Isto não era do diário: era de `wordMatches` (src/domain/search.ts), que
serve **a procura de todo o catálogo da aplicação** desde que foi feita.

Passou a comparar-se também com o princípio da palavra, do mesmo comprimento: aí "vinil" e "vinylmatt"
estão a uma só troca. Até três letras a tolerância continua a ser zero, por isso um termo curto ainda
tem de ser prefixo exacto — de outro modo "mur" encontrava meio catálogo.

## 28/10/2026 (noite) — Procurar nos orçamentos, e o beco do contacto do cliente

**A procura.** Pedida "por localização, nome do cliente, NIPC ou ano, auxiliando com a pesquisa pela
base de dados quando já existente". Três decisões:

- **A caixa aparece sempre**, com lista vazia ou não (foi pedido explicitamente). Quem só descobre a
  procura quando já não encontra nada aprendeu a desistir antes disso.
- **Procura sobre tudo**, não sobre o separador aberto. Quem escreve o nome de um cliente quer
  encontrá-lo, não quer lembrar-se primeiro de onde é que ele estava arrumado.
- **As sugestões saem do que já lá está** — as localidades e os clientes que existem mesmo nos
  orçamentos desta empresa, numa lista nativa do navegador. É isto que "auxiliar pela base de dados"
  quer dizer: nunca se sugere um termo que não dê resultados. O NIPC fica de fora das sugestões de
  propósito: ninguém escolhe um NIPC numa lista, escreve-o.

Cada palavra do termo pode estar numa parte diferente do orçamento — "viana condominio" encontra o
condomínio de Viana sem obrigar a saber como é que as coisas foram guardadas. Sem acentos e sem
maiúsculas. Um termo só de números compara-se também ao NIPC e ao número do orçamento pelos dígitos,
porque é assim que as pessoas os escrevem e os copiam.

**O beco que apareceu a caminho.** O NIPC não existia no orçamento do pintor — só no documento
fiscal, escrito à mão na hora de faturar. E, ao procurá-lo, deu-se com coisa pior: `cliente_contacto`
decide se a plataforma pode perguntar ao cliente se o orçamento foi visto, e **não havia um único
ecrã que o escrevesse**. O orçamento dizia "o contacto do cliente está por preencher" e não dava
onde. O seguimento estava inalcançável para todos os orçamentos, desde que foi feito.

Daí "Dados do cliente" na página do orçamento: nome, NIPC, email, local e título, corrigíveis depois
de criado. Abre sozinho quando falta o email e o orçamento já saiu — que é quando o seguimento está
à espera dele.

**Um separador vazio passa a dizer porquê.** "Enviados" sem nada lá dentro não mostrava linha
nenhuma. Agora diz o que aquele separador é e o que lá vai parar.

## 28/10/2026 (fim do dia) — O pedido do cliente: vários tipos, datas com margem, catálogo numa janela

**O 404 em todos os pedidos, e a regra que daí sai.** A página do pedido passou a pedir quatro
colunas (`janelas_*`) que a migração ainda não tinha criado na base real. O PostgREST recusa a
consulta inteira quando uma coluna não existe: `building` vinha nulo, a página chamava `notFound()`
e **todos os pedidos davam "Não encontrado"**, incluindo o que o cliente acabava de criar. A causa
não foi a migração estar por aplicar — isso é normal — foi o código assumir que já estava.

> **Regra:** o código chega à produção antes da migração; são dois lançamentos e nenhum espera pelo
> outro. Uma coluna recém-nascida lê-se **numa consulta à parte**, cujo fracasso custa só o valor
> por omissão. Numa gravação, o que é novo vai num objecto à parte e, se a base ainda não o conhece
> (`42703`), grava-se o essencial na mesma — perder o que a pessoa escreveu é pior do que gravar
> menos detalhe.

**Uma obra pode ser de mais do que um tipo.** O pedido escolhia um tipo numa lista pendente, e uma
empreitada que pinta a fachada e as escadas cabia num ou noutro, nunca nos dois. Passa a haver
`tipos_obra`, e `tipo_obra` fica a ser o **principal** — o que o título do anúncio mostra, o que
filtra as oportunidades e o que vai nos documentos —, definido como o primeiro da lista pela ordem
do enum. Essa ligação vive **num gatilho**, não só na aplicação: o mesmo conjunto dá sempre o mesmo
principal, venha do formulário, de SQL à mão ou de uma gravação feita antes da migração.

**Datas com margem.** Uma data de execução sem margem é uma condição; com margem é um desejo, e o
pintor precisa de saber a diferença antes de orçamentar. Cada uma das três datas tem agora a sua
caixa. O prazo das propostas continua a ser o único que a plataforma faz cumprir: marcá-lo não o
move, diz ao pintor que o cliente aceita prolongá-lo a pedido.

**O catálogo sai do formulário.** Os 263 produtos de referência estavam todos em caixas de selecção
no meio do pedido, sem procura e sem preço. Passam para uma janela com a mesma lista que o pintor vê
no catálogo — fotografia, tipo, acabamento, embalagem e preço — e com a mesma procura tolerante a
gíria e a erros. O preço é o de referência do fabricante, venda ao público: descontos de fornecedor
são do pintor e não aparecem de nenhuma forma do lado do cliente (regra 15).

## 28/10/2026 (tarde) — Quem assina os toques, e o que a lei diz sobre escrever a entidades públicas

**A frase dos toques.** A regra de 26/10 manda que cada mensagem diga que é o assistente de IA do
pintor, com o consentimento dele, pela quempinta.pt — e o que o cliente recebe sempre disse isso,
correctamente. O que estava errado eram os **dois ecrãs que descrevem o mecanismo ao pintor**:
diziam "escritas pelo assistente de IA **da sua empresa**", que não é o que sai nem é verdade (a
plataforma é que corre o assistente). Passaram a descrever o texto verdadeiro. Não se mudou a
mensagem; corrigiu-se a descrição dela.

**A investigação jurídica sobre convites de entidades públicas** (28/10/2026) corrige três coisas
que estavam assumidas:

- **A escolha de quem se convida é livre, por lei** (CCP, art. 112.º: «convida directamente à sua
  escolha»), e **"manifestação de interesse" não existe no CCP** — zero ocorrências. O artigo
  público promete "preparar a manifestação de interesse" como se fosse figura do processo; **tem
  de ser reescrito**.
- **Existe um registo legal e é a melhor via:** o Portal Nacional de Fornecedores do Estado
  (DL 72/2018), do IMPIC, gratuito, cujo art. 10.º, n.º 3 diz que a informação **pode ser usada
  para escolher quem convidar** em ajuste directo e consulta prévia. É um formulário, não uma
  campanha.
- **A rotação forçada enfraqueceu no pior momento.** O tecto trienal por fornecedor do art. 113.º,
  n.º 2 é definido por remissão para os limiares do procedimento, e o DL 177/2026 (em vigor desde
  1/10/2026) multiplicou-os: em empreitadas, 30 000 € → 150 000 € no ajuste directo e
  150 000 € → 1 000 000 € na consulta prévia. Fica **retirada** a ideia de usar esse tecto como
  sinal de temporização.

**Sobre email não solicitado:** o art. 22.º do DL 7/2004 está revogado; vale a Lei 41/2004,
arts. 13.º-A e 13.º-B. Pessoas colectivas são opt-out — escrever para `geral@cm-x.pt` é permitido
até à recusa, com natureza publicitária ostensiva, anunciante identificado e meio de cessar desde
a primeira mensagem, e com obrigação de consultar a lista de oposição da DGC (não é pública: pede-se).
A lei agarra quem **promove** o envio, não só quem envia, e proíbe dissimular em nome de quem se
comunica — pelo que **o pintor envia da sua conta e a plataforma escreve**, que é o que o artigo
público já dizia.

**Por verificar:** o DL 177/2026 criou a consulta prévia especial (arts. 127.º-A a 127.º-C) e uma
circular da APCMC afirma que as regras de rotação de convidados estão no **art. 127.º-C**, cujo
texto não foi possível abrir. Se há regra legal de rotação em Portugal, é ali — DR n.º 172/2026,
Série I, de 4/09/2026.

## 28/10/2026 — A crítica de design, aplicada

Revisão de frontend da app inteira (rotas públicas num navegador real; os ecrãs autenticados num
banco de ensaio que renderiza os componentes verdadeiros, porque não há credenciais na máquina de
desenvolvimento). O que saiu daí está aplicado em cinco commits; o que fica por decidir está em
baixo.

**O diagnóstico de fundo:** o `globals.css` tem três sistemas de cor. A app usa `tinta-*`/`slate-*`
em 177 ficheiros, `marca-*` em 9 — e esses 9 são quase todos a **casca** (layout, navegação, menu,
marca, página de subscrição). Quem usa a app vê uma navegação creme e tinta à volta de conteúdo
verde-petróleo: não são duas estéticas em conflito, é **uma migração parada a meio**. Dos oito
tokens funcionais acrescentados a 26/10, sete não são usados nenhuma vez.

**Isto continua por decidir, e é do promotor:** terminar a migração para `marca-*` ou revertê-la.
Enquanto não for decidida, cada ecrã novo escolhe sozinho e o fosso alarga. Os sete tokens mortos
saem ou passam a valer na mesma decisão.

**O que ficou feito:** regra 17 do `CLAUDE.md` (botões, campos e cantos vêm do sistema, 44px de
alvo mínimo); o dossiê do pintor deixa de sair a uma palavra por linha no telemóvel; a barra de
separadores do pedido passa de quatro linguagens visuais a uma; os totais da proposta ganham
hierarquia e a tabela deixa de obrigar a arrastar de lado; o `.eyebrow` deixa de ser maiúsculas
espaçadas em 53 sítios; 69 setas de texto passam a ícones; as páginas públicas ganham a casca da
página inicial e um só estilo de ligação; e a regra 13 passa a ser cumprida onde era violada.

**O que fica anotado, e porquê:** a folha A4 do `ProposalDocument` não cabe num telemóvel — 210mm
são 793px, e encolher para 390px poria o corpo do documento a 5px. O arrasto passou a ser dentro do
documento em vez de empurrar a página, mas **uma vista de leitura própria para telemóvel é trabalho
à parte** e ainda não está feita. Também fica por fazer a legenda do âmbito sobre a ilustração da
página inicial, pela razão escrita na entrada de 27/10.

## 27/10/2026 (noite) — O âmbito da obra sai do primeiro ecrã

Três tentativas de dizer na página inicial **que obras se orçamentam aqui**, duas rejeitadas pelo
promotor: primeiro a linha `FACHADAS · CONDOMÍNIOS · ZONAS COMUNS` (maiúsculas espaçadas, partia ao
meio no telemóvel), depois a mesma informação enfiada na frase por baixo do título. A terceira não é
outra forma da mesma coisa — é tirá-la dali.

**A razão é de conteúdo, não de formatação:** o título já diz "a pintura do seu prédio", e fachadas e
zonas comuns são o que um prédio tem. Repetir isso em letra menor logo abaixo lê-se como enchimento,
e é esse o som de "não está bem".

O espaço libertado passa a dizer o que **só esta plataforma faz** — as propostas chegam todas no fim
do prazo e no mesmo formato — que é também o argumento que um administrador tem de poder defender
numa assembleia. O âmbito desce para a secção **"Que obras se orçamentam aqui"**, em prosa, logo a
seguir ao primeiro ecrã: ali é resposta a quem pergunta "fazem o que eu preciso?", e não anúncio por
cima do título. As palavras de pesquisa ("fachadas", "muros", "garagens") ficam num `h2` verdadeiro,
que vale mais do que uma etiqueta decorativa.

**No mesmo passo:** o prédio deixa de ter uma faixa vazia de ~100px por baixo (o texto estava centrado
na linha flexível da grelha; passou a encostar), e a secção dos condomínios perdeu a mesma linha de
maiúsculas espaçadas que foi rejeitada no primeiro ecrã.

**Ficou por fazer, deliberadamente:** anotar o âmbito sobre o próprio desenho ("fachada", "escadas e
hall", "muro", ligadas por um fio ao sítio exacto). É a melhor ideia das que saíram da consulta de
design, mas a ilustração é um `.webp` e não um SVG com grupos nomeados — as anotações teriam de ser
colocadas a olho por cima de uma imagem que, no telemóvel, ocupa ~165px de largura, onde 13px de texto
tem a altura de um piso. Em ecrã largo funcionaria. Fica para quando a ilustração for vectorial.

## 27/10/2026 (fim do dia) — A facturação deixa de esperar que alguém se lembre

A fila de facturação existe desde 22/10 e funciona. O que não existia era alguém a dar por ela:
**zero documentos emitidos desde sempre**, e a fila enche-se sozinha a cada comissão recebida, a cada
subscrição paga, a cada caução retida. Sem dinheiro verdadeiro isso não custava nada; com dinheiro
verdadeiro é incumprimento fiscal a acumular em silêncio.

A tarefa diária passa a olhar para a fila e a avisar a equipa da plataforma (`platform_admins`) —
**só quando há fila**. Um email diário garantido a dizer "zero" ensina a apagá-lo sem abrir, e no dia
em que disser "três fora de prazo" já ninguém o lê. O assunto sobe de tom: *tantos por emitir* →
*tantos para emitir hoje* → *tantos fora de prazo*.

**O prazo assumido** está num só sítio, `src/domain/faturacao.ts`: o 5.º dia útil seguinte ao facto
tributável, a regra geral portuguesa. Está escrito lá para o contabilista do promotor poder confirmar
ou corrigir um número em vez de o procurar espalhado pelo código — **a plataforma não decide matéria
fiscal**, avisa a horas.

A contagem de dias úteis exclui sábados e domingos e **não conhece feriados**, de propósito: uma
tabela de feriados por actualizar dá um prazo errado com ar de certo. Contar a menos avisa mais cedo
do que o necessário, nunca mais tarde — é o erro seguro.

**O que ficou de fora, e porquê:** a emissão continua manual, com um clique no backoffice. Emitir uma
factura é irreversível — desfaz-se com nota de crédito, que fica no histórico fiscal — e automatizar
isso antes de a fila ter corrido limpa algumas semanas seria trocar um problema por outro pior.
Primeiro ver, depois decidir.

## 27/10/2026 — As duas ferramentas do Pro, e a máquina que as faz acontecer

Decisões do promotor de 26/10, construídas e aplicadas a 27/10. O Pro vendia quatro coisas e só uma
aguentava uma mensalidade (a comissão 5 pontos abaixo); as outras três esperavam que o pintor se
lembrasse de abrir a aplicação. Acrescentam-se duas que trabalham sozinhas e mexem em dinheiro.

**As regras que o promotor fixou**, e que atravessam as duas: a plataforma pode escrever ao cliente
em nome do pintor, mas **até à adjudicação não se identifica nenhuma parte**; no máximo **três
toques**, sempre educados, **sem juros nem ameaças**; e cada mensagem diz que é o **assistente de IA
do pintor, com o consentimento dele, pela quempinta.pt**. "Ver é grátis; a plataforma perguntar por
si é do Pro."

**A máquina** (`src/domain/toques.ts`, tabela `toques`, `/api/cron/toques` às 8h). A chave única
(tipo, alvo, destinatário) é a garantia de não repetir — não a memória da tarefa, que pode correr
duas vezes. Dois cuidados que valem mais do que parecem: os textos levam **datas por extenso**, nunca
"hoje" ou "amanhã" (um aviso atrasado um dia continua verdadeiro com data e passa a mentira com
"amanhã"), e cada toque tem **dois dias para sair**, para sobreviver a uma falha da tarefa.
Regista-se antes de enviar: perder um email é melhor do que repetir um.

**1. Seguimento do orçamento** (`seguimento_do_orcamento`, versão `20261027011755`). Três toques ao
cliente do pintor, ao 3.º, 10.º e 20.º dia depois de enviado; param assim que o orçamento é dado por
ganho ou perdido. Consentimento por orçamento, desligado por omissão. Limitado aos **orçamentos
próprios**, a clientes que já conhecem o pintor pelo nome — por isso não toca na regra do anonimato;
nos pedidos da plataforma o cliente já tem os dois avisos da janela. `ehEmail` trava o resto: o
contacto é um campo livre e só se escreve quando é inequivocamente um email.

**2. Cobrança** (`cobranca`, versão `20261027144544`). Por cada tranche que passe da data prevista:
três lembretes ao cliente (no dia, aos 8 e aos 20) e, aos 30, uma palavra ao **pintor** — a partir
daí mais mensagens só gastam a relação de que ele vai precisar quando telefonar. Esse último sai
mesmo sem email do cliente. Todas levam valor e data: um lembrete sem o número obriga a ir procurar a
factura, e quem tem de procurar adia. A plataforma continua a não guardar dinheiro: isto **lembra**,
não cobra.

**3. O email de segunda-feira** (`src/domain/semana.ts`). O que está na rua e há quanto tempo, o que
vence nos próximos sete dias, os orçamentos sem resposta e os papéis a caducar. **Sem matéria não se
envia nada** — um email semanal garantido é publicidade, e a publicidade semanal ensina a apagar sem
abrir. A única linha que vende aparece a quem não tem Pro e só quando houve trabalho que as
ferramentas teriam feito.

**Avisos do Supabase depois de tudo aplicado:** a tabela `toques` entra na lista de RLS ligado sem
políticas, ao lado de `moloni_token`, e é de propósito — ninguém lhe chega pela API, e o que interessa
ao pintor chega-lhe por email. As funções `SECURITY DEFINER` mantêm-se em 38.

**Corrigido no mesmo dia:** escrevi aqui que faltavam o ecrã do pintor para avaliar a informação do
levantamento e o ecrã do avaliador para ver a sua percentagem. **Não faltam** — existem desde 24/10
(`SurveyInfoCard.tsx` e `EarningCard.tsx`). A frase veio de uma nota do `ESTADO.md` que tinha ficado
três dias por actualizar. Fica como lembrete de que o ponto de situação só vale se for corrigido no
mesmo dia em que deixa de ser verdade.

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

## 29/10/2026 — a verdade das contas, antes da apresentação delas

Revisão do promotor ao comparador, depois de o passo 4 estar feito. Cinco reparos; dois eram defeitos
reais, dois não se verificaram no código, e um era do relato e não do produto. Fica tudo escrito
porque a distinção entre os cinco é a parte útil.

**1. A conta fechar não prova que a explicação esteja certa.** *Confirmado e corrigido.* A parcela
não decomposta é definida como o resto, por construção: a conta fecha sempre ao cêntimo, e fechar não
demonstra que cada atribuição seja legítima. Pior, as parcelas saíam todas com a mesma forma — o
preço que o pintor **escreveu** para um trabalho que a outra não inclui e o efeito que a plataforma
**calcula** medindo a quantidade ao preço unitário da referência apareciam iguais ao leitor. Atribuir
1.400 € à quantidade é uma simulação segundo uma convenção; se a outra proposta também mudou produto
e demãos, não demonstra que os 70 m² expliquem aquele custo.

Cada parcela passa a ter proveniência (`declarado` ou `calculado`), e a diferença apresenta-se em
quatro blocos identificados: valores escritos nas propostas, efeito calculado, diferenças sem valor
separado, diferença não decomposta. **A convenção vai junto da conta**, onde o cliente a lê, e saiu
dos pressupostos no fim do relatório. Subtileza que ficou em teste: com as quantidades iguais, a
parcela de preço é `T(b) − T(a)` entre dois valores declarados — é `declarado`; com quantidades
diferentes, o que sobra depende de onde se cortou a parcela de quantidade, e é `calculado`.

**2. «Nomeia o produto» não é correspondência técnica.** *Confirmado e corrigido.* A frase media
preenchimento e era lida como conformidade. Passa a verificar também as demãos — que estavam nos
dados e ninguém olhava — e, quando falta algo, diz **«Correspondência técnica por confirmar: …»**.
Mesmo sem reparos a frase descreve o que foi verificado e nunca declara conformidade: a preparação do
suporte, o sistema e o consumo não são declarados e não se podem dar por bons. As demãos só se exigem
aos trabalhos que as levam (`TRABALHOS_COM_DEMAOS`); pedi-las a uma lavagem seria um reparo falso.

**3. Âmbito e preço são perguntas diferentes.** *Acrescentado.* `porEsclarecer` juntava
`condicionado` e `nao_indicado` numa contagem só, e isso escondia qual dos dois riscos se corria. Um
trabalho **condicionado está previsto** — falta o preço fechar depois de observar — e um **não
indicado** é silêncio sobre o próprio trabalho. O condicionado conta nas duas dimensões; o não
indicado só no âmbito.

**4. A referência do relatório mudaria com a ordenação.** *Não se verificava.* O relatório ordena com
a constante `'padrao'` escrita no código e não lê parâmetro nenhum do endereço. Ficou, ainda assim,
**dita no documento**: a referência e a ordenação identificam-se no corpo do relatório, para que duas
cópias impressas saiam iguais e a assembleia não discuta sobre papéis diferentes.

**5. Anonimato antes da escolha.** *Não se verificava.* As propostas aparecem como «Pintor A», «B»,
«C» por uma função própria; o único nome no relatório é o do condomínio. Verificado por ser a regra 6
do CLAUDE.md e o reparo mais grave dos cinco, se fosse verdadeiro.

### A tabela de síntese

Pedida pelo promotor no mesmo dia: uma coluna por proposta, critérios fixos à esquerda e sempre na
mesma ordem, no topo do comparador e como secção 1 do relatório. Três regras, e nenhuma é cosmética:

- **Sem fundo de cor e sem verde.** A regra 13 do CLAUDE.md proíbe fundo colorido em linhas
  repetidas e proíbe cor de aviso como destaque. Trinta células pintadas são uma manta; e pintar de
  verde o que cumpre ensina a ignorar o que falha. Fica o âmbar no texto, só onde há o que resolver.
- **A cor nunca carrega a informação sozinha.** O texto da célula já diz o que se passa («310 m² —
  diverge»), e o motivo por extenso sai debaixo da tabela — não atrás de um toque, que não se imprime.
- **A última linha não elege ninguém.** «O essencial» resume as linhas de cima numa frase por
  proposta. Acima da tabela, uma frase factual diz qual tem o menor total entre as completas e, quando
  é outra, qual tem o menor total de todas e o que lhe falta: ser a mais barata e estar incompleta são
  dois factos, e vêem-se juntos.

Mais demãos ou mais anos de garantia **não** são tratados como melhores: a tabela mostra o que cada
proposta declara. Uma tinta mais cara não é uma tinta melhor, e isso já estava escrito na nota do
catálogo deste projecto.

**O que o render apanhou e a leitura do código não apanharia:** «O essencial» repetia-se na lista de
motivos com a mesma frase genérica debaixo de cada proposta; «lavagem e limpeza, reparação de fissuras
e primário» encadeava três «e» porque o próprio rótulo já traz um; e a 390px via-se **uma** proposta
em vez de duas, porque `min-w-max` dava a cada coluna a largura do seu texto mais longo. A primeira
tentativa de correcção — hifenizar — produziu «Tra-ba-lhos pedi-dos», pior do que o defeito. Medidas as
colunas uma a uma, ficou em 6,5rem para os critérios e 6,875rem por proposta: 324px dentro dos 328
disponíveis, duas propostas inteiras e a terceira a espreitar, que é o próprio convite a deslizar.

**Por decidir:** no papel o total fica a negrito mas não maior, porque a regra 14 avisa contra
substituições de tamanho dentro da folha A4. Se o promotor quiser o preço maior também no impresso,
decide-se o tamanho em pontos de papel, não em pixéis.

### O total no impresso, e o que o PDF revelou (29/10/2026)

Decisão do promotor: na folha A4 o total vai a **14pt negrito**, com a indicação do IVA a **9pt** por
baixo do valor — por baixo e não ao lado, porque ao lado empurrava a coluna e com cinco propostas a
tabela deixava de caber na largura útil. Em **pontos** e não em pixéis, pela mesma razão que o
`doc-label`: a folha é outro meio, e a regra 14 do CLAUDE.md isenta-a da escala do ecrã. As classes
`doc-total` e `doc-total-nota` vivem no `globals.css`, ao lado dela.

**Quantas propostas cabem, medido e não estimado:** a largura útil da folha são 681px; a tabela mede
680px com quatro propostas e **781px com cinco**. Daí `MAXIMO_NO_PAPEL = 4`. Acima disso a comparação
divide-se em quadros, cada um repetindo os critérios e a **proposta de referência** — sem a
referência em todos, os quadros não se comparam entre si. A razão da divisão diz-se uma vez, no
primeiro quadro. O total a 14pt fica numa linha em todos os casos: 162px no mais largo, dentro de
células de 175px.

**Dois defeitos que só o PDF mostrou**, e nenhum deles era visível no ecrã nem na leitura do código:

1. **A primeira página saía quase em branco.** O `globals.css` dá `break-inside: avoid` a qualquer
   `section` dentro da folha, e a síntese inteira saltava para a página seguinte. A secção passa a
   poder partir; o que não parte é cada linha e o bloco de atenções.
2. **A tabela saltava inteira na mesma**, pela regra irmã para `table`, desperdiçando duas páginas.
   Uma tabela de onze critérios tem de partir — **entre linhas, nunca dentro de uma** — e o `thead`
   repete-se sozinho na página seguinte, que é o comportamento certo e sai de graça.

Fica como lembrete: uma folha A4 não se valida no ecrã. Gera-se o PDF e olha-se para as páginas.

### A escala de papel do relatório (29/10/2026)

Pedido do promotor depois de ver o impresso: «o tamanho da letra deve ser menor, sobretudo na
tabela». Tinha razão, e a medição explicou porquê: a folha herdava a escala do **ecrã** — corpo a
15px, que numa A4 são 11,3pt — e a tabela ia atrás. Num documento impresso o corpo anda nos 10pt e um
quadro denso nos 9pt.

A classe `.doc-relatorio` passa a dar a escala em **pontos de papel**: corpo 10pt, tabela 9pt,
títulos 16pt e 12pt. Classe própria, e não uma alteração à `.proposal-sheet`: essa é partilhada com o
orçamento (`ProposalDocument.tsx`), que tem a sua composição e não foi pedido que mudasse.

**Dois efeitos que não eram o pedido e valem mais do que ele:**

1. **O total a 14pt passou a destacar-se.** Com o corpo a 11,3pt, os 14pt eram 2,7pt de diferença —
   quase nada. Contra 9pt da tabela, o preço é agora a primeira coisa que o olho encontra, que é
   exactamente o que a decisão dos 14pt queria e não estava a conseguir.
2. **Quatro propostas cabem numa só página A4**, tabela e notas de atenção incluídas. Antes, três
   propostas gastavam duas páginas.

**O limite das quatro colunas mantém-se, e agora sabe-se porquê.** Medido outra vez depois da
redução: cinco colunas transbordam 55px e seis transbordam 180px. Não é a letra das células que
manda — é o **total a 14pt**, que precisa de 112px só para «15 552,12 €» e impõe uma largura mínima
a cada coluna. É uma consequência querida da decisão do promotor, e por isso o que cede é o número
de colunas por quadro, não o tamanho do preço.

No ecrã a tabela desceu de 15px para **13px**, o último degrau da escala da regra 14 — abaixo disso
não se vai. O total do ecrã desceu de 20px para 17px: sobre células a 13px, 20 era um salto
desproporcionado, e dois degraus chegam.

## 29/10/2026 — transparência da classificação, e as indicações da fase 1

O promotor corrigiu-me num ponto de enquadramento, e a correcção muda a prioridade do trabalho.

**Eu disse** que as obrigações de transparência nasciam quando a plataforma passasse de descrever a
recomendar. **Está errado:** o Regulamento (UE) 2019/1150 usa um conceito **amplo** de classificação,
que abrange a organização das ofertas e os destaques visuais. A app já agrupa e ordena propostas —
logo a obrigação de explicar os principais parâmetros e a razão da sua importância relativa **já se
aplicava**, e não estava cumprida. Do lado do consumidor, o artigo 4.º-A do Decreto-Lei n.º 24/2014
pede a mesma informação numa secção directa e acessível a partir de onde as propostas se comparam.
Nenhum dos dois exige publicar o algoritmo: exigem dizer o que pesa, porquê, e o que prevalece.

**Um defeito presente que isto revelou:** a página pública de Transparência dizia que a ordenação por
omissão era «pelo preço sem IVA». Deixou de ser verdade quando a ordenação passou a agrupar por
cobertura e preço firme — a informação legalmente exigida estava publicada e errada. Corrigida.

### A metodologia, escrita uma vez e lida em quatro sítios

`src/domain/metodologia.ts` guarda os parâmetros por ordem de importância, as regras de cada
indicação, as condições em que não se indica nada, o que não influencia, e as fontes. É a fonte
comum do ecrã, do relatório, da página pública e das condições dos pintores: escrita em quatro
sítios divergiria em semanas.

É **versionada**, e o endereço que o relatório imprime leva a versão — `/metodologia/1.0`, não
`/metodologia`. Um PDF emitido hoje explica-se com as regras que o produziram, e não com as que
estiverem em vigor quando alguém o abrir. Mesma disciplina da regra 3 do CLAUDE.md.

### As indicações: duas, e as duas são factos

«Menor preço apresentado» e «Melhor preço para o pedido completo». Lêem-se directamente do que as
propostas declaram, sem valorizar materiais, tempos ou equipamentos — e por isso não dependem de
referências que ainda não existem calibradas.

**O destaque que combinaria preço e reputação não foi feito**, de propósito: exige um limiar («dentro
de uma faixa de preço próxima da melhor») que não está calibrado com obras reais. Inventá-lo seria
produzir uma recomendação frágil com ar de regra. O histórico mostra-se na matriz e **não ordena nem
atribui nada** — e a metodologia publicada diz isso com todas as letras, em vez de o omitir.

Uma indicação não atribuída **diz porquê**: empate, nenhuma completa, uma proposta só. O silêncio
lê-se como desinteresse ou como falha; a razão escrita lê-se como o que é.

### A matriz, e o limite das quatro colunas resolvido

Ideia do promotor: **uma linha por proposta** escala para dez candidatos, onde a tabela transposta
parava nas quatro colunas por causa do total a 14pt. Muda-se de forma em vez de encolher a letra. As
duas convivem — a matriz dá a vista de todos, a transposta serve a comparação final de duas ou três.
Medido: com seis propostas a matriz ocupa 680px dos 681 úteis, e a primeira página inteira — com
conclusões, matriz, bloco de interpretação e QR — cabe em exactamente uma folha A4.

**Histórico curto não é mau histórico.** Abaixo de três avaliações escreve-se que o histórico ainda é
limitado, e a célula **não** vai a âmbar: um pintor novo não é um pintor pior, e assinalá-lo como
defeito seria uma barreira à entrada criada por nós.

### O defeito que o render apanhou

A linha de uma proposta com um trabalho condicionado dizia **«0 trabalhos em falta»**, a âmbar. A
causa era a confusão que o promotor já me tinha mandado separar: a cobertura vinha de um campo que
exigia todos os trabalhos firmes, enquanto a contagem de faltas só contava omissões. Corrigido na
raiz — o campo paralelo desapareceu, e a cobertura deriva só da contagem de faltas, que é o que a
define. Um trabalho condicionado cobre o pedido; o que lhe falta é o preço fechar, e isso aparece na
coluna ao lado.

### Por fazer, nesta frente

- As condições dos pintores ainda não referem os parâmetros de classificação.
- O ecrã das propostas ainda não diz o critério activo nem liga para a metodologia.
- O motor de valorização por materiais, tempos e equipamentos: por construir, e a publicar
  recomendações que dele dependam só depois de as referências estarem validadas.

### O relatório em quatro partes (29/10/2026)

Estrutura decidida pelo promotor, por níveis de leitura:

1. **Síntese e apreciação Quem Pinta** — conclusões, o que pode ainda alterar a escolha, a matriz de
   todas as propostas, e como interpretar a comparação com o endereço da metodologia.
2. **Comparativo detalhado** — 2.1 diferenças relevantes, 2.2 comparação lado a lado, 2.3 trabalho a
   trabalho.
3. **Explicação económica** — 3.1 diferenças para a referência, 3.2 pressupostos, fontes e versões.
4. **A decisão** — escrita pelo cliente, separada da apreciação da plataforma.

**O comparativo detalhado não é dispensável pelas propostas individuais**, e é essa a razão de
existir: alinha o mesmo trabalho na mesma linha. Sem ele o cliente volta a procurar a informação em
dez documentos e a compará-la de memória.

**Três propostas por quadro, não quatro.** Quatro ainda cabem em largura — 680px dos 681 úteis —, mas
a decisão é por legibilidade: com quatro, as células de texto comprido partem-se em três e quatro
linhas e a grelha deixa de se percorrer com o olho. Com três, as colunas passam de 175px para 189px.
O que continua a impedir de ir acima de quatro não é a letra das células mas o total a 14pt, que
impõe uma largura mínima por coluna — e o que cede é o número de colunas, nunca o tamanho do preço
nem o da letra.

**Duas decisões de apresentação, ambas do promotor:**

- **As diferenças relevantes vêm antes da grelha completa**, e a grelha fica: o que distingue lê-se
  primeiro, mas os critérios em que todas coincidem têm de estar lá, porque é assim que se confirma
  que a cobertura é a mesma. As propostas que dizem o mesmo juntam-se numa cláusula — «A e B: 240 m²
  · C: 310 m² — diverge» — em vez de se repetir o valor por proposta.
- **O que pode alterar a escolha sobe à primeira página**, e só isso: as pendências das propostas que
  receberam indicação. Uma pendência numa proposta que ninguém está a ponderar não altera escolha
  nenhuma e fica no detalhe.

**Por fazer:** a quarta parte que o promotor descreveu — as propostas individuais por extenso, com
documentos discriminados e condições — não está feita. O relatório diz hoje a versão de cada proposta
na secção 3.2, mas não reproduz os documentos.

### O texto que o cliente lê (29/10/2026)

O promotor apanhou uma frase minha — **«o preço não é comparável sem os somar»** — e disse o que ela
era: linguagem de quem construiu a tabela. Quem lê isto é um condómino numa assembleia.

Revistos **todos** os motivos que o cliente lê, não só esse. A régua passou a ser: cada motivo diz o
que acontece a quem escolher aquela proposta, e não o estado de um campo.

| Antes | Depois |
|---|---|
| Trabalhos do pedido que esta proposta não cobre: o preço não é comparável sem os somar. | Estes trabalhos não estão nesta proposta. Se for esta a escolhida, terá de os contratar à parte, e o que pagar por eles acresce a este total. |
| Parte do preço só fecha depois de observar: o total pode subir. | Há trabalhos cujo preço o pintor só fecha depois de ver a obra de perto. O total pode subir, e ainda não se sabe quanto. |
| A proposta nomeia o produto mas não diz quantas demãos aplica. | O pintor diz que tinta usa, mas não quantas camadas aplica. Duas camadas da mesma tinta cobrem melhor e duram mais do que uma. |
| Sem garantia declarada na proposta. | O pintor não indica garantia. Se a pintura falhar, não há prazo escrito dentro do qual ele a refaça. |
| Sem duração declarada não se sabe quanto tempo a obra ocupa o prédio. | O pintor não diz quantos dias demora. Numa fachada, isso é o tempo com andaimes montados e varandas ocupadas. |
| A proposta considera uma área diferente da do levantamento do condomínio (240 m²). | O pintor conta 310 m² onde o pedido diz 240 m². Pode ser outra forma de medir, ou um dos dois estar enganado — vale a pena perguntar antes de decidir. |

**Dois testes impedem a reincidência**, e são mais úteis do que a lista de correcções: nenhum motivo
pode conter as palavras que só nós percebemos (*comparável*, *âmbito*, *parcela*, *índice*,
*valorização*), e cada motivo tem de ser uma frase inteira com mais de 40 caracteres — «Não
indicada» sozinho não explica nada a ninguém. O segundo teste apanhou logo uma frase de 38
caracteres e obrigou a dizer a consequência em vez do facto.

A mesma revisão foi feita à metodologia pública e ao bloco de interpretação do relatório, que
repetiam a mesma construção.

### Não afirmar o que os dados não mostram (29/10/2026)

Segunda revisão do promotor ao texto, e esta corrige a minha correcção anterior: ao fugir do jargão,
passei a afirmar consequências que não posso demonstrar. Quatro correcções, todas da mesma família.

**1. Não indicar não comprova exclusão.** Uma proposta que não refere um trabalho pode tê-lo
esquecido ou dado por implícito. Dizer «estes trabalhos não estão nesta proposta» põe na boca do
pintor o que ele não disse. Os dois estados passam a contar-se **em separado**, na síntese e na
matriz, porque o que o cliente faz a seguir é diferente: num caso pergunta, no outro contrata a
outra pessoa.

| Estado | Célula | O que se diz |
|---|---|---|
| `nao_indicado` | «3 por esclarecer» | Não esclarece se inclui. Pergunte se os faz e por que preço. |
| `excluido` | «2 excluídos» | O pintor indica expressamente que não faz. Terá de os contratar a outra pessoa. |

**2. Ausência de garantia escrita não é ausência de direitos.** Escrevi «se a pintura falhar, não há
prazo escrito dentro do qual ele a refaça» — que sugere que o cliente fica sem nada. Passa a dizer
que a falta de prazo escrito **não afasta os direitos que a lei já dá**, mas deixa-os por concretizar.

**3. Não saber a duração não prova que haverá andaimes.** A frase inventava o cenário. Passa à forma
que o promotor escreveu: «Não indica a duração. Confirme o prazo e as limitações de utilização
previstas durante a obra.»

**4. «Nenhum declarado» não significa preço fechado.** Não haver condicionados declarados não prova
que o pintor tenha confirmado um preço fixo. «O essencial» deixa de dizer «preço definido» e passa a
«Cobre o pedido; sem custos por fechar declarados», e a matriz troca «Não» por «Nenhum declarado».

**A régua que ficou**, e que três testes passam a impor: cada motivo diz **o facto e o que
confirmar**, nunca o efeito que daí se concluiria. Um teste proíbe as afirmações inventadas
(*não há prazo*, *andaimes*, *engano*), outro exige que cada motivo traga um verbo de acção
(confirme, pergunte, peça), e um terceiro proíbe afirmar preço fechado, fixo, garantido ou
confirmado em qualquer célula.

**Mais duas correcções do promotor, mais pequenas:**

- **A nota comercial era abrangente de mais.** «Não entram em nenhum destes cálculos» é falso se o
  preço que o pintor apresenta já incorporar o custo da sua relação com a plataforma — e incorpora.
  O que é verdade, e é o que passa a estar escrito: «As comissões e outras condições comerciais com a
  plataforma não influenciam a ordenação nem as indicações apresentadas.»
- **A referência dos quadros não se explicava.** Dizia-se qual era, não porquê. Passa a dizer que é a
  proposta de menor total entre as que cobrem o pedido e não declaram custos por fechar.

**Um mal-entendido que foi culpa minha:** enviei uma imagem do banco de ensaio da secção 2 e o
promotor leu-a como sendo a primeira página, concluindo que a matriz faltava. A matriz existe e está
na primeira página desde a manhã. As imagens de ensaio passam a identificar que secção mostram.

### Fecho da ronda: coerência verificada, e o que a base revelou (29/10/2026)

**Dois testes meus eram absolutos de mais**, e o promotor apanhou os dois:

- O que proibia «preço fixo» proibia **informação verdadeira**: se um dia o pintor confirmar
  expressamente um preço fixo, isso deve poder dizer-se. O teste passa a ser sobre a **derivação** —
  da ausência de condicionados declarados não se conclui preço fechado — e não sobre as palavras.
- O que exigia verbo de acção exigia-o em **todas** as explicações. Passa a exigi-lo só nas células
  em atenção, que são as pendências. Uma explicação que acompanhe uma célula neutra não tem nada que
  o leitor precise de ir confirmar.

**A nota comercial**, na formulação do promotor: «A comissão e as restantes condições comerciais com
a plataforma não são usadas como critérios de ordenação ou recomendação. O preço apresentado pelo
pintor é considerado na comparação.» Diz as duas coisas que são verdade, incluindo a segunda, que as
versões anteriores calavam.

**A coerência entre as quatro vistas passa a ser testada** (`src/domain/coerencia.test.ts`). Não
testa nenhum módulo: testa que a matriz, o comparativo lado a lado, as indicações e a metodologia
**concordam entre si** a partir dos mesmos dados. Nove verificações — totais iguais, cobertura igual
incluindo a distinção entre calar e excluir, custos por fechar iguais, a indicação na linha certa e
em mais nenhuma, a referência a ser a mais barata entre as completas e firmes, e toda a indicação
atribuída a estar publicada na metodologia com o mesmo identificador. Passaram todas à primeira: as
vistas já estavam coerentes, e agora ficam obrigadas a continuar.

**O que a base real revelou, e o PDF não revelaria:**

1. **Não há dados para um PDF representativo.** Os dois únicos pedidos com propostas têm **uma**
   proposta cada. Com uma só, não há comparação: a leitura imediata não sai, as indicações dizem que
   não há o que comparar. Um PDF gerado assim não exercitaria nada do que foi construído.
2. **Há um pedido publicado com a lista de trabalhos vazia.** Nesse caso a matriz dizia «Completo» —
   não havia nada por esclarecer nem excluído — e contradizia a classificação, que com zero trabalhos
   nunca dá o pedido por completo. Passa a dizer **«Pedido sem trabalhos indicados»**, em atenção.
   Cobrir zero trabalhos não é cobrir o pedido: é não haver pedido que se cubra.

O segundo é um defeito que só apareceu por se ter ido ver o que lá está, e que nenhum ensaio com
dados inventados teria encontrado.

### O cenário de demonstração com dez propostas (29/10/2026)

**Não foi criado na base.** O pedido era um ambiente de teste; a base Supabase é só uma, de produção,
e o plano não tem branches. Verifiquei que seria inerte — `private.notify` apenas escreve numa tabela,
e os três triggers de proposta são só de UPDATE, pelo que inserir já com o estado final não dispara
nada — mas inerte não é o mesmo que ser um ambiente de teste, e a aprovação automática recusou a
criação do utilizador, com razão. O cenário foi montado com os **componentes reais e as mesmas
funções de domínio**; o que muda é a camada HTTP, não a lógica nem a apresentação.

Dez propostas, com todos os estados que o produto conhece: sete completas, uma que se cala sobre dois
trabalhos e mede 310 m² onde o pedido diz 240, uma que exclui expressamente a impermeabilização, uma
com o preço das fissuras condicionado, e históricos de 1 a 112 obras, incluindo um pintor sem nenhuma.

**Três defeitos que só apareceram à escala de dez, e nenhum apareceria com três:**

1. **A primeira página saía com o título e mais nada.** O `break-inside: avoid` da folha aplica-se a
   qualquer `section`, e eu tinha corrigido isso **dentro** do componente da síntese — as secções
   escritas na própria página continuavam a herdá-lo. Corrigido na raiz, no `globals.css`, para todas
   as secções do relatório: a regra geral serve o orçamento, que tem secções curtas, e não o
   relatório, que tem tabelas de dez linhas. A primeira correcção não pegou porque a regra do
   `@media print` vem depois com a mesma especificidade — foi preciso qualificá-la com as duas
   classes.
2. **«Ver 2. Comparativo detalhado» repetia-se em cada pendência**, seis vezes seguidas. Passa a
   dizer-se uma vez, no fim da lista.
3. **As diferenças relevantes nomeavam nove aliases por critério.** «Pintor I, Pintor B, Pintor D,
   Pintor G, Pintor A, Pintor H, Pintor J e Pintor E: Todos incluídos» enche a linha e esconde o que
   é a diferença. O grupo maior passa a dizer-se pelo número — «as restantes 8» — e a minoria vem
   **primeiro**, porque é ela que distingue: «Pintor C: 310 m² — diverge · as restantes 9: 240 m²».

**Coerência confirmada no documento gerado:** a conclusão, a referência da explicação económica e a
referência que se repete nos quadros são a mesma proposta; a matriz tem as dez linhas; a metodologia
citada é a 1.0, que é a que produziu os números.

### Sem pedido definido não há cobertura nem recomendação que dela dependa

Pedido do promotor, e o caso existe na base. Com a lista de trabalhos vazia:

- a linha da cobertura diz **«Pedido sem trabalhos indicados»** em vez de classificar;
- «O essencial» diz **«Sem pedido definido para comparar»**, e nunca que a proposta cobre o pedido;
- as linhas que dependem dos trabalhos pedidos (preparação, acabamento) não aparecem;
- a indicação **«melhor preço para o pedido completo» não se atribui**, e diz porquê;
- **«menor preço apresentado» continua a atribuir-se**: não depende de cobertura nenhuma.

### As imagens apanharam o que os testes não apanhavam (29/10/2026)

Revisão do promotor sobre o PDF de dez propostas. **Os testes passavam e o documento contradizia-se**,
porque verificavam valores intermédios e não as frases finais.

| Onde | Dizia | Diz |
|---|---|---|
| Justificação do menor preço | «2 trabalhos do pedido não incluídos» — e a matriz dizia «2 por esclarecer» | «por não esclarecer se inclui 2 trabalhos pedidos» |
| Justificação do pedido completo | «incluindo todos os trabalhos pedidos, com preço firme» | «declarando incluir todos os trabalhos pedidos, sem custos condicionados declarados» |
| Como interpretar | «por terem o preço fechado» | «por declararem, ou não, custos por fechar» |
| Linha da impermeabilização, Pintor F | «Não indicada» — e a cobertura dizia «1 excluído» | «Excluída pelo pintor», com o motivo correspondente |

A quarta era um defeito a sério: `celulaDeExecucao` tratava tudo o que não fosse «incluído» como não
indicado. Agora cada estado diz o seu nome — excluída, em opção, preço por fechar — e a linha
concorda com a coluna da cobertura.

**O destaque mudou de nome**, porque o antigo afirmava mais do que os dados: «Melhor preço para o
pedido completo» passa a **«Menor total entre as que declaram incluir tudo, sem custos
condicionados»**. É mais longo e é o que é verdade.

### A alternativa mais próxima

O defeito de leitura que o promotor apanhou: a primeira página destacava a de menor total e dedicava
as pendências todas a outra proposta, deixando escondido que a seguinte — por 295,20 €, 2,3% — trazia
uma segunda demão, mais garantia e metade do adiantamento. Não demonstra que seja melhor, e o texto
não o diz; mas esconder a comparação é pior do que mostrá-la.

Passa a haver uma terceira conclusão, factual: quanto custa a mais, em euros e em percentagem, e o
que traz de diferente, com os valores das duas lado a lado. Termina em «confirme a adequação dos
sistemas propostos», que é o que a plataforma pode dizer.

**A alternativa tem de estar nas mesmas condições da indicada** — cobertura **e** custos por fechar.
À primeira filtrei só pela cobertura e o documento escolheu uma proposta com um trabalho por fechar:
comparar um total firme com um total que ainda pode subir não é comparar a mesma coisa. O render
apanhou-o.

### A matriz inteira na primeira página

Era o pedido principal: oito propostas na primeira página e duas na segunda, porque o bloco de
pendências ocupava o espaço. A ordem passa a ser título, conclusões, **matriz completa**, e as
pendências vão para depois — a informação já está no detalhe, não precisa de aparecer duas vezes por
extenso. As dez cabem.

**Mais dois ajustes de densidade:** um critério em que quase todas as propostas dizem coisas
diferentes — garantias, datas, adiantamentos — deixa de entrar nas «diferenças relevantes», porque a
lista fica tão longa que não informa; a tabela apresenta-o melhor. E «O essencial», quando é igual em
todas as colunas, diz-se uma vez por baixo da tabela em vez de se repetir em cada uma.

## 30/10/2026 — Uma zona tem três dimensões, não um campo

Perguntei ao promotor se «fora do âmbito» era uma exclusão explícita ou só a ausência da zona na
lista. A resposta foi a primeira — **é uma exclusão explícita de uma zona conhecida** — mas a
pergunta revelou um erro maior na minha proposta: eu queria meter quatro conceitos num campo só.

| Dimensão | Valores | O que responde |
| --- | --- | --- |
| Participação no pedido | incluída · por decidir · excluída | A zona entra nesta obra? |
| Origem da quantidade | medição · estimativa · documento | Como se chegou ao número? |
| Confirmação da quantidade | por confirmar · confirmada | O número já foi verificado? |

**«Levantamento» descreve o processo, não o método da quantidade** — um profissional pode medir uma
fachada e estimar outra. Por isso quem registou guarda-se à parte (`registado_por`, `registado_em`,
`observacoes`), e não dentro da origem. Era esse o vício do campo antigo: «medição do cliente» são
duas respostas numa.

**Uma zona excluída** não exige medições, não entra no total nem nas validações de publicação, fica
identificada no pedido para não restar dúvida de que foi considerada, e conserva os dados que já
tivesse. **Uma zona ausente da lista não é nada disso:** não é excluída nem confirmada, e ninguém é
obrigado a inventariar o imóvel inteiro — basta rever as zonas relevantes para a intervenção.

**Uma zona por decidir é bloqueio de publicação, e é do cliente.** Ninguém pode responder por ele se
aquela fachada entra ou não. Uma estimativa por confirmar **não** é bloqueio: não é um número
errado, é um número por confirmar, e os pintores veem-no como tal.

A migração `20261030090000_zonas_em_tres_dimensoes` é aditiva e deixa a coluna `origem` como
história. **Aplicada à base real pelo promotor, no painel, a 30/10/2026** — a aplicação directa foi
recusada por ser uma alteração em produção. As seis colunas estão lá, confirmadas, e os avisos de
segurança não mudaram: a migração acrescenta colunas a uma tabela que já tinha políticas, e não abre
superfície nova.

**Fica por registar na lista de migrações do Supabase.** Correr pelo painel aplica o SQL mas não
escreve a linha em `supabase_migrations.schema_migrations`, e a tentativa de a escrever daqui foi
recusada pela mesma razão. Sem ela, um `supabase db push` tenta aplicar a migração outra vez — o que
é inofensivo, porque é toda `if not exists`, mas deixa a lista a mentir. A linha está no fim de
`docs/ESTADO.md`.

**Os tipos da base acrescentaram-se à mão**, como a nota no topo de `src/lib/database.types.ts`
manda: a regeneração completa traz hoje 87 erros de tipos em 19 ficheiros, e é dívida à parte.

---

## 01/11/2026 — Reformulação do workspace do fornecedor

O promotor fixou a direção, e dispensa alternativas: verde-petróleo para ação e estado ativo,
superfícies brancas, creme discreto só na navegação, laranja como acento pontual. Os valores estão
centralizados em `src/app/globals.css`, com a direção escrita por cima dos tokens.

**Dois contextos, Vendas e Avaliações**, com a navegação a dizer sempre em qual se está
(`src/domain/workspaceFornecedor.ts`, função pura e testada).

**Privacidade entre pessoa e empresa.** O responsável não vê os levantamentos nem as comissões
pessoais dos vendedores. Não é uma intenção: as consultas filtram por `vendedor_user_id` e nunca por
`vendedor_org_id`, e a tabela `survey_availability` tem políticas que só deixam cada pessoa ler e
alterar a sua linha — com cinco testes de acesso a prová-lo.

**O prazo que a lista mostra é o da obrigação em curso**, decidido num sítio só
(`src/domain/levantamentoNaLista.ts`). Antes mostrava sempre as 48 horas da conclusão, mesmo a quem
ainda não tinha telefonado e tinha uma hora útil a correr — era o prazo errado no ecrã onde mais se
olha.

**A referência do levantamento é um número de sequência** (`QP-1042`,
`src/domain/referencias.ts`, migração `20261101040000`), porque um uuid não se diz ao telefone.

**A subscrição do fornecedor saiu do catálogo para dentro da sua organização.** A navegação apontava
para `/app/subscricao`, que é o plano de uma empresa *de pintura*: era o ecrã errado para um
fornecedor.

**Quem aceita um levantamento é a pessoa, não a empresa.** O botão de aceitar passa a aparecer a
qualquer vendedor. A base sempre o permitiu (`reserve_survey` aceita `vendedor`), mas o ecrã antigo
só o mostrava a proprietários e gestores — um avaliador entrava e não via maneira nenhuma de aceitar
trabalho.

**Conflito com a regra 17 do CLAUDE.md, resolvido sem alterar a regra.** Numa linha de lista, um
botão dentro de um link é HTML inválido e são dois alvos a disputar o mesmo toque. A linha inteira
passou a ser um só destino, com a etiqueta da ação à direita desenhada com aspeto de botão sem o
ser: a área de toque é a linha toda.

Migrações `20261101040000_referencia_do_levantamento` e `20261101050000_disponibilidade_e_alertas`
**por aplicar** — são aditivas e só fazem falta quando o ramo `claude/workspace-fornecedor` for
publicado. Os ficheiros para o painel foram entregues ao promotor, verificados do modo habitual:
constroem a base igual ao repositório e podem correr duas vezes.

### 01/11/2026 — O vendedor passa a poder descontar, dentro de um limite

Até aqui um vendedor não podia criar desconto nenhum: a base recusava tudo o que não viesse do dono ou
de um gestor, e não havia onde escrever um limite. Não era o ecrã a esconder um botão — a permissão
nunca existiu.

**Três níveis de limite, que coexistem** (decisão do promotor, com as três opções escolhidas):

- **da empresa** — vale para todos os vendedores;
- **do vendedor** — *substitui* o da empresa para essa pessoa, para cima ou para baixo. Substitui, e não
  limita, porque o objetivo é premiar quem tem mais traquejo;
- **do produto ou da categoria** — é um *teto que se aplica sempre por cima* dos outros dois, porque
  existe para proteger margens apertadas, e um vendedor de confiança não é razão para as furar.

Um desconto a todo o catálogo respeita o teto mais apertado que exista: senão bastava não escolher
produto nenhum para contornar o teto dos esmaltes.

**Sem regra nenhuma escrita, o limite é zero.** É o comportamento de hoje, e é o que fica a valer para
quem nunca mexer nisto.

**Vale de imediato, sem aprovação** (decisão do promotor): o limite já é a autorização. O responsável vê
quem criou cada desconto e pode retirá-lo. Quem criou também pode retirar o seu, para não depender de
alguém que pode nem estar.

A regra vive em `src/domain/limitesDeDesconto.ts` e tem cópia em plpgsql, porque a porta tem de estar
fechada na base — um argumento que vem do navegador pode ser trocado (regra 10). `supabase/tests/
limitesDeDesconto.test.ts` percorre 64 combinações e compara as duas, uma a uma.

**Defeito encontrado pelos testes de acesso:** a restrição de unicidade da tabela nova não protegia
nada. Em Postgres, por omissão, dois valores vazios contam como diferentes — e os três níveis desta
tabela distinguem-se precisamente por terem colunas vazias. O dono podia gravar dois limites gerais
contraditórios, e a função do teto falhava a meio de uma gravação. Resolvido com `nulls not distinct`.

Migração `20261101070000_limites_de_desconto_do_vendedor`, **aplicada** (01/11/2026).

## 01/11/2026 — Publicar passa a ser a regra

O promotor viu o domínio público igual a há dezenas de pedidos e a explicação era simples: o trabalho
vivia num ramo à parte, em pré-visualização, porque a regra de processo dizia que só se publicava com
aprovação separada. Decisão do promotor, em conversa: **«a partir de agora publica sempre»**. Fica
revogada a regra anterior («nunca push nem publicação no domínio público sem aprovação separada»).

Como se publica: depois de `tsc`, `lint`, `npm test` e `npm run build` a zero (regra 7), o ramo de
trabalho avança o ramo de produção (`claude/sweet-brahmagupta-xd1vp7`) por avanço direto, sem forçar
nada, e acompanha-se a publicação da Vercel até estar pronta. Um avanço que não seja direto (alguém
mexeu no ramo de produção) pára e fala-se com o promotor. As migrações continuam a ir primeiro, pelo
painel, e o código só sai depois de elas estarem aplicadas.

Publicado a 01/11/2026: a reformulação do workspace do fornecedor (15 commits).

## 01/11/2026 — A assinatura que falhava uma vez em 256

`pades.test.ts` falhava de vez em quando desde 29/10, «causa não encontrada». Encontrada: o valor da
assinatura vive num espaço de tamanho fixo dentro do PDF, enchido com zeros, e ao lê-lo tirava-se
«todos os pares 00 do fim». Quando o último byte da assinatura era ele próprio 0x00 — uma vez em
256 — perdia-se, e a verificação falhava sem razão visível. Não era só o teste: em produção, uma em
cada 256 assinaturas com Chave Móvel Digital seria recusada.

Passa a decidir o comprimento escrito no próprio DER (`semEnchimento`, `src/domain/signature.ts`), com
testes, incluindo um que reproduz o caso. Verificado contra o código antigo: perdia o byte; o novo não.

## 01/11/2026 — «Novo pedido» era um botão sozinho

Relatado pelo promotor: na página de criar um pedido, «Criar pedido» não respondia nem dava
informação. Causa: a 30/10 o formulário do pedido passou a mostrar os campos por secções, e fora da
página em secções a secção por omissão era «resumo» — uma secção sem campos. A página de criação
ficou só com o botão, e carregar nele enviava um formulário vazio cujo erro caía num campo escondido.
Desde 30/10 ninguém conseguia criar um pedido de orçamento novo pela aplicação.

Correção: fora da página em secções não há secção (`null`), e o formulário mostra tudo. Verificado no
banco de ensaio: 27 campos visíveis na página de criação.

## 01/11/2026 — Estilo do site público a partir de usenorte.com; Manrope e pílulas em todo o produto

O promotor recusou o aspeto «de site feito por IA» e perguntou se `/empresas` podia seguir o estilo
de usenorte.com. Fez-se uma maquete (artefacto, só para avaliação), depois outra da página inicial
com o prédio que se pinta, e ele aprovou com dois pedidos: o primeiro ecrã com fotografias que se
sucedem (como o Norte) e o prédio a passar para uma secção própria, mantendo o scroll a pintá-lo.
As fotografias foram geradas por ele a partir de mini-prompts; o prédio novo chegou com fundo
transparente e a versão em linha foi extraída da colorida (`predio2-linha.webp`), como da primeira vez.

O que fica decidido:

- **Fonte Manrope** em todo o produto (`layout.tsx`), não só no site público: dois tipos de letra
  fariam dois produtos. A variável CSS manteve o nome para não mexer em cem ecrãs.
- **Botões em pílula** (`btn-*` com `rounded-full`), também em todo o produto. Os 31 botões que
  ainda estavam escritos à mão passaram para as classes no mesmo dia, e o inventário de
  `alvosDeToque.test.ts` ficou vazio: a lista não volta a crescer.
- **Site público:** títulos grandes em peso médio com espaçamento apertado, centrados nas secções;
  primeiro ecrã fotográfico com cabeçalho transparente; maquetes do produto em caixas cinzentas;
  fotografias reais em cada secção que tem assunto. Os cantos dos blocos grandes são 28px
  (`rounded-[28px]`), por serem molduras de fotografia e caixas de maquete — excepção declarada à
  regra 17, só no site público.
- **Tratamento impessoal mantém-se** (regra 12); o Norte trata por «tu» e isso não se copia.
- As fotografias da Wikimedia Commons deixaram de ser usadas; os créditos saíram dos rodapés.

Verificado com o inspetor taste-skill: página inicial, `/empresas`, `/fornecedores`, `/entrar`,
`/transparencia` e `/metodologia` a zero falhas.

## 02/11/2026 — Três indicações, e a Escolha Quem Pinta com justificação (metodologia 1.1)

O promotor viu a demonstração do comparador na página inicial sem estilo nenhum (texto em Times, sem
tabela) e com um cenário incoerente, e pediu duas coisas.

**O defeito.** O build passou a dividir o CSS em dois ficheiros quando a fonte mudou; o script que gera
os seis estados da demonstração embebia só o primeiro, e os ficheiros publicados ficaram sem Tailwind.
Agora embebe todos (`scripts/gerar-demo-comparador.mjs`).

**O cenário.** Três propostas com papéis claros: a mais barata que não faz tudo (Pintor B: exclui as
fissuras, não fala da impermeabilização), a intermédia que cobre o pedido inteiro com preço firme
(Pintor A) e a mais completa que acrescenta trabalhos não pedidos — guardas metálicas e tectos das
varandas — por um total cuja diferença para A excede o valor desses trabalhos (Pintor C). O Pintor C
deixou de ter preço global; o estado 5 da demonstração passou a comparar A com C.

**A regra, que vale na aplicação e não só na demonstração.** As indicações passam a três, e a
metodologia sobe para 1.1 (`src/domain/metodologia.ts`, `src/domain/indicacoes.ts`):

- **A mais barata** — menor total apresentado, com o que lhe falta dito ao lado (já existia, com
  outro nome).
- **A mais completa** — a que cobre mais trabalhos pedidos com preço fechado; em igualdade, a que
  acrescenta mais trabalhos não pedidos; depois a de menor total. Diz quantos trabalhos a mais traz
  e quanto somam.
- **Escolha Quem Pinta** — a de menor total entre as que incluem todo o pedido com preço fechado
  (era a «menor total com o pedido completo»). É a única que a plataforma assume como sugestão, e
  vem sempre com a justificação em números da própria matriz: quanto custa a mais do que a mais
  barata e o que esta não cobre; e, contra a mais completa, se a diferença de preço corresponde aos
  trabalhos a mais ou os excede («o resto é preço mais alto pelos mesmos trabalhos»). Sem nenhuma
  elegível, não há Escolha e diz-se porquê.

Isto revê a decisão de 29/10/2026 de não haver recomendação declarada: há uma, nomeada, com a regra
publicada em `/metodologia/1.1` e com os limites escritos («compara o âmbito e o total; a decisão é
do cliente»). A reputação continua sem ordenar nem destacar. O que não influencia nada (comissão,
promoções, antiguidade) não mudou.

**Onde aparece.** Três blocos por cima da síntese no ecrã das propostas do cliente
(`SugestoesQuemPinta.tsx`), os mesmos três na primeira página do relatório para a assembleia (antes
eram dois) e no estado 1 da demonstração. A reconciliação passou a tratar os trabalhos a mais como
âmbito com o valor declarado, em vez de os deixar cair na «diferença não decomposta»
(`reconciliacao.ts`, `aMais`). A correspondência técnica só cobra produto nos trabalhos que o levam
(primário, pintura, impermeabilização, metais, humidade): uma lavagem sem «produto» não é um reparo.

**Arrumações no mesmo commit:** rótulos de grupo da síntese e da matriz em caixa normal no ecrã
(mantêm-se espaçados em maiúsculas no papel); categorias sem linhas mostram «—» em vez de «não
indicado»; as notas técnicas da reconciliação começam em maiúscula.

## 02/11/2026 — Ser avaliador: inscrição por autodeclaração, simulador de ganho, secção pública

Pedido do promotor: a figura do avaliador — o vendedor de um fornecedor que ajuda o cliente a medir a
obra (dimensões, estado do imóvel, objetivos), com a plataforma a registar tudo — tem de estar à vista
e explicada: é uma oportunidade de ganhar duas vezes, a comissão do levantamento (seja qual for a
proposta vencedora) e a proximidade aos pintores antes de haver orçamento.

- **Página pública `/fornecedores`:** secção própria em lima, «Ganhe dinheiro com o que sabe. Duas
  vezes.», com o exemplo de uma obra de 45 000 €: de 450 € a 1 215 € (1% a 2,7%), a 2% 900 €. Os
  números saem da regra real de `survey.ts`; nada é escrito à mão.
- **Área de fornecedor, contexto Avaliações:** separador «Ser avaliador» (`/app/avaliacoes/inscricao`,
  `src/domain/avaliador.ts`). Em que consiste; inscrição por **autodeclaração** de experiência e de
  quatro compromissos (medir e descrever com verdade, não orientar o cliente, cumprir prazos),
  guardada como aceitação de termos com versão própria (`survey_terms_acceptances`,
  `avaliador-2026-11-02`) — sem migração. Depois da inscrição: **simulador de ganho** (valor da obra
  à mão; a % é a posição atual da pessoa na banda, pela regra `surveyorShareBp`, com as avaliações
  que já tem; sem avaliações, começa a meio, 1,85%) e a explicação dos quatro fatores e dos seus
  pesos (40/30/15/15).
- **Oportunidades:** sem inscrição não se aceita um levantamento — o botão dá lugar a «Inscrever-me
  primeiro». A barreira é do ecrã; a função `reserve_survey` na base continua aberta a quem pertence
  a um fornecedor, e fechá-la também lá pede migração (EM_ABERTO.md).

A «experiência comprovada» é, nesta fase, a declaração da própria pessoa; a verificação faz-se pelo
trabalho, com as avaliações a subir ou a descer a percentagem. Uma verificação documental fica para
decisão futura.

## 02/11/2026 — Avisos por WhatsApp

Pedido do promotor: ligar a aplicação ao envio de mensagens por WhatsApp. Decidido e construído:

- **A fila é a mesma do email.** O WhatsApp é um segundo resultado por aviso, não uma segunda fila: um
  aviso novo na aplicação sai pelos dois canais sem trabalho extra, e uma falha num não trava o outro.
- **Consentimento explícito por pessoa**, com o número, em «Disponibilidade e alertas». Sem ele nem se
  tenta. A base recusa ligar o WhatsApp sem número e recusa números que não sejam internacionais.
- **Um só modelo aprovado na Meta**, com três variáveis (assunto, texto, ligação). Aprovar um texto por
  tipo de aviso obrigaria a nova aprovação a cada aviso novo; assim não.
- **Twilio como intermediário**, por ser o caminho mais curto para pôr a funcionar. Uma chamada HTTP, sem
  biblioteca. Sem as quatro chaves no ambiente, o canal não existe e nada muda — não é um interruptor que
  abra uma porta (regra 16): só decide se um envio a mais acontece, e só a quem o pediu.
- O guia dos passos que ficam do lado do promotor está em `docs/WHATSAPP.md`.

## 02/11/2026 — Campanhas e Marketing: oito flyers e um separador no backoffice

Pedido do promotor: dois flyers por perfil (clientes diretos, gestores de condomínios, empresas de
pintura, fornecedores de tintas), «bem pensados», sobre o que a aplicação faz e com as vantagens e os
ganhos de cada perfil em destaque; marketing inventado permitido (campanha de lançamento, adesão por
QR com vantagem); disponíveis num separador do backoffice para descarregar ou enviar por email, com a
data de criação.

- **Catálogo em domínio** (`src/domain/campanhas.ts`): oito flyers, cada um com gancho (a dor),
  título, três vantagens, números em destaque quando os há, chamada à ação, fotografia e esquema de
  desenho. Dois ângulos por perfil: cliente — pedidos sem resposta / medo da obra a meio;
  condomínio — «não consegue três propostas?» / o relatório para a assembleia e o voto dos
  condóminos; pintor — o motor de orçamentos / oportunidades e contrato; fornecedor — o catálogo
  dentro do orçamento / ser avaliador.
- **Geração** (`scripts/gerar-flyers.ts`, Playwright, fora do build): A5 ao alto, PDF e JPG, em
  `public/campanhas/`, com a tipografia e a paleta da marca e um QR por flyer que leva um código
  (`?c=fl-…`) — ainda não lido por ninguém, mas é a base das métricas futuras.
- **Campanha de lançamento (inventada, em rascunho):** adesões até 31/01/2027 pelo QR — cliente:
  visita de avaliador sem custo e prioridade na marcação; condomínio: relatório e acesso dos
  condóminos incluídos; pintor: plano Pro sem custo até essa data; fornecedor: presença no catálogo
  sem subscrição até essa data. **As duas últimas são compromissos comerciais que o promotor tem de
  confirmar antes de os flyers saírem**; até lá o backoffice marca cada flyer como «rascunho,
  condições por confirmar». Tudo vive numa constante só (`CAMPANHA_DE_LANCAMENTO`).
- **Backoffice «Campanhas e Marketing»** (`/app/backoffice/campanhas`): a campanha e as suas
  condições, os flyers por perfil com pré-visualização, data de criação, estado, destino do QR,
  «Descarregar PDF», «Imagem» e «Enviar por email» (pelo canal dos avisos, com a ligação ao PDF).

**Refeitos a 02/11/2026 (v2), depois de o promotor rejeitar a primeira versão:** «3 propostas????
a plataforma está pronta para 20 se houver candidatos, além disso não garantimos 2 ou 3, são as que
forem»; «são feios e não começam por explicar o que faz a plataforma»; «o flyer para fornecedores de
tintas é ineficaz». Pediu que se usassem agentes de marketing, vendas, publicidade, design e
psicologia para encontrar o método com maior potencial de adesão. Duas equipas de agentes
(estratégia de texto; direção de arte) deram as regras que passaram a valer no catálogo:
- **Nunca se promete um número de propostas**: a plataforma leva as que houver.
- **Cada flyer abre pelo logótipo e por «o que é»** (`conteudo.oQueE`), antes do gancho e do título.
- **Confiança por mecanismo, não por adjetivo**: abertura simultânea, caução devolvida, CMD,
  adenda assinada — um «prova» por flyer (`conteudo.prova`), e «como funciona» em três passos.
- **Alavancas por público**: cliente — autoridade por mecanismo e aversão à incerteza; condomínio —
  defensabilidade perante a assembleia e prova social por mecanismo; pintor — justiça processual e
  a ferramenta própria; fornecedor — efeito padrão (o catálogo é o menu de onde o pintor escolhe)
  e, no segundo, ancoragem com dinheiro concreto (45 000 € → 900 € a 2%) e perda competitiva («quem
  vê a obra primeiro vende a tinta»).
- **Três esquemas de desenho** (`a` fotografia à esquerda; `b`/`b-escuro` prédio isométrico sobre
  campo pálido ou marinho, régua numerada, uma palavra do título a lima; `c` captura real da
  aplicação com anotações numeradas), nunca o mesmo nos dois flyers de um perfil. Lima uma vez por
  flyer, nada abaixo de 8pt, sem caixas tintadas nem pontos, QR de 28mm numa caixa branca de 32mm
  como único objeto da zona de ação. O gerador avisa se algum bloco sair da página ou entrar na
  zona de ação.

**Para o futuro, a pedido do promotor:** automatismos para as campanhas e um motor de gestão de
divulgação e promoção com métricas. Fica em EM_ABERTO.md; o promotor pediu para ser lembrado de
autorizar um plano detalhado.

## 02/11/2026 — "Para que serve", "como se aplica" e "sugestões" na ficha do produto

Pedido do promotor: resumos de cada produto do catálogo de referência — para que serve, como se
aplica, sugestões — disponíveis em botões na ficha do produto.

- **Por que não um campo escrito à mão por produto:** o catálogo tem mais de 90 fichas e nenhum
  processo de validação desse texto, um por um — o mesmo risco que levou o preço e a durabilidade a
  terem campos de fonte e data (`durabilidade_*`). Em vez disso, o texto é **gerado por tipo de
  produto** (`src/domain/productGuide.ts`, puro e testado) e preenchido com os números que já estão
  na própria ficha (demãos, secagem, diluição, rendimento, espessura, condutividade térmica, reação
  ao fogo) — nunca inventa um número que a ficha não tenha; quando o campo está em branco, a frase
  recua para "ver a ficha técnica do fabricante".
- **Ecrã** (`src/components/ProductGuide.tsx`, em `catalogo/referencia/[id]/page.tsx`): três botões
  (`btn-primary`/`btn-quiet`, pílula, 44px — regra 17) a mudar um único painel de texto, sem ícones
  nem numeração — regra 19. Não duplica "Para usar na mesma obra" (produtos complementares do
  fabricante): "sugestões" é indicação prática de aplicação, não lista de produtos.
- Cobre os 15 tipos de produto (tintas e afins, as 5 placas de isolamento, fixador, rede, reboco de
  capoto, e "outro" com texto neutro a apontar para a ficha técnica).

## 03/11/2026 — Editar uma zona apagava o registo de quem a mediu

`colunasDaZona` (`src/app/app/pedidos/actions.ts`) escrevia sempre `registado_por`/`registado_em` com
o utilizador que está a chamar a função — certo em `addSurface` (zona nova), errado em `updateSurface`:
um cliente a corrigir uma zona que um avaliador tinha medido (ex.: ajustar a área por haver um
roupeiro embutido) passava a ficar registado como tendo medido ele próprio, apagando em silêncio o
registo de que foi um profissional quem esteve no local. Exactamente o que a regra pedida pelo
promotor («o registo deve conservar quem fez cada medição e quando») e `docs/DECISOES.md` de
30/10/2026 («quem registou guarda-se à parte») diziam que não devia acontecer.

Passa a só se escreverem estas duas colunas em `updateSurface` quando a zona ainda não tinha nenhuma
medição (`origem_quantidade` anterior nulo — `primeiraMedicao`, `src/domain/request.ts`, puro e
testado): nesse caso a edição É a primeira medição e fica atribuída a quem a fez; quando já tinha
origem, a autoria anterior fica como estava. `addSurface` continua a escrever sempre as duas colunas
(zona nova).

## 03/11/2026 — Medição de zonas por retângulo e dois pontos: passo 1 construído, com uma limitação real encontrada

Handoff do promotor ("medição de zonas por retângulo e dois pontos"): um ecrã em que o avaliador toca
nos quatro cantos de uma fachada retangular, mede a distância real entre dois pontos A e B, e a
aplicação corrige a perspetiva e devolve a área líquida. Só se construiu o passo 1 da ordem pedida
(secção 10 do handoff): `retificarZona` (`src/domain/retificacao.ts`, `retificacao.test.ts`), com os
testes 1 e 2 (retificação sintética a 0º/15º/30º, e o assinalar de um canto a 85º). Os passos
seguintes — confirmação/revisão, vãos, varandas, cores, o ecrã — ficam por fazer
(`docs/EM_ABERTO.md`).

**Decisões tomadas, repetindo as do handoff (secção 9), para ficarem registadas aqui também:**
- Medição por retângulo com dois pontos (A e B) e distância real, com correção de perspetiva
  assente em ângulos de 90º.
- Confirmação com até duas medições extra; desvio acima de 1% manda a zona para revisão. (Ainda
  não construído — só a retificação em si.)
- Vãos acima de 1 m² descontam-se. (Não construído.)
- Varanda: pintada por dentro; marquise: não pintada. Profundidade estimada e editável. (Não
  construído.)
- Cores escolhidas pelo cliente, registadas pelo avaliador, visíveis na revisão do levantamento.
  (Não construído.)
- Fotografias de medição nunca chegam a pintores nem a clientes. (Já é a regra geral das fotografias
  de pedidos — secção 5.2 do `ESTADO.md` — e aplica-se também a estas; nenhuma excepção aberta.)

**O método, e o que se descobriu ao testá-lo contra o caso real do handoff.** A retificação assenta em
duas contas: a proporção largura/altura do retângulo real, derivada das larguras da linha de cima e
de baixo do quadrilátero fotografado e da posição vertical de cada uma face ao centro da fotografia
(fecho algébrico próprio, documentado no ficheiro); e uma homografia (fórmula de Heckbert) que leva
qualquer ponto da fotografia — incluindo A e B — para coordenadas no retângulo já com a forma certa.
Os testes 1 e 2 do handoff passam com erro abaixo de 1e-10% (não só abaixo do limiar de 0,5%
proposto).

**A limitação, encontrada ao tentar also passar o teste 9 (o vão real do handoff, fotografado do chão
para cima):** resolveu-se algebricamente o sistema de equações para o caso geral — zona deslocada
verticalmente do eixo ótico da câmara, que é exactamente o caso de uma fotografia tirada de baixo — e
o sistema fica **indeterminado por um grau de liberdade**: há 4 incógnitas (a inclinação da câmara, a
proporção largura/altura, e o deslocamento vertical da zona face ao eixo ótico, mais a distância) e só
3 equações independentes nos quatro cantos fotografados, quando a zona não está centrada
verticalmente com a câmara. Confirmado numericamente: com a zona centrada no eixo ótico, o método
recupera a proporção com erro desprezável a qualquer inclinação testada (0º, 15º, 30º); deslocando a
zona verticalmente (sem mudar mais nada), o erro sobe para mais de 6%, e cresce com o deslocamento —
não é um efeito de arredondamento, é o sistema a ficar matematicamente subdeterminado. Isto bate
certo com o caso real de teste do handoff (vão fotografado do chão para cima, claramente não centrado
verticalmente na fotografia): o erro medido nesse caso foi de 9,3%, acima do limiar de 0,5%.

**O que isto significa, e o que falta decidir:** com só os quatro cantos de uma fotografia frontal
(sem rotação de lado), **não há informação suficiente para recuperar a proporção real quando a zona
não está centrada verticalmente com a câmara** — é preciso mais um dado (por exemplo, a distância
focal da câmara, muitas vezes disponível nos metadados EXIF da fotografia, ou assumir-se uma
inclinação típica). Isto não estava identificado no handoff nem nas decisões pendentes da secção 8.
Fica como uma 4.ª decisão pendente, a somar às três da secção 8 do handoff:
- **8.4 (nova).** Como fechar a proporção largura/altura quando a zona não está centrada
  verticalmente na fotografia (o caso comum de um avaliador a fotografar de baixo para cima): usar a
  distância focal dos metadados EXIF da fotografia (se disponível), pedir mais um ponto de referência
  ao avaliador, ou aceitar um erro maior nestes casos e avisar a pessoa. Sem decisão, por agora.

Os testes obrigatórios 3 a 9 da secção 6 do handoff (confirmação, vãos, varandas, cores, acessos, sem
base de dados nas funções de domínio — este último já cumprido por `retificarZona` — e o caso real)
ficam para quando se retomar este trabalho; o teste 9 em concreto só é possível depois de decidida a
8.4 acima.

## 03/11/2026 — Medição de zonas: decisão parcial da 8.4, correção aproximada com inclinação assumida

O promotor testou `retificarZona` ao vivo contra uma fotografia real (prédio em Viana do Castelo,
alçado com R/C comercial e duas colunas de varandas abertas, fotografado de baixo) e pediu, perante a
indeterminação encontrada (8.4 acima): **"avança com a correção aproximada, assumindo uma inclinação
típica."** Isto fecha a 8.4 parcialmente — escolhe a opção "aceitar um erro maior nestes casos", não
as outras duas (EXIF, pedir mais um ponto), que ficam por explorar se este modo se revelar
insuficiente no piloto.

**O que se construiu:** `retificarZona` ganha um parâmetro opcional, `inclinacaoAssumidaGraus`. Sem
ele, o comportamento não muda (tenta resolver a inclinação a partir dos cantos, falha quando a zona
não está centrada no eixo ótico). Com ele, salta essa tentativa e usa o valor dado diretamente na
equação `H cosθ = W·R` — que, confirmado algebricamente e por teste numérico (novo teste em
`retificacao.test.ts`), **não depende do deslocamento vertical da zona**: o resultado fica exato se a
inclinação dada for a real, e erra proporcionalmente ao erro da suposição (verificado: 5º de erro na
suposição dão 3-4,5% de erro na proporção largura/altura — um erro que cresce devagar, ao contrário do
erro do sistema indeterminado, que pode ser grande e imprevisível, como nos ~9% medidos no caso real).
`INCLINACAO_TIPICA_GRAUS_PROPOSTA = 20` é um valor de partida — **não confirmado, só uma primeira
estimativa minha para avaliador a fotografar de pé um prédio de vários pisos** — a confirmar ou
corrigir no piloto (secção 7 do handoff). O resultado de `retificarZona` ganha o campo `aproximado`
(booleano), para o ecrã (quando existir) poder avisar o avaliador de que o número é uma aproximação,
não uma medição exata.

**Teste manual contra a fotografia real do promotor (entrada de prédio em Viana do Castelo, calibrada
com a largura da entrada R/C, 1,65 m, dada pelo promotor):** cantos tocados à mão sobre a fotografia
(sem ecrã, só visualmente) deram uma altura da entrada (padieira ao passeio, incluindo as escadas) de
≈3,70 m, e uma largura/altura do corpo central do alçado de ≈2,5 m × ≈10,9 m (≈27 m²) — estes números
não passaram por `inclinacaoAssumidaGraus` (foram calculados antes desta funcionalidade existir, só
com o modo normal) e ficam só como registo de teste, não como medição fiável: cantos tocados à mão,
sem precisão de ecrã tátil, e sem o alçado completo medido (só o corpo central; faltam as duas colunas
de varandas e o R/C comercial, que precisariam cada um da sua própria zona). Não se repetiu o cálculo
com o modo aproximado sobre esta fotografia nesta sessão.

**Confirmação do promotor (mesma sessão, logo a seguir):** a entrada medida com fita tem 3,77 m de
altura (e 1,65 m de largura, já conhecida) — os mesmos valores do caso real do handoff original
(secção 6, teste 9), confirmando que é a mesma entrada física. Com isto há, pela primeira vez, uma
comparação real contra uma medida com fita (o que a secção 7 do handoff pede para o piloto, embora
este não seja ainda o piloto formal — é um só ponto, não um prédio de referência medido por inteiro).

| Estimativa | Altura calculada | Erro |
|---|---|---|
| Cantos grosseiros, sem correção | 3,70 m | -1,9% |
| Cantos grosseiros, com 20º assumidos | 3,95 m | +4,8% |
| Cantos refinados (jambas medidas ao pixel), sem correção | 4,27 m | **+13,3%** |
| Cantos refinados, com 20º assumidos | 4,54 m | **+20,5%** |

**Achado, não ruído de medição.** Medindo as duas jambas da porta ao pixel (não a olho), a largura do
vão sai **maior no topo (201 px) do que na base (180 px)** — o contrário do que a inclinação simples
da câmara prevê — e o desvio angular dos quatro cantos chega a **5,3º**, acima da tolerância proposta
(2º, secção 8.1). Ou seja: **o próprio `desvioAngularDosCantos` já assinalaria esta zona concreta como
"a zona não parece retangular" e mandá-la-ia para revisão** — o mecanismo de alarme funciona
corretamente aqui, mesmo que o número de área, isolado, pareça só "um bocado errado".

A razão não é um erro de cálculo: esta entrada é um **vão recuado**, com escadas que se afastam para
dentro do prédio — não é uma superfície plana, é a mesma classe de problema que varandas salientes
(secção 2, "Limite conhecido" do handoff), só na direção contrária (para dentro, não para fora).
`retificarZona` assume uma fachada plana; aplicá-la a um recuo dá um resultado sem significado, por
mais que se afinem os cantos — confirmado aqui por quatro tentativas, todas com erro diferente e sem
convergir.

**Consequência para o piloto (secção 7 do handoff):** a validação com fita métrica deve medir uma
**fachada lisa, sem recuos nem saliências** (ex. a parte plana de uma parede), não um vão de entrada —
só assim se testa o que `retificarZona` foi construído para medir. Este ponto de dados fica registado
como primeira pista, não como validação ou invalidação da fórmula: o erro vem do objeto fotografado,
não comprovadamente da matemática.

## 03/11/2026 — Pivot: áreas pelo volume declarado, não por retificação de fotografia

O promotor comparou com uma app feita por outra sessão em 1/20 do tempo, com um modelo 3D
declarativo (fachadas, varandas, marquises, sub-áreas com cores, erro na ordem do cm²) e pediu para
abandonar a via da foto-com-dois-pontos. Decisão: `retificarZona` fica construído e testado (passo 1
da ordem do handoff de 03/11/2026), mas **não se continua por aqui** — os passos seguintes dessa
ordem (confirmação, vãos por foto, ecrã de marcação) não se constroem. Em vez disso, aproveita-se o
modelo 3D declarativo que já existia neste projeto (`src/domain/volume.ts`, construído a 30-31/10 e
01/11/2026, antes desta sessão) e liga-se a cálculo de área real.

**O que se construiu:**
- `volume.ts`: `FaceKind` ganha `'marquise'`; `VolumeInput` ganha `temMarquises` (nunca ao mesmo
  tempo que `temVarandas` no volume genérico — um prédio com os dois tipos teria de declarar zonas
  próprias, fora deste modelo). A geometria dos quads (em metros reais, antes de rodar e projetar)
  foi extraída para `gerarQuads`, exportada — para `volumeAreas.ts` somar área sobre a MESMA
  geometria que desenha o volume, nunca uma conta à parte que possa divergir.
- `src/domain/volumeAreas.ts` (novo, testado): `areasDoVolume(input)` soma área real (m²) por
  categoria — fachadas (líquidas, com o desconto de vãos > 1 m² da secção 3.3 do handoff original,
  agora finalmente implementado), empenas, varandas, marquises. Marquises mostram-se mas nunca
  entram no total a pintar (secção 3.4 do handoff: fechadas, não pintadas).
- `src/components/BuildingVolume.tsx`: cor própria para marquise (azulado, como vidro).
- `src/app/demo-areas/` (novo): ecrã de teste, sem autenticação, fora do produto (mesmo padrão de
  `demo-orcamento`/`demo-comparador`) — formulário com as dimensões reais declaradas (forma, pisos,
  fachadas livres, frente/fundo/pé-direito em metros, janelas por piso, varandas/marquises/nenhuma),
  o volume 3D ao lado (reaproveita `VolumeViewer`, já rodável por arrasto) e a área por categoria,
  com cor a condizer. Verificado num browser real (Playwright): sem erros de consola, sem scroll
  horizontal em 390px (telemóvel), as três combinações (nenhuma/varandas/marquises) desenham e somam
  corretamente.

**O que ficou por fazer, de propósito, por falta de tempo nesta sessão:** ligar este ecrã ao fluxo
real (hoje é só uma rota de teste, sem gravar nada); cores por zona escolhidas pelo cliente (secção
3.5 do handoff original); o resto do que a via da fotografia ainda prometia (vãos marcados na
fotografia, confirmação por dois pontos extra) fica arquivado nas secções 8/8.4 — não decidido como
abandonado, só não prosseguido.

`npm test` (1569 testes), `npm run typecheck`, `npm run lint` e `npm run build` a zero.

## 03/11/2026 — Medir uma zona a partir de fotografias, ligado ao ecrã de teste

O promotor reparou que `/demo-areas` não tinha nenhuma via de medição por fotografia — só a
declarativa. `retificarZona` já existia e estava testado desde a sessão da manhã, mas nunca tinha
ecrã nenhum. Construída uma primeira versão (um corpo com quatro cantos + um só segmento A/B); o
promotor pediu logo a seguir para afinar o fluxo antes de ficar fechado:

1. Importar fotografias **uma de cada vez** ("Importar foto"), podendo repetir para a mesma fachada.
2. Em cada fotografia, o primeiro passo é marcar **um ou mais segmentos que já se mediu com fita
   métrica** (ponto A, ponto B, comprimento real) — não os quatro cantos primeiro, como a primeira
   versão (e como o handoff original) tinham. Pode marcar-se mais do que um segmento na mesma foto.
3. Só depois, opcionalmente, marcam-se os quatro cantos de uma zona retangular, para calcular área
   (usa-se sempre o primeiro segmento como referência de escala).
4. Cada fotografia mostra o seu próprio cálculo, **lado a lado, sem se fundirem automaticamente**:
   combinar números de fotografias diferentes sem saber que correspondem exatamente à mesma medida
   seria inventar um valor — exactamente o que `src/domain/geometria.ts` já recusa fazer ("nunca
   inferir geometria a partir de áreas insuficientes"). A comparação entre fontes fica para a pessoa.

**Construído:** `src/app/demo-areas/MedirZona.tsx` — um SVG posicionado exatamente sobre a imagem
(viewBox nas dimensões naturais da foto, a mesma unidade de pixel que `retificarZona` espera, sem
contas de escala à parte) recebe o toque; uma **lupa** (`Lupa`, um `<canvas>` que desenha um recorte
ampliado 4× da própria fotografia, com mira) segue o dedo/cursor durante a colocação de cada ponto,
posicionada sempre acima-à-esquerda para nunca tapar o ponto a marcar — o pedido explícito do
promotor ("indicando com precisão, zoom in na foto"), que também já estava no handoff original
("Lupa para ajustar cada ponto") e nunca tinha sido construído. Cada segmento tem a sua própria cor;
os marcadores dos cantos e dos segmentos estão rotulados (1-4 para cantos, 1A/1B, 2A/2B… para
segmentos). Duas seleções no ecrã principal ("a largura medida vai para"/"a altura medida vai para":
Frente/Fundo/Pé-direito) deixam aplicar o resultado de uma fotografia aos campos do volume
declarativo com um clique ("Usar esta medida").

**Um limite físico, não de código, repetido aqui para não se perder:** nenhuma fotografia sozinha
carrega escala — é sempre preciso pelo menos uma distância real conhecida por segmento. Isto não é
diferente de qualquer outra ferramenta que dê medidas em metros a partir de uma foto.

**Verificado contra a fotografia real do promotor (a mesma entrada de 1,65 m × 3,77 m):** marcados
dois segmentos (topo do vão e base do vão, 165 cm e 198 cm) e os quatro cantos — o resultado
reproduz **exatamente** o achado manual de mais cedo: "Em revisão: a zona não parece retangular"
(desvio dos cantos: 5,3º, igual ao calculado à mão), largura 1,65 m, altura 4,27 m, igual ao script
de verificação manual. O aviso "Cálculo feito só com o segmento 1… a confirmação cruzada ainda não
está construída" aparece quando há mais do que um segmento — honesto sobre o que falta (secção 3.2
do handoff, confirmação, continua por construir). O botão "Usar esta medida" passa a "Usar esta
medida mesmo assim" quando o resultado está em revisão. Testada também a importação de uma segunda
fotografia (cartão independente, com o seu próprio cálculo). Tudo verificado num browser real
(Playwright): a lupa aparece e desenha ao mover o rato/dedo, os cliques colocam os pontos certos, sem
erros de consola, sem scroll horizontal em 390px.

`npm test` (1569 testes), `npm run typecheck`, `npm run lint` e `npm run build` a zero.

## 03/11/2026 — "Concluir medição": resumo das zonas e um total, em vez de cada foto isolada

O promotor reparou que, depois de marcar as zonas, não havia nenhum ponto final — cada fotografia
ficava com o seu resultado isolado, sem nada a juntar tudo. Acrescentado a `MedirZona.tsx`:

- Cada fotografia reporta o seu resultado ao componente principal (`onResultado`, por `useEffect`
  com as dependências nos valores do resultado — nunca no objeto inteiro, que é novo a cada
  render — para nunca entrar num ciclo de novas renderizações).
- Um cartão **"Resumo das zonas medidas"**, com uma linha por fotografia com resultado, uma caixa de
  seleção por linha (desmarcada por omissão quando a zona está "em revisão" — nunca se soma por
  omissão algo que o próprio sistema já assinalou como duvidoso) e o total das zonas marcadas.
- Um botão **"Concluir medição"** que entrega esse total ao ecrã principal, mostrado num cartão
  próprio, **"Área medida por fotografia"** — separado de propósito do "Total a pintar" do volume
  declarado: são duas contas diferentes (uma mede zonas específicas que se fotografaram, a outra
  estima o prédio inteiro a partir de dimensões declaradas) e somá-las sem saber que não se
  sobrepõem seria inventar um número.

Verificado num browser real: a zona "em revisão" nasce desmarcada (total correto em 0,00 m²);
marcá-la e clicar "Concluir medição" leva o valor certo (7,05 m²) até ao cartão "Área medida por
fotografia". Sem erros de consola.

`npm test` (1569 testes), `npm run typecheck`, `npm run lint` e `npm run build` a zero.

## 03/11/2026 — Corrigido: marcar os quatro cantos podia duplicar um ponto por toque

O promotor relatou, ao testar `/demo-areas` a sério: marcou os quatro cantos, desfez e voltou a
marcar, e a zona nunca mais "fechou" — o resultado não aparecia, sem explicação.

**Causa:** o toque usava `onPointerUp`, e o guarda que impede mais do que quatro cantos lia
`foto.cantos.length` do valor da prop (capturado na renderização anterior), não do estado vivo. Num
ecrã real — ao contrário dos cliques sintéticos e limpos do Playwright —, dois eventos de ponteiro
por um só toque (rato + emulação tátil, por exemplo) podiam chegar antes de o componente voltar a
renderizar: os dois viam `cantos.length < 4` e os dois empurravam um canto, duplicando um ponto e
desalinhando a ordem dos quatro cantos (o terceiro clique real ficava a valer como quarto, e por aí
fora) — exatamente o "nunca fechou" que o promotor descreveu.

**Correção, duas camadas:**
1. A decisão (que ponto é este, se já há quatro cantos) passa a correr sempre dentro do atualizador
   funcional do `useState`, sobre o estado vivo — nunca sobre a prop `foto`. Esta é a correção real:
   mesmo que dois eventos cheguem antes de renderizar, cada um vê o resultado do anterior.
2. O toque passa de `onPointerUp` para `onClick` — um evento que o browser já garante uma só vez por
   interação discreta, em vez de depender só da camada 1.

Corrigido também o mesmo erro em "Desfazer último ponto": com um ponto A pendente (segmento ainda
sem B), desfazer tirava esse ponto **e também** o último segmento já completo, ao mesmo tempo — dois
erros diferentes tratados como um só. Agora desfaz só o que está a meio.

Acrescentado "Recomeçar esta fotografia" (limpa cantos, segmentos e o ponto pendente de uma zona),
como válvula de escape independente destas correções — nunca deve ser preciso, mas um utilizador
confuso a meio de uma sequência de pontos precisa de conseguir recomeçar sem ambiguidade.

Verificado num browser real: sequência de marcar/desfazer/remarcar os quatro cantos termina sempre
com exatamente quatro pontos, o polígono fecha certo, e "Recomeçar esta fotografia" limpa tudo.
**Não foi possível reproduzir aqui o evento duplicado em si** (o Playwright só gera um evento por
clique) — a correção assenta no raciocínio sobre a causa, não numa reprodução direta; o promotor é
quem pode confirmar em definitivo num ecrã tátil real.

`npm test` (1569 testes), `npm run typecheck`, `npm run lint` e `npm run build` a zero.

## 03/11/2026 — Ajustar o volume a uma fotografia: câmara de perspetiva real, problema direto

O promotor apontou o problema de fundo de medir zona a zona: "dariamos trabalho interminável ao
avaliador". Pediu uma estratégia que conjugasse o volume 3D declarado com a geometria do prédio na
fotografia — ajustar o modelo até bater 100% com a perspetiva da foto, com as referências reais a
dar a escala. Isto é um pedido diferente, e melhor, do que o que se tinha construído até aqui:

- `retificarZona` (manhã) resolve o **problema inverso**: dados pontos tocados numa foto, descobrir
  a câmara e a geometria — confirmado mal-condicionado fora do caso centrado.
- Isto pede o **problema direto**: dados os parâmetros da câmara e do prédio, calcular onde cada
  ponto cai no ecrã. É geometria simples (uma câmara pinhole, projeção em perspetiva), sem
  ambiguidade nenhuma — a pessoa, a ver a fotografia, é que resolve o ajuste por tentativa, com os
  olhos; o código só faz a conta directa.

**Construído:** `src/domain/perspectiveCamera.ts` (puro, testado): uma câmara pinhole parametrizada
por `distanciaM` (a que distância se estava), `alturaOlhoM` (a que altura), `azimuteGraus` (o mesmo
ângulo já usado em `VolumeInput.angulo`) e `fovVerticalGraus` (a lente) — a câmara olha sempre para
o centro do prédio a meia altura, nunca um parâmetro de inclinação à parte que possa contradizer o
alvo. `projetarVolume` reaproveita `gerarQuads` (a mesma geometria que já desenha o volume e calcula
as áreas) e projeta cada quad para pixels da fotografia.

**Um erro de sinal apanhado pelos testes antes de chegar a produção:** a primeira versão tinha o
produto vetorial do vetor "direita" da câmara trocado (`cross(frente, cima)` em vez de
`cross(cima, frente)`) — um ponto a X positivo do mundo projetava-se à **esquerda** da imagem,
contrariando a própria convenção já estabelecida em `volume.ts` (a fachada "direita" está no X
positivo — `FACHADA_LABELS`, `planos[]`). Um teste a verificar essa convenção apanhou-o logo (8
testes, 2 a falhar na primeira versão); corrigido antes de qualquer teste manual.

**Ecrã** (`src/app/demo-areas/AjustarFotografia.tsx`): importa-se uma fotografia, desenha-se o
volume por cima (preenchimento semi-transparente, cor por categoria — as mesmas de
`BuildingVolume.tsx`, mais lima para marquises), e quatro deslizadores (distância, altura do olho,
ângulo de observação, campo de visão) ajustam a câmara em tempo real. **As dimensões reais
continuam a vir do formulário principal** (frente, fundo, pé-direito, pisos, janelas, varandas) — já
partilhado com o visualizador 3D abstrato e com `areasDoVolume`; esta ferramenta não duplica esses
campos, só mostra como esse volume real fica naquela fotografia.

**Verificado contra a fotografia real do promotor**, com o formulário a 14m de frente, 13m de fundo,
6 pisos, 3m de pé-direito: com os valores por omissão da câmara (10m, 1,6m, 0º, 65º) o desenho já
cai razoavelmente perto do prédio na foto (as linhas de janelas alinham-se aproximadamente); ajustar
a distância para 7m e a altura do olho para 1,2m aumenta e desloca o desenho de forma consistente
com o que se espera (mais perto = maior; olho mais baixo = muda a perspetiva verticalmente) —
confirma que os deslizadores respondem como uma pessoa esperaria ao tentar encaixar visualmente.
Não ficou perfeitamente alinhado nesta sessão (não era o objetivo — é a pessoa, com mais tempo e a
fotografia à frente, que afina o encaixe); o mecanismo está verificado a funcionar.

`npm test` (1577 testes), `npm run typecheck`, `npm run lint` e `npm run build` a zero.

## 03/11/2026 — Correção estrutural: um só fluxo (descrever → dar escala → área), não três ferramentas soltas

O promotor testou a sério e apontou, com razão, um problema estrutural: o ecrã tinha três
ferramentas lado a lado sem se falarem — `MedirZona.tsx` (segmentos + 4 cantos → área só dessa
zona), `AjustarFotografia.tsx` (câmara visual, sem ligação nenhuma às medidas) e o formulário do
volume (Frente/Fundo/Pé-direito só mudavam escrevendo à mão). Marcar os 4 cantos e premir "Concluir
medição" nunca mudava o "Total a pintar" — eram contas diferentes, nunca ditas como tal com clareza
suficiente. Nas palavras do promotor: *"devias começar por criar o volume com base nos dados
extraídos da foto... e com base nas medições dadas, dimensionar o tamanho/escala, calculando depois
as áreas."*

**Reconstrução, um ecrã, três passos em sequência, nunca três ferramentas paralelas:**

1. **Descrever o prédio** — o formulário de sempre (forma, pisos, fachadas livres, janelas,
   varandas), sem mudanças de fundo, só reordenado e identificado como "Passo 1".
2. **Dar escala a partir de uma fotografia** — `AjustarFotografia.tsx`, reescrito: a mesma
   fotografia mostra ao mesmo tempo o volume projetado (para conferir visualmente a descrição do
   passo 1) **e** permite marcar distâncias medidas com fita métrica (dois pontos, lupa). Cada
   distância marcada tem um seletor — "esta medida corresponde a: Frente / Fundo / Pé-direito" — e
   um botão "Aplicar" que **escreve diretamente esse campo**. Os deslizadores da câmara (distância,
   altura do olho, ângulo, campo de visão) ficam só para conferir o encaixe visual; nunca mudam
   nenhuma medida sozinhos.
3. **Volume e área por categoria** — inalterado (`areasDoVolume`), mas agora genuinamente a jusante
   dos dois passos anteriores: muda sozinho assim que o passo 2 escreve um campo.

**O que se eliminou:** `MedirZona.tsx` (apagado) e, com ele, a marcação dos quatro cantos de uma
zona, o "Resumo das zonas medidas" e o botão "Concluir medição" — eram precisamente a parte que dava
a entender, erradamente, que calculavam a área do prédio. `retificarZona`
(`src/domain/retificacao.ts`) e os seus testes mantêm-se intactos no domínio — a lógica continua
válida e testada, só deixou de ter ecrã próprio; pode voltar a ter um, no futuro, para medir uma
zona concreta que não encaixe no modelo genérico, mas não como via principal.

**Verificado num browser real, de ponta a ponta:** com o formulário do passo 1 por omissão (Frente
14 m), "Total a pintar" = 571,68 m²; marcada a distância real do vão de entrada (165 cm,
topo-esquerdo a topo-direito) e aplicada como "Frente", o campo Frente muda para 1,65 m **e o Total
a pintar recalcula sozinho para 314,16 m²** — sem precisar de nenhum botão "concluir" à parte. Sem
scroll horizontal em 390px, sem erros de consola.

`npm test` (1577 testes), `npm run typecheck`, `npm run lint` e `npm run build` a zero.

## 04/11/2026 — Medir uma fachada por fotografia: homografia com uma referência medida, e o volume montado com o que se mediu

O promotor testou a versão de 03/11 (câmara de perspetiva com deslizadores) e respondeu "não
funciona": as linhas desenhadas sobre a fotografia não batiam com o prédio, e o volume 3D era uma
laje fina — as medidas da porta (165 × 377 cm) iam parar à Frente e ao Pé-direito do prédio. Pediu,
nas suas palavras, para "criar o volume com base nos dados extraídos da foto, com janelas, varandas,
etc, e com base nas medições dadas, dimensionar o tamanho/escala calculando depois as áreas".

**Porque o motor mudou.** Encaixar uma câmara à mão (4 deslizadores, 8 graus de liberdade) nunca
fecha. Um retângulo medido no plano da fachada — os 4 cantos de uma porta, largura e altura reais —
fixa os 8 graus de liberdade de uma **homografia** plano → imagem, exatamente e sem ajuste nenhum
(`src/domain/homografia.ts`: DLT com normalização de Hartley, vetor próprio por Jacobi). Uma aresta
vertical comprida do prédio (um canto, um tubo de queda) acrescenta o ponto de fuga vertical como
restrição com peso, e corrige o que a referência curta mede mal: a inclinação de quem fotografa de
baixo. Com a homografia, qualquer ponto da fotografia passa a metros no plano da fachada.

**Precisão, medida (testes de `homografia.test.ts`, câmara sintética com ruído de ±2 px, 300
ensaios):** larguras a ~1 %; alturas a 1–1,5 % com uma aresta comprida, contra 3–6 % só com a
porta. **Contra a fotografia real do promotor:** com a porta (165 × 377 cm) e a aresta direita do
corpo branco, uma segunda aresta, independente, sai vertical a 0,07 m em 14,5 m de altura.

**O ecrã** (`/demo-areas`, `src/app/demo-areas/MedirFachada.tsx`), quatro passos, um de cada vez:

1. **Fotografia** — importar (reduzida a 2000 px no browser; não sai do aparelho).
2. **Referência** — tocar nos 4 cantos de algo medido (com lupa), escrever largura e altura em cm;
   recomendado marcar uma aresta vertical comprida. `problemaDaReferencia` diz o que está mal
   (ordem dos cantos, polígono não convexo) em vez de deixar avançar.
3. **Desenhar** — a fotografia aparece **endireitada e à escala** (grelha de 1 m,
   `src/app/demo-areas/endireitar.ts`); arrasta-se o contorno, o R/C, os vãos, as marquises e as
   varandas. Depois do contorno, a vista enquadra-se nele (≈3× mais píxeis por metro — no telemóvel
   é o que torna possível desenhar uma janela). Um interruptor leva o desenho de volta à
   fotografia original pela homografia, para conferir que bate com o prédio.
4. **Áreas e volume** — `areasDaFachada` (`src/domain/fachadaMedida.ts`): contorno − R/C (fora por
   omissão, 8.3) − marquises − vãos > 1 m², por união e diferença exatas de retângulos; varandas
   contam como pintadas (frente) e as faces interiores ficam por medir (8.2). O **volume** já não
   é o genérico de `VolumeViewer`: `src/app/demo-areas/modelo3d.ts` monta-o com o que se mediu —
   paredes à escala, cada zona no sítio exato e com as cores do desenho, marquises e varandas como
   caixas salientes, paredes não medidas a tracejado. "Guardar e medir outra fachada" põe a lateral
   na sua parede e dá o fundo; o total do prédio soma as fachadas.

O volume é feito só de retângulos coloridos, nunca da fotografia (regra 6).

**Exemplo na fotografia do promotor** (zonas desenhadas por mim num teste automático, lendo a vista
endireitada — é um exemplo do mecanismo, não uma medição de avaliador): contorno 11,07 × 19,92 m =
220,52 m²; R/C 44,28 m² (fora); marquises 20,07 m²; vãos 22,99 m²; varandas 40,77 m² (incluídas);
**a pintar 133,18 m²**.

**Dois erros apanhados no teste de ponta a ponta, antes de chegar ao promotor:** (1) a camada de
toque tinha altura zero (um `div` relativo sem altura dentro de um absoluto) — nenhum toque na
fotografia chegava ao código; (2) só 5 de 18 retângulos ficavam desenhados: arrastar selecionava
texto da página e o arrasto seguinte, começado sobre a seleção, virava arrastar-e-largar do browser,
que cancela o ponteiro sem aviso. Corrigido com `preventDefault` no `pointerdown` e `select-none`.

**Limites conhecidos, ditos ao avaliador no ecrã:** só o plano da fachada é métrico — varandas e
marquises saem da parede e aparecem maiores e inclinadas (desenhar pela linha onde encostam à
parede); a referência tem de estar no plano da parede (a abertura de uma entrada recuada, não a
porta lá dentro). Sem correção da distorção da lente.

**O que saiu do ecrã:** `DemoAreas.tsx` (formulário + volume genérico) e `AjustarFotografia.tsx`
(deslizadores da câmara). Ficam no domínio, testados e sem ecrã: `retificacao.ts`,
`perspectiveCamera.ts` (usada como câmara sintética nos testes da homografia) e `volumeAreas.ts`.

Verificado num browser (Chromium) com a fotografia real, em 1280 px e em 390 px: 18 de 18 zonas
desenhadas, os mesmos 133,18 m² nos dois, sem scroll horizontal, sem erros de consola.
`npm test` (1617 testes), `npm run typecheck`, `npm run lint` (28 avisos, os de antes, nenhum nos
ficheiros novos) e `npm run build`, todos com código de saída 0.

## 04/11/2026 (tarde) — Medição de fachadas, segundo teste do promotor: contorno primeiro, séries, triângulos, e a altura explicada

O promotor testou `/demo-areas` com outra fotografia (prédio R/C + 5 andares, tirada de lado) e
relatou três coisas:

1. **"Não consigo passar para o ponto 4."** Tinha desenhado 35 zonas — R/C, varandas, marquises, 29
   vãos — mas nunca o contorno da fachada, e o botão ficava desativado com o motivo escrito em
   letra pequena no fundo da página. Erro da ferramenta, não dele: nada o impedia de começar pelas
   janelas. **Agora o contorno é o primeiro passo obrigatório** — os outros tipos ficam desativados
   até haver contorno, a instrução está por cima da imagem, e depois do contorno a ferramenta passa
   sozinha para "Vãos". Sem contorno, também a vista não se enquadra no prédio — por isso as zonas
   dele eram tão pequenas de desenhar.
2. **"Dá muito trabalho."** Desenhar em série: o primeiro e o último elemento de uma coluna (ou
   linha) e quantos são — os do meio interpolam-se (`zonasEmSerie`, com o número sugerido por
   `contagemSugerida`, um por piso de 2,9 m). No teste automático com a fotografia anterior, 18 zonas
   passaram de 18 arrastos a 8. Também: **acertar uma zona** (tocar nela — fica escolhida, com
   pegas — e arrastar a aresta ou o canto), **Desfazer** para tudo (instantâneos), "Apagar a
   escolhida", e a lista agrupada por tipo com contagem e total (35 linhas corridas obrigavam a
   descer o ecrã inteiro).
   *Apanhado no teste de ponta a ponta antes de publicar:* na primeira versão, qualquer arrasto
   começado a 14 px de uma aresta acertava essa zona em vez de desenhar — desenhar um triângulo
   encostado ao contorno subia o contorno. Daí a regra: **só as arestas da zona escolhida com um
   toque se arrastam**; arrastar noutro sítio desenha sempre.
3. **Uma parte da fachada é triangular** (por cima do telhado vizinho); tinha posto "um retângulo
   a meio termo, a olho". **Zonas triangulares**: metade do retângulo cortado na diagonal, com o
   ângulo reto num dos quatro cantos (escolhido por botões com o desenho da forma; depois de cada
   triângulo, a forma volta a retângulo). As áreas continuam **exatas**: `areaOnde` passou da
   compressão de coordenadas a faixas verticais cortadas nos x de todas as formas e nos cruzamentos
   das retas — em cada faixa, cada pedaço é um trapézio. Com só retângulos dá exatamente o mesmo de
   antes (os testes anteriores passam sem mudança); um teste compara com uma amostragem de 2 cm em
   formas misturadas e sobrepostas (diferença < 0,3 %).

**A dúvida da altura ("R/C de 3,77 m + 5 andares não pode ter 20 m").** Tem: medido na fotografia
pela distância entre janelas de pisos seguidos — que não depende só da referência — o R/C vai até
4,0 m (a porta de 3,77 m mais padieira e laje), cada piso tem ~3,0 m de piso a piso (pé-direito
livre de ~2,7 m mais a laje de ~0,3 m) e sobram ~0,6–1 m de platibanda/cobertura: 4,0 + 5 × 3,06 +
0,6 = 19,9 m. O passo 4 passou a mostrar esta leitura (`leituraDeAlturas`: mediana da distância
vertical entre zonas iguais na mesma coluna) e a decomposição da altura, e avisa em texto âmbar se
a altura entre pisos sair de 2,7–3,2 m — sinal de referência mal medida ou mal tocada. É a
confirmação cruzada que a secção 3.2 do handoff pedia, feita com o que já se desenha.

Verificado em Chromium (1280 px e 390 px) com a fotografia anterior: 19 verificações automáticas, das
quais as do contorno bloqueado, da série, de acertar e desfazer, do triângulo (220,52 + 3,69 =
224,21 m²) e da leitura (3,06 m entre pisos); sem scroll horizontal, sem erros de consola.

## 04/11/2026 (fim da tarde) — Marquises e R/C: duas regras corrigidas pelo promotor

Terceiro teste do promotor (a fotografia do prédio R/C + 5 andares, toda a fachada desenhada): as
marquises descontavam **152,90 m²** e o R/C **54,91 m²**. As duas regras vinham do handoff de
03/11/2026 e estavam erradas:

1. **Marquises.** O handoff (secção 3.4) dava-as por "fechadas, não pintadas" e descontava-as
   inteiras. O promotor corrigiu: uma marquise é uma caixa saliente **com parede própria** — a janela
   original da fachada passa a porta (por dentro, não se vê), a marquise tem as suas janelas (à frente
   e às vezes de lado) e **paredes laterais novas** — na fotografia, a da esquerda tem parede à
   esquerda e outra à direita, virada para dentro da varanda vizinha. Regra nova
   (`areasDaFachada`): a frente da marquise **pinta-se**, os vidros descontam-se **desenhados como
   vãos** (com a regra do 1 m²), e as paredes laterais **acrescentam** altura × saliência. A saliência
   é medida à fita (a fotografia de frente não a mostra) — campo no passo 4; sem ela, as laterais
   aparecem "por medir", nunca estimadas. Um lado encostado a outra marquise (lado a lado) não é
   exterior e não conta; empilhadas, contam todas. O volume 3D usa a saliência medida.
2. **R/C.** A decisão 8.3 estava "proposta: fica fora por omissão". O promotor: "o R/C de um prédio é
   para pintar em princípio". Passa a **contar por omissão**, com "Excluir o R/C" para quando as lojas
   tratam da sua frente. As montras e portas do R/C descontam-se desenhadas como vãos (os −54,91 m²
   eram o R/C inteiro, não as montras — o que confundiu o promotor).

**Por confirmar com o promotor:** o tecto exterior da marquise mais baixa (a face de baixo, à vista
da rua) — hoje não conta; e, nas varandas abertas, as faces interiores continuam por medir (8.2).

Verificado em Chromium (1280 e 390 px) com a fotografia anterior: sem saliência, pintável = contorno −
vãos (197,28 m²); com 1,2 m, sobe exatamente as laterais (22,37 m² = 5 marquises × 2 lados × 1,86 m
de altura média × 1,2 m); excluir o R/C tira exatamente os 44,28 m².

## 04/11/2026 (noite) — Medição de fachadas, quarta ronda: precisão, acerto do endireitamento, perspetiva das marquises, e a revisão independente

**Do promotor, depois do terceiro teste:**

1. **Tecto e cobertura das marquises** — "o teto da marquise de baixo também se pinta (apenas do piso
   mais baixo), mas também se pinta a cobertura da marquise no último andar". As marquises agrupam-se
   em colunas (umas sobre as outras, com sobreposição horizontal e larguras parecidas): tecto da mais
   baixa e cobertura da mais alta, largura × saliência; as paredes laterais vão de baixo a cima da
   coluna (o intervalo entre marquises desenhadas piso a piso é parede, não ar).
2. **Impermeabilização** — "sempre que haja corpos salientes (sem telha) deve ser questionado ao
   cliente, avaliador e pintor" (tela? asfáltica, líquida? só pintura?). Na ferramenta, a pergunta
   aparece ao avaliador quando há marquises; no produto fica em `EM_ABERTO.md` §3 — mexe no pedido,
   no levantamento e na proposta, e pede uma migração, por isso não se fez às escondidas numa rota
   de teste.
3. **Precisão nos cantos** — "ponteiro magnético como no Photoshop… aumentar o foco e a precisão do
   rato". **Íman nos cantos** (`cantos.ts`: resposta de canto num recorte à volta do dedo, com
   refinamento subpíxel; sem canto claro, o ponto fica onde se apontou), ligado por omissão e com
   interruptor; **lupa a 6×** (era 4×); e **arrastar um ponto já marcado move-o a um quarto da
   velocidade do dedo**, com a lupa em cima dele. Na fotografia do promotor, um toque a 6 px do canto
   da porta caiu no canto.
4. **Acertar depois de endireitar** — "o erro levou a ligeira inclinação do prédio". "Acertar o
   endireitamento": arrasta-se na vista endireitada ao longo de uma aresta que devia estar direita
   (vertical ou horizontal); a aresta vai para a calibração (`calibrar` ganhou arestas horizontais —
   ponto de fuga horizontal) e as zonas já desenhadas são levadas para a nova calibração no mesmo sítio
   da fotografia (`remapearZona`). "Desfazer" guarda zonas e acertos juntos.
5. **"Medir só a frente?"** — Desenhar a frente inteira, tal como se vê (a coluna de marquises ou de
   varandas de baixo a cima, de uma vez), e os vidros depois como vãos. Mas a frente de uma marquise
   está mais perto da câmara: na vista endireitada aparece **maior** (na fotografia do promotor, com
   1,2 m de saliência, 16 % maior). **Correção da perspetiva:** a posição da câmara tira-se da própria
   fotografia (`camaraDaHomografia` — a focal pela ortogonalidade das direções da fachada; na
   fotografia do promotor, a câmara estava a 8,7 m da fachada) e as marquises e os vidros delas
   levam-se ao tamanho verdadeiro (`corrigirSaliencias`). Numa fotografia tirada de frente a focal não
   se determina: não há correção, e o ecrã di-lo.
6. **"Indicações em grande, passo a passo"** — um painel "Agora" a 20 px por cima da imagem nos
   passos 2 e 3, com o que fazer e como, por tipo (incluindo a resposta ao ponto 5).

**Revisão independente (4 revisores, cada achado atacado por um cético): 16 confirmados, 5
recusados.** Corrigidos todos: laterais das marquises contavam fora do contorno e dentro de um R/C
excluído; marquises lado a lado desenhadas à mão (folga ou sobreposição de 10 cm) contavam a parede do
meio duas vezes; uma marquise triangular contava dois lados verticais; a leitura das alturas juntava
a porta e as montras do R/C (que a regra das montras manda desenhar como vãos) às colunas das janelas
— um piso a mais e um falso alarme; **no telemóvel, arrastar a aresta de cima de uma janela pequena
agarrava também um lado** e a janela ficava com metade da largura (a faixa de cada aresta passou a
não exceder um terço do lado, e um canto só no canto); o toque só contava abaixo de 2 px (passou a
10 px) e largar sem arrastar numa aresta não largava a escolha; as arestas passaram a mover-se pelo
deslocamento do dedo, não para a posição dele; uma série por criar perdia-se ao avançar; a saliência
passava para a fachada seguinte; "um marquise" e "o primeiro varanda"; ícones de forma a 25 % de
opacidade. Os vidros nas laterais das marquises passaram a ter campo próprio (não se veem de frente).

As duas peças com matemática própria (câmara/perspetiva e íman) foram feitas por agentes em paralelo,
cada uma atacada por um cético com testes adversariais e corrigida:

- **Câmara** (`homografia.ts`, 66 testes). Na fotografia do promotor: a 8,73 m da fachada e a **1,75 m
  do chão** — a altura de quem segura o telemóvel, o que confirma o cálculo sem depender da porta —,
  com 102° de campo de visão (grande angular 0,5×). O cético reproduziu três defeitos: (1) numa
  fotografia de frente tirada de longe, 1 px de erro nos cantos inventava uma câmara sem sentido (focal
  3,8 × a verdadeira) — **corrigido**: o ângulo mínimo fixo deu lugar a um teste ao próprio erro de
  toque (a focal tem de aguentar ±1 px nos cantos com menos de 25 % de incerteza, sabendo o tamanho
  real da referência); (2) a teleobjetiva 5× dos telemóveis era recusada — corrigido; (3) **uma só
  aresta horizontal de acerto endireita perto dela mas pode piorar longe dela** — não tem correção no
  cálculo (a informação não está numa linha só; experimentadas alternativas, todas pioram outros
  casos): o ecrã avisa (`avisoDasHorizontais`) e a instrução pede de preferência uma vertical, e
  horizontais só duas a alturas diferentes.
- **Íman** (`cantos.ts`, 27 testes). O cético reproduziu três casos em que devolvia um ponto a mais de
  1 px do canto em vez de desistir — aro escuro de porta de 3–4 px, formas mais pequenas do que a
  janela (barras, quadrados), e um raio grande a preferir o canto vizinho mais contrastado. Todos
  corrigidos: um canto tem de ter dois braços retos à volta; o refinamento ignora arestas que não
  passam pelo canto; a preferência pela distância já não depende do raio. Na fotografia do promotor,
  um toque a 6 px do canto da porta continua a cair no canto.

## 04/11/2026 (noite) — "Anular os acertos" desfazia o endireitamento a quem queria corrigir uma janela

O promotor achou o acerto do endireitamento "muito bom" (com uma horizontal, endireitou o prédio).
Depois, ao enganar-se nos limites de uma janela, carregou em "Anular os acertos" — estava ao lado de
"Desfazer", com um nome que se lê como "desfazer o último" — e o prédio voltou a ficar inclinado. O
trabalho não se perdeu ("Desfazer" devolve o acerto e as zonas, porque o acerto entra no histórico),
mas o ecrã induziu o erro. Agora: o botão saiu da linha de ações e passou a uma linha de estado
("Endireitamento acertado por 1 aresta. Retirar o acerto…") com confirmação; "Desfazer" passou a
"Desfazer o último passo", com a dica "Enganou-se? … para acertar uma zona já desenhada, tocar nela".
A ajuda (i) do passo 3 ainda mandava desenhar marquises "pela linha onde encostam à parede", ao
contrário da regra nova (a frente tal como se vê, corrigida com a saliência): corrigida.

## 04/11/2026 (noite) — Conferir a área, profundidade das varandas, e o volume com varandas e vidros

Três observações do promotor ao ver o passo 4:

1. **"No fim, não sei se a área está bem coberta."** O passo 4 passou a ter **Conferir a área**: a
   fotografia endireitada com o que se pinta a verde (o contorno), os vãos descontados em branco, os
   vãos até 1 m² (que se pintam) só contornados, o R/C excluído a cinzento e o que ficou fora do
   contorno contornado a âmbar. Se uma parte da fachada ficar sem verde, falta contorno; se o verde
   passar para fora do prédio, o contorno está grande. Na fotografia de teste, mostrou de imediato o
   que faltava desenhar (as montras do R/C e os vidros das marquises como vãos; o topo de uma coluna
   fora do contorno) — é a conferência que a lista de números não dava.
2. **"Quando adicionei a profundidade, o 3D ficou pior."** O campo era só das marquises: a correção
   da perspetiva encolhia as marquises e deixava a coluna de varandas ao lado no tamanho do desenho
   (maior), e as duas desencontravam-se. As varandas passaram a ter **profundidade própria** ("Quanto
   as varandas saem da parede"), com a mesma correção da perspetiva (a frente da coluna — guardas e
   lajes — está à frente da parede; as portas de varanda, na parede, não se corrigem). As faces de
   dentro das varandas continuam por decidir (8.2): com a profundidade medida já se podem contar, mas
   quais se pintam (tetos, guardas por dentro, paredes do recuo) é decisão do promotor.
3. **"Podia ter de imediato o desenho de varandas, assim como as janelas das marquises."** O volume
   desenha as varandas **piso a piso** — laje de 0,18 m, guarda à frente e guardas laterais de 1 m,
   semitransparentes — à altura entre pisos lida nas janelas, e os **vidros das marquises na frente
   delas** (antes ficavam na parede, escondidos atrás da caixa da marquise). Feito por um agente e
   atacado por um cético, que reproduziu três defeitos, todos corrigidos: (a) uma coluna desenhada
   "tal como se vê" (da base da primeira laje ao topo da última guarda) saía com **uma varanda a
   menos** — na fotografia do promotor, 4 em vez de 5; a repartição aceita agora as duas maneiras de
   desenhar a coluna (tal como se vê, ou por pisos inteiros) e escolhe a que dá a altura entre pisos
   mais próxima da lida; (b) a última guarda perdia 0,3 m sem haver piso acima; (c) uma coluna de
   varandas e uma de marquises desenhadas à mão a sobreporem-se 2 cm cruzavam as caixas e a ordem
   de desenho pintava guardas por cima da marquise — sobreposições pequenas cortam-se a meio, como
   no domínio. Na fotografia do promotor: 5 varandas, como no prédio.

## 04/11/2026 (noite) — Avaliação do método "Levantamento v7" e quatro correções que vieram dela

O promotor trouxe outro protótipo de levantamento por fotografia ("QuemPinta_Levantamento v7",
aplicação estática feita noutro sítio) e pediu só uma avaliação: "não é para aplicar, apenas para
avaliares se tem alguma estratégia ou mecanismo que reforce aquilo que estás a construir". Três
leitores (geometria, estrutura, fluxo) compararam-no com a nossa ferramenta e um cético por área
confirmou cada afirmação nos dois códigos (o código do zip foi lido, nunca executado).

**Conclusão.** O núcleo deles é mais fraco: a câmara tira-se só da proporção da porta na fotografia
(a via que abandonámos a 03/11 — numa simulação, com uma fotografia tirada de baixo, 20 % das
marcações não dão resultado e a focal erra 24 %), os testes são sem ruído (o de "duas fotografias"
usa a mesma fotografia copiada), cada janela pede 4 toques livres, a "esquadria" e o alinhamento entre
colunas mudam a geometria e apagam o erro em vez de o mostrar, e o relatório exportado leva as
fotografias (contra a regra 6). **Não identifica janelas sozinho**: o exemplo traz o prédio do
promotor com as janelas, varandas e marquises escritas à mão em `seed.js`, e o README diz três vezes
que não há reconhecimento visual — o promotor tinha ficado com essa ideia. Mas tem mecanismos de fluxo
bons, e quatro tapavam erros reais nossos, que se fizeram já:

1. **Medidas de controlo** (passo 2): uma segunda distância medida à fita, longe da referência,
   comparada com o desenho ("C1 · no desenho 7,40 m · à fita … · desvio …"), com aviso âmbar acima de
   3 % (`DESVIO_MAXIMO_DO_CONTROLO`; 1 % daria falsos alarmes com o ruído medido). Era o único
   instrumento capaz de ver uma largura mal escrita (90 cm em vez de 80 → todas as áreas +12,5 %, sem
   nenhum aviso — a leitura das alturas não o vê) ou uma porta recuada. Estava pedido no handoff de
   03/11 (§3.2) e nunca se tinha construído. O passo 4 resume ("Conferido com 1 medida à fita…" ou
   "Sem medida de controlo: a escala depende só da referência").
2. **Subtotal honesto**: `ResultadoFachada.porMedir` diz o que falta; sem a saliência, as laterais, o
   tecto e a cobertura das marquises entravam a zero e o ecrã mostrava "A pintar" como se fosse o
   total. Agora "Subtotal a pintar nesta fachada — falta: …" e "Subtotal do prédio".
3. **A mesma fachada nunca soma duas vezes**: guardar outra vez a "Fachada principal" somava-a duas
   vezes no total do prédio (e uma só no 3D). Agora substitui a anterior, dito no ecrã antes de
   guardar; só "Outra" se repete.
4. **A fotografia manda**: corrigir a referência depois de desenhar (um canto movido, a largura
   corrigida) deixava as zonas com os metros antigos. As zonas guardam agora a calibração em que estão
   escritas e vão para a nova através da fotografia sempre que ela muda (acertos, referência, desfazer).

Para depois (valor médio, por ordem): guardar no aparelho (um recarregamento perde o levantamento);
sobrepor as caixas das marquises à fotografia para conferir a saliência; tirar a saliência da própria
fotografia (marquises dos andares altos); zona "não se pinta" (azulejo, pedra); várias fotografias da
mesma fachada; mostrar quanto uma série discorda. E, da estrutura deles, **ligar fachadas vizinhas
pela esquina comum** (a mesma aresta nas duas fotografias: conferência da altura e junção no volume).
O que não se copia: a câmara deles, a esquadria que apaga o erro, pisos escritos por números, faces
obrigatórias a apagar depois, a exportação com fotografias, a planta em L/U só visual.

Sobre identificar as janelas sozinho — a ideia que o promotor viu no exemplo — o promotor deixou a
escolha ("por onde entendas ser melhor"): **deteção no próprio aparelho**, sobre a fachada já
endireitada (gratuita, a fotografia não sai do telemóvel), a propor e o avaliador a confirmar e
acertar à mão. A deteção com IA fica por decidir (privacidade e custo).

Verificado em Chromium (1280 e 390 px) com a fotografia real: controlo com desvio ~0 % e aviso a 10 %;
largura 165 → 160 cm leva o contorno de 220,52 a 213,84 m² e volta; subtotal com o que falta; a
"Fachada principal" medida duas vezes conta uma.

## 04/11/2026 (noite) — Deteção das janelas no próprio aparelho: propor, o avaliador confirma

Pedido do promotor depois da avaliação do "Levantamento v7": "dispensar identificar onde estão cada
janela, porta, varanda, marquise… aqui poupam-se minutos longos (alguns casos poderão ser horas)",
com reajuste à mão. Escolha (deixada à sessão): **deteção no aparelho**, sobre a fachada já
endireitada — gratuita, e a fotografia não sai do telemóvel (regra 6). A deteção com IA fica por
decidir (privacidade e custo).

**Como se usa (passo 3).** Com o contorno desenhado aparece "Detetar as janelas". As propostas
aparecem a tracejado violeta; tocar numa tira-a; "Aceitar as N" passa-as a vãos de uma vez (um só
passo de "Desfazer"); "Descartar" larga-as. Uma proposta em cima de um vão já desenhado não se
repete. Enquanto há propostas por confirmar não se sai do passo. **Nunca entra nada na área sem o
avaliador aceitar.**

**Como funciona** (`src/app/demo-areas/deteccao.ts`, cabeçalho do ficheiro): numa grelha de ~20
células por metro, a cor da parede estima-se localmente (segue o sombreado); o que se afasta dela,
limpo e cortado em peças do tamanho de uma janela, ajusta-se às arestas mais fortes (o aro de fora
quando há dois); depois a **repetição** decide — colunas de janelas iguais confirmam-se umas às
outras, uma janela sozinha só é proposta com nota alta, e uma em falta numa coluna regular só se
acrescenta se a imagem a confirmar. Varandas abertas e blocos de marquise inteiros (acima de 3,5 ×
3 m, ou assentes num parapeito) não se propõem: desenham-se como até aqui. Os **vidros** de uma
marquise podem sair como janela — e são isso mesmo: vidros que se descontam (na fotografia real saem
os de 2 das 5 marquises; os outros desenham-se à mão).

**Números.** Fachada sintética branca 12 × 18 m: 100 % das janelas, nenhuma inventada, com gradiente
e ruído, roupa estendida, meia fachada no contorno; parede lisa → 0 propostas. Fotografia real do
promotor (avaliada fora do repositório, nunca em testes): as 10 janelas do corpo branco
(sobreposição 0,76 a 0,87 com as marcadas à mão), os vidros de 2 marquises, e uma caixa pequena no
R/C com confiança 0,31 (a tirar com um toque); varandas abertas, montras e porta → nada. Cerca de
0,1 s por deteção, e nunca acima de 0,4 s nos prédios grandes.

**Revisão do cético** (fachadas difíceis, a fotografia real refeita de forma independente). Nada
rebentou; partiu em cinco sítios, todos corrigidos com um teste cada: (1) o contorno em triângulo
contava como o retângulo à volta — propunha janelas fora dele e as claraboias do telhado vizinho;
(2) prédios com mais de ~21 × 31 m, ou a fotografia inteira no ecrã, levavam até 1,4 s; (3) placas
de revestimento encostadas ao fim do contorno saíam como janelas; (4) manchas de humidade e remendos
de orla nítida saíam com confiança até 1,0; (5) uma janela por cima da junta de dois contornos saía
cortada a meio. E no ecrã: com "Ver a fotografia inteira" a deteção corria nessa vista, três vezes
mais pequena — corre agora sempre sobre a vista enquadrada no contorno.

**Limites que ficam** (a deteção propõe; o avaliador confirma): manchas de outra tonalidade
(esverdeadas, castanhas) e objetos retangulares nítidos (aparelhos de ar condicionado numa parede de
cor, sombras retangulares) podem sair como janela; estores fechados da cor da parede não se veem;
roupa estendida por cima pode deslocar a caixa; tijolo à vista é detetado ou não conforme a escala;
varandas com a guarda da cor da parede podem sair como janela.

## 04/11/2026 (noite) — Margem de erro da área («± X %»), e o que veio da comparação de motores

**De onde veio.** Uma outra sessão comparou motores de medição numa câmara virtual («Comparação de
motores», 04/11/2026) e pediu ajuda. A comparação foi refeita de forma independente, a partir da
descrição e sem correr o código deles. Os números confirmaram-se: com uma porta de 0,90 × 2,10 m e
só a porta, o erro mediano da área de um contorno de 6 × 12 m vai de 18 % a 53 %, conforme a câmara.
Com uma vertical e duas horizontais fica entre 1,4 % e 4,3 %. O que mais pesa é o tamanho da
referência na fotografia: com a porta do R/C da fotografia real (1,65 × 3,77 m) o erro fica em
7 % / 4,8 % / 1,1 % com ±2 px; com 1500 × 2000 px e ±1 px, em 1,9 % / 1,3 % / 0,3 %. O ±1 px é uma
hipótese, ainda não medida em obra.
Na comparação, os dois casos — o de ±27 % e o de ±2 % — tinham no ecrã o mesmo aspeto. Daí esta
alteração.

**O que é.** A confiança da **área**, separada da da câmara (`incertezaDaFocal`). Faz-se assim:
- cada coordenada tocada mexe 1 px (`ERRO_DE_TOQUE_PX`) para cada lado: os 4 cantos da referência e
  as pontas de cada aresta, acertos incluídos;
- recalibra-se e recalcula-se a área pelo mesmo caminho do ecrã;
- a derivada é a diferença centrada, as derivadas somam-se em quadratura e a margem é 2σ.

O resultado é `src/domain/margemDaArea.ts`. O caminho do ecrã está em
`src/app/demo-areas/margem.ts`, e um teste garante que a área é a mesma, ao centésimo.

Onde aparece:
- **Passo 3:** «Margem de erro da área do contorno: ± X % (± N m²)». Acima de 5 % surge, em âmbar,
  o que a reduz.
- **Passo 4:** por baixo do subtotal, com um (i) que diz o que cobre e o que não cobre. O aviso
  dos 5 % decide-se aqui pela área a pintar.
- **Fachadas guardadas:** levam a sua margem. O subtotal do prédio soma-as em quadratura
  (√Σm², fotografias diferentes têm erros independentes). Se alguma fachada não tiver margem, fica
  «indisponível».

**O que não cobre** (está no (i)):
- medidas da referência mal escritas;
- uma porta recuada;
- o íman preso no aro;
- a distorção da lente;
- as medidas à fita;
- o desenho fora do sítio.

Os erros de escala são o papel das medidas de controlo do passo 2.

**Números.** Câmara virtual, ruído gaussiano de σ = 1 px em todos os toques, 1000 ensaios por
cenário. O erro real ficou dentro da margem em 94–96 % dos casos, e a margem acompanha o erro: com a
porta pequena, ±68 % só com a porta, ±39 % com a vertical e ±4,8 % com as três arestas; com a porta
grande, ±20 %, ±12 % e ±2,9 %.

Na fotografia real, tal como o e2e a desenha:
- passo 3, só com a vertical do passo 2: ± 5,2 %;
- passo 3, com as três arestas: ± 3,9 %;
- passo 4, com as marquises a 1,2 m: ± 5,5 % (± 12,7 m²);
- prédio com uma segunda fachada só com a porta: ± 8,2 %.

**Revisão dos céticos** (dois: um à estatística, outro ao ecrã). Encontraram 1 defeito, 6 erros e
6 limites. O defeito e os erros foram corrigidos, cada um com o seu teste:

1. **As zonas cresciam a cada acerto, e a margem não o via.** Este defeito já existia antes.
   - `remapearZona` punha cada zona na caixa que envolve os quatro cantos levados, que é sempre
     maior: num caso da câmara virtual, o contorno ganhava 5,4 m² (+7,5 %) sem ninguém lhe tocar, e na
     fotografia real cada ida e volta acrescentava 0,45 %.
   - Agora cada lado fica **a meio** dos seus dois cantos.
   - `levarZonas` leva sempre a partir de como a zona foi desenhada: «Retirar o acerto» devolve-a
     exatamente como estava.
   - Com o contorno desenhado antes dos acertos, a cobertura subiu de 7–77 % para 87–95 %.
2. **Cada tecla no passo 4 recalculava a margem inteira.** Chegava a ~0,5 s por tecla num telemóvel
   lento. Agora as calibrações mexidas guardam-se à parte, e a margem segue as opções com
   `useDeferredValue`: aparece esbatida até se refazer. Ficou em ~50–90 ms.
3. **Textos que prometiam o que não cumprem.** «Rever os cantos» não reduz a margem. Também não era
   verdade que fossem as arestas o que mais a reduz: nesta fotografia, uma referência maior reduz
   mais.
4. **O (i) apresentava a premissa do 1 px como facto.** Passou a dizer que é uma estimativa, ainda
   não medida em obra.
5. **Num contorno pequeno, o arredondamento a 0,01 m² anulava a margem.** Há agora
   `areaPintavelExata`, sem arredondar.
6. **A área a pintar 0 mostrava «± 0,1 %».** Agora mostra «—».
7. **O (i) (`Dica`) tinha 20 × 20 px, abaixo dos 44 px da regra 17.** Isto afetava todos os ecrãs.
   - O que se toca tem agora 44 × 44 px; o círculo visível continua com 20 px, sem mexer a linha.
   - O `alvosDeToque` reprova um `<summary>` mais pequeno.
   - O (i) dentro dos rótulos de `Field.tsx` (16 px) fica como dívida declarada: um alvo de 44 px
     tapava o campo.

**Limites que ficam:**
- σ = 1 px é suposto, não medido. Com toques melhores a margem sai ~1,8× larga. As pontas das arestas
  traçadas no telemóvel podem errar 2 a 5 px, e aí a margem verdadeira é maior.
- Muito longe do linear (porta pequena a 24–36 m, fotografia rasante) a cobertura desce para
  85–92 %. Nesses casos a margem mostrada já passa de ±100 %.
- Com a saliência medida e a câmara no limite, a margem dá saltos (no pior caso cobre 91 %).
- O recálculo cresce com o número de zonas: ~100 ms com 123 zonas.
- Problema anterior, não corrigido: num acerto, a vista endireitada pode refazer a imagem duas vezes.

**O documento «Medir fachadas a partir de uma fotografia: o que existe»** (trazido por outra sessão)
confirma o caminho clássico: homografia, pontos de fuga, referência medida.

O próximo passo útil que dele se tira é a **deteção automática de linhas e pontos de fuga, no
aparelho** (Canny, Hough probabilístico e RANSAC, como em Chaudhury et al., ICIP 2014), para
**propor** a vertical e as duas horizontais que o avaliador confirma. É o que mais reduz a margem
sem o avaliador fazer mais nada.

A profundidade por IA ficaria, quando muito, para a saliência das marquises. Por decidir, e com as
licenças lidas antes:
- o Depth Anything V2 Small é Apache-2.0, mas o Base, o Large e o Giant são CC-BY-NC-4.0;
- a licença do Depth Pro tem de ser lida antes de qualquer uso.

Fica em aberto uma pergunta de produto: esta ferramenta serve o avaliador, ou também uma estimativa
feita pelo próprio cliente?

Verificado:
- typecheck, lint (0 erros), prettier, 1812 testes e build, todos com código 0, num diretório limpo
  só com os ficheiros deste commit;
- e2e em Chromium a 1280 e a 390 px com a fotografia real: 0 falhas, sem scroll horizontal, sem
  erros de consola.

## 05/11/2026 — «Propor as arestas»: a fotografia propõe as verticais e as horizontais, o avaliador confirma

**De onde veio.** Era o próximo passo da entrada anterior: o que mais reduz a margem da área sem o
avaliador fazer mais nada. Até aqui, as arestas que acertam o endireitamento (uma vertical comprida e
duas horizontais) eram traçadas à mão, com o erro do dedo nas pontas.

**O que é.** No passo 3, depois de desenhar o contorno, o botão «Propor as arestas» procura na própria
fotografia, no aparelho, **duas verticais compridas e afastadas** e **duas horizontais da fachada**, uma
na parte de baixo e outra na de cima. Aparecem a tracejado ciano por cima da fachada, com a margem antes
e depois. Um toque numa reta tira-a; «Aceitar as N» junta as que ficam aos acertos, como um só passo de
«Desfazer»; «Descartar» deixa tudo como estava. O método está descrito, passo a passo, no cabeçalho de
`src/app/demo-areas/arestasPropostas.ts`:
- segmentos por um LSD simplificado numa cópia reduzida;
- pontos de fuga por RANSAC dentro de um cone à volta da calibração atual;
- refinamento subpíxel ao longo de toda a reta na fotografia à resolução cheia;
- cada reta provada contra o ponto de fuga dos **outros** objetos (as duas arestas de um tubo de queda
  contam como um só);
- a «concordância»: enquanto a calibração discordar das retas compridas da fotografia, junta-se a que
  mais discorda.

Melhor nada do que uma reta errada: uma reta 2 px ao lado da aresta estraga o que devia corrigir.

**Desvio ao pedido, decidido na construção.** O pedido era «a vertical e as duas horizontais». Propõem-se
**duas** verticais afastadas, mesmo quando já há a vertical do passo 2: com uma só, o ponto de fuga vertical
fica decidido por ela e pelas ombreiras curtas da porta, e na fotografia do promotor a vista ficava torta
do lado oposto. A sugestão da margem (`comoReduzirAMargem`) também passou a pedir «duas verticais compridas,
longe uma da outra, e duas horizontais», e só diz «mesmo com duas verticais e duas horizontais» quando estão
de facto afastadas (`oQueFalta`).

**Regra do domínio mudada: `calibrar` pesa as verticais pelo comprimento**, as ombreiras da referência
incluídas, como já fazia com as horizontais (`src/domain/homografia.ts`). Até aqui as verticais pesavam por
igual: as ombreiras da porta valiam tanto como uma esquina de baixo a cima, e isso deitava fora a precisão
das arestas propostas (centésimos de píxel). Na fotografia do promotor, com a porta tocada no e2e, a
vertical do passo 2, as quatro arestas propostas e o mesmo contorno:
- por igual, as esquinas ficavam 0,34–0,48° fora do prumo na vista e a procura seguinte acusava 12 cm de
  inclinação em 19 m;
- pelo comprimento, 0,10–0,28°, e a procura seguinte concorda. As áreas quase não mudam: 214,41 contra
  214,17 m².

Sem propostas, a regra nova foi comparada com a antiga em 17 casos × 3 câmaras × 3 erros de toque, com 200
a 1000 sementes por caso. Com o mesmo erro em todos os toques, nunca é pior em média. Só piora um pouco
fora do modelo da margem:
- referência tocada 2–3× pior do que uma vertical curta bem traçada: mediana 1,67 → 1,90 %, cobertura
  78 → 71 %;
- uma vertical comprida traçada 3 px fora da aresta: cobertura 95 → 88 %.

Mantém-se.

**Números.**
- Na fotografia do promotor, com a vertical do passo 2, saem 4 retas: a margem do contorno passa de
  ± 5,1 % para ± 1,7 % e o contorno de 220,52 para 214,41 m².
- Na mesma fotografia, sem a vertical do passo 2, saem 5 retas, uma delas a aresta direita da parede
  branca: ± 15,9 % → ± 1,6 %, 208,65 m². Nos dois casos, propor outra vez dá «nada a propor».
- A vertical do passo 2 do e2e fica 3,8 px fora da aresta: daí os 2,7 % entre os dois resultados, um erro
  sistemático que a margem não vê.
- Na fachada sintética dos testes, com a porta tocada com ±2 px, o erro mediano da área desce de 13,4 %
  para menos de 4 %.

**Duas rondas de céticos.**
- **Primeira ronda** (geometria, ecrã, código). Corrigidos:
  - um tubo de queda inclinado proposto como vertical;
  - horizontais dos pisos de cima perdidas com a referência mal tocada;
  - textos que prometiam o que não cumpriam;
  - o aviso depois de aceitar;
  - tirar todas as propostas;
  - o plural;
  - a deteção das janelas refeita ao voltar;
  - o tempo ao aceitar;
  - o contraste do traço;
  - arrastos que desenhavam zonas com propostas pendentes.
- **Segunda ronda.** 22 defeitos reproduzidos, 13 marcados como erro, todos corrigidos e verificados um a
  um por outro agente:
  - **Tubo de queda.** Numa empena com poucas verticais compridas, um tubo inclinado 0,2–1° era proposto
    como «a vertical» e a esquina verdadeira deitada fora: 217 casos em 420, agora 0. As duas arestas do
    tubo provavam-se uma à outra.
  - **Famílias trocadas.** Com a porta muito mal tocada (σ = 5 px), arestas de laje saíam como verticais,
    e a área explodia: agora nenhuma.
  - **Concordância.** Com a calibração exata, propunha retas: agora desconta a incerteza do ponto de fuga
    da fotografia, e nada a propor.
  - **Vista torta.** Sem a vertical do passo 2, aceitar deixava a vista torta sem aviso. Agora a aresta
    que faltava (a direita da parede branca, 53.ª em apoio) é encontrada. Quando a vista fica torta, o
    ecrã diz de que lado e quanto, em cm, metros e graus, sem píxeis, logo ao propor e depois de aceitar,
    e só quando isso mexe na área mais do que a margem.
  - **Estado.** Com propostas pendentes, um toque só tira propostas. O aviso de cada aceite guarda-se com
    ele, e fica ao ir ao passo 2 e voltar.
  - **Testes.** A verificação final deixou três reparos menores, corrigidos com teste:
    - o ecrã dizia «não se encontrou ali uma aresta fiável» quando quem mede a tinha tirado; agora aponta
      «Propor as arestas» antes de traçar à mão;
    - «as horizontais concordam» com 4 px de desacerto;
    - a nota mínima das retas, que nenhum teste segurava (`notaDaReta`).

    Testes permanentes: 30 em `arestasPropostas.test.ts`. Cada regra foi tirada uma a uma (mutação), e
    cada uma faz falhar pelo menos um.

**Limites que ficam** (detalhe no cabeçalho de `arestasPropostas.ts`):
- Uma grande angular sem correção curva as retas: a proposta é a corda da parte que passa as provas.
- Duas arestas quase na mesma reta só se separam a partir de ~2,5 px de degrau.
- Numa empena com uma esquina escondida, contra só as ombreiras, um tubo até ~0,35° não se distingue de
  uma esquina.
- A margem conta as pontas propostas com o mesmo 1 px das traçadas à mão (pessimista para elas), e
  continua sem ver erros sistemáticos, como uma vertical do passo 2 fora da aresta.
- O traço ciano fica entre 2,6:1 e 3,0:1 contra o pior lado em até 1,9 % da reta.
- Num telemóvel lento (CPU 4× mais lento), propor ocupa a página ~0,8–0,9 s e aceitar ~0,6 s, sempre
  depois de o botão mostrar «A procurar…» ou «A aplicar…».
- A 390 px, um duplo toque no «Propor as arestas» por baixo da sugestão muda a vista para «Fotografia
  inteira».
- Não há «Propor as arestas» antes de desenhar o contorno: é o contorno que diz onde está a fachada.

**Verificado:**
- typecheck, lint (0 erros, os mesmos 28 avisos), prettier, 1844 testes e build, todos com código 0, num
  diretório limpo só com os ficheiros deste commit;
- e2e em Chromium a 1280 e a 390 px com a fotografia real: 63 OK e 0 falhas em cada largura;
- os cenários da fotografia real com as propostas (com e sem a vertical do passo 2, tirar a aresta
  direita, propostas pendentes): tudo certo nas duas larguras, sem erros de consola.

A fotografia do promotor não entra no repositório: os testes permanentes usam só a fachada sintética
(`fachadaSintetica.ts`).

## 05/11/2026 — Assinaturas: a âncora «Cartão de Cidadão 008» e uma falha grave na verificação da cadeia

**De onde veio.** Uma pesquisa sobre o middleware oficial do Cartão de Cidadão (pedida a propósito de outra
coisa) mostrou que o Estado tem, desde 23/11/2023, a entidade «Cartão de Cidadão 008» (chave ECDSA P-521,
emitida pela ECRaizEstado 002), e que `src/lib/trust/anchors.ts` só ia da 001 à 007. A 008 emite as
entidades que hoje assinam:
- «EC de Assinatura Digital Qualificada do Cartão de Cidadão 0019» (desde 14/02/2024) e «0020» (desde
  12/11/2025), dos cartões recentes;
- «EC de Chave Móvel Digital de Assinatura Digital Qualificada do Cartão de Cidadão 00007» (desde 17/09/2025,
  na TSL portuguesa desde 08/10/2025; as listas de revogação mostram-na em uso desde dezembro de 2025).

Sem a 008, uma assinatura com um cartão recente ou com a Chave Móvel Digital emitida por essa entidade era
**recusada logo**. A 008 entrou na lista; o ficheiro oficial (pki2.cartaodecidadao.pt, `CC_Root008.crt`) é
byte a byte igual ao do middleware, e a `certs.json` do middleware dá a mesma impressão SHA-256
(e290db26…f7b5) e as mesmas da 003 à 007 que já cá estavam.

**A falha grave, encontrada pelo cético que reviu a correção.** O pkijs (3.4.1) valida o **último**
certificado da lista que recebe (`leafCert = localCerts[localCerts.length - 1]`), e `validateChain` punha o
do signatário em **primeiro**. Com outros certificados no PDF, validava-se um deles e não o do signatário.
Um PDF assinado com um certificado feito por quem quisesse, com o nome e o n.º de identificação de outra
pessoa, mais a EC 0019 (que é pública) no PDF, dava `trusted: true`: a ação gravava `cadeiaConfiavel: true` e
dizia «Assinado por …, com certificado do Estado português». Existia desde a verificação da cadeia
(19/10/2026). Ao contrário, uma cadeia verdadeira com a raiz em último (como o middleware a mete nos cartões
antigos, com a ECRaizEstado certificada pela Multicert) era recusada.

**Exposição: nenhuma.** Na base real há 5 eventos de contratação, nenhum com `metodo = 'cmd_pdf'` (consulta
só de contagem, a 05/11/2026): nunca se gravou uma assinatura PAdES em produção.

**O que mudou em `validateChain` (`src/lib/pades.ts`):**
1. O signatário vai em último, e as cópias dele (mesmo conteúdo assinado) saem do conjunto: o middleware
   mete-o duas vezes no PDF, e o pkijs funde as cópias e fica com a primeira.
2. Confirma-se que o caminho validado começa no signatário; se não, recusa-se.
3. O emissor para o OCSP é o do caminho validado, e não o primeiro do PDF com o mesmo nome: uma EC falsa
   com o nome da verdadeira desviava a pergunta e um certificado revogado passava.
4. A cadeia valida-se na data de agora, e não na hora que a assinatura declara (`signingTime`, escrita por
   quem assina): um certificado caducado passava com uma data antiga. Só se verifica uma assinatura no
   carregamento do PDF, logo a seguir a ser feita.

Uma primeira versão desta correção tirava a raiz do conjunto, com um diagnóstico errado («o pkijs
constrói o caminho até à raiz»): o cético mostrou que a raiz só estorvava por ficar em último, e que esse
filtro abria a variante do ataque com a cadeia inteira. Foi retirado; o pkijs para na primeira âncora
(`buildPath`), por isso o que está acima dela já não conta.

**Testes** (`src/lib/trust/anchors.test.ts`, `src/lib/pades.test.ts`; certificados públicos oficiais em
`src/lib/trust/cadeiasOficiais.fixture.ts`, com as impressões fixadas):
- as entidades 0019, 0020 e CMD 00007 encadeiam na 008, com a raiz no PDF por qualquer ordem, ou sem nada;
- sem a 008, eram recusadas logo (com o AIA a devolver a raiz, como em produção);
- um certificado autoassinado ou forjado «da EC 0019», com a cadeia oficial no PDF, é recusado, também de
  ponta a ponta com `verifyLastSignature`;
- o signatário duplicado, o legítimo passa e o forjado não;
- uma EC falsa com o mesmo nome não desvia o OCSP;
- um certificado caducado com `signingTime` antigo não passa.

Contra o código anterior falham 10 deles (e nenhum dos que já existiam); a correção «ingénua» (pôr o signatário em último sem tirar as
cópias) é apanhada pelo teste do duplicado, e voltar à data declarada pelo do certificado caducado.

**Limites que ficam** (`docs/EM_ABERTO.md`):
- Também encadeiam as entidades de **autenticação** do cartão: um PDF assinado com a chave de autenticação
  passaria por assinatura de confiança. Verificar o uso da chave (não-repúdio) do signatário precisa de um
  certificado real de assinatura para confirmar que não recusa assinaturas legítimas.
- Quem forja pode escolher «por confirmar» em vez de «recusada»: basta um AIA para um endereço que não
  responde (decisão de 24/10: a falha de rede não recusa). E o servidor segue os endereços AIA e OCSP que o
  certificado traz. A revisão manual no backoffice não pode confiar no nome mostrado.
- Não se sabe se o serviço da Chave Móvel Digital mete a raiz no PDF; com esta correção, tanto faz.
- Falta testar com uma assinatura real: um cartão emitido desde 2024 e a Chave Móvel Digital.

Verificado: typecheck, lint (0 erros, os mesmos 28 avisos), 1861 testes e build com código 0, num diretório
limpo só com os ficheiros deste commit. Os ficheiros novos passam o prettier; os que já existiam ficaram no
estilo em que estavam (não seguiam o prettier), para o diff mostrar só o que mudou.

## 05/11/2026 — Convocatória por ondas: quem é convidado para um levantamento, e por que ordem

Até aqui, quando um levantamento abria, **ninguém era avisado**: os avaliadores descobriam-no a navegar
a lista e quem chegava primeiro ficava. Com o WhatsApp (modelo `avaliador_nova_oportunidade`, botão
«Aceito») a convidar, chamar toda a gente de uma vez paga uma mensagem por pessoa e entrega sempre a
vaga a quem tem o telemóvel mais à mão. Proposta discutida com o promotor; decisões dele:

1. **NIF pessoal só para quem quer receber em nome próprio (recibo verde).** Por omissão a comissão
   continua a ir para a empresa, e aí o NIF pessoal não se pede (RGPD, minimização).
2. **Até metade de cada onda para avaliadores novos**, arredondada para baixo (2 em 5, 1 em 3). Novo é
   quem tem menos de 3 levantamentos avaliados — o mesmo limiar do comparador de pintores.
3. **«Já atribuída» só a quem carregou em «Aceito» tarde**, não a todos os convidados: cada mensagem
   do modelo é paga, e o próprio convite já diz que fica com o trabalho a primeira pessoa a aceitar.
4. **Concelho base e raio de deslocação** (15/30/60/100 km) declarados pela pessoa, em vez de listas
   de concelhos: funciona no país inteiro sem marcar 308 concelhos. Anéis à volta da obra: o próprio
   concelho, até 25 km, até 50 km, até ao raio de cada um — nunca além do raio declarado.

O resto, proposto e aceite com a proposta: condições de convite (NIPC válido da empresa, inscrição e
confidencialidade em vigor, nome completo, WhatsApp pessoal ligado, menos de 2 levantamentos em curso,
não suspenso); onda de metade dos elegíveis entre 3 e 5; ordem pela qualidade que já define a banda de
comissão (uma regra só), empate para quem está há mais tempo sem trabalho; quem ganhou uma vaga nas
últimas 24 h vai para o fim do seu anel; nota baixa (média < 3 com ≥ 5 avaliações) ou incumprimento
provado nos últimos 7 dias tiram da **primeira** onda, nunca da convocatória; uma hora útil por onda;
só se envia em horário útil; ao fim de 3 ondas, alerta à equipa e o cliente segue pelo preenchimento
próprio. Os dados do cliente **não** seguem por WhatsApp: o «Aceito» reserva e a resposta leva a
ligação para a ficha, onde a dupla chave de 31/10/2026 continua a decidir.

Construído: `src/domain/convocatoria.ts` (puro e testado, números numa versão `2026-11-05`) e
`src/lib/centrosDosConcelhos.ts` (centroide oficial de cada concelho, geoapi.pt/CAOP; o Funchal fica na
cidade porque as Selvagens puxavam o centroide 38 km para o mar).

**Aplicado à base real (05/11/2026):** migração `20261105094801_convocatoria_por_ondas` — concelho base,
raio, recebimento e NIF pessoal na linha pessoal de «Disponibilidade»; tabelas `survey_waves`,
`survey_invites` e `whatsapp_messages` (RLS: cada pessoa lê os seus convites, a equipa lê tudo, só a chave
de serviço escreve); `aceitar_convite` (só a chave de serviço) reserva atomicamente pelo convite; um gatilho
fecha os convites pendentes quando o levantamento deixa de estar aberto; tarefa `quempinta-convocatorias`
ao minuto, que só acorda a aplicação em horário útil e quando há trabalho. Verificado na base real com
utilizadores `zz-test-*` num bloco revertido: dois «Aceito» ao mesmo levantamento → `aceite` e `tarde`, uma
só tentativa; nada ficou gravado. A migração **não** depende de `reserva_so_para_avaliadores_inscritos`
(ainda por aplicar, à espera do promotor): repete a função da versão da inscrição, com o mesmo corpo.

## 05/11/2026 — A comissão do avaliador é da pessoa; a reserva exige a inscrição

**Comissões.** Decisão do promotor, a recusar a solução da manhã (comissão para a empresa, ou para a
pessoa só se ela escolhesse): *«as comissões de avaliador devem ir apenas para um separador na sua conta,
a empresa onde trabalha não tem essa informação, não tem acesso a isso; o vendedor/avaliador acumula
crédito/dinheiro real na sua conta e, quando quiser resgatar, basta apresentar recibo-fatura (ainda que em
ato único).»* Construído e aplicado (`20261105103940_comissoes_pessoais_do_avaliador`):

- Cada pagamento de levantamento tem dono (`survey_payouts.vendedor_user_id`); só a pessoa e a equipa o
  veem — a empresa deixou de ver (a política antiga era `can_access_org`).
- A pessoa declara, em «Comissões pessoais», NIF de pessoa singular, nome, IBAN, o documento que emite
  (fatura-recibo ou ato isolado) e o regime de IVA e de retenção; a equipa valida e fixa a retenção em
  Contabilidade › A pagar, como já fazia para as empresas. Mudar o NIF, o documento ou o regime volta a
  pedir validação.
- A pessoa pede o resgate do saldo inteiro, emite o recibo nas Finanças em nome da Relevante Planeta, Lda,
  envia o PDF, e a equipa paga por transferência. Valor = comissão + IVA − retenção.
- A empresa deixou de poder resgatar comissões de levantamento (`survey_request_redemption` recusa com
  uma frase que aponta para a conta de cada um).
- A escolha «em nome da empresa / em nome próprio» do ecrã de convites desapareceu: a comissão é sempre
  da pessoa, e o NIF passou para os dados para receber.

Na base real não havia nenhum pagamento nem resgate de levantamento: nada a converter. Testes:
`supabase/tests/comissoesPessoais.test.ts` (quem vê, quem valida, resgate, recibo na pasta da pessoa,
pagamento).

**Reserva só para inscritos.** O promotor mandou aplicar a migração de 02/11 sem inscrever ninguém
automaticamente. Aplicada a 05/11/2026 (`20261105103114`); o ficheiro passou a ter o nome da versão
registada (a ordem não quebra nada: `npm test` verde).

## 05/11/2026 — Sem candidatos não é esgotar

Erro meu, encontrado no ensaio: na primeira passagem com as chaves do WhatsApp ligadas (10:28), três
levantamentos abertos de Viana do Castelo (QP-1000, QP-1002, QP-1005) foram dados por esgotados com zero
ondas, só porque ainda nenhum avaliador tinha o WhatsApp configurado — e a equipa recebeu três emails.
Esgotado é definitivo, por isso nunca seriam oferecidos ao primeiro avaliador da zona.

Corrigido (`20261105111016_convocatoria_sem_candidatos`): «sem candidatos» antes da primeira onda passa a ser
um estado próprio — avisa a equipa uma vez e o levantamento continua à espera. Esgotar fica para quem já teve
ondas sem resposta. Os três levantamentos voltaram a estar à espera.

## 05/11/2026 — WhatsApp pela Meta, sem a Twilio

Decisão do promotor. A Twilio recusava enviar (erro 20003) até o *Primary Customer Profile* ser aprovado, e
esse perfil exige a fotografia do cartão de cidadão do gerente, recolhida por um terceiro (Persona, dados
biométricos, até 3 anos). O promotor recusou — com razão: a Lei 7/2007 limita a reprodução do cartão, e a
Meta verifica a empresa com documentos da empresa. Escolher a Twilio em 02/11 («o caminho mais curto») sem
comparar foi o erro; a Cloud API da Meta é mais barata (sem margem do intermediário) e tem uma verificação a
menos.

Mudou: o envio (`src/lib/whatsapp.ts`), a receção (`/api/whatsapp`, assinatura `X-Hub-Signature-256`) e as
variáveis (`WHATSAPP_*`, sem `TWILIO_*`). Não mudou: ondas, reserva atómica (`aceitar_convite`), ecrã do
avaliador, modelos aprovados e número. O botão passou a levar o id do convite. Fica inativo até as quatro
chaves da Meta estarem na Vercel (passos em `docs/WHATSAPP.md`).

## 05/11/2026 — Passo 2 do pedido: a proposta B, «o prédio ao centro»; e uma zona medida pelo cliente fica «medida pelo cliente», com margem

**A escolha.** Para o passo 2 do pedido («Medidas e fotografias») foram feitas duas maquetas: a A, «a lista
que se trabalha» (uma faixa com o total, uma lista de linhas, o prédio e as fotografias numa coluna à
direita), e a B, «o prédio ao centro» (o desenho do prédio a toda a largura, com as zonas pintadas e
numeradas e os cartões à volta, ligados ao número). O promotor escolheu a **B**: «construir algo bonito e
fácil de trabalhar, prático, respirável, preferencialmente tudo num só ecrã», com uma opção que abre «um
popup grande com a ferramenta de levantamento de área de obra». Porquê a B: é a que faz do prédio o objeto
do ecrã — quem não é do ofício vê que «empena» é aquela parede, e que as varandas estão por decidir — e é a
que tem um sítio natural para a ferramenta.

**As correções do juiz, todas feitas** (`src/app/app/pedidos/[id]/`):

1. **O modo lista é a base**: o desenho de um lado e os cartões numerados empilhados do outro (um por cima
   do outro no telemóvel). As **chamadas** — os cartões à volta do desenho, ligados ao número — só entram
   por *container query* a partir de 1040 px de contentor (`globals.css`), com seis zonas ou menos, todas
   com sítio no desenho, e só se a disposição cumprir a regra do ponto 2; senão, fica a lista. As zonas que
   o volume não mostra (escadas e átrio, interiores, tetos, outra; uma segunda fachada, que o desenho não
   sabe qual é) vão para **«Fora do desenho»**, sem número. Os dois modos estão no HTML e o CSS escolhe:
   o primeiro ecrã vem certo sem medir nada no servidor.
2. **As ligações nunca cruzam cotas nem cortam faces na diagonal** — e isto é uma função pura com testes
   (`src/domain/chamadas.ts`, `disporChamadas` e `problemasDasLigacoes`): só troços horizontais e
   verticais, os verticais no corredor entre a coluna e o desenho; nenhuma ligação passa por uma cota, pelo
   texto de uma cota, por outro número, nem por outra ligação. Para haver espaço, as cotas mudaram de sítio
   (`src/domain/prancheta.ts`): a frente mede-se na aresta de trás do telhado (o mesmo comprimento), o fundo
   na aresta esquerda do telhado, a altura na aresta vertical de trás — tudo por cima e atrás, onde nenhuma
   ligação precisa de ir. Uma medida de olho escreve-se «≈ 12 m». A **hachura «por decidir»** passou a
   contorno tracejado (1 px, sem engrossar com a escala) sobre fundo pálido; o **cobalto cheio** é só da zona
   aberta ou apontada.
3. **Da proposta A**: a barra fina medido/estimado debaixo do total (118 m² em cobalto, 98 m² em cobalto
   pálido, com rótulos); a **conta ao vivo** no editor («10 × 11,2 − 14 = 98 m²», e «estimativa, fica por
   confirmar»), escrita por `contaDaZona` (`src/domain/respostaDasZonas.ts`) e testada contra `surfaceArea`
   — por isso as varandas são «6 × 1 m²»; as excluídas no fim, sob **«Fora do pedido»**, a cinzento, com «—»
   na área; e, no pedido vazio, **uma frase por tipo de zona** («A parede lateral sem janelas, à vista ou
   encostada ao prédio do lado»).
4. **O que falta é acionável**: «Falta confirmar 98 m² (empena lado norte) e decidir as varandas» — cada nome
   é um botão; «as varandas» leva ao cartão e põe-lhe o foco; «empena lado norte» abre a edição da zona, e,
   na gaveta, para a equipa, o «Medir na fotografia» já com essa zona escolhida.
5. **Regra 12** nos textos: «Como indicar as dimensões», «De onde vem este número», «Nome da zona».
6. **Botão desativado legível** (`.btn-desativado`, `globals.css`): contorno, texto a 6,8:1, e a razão ao
   lado a 15 px.
7. **Contas coerentes**: «em 2 das 4 zonas» quando há zonas que não contam; a lista do que falta só lista o
   que falta, e nunca diz «nenhuma» (um muro por levantar mas excluído não falta a ninguém). Testado em
   `respostaDasZonas.test.ts`.
8. **O primeiro ecrã**: «+ Acrescentar zona» e «Medir na fotografia» estão na linha da resposta, à direita do
   total (no telemóvel, por baixo do desenho), para não gastar altura por baixo do «Voltar», do título e
   do percurso.

O editor de uma zona abre numa **gaveta** à direita (`<dialog>` nativo: foco preso, Escape fecha, o foco volta
a quem abriu; ecrã inteiro no telemóvel), com o desenho à vista e a zona acesa. Nada se perdeu do que havia:
editar por dimensões, área, quantidade, origem e trabalhos por zona; incluir, por decidir e excluir
(`setParticipacaoDaZona`, agora com as três); remover; acrescentar; as medidas do prédio (que mudam o
desenho enquanto se escrevem); as fotografias (várias de uma vez, geral ou pormenor, zona, legenda, estado
da revisão — agrupadas pela zona, com o número do desenho, uma linha por fotografia com a legenda, o estado e
a nota da revisão; a legenda e a zona editam-se numa janela); o modo recolhido com visita pedida; só leitura
sem gestão. As *server actions* não mudaram de assinatura.
De passagem: o (i) dentro de um `<p>` dava erro de hidratação no slot das fotografias, nas medidas do prédio
e no percurso — passaram a `<div>`; e o percurso, no telemóvel, já não espreme o texto contra o botão.

**A revisão dos céticos (05–06/11/2026).** A primeira versão tinha doze erros, todos corrigidos neste mesmo
commit:

- **A gaveta tem um só modo de gravar** (guia §8.2): «No pedido: Incluída / Por decidir / Fora do pedido»
  passou para dentro do formulário e grava com «Guardar zona» (que chama `updateSurface` e, se a
  participação mudou, `setParticipacaoDaZona`). «Remover a zona» fica à parte, no fim, **pede confirmação**
  com o nome da zona, e fecha a gaveta; e a gaveta fecha-se sozinha quando a zona aberta deixa de existir —
  antes passava a «Nova zona» com os números da apagada, e «Guardar» voltava a criá-la.
- **O título conta só o que soma** (`tituloDaResposta`, testado): «118 m² a pintar, em 1 das 3 zonas» com
  duas por levantar; «Por levantar · 1 zona a pintar, ainda sem medidas»; «0 m² a pintar: 1 zona por
  decidir»; nunca «em 0 das 1 zona». A barra ganhou um troço tracejado para as zonas sem medidas («2 zonas
  sem medidas»): já não fica toda a cobalto com zonas por medir.
- **A frase do que falta é português** (`fraseDoQueFalta`, testada): os nomes levam artigo («levantar a
  empena lado norte e o tardoz»; uma palavra que não se conhece fica «a zona «…»»), e uma lista cujos
  itens já têm «e» separa-se com ponto e vírgula («(empena lado norte; escadas e átrio)»).
- **As ligações não atravessam a zona de outro número** (`problemasDasLigacoes`, nova regra com testes
  num prédio em L e num de 12 pisos): só o bocado que leva a uma zona assente noutra (as varandas sobre a
  fachada), até 56 px e nunca mais de um terço da largura dessa zona. As cotas afastam-se até não assentarem
  no prédio (o «≈ 12 m» em cima da asa do L).
- **O palco das chamadas** é cinzento a toda a largura, com os cartões por cima (maqueta B); a coluna dos
  cartões arruma-se dentro da altura do desenho em vez de a esticar (sem os vazios de 230 px); as
  **excluídas ficam em «Fora do pedido»** também com chamadas — no fundo de uma coluna quando lá cabem, por
  baixo do palco quando não. A secção das zonas desceu de 763 px para ~365 px a 1440.
- **No telemóvel** as cotas saem do desenho para uma linha por baixo (o prédio fica ~1,5× maior) e os dois
  botões vão para debaixo do desenho, que começa logo a seguir ao total.
- **O desenho responde ao toque**: cada número é um botão (alvo de 44 px) que abre a zona, e cada face abre
  a zona que a pinta. No pedido vazio, «+ Fachada», «+ Empena» e «+ Varandas» estão pousados no próprio
  prédio, como na maqueta B, e a lista com uma frase por tipo fica ao lado.
- **«Confirmar a empena» abre a edição da zona também para a equipa** (na gaveta está o «Medir na
  fotografia», com a zona já escolhida); só quem não pode editar vai direto à ferramenta.
- **As fotografias só de leitura** voltaram a mostrar, por fotografia, a legenda, o estado da revisão e a
  nota de uma recusada, em âmbar (`Fotografias.test.ts`).

**Decisão do promotor: «medida pelo cliente», com margem.** Uma zona que o cliente meça na ferramenta de
levantamento fica com **origem própria, «medida pelo cliente»**, e com a **margem de erro** da medição
(± %) — **nunca «confirmada»**. É uma medição a partir de uma fotografia, e a margem diz quanto vale; o
pintor conta com ela como conta com uma estimativa honesta. Entra quando a ferramenta for ligada ao pedido
(próxima tarefa, com migração: a origem nova e a margem por zona). Até lá:

**A ferramenta só aparece à equipa.** «Medir na fotografia» abre uma janela grande, «Levantamento da área
da obra», com a ferramenta verdadeira de `/demo-areas` (`MedirFachada`, importada sem SSR e só quando a
janela abre) e um quadro «Do prédio, para conferir» (frente, fundo, altura). O resultado ainda não volta
para o pedido: o botão só aparece a quem está em `platform_admins` (`isPlatformAdmin`), e a janela di-lo
numa linha — quando voltar, a zona fica «medida pelo cliente», com a margem. O «Usar esta medição» está
desativado, com a razão ao lado.

## 05/11/2026 — Poderes de quem assina: a certidão permanente lida à mão, e um aviso bem à vista

**Decisão do promotor.** Verificar se quem assina um contrato tem poderes para obrigar a entidade; mesmo que
não impeça, avisar bem à vista. Regras em `src/domain/poderes.ts` (58 testes), base em
`supabase/migrations/20261106083428_poderes_de_representacao.sql` (19 testes de acesso, utilizador a utilizador).

**Porque é manual.** Ler a certidão permanente de forma automática (ir ao portal com o código e ler a página) é
proibido sem autorização do IRN: Termos de utilização do portal registo.justica.gov.pt, §4. O pedido de
autorização segue por email (`docs/EM_ABERTO.md`). Até haver resposta:
1. a empresa entrega o **código de acesso** da certidão (12 algarismos, NNNN-NNNN-NNNN). Pela Portaria
   285/2012, art. 6.º, n.º 2, entregar o código equivale a entregar a certidão — por isso o código satisfaz o
   documento «Certidão permanente» na lista do que falta, tal como o ficheiro;
2. a equipa da plataforma abre a certidão no portal e regista (Entidades › Poderes de representação): quem
   tem poderes (nome, cargo, NIF opcional), a forma de obrigar tal como está escrita, quantas assinaturas
   obrigam (1, 2, ou «a confirmar» quando o texto é invulgar) e a data «válida até».

**A quem se aplica.**
- Pintor que seja sociedade (NIF/NIPC a começar por 5): a certidão passa a ser pedida (`expectedDocs`).
  Administradoras e fornecedores já a tinham em `EXPECTED_DOCS`.
- Condomínio: a equipa regista o administrador a partir da **ata de nomeação**, na mesma tabela (fonte
  «ata»), e o «válido até» é o fim do mandato.
- Particular e empresário em nome individual (NIF 1, 2, 3 ou 45): compara-se com o nome do titular da conta
  (o proprietário da entidade).
- Pintor com outro tipo de NIF (6, 7, 8, 9): «não se aplica».

**Na assinatura.** Em `signWithPdf`, depois de todas as verificações que já existiam e **sem nunca recusar por
isto**, calcula-se o resultado para o lado que assina — confere, provável, não consta, faltam assinaturas, sem
leitura, caducada, por confirmar; num particular, confere ou não confere — e guarda-se no acontecimento
(`payload.poderes`: só o resultado e o texto). Quem assina recebe o aviso logo na confirmação. A página da
contratação mostra às duas partes e à equipa **uma banda âmbar no topo** sempre que uma assinatura registada
tem um resultado que não seja «confere», «confere com o titular» ou «não se aplica» (o «provável» também
avisa). O aviso do certificado por confirmar, que era uma segunda caixa, vermelha, no histórico, passou para
a mesma banda: regra 13, uma banda por ecrã, âmbar porque se resolve. No backoffice, Contratações ›
Assinaturas mostra o resultado de cada assinatura em PDF.

**A comparação.** Pelo nome normalizado: maiúsculas, sem acentos (a certidão escreve «JOÃO LUIS», o cartão
«João Luís»), sem DE/DA/DO/DOS/DAS/E/D'. «Confere» quando as palavras são as mesmas, por qualquer ordem;
«provável» quando o primeiro e o último nome são iguais e um nome está contido no outro. A mesma pessoa a
assinar duas vezes conta uma vez, e cada pessoa da certidão serve a um só signatário — escolhe-se o
emparelhamento com mais pares, não o primeiro que aparece. «Faltam assinaturas» quando a forma de obrigar
exige duas e só uma pessoa da lista assinou.

**O que se guarda e quem o vê (RGPD: minimização).**
- O código dá acesso a dados pessoais de terceiros (moradas, estado civil dos sócios…): é um segredo. Vive
  numa tabela só sua (`certidao_codigos`) que **só a equipa lê**; só quem gere a entidade o define, e só pela
  função; nunca aparece em mensagens, registos ou acontecimentos, e o ecrã não o volta a mostrar — no lugar
  dele fica «Guardado · por ler pela equipa» ou «Lida pela equipa a … · válida até …». Trocar o código põe a
  leitura por fazer (o mesmo código outra vez não mexe em nada).
- Da certidão guarda-se só nome, cargo e NIF (opcional) de quem tem poderes, a forma de obrigar, o número de
  assinaturas, a validade, e quando e por quem foi lida.
- **Quem gere a entidade vê os nomes e os cargos registados** — decidido nesta sessão, à pergunta «a entidade
  precisa de ver os nomes de volta?». São dados do seu próprio registo, que ela própria entregou, e vê-los é
  a única maneira de dar por um erro de transcrição antes de assinar um contrato, e não depois, num aviso que
  a outra parte também lê. O NIF fica registado mas não se mostra. Os outros membros (financeiro, avaliador,
  leitor) veem só o estado — que não tem dados pessoais e lhes diz se a certidão ainda falta.
- A outra parte de uma contratação vê só o resultado (regra 6). Os textos não levam nomes, datas nem a forma
  de obrigar; um teste percorre os cenários e falha se aparecer algum.

**Limites, ditos às claras.**
- **Só pelo nome.** O certificado do Cartão de Cidadão e da Chave Móvel Digital traz o nome completo e o n.º
  de identificação civil, mas não o NIF, e a certidão não traz o n.º de identificação civil. Um «confere» é
  um indício, não uma prova, e nenhum texto diz «verificado». Homónimos passam; um apelido que o cartão tem e
  a certidão não (ou ao contrário) dá «provável»; um nome escrito de outra maneira pode dar «não consta».
- **A forma de obrigar é texto livre.** O número de assinaturas é a leitura que a equipa faz dela; formas
  invulgares (gerentes de categorias diferentes, um gerente com um procurador, limites de valor) ficam «a
  confirmar», e a assinatura fica «por confirmar».
- **Procuradores** não estão cobertos: quem assina por procuração dá «não consta».
- **Administrador de condomínio que é uma empresa:** a equipa regista à mão as pessoas que a obrigam.
- **SCAP** (a assinatura com o atributo profissional «gerente», que provaria a qualidade de quem assina) e
  **LTV** (carimbo temporal e revogação embebidos no PDF, para a assinatura se validar daqui a anos) ainda não
  tratados.
- O resultado é o do **momento** da assinatura: uma leitura registada depois não o muda.
- O acontecimento de uma assinatura pode ser inserido diretamente pela API por quem gere a entidade — a
  política de `engagement_events` não exige o PDF, e isto vale igualmente para `cadeiaConfiavel`. Já existia
  antes desta decisão; ficou registado em `docs/EM_ABERTO.md` (dívida técnica).
- **Migração por aplicar — tudo ou nada.** Publicar o código antes da migração não liga metade da
  funcionalidade: enquanto as tabelas novas não existem, nenhuma assinatura grava resultado, em nenhum regime —
  incluindo particulares e empresários em nome individual, cuja comparação com o titular da conta só lê tabelas
  que já existiam e, na primeira versão deste commit, gravava (achado de uma revisão cética: um perfil «Rui»
  contra o certificado «RUI MIGUEL SANTOS MOTA» punha a banda âmbar à outra parte antes de a funcionalidade
  estar ligada). E a página da entidade fica como estava: sem o bloco do código e sem pedir a certidão ao pintor
  sociedade, que de outro modo a veria em falta sem a alternativa do código. Porquê tudo ou nada e não ligar já
  a parte que funciona: um aviso que a outra parte lê não deve aparecer antes de o promotor ligar a
  funcionalidade de propósito, ao aplicar a migração; e pedir um documento novo sem a forma mais simples de o
  entregar acrescenta peso sem necessidade. A equipa já vê o menu novo (Entidades › Poderes de
  representação), cuja fila diz que falta a migração. A única mudança visível para as partes antes da migração
  é que o aviso do certificado por confirmar, que já existia, passou da caixa vermelha no histórico para a
  banda âmbar do topo. Regra em `src/lib/poderes.ts` (`poderesDoLado`, `faltasDaEntidade`), testes em
  `src/lib/poderes.test.ts`.

Verificado no worktree, pelo código de saída: typecheck, lint (0 erros, os mesmos 28 avisos), `npm test` (2031
testes, com as migrações em memória; 99 deles novos — 58 do domínio, 19 de acesso, 22 do «tudo ou nada») e `npm run build`. Os ficheiros novos passam o prettier
(`--print-width 140 --single-quote`); os que já existiam ficaram no estilo em que estavam. **Não visto num
navegador**: os ecrãs estão atrás de sessão, e a migração não está na base real.

## 05/11/2026 (noite) — A assinatura só entra pelo servidor; o rasto de avisos até ao contrato; o contrato por WhatsApp

### Falha fechada: registar «assinou» pela API, sem PDF

Encontrada na revisão da verificação de poderes, e anterior a ela. A política `engagement_events_insert` deixava
quem gere uma das entidades registar `cliente_assinou` ou `pintor_assinou` diretamente pela API, com a sessão do
próprio, sem PDF nenhum e com o `payload` que quisesse (`metodo: 'cmd_pdf'`, `cadeiaConfiavel: true`, poderes
«confere»). Todas as verificações do PDF viviam só no servidor. Também o balde `contratos` aceitava da parte um
ficheiro qualquer, que o pintor depois descarregava como «o contrato assinado pelo cliente». **Sem exposição:** não
há em produção acontecimentos de assinatura fora do percurso do servidor (consulta de 05/11/2026).

**A correção** (migração `20261106083458_assinatura_so_pelo_servidor`, aplicada a 06/11/2026): a base continua a decidir
**quem** regista (a política de sempre: papel na entidade do lado certo e `actor = auth.uid()`) e passa a exigir a
prova de **que** o servidor verificou. Depois de verificar o PDF, o servidor regista com a chave de serviço o
`payload` exato do acontecimento (`registar_assinatura_verificada`, só executável pela chave de serviço; tabela
`assinaturas_verificadas`, que ninguém com sessão lê nem escreve); o acontecimento só entra com um `payload` igual,
para a mesma contratação, o mesmo lado e a mesma pessoa. O PDF passa a ser carregado pelo servidor (a política de
inserção do balde fica fechada, `with check (false)`, para a migração não precisar de `drop`). A equipa da
plataforma continua a poder registar qualquer acontecimento. Testes em `supabase/tests/rls.test.ts`, que falham sem
a migração: sem registo, com outro `payload`, com o registo de outra pessoa da mesma entidade, a tabela e a função
fechadas a quem tem sessão; e o balde, que nenhuma parte escreve.

**Ordem de publicação indiferente.** Enquanto a migração não estiver aplicada, a função não existe (`PGRST202`) e a
base ainda tem a política antiga: o servidor segue sem o registo, que não abre nada que não esteja aberto. Assim o
código pode ir para produção antes ou depois da migração sem parar as assinaturas. Um carregamento cujo registo
falhou já não fica preso: enquanto o passo estiver disponível, um PDF novo substitui o anterior.

**Revisão independente (06/11/2026, madrugada) — dois defeitos que a correção introduziu, e corrigidos.**
1. *O PDF guardado podia deixar de ser o verificado.* O carregamento pela chave de serviço substituía o
   ficheiro de nome fixo, e entre a verificação (que vai à rede buscar certificados, e pode demorar) e a escrita
   outra submissão podia registar a assinatura: o acontecimento dizia «certificado do Estado» e o ficheiro
   guardado era outro. Agora cada PDF chama-se pelo resumo SHA-256 do próprio conteúdo
   (`<contratação>/cliente-<sha256>.pdf`), lê-se o do acontecimento aceite pela reconstrução (o mais recente:
   depois de um litígio resolvido com «retomar», o cliente assina de novo — `resumoDaAssinaturaAceite`, testada) e
   o resumo é conferido antes de o ficheiro ser entregue a alguém. De caminho, deixa de falhar a segunda
   assinatura do cliente depois de «retomar», que com o nome fixo dava «já tinha sido carregado».
2. *Um identificador escrito de outra maneira* (maiúsculas, sem hífens) encontrava a contratação mas punha o PDF
   num caminho que nenhuma das partes conseguia ler. Depois de carregar a linha, só se usa o identificador da base.
E dois menores: um registo verificado passou a valer um só acontecimento (um gatilho gasta-o quando o
acontecimento entra — antes, o mesmo payload entrava pela API quantas vezes se quisesse, cada cópia nas provas e
num aviso à outra parte); e a aceitação simples (só fora de produção) também confirma o lado antes de registar.
**Não se proíbe** uma segunda assinatura do mesmo lado, pela razão do «retomar».

**Segunda revisão (06/11/2026, de manhã) — sete achados confirmados, todos de gravidade baixa depois de refutados; um
refutado.**
1. *Registos que sobravam:* o registo de uma tentativa recusada (por exemplo, a meio de um litígio) podia gastar-se
   mais tarde pela API, depois de um «retomar», e o pintor ficava a assinar sobre uma versão do PDF do cliente que já
   não era a aceite. Agora qualquer outro acontecimento da contratação apaga os registos pendentes, e um registo só
   vale 15 minutos (o servidor grava a assinatura menos de um segundo depois de o registar).
2. *Várias assinaturas com um só registo,* num INSERT de várias linhas: a política via todas antes de o gatilho as
   gastar. A prova passou da política para um gatilho BEFORE, que gasta o registo linha a linha — a segunda linha já
   não o encontra. A política continua a decidir quem assina cada lado.
3. *O pintor podia assinar sobre um PDF do cliente desatualizado* se o pedido demorasse (verificações de rede) e o
   cliente assinasse entretanto outra versão: a assinatura do pintor guarda agora `sobreCliente` (o resumo do PDF do
   cliente que contra-assinou), conferido de novo mesmo antes de gravar.
4. *O contador do menu podia contar mal* com mais de 1000 acontecimentos (a API corta cada resposta às 1000 linhas):
   lê-se por páginas, e uma página que falha não dá contagem nenhuma.
5. *A lista e a página do contrato diziam «o próximo passo é seu»* a quem só acompanha (leitor, financeiro): agora
   só a quem pode assinar, com a mesma regra do contador.
Refutado: o PDF assinado pelo cliente chegar ao pintor antes da apresentação.

### Rasto de avisos: de qualquer menu até ao contrato

Pedido do promotor: «avisos bem evidentes para que o user não se perca onde está o doc e como fazer … com indicação
a cada menu onde carregar até alcançar o doc». Uma só regra decide de quem é o próximo passo e qual
(`src/domain/proximoPasso.ts`, testada): caução, adiantamento, assinar, decidir (cliente); confirmar a obra, assinar
(pintor). **Corrige um engano antigo:** a lista e o Início contavam qualquer ação disponível como «o próximo passo é
seu» — o cliente via-o enquanto esperava pelo pintor, só por poder desistir, e o pintor não o via com a comissão por
pagar. Os elos, todos a apontar para `#assinar` quando o passo é assinar:
- **menu:** contador em «Contratações» (calculado em lote, três consultas, uma vez por pedido ao servidor —
  `src/lib/contratosAMinhaEspera.ts`); no telemóvel, um ponto no botão do menu fechado (os avisos por ler do Início
  não acendem o ponto, que estaria sempre aceso);
- **Início** (as duas composições), **página da obra** do cliente e **Propostas recebidas**: o passo pelo nome;
- **lista de Contratações:** «Precisa de si» com o passo, a assinatura primeiro; o cartão realçado e o prazo;
- **página do contrato:** secção «Assinar o contrato» logo a seguir ao título, em três passos — descarregar,
  assinar (no computador, a aplicação Autenticação.gov; no telemóvel, o serviço do Estado sem instalar nada,
  pelo guia oficial do gov.pt), carregar — com o prazo; o PDF recusado em âmbar (resolve-se); o que falta ao
  condomínio dentro da secção, em texto âmbar (deixou de ser uma segunda caixa de cor); quem não é proprietário
  nem gestor lê que a assinatura cabe a quem é. As duas partes descarregam o PDF assinado (o do cliente enquanto
  espera pelo pintor; o das duas no fim);
- **email:** a ligação vai à secção, o botão diz «Abrir o contrato» e o texto diz onde e como.
De passagem, na página do contrato: o bloco «Trabalhos a mais» aparecia duas vezes (saiu o de cima) e os
«Registos sem efeito» deixaram de ser uma caixa vermelha (regra 13).

**O endereço do serviço web de assinatura ficou por confirmar.** O guia oficial existe
(`https://www.gov.pt/guias/assinar-com-a-chave-movel-digital`), mas a página carrega o conteúdo por JavaScript e não
foi possível ler dela o endereço da ferramenta. O ecrã liga ao guia e não a um endereço adivinhado. **Também não está
provado** que um PDF assinado nesse serviço passe na nossa verificação (o mesmo documento com a assinatura
acrescentada): fica para o ensaio de assinatura real (`EM_ABERTO.md`).

### O contrato por WhatsApp

Decisão do promotor («devíamos aproveitar para avisar ambos por WhatsApp?» — «sim»). Quando é a vez de uma parte
assinar, sai o modelo `contrato_para_assinar` no mesmo momento do email, a quem pode assinar pela entidade
(proprietários e gestores, como o email) e **só a quem deu o consentimento e o número**. A preferência é da pessoa e
vive onde já vivia a dos avaliadores (`survey_availability`): sem migração nova. Liga-se no **Perfil** e, enquanto o
contrato está em curso e a pessoa ainda não o ligou, na própria página do contrato; ligado, a página diz para que
número e como desligar (o consentimento retira-se com a mesma facilidade com que se dá). Na mensagem só vai a
referência da obra; o botão abre o contrato. Sem `WHATSAPP_MODELO_CONTRATO` (o modelo por aprovar na Meta) não sai
nada — e o email e o aviso na aplicação saem como sempre.

Verificado no worktree, pelo código de saída: typecheck, lint (0 erros; os avisos são os mesmos 28, nenhum nos
ficheiros tocados), `npm test` (2043, com as migrações em memória) e `npm run build`. A secção da assinatura e o
consentimento vistos num navegador (1280 e 390 px), numa página de ensaio com dados inventados que não entrou no
Git: alvos de toque de 44 px, o erro do PDF a âmbar. **Não visto com sessão:** o contador do menu, o Início, a lista e
a página verdadeira precisam de dados na base.

## 06/11/2026 — Subscrição: opção 3 do promotor, e o que já está em produção

**Pedido:** «igual à 2, mas vamos meter em linha de produção o diário e a adenda». O Cofre fica em «Já
disponível»; o diário de obra e a adenda (trabalhos a mais) passam a produção.

**O que se verificou antes de mexer (06/11/2026, base real e código):**
- **O diário e a adenda já estão em produção, e com uso.** O ecrã está no ramo publicado
  (`claude/sweet-brahmagupta-xd1vp7`, `/app/obras/[id]`) e as migrações estão aplicadas
  (`diario_de_obra`, `adendas_trabalhos_a_mais`, `adenda_oferecida`); na base real há 13 entradas de
  diário, 1 fotografia e 1 adenda. Não falta nada de código nem de base para os pôr em produção: já lá
  estão. Por isso ficam em «Já disponível», como estavam — pô-los em «A chegar em breve» seria anunciar
  como futuro o que já funciona.
- **O Cofre está fechado ao Pro no ecrã:** `/app/obras` só mostra o cofre a quem tem `temPro`; sem o Pro
  aparece a explicação e a ligação ao plano. **A base não o fecha:** os documentos (`org_documents`) são
  da entidade e servem também a validação, por isso qualquer empresa os guarda; o que é do Pro é o cofre
  com os avisos de validade. Fica assim, registado.
- **Uma contradição que fica para o promotor decidir:** a página do Pro vende a adenda e o diário como
  benefícios, mas desde 25/10/2026 os dois estão abertos a todas as empresas «de propósito» (fechar a
  adenda tirava margem registada à plataforma; as ferramentas de obra são o hábito que traz o pintor).
  Quem subscreve para ter a adenda já a tinha. Ou se fecham ao Pro, ou saem da lista do Pro, ou ficam
  escritas como «também no gratuito».

Resultado: `BENEFICIOS_PRO` não muda (2 em «a chegar»: as duas linhas das obras públicas); um teste novo
fixa o Cofre, a adenda e o diário em «Já disponível».

## 06/11/2026 — Caleiras passam a tipo de obra orçamentável; a minuta passa a ter versão

**Pedido do promotor:** «Caleiras» em «O que pretende fazer?», com o estado e o que se pretende
(renovar; substituir partes, com os metros; apenas limpar; limpar e pintar), no contrato e no orçamento.

**Como.** Seguiu-se o precedente do capoto: a especialidade que estava só *registada* na ficha do prédio
(`buildingNeeds.ts`) passa a orçamentável. `caleiras` entra no **fim** de `WORK_TYPES` e do enum
`work_type` (a ordem decide o tipo principal; no fim, nenhum pedido existente muda). **Não é um
`SurfaceKind`**: as caleiras medem-se em metros, não em m², e não entram na soma das áreas nem no volume.
O campo próprio (`CamposDasCaleiras.tsx`) só aparece com o tipo marcado; o servidor (`parseCaleiras`) e a
base (`check`) validam as opções e os metros (positivos, até 2 km, «substituir» exige-os e só ela os tem,
nunca mais do que o comprimento total). Metros em centésimos de metro, inteiros. Os valores vão para o
anúncio na publicação, pelo gatilho que já copia o resto. O pintor vê-os em «Declarado pelo cliente» e
orçamenta em `ml` (unidade que já existia em `proposal.ts`); não os pode alterar.

**Por confirmar pelo promotor (gravado como proposta):** as opções de «estado» — *bom estado*, *desgaste
ou tinta a descascar*, *ferrugem*, *furos ou partes partidas*, *não sei* — e se interessa o comprimento
total (pedido como facultativo).

**A minuta passa a ter versão (`engagements.minuta_versao`).** O PDF do contrato gera-se de novo a partir
dos dados e os bytes têm de bater com o que cada parte assinou. Mudar o texto para toda a gente faria o
pintor assinar um documento diferente do do cliente numa contratação já a meio. Por isso o texto novo
(o declarado no pedido; depois, os elementos das partes e a cláusula de alteração) só vale para as
contratações criadas com a versão `2026-11-06`; as existentes ficam com a coluna vazia e o texto de
sempre, fixado byte a byte em `minuta.test.ts` (impressão digital tirada do código de 05/11/2026). A
migração aplica-se **no momento da publicação**: uma contratação criada entre uma e outra receberia a
versão nova com o código antigo.

**Contratos já assinados não mudam:** o PDF assinado é o guardado e conferido pelo resumo (91d3075), e o
texto das contratações antigas não muda.

## 06/11/2026 — IBAN, contactos e comprovativos: a plataforma recolhe e regista, não intervém

Decisões do promotor (06/11/2026, adenda ao pedido), e como ficaram construídas.

**Elementos do contrato** (`elementos_do_contrato`, `src/domain/elementosDoContrato.ts`): IBAN, telefone e email
para correspondência de cada parte, por contratação.
- **Quando:** depois da apresentação (`fee_recebido` — as partes já se conhecem, regra 6) e **até à primeira
  assinatura registada** («assinado» = a primeira assinatura, decisão do promotor). Depois dela não há ecrã nem
  ação: qualquer alteração é por adenda ao contrato, entre as partes, fora da plataforma. A base recusa o que
  estiver fora deste prazo (gatilho), não só o ecrã.
- **Ordem real dos estados (T3.1):** no percurso v2 o pintor paga a comissão, as partes conhecem-se, e só depois
  o cliente assina — o IBAN do pintor cabe antes da geração do PDF. Para garantir que lá está, **o cliente não
  assina nem descarrega o PDF a assinar** sem o IBAN do empreiteiro (só na minuta nova). O pintor assina o PDF
  que o cliente assinou, por isso o texto não muda entre as duas assinaturas.
- **Qualquer das partes** altera os seus; a outra é sempre avisada por email de cada campo (o IBAN vai mascarado).
  A aplicação envia email (e WhatsApp onde já está ligado para o contrato); **não envia correio postal**.
- **Nada se apaga:** cada alteração é uma linha nova (parte, campo, valor, desde quando, quem, como foi
  validado); o em vigor é a mais recente. Nem a chave de serviço reescreve ou apaga (gatilho
  `so_de_acrescentar`). O contrato gera-se sempre de novo a partir dos dados (é determinístico), por isso cada
  versão anterior reconstitui-se do histórico; a impressão digital de cada versão fica também no registo do
  percurso (secção seguinte).
- **Email novo:** código de 6 algarismos enviado para ele; até ser indicado, vale o anterior. Validade de 10
  minutos, 5 tentativas por código, 3 códigos por hora por contratação e parte; guarda-se só o SHA-256 do código
  (com o identificador da linha como sal) e compara-se em tempo constante. Se for o mesmo email do início de
  sessão de quem o indica, não se pede código: fica «validado antecipadamente pelo início de sessão». **Não se
  usa o `updateUser` do Supabase:** mudaria o email de acesso da conta, que é outra coisa — este é o email de
  correspondência de um contrato, de uma parte que pode ter várias pessoas.
- **Telefone:** regista-se sem validação (o promotor só pediu para o email; SMS tem custo — pergunta em aberto).
- **IBAN:** português, com o algarismo de controlo (`isValidPtIban`); mascarado nas listas e nos avisos; nunca
  nos registos do servidor. Contas estrangeiras: pergunta em aberto. **Não é o `supplier_payout_details`**
  (IBAN por entidade, para pagar comissões a fornecedores).
- **Escreve só o servidor** (chave de serviço), depois de confirmar que quem pede gere aquele lado (proprietário
  ou gestor). Nenhum utilizador escreve nas tabelas diretamente.

**Contrato (minuta 2026-11-06):** os elementos de cada parte em «Partes»; em «4. Pagamentos», as restantes
tranches pagas ao empreiteiro por transferência ou depósito para o IBAN dele (articulado com a frase que já lá
estava, sem a duplicar); e a cláusula nova **«4-A. Elementos das partes»**, com a **redação por validar pelo
jurista** (não definitiva). O contrato chama às partes «dono da obra» e «empreiteiro», não «primeiro» e
«segundo outorgante»: manteve-se a forma do contrato, e o «segundo outorgante» do promotor é o empreiteiro.
Só nas contratações criadas com a minuta nova; os contratos já assinados não mudam.

**Comprovativos de pagamento** (`comprovativos_de_pagamento`, cofre privado `comprovativos-de-pagamento`): por
tranche, o cliente regista valor, data, uma **nota livre opcional** (confirmada pelo promotor — por exemplo,
«pago para outro IBAN, na sequência de uma adenda entre as partes») e o ficheiro. Só depois das duas
assinaturas; só de acrescentar; a data é a do servidor. As imagens perdem os metadados; guarda-se o SHA-256 do
que se guardou, que é também o nome do ficheiro. Leem as duas partes e a equipa. **O comprovativo não marca a
tranche como recebida** — continua a ser o pintor a confirmar (por confirmar com o promotor). A plataforma
regista o que lhe dizem e não valida.

## 06/11/2026 — Conclusão da obra, início da garantia e conservação dos registos

Decisão do promotor: a plataforma é **terceira isenta** — guarda o registo e a prova documental e não decide
quem tem razão.

- **Início da garantia:** quando uma parte declara a obra concluída (com a data) e a outra confirma
  (`conclusao_da_obra`, `src/domain/garantia.ts`). Qualquer parte pode declarar; a outra é avisada por email e
  pode confirmar, **discordar com uma razão escrita** (fica registada, sem julgamento) ou juntar prova. Sem
  resposta, fica «declarada por uma só parte» e quem declarou é convidado a juntar prova (fotografia ou PDF,
  mesmos limites, sem metadados, cofre privado `provas-da-obra`, SHA-256). A declaração unilateral não inicia
  a garantia. Cada passo é só de acrescentar e tem a data do servidor.
- **Duração como número:** o contrato tinha a garantia só em texto. As contratações novas guardam
  `engagements.garantia_anos`, copiado da proposta escolhida no momento em que são criadas; nas antigas o número
  vem da proposta escolhida (que já não muda). O texto «5. Garantia da obra» já diz que a garantia contratual não
  reduz o prazo legal de cinco anos (art. 1225.º CC): o cálculo é só da garantia contratual e não o contradiz.
- **Conservação:** fim da garantia = início + duração; fim da conservação = esse fim + 24 meses
  (`garantias_calculadas`, com a data do cálculo, só de acrescentar). Nada destes registos se apaga — nem pela
  chave de serviço (gatilho), nem pela contratação (`on delete restrict`). **Não há apagamento automático.**
  Depois do período, apagar ou anonimizar só a pedido, pelo modo que o jurista decidir.
- **Propostas do chat, por confirmar (EM_ABERTO):** 15 dias para a outra parte confirmar, com lembrete aos 7
  (o prazo está em código; o lembrete ainda não sai — fica para a tarefa diária dos toques); discordar com razão
  (construído); ação própria «Declarar a obra concluída», em vez do estado `concluida` do diário (construído
  assim); sem declaração, os registos ficam sem limite; conta encerrada no período: registos mantidos com acesso
  restrito às partes e à equipa.

**Alerta para o promotor e para o jurista, tal como está:** a garantia contratual pode ser curta (2 anos, por
exemplo); com mais 24 meses são 4 anos — e o texto do contrato já cita um prazo legal de cinco anos. A pergunta
ao jurista é se a conservação deve seguir o prazo mais longo. Não se decidiu.

## 06/11/2026 — O registo do percurso negocial de cada obra, e o relatório gratuito ao cliente

Pedido do promotor: manter o percurso negocial de cada obra desde a abertura de conta (pedido de orçamentos,
quais foram a «jogo», quem ganhou e em que condições, adendas…), disponível ao backoffice e entregue ao
cliente, **gratuitamente**, se o pedir por motivos de prova em litígio ou disputa de consumo.

**Auditoria — o que se perdia até aqui** (migração `registo_da_obra`, cabeçalho):
1. Um pedido em rascunho apaga-se, e leva em cascata propostas, versões, mensagens, fotografias, zonas, anúncio
   e relatório de propostas — e um pedido publicado que volta a rascunho passa a poder ser apagado, com as
   propostas já submetidas.
2. Apagar um prédio apaga os pedidos dele em qualquer estado (exceto com contratação, que trava).
3. Apagar uma entidade (`delete_organization`, só sem histórico próprio) leva os seus rascunhos — incluindo um
   pedido que voltou a rascunho com propostas de outros pintores.
Já travavam: a contratação e os seus acontecimentos, e os registos de 06/11 (elementos, comprovativos,
conclusão, garantia), todos `restrict`.

**Daqui em diante:** um registo só de acrescentar, `registo_da_obra`, escrito por gatilhos com a data do servidor
e **sem chaves estrangeiras** (sobrevive ao apagamento do que regista). Regista: abertura de conta e quem entra
na entidade; criação, mudanças de estado e publicação do pedido; cada estado das propostas com as condições
(preço, IVA, adiantamento, plano de pagamentos, duração, início, garantia) e as versões; o relatório de
comparação (quais entraram); a contratação e todos os seus acontecimentos (com a impressão digital do documento
assinado); as adendas; os elementos do contrato (IBAN mascarado) e a impressão digital de cada nova versão do
contrato por assinar; os comprovativos; a conclusão e a garantia; o pedido, a emissão e a entrega do relatório.
**Antes de um apagamento**, o gatilho copia a linha inteira para o registo (pedido e propostas que já tinham
saído de rascunho). Ninguém o reescreve nem o apaga — nem a chave de serviço. Só a equipa o lê. Escolheu-se
copiar em vez de trocar o apagamento por arquivo: não muda nenhum ecrã nem nenhuma regra de quem pode apagar
o quê, e o que se prova fica num só sítio. Os avisos enviados (`toques`, `avisos_por_email`) continuam nas
suas tabelas e não se copiam (não se apagam com o pedido).

**O relatório** (`src/domain/percursoNegocial.ts`, `relatorios_do_percurso`): tirado do registo, por ordem, com
as datas do servidor, resumido (SHA-256) e guardado uma vez, sem nunca mudar; emitir outra vez é uma versão nova.
Duas versões geradas cada uma por inteiro: a **completa** (backoffice) e a **do cliente**, sem o que a
plataforma cobra ao pintor (nenhum valor dos acontecimentos da contratação; «confirmação do pintor») e sem a
identidade dos pintores que não ganharam («Pintor A», «Pintor B»), de quem só se diz o estado da proposta.
O texto diz o que o relatório é — um registo do que aconteceu na plataforma, com datas — e **não** diz que tem
valor de prova.

**Como se pede:** na página do pedido, em Documentos, «Pedir o relatório desta obra», com o motivo (litígio,
disputa de consumo, outro). Gratuito, sem subscrição. A equipa emite em Backoffice › Pedidos › Relatórios do
percurso; para o cliente, a aplicação confirma antes que quem pediu é, hoje, pessoa da entidade que fez o
pedido. O cliente é avisado por email e lê o relatório na página do pedido.

**Por responder pelo promotor:** (a) o pintor também pode pedir o relatório da sua obra? (b) o relatório do
cliente pode mostrar os pintores que não ganharam, ou fica como está? **Para o jurista:** conservação deste
registo e por quanto tempo; direito ao apagamento (RGPD) face a um registo que não se apaga; o que entregar ao
cliente; a entrega gratuita a pedido.

## 06/11/2026 — Interior da habitação: divisões, perímetro e pé-direito, cor e lista de materiais

Pedido do promotor (com a adenda 2): medir o interior por perímetro e pé-direito, escolher a cor e ver os
materiais com preços de mercado.

**Estado verificado antes de construir:** a ferramenta das fachadas (`homografia.ts`, `fachadaMedida.ts`,
`MedirFachada.tsx`) só vive em `/demo-areas`; fora dela só a usa `margemDaArea.ts`. **A ligação ao pedido não
existe** e não foi feita nesta sessão (pergunta em aberto). O separador «Alçados» mostra a lista de zonas de sempre.

**Separadores** (`separadoresDoPasso`): interior e exterior (fachadas, muros, moradia) → «Alçados» e «Interior da
habitação»; só interior → só o interior; sem interior → como sempre. Zonas comuns: não se mexeu — com interior,
aparecem os separadores com «Zonas e medidas» no primeiro (pergunta em aberto).

**Editor próprio, não um pacote.** Não se ensaiou o `react-planner` (Redux + Immutable, `ReactDOM.render`,
React ≥ 16, sem áreas de parede): a conta é pequena e cabe no domínio. Três modos (`src/domain/interior.ts`):
- **Divisões e medidas:** comprimento × largura, ou o perímetro numa divisão irregular; pé-direito geral ou por
  divisão; portas e janelas; pintar paredes e/ou teto. Cotas escritas → `declarada`.
- **Sobre a planta da casa:** a planta abre **só no aparelho** (`URL.createObjectURL`, nunca enviada — regra 6);
  dois toques numa medida conhecida dão a escala; dois cantos opostos dão cada divisão, com a margem de erro do
  toque. → `estimada`. Um PDF exporta-se primeiro como imagem (não se lê PDF no aparelho: fica para depois).
- **Áreas escritas:** paredes (e teto) por divisão, ou o total numa divisão.
Paredes = perímetro × pé-direito − vãos; **tetos sempre à parte**. Nunca se inventa: sem perímetro ou pé-direito
fica «Por medir», e diz-se o que falta. O pé-direito corrente (2,8 m) só entra com o toque «Não sei: usar 2,8 m»,
como estimativa. **Vãos:** só descontam os indicados, e só os maiores do que `VAO_MINIMO_INTERIOR_M2` — **1 m²,
provisório, por decidir** (é a regra das fachadas; a alternativa é descontar sempre). O valor guarda-se com cada
divisão. Nomes das divisões só da lista geral («Sala», «Quarto 2»), sem texto livre.

**Onde se grava:** `request_rooms` (cada divisão, com as áreas calculadas pelo servidor, a certeza, a cor e quem
mediu — cliente ou avaliador) e duas zonas em `request_surfaces` — paredes interiores e tetos — com
`area_source` `planta` (desenho e planta) ou `medicao_cliente` (manual). O resto da aplicação (total, anúncio,
orçamento) já as lê. Só se altera em rascunho; o pintor lê os números com o anúncio aberto, nunca a planta.
Depois de publicado, uma alteração das divisões ou da cor geral fica no registo da obra.

**Cor** (`src/domain/corDaPintura.ts`): guarda-se uma referência em texto — `QP-014 · Branco gelo`, `RAL 9010`,
`Barbot · Casca de Ovo` — e, só para o ecrã, o hex da paleta própria. **Não se embutem RAL, NCS nem Pantone**
(proprietárias; a reprodução exige licença): a grelha é a paleta própria `QP-nnn` (`paleta_cores`, 60 cores de
interior propostas nesta sessão, leitura pública, escrita só da equipa); quem souber um código de outro sistema
escreve-o, e fica texto sem quadrado. As cores de fabricante (`reference_products.cores`) aparecem num segundo
separador, só com nome e marca. «Escolher cor» abre um `<dialog>` nativo: pastilhas por família, quadrado
grande, «Escolher outra» / «Confirmar»; cada pastilha tem o nome em texto. Está no campo geral «Cor e
acabamento» (o mesmo campo de texto, que continua a aceitar texto à mão) e em cada divisão. O contrato e o
anúncio levam as cores com a frase «A cor final é a da amostra do fabricante; a cor no ecrã é aproximada.»

**Lista de materiais** (`ListaDeMateriais.tsx`, `materiaisDoInterior.ts`): `reference_products` visíveis, por omissão
tintas de interior, primários e esmaltes, com filtros por tipo e marca: preço de referência com data e fonte,
por litro e por m² (por demão), rendimento, embalagens, ficha técnica, e o consumo estimado (litros ≈ área ÷
rendimento × demãos, demãos à escolha) — sempre dito como estimativa, e os preços como de mercado, não da Quem
Pinta nem de um pintor. Não se reaproveitou `ProductCard`, que é dos produtos dos fornecedores (`products`), não
dos de referência; reaproveitou-se `ProductThumb` e os cálculos de preço (`pricePerLitre`). Escolher na lista
não encomenda nada (por agora, a lista é só de consulta).

**No contrato (minuta nova) e no anúncio do pintor:** as divisões a pintar, as áreas (paredes e tetos à parte),
as por medir e as cores, em «Declarado pelo dono da obra no pedido» / «Declarado pelo cliente».

**Por decidir (EM_ABERTO):** vãos; RAL/NCS com licença ou só a paleta própria; a lista inicial de cores (está
uma proposta); se a estimativa de litros aparece ao cliente ou só ao avaliador (hoje aparece a quem preenche);
se a ferramenta entra já no pedido (foi o que se fez, em rascunho) ou fica primeiro num ecrã de ensaio; a
ligação da ferramenta das fachadas ao pedido; as zonas comuns. **Por validar no terreno:** 3 ou 4 plantas reais
com uma medida conhecida e uma casa medida à fita ou a laser.
## 06/11/2026 — A medição do cliente pela fotografia grava-se no pedido (fase 1: base, regras e ação)

**Pedido do promotor:** «avança com a gravação no pedido, medido pelo cliente», sobre a decisão de 05/11/2026 (o
cliente também mede, na ferramenta de fotografia; a zona fica com origem própria e margem, nunca confirmada).

**Como fica.**
- Origem nova `medida_pelo_cliente` («Medida pelo cliente») e coluna `margem_bps` em `request_surfaces`
  (migração `20261106083508_medida_pelo_cliente`, aplicada a 06/11/2026). Não se reutilizou `medicao`, que confirma a
  zona sozinha, nem `medicao_cliente`, que existe na coluna antiga e a migração de 30/10 converteu em confirmada.
- **A base garante as duas regras** — as políticas deixam quem gere o pedido escrever qualquer coluna pela API: só
  a zona medida pelo cliente tem margem, e tem-na sempre; e fica sempre por confirmar. Testes de base, que falham
  sem a migração.
- A conversão é pura e testada (`src/domain/medicaoDaFotografia.ts`): área a pintar em centésimos de m², margem
  em pontos-base **arredondada para cima**; não grava uma fachada sem contorno, com partes por medir, com área nula
  ou absurda, nem sem margem conhecida («melhor não gravar do que gravar sem ela»).
- Grava-se a área e a margem, **nunca a fotografia nem o desenho** (regra 6: o pintor lê as zonas do anúncio).
- Ação `gravarMedicaoDaFotografia` (`src/app/app/pedidos/actions.ts`): numa zona existente ou numa nova; quem pode
  gravar decide-o a base (gerir a entidade, ou ser o avaliador do pedido, com o pedido em rascunho); uma gravação
  recusada sem erro (nenhuma linha) não diz «Guardado»; a autoria passa a quem mediu.
- O formulário manual recusa a origem nova. Uma zona medida pelo cliente editada à mão sem mudar a área continua a
  ser a mesma medição («manter»); com a área mudada perde a margem e passa à origem escolhida.
- A ferramenta entrega o resultado do passo 4 a quem a abre (`aoMudarMedicao`), só durante o passo 4 e nunca a meio
  de um recálculo da margem.

**Revisão adversarial (06/11/2026), sete correções, nenhum achado refutado.**
1. *Uma fachada com varandas nunca se gravava:* a lista do que falta medir trazia sempre «faces de dentro das
   varandas (decisão 8.2)», que espera pelo promotor e não por quem mede. Passa à parte (`porDecidir`, a constante
   `FACES_DE_DENTRO_DAS_VARANDAS`): não impede gravar, e a mensagem diz que essas faces ficam de fora.
2. *Gravar numa zona existente com quantidade 3 triplicava a área medida* sem o dizer: a medição grava sempre
   `quantidade = 1` (a ferramenta mede uma fachada).
3. *A restrição da margem deixava passar uma margem numa zona sem origem* (`=` com nulo dá nulo, e uma restrição
   nula passa): agora `is not distinct from`, com teste.
4. *Mudar à mão a área de uma zona medida pela fotografia, com «manter»,* passava-a a estimativa em silêncio: agora
   pergunta de onde vem o número novo.
5. *A ferramenta podia avisar o anfitrião em ciclo* (uma função nova a cada render): a função fica numa ref e só se
   avisa quando a medição muda.
6. *O texto gravado da margem podia diferir do que o ecrã mostra:* `margemEmTexto` segue a regra do passo 4 (uma
   casa, nunca abaixo de 0,1 %).
7. *O relatório para a assembleia lia a origem antiga* e dizia «estimativa» a uma medição: lê a nova.

**Fase 2, feita (06/11/2026, no ramo `passo2b-wip`).**
- *«Usar esta medição» grava.* A janela «Levantamento da área da obra» recebe a medição do passo 4 e chama
  `gravarMedicaoDaFotografia` para a zona escolhida, ou cria uma zona nova (tipo e nome). Enquanto a medição não
  serve, o botão fica desativado com a razão ao lado — a de `zonaDaMedicao`, a mesma que o servidor volta a
  perguntar, sem regras duplicadas no ecrã. Recusada pela ação, a razão aparece em âmbar no rodapé (regra 13), e
  uma falha de rede também, com a medição ainda na ferramenta. Gravada, a janela fecha, a página atualiza-se
  (`router.refresh`) e por baixo do total fica a linha do que entrou: «Tardoz · Gravado: 133,18 m², medida pelo
  cliente ± 1,7 %, por confirmar no local.»
- *Aparece a quem pode editar o pedido* (gerir a entidade, pedido em rascunho), já não só à equipa; quem só o lê
  nunca a vê. **Excepção:** no ecrã do levantamento do avaliador não se oferece — ele mede no local, e o que mede
  fica confirmado; a ferramenta gravaria «medida pelo cliente», que não é o que ele faz.
- *«Para que zona»* lista as zonas que a ferramenta mede — fachadas, empenas e muros (`medeSeNaFotografia`) — com o
  que as distingue («— sem medidas», «— fora do pedido», «— por decidir se entra»), e «Uma zona nova», cujo tipo fica
  pelos mesmos três. Uma zona **confirmada no local** aparece desativada: trocar a medida de quem lá foi por uma da
  fotografia era perder certeza sem ninguém o decidir. O editor de uma zona sem medidas também leva à ferramenta.
- *A margem nunca se separa do número* (`origemEmTexto`): «Medida pelo cliente ± 1,7 %» no cartão da zona, no
  «Hoje:» da janela, no editor e, ao pintor, no anúncio (`ListingPreview`, na pré-visualização do cliente e na
  oportunidade do pintor — só o rótulo e a margem, nunca a fotografia). A oportunidade pede `origem_quantidade` e
  `margem_bps` e, sem a coluna (migração por aplicar), lê o resto, para o anúncio não ficar sem zonas. «± 1,7 %»
  leva espaços inquebráveis: no telemóvel o «%» caía sozinho na linha de baixo.
- *A barra tem quatro troços, e não três* (`trocosDaBarra`, testada): confirmado (cobalto cheio), medido pelo
  cliente (riscas de cobalto sobre o pálido — ver a revisão abaixo), estimado (pálido) e as zonas sem medidas (tracejado). A medição do cliente não é
  confirmada (ninguém a viu no local) nem estimativa (tem margem calculada). Por isso o que se dizia «medidos» diz
  agora **«confirmados»** — ao lado de «medidos pelo cliente», «medidos» lia-se como a soma das duas. Com várias
  medições do cliente, a margem da legenda é a média pesada pela área, para cima: o pior caso, os erros todos no
  mesmo sentido. A medição do cliente continua em «Falta confirmar»: confirma-a quem mede no local.

**Revisão da fase 2 por dois céticos (06/11/2026), corrigida no mesmo commit.**
1. *Uma zona confirmada no local não se troca pela fotografia — agora também no servidor* (regra 10). A regra só
   existia no `<select>`: uma chamada direta à ação com o id de uma zona confirmada rebaixava-a e apagava largura,
   altura e vãos. `gravarMedicaoDaFotografia` lê a confirmação e o tipo da zona antes de gravar
   (`aceitaMedicaoDaFotografia`, `medeSeNaFotografia`, testadas) e o próprio update leva
   `.neq('confirmacao', 'confirmada')`, para o caso de a zona ser confirmada entre a leitura e a escrita.
2. *O editor decide pela confirmação gravada*, não pela origem escolhida no campo: numa zona confirmada, mudar a
   origem para «Estimativa» fazia aparecer «Medir na fotografia», e a janela abria-se sobre **outra** zona e gravava
   nela. Já não aparece; e, se a janela for aberta para uma zona que não serve, abre sem zona escolhida e diz porquê,
   em vez de escolher outra em silêncio.
3. *Zona nova vinda do editor:* o tipo e o nome já escritos lá seguem para a ferramenta (antes, gravava «Fachada»).
4. *«Guardar e medir outra fachada», dentro do pedido, diz o que faz:* «Medir outra fachada», com a nota de que esta
   fica de lado e que para a pôr no pedido é «Usar esta medição». O botão guardava só na ferramenta e apagava a
   medição que ia para o pedido, e quem carregava em «Guardar» julgava ter gravado (`MedirFachada`, `noPedido`).
5. *O rodapé diz o que acontece ao número que a zona já tem* (`fraseDaGravacao`, testada): «Em Tardoz, substitui
   133,18 m² (medida pelo cliente ± 1,7 %) por 220,52 m², …», e, quando a quantidade passa de 6 para 1, também isso.
   Numa zona nova, «numa zona nova» — e não «em uma», que é do português do Brasil.
6. *Antes da migração `20261106083508`*, a ação devolvia «O pedido tem de estar em rascunho…», falso para quem o
   gere. Os erros de coluna ou restrição em falta (42703, PGRST204, 23514) dizem agora «A gravação pela fotografia
   ainda não está disponível» e ficam no registo do servidor.
7. *O texto do editor* prometia «Sem fita à mão»; a ferramenta pede uma medida tirada com fita. Passou a «Sem as
   medidas da zona: uma fachada mede-se pela fotografia e por uma medida tirada com fita (uma porta, uma janela).»
8. *Na barra, o troço do cliente às riscas.* O cobalto intermédio contra o estimado dava 1,41:1 e lia-se como
   estimativa. As riscas (`.troco-riscado`, `globals.css`) distinguem-no sem depender do tom, também na legenda.
9. *Ao pintor, todas as zonas dizem de onde vem a área e se está confirmada* (`origemParaOPintor`, testada):
   «Estimativa · por confirmar», «Medida pelo cliente ± 1,7 % · por confirmar», «Medição · confirmada». Só com a do
   cliente rotulada, uma estimativa sem margem parecia mais fiável do que a medição com ± 1,7 %.
10. *A linha «Gravado: …» sai quando a zona muda por outro caminho* (editada, removida, posta fora do pedido):
    depois de a página a mostrar como ficou gravada, deixar de bater certo apaga-a.
11. *A razão do botão desativado* já não parte «(passo / 4).»: a caixa passou a 44ch e o «passo 4» leva um espaço
    inquebrável.

## 06/11/2026 — A paleta QP está aprovada

O promotor aprovou a paleta própria da Quem Pinta tal como foi proposta: as 60 cores `QP-001` a `QP-060`, com os
nomes, os tons e as oito famílias que estão na migração `20261106084200_interior_e_cores` (já aplicada e em
produção). É a tabela de cores da aplicação; RAL, NCS e Pantone não entram (precisariam de licença da RAL gGmbH ou
da NCS Colour AB, e ninguém a pediu). Quem souber um código desses continua a poder escrevê-lo no campo, como texto.
Mudar, acrescentar ou desativar uma cor faz-se pela equipa (`paleta_cores`, escrita só da equipa); desativar
(`ativa = false`) em vez de apagar, porque há referências gravadas em pedidos e contratos.

## 06/11/2026 — Respostas do promotor às 12 questões, e o que mudou por causa delas

Antes de aplicar, comparou-se cada resposta com o que já estava construído; as três que colidiam foram
perguntadas ao promotor (pontos 6, 7 e 12) e as respostas dele estão abaixo.

1. **Vãos no interior:** fica a regra de 1 m² (como nas fachadas). **Construído:** cada vão tem «Descontar:
   automático / sim / não», que manda sobre a regra, e cada divisão mostra quanto se descontou das paredes.
   A escolha grava-se com o vão.
2. **Caleiras:** as cinco opções de estado confirmadas; comprimento total facultativo; os metros a substituir só,
   e obrigatórios, em «Substituir partes». Era o que estava construído.
3. **Paleta própria** (QP, 60 cores, aprovada); RAL/NCS só com licença.
4. **Litros:** aparecem ao avaliador e ao cliente, sempre como estimativa e sem valor total em euros. A lista de
   materiais já era assim (preço de referência por embalagem, por litro e por m², e os litros estimados; nenhum total).
5. **O interior fica no pedido**, mas não se anuncia aos clientes antes de ser testado com plantas reais.
6. **Ferramenta das fachadas no pedido: fica a decisão de 05/11/2026** (o cliente também mede pela fotografia,
   com a margem à vista e a zona sempre por confirmar), e não a resposta «primeiro só do avaliador», que o
   promotor deixou cair quando se lhe mostrou o conflito. O trabalho é da sessão «Medição de zonas por
   retângulo e dois pontos»; a ligação ao botão é a próxima sessão dela.
7. **Zonas comuns usam a ferramenta do interior** (paredes e tetos), com divisões próprias: átrio, patamar,
   corredor comum, escadas. **As escadas ficam sempre «Por medir»** até haver regra própria (o servidor não
   calcula nada para elas, digam-se as medidas que se disserem). A lista de zonas mantém-se no outro separador,
   onde vivem as zonas comuns já gravadas. Migração `20261106091521_zonas_comuns_e_relatorio_do_pintor`, aplicada e publicada a 06/11/2026.
8. **O comprovativo do cliente não marca a tranche como recebida**; quem confirma é o pintor. Confirmado.
9. **SMS: não**, por agora; o código de 6 algarismos por email basta.
10. **IBAN:** só português por agora; estrangeiro (SEPA) só se aparecer um caso real.
11. **Conclusão:** 15 dias para a outra parte confirmar, **com lembrete ao 7.º dia — ligado** na tarefa diária
    das 8h (`/api/cron/toques`), uma vez por declaração (registo em `toques`); discordar com razão escrita, só fica
    registado; a ação própria «Declarar a obra concluída»; numa obra que ninguém declarou concluída os registos não
    se apagam, e o limite decide-se com o jurista.
12. **Relatório do percurso:** **o pintor contratado também o pede** (na página do contrato), e recebe a versão
    do empreiteiro: **sem o que a plataforma lhe cobrou** e sem nada das outras propostas, nem o que o cliente
    fez antes de publicar. **O relatório do cliente fica como estava**: as outras propostas aparecem só como
    «Pintor A: submetida», sem nome, preço nem condições (o promotor escolheu manter a letra e o estado). Quem
    emite continua a ser a equipa, que confirma que quem pediu é parte da obra.

## 06/11/2026 — Escadas «a olho»: a área escrita à mão fica como estimativa

As escadas das zonas comuns não têm regra de medição (continuam «Por medir» quando se indicam medidas ou se
desenha na planta). Decisão do promotor: em «Escrever as áreas», a área das escadas pode ser indicada «a olho» e
fica marcada como **estimativa** — e com ela o total das paredes, para o pintor saber que não foi medida. As outras
divisões escritas à mão continuam como medidas. A regra de medição própria das escadas continua por fazer.

## 06/11/2026 — Páginas públicas, objetivos lidos da descrição e «Guardar e continuar»

Pedidos do promotor, a ver o site:
- **Fornecedores:** «Descontos para pintores — personalizáveis: por perfil ou caso a caso» (impessoal, regra 12,
  confirmado pelo promotor). Topo: «Sem custo para os vendedores. Caso a empresa queira, pode subscrever a presença
  no catálogo.»
- **Avaliador, na página pública: sem valores nem percentagens.** Fica «Este trabalho tem remuneração elevada», e
  os valores conhecem-se depois do registo e da confirmação da atividade (o simulador continua na área do
  fornecedor, só depois da inscrição). A inscrição traz o convite ao WhatsApp: «Para ganhar levantamentos é preciso
  ser o primeiro a responder…», no site e no ecrã «Ser avaliador», com o mesmo componente de consentimento.
- **Empresas de pintura:** orçamentar é gratuito, para os pedidos da plataforma e para os clientes próprios; o
  logotipo e os contactos no orçamento são uma opção, dita como do plano Pro (o promotor esclareceu que o gratuito é
  criar orçamentos). Ferramentas: gestão de obra, stocks e consumíveis, catálogo de produtos e descontos, e
  **medir a cor de uma parede — «Em breve»**, também assim em `/app/obras`. Nota: a plataforma não cobra
  comissão aos fornecedores; os descontos combinados podem manter-se, convidando o fornecedor a aderir.
- **Objetivos do pedido lidos da descrição** (`objectivosDaDescricao.ts`): as pastilhas acendem com palavras
  aproximadas ou relacionadas (salitre, bolor, rachada, infiltrações, capoto, aconselhamento…), sem acentos nem
  maiúsculas. Continuam a não marcar trabalhos.
- **«Guardar e continuar»** passa ao passo seguinte depois de gravar; com erro, fica onde está.
- As melhorias à ferramenta das fachadas (desfazer, recorte, instruções ao lado, janela redimensionável, gravar e
  retomar, deteção) ficam para a sessão que a está a ligar ao pedido (prompt entregue ao promotor).
## 06/11/2026 — A primeira emissão na Moloni deu «emitido» com o número «undefined»

Primeira emissão a sério (conta de testes «Quem Pinta TESTES API», fatura da comissão de «Pintor Teste Lda», 188,40 €):
a fila ficou vazia e apareceu em «Últimos documentos emitidos» uma fatura «FT undefined», sem PDF, sem ATCUD e sem
botão de envio. Na base, `fiscal_documents.provider_document_id = 'undefined'`, estado `emitido`, `numero` nulo, `erro`
nulo. **A causa:** `emitDocument` lia `created.document_id` sem ver se existia, e `call` só tratava como recusa uma
lista com `false` na primeira posição — uma recusa em forma de objeto (`{ valid: 0, … }`, que a Moloni pode devolver com
HTTP 200) passava por sucesso. **Não se sabe** o que a Moloni respondeu (a resposta não se guardou) nem se há ou não um
documento do lado dela: tem de se ver na conta de testes. **A correção** (`src/domain/moloniResposta.ts`, com testes):
uma resposta sem `document_id` inteiro positivo já não conta como emitida — falha, com a resposta da Moloni no campo
`erro`, e fica por emitir; e uma resposta com `valid` a 0 ou com `errors` é uma recusa. A linha «undefined» que ficou na
base é de teste e tem de ser tratada à mão (apagada ou posta em `falhou`) antes de voltar a emitir, senão a fila não
volta a mostrá-la.

## 06/11/2026 — Passo 2: nomes, «Fora do desenho» explicado, «Recomeçar do zero»

Pedido do promotor, depois de ver o passo 2 em produção. **Feito:** «+ Acrescentar zona» passou a «+ Acrescentar
alçado» (o separador chama-se «Alçados»); «Medir na fotografia» passou a «Medir por fotografia»; o aviso de «Fora do
desenho» já não diz só «o desenho não as mostra» — diz que contam para o total, que o desenho só tem lugar para uma
fachada e que não desenha escadas, átrio nem o interior; e há «Recomeçar do zero», ao lado dos outros botões, que
remove todas as zonas do pedido, com confirmação (`apagarTodasAsZonas`; as fotografias só perdem a ligação à zona e
as medidas do prédio ficam). Remover uma zona já existia, mas só dentro da gaveta, no fim: continua lá. **Por fazer,
pedido na mesma mensagem — o desenho do prédio:** (1) o primeiro passo é a planta (quadrado, I, L, U, T), e o desenho
só tem as fachadas que se foram entregando, coladas às anteriores; (2) o desenho roda e vê-se por inteiro, para
nenhuma zona ficar «fora do desenho» por não ter sítio. Ver `docs/EM_ABERTO.md`.
