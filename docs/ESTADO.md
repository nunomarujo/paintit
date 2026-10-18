# Ponto de situação — ler primeiro numa sessão nova

Atualizado a 18/10/2026. Este ficheiro substitui o historial da conversa em que o projeto começou: uma sessão nova
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
| 3–6 | Por fazer (`docs/ROADMAP.md`) |

Base de dados: projeto Supabase "Paint it" (`phkfrabrjqbpnmocrrvj`), 5 migrações aplicadas, avisos de segurança a
zero (fora o aviso da proteção de palavras-passe divulgadas, que não se aplica: a entrada é por link). Primeira
conta: nunomarujo@gmail.com (promotor), na equipa da plataforma (`platform_admins`) desde 18/10/2026; já criou um
condomínio. A app corre localmente (`npm run dev`); ainda não está alojada.

## Próximo passo

**Fase 3 — marketplace**: oportunidades e convites para pintores, propostas discriminadas, comparador, mensagens
com filtro de contactos. A vista do anúncio é `src/components/ListingPreview.tsx` (já inclui o volume 3D de
`src/domain/volume.ts` e os pormenores aprovados).

Fase 2B (feita a 18/10/2026): `request_photos` e armazenamento privado `fotos` (caminho `<pedido>/<ficheiro>`).
Gerais ficam privadas; pormenores entram como `pendente` e só a equipa da plataforma os aprova, em
`/app/validacao`. Os pintores só veem pormenores aprovados de anúncios abertos. Os metadados das imagens são
retirados no servidor (`src/domain/photo.ts`) antes de guardar.

## Pendente do promotor

Ver a tabela "Passos pendentes do promotor" em `docs/DECISOES.md` (endereços de autenticação, serviço de email,
alojamento).

## Como se trabalha aqui

- Branch de trabalho: `claude/sweet-brahmagupta-xd1vp7` no repositório `nunomarujo/paintit`.
- Antes de cada commit: `npx tsc --noEmit`, `npx eslint src`, `npx vitest run`, `npx next build`, todos com código
  de saída 0.
- Migrações: testadas primeiro em `supabase/tests/rls.test.ts` (Postgres em memória), aplicadas depois, avisos
  consultados, tipos atualizados, verificação na base real numa transação revertida (ver `CLAUDE.md`).
- `.claude/settings.json` autoriza as ferramentas do Supabase e os comandos habituais, para não pedir confirmação.
  Quando houver dados reais de clientes, retirar `execute_sql` e `apply_migration` dessa lista.
