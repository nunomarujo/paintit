# Ponto de situação — ler primeiro numa sessão nova

Atualizado a 19/10/2026. Este ficheiro substitui o historial da conversa em que o projeto começou: uma sessão nova
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

Base de dados: projeto Supabase "Paint it" (`phkfrabrjqbpnmocrrvj`), 12 migrações aplicadas, avisos de segurança a
zero, com duas exceções explicadas: a proteção de palavras-passe divulgadas (não se aplica: a entrada é por link)
e `resolve_listing_report`, que corre com direitos de dono e verifica que quem chama é da equipa da plataforma. Primeira
conta: nunomarujo@gmail.com (promotor), na equipa da plataforma (`platform_admins`) desde 18/10/2026; já criou um
condomínio. A app corre localmente (`npm run dev`); ainda não está alojada.

## Próximo passo

As seis fases do produto estão feitas. O que falta para lançar depende de escolhas do promotor:

1. **Parceiro de pagamentos** (questão A1): ligar depósitos, comissões e instruções de `/app/backoffice/conciliacao`
   à API do parceiro. Até lá, a equipa da plataforma confirma cada recebimento à mão em `/app/contratacoes/[id]`.
2. **Assinatura com Chave Móvel Digital**: contratar o serviço e substituir a aceitação registada (com resumo
   SHA-256 da minuta) pela assinatura qualificada.
3. **Advogado**: rever o texto da minuta (`contractDraft` em `src/domain/contracting.ts`) e o documento de questões.
4. **Email transacional**: avisos de convites, propostas novas, prazos de comissão e assinatura.
5. **Alojamento** e domínio; depois um piloto numa região.

Ficaram para depois, por decisão de âmbito: convites da equipa da plataforma a pintores, avaliações (CLI-28),
confirmação de compras de materiais (FOR-10), histórico de versões das propostas revistas.

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
