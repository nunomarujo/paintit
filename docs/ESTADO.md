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

Base de dados: projeto Supabase "Paint it" (`phkfrabrjqbpnmocrrvj`), 16 migrações aplicadas, avisos de segurança a
zero, com duas exceções explicadas: a proteção de palavras-passe divulgadas (não se aplica: a entrada é por link)
e `resolve_listing_report` e `painter_rating`, que correm com direitos de dono por desenho (ver `DECISOES.md`). Primeira
conta: nunomarujo@gmail.com (promotor), na equipa da plataforma (`platform_admins`) desde 18/10/2026; já criou um
condomínio. A app corre localmente (`npm run dev`); ainda não está alojada.

## Próximo passo

Feito a 19/10/2026, além das seis fases: materiais certificados no orçamento (tipo → produto, sugestões com
desconto da obra, ficha, preços, entrega e contactos), descontos por escalão e entregas dos fornecedores,
encomendas certificadas (o fornecedor confirma venda e entrega, o cliente vê), avaliações de fornecedores,
"Ferramentas de obra" (`/app/obras/[id]`: materiais, equipa e horas, cronograma, custos e tranches), contrato em
linguagem simples ao lado da minuta.

Documentos para o promotor: `docs/advogado/Pedido_minuta_contrato.docx` (para enviar ao advogado) e
`docs/PAGAMENTOS_E_ASSINATURA.md` (Stripe/Mangopay e assinatura com a Autenticação.gov).

A seguir:

1. **Design das páginas** (o promotor só testa depois disto): aproximar ou melhorar o design do protótipo
   `docs/referencia/prototipo_v05.zip`.
2. **Assinatura com PDF da Autenticação.gov**: gerar o PDF, receber o PDF assinado, confirmar os bytes e a
   assinatura.
3. **Parceiro de pagamentos**, quando escolhido; **email e domínio**, quando o promotor os indicar.
4. Teste completo no browser pela sessão de teste do Paint it.

## Como funciona a contratação

A base de dados guarda só acontecimentos (`engagement_events`), cada tipo registável só por quem o pode fazer; o
estado é reconstruído em `src/domain/contracting.ts` a partir de `engagement.ts`, aplicando os prazos até agora.
A apresentação acontece quando a comissão entra dentro do prazo: a partir daí as partes veem-se (nome, NIF,
contactos, morada da obra e fotografias), só para essa obra.

## Pendente do promotor

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
