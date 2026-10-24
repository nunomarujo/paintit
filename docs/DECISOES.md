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
   outras três já na fila (`20261023160000_revoke_delete_clientes_fornecedor.sql`,
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
    `docs/ESTADO.md` 6.7). Recomendação mantém-se a mesma: sem urgência enquanto o piloto estiver longe
    (ponto 15), mas é a última coisa a confirmar antes de utilizadores reais — a fazer diretamente pelo
    promotor na Vercel.
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
