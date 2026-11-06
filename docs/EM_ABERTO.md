# Em aberto — a lista única

**Para quê.** Em 01/11/2026 o promotor perguntou duas vezes «o que falta?» e a resposta só falou do trabalho
da sessão: um ramo com um commit por publicar ficou de fora. As questões em aberto viviam espalhadas por
três documentos de milhares de linhas (`ESTADO.md` §7, `DECISOES.md`, relatórios de auditoria), com linhas
já resolvidas e sem data. Este ficheiro é o sítio onde se olha primeiro, e o que se atualiza no fim de
cada sessão.

**Regra.** Quem responder a «o que falta?», «o que está em aberto?» ou «está tudo feito?» corre antes
`scripts/ponto-de-situacao.sh`, faz as verificações de «Como se verifica» e lê esta lista. Responder só
sobre o trabalho da sessão não é responder.

Verificado a 01/11/2026. Cada linha diz de onde vem e o que a fecha.

## 1. Por fazer pelo promotor

| O quê | Onde | O que fecha |
|---|---|---|
| Rever em produção os ecrãs novos do workspace (Hoje, Levantamentos, Produtos e preços, Regras comerciais, Empresa) | quempinta.pt | dizer o que não está como se queria |
| Limpeza dos resíduos de ensaio, antes de a Stripe passar a modo real | **Feito a 06/11/2026 para as 6 entidades «SIMULACAO»** (pedidos, prédios, levantamentos e fotografias delas; ensaio desfeito primeiro, depois a sério). O script `painel-limpeza-dos-ensaios.sql` não existe no repositório. **Por fazer, só antes da Stripe real:** as outras 8 entidades de teste (Pintor Teste Lda e Condomínio Teste Rua de Altamira com contratação, 3 pagamentos Stripe e a linha da Moloni; Exotictarget; «Nuno Marujo»; «asacassc saca»; «teste de pintor»; «exotictgarte»; «Lote 14»), que ainda servem para ensaios | decidir quando |
| Apagar 2 fotografias SIMULACAO | **Feito a 06/11/2026** (as linhas saíram com o pedido). Ficam 2 ficheiros órfãos de 4,6 e 4,8 KB no balde `fotos`, pasta `d7a7b186-7f8f-46b6-874f-43dd0d8b2b0b/` (a Supabase proíbe apagar `storage.objects` por SQL) | apagar à mão em Supabase › Storage › fotos |
| Ligar a proteção contra palavras-passe comprometidas | Supabase › Authentication › Passwords — **só existe no plano Pro: adiado** (decisão do promotor, 06/11/2026) | ao passar a Pro |
| Email próprio no Supabase (SMTP); confirmar Site URL e Redirect URLs | Supabase › Authentication | adiado com o plano Pro (06/11/2026); `DECISOES.md` «Passos pendentes do promotor» |
| Assinar um contrato de ensaio com um Cartão de Cidadão emitido desde 2024 e com a Chave Móvel Digital | um engagement `zz-test-*`, PDF assinado na Autenticação.gov | confirmar que as duas ficam «de confiança» (âncora 008, `DECISOES.md` 05/11/2026); só há testes com os certificados das entidades, não com um certificado real de signatário |

| Modelo `contrato_para_assinar` do WhatsApp | **Feito a 06/11/2026:** já existia e estava «Ativo» na Meta (editado a 05/11, mesmo corpo com 1 variável e botão de URL dinâmico `https://quempinta.pt/app/contratacoes/{{1}}`); `WHATSAPP_MODELO_CONTRATO=contrato_para_assinar` posta na Vercel (só produção) — vale a partir do próximo deploy. Criou-se por engano `contrato_para_assinar_v2` (igual), em revisão: pode ficar sem uso ou ser apagado no WhatsApp Manager. Qualidade do modelo «pendente» na Meta | ver o contrato chegar por WhatsApp numa assinatura real |
| Pedido ao IRN de autorização para ler a certidão permanente de forma automática | email a certidaopermanente@irn.mj.pt (cc geral@irn.mj.pt) | **Enviado pelo promotor a 06/11/2026.** Falta a resposta do IRN; com a autorização, a leitura deixa de ser manual (secção 3) |
| Pedir ao fornecedor que ainda não escolheu os concelhos de levantamento que os escolha | o responsável, em Avaliações › Disponibilidade › «Zonas cobertas pela empresa» (desde 06/11/2026, sem concelhos não recebe oportunidades) | concelhos gravados |
| Decidir se os fornecedores registam lojas (pontos de venda) com morada própria, para que os concelhos por omissão incluam os das lojas | promotor; hoje só existe a morada da empresa (`DECISOES.md` 06/11/2026, «Sem concelhos indicados…») | decisão |
| Submeter o modelo `contrato_para_assinar` no WhatsApp Manager e, aprovado, pôr `WHATSAPP_MODELO_CONTRATO=contrato_para_assinar` na Vercel | conta WhatsApp «Quem Pinta» (1466775882007762): categoria Utilidade, Português (Portugal), corpo «O contrato da obra {{1}} está pronto para assinatura. Na Quem Pinta, em Contratações, é possível descarregar o PDF, assiná-lo com a Chave Móvel Digital ou o Cartão de Cidadão e carregá-lo assinado.», botão «Abrir o contrato» com URL `https://quempinta.pt/app/contratacoes/{{1}}` | sem a variável o contrato só avisa por email e na aplicação |
| Enviar ao IRN o pedido de autorização para ler a certidão permanente de forma automática | email a certidaopermanente@irn.mj.pt (cc geral@irn.mj.pt), já em **rascunho no Gmail da Quem Pinta** (quempinta.pt@gmail.com) desde 05/11/2026: falta preencher denominação, NIPC, n.º de consultas por mês e assinatura, e enviar | **por enviar**; com a autorização, a leitura deixa de ser manual (secção 3) |
| Migrações na base real que não estão no repositório: `20261106151731` (reaplicação de `reserva_so_para_avaliadores_inscritos`), `20261106154252_crm_fundacao`, `20261106163026_crm_codigos_e_cliques`, `20261106165113_crm_campanhas_e_dossier` | da outra sessão; pôr os ficheiros no repositório, senão uma base construída de raiz pelo repositório fica diferente da real | ficheiros no repositório |
| Ver em produção o topo de «Avaliações › Hoje» do avaliador | quempinta.pt, com uma conta de vendedor: sem inscrição vê a lista do que falta; inscrito e com os concelhos gravados vê «Quanto pode ganhar» e, uma vez, a janela «Tudo pronto» (`DECISOES.md` 06/11/2026) | dizer o que não está como se queria |
| Percurso real dos condóminos em produção | quempinta.pt, com um condomínio e um pedido publicado: criar o código do prédio, abrir `/predio/<código>` numa janela anónima, registar com um email seu, entrar pelo link, ver `/app/condominio` | dizer o que não funcionou |

## 1b. WhatsApp — passos do promotor (02/11/2026)

O código está feito; o canal abre quando isto estiver feito, pela ordem de `docs/WHATSAPP.md`: número
dedicado → conta Twilio → WhatsApp sender → verificação da empresa na Meta → modelo `aviso_quem_pinta`
aprovado → as quatro chaves na Vercel. Migração `20261102090000_avisos_por_whatsapp` aplicada a 02/11/2026.

**Convites aos avaliadores (05/11/2026): no ar e provados de ponta a ponta** (convite entregue → «Aceito» →
reserva → resposta lida, às 20:31). Canal: **Meta direta** (Cloud API), conta WhatsApp «Quem Pinta»
1466775882007762, número +351 926 549 194 (id 1500003363188840), pagamento com cartão em euros, aplicação
publicada (Live) e **subscrita à conta de mensagens 2334889570658270** — ver `docs/WHATSAPP.md`. Por fazer:
(1) **a convocatória com ondas, vista a correr a 06/11/2026, 16:35 (Lisboa):** um pedido de teste novo
(`zz-test-convocatoria`, concelho de Viana do Castelo, levantamento n.º 1012) fez sair a **1.ª onda** ao minuto seguinte
para o único avaliador elegível (a empresa Exotictarget), entregue no telemóvel de teste. Antes disso a convocatória
respondia «sem candidatos» aos levantamentos antigos de teste porque a empresa tinha as reservas dessas ofertas
**libertadas** (excluída delas). O «Aceito» foi respondido 8 segundos depois e o levantamento ficou **reservado**: o circuito (onda → convite →
«Aceito» → reserva → resposta) passou de ponta a ponta com a convocatória a sério. Os dados de teste foram apagados. Por
ver: a 2.ª onda, 60 minutos úteis depois (só se vê com mais de um avaliador elegível); (2) o modelo `avaliador_nova_oportunidade` foi
**reclassificado como Marketing** pela Meta (custa mais e tem limite de mensagens por pessoa). A 05/11/2026,
18:58, a Meta enviou «pedido para atualizar a categoria de UTILITY para MARKETING aprovado… podes continuar a
enviar mensagens com este modelo»: o modelo **funciona, como Marketing**. Não foi um recurso ganho — se o custo
pesar, o texto mais informativo proposto a 05/11 (modelo novo, Utilidade) fica como alternativa; (3) o nome de apresentação «Quem Pinta» está em revisão (o cabeçalho mostra o número até aprovarem);
(4) apagar as chaves `TWILIO_*` da Vercel e fechar a conta Twilio; (5) os modelos `propostas_disponiveis` e
`levantamento_agendado` ficaram na conta antiga e não são usados — recriar só quando houver quem os envie.
Ficam por decidir/construir: a «informação do levantamento» e a «resposta a tempo» ainda não entram na
ordem das ondas (só a qualificação geral, como no simulador); um painel interno com avaliadores elegíveis
por concelho, para recrutar onde não há nenhum.

**Comissões do avaliador, pessoais (05/11/2026):** construído e aplicado (`20261105103940`). **Livro de movimentos: ligado a 06/11/2026**
(migração `20261106201820_contas_dos_avaliadores_no_livro`, **por aplicar** à base real — `syncLedger` falha a
gravar os lançamentos de avaliadores, com erro de conta inexistente, até lá; ver `DECISOES.md`, 06/11/2026, com as
decisões «por validar pelo contabilista»: contas 22.3/62.2.3, IVA e retenção do recibo verde e do ato isolado).
Fica: aplicar essa migração antes do primeiro pagamento real e correr «Sincronizar agora»; os resgates de
avaliadores pagos ainda não entram na «Conferência» com o extrato do banco (só os de adesão); e as colunas `recebimento`/`nif_pessoal` de `survey_availability` (de 05/11, manhã) ficaram
sem uso desde que a comissão passou a ser sempre da pessoa — retirá-las numa migração com confirmação.

## 1c. Dinheiro e faturação — o que separa a app do primeiro pagamento real (05/11/2026)

Código escrito e testado, **nada provado com dinheiro nem com a fiscalidade real**. Fica por esta ordem:

1. **Moloni: criar a conta de testes** (`moloni.pt/registo`, NIF fictício, 30 dias, API completa; resposta do
   ticket J98-JYQ-L177, 23/10/2026). Só o promotor a cria (termos, confirmação de email). As credenciais
   dela nunca se misturam com as da conta real (`MOLONI_*` na Vercel são da real). Depois: fechar os 7 pontos
   por confirmar de `FATURACAO.md` e só então ligar o «Emitir» do backoffice. O ticket tem a data de 23/10
   para pedir prorrogação.
1b. **Envio da fatura ao cliente: construído a 05/11/2026**, automático na emissão (ver `FATURACAO.md`). Falta ensaiá-lo
   de ponta a ponta quando existir a conta de testes da Moloni (PDF a chegar por email, `/app/faturas`, «Reenviar»).
2. **Stripe em modo real:** ativar a conta com os dados da empresa; criar de novo a taxa de IVA
   (`STRIPE_TAX_RATE_IVA`) e os produtos; limpar os resíduos de ensaio antes (secção 1).
3. **Caução e devoluções:** cobrança por Checkout, devolução automática por regras e por cron diário
   (`/api/cron/devolucoes`) — só vistas em modo de teste. Falta um percurso completo em teste do pagamento à
   devolução, e a validação do contabilista sobre a natureza fiscal da caução (secção 2).
4. **Livro de movimentos:** os resgates de avaliadores entram nele desde 06/11/2026 (código e testes feitos); falta **aplicar a migração `20261106201820`** e o contabilista validar as contas, o IVA e a retenção (ver 1b).
5. **IVA trimestral e fecho formal; acesso do contabilista** (`CONTABILIDADE.md`).

## 2. Decisões do promotor que travam construção ou dinheiro

| Tema | Pergunta | Origem |
|---|---|---|
| Medição de zonas: tolerância angular | Proposta 2º de desvio face a 90º — confirmar | Handoff 03/11/2026, secção 8.1 |
| Medição de zonas: profundidade inicial das varandas | Sem valor decidido; enquanto não houver, o campo fica vazio | Handoff 03/11/2026, secção 8.2 |
| Medição de zonas: valor de `INCLINACAO_TIPICA_GRAUS_PROPOSTA` (20º) | Decidido 03/11/2026 aceitar erro maior (correção aproximada com inclinação assumida) em vez de EXIF ou mais um ponto — falta só confirmar/corrigir o valor de 20º no piloto | `docs/DECISOES.md`, 03/11/2026, "correção aproximada com inclinação assumida" |
| Stripe em modo real | Só depois da limpeza e de testar a conta de faturação | `PAGAMENTOS_E_ASSINATURA.md` |
| Percentagem do levantamento por avaliador | Validar pesos e banda (1%–2,7%) num caso real antes de ligar a dinheiro verdadeiro | `ESTADO.md` §7 |
| Fee dinâmico (18–23%) | Pesos finais, ecrãs, indicador S, composição com os códigos de adesão. O motor está pronto e não ligado | `ESTADO.md` §7 |
| Contabilista | Validar `CONTABILIDADE.md`: momento da fatura, natureza fiscal da caução, retenção na fonte, CAE | `ESTADO.md` §7 |
| Advogado | Minuta do contrato; pareceres da ronda 2 | `ESTADO.md` §7 |
| Certificado de assinatura «por confirmar» | Recusar logo, arriscando recusar assinaturas legítimas por falha de rede ao buscar o emissor, ou aceitar e marcar | `ESTADO.md` §7 |
| Garantia de execução da obra | O maior risco apontado nas quatro rondas; nada construído (escrow por fases, reputação, mediação, seguro) | `ESTADO.md` §7 |
| Bloqueio por nome (strikes) | Decidir se também por nome de empresa ou pessoa (risco de falsos positivos) | `ESTADO.md` §7 |
| «Anos de experiência» no relatório de propostas | Sem campo próprio em lugar nenhum (proposta nem perfil da empresa) — de onde vem o número? Novo campo na proposta? No perfil? Auto-declarado ou verificado? Até à decisão, a coluna mostra «Não disponível» em todas as propostas (desenho transparente, não erro) | Construído e aplicado 02/11/2026, `src/domain/relatorioCongelado.ts` |
| Auditorias de UX/UI | Explorar antes de pedir conta; prova social; fotografia real; escolha de perfil antes da conta; identidade do backoffice; automação da validação de documentos | `ESTADO.md` §7 |
| Registo da marca | Pesquisa INPI/EUIPO, adiada pelo promotor | `ESTADO.md` §7 |
| Página do Pro: adenda e diário | A página vende-os como do Pro, mas estão abertos a todas as empresas desde 25/10/2026. Fechá-los ao Pro, tirá-los da lista, ou escrevê-los como «também no gratuito»? | `DECISOES.md` 06/11/2026, «Subscrição: opção 3» |
| IBAN estrangeiro | Decidido: só português por agora. Ainda não há nenhum caso (promotor, 06/11/2026), mas pode vir a haver clientes com conta noutro país: quando aparecer o primeiro, aceitar IBAN SEPA do lado do cliente (o algarismo de controlo é o mesmo cálculo para todos os países) | idem |
| Jurista: elementos do contrato | Redação da cláusula 4-A; histórico que não se apaga e direito ao apagamento (RGPD); valor dos comprovativos como prova. Acrescentar ao documento de questões jurídicas (Claude Docs) | idem |
| Obra que ninguém declarou concluída | Os registos não se apagam. O limite máximo decide-se com o jurista | idem |
| Conta encerrada durante o período de conservação | Proposta: registos mantidos, acesso só às partes e à equipa. Validar com o jurista | idem |
| Jurista: conservação vs. prazo legal de 5 anos | Garantia de 2 anos + 24 meses = 4 anos, abaixo dos 5 do art. 1225.º CC citado no contrato. Conservar pelo prazo mais longo? Valor da prova junta por uma só parte; papel de «terceira isenta» | idem |
| Jurista: registo e relatório | Conservação e prazo; RGPD face a um registo que não se apaga; conteúdo a entregar; entrega gratuita | idem |
| Fachadas: ligar `/demo-areas` ao pedido | Decidido: próxima sessão (a da «Medição de zonas»), e o cliente também mede (decisão de 05/11/2026). Falta construir o botão do passo 2 | idem |
| Interior: plantas reais para ensaio | 3 ou 4 plantas com uma parede de medida conhecida, e uma casa medida à fita ou laser. Até lá, o interior não se anuncia aos clientes | promotor |
| Piloto | 5–10 pintores e 2–3 fornecedores de Viana do Castelo, só depois de tudo pronto, incluindo marketing | `ESTADO.md` §7 |

## 2b. Medição de fachadas por fotografia, em `/demo-areas` (reformulado 04/11/2026)

**Estado:** um ecrã, quatro passos — fotografia → referência medida (4 cantos + largura/altura, e
de preferência uma aresta vertical comprida) → desenhar zonas sobre a fachada endireitada e à escala
→ áreas por categoria e volume 3D montado com o que se mediu. Motor: homografia
(`src/domain/homografia.ts`), áreas em `src/domain/fachadaMedida.ts`, volume em
`src/app/demo-areas/modelo3d.ts`. Detalhe, números de precisão e o exemplo da fotografia real em
`docs/DECISOES.md`, 04/11/2026.

**Verificado:** fotografia real do promotor, porta 165 × 377 cm + uma aresta: fachada endireitada
com verticais a 0,07 m em 14,5 m; 18 zonas desenhadas em 1280 px e em 390 px, mesmo resultado
(133,18 m² a pintar no exemplo), desenho de volta sobre a fotografia original a bater com o prédio.

**Por fazer:**
- O promotor testar com outras fotografias (pedido dele) — e comparar com uma medição real à fita.
  *Desde 04/11/2026 a ferramenta tem medidas de controlo (passo 2) para isso.*
- Da avaliação do "Levantamento v7" (DECISOES 04/11/2026, noite), por fazer: guardar no aparelho;
  caixas das marquises sobre a fotografia; saliência tirada da fotografia; zona "não se pinta";
  várias fotografias da mesma fachada; ligar fachadas vizinhas pela esquina comum.
- Deteção automática de janelas: *no aparelho, primeira versão a 04/11/2026* (propõe, o avaliador
  confirma; DECISOES "Deteção das janelas no próprio aparelho"), revista por um cético e corrigida.
  Por fazer: os vidros de todas as marquises (hoje saem alguns) e as varandas. Com IA, por decidir
  (privacidade — a fotografia sairia do aparelho — e custo).
- Margem de erro da área («± X %»): *feita a 04/11/2026* nos passos 3 e 4 e no subtotal do prédio
  (DECISOES «Margem de erro da área»). Assenta num erro de toque de 1 px **ainda não medido em obra**.
- **Validar no terreno:** uma fachada medida pela fotografia e 3 ou 4 distâncias medidas a laser longe
  da referência. É isto que diz se o 1 px e a margem se aguentam (precisa do promotor).
- Propor sozinho as verticais e as duas horizontais: *feito a 05/11/2026* («Propor as arestas» no passo 3,
  no aparelho; o avaliador confirma; DECISOES «Propor as arestas»), revisto por duas rondas de céticos. Na
  fotografia real a margem do contorno desce de ± 5,1 % para ± 1,7 % (sem a vertical do passo 2, de
  ± 15,9 % para ± 1,6 %). `calibrar` passou a pesar as verticais pelo comprimento. Limites que ficam: a
  distorção de uma grande angular, um tubo de queda até ~0,35° numa empena com uma esquina escondida,
  ~0,9 s num telemóvel lento, e a margem continua sem ver erros sistemáticos (uma vertical do passo 2 fora
  da aresta). A validação a laser (acima) diz se o ganho se aguenta em obra.
- *Decidido pelo promotor a 05/11/2026:* também o cliente mede — e uma zona medida por ele fica com origem
  própria, **«medida pelo cliente»**, e com a margem de erro (± %), nunca «confirmada» (DECISOES 05/11/2026,
  «Passo 2 do pedido: a proposta B»).
- O (i) dentro dos rótulos dos formulários (`Field.tsx`) tem 16 px, abaixo dos 44 px da regra 17:
  um alvo maior tapava o campo. Dívida declarada.
- Ligar ao fluxo real: *feito a 06/11/2026, fases 1 e 2* (base, regras, ação; o botão do passo 2 grava, a quem pode editar, e a margem aparece no cartão, na barra e ao pintor — `DECISOES.md` 06/11/2026). A migração `20261106083508` já está aplicada (06/11/2026). Fica: ver uma gravação de ponta a ponta na base real com um utilizador `zz-test-*` (a linha «Gravado: …» a sair quando a zona muda por outro caminho só se vê aí: a página de ensaio não tem base).
- *Feito a 04/11/2026, à tarde:* acertar uma zona já desenhada (tocar nela e arrastar a aresta),
  desenhar em série, zonas triangulares, "Desfazer", e a leitura das alturas pela distância entre
  pisos (ver `docs/DECISOES.md`, "segundo teste do promotor").
- Varandas: desenha-se a frente e mede-se a profundidade (04/11/2026). **Falta o promotor decidir que
  faces de dentro se pintam** (tetos das varandas, guardas por dentro, paredes do recuo) — com a
  profundidade já se podem contar (decisão 8.2).
- *Decidido pelo promotor a 04/11/2026:* o R/C pinta-se por omissão (fecha a 8.3, que propunha o
  contrário) e as marquises têm parede — a frente pinta-se, os vidros descontam-se como vãos, e as
  paredes laterais acrescentam altura × saliência (medida à fita), mais o tecto da mais baixa e a
  cobertura da mais alta de cada coluna (largura × saliência). *Feito no mesmo dia.*
- Vidros nas paredes laterais das marquises: hoje um total em m² escrito à mão (não se veem de frente).
- A correção da perspetiva das marquises depende da câmara tirada da fotografia (`camaraDaHomografia`):
  numa fotografia tirada de frente não há correção (e o ecrã di-lo). Comparar com uma medição real.
- Decidir se `retificacao.ts` e `volumeAreas.ts` (sem ecrã desde 04/11/2026) se apagam.
- A linha "valor de `INCLINACAO_TIPICA_GRAUS_PROPOSTA`" da secção 2 deixou de travar o ecrã: era do
  motor de `retificarZona`, que já não está em uso.

### O passo 2 do pedido, «Medidas e fotografias» (05/11/2026)

**Feito:** a proposta B, «o prédio ao centro», escolhida pelo promotor, com as oito correções do juiz
(DECISOES 05/11/2026). O desenho com as zonas numeradas; o modo lista como base e as chamadas só em
contentores de 1040 px ou mais, com a regra das ligações numa função testada (`src/domain/chamadas.ts`); a
barra medido/estimado; a conta ao vivo no editor; o que falta, acionável; as fotografias pela zona. A
entrada da ferramenta de levantamento («Medir na fotografia», numa janela grande) aparece a quem pode editar o
pedido e grava a medição na zona (06/11/2026, ver abaixo).
Revisto por céticos (05–06/11/2026) e corrigido no mesmo commit: gaveta com um só modo de gravar e remover
com confirmação; título e frase do que falta coerentes nos casos-limite; ligações que não atravessam a zona
de outro número; palco cinzento a toda a largura; desenho tocável e «+ Fachada/Empena/Varandas» no prédio
vazio; fotografias só de leitura com legenda, estado e nota de cada uma.

**Por fazer:**
- *Feito a 06/11/2026:* **ligar a ferramenta ao pedido** — a medição volta para a zona escolhida (ou uma nova),
  «medida pelo cliente», com a margem (± %), nunca «confirmada»; e **o botão aberto a quem pode editar o pedido**
  (não ao avaliador, que mede no local). A migração `20261106083508` já está aplicada; falta uma
  gravação verificada na base real, de ponta a ponta.
- **Números de WhatsApp confirmados por mensagem (06/11/2026): migração `20261106201807_numeros_de_whatsapp_confirmados`
  por aplicar** (só com o OK do promotor). Sem ela, o ecrã novo não grava e o webhook não confirma; o código antigo
  continua a ler `telemovel_whatsapp`. Depois de aplicada: os 2 números de teste ficam sem número — associá-los de novo
  pelo cartão «Números em vigor» (perfil), a partir do telemóvel de cada um. Ver numa base real: o percurso completo
  (pedir código → mensagem → «Número associado» → cartão atualizado) e «PARAR», que só se vêem com o webhook ligado à
  Meta. Não visto: o painel «À espera da mensagem» (precisa da ação no servidor).
  **Ordem:** aplicar a migração mesmo antes de publicar o código — antes dela o cartão aparece vazio e o código não se
  pede; depois dela, o código antigo recusa gravar o formulário dos avaliadores a quem já tivesse número. Revisão
  independente (06/11/2026) corrigida: o «PARAR» e a confirmação repetem-se se a base falhar (500 à Meta), o «Aceito» e o
  reenvio só valem para um número ainda confirmado, o contrato e os avisos gerais vão a todos os números confirmados
  (os convites, ao mais recente), «Cancelar» apaga o código, e os códigos caducados limpam-se.
- **O desenho do prédio por alçados e a rodar — construído a 06/11/2026, por publicar** (`docs/DECISOES.md`, «O desenho do
  prédio é dos alçados, e roda»): laje até ao segundo alçado, planta ao segundo (a do cadastro ou a pergunta), cada alçado
  no seu lado da planta, números e cotas e chamadas por ângulo, e os botões e o arrasto para rodar. **Falta:**
  (1) **aplicar a migração `20261106201643_face_do_predio`** à base real (aditiva, testada em memória; até lá o lado
  de cada alçado não se guarda e o desenho atribui pelo nome e pela ordem — a página não rebenta), e depois regenerar
  `src/lib/database.types.ts`; (2) ver o desenho **no navegador com sessão e dados reais**, a escolher a planta
  (`guardarFormaDoPredio` grava no cadastro: só se viu a recusa sem sessão) e a escolher o lado de um alçado; (3) o
  promotor decidir se quer o «+ Empena» de volta no desenho do pedido vazio (saiu: a laje não tem parede lateral onde
  caiba); (4) a escolha da planta no ecrã do avaliador, que hoje só a vê (não gere o prédio).
  **Revisão independente de 06/11/2026 corrigida** (cotas fora do prédio, «de lado» ≠ «atrás», nesga livre do U, lado do
  editor, `addSurface` a avisar, foco e leitor de ecrã, sombra, lados por entregar, altura da página; ver o fim da entrada
  em `DECISOES.md`) — **por publicar**. Fica: o desenho passa ao modo lista a certos ângulos de um U a 1140 px (a página
  muda de altura aí), e a cota da frente omite-se a ~80° em L, U e T.
- Ver as chamadas em produção com prédios de outras formas (U, T): a função recusa o que não cumpre a
  regra e fica a lista; vistos na página de ensaio o prédio das maquetas, o L e um de 12 pisos.

## 3. Por construir (já decidido, ainda não feito)

- **Escadas das zonas comuns:** uma regra de medição própria (hoje ficam «Por medir» com medidas ou planta; escritas à mão, ficam como estimativa), decisão do promotor de 06/11/2026.

- **Poderes de quem assina (05/11/2026), o que fica da versão manual** (`DECISOES.md`, «Poderes de quem assina»):
  a leitura automática da certidão, só depois da autorização do IRN (secção 1); o **SCAP** (assinatura com o
  atributo profissional «gerente», que provaria a qualidade de quem assina e não só o nome); a **LTV** (carimbo
  temporal e revogação embebidos no PDF); procuradores (quem assina por procuração dá «não consta»); avisar a
  entidade antes de a certidão registada caducar (hoje vê-se no ecrã e na fila da equipa, sem aviso por email);
  o cofre de documentos do pintor (`/app/obras`, `src/domain/dossier.ts`) ainda não conta o código de acesso
  como certidão (a lista do que falta, na página da entidade, já conta).

- **Assinatura no telemóvel (05/11/2026):** confirmar o endereço da ferramenta web de assinatura com a Chave Móvel
  Digital (o ecrã liga ao guia oficial do gov.pt, que não deu para ler daqui) e **provar com um PDF real** que o
  ficheiro assinado nesse serviço passa na nossa verificação (o mesmo documento, só com a assinatura acrescentada).
  Junta-se ao ensaio de assinatura da secção 1. Até lá, o caminho do telemóvel está no ecrã sem ter sido ensaiado.
- **Rasto de avisos (05/11/2026), o que ficou para depois:** o contador do menu conta todos os passos do contrato
  (caução, confirmação, assinatura); se se quiser só a assinatura, é uma linha em `layout.tsx`. Os avisos do
  contrato por WhatsApp saem só na vez de assinar; os outros passos seguem pelo modelo genérico, quando existir.

- **Impermeabilização das coberturas de corpos salientes sem telha (promotor, 04/11/2026)** — sempre
  que haja corpos salientes sem telha (marquises, palas, varandas cobertas em laje), perguntar ao
  **cliente**, ao **avaliador** e ao **pintor** se se orçamenta a impermeabilização dessa parte e como:
  só pintura, membrana líquida, tela asfáltica (e que tipo), outra. Na ferramenta de medição (`/demo-areas`)
  a pergunta já aparece ao avaliador, no passo 4, quando há marquises. **Falta no produto:** o pedido do
  cliente (com palavras de quem não é técnico — o `RequestForm` evita de propósito perguntas técnicas,
  por isso aqui é "a cobertura deixa entrar água? quer que o pintor proponha impermeabilizar?"), o
  levantamento do avaliador e a proposta do pintor (linha própria, com o método). Precisa de decidir
  onde se guarda (superfície própria, ou uma pergunta da superfície `beirais_cobertura`) — migração.

- **Sexto estado do trabalho, «alternativa proposta»** — precisa de coluna e migração. `ESTADO.md` «Em aberto».
- **Perguntas geradas na reconciliação** ainda não se enviam num clique (falta ligar a `sendMessage`).
- **Versões da proposta** não aparecem no ecrã de comparação (já aparecem no relatório).
- **Aviso 2 h antes aos outros avaliadores** (alternativa ao bónus de adesão, não escolhida).

- **Rascunho do pedido (01/11/2026), por fazer:** resumo de três colunas (Trabalhos · Área · Execução) no fim do passo 2; validar datas contraditórias (execução a começar antes do fecho das propostas) no servidor, com aviso ao cliente; botão «Tratar das medidas por minha conta» no passo 2 quando há visita pedida.
- **Condóminos (01/11/2026), o que ficou para depois:** aviso por email aos condóminos quando as propostas abrem (hoje só veem ao entrar); exportar a contagem de votos no relatório para a assembleia (`dossier`); o condómino poder actualizar o próprio telemóvel/nome; limitar registos por código (hoje não há limite de frações por prédio).
- **Design v5 (01/11/2026), o que ficou para depois:** o fornecedor confirmar a venda de um produto a um pintor para uma obra (prometido em versão fraca no cartão 3 das «Três proteções»; construir agora que o workspace do fornecedor está publicado); medir toques e campos do orçamento guiado com e sem modelos, para substituir a estimativa 45/20/5 min por um número verificável. *Fechados:* a recomposição do ecrã «Hoje» do avaliador (feita na sessão do workspace, 01/11/2026); a ilustração do prédio mantém-se nas cores da ilustração, por decisão do promotor.

- **Revisão de desenho de ponta a ponta (01/11/2026, pedida pelo promotor):** site público a zero falhas no inspetor e no estilo aprovado (DECISOES.md). Nos espaços autenticados o varrimento ao código está feito (botões, maiúsculas, kickers, títulos, sombras); **falta a revisão com os olhos**, ecrã a ecrã e por perfil, que precisa de uma sessão iniciada em cada perfil (cliente, pintor, fornecedor/avaliador, condómino, backoffice) — o promotor entra no painel do browser ou cria contas `zz-test-*` e passa as credenciais. Até lá, `inspect.mjs --app` só corre sobre os ecrãs públicos.

- **Avaliador (02/11/2026):** a barreira na base (só reserva quem tem a autodeclaração) **está aplicada** desde 05/11/2026 (`20261105103114_reserva_so_para_avaliadores_inscritos`, decisão do promotor: aplicar sem inscrever ninguém automaticamente). Fica por decidir se a «experiência comprovada» passa a pedir documento; o simulador usa só a qualificação geral da pessoa (os outros três fatores são por obra).

- **Campanhas e marketing (02/11/2026):** o promotor confirmar as condições da campanha de lançamento antes de os flyers saírem (plano Pro sem custo e catálogo sem subscrição até 31/01/2027 são compromissos comerciais); passar os flyers de «rascunho» a «aprovado». **Futuro, por autorizar:** automatismos de campanha e um motor de divulgação e promoção com métricas (os QR já levam `?c=` por flyer; falta lê-lo na adesão e guardar a origem). O promotor pediu para ser lembrado de dar autorização para se pensar o plano em detalhe. **06/11/2026:** o promotor autorizou e pediu o CRM no workspace de developer; pesquisa e recomendação em `docs/CRM_PESQUISA.md`, âmbito, zona (Viana do Castelo), propor-e-aprovar e subdomínio aprovados; **fundação construída** (`docs/DECISOES.md`, 06/11/2026). migração **aplicada** e verificada (`20261106154252_crm_fundacao`); email a empresas **validado com o jurista** (declaração do promotor). **Por fazer:** domínio `mail.quempinta.pt` no Resend (prompt em `docs/PROMPT_RESEND_DNS.md`); sinal por clique com código e tarefa diária **construídos e aplicados** (`DECISOES.md`, 06/11/2026); aprovação de campanhas, envio, saída em um clique e dossier **construídos e aplicados**. **Por fazer, por esta ordem:** (1) o promotor indicar a fonte do dossier («founder-skill») e discutir `docs/CRM_ESTRATEGIA.md`; (2) domínio `mail.quempinta.pt` verificado + `CRM_REMETENTE` e `CRON_SECRET` na Vercel; (3) **Pro de lançamento a pintores: construído e aplicado** (`DECISOES.md`, 06/11/2026; falta vê-lo num navegador, com um QR real). **Catálogo de lançamento a fornecedores: construído e aplicado** (`DECISOES.md`, 06/11/2026). Administradoras: nada a conceder (o relatório já é gratuito). **As seis campanhas já podem ser lidas e aprovadas** no separador CRM, quando o domínio de envio estiver verificado; (4) IMPIC por navegador automático; (5) receção e classificação de respostas e os agentes; descoberta por OSM construída mas **nunca corrida com dados reais** (o Overpass não é alcançável do ambiente de desenvolvimento); falta IMPIC e nif.pt; envio com aprovação; receção e classificação de respostas; ler o `?c=` na adesão.

## 4. Dívida técnica

- Assinaturas (`src/lib/pades.ts`, `DECISOES.md` 05/11/2026): as entidades de **autenticação** do cartão também encadeiam nas âncoras, e um PDF assinado com a chave de autenticação passaria por assinatura de confiança (falta verificar o não-repúdio do signatário, com um certificado real para não recusar assinaturas legítimas); quem forja pode forçar «por confirmar» com um AIA que não responde, e o servidor segue os endereços AIA/OCSP que o certificado traz.

- `src/lib/database.types.ts` atrasado, com entradas escritas à mão; regenerar traz dezenas de erros de tipos.
- **Acontecimentos de assinatura inseridos à mão (achado a 05/11/2026):** a política `engagement_events_insert`
  deixa quem gere a entidade inserir `cliente_assinou`/`pintor_assinou` diretamente pela API, sem PDF, e com o
  `payload` que quiser — incluindo `cadeiaConfiavel: true` e um `poderes` «confere». A ação do servidor faz as
  verificações, a base não. Fechar com uma porta só de serviço (ou uma função que receba o PDF) para as
  assinaturas.
- Página da contratação (`src/app/app/contratacoes/[id]/page.tsx`): a secção «Trabalhos a mais» aparece duas
  vezes (uma antes do título, outra depois). Visto a 05/11/2026, não corrigido nesse commit.
- 31 botões e ligações com geometria feita à mão, fora do percurso do fornecedor (inventário congelado em `alvosDeToque.test.ts`; só pode descer).
- Avisos da base, a confirmar caso a caso: três tabelas com RLS ligado e sem políticas (`avisos_por_email`, `moloni_token`, `toques` — esperado se só o servidor lhes acede; confirmar `toques`); 43 funções que um utilizador autenticado pode executar (por desenho, cada uma verifica quem chama); 20 chaves estrangeiras sem índice; 46 índices por usar (base ainda quase vazia); 5 tabelas com políticas permissivas duplicadas (`DECISOES.md` «Notas técnicas em aberto»); `pg_net` no esquema público.

## 5. Linhas antigas que já não são verdade

- `ESTADO.md` §7, `PERMITIR_ACEITACAO_SIMPLES`: «ainda por confirmar». Resolvido a 27/10/2026 pela regra 16: `src/domain/aceitacaoSimples.ts` devolve sempre falso em produção, seja qual for a variável.
- `DECISOES.md`, tabela «Em aberto», «Nome e marca: "Paint it", provisório»: o nome passou a Quem Pinta.

## Como se verifica

1. `scripts/ponto-de-situacao.sh` — ramos com commits que a produção não tem, alterações locais por enviar, TODO no código.
2. Migrações: comparar as versões de `supabase/migrations/` com `supabase_migrations.schema_migrations`. Em 01/11/2026 as duas únicas diferenças (`20261027140000`, `20261027170000`) são as exceções documentadas, aplicadas na base com outra versão.
3. Avisos de segurança e de desempenho da Supabase (`get_advisors`).
4. Produção: última publicação da Vercel pronta, sem erros de execução.
5. `npm test`, `npm run typecheck`, `npm run lint`, `npm run build`, cada um pelo código de saída.
