# Ponto de situação — ler primeiro numa sessão nova

Atualizado a 22/10/2026 (fim do dia). Este ficheiro substitui o historial da conversa em que o projeto começou: uma sessão nova
deve lê-lo, junto com `CLAUDE.md`, antes de qualquer trabalho. Atualizar no fim de cada sessão.

## O projeto

Paint it (nome provisório): marketplace de orçamentação e contratação de empreitadas de pintura em Portugal.
Condomínios (muitas vezes geridos por uma administradora com vários prédios) e particulares descrevem a obra;
pintores verificados orçamentam sem saber quem é o cliente nem a morada; o cliente escolhe; as duas partes
assinam o contrato na plataforma. A plataforma ganha 3% e retira-se depois da assinatura.

Fontes:

- Requisitos: `docs/requisitos/Documento_Mestre_de_Requisitos_v0.3.docx` (e `.txt` para pesquisa). É a base, mas
  as decisões posteriores do promotor prevalecem (ver `docs/DECISOES.md`), em especial o modelo de dinheiro.
- Modelo de contratação e dinheiro: `docs/MODELO.md`, implementado e testado em `src/domain/engagement.ts`.
- Questões jurídicas com propostas de resposta (para o advogado):
  [Paint it — Questões jurídicas para validação](https://claude.ai/code/artifact/6ac31246-9446-4e07-a622-2022b58cdcb3).
- Protótipo antigo (referência funcional, não reutilizado): `docs/referencia/prototipo_v05.zip`.

## Decisões do promotor que mais pesam

- Garantia de 3% do cliente e fee de 3% (+ IVA) do pintor; só a parte culpada perde a sua; a plataforma recebe
  3% uma única vez e nunca as duas garantias.
- O cliente assina a minuta primeiro; o pintor tem 8 dias corridos para pagar o fee e só então assina.
- O adiantamento de adjudicação é guardado até à assinatura e depois libertado; o resto da obra é entre as partes.
- A plataforma não deve guardar dinheiro ela própria: parceiro de pagamentos autorizado (por escolher).
- Fotografias só para gerar um volume 3D não reconhecível; pormenores só se não identificarem o prédio.
- Chave Móvel Digital chega para assinar.
- Isolamento total de outros projetos do promotor (ver `CLAUDE.md`).

## O que está feito

| Fase | Estado |
| --- | --- |
| 0. Fundações: domínio do dinheiro testado, site público com simulador | Feito |
| 1. Contas, entidades, prédios, equipa e convites, documentos, validação | Feito |
| 2. Pedidos: superfícies e áreas, pré-visualização, publicação anónima, volume 3D, fotografias | Feito |
| 3. Marketplace: oportunidades, propostas com linhas, comparador anónimo, mensagens, escolha | Feito |
| 4. Contratação: acontecimentos, minuta, assinaturas, prazos, desvios, apresentação | Feito (falta ligar parceiro de pagamentos e CMD) |
| 5. Backoffice: filas, denúncias, litígios, conciliação, auditoria | Feito |
| 6. Fornecedores: catálogo, fichas técnicas, estimativa de consumo | Feito |

Base de dados: projeto Supabase "Paint it" (`phkfrabrjqbpnmocrrvj`), 19 migrações aplicadas, avisos de segurança a
zero, com duas exceções explicadas: a proteção de palavras-passe divulgadas (não se aplica: a entrada é por link)
e `resolve_listing_report` e `painter_rating`, que correm com direitos de dono por desenho (ver `DECISOES.md`). Primeira
conta: nunomarujo@gmail.com (promotor), na equipa da plataforma (`platform_admins`) desde 18/10/2026; já criou um
condomínio. A app corre localmente (`npm run dev`); ainda não está alojada.

- Catálogo de referência (`/app/catalogo`, `/app/catalogo/referencia/[id]`), produtos preferidos no pedido e
  linha de aderência no comparador. Migração `20261020060000_catalogo_referencia.sql` por aplicar no Supabase.

- Avisos por email (`src/lib/notify.ts`): falta `RESEND_API_KEY` na Vercel (chave de envio, a colar pelo promotor).

## Próximo passo

Feito até 19/10/2026 (além das seis fases): materiais certificados, descontos e entregas dos fornecedores,
encomendas certificadas, avaliações de fornecedores, ferramentas de obra, contrato em linguagem simples, design
do protótipo v05, assinatura com PDF da Autenticação.gov (com cadeia de confiança nas entidades "Cartão de
Cidadão" do Estado), manutenção diária com pg_cron (documentos expirados, fecho de anúncios fora de prazo, avisos
de nova versão do pedido), dossiê do pedido para imprimir.

20/10/2026: percurso v2 afinado (caução sem prazo nem mínimo, adiantamento fora da plataforma, habilitação e
certificados assinalados a vermelho sem bloquear), códigos promocionais dos fornecedores no backoffice, Stripe
Connect escolhido (ver `docs/DECISOES.md`).

**Nota:** `supabase/migrations/20261020030000_um_perfil_por_conta.sql` foi aplicada à mão no SQL Editor
(20/10/2026), por isso não aparece em `list_migrations`. Quando o acesso do Claude ao Supabase voltar, registar a
versão (ou deixar como está e não a voltar a aplicar).

A seguir, sem depender do promotor:

1. Teste completo no browser pela sessão de teste (com `PERMITIR_ACEITACAO_SIMPLES=1`).
2. ~~Consulta de revogação (OCSP) dos certificados das assinaturas~~ — feito em 22/10/2026 (ver abaixo).

### Decisões e questões para o promotor

0. **Parecer jurídico de 19/10/2026:** ver `docs/advogado/Parecer_2026-10-19.md`, secção "Depende de decisão do
   promotor" (nova ordem da apresentação, mínimo da caução, contrato cliente–plataforma, conservação,
   não evasão, transparência).

1. ~~Parceiro de pagamentos~~: Stripe Connect (20/10/2026). Falta: preço da subscrição dos fornecedores; domínio e email.
2. **Email transacional e domínio:** escolher o serviço (ex.: Resend, Postmark, Amazon SES na UE) para os avisos
   também seguirem por email.
3. **Certificado por confirmar:** hoje uma assinatura válida cujo certificado não encadeia nas entidades
   "Cartão de Cidadão" é aceite e marcada para a equipa confirmar. Prefere recusá-la logo?
4. **Pintores sem documentos aprovados:** hoje podem fazer propostas, com "documentos ainda por verificar" no
   comparador. Prefere só deixar propor pintores verificados?
5. **Percentagem dos 57%:** não foi usada na app por falta de fonte; se tiver o estudo, pode entrar no texto.
6. **Identidades no PDF assinado** (pergunta E4 ao advogado): o PDF não tem nomes, por causa do anonimato.
7. **Advogado:** enviar `docs/advogado/Pedido_minuta_contrato.docx` com o seu contacto preenchido.
8. ~~Litígio com repartição (DIS-07)~~: resolvido com julgamento próprio a 23/10/2026 — outcome `repartido` +
   percentagem de culpa do cliente (1-99), ver `docs/DECISOES.md`.
9. ~~Avaliação de uma obra cancelada (AVA-01)~~: resolvido com julgamento próprio a 23/10/2026 —
   `reviewCategory` em `contracting.ts`, coluna `obra_concluida`, excluída da média pública. Ver
   `docs/DECISOES.md`. **Falta aplicar a migração `20261023010000_avaliacao_cancelamento.sql` ao Supabase real**
   (ligação MCP sem permissão nesta sessão — ver secção "Pendente do promotor").
10. ~~Responder a uma avaliação de fornecedor~~: resolvido a 23/10/2026 — `supplier_reviews.resposta`,
    mesmo mecanismo de guarda que `reviews`. Ver `docs/DECISOES.md`. **Falta aplicar a migração
    `20261023020000_resposta_avaliacao_fornecedor.sql` ao Supabase real** (mesmo travão do item 9, acima).

## Como funciona a contratação

A base de dados guarda só acontecimentos (`engagement_events`), cada tipo registável só por quem o pode fazer; o
estado é reconstruído em `src/domain/contracting.ts` a partir de `engagement.ts`, aplicando os prazos até agora.
A apresentação acontece quando a comissão entra dentro do prazo: a partir daí as partes veem-se (nome, NIF,
contactos, morada da obra e fotografias), só para essa obra.


- Parecer jurídico sobre «ou equivalente» (cláusula 2-B e aviso na proposta); depois definir `NEXT_PUBLIC_EQUIVALENTE=1` na Vercel.

- Migrações aplicadas e confirmadas na base real (21/10/2026): `...030000_infracoes_contacto`, `...040000_revisao_avisos` e `...060000_metodos_de_trabalho` (4 políticas RLS; avisos novos: nenhum, só 2 "unused index" informativos).

- Migração `20261021070000_codigos_de_adesao.sql` aplicada e confirmada na base real (21/10/2026): 5 funções, bucket `faturas-adesao`, 7 políticas. Avisos novos esperados: 5 "SECURITY DEFINER executável por autenticados" (cada função verifica quem chama) e 7 "índice não usado" (tabelas vazias).

- Contabilidade: desenho em `docs/CONTABILIDADE.md` (decisões de 21/10/2026 e plano de contas proposto). Falta: NIF da empresa, escolha do software de faturação, validação pelo contabilista Nuno Branco. Próximo: fase 1 (livro de movimentos) e o saldo/resgate das comissões dos fornecedores.

- Páginas legais provisórias publicadas (termos, privacidade e cookies, aviso legal com IA e RSD, Livro de Reclamações): a rever por advogado. Falta registar a empresa no Livro de Reclamações Eletrónico (livroreclamacoes.pt), indicar a entidade de resolução alternativa de litígios e completar registo comercial e capital social no aviso legal.
- Perguntas para o contabilista: `docs/contabilista/Perguntas_2026-10-21.md`.

- Migrações `...080000_saldo_e_resgate` e `...090000_livro_de_movimentos` aplicadas e confirmadas na base real (21/10/2026): 16 contas, 6 funções públicas, 3 auxiliares, 2 vistas; avisos novos esperados (7 "SECURITY DEFINER executável por autenticados" e 9 "índice não usado").
- Migração `...100000_reconciliacao_stripe` aplicada e confirmada na base real (21/10/2026): 3 tabelas vazias; avisos novos: só 2 "índice não usado".
- Evento `invoice.paid` acrescentado ao webhook da Stripe (21/10/2026).
- **Falta:** correr a primeira reconciliação com a conta de administrador (Contabilidade > Reconciliação) e migrações `...110000_extrato_bancario` e `...120000_revisao_movimentos_stripe` aplicadas e confirmadas na base real (22/10/2026; 8 políticas; avisos novos: só "índice não usado"). Primeira reconciliação feita a 22/10/2026 (ver `docs/CONTABILIDADE.md` §14).
- **Obter um extrato real do banco** (a conta passou de EuroBic para Abanca) para afinar o leitor; rever o acesso ao Web Banking.
- **Antes de passar a Stripe a modo real:** limpar os dados de teste do livro e da reconciliação (SQL à mão; ver `docs/CONTABILIDADE.md` §14).

- Faturação certificada: Moloni escolhida (22/10/2026, preço, fase inicial). Migrações de `fiscal_documents` e `moloni_token` aplicadas e confirmadas na base real.
  Conta Moloni já criada; investigação na conta real confirmou: autenticação por OAuth com login no browser (não password), série única "M" (id 974940),
  IVA Normal 23% (id 3934440), cliente "Consumidor Final" (id 162460860), company_id 517588676. Código ajustado a estes factos
  (`/api/moloni/connect` e `/api/moloni/callback`, ver `docs/FATURACAO.md`). **Pedido o ambiente de demonstração ao apoio@moloni.pt (22/10/2026), a aguardar resposta — não emitir nenhum documento antes disso, a conta não tem sandbox e um documento criado é real e não se apaga.**
  Subutilizador do Portal das Finanças criado (517588676/1, perfil WFA — webservice de comunicação de faturas) e ligado na Moloni (Configuração AT da empresa: documentos de faturação ativos, diferimento 0 dias; a série "M" já estava registada na AT). Dados da empresa completados na Moloni (morada, código postal, localidade, tipo de negócio "Prestadores de Serviços").
  Falta: ativar a API na Moloni (Configurações > Developers > Configuração da API e Plugins) com o callback `https://quempinta.pt/api/moloni/callback`, colar `MOLONI_CLIENT_ID`/`MOLONI_CLIENT_SECRET`/as restantes `MOLONI_*` na Vercel (valores em `.env.example`) e fazer deploy; depois, com a conta de administrador, `/api/moloni/connect` para ligar o token. A comunicação à AT só se confirma mesmo com a primeira fatura emitida — e essa só deve acontecer depois de a Moloni confirmar o ambiente de demonstração (pedido a 22/10/2026, ainda sem resposta).

## Algoritmo de fee: ponto 2 (referências) trabalhado; ponto 1 (fee 18-23%) com motor puro construído, não ligado

Documento "Algoritmo de determinação de fee QuemPinta v1" (22/10/2026): substitui a faixa fixa de 3% por uma
faixa dinâmica 18-23% com nove fatores (B/C/E/F/M/J/R/L/Q). Decisão do promotor: trabalhar primeiro o ponto 2
(descontos por referência), com rigor — feito (ver abaixo). **O ponto 1 (a faixa dinâmica em si) tem agora o
motor de cálculo construído e testado (`src/domain/fee.ts`), mas continua por ligar a qualquer fluxo real** —
ver "Ponto 1" mais abaixo nesta secção para o que falta antes de poder substituir os 3% em produção.

O que saiu disto, nesta sessão, foi maior do que o documento previa: há **dois programas simétricos**, não um
— o documento só descrevia o segundo:

- **Códigos de adesão** (já existia, fornecedor → pintor): evoluiu de "um código, uma obra" (0,25% fixo dos dois
  lados) para uma relação permanente. O desconto do pintor soma 0,25 p.p. por fornecedor com código ligado e
  ativo, em todas as obras futuras, não só na que aplicou o código; a comissão do fornecedor passou a 1%, com
  2% ao alcançar a 3.ª obra (de qualquer pintor que referenciou) nos 2 meses anteriores, nunca retroativo.
- **Referências de fornecedores** (novo, pintor → fornecedor, o do documento): o pintor cria um código, o
  fornecedor aplica-o no registo; conta como referência elegível durante 12 meses a partir da 1.ª subscrição
  (não do registo), com desconto Q(n) ao pintor (até 4 p.p.) pelo número de referências elegíveis em simultâneo.
- Os dois descontos do pintor somam-se com um teto conjunto de 8 p.p. (`combinedPainterDiscountBp`).
- Buraco encontrado e corrigido: nada impedia a mesma empresa registar-se duas vezes como fornecedor com mails
  diferentes — agora há um índice único em `organizations.nif`, só para fornecedores.
- Feito: domínio puro e testado (`src/domain/referral.ts`, `src/domain/referralEligibility.ts`); três migrações
  (schema + `proposal_selected()` + a tabela de convites); `database.types.ts` atualizado à mão (confirmar com
  `generate_typescript_types` depois de aplicar); `contracting.ts`/`lib/engagements.ts` já aplicam o desconto à
  comissão; páginas novas `/app/organizacoes/[id]/referencias` (pintor) e campo no registo de um fornecedor
  (`/app/organizacoes/nova`); `ReferralField.tsx` redesenhado (escolhe qual fornecedor fica associado a cada
  obra, separado de ligar um código novo). Tudo em `supabase/tests/rls.test.ts` e testes de domínio — tsc, lint,
  357 testes, build, zero. Detalhe de cada decisão em `docs/DECISOES.md` (entradas de 22/10/2026).

**Falta aplicar à base real, nesta ordem** (esta sessão não tem permissão de escrita no Supabase — pedir ao
Claude do navegador):
1. Confirmar sem NIFs duplicados: `select nif, count(*) from organizations where kind='fornecedor' and nif is not null group by nif having count(*)>1;`
2. `supabase/migrations/20261022030000_nif_unico_fornecedores.sql`
3. `supabase/migrations/20261022040000_codigos_de_adesao_cumulativos.sql`
4. `supabase/migrations/20261022050000_referencias_de_fornecedores.sql`
5. `supabase/migrations/20261022060000_termos_de_aceitacao_pintor.sql` (termos de aceitação antes da ficha
   completa de uma obra, incluindo não revelar a comissão ao cliente — ver `docs/DECISOES.md`, 22/10/2026;
   texto em `src/app/app/oportunidades/[id]/AcceptTerms.tsx`, por rever pelo promotor e pelo advogado).
6. `supabase/migrations/20261022070000_convite_direto_do_cliente.sql` ("traga o seu pintor": o cliente convida
   diretamente a sua entidade de confiança para uma obra sua, por código ou QR, com comissão de 9% — o piso do
   algoritmo de fee, não os 3% normais — ver `docs/DECISOES.md`, 22/10/2026).
7. Confirmar avisos de segurança/desempenho a zero (ou explicados) e correr `generate_typescript_types`, para
   confirmar o `database.types.ts` escrito à mão.
8. **Falta ver a correr num browser com dados reais** — esta sessão não tinha credenciais do Supabase no
   `npm run dev` (confirmado com a página `adesoes`, já existente, a falhar da mesma forma antes de qualquer
   mudança desta sessão), por isso as páginas novas, o `ReferralField` e o convite direto só foram verificados
   por tsc/lint/testes/build.

**Resolvido parcialmente (22/10/2026, sessão autónoma):** a página `/referencias` do pintor já mostra, por nome,
os fornecedores cujo código de adesão tem ligado (antes só aparecia o número e os pontos-base, não a lista) —
`linkedSupplierCodes` já existia em `queries.ts`, só faltava usá-la aqui. **Continua por decidir:** ligar-se a um
fornecedor (aplicar o código por primeira vez) continua só possível dentro de uma proposta (`ReferralField`); se
deve haver também uma forma de o fazer fora desse fluxo é que fica por decidir — hoje não é uma limitação real,
porque basta abrir qualquer rascunho de proposta para o fazer. Também por decidir: se a "nota" dos códigos deve aparecer
em mais sítios.

### Ponto 1 — motor da faixa dinâmica (22/10/2026, sessão autónoma)

`src/domain/fee.ts` + `fee.test.ts`: as nove peças da secção 3-8 do documento, puras e testadas contra os seus
próprios cenários da secção 9 (todos os valores em euros e percentagens do documento batem certo, incluindo o
piso de 9% e o exemplo do mínimo monetário). `baseFactors`/`obraBaseBp` (B, blocos C/E/F/M), `adequacaoIndividualBp`
(A, bloco J), `respostaInicialBp` (R), `fidelizacaoBp` (L), `taxaFinal`/`calcularFee` (T e a comissão em euros,
reaproveitando `percentOf` de `money.ts` — não um cálculo paralelo), `valorParaLiquido` (fórmula inversa da
secção 8). Q não se reimplementou: usa `referralDiscountFor` de `referralEligibility.ts`, já construído em
22/10/2026 e idêntico à fórmula da secção 7.

**Decidido não fazer nesta sessão, de propósito:** ligar isto a qualquer fluxo real (schema, `proposal_selected()`,
`CURRENT_RULES`). Não é falta de tempo — é que falta o que o próprio documento ainda não tem:
- Os campos de cada fator (C1-C3, E1-E4, F1-F3, M1, J1-J3) não existem em `work_requests`/`proposals`: não há onde
  o cliente ou o pintor os declarar. Isto é trabalho de ecrã novo, não só de esquema.
- R (propostas elegíveis anteriores desta oportunidade) e L (janela de 180 dias) precisam de uma consulta própria
  sobre o histórico — hoje não há nada a contá-los.
- A parcela de qualidade competitiva de L depende do indicador S, que o próprio documento diz ser "um módulo
  separado ainda a fechar" (um ranking técnico e comercial que também não existe). `fidelizacaoBp` recebe S já
  calculado, de propósito — nunca o calcula, para não inventar um ranking que não foi pedido.
- O documento marca os seus próprios pesos e limites (referência de 21%, os valores de cada fator, os escalões
  de R e L) como "propostas para teste", não decisões fechadas — mudar a comissão de produção com base neles sem
  o promotor ver e confirmar primeiro seria exatamente o tipo de decisão de negócio que não é minha para tomar.
- Falta decidir como isto compõe com os códigos de adesão (não existem no documento do algoritmo — são um
  mecanismo à parte que o promotor manteve e fez evoluir nesta sessão). Hoje T = A−R−L−Q; códigos de adesão
  somam-se por cima na versão em produção. Juntar os dois sem decidir a ordem/teto certo é mudar economia real.

Quando o promotor quiser avançar com isto a sério, o motor já está pronto e validado — falta decidir o que
acima e desenhar os ecrãs que alimentam cada fator.

**22/10/2026 — convite direto do cliente ("traga o seu pintor"):** pedido novo, fora dos dois programas de
referência acima — o cliente convida diretamente o seu próprio pintor para uma obra sua (código ou QR,
`request_invites`), com comissão de **9%** (`RULES_2026_10_20_CONVITE`) em vez dos 3% normais de hoje, para não
lhe parecer que insistir na plataforma lhe sobe o preço. Feito: esquema e RPCs, página do cliente
(`/app/pedidos/[id]`, criar/desativar código) e página do pintor (`/convite/[código]`, escolher entidade e
confirmar). **Correção feita ainda nesta sessão:** a primeira versão usava 1%, um número reaproveitado de outro
sítio do sistema sem o confrontar com o documento `Algoritmo_determinacao_fee_QuemPinta_v1.docx` — esse
documento já fixa 9% como o piso absoluto do próprio algoritmo dinâmico (18% − 3 − 2 − 4 p.p., todos os
descontos ao mesmo tempo); o promotor corrigiu antes de qualquer migração chegar à base real. **Confirmado
também:** o desconto aplica-se sem limite de usos nem de validade por convite (ver `docs/DECISOES.md`). Imagem
do QR code feita (`src/lib/qrcode.ts`, gerada a cada pedido da página, nunca guardada) — a funcionalidade fica
completa, falta só aplicar a migração à base real.

**22/10/2026, sessão autónoma — resto da fase 4 de `docs/PROPOSTA.md` e uma passagem de `/code-review`:** o
comparador do cliente passou a mostrar, trabalho a trabalho, se cada proposta cobre o que foi pedido
(`requestedCoverage` em `works.ts`, do mesmo jeito que já existia por produto); e "duplicar esta solução para
outra fachada" no orçamento guiado, para não reescrever os mesmos campos em cada fachada. Uma passagem de
`/code-review` sobre todos os commits da sessão encontrou e corrigiu 6 problemas reais (nenhum de negócio): o
OCSP falhava sempre em silêncio quando o responder não embute o seu próprio certificado (comum e permitido pela
RFC); a cobertura de trabalhos só olhava à primeira linha, não à melhor entre várias zonas; o convite direto não
verificava se a obra ainda estava publicada antes de resgatar; a lista de fornecedores ligados em `/referencias`
podia duplicar o mesmo fornecedor; e uma pequena ineficiência no comparador. Detalhe de cada um em
`docs/DECISOES.md` (entrada "correções encontradas por uma passagem de `/code-review`"). Tudo com tsc, lint, 395
testes, build — zero.

## Pendente do promotor

Tarefas que só o promotor pode fazer (nem o Claude do código nem o do navegador):
- Ver em `/app/backoffice` (conta `nm@quempinta.pt`) a caixa "Estado do servidor". Se a chave secreta do Supabase estiver a
  vermelho: colar a chave **secret** (não a publishable) em `SUPABASE_SECRET_KEY` na Vercel, redeploy, e reenviar no Stripe o
  evento `checkout.session.completed` falhado.
- Criar `CRON_SECRET` (sequência aleatória de 32+ caracteres) na Vercel; redeploy.
- `NIFPT_KEY` (nif.pt, gratuita até aos limites): criada e testada em produção a 21/10/2026 (nome errado recusado, NIF inativo recusado). Sem chave, a validação fica só pelo dígito de controlo. Já ligada ao código (`src/lib/nifpt.ts`): ao criar/alterar uma entidade com NIPC (5/6/8/9) confirma que existe, está ativo e o nome corresponde; sem chave ou com o serviço em baixo, não bloqueia.
- Fotografias de prédios (ou aprovar ilustrações) para a página inicial; ilustração em linha do prédio.
- Questões ao advogado, ronda 2 (ordem: ver `docs/advogado/Pedido_ronda2_2026-10-21.md`) e roteiro do teste com pintores (`docs/teste/Roteiro_pintores.md`).
- Parecer jurídico: termos, privacidade, garantia legal da obra, minuta do contrato, Livro de Reclamações.
- Stripe em modo real (ativar a conta com os dados da empresa); registo da marca.
- Limpeza das contas de teste e retirada de `nunomarujo@gmail.com` de `platform_admins` (o Claude prepara o SQL).
- Convidar 5 a 10 pintores e 2 a 3 fornecedores de Viana do Castelo para testarem antes dos clientes.

- **Antes de abrir a utilizadores reais: apagar `PERMITIR_ACEITACAO_SIMPLES` na Vercel** (ligada a 20/10/2026 só para testes; uma aceitação simples não é assinatura de contrato) e fazer redeploy.
- **Ligação ao Supabase sem permissão nesta sessão (23/10/2026):** `mcp__Supabase__list_migrations`/`apply_migration` passaram a devolver "sem permissão" a meio da sessão autónoma, depois de terem funcionado antes (ver `docs/DECISOES.md`, migrações aplicadas mais cedo). Ficam duas migrações só escritas e testadas localmente (`supabase/tests/`), sem chegar ao projeto real — ver a lista em `docs/DECISOES.md`, secção de hoje. Confirmar a ligação em claude.ai → Connectors → Supabase e voltar a autorizar; depois aplicar as migrações pendentes (`supabase db push` ou pelo MCP) e regenerar `src/lib/database.types.ts` — **entretanto editado à mão** (só os campos novos de `reviews.obra_concluida` e `supplier_reviews.resposta`/`resposta_at`, para o código compilar sem acesso ao gerador); a regeneração real substitui-o sem problema, mas convém confirmar que bate certo.

Ver a tabela "Passos pendentes do promotor" em `docs/DECISOES.md` (endereços de autenticação, serviço de email,
alojamento).

## Como se trabalha aqui

- Branch de trabalho: `claude/sweet-brahmagupta-xd1vp7` no repositório `nunomarujo/paintit`.
- Antes de cada commit: `npx tsc --noEmit`, `npx eslint src`, `npx vitest run`, `npx next build`, todos com código
  de saída 0.
- Migrações: testadas primeiro em `supabase/tests/rls.test.ts` (Postgres em memória), aplicadas depois, avisos
  consultados, tipos atualizados, verificação na base real numa transação revertida (ver `CLAUDE.md`).
- `.claude/settings.json` autoriza todos os comandos e as ferramentas do Supabase (pedido do promotor, 19/10/2026),
  exceto apagar/pausar projetos e `push --force`. Quando houver dados reais de clientes, voltar a pedir
  confirmação para `execute_sql` e `apply_migration`.
