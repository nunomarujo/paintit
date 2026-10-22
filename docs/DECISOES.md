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
  - Índice único `organizations_fornecedor_nif_idx` (`supabase/migrations/20261022030000_nif_unico_fornecedores.sql`),
    parcial (só `kind = 'fornecedor'`), com teste em `supabase/tests/rls.test.ts`.
  - Funções puras e testadas em `src/domain/referral.ts`: `linkedSupplierDiscountBp`, `supplierCommissionBpAt` (com
    `priorWinsInSupplierWindow`), `combinedPainterDiscountBp` (teto de 800 p.b.) e `applyPainterDiscount` (aplica o
    desconto à comissão sem nunca a tornar negativa — o mínimo de 150 € continua a proteger a plataforma).
  - `addCalendarMonths` mudou de `referralEligibility.ts` para `deadline.ts` (é utilidade genérica de datas,
    passou a ser usada também em `referral.ts`; sem mudança de comportamento, só de sítio).

## 22/10/2026 — códigos de adesão: ligação ao esquema e ao `proposal_selected()`

- `supabase/migrations/20261022040000_codigos_de_adesao_cumulativos.sql`:
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

- `supabase/migrations/20261022050000_referencias_de_fornecedores.sql`: tabela nova `supplier_referral_invites`
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
