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
| Medição de zonas: zona comercial do rés-do-chão | Proposta: fica fora por defeito | Handoff 03/11/2026, secção 8.3 |
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

## 2b. Medição de zonas: declarativo (volume) + por fotografia (retificarZona), os dois juntos em `/demo-areas` (03/11/2026)

**Estado, no fim do dia:** duas vias, complementares, não uma a substituir a outra.

1. **Modelo 3D declarativo**, sobre `src/domain/volume.ts` (já existia, de 30/10-01/11/2026):
   `src/domain/volumeAreas.ts` calcula área real por categoria (fachadas líquidas de vãos > 1 m²,
   empenas, varandas, marquises — marquises fora do total pintável); `marquise` é `FaceKind` novo.
2. **Medição por fotografia**, sobre `retificarZona` (`src/domain/retificacao.ts`, feito e testado
   de manhã — passo 1 da ordem do handoff original): `src/app/demo-areas/MedirZona.tsx` deixa
   importar uma ou mais fotografias da mesma fachada, marcar nelas um ou mais segmentos medidos com
   fita métrica (com lupa de precisão) e, opcionalmente, os quatro cantos de uma zona, para calcular
   área — o resultado pode aplicar-se aos campos do modelo declarativo.

**O que ficou decidido pelo caminho:** o promotor pediu, a meio do dia, para abandonar uma primeira
ideia — usar UMA fotografia do prédio inteiro para derivar sozinha todas as dimensões — depois de a
testar contra uma entrada real (1,65 m × 3,77 m) e ver erros de -1,9% a +20,5% consoante os cantos
(um vão recuado não é uma fachada plana — detalhe: `docs/DECISOES.md`). Isso levou primeiro a um
ecrã só declarativo; mas ainda no mesmo dia, o promotor pediu de volta a via da fotografia, só que
**por zona/segmento, não pelo prédio inteiro** — o que é exactamente o que `retificarZona` já fazia
bem (erro <0,5% nos testes sintéticos). As duas vias ficaram, cada uma a fazer o que lhe compete.

**Por fazer:** ligar `/demo-areas` ao fluxo real (hoje não grava nada, tudo em estado local do
browser); confirmação cruzada entre segmentos medidos na mesma fotografia (secção 3.2 do handoff
original — hoje só o primeiro segmento entra no cálculo, os outros ficam registados); cores por zona
escolhidas pelo cliente (secção 3.5, ainda não construída).

## 3. Por construir (já decidido, ainda não feito)

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
