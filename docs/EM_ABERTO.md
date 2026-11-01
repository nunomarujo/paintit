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
| **Aplicar a migração `20261101090000_condominos_do_predio.sql` na base real** (a sessão de 01/11/2026 não tinha permissão para alterações em produção; o código que depende dela já está publicado — os ecrãs de condóminos dão erro até ela correr) | Supabase › SQL, ou MCP `apply_migration` com o conteúdo do ficheiro | correr; depois avisos de segurança/desempenho a zero |
| Rever em produção os ecrãs novos do workspace (Hoje, Levantamentos, Produtos e preços, Regras comerciais, Empresa) | quempinta.pt | dizer o que não está como se queria |
| Correr a limpeza dos resíduos de ensaio | `painel-limpeza-dos-ensaios.sql`, primeiro em ensaio (`a_serio := false`), depois a sério | antes de a Stripe passar a modo real |
| Apagar 2 fotografias SIMULACAO | conta `info@quempinta.pt`, pedido «SIMULACAO Pintura das fachadas e caixa de escadas» | apagar na aplicação |
| Ligar a proteção contra palavras-passe comprometidas | Supabase › Authentication › Passwords (aviso de segurança da Supabase) | ligar |
| Email próprio no Supabase (SMTP); confirmar Site URL e Redirect URLs | Supabase › Authentication | `DECISOES.md` «Passos pendentes do promotor» — não consta que tenha sido feito |

## 2. Decisões do promotor que travam construção ou dinheiro

| Tema | Pergunta | Origem |
|---|---|---|
| Stripe em modo real | Só depois da limpeza e de testar a conta de faturação | `PAGAMENTOS_E_ASSINATURA.md` |
| Percentagem do levantamento por avaliador | Validar pesos e banda (1%–2,7%) num caso real antes de ligar a dinheiro verdadeiro | `ESTADO.md` §7 |
| Fee dinâmico (18–23%) | Pesos finais, ecrãs, indicador S, composição com os códigos de adesão. O motor está pronto e não ligado | `ESTADO.md` §7 |
| Contabilista | Validar `CONTABILIDADE.md`: momento da fatura, natureza fiscal da caução, retenção na fonte, CAE | `ESTADO.md` §7 |
| Advogado | Minuta do contrato; pareceres da ronda 2 | `ESTADO.md` §7 |
| Certificado de assinatura «por confirmar» | Recusar logo, arriscando recusar assinaturas legítimas por falha de rede ao buscar o emissor, ou aceitar e marcar | `ESTADO.md` §7 |
| Garantia de execução da obra | O maior risco apontado nas quatro rondas; nada construído (escrow por fases, reputação, mediação, seguro) | `ESTADO.md` §7 |
| Relatório de propostas | Gerado ao fechar a janela, com QR para verificação; nada construído | `ESTADO.md` §7 |
| Bloqueio por nome (strikes) | Decidir se também por nome de empresa ou pessoa (risco de falsos positivos) | `ESTADO.md` §7 |
| Auditorias de UX/UI | Explorar antes de pedir conta; prova social; fotografia real; escolha de perfil antes da conta; identidade do backoffice; automação da validação de documentos | `ESTADO.md` §7 |
| Registo da marca | Pesquisa INPI/EUIPO, adiada pelo promotor | `ESTADO.md` §7 |
| Piloto | 5–10 pintores e 2–3 fornecedores de Viana do Castelo, só depois de tudo pronto, incluindo marketing | `ESTADO.md` §7 |

## 3. Por construir (já decidido, ainda não feito)

- **Sexto estado do trabalho, «alternativa proposta»** — precisa de coluna e migração. `ESTADO.md` «Em aberto».
- **Perguntas geradas na reconciliação** ainda não se enviam num clique (falta ligar a `sendMessage`).
- **Versões da proposta** não aparecem no ecrã de comparação (já aparecem no relatório).
- **Aviso 2 h antes aos outros avaliadores** (alternativa ao bónus de adesão, não escolhida).

- **Rascunho do pedido (01/11/2026), por fazer:** resumo de três colunas (Trabalhos · Área · Execução) no fim do passo 2; validar datas contraditórias (execução a começar antes do fecho das propostas) no servidor, com aviso ao cliente; botão «Tratar das medidas por minha conta» no passo 2 quando há visita pedida.
- **Condóminos (01/11/2026), o que ficou para depois:** aviso por email aos condóminos quando as propostas abrem (hoje só veem ao entrar); exportar a contagem de votos no relatório para a assembleia (`dossier`); o condómino poder actualizar o próprio telemóvel/nome; limitar registos por código (hoje não há limite de frações por prédio).
- **Design v5 (01/11/2026), o que ficou para depois:** o fornecedor confirmar a venda de um produto a um pintor para uma obra (prometido em versão fraca no cartão 3 das «Três proteções»; construir agora que o workspace do fornecedor está publicado); medir toques e campos do orçamento guiado com e sem modelos, para substituir a estimativa 45/20/5 min por um número verificável. *Fechados:* a recomposição do ecrã «Hoje» do avaliador (feita na sessão do workspace, 01/11/2026); a ilustração do prédio mantém-se nas cores da ilustração, por decisão do promotor.

- **Revisão de desenho de ponta a ponta (01/11/2026, pedida pelo promotor):** página inicial, `/empresas` e `/fornecedores` já a zero falhas no inspetor (`scripts/inspecionar-desenho.sh`). Faltam os espaços autenticados, por esta ordem: cliente, pintor, fornecedor/avaliador, backoffice — varrimento pelas regras de `docs/design/taste-skill/app-screens.md` (eyebrows, numeração, ícones tintados, sombras, botões à mão, números não tabulares, títulos acima de 26px, estados vazios) e `inspect.mjs --app` sobre ecrãs reais.

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
