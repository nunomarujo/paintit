# Decisões

Questões jurídicas, fiscais e regulamentares, com propostas de resposta:
[Paint it — Questões jurídicas para validação](https://claude.ai/code/artifact/6ac31246-9446-4e07-a622-2022b58cdcb3)
(Claude Docs). Requisitos de base: Documento Mestre de Requisitos v0.3 (17/10/2026).

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
