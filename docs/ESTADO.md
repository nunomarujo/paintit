# Ponto de situação — ler primeiro numa sessão nova

Atualizado a 19/10/2026 (fim do dia). Este ficheiro substitui o historial da conversa em que o projeto começou: uma sessão nova
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
2. Consulta de revogação (OCSP) dos certificados das assinaturas.

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

## Como funciona a contratação

A base de dados guarda só acontecimentos (`engagement_events`), cada tipo registável só por quem o pode fazer; o
estado é reconstruído em `src/domain/contracting.ts` a partir de `engagement.ts`, aplicando os prazos até agora.
A apresentação acontece quando a comissão entra dentro do prazo: a partir daí as partes veem-se (nome, NIF,
contactos, morada da obra e fotografias), só para essa obra.

## Pendente do promotor

Tarefas que só o promotor pode fazer (nem o Claude do código nem o do navegador):
- Ver em `/app/backoffice` (conta `nm@quempinta.pt`) a caixa "Estado do servidor". Se a chave secreta do Supabase estiver a
  vermelho: colar a chave **secret** (não a publishable) em `SUPABASE_SECRET_KEY` na Vercel, redeploy, e reenviar no Stripe o
  evento `checkout.session.completed` falhado.
- Criar `CRON_SECRET` (sequência aleatória de 32+ caracteres) na Vercel; redeploy.
- Criar a chave `NIFPT_KEY` (nif.pt) e colá-la na Vercel, para validar NIPC e nome.
- Fotografias de prédios (ou aprovar ilustrações) para a página inicial; ilustração em linha do prédio.
- Parecer jurídico: termos, privacidade, garantia legal da obra, minuta do contrato, Livro de Reclamações.
- Stripe em modo real (ativar a conta com os dados da empresa); registo da marca.
- Limpeza das contas de teste e retirada de `nunomarujo@gmail.com` de `platform_admins` (o Claude prepara o SQL).
- Convidar 5 a 10 pintores e 2 a 3 fornecedores de Viana do Castelo para testarem antes dos clientes.

- **Antes de abrir a utilizadores reais: apagar `PERMITIR_ACEITACAO_SIMPLES` na Vercel** (ligada a 20/10/2026 só para testes; uma aceitação simples não é assinatura de contrato) e fazer redeploy.

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
