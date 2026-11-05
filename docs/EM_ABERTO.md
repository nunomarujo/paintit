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
| Correr a limpeza dos resíduos de ensaio | `painel-limpeza-dos-ensaios.sql`, primeiro em ensaio (`a_serio := false`), depois a sério | antes de a Stripe passar a modo real |
| Apagar 2 fotografias SIMULACAO | conta `info@quempinta.pt`, pedido «SIMULACAO Pintura das fachadas e caixa de escadas» | apagar na aplicação |
| Ligar a proteção contra palavras-passe comprometidas | Supabase › Authentication › Passwords (aviso de segurança da Supabase) | ligar |
| Email próprio no Supabase (SMTP); confirmar Site URL e Redirect URLs | Supabase › Authentication | `DECISOES.md` «Passos pendentes do promotor» — não consta que tenha sido feito |
| Assinar um contrato de ensaio com um Cartão de Cidadão emitido desde 2024 e com a Chave Móvel Digital | um engagement `zz-test-*`, PDF assinado na Autenticação.gov | confirmar que as duas ficam «de confiança» (âncora 008, `DECISOES.md` 05/11/2026); só há testes com os certificados das entidades, não com um certificado real de signatário |

| Percurso real dos condóminos em produção | quempinta.pt, com um condomínio e um pedido publicado: criar o código do prédio, abrir `/predio/<código>` numa janela anónima, registar com um email seu, entrar pelo link, ver `/app/condominio` | dizer o que não funcionou |

## 1b. WhatsApp — passos do promotor (02/11/2026)

O código está feito; o canal abre quando isto estiver feito, pela ordem de `docs/WHATSAPP.md`: número
dedicado → conta Twilio → WhatsApp sender → verificação da empresa na Meta → modelo `aviso_quem_pinta`
aprovado → as quatro chaves na Vercel. Migração `20261102090000_avisos_por_whatsapp` aplicada a 02/11/2026.

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
- **Por decidir pelo promotor:** a ferramenta é só do avaliador, ou também uma estimativa feita pelo
  cliente? (pergunta do documento «Medir fachadas a partir de uma fotografia: o que existe»).
- O (i) dentro dos rótulos dos formulários (`Field.tsx`) tem 16 px, abaixo dos 44 px da regra 17:
  um alvo maior tapava o campo. Dívida declarada.
- Ligar ao fluxo real (hoje não grava nada: tudo em estado local do browser).
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

## 3. Por construir (já decidido, ainda não feito)

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

- **Avaliador (02/11/2026):** a migração que fecha a reserva na base a quem não tem a autodeclaração está escrita e testada (`20261102120000_reserva_so_para_avaliadores_inscritos.sql`) e **por aplicar** — handoff em `docs/HANDOFF_MIGRACOES.md`; decidir se a «experiência comprovada» passa a pedir documento; o simulador usa só a qualificação geral da pessoa (os outros três fatores são por obra).

- **Campanhas e marketing (02/11/2026):** o promotor confirmar as condições da campanha de lançamento antes de os flyers saírem (plano Pro sem custo e catálogo sem subscrição até 31/01/2027 são compromissos comerciais); passar os flyers de «rascunho» a «aprovado». **Futuro, por autorizar:** automatismos de campanha e um motor de divulgação e promoção com métricas (os QR já levam `?c=` por flyer; falta lê-lo na adesão e guardar a origem). O promotor pediu para ser lembrado de dar autorização para se pensar o plano em detalhe.

## 4. Dívida técnica

- Assinaturas (`src/lib/pades.ts`, `DECISOES.md` 05/11/2026): as entidades de **autenticação** do cartão também encadeiam nas âncoras, e um PDF assinado com a chave de autenticação passaria por assinatura de confiança (falta verificar o não-repúdio do signatário, com um certificado real para não recusar assinaturas legítimas); quem forja pode forçar «por confirmar» com um AIA que não responde, e o servidor segue os endereços AIA/OCSP que o certificado traz.

- `src/lib/database.types.ts` atrasado, com entradas escritas à mão; regenerar traz dezenas de erros de tipos.
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
