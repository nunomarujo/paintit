# Quem Pinta (antes "Paint it") — orientação para Claude Code

Quem Pinta (quempinta.pt; nome de trabalho anterior "Paint it") é um marketplace de orçamentação e contratação de empreitadas de pintura em
Portugal: condomínios e particulares descrevem a obra, pintores verificados orçamentam, o cliente escolhe e as
duas partes assinam o contrato na plataforma. Promotor: Nuno. Idioma do produto: português de Portugal.

## Regra de isolamento — primeira e permanente

Este projeto é independente de qualquer outro projeto do promotor. Nunca reutilizar, citar ou misturar
código, dados, nomes, decisões ou documentos de outros projetos. Se um pedido, ficheiro ou contexto parecer
pertencer a outro projeto, **parar e perguntar ao promotor** antes de continuar. Tudo o que é do Paint it
vive neste repositório.

## Onde está o quê

- **`docs/ESTADO.md` — ponto de situação. Ler primeiro em cada sessão nova; atualizar no fim de cada sessão.**
- `docs/requisitos/` — Documento Mestre de Requisitos v0.3 (o `.txt` serve para pesquisar).
- `docs/MODELO.md` — o modelo de contratação e dinheiro. Ler antes de mexer em `src/domain/engagement.ts`.
- `docs/DECISOES.md` — decisões tomadas e em aberto, com data. Atualizar no mesmo commit que muda uma regra.
- `docs/ROADMAP.md` — fases do produto e do negócio.
- Documento de questões jurídicas (Claude Docs, fora do repositório): link em `docs/DECISOES.md`.

## Stack

Next.js 15 (App Router), TypeScript estrito, Tailwind 3, Vitest. Pagamentos: **Stripe** (Connect, modo de teste —
`src/lib/stripe.ts`, `src/lib/payments.ts`, migração `pagamentos_stripe`), ainda por confirmar em modo real
(ver `docs/PAGAMENTOS_E_ASSINATURA.md`).

**Base de dados: só o projeto Supabase "Paint it"** (`phkfrabrjqbpnmocrrvj`, região eu-west-1), desde 23/10/2026 na
organização dedicada **`Quem Pinta`** (`eehwjlguffmcpaudqspy`) — transferido nesse dia para fora de `mar-nordico`
(organização partilhada com outros negócios do promotor, imóveis), precisamente para cumprir esta regra de
isolamento. URL, chaves API e connection string não mudaram (dependem do project ref, não da organização).

- Migrações em `supabase/migrations/`, com o nome igual à versão registada no Supabase.
- Antes de aplicar: `npm test` corre as migrações numa base Postgres em memória (`supabase/tests/`) e verifica as
  regras de acesso utilizador a utilizador. Uma tabela nova traz políticas RLS e testes no mesmo commit.
- Depois de aplicar: avisos de segurança e desempenho a zero (ou explicados), e `src/lib/database.types.ts`
  atualizado.
- `drop` e outras operações destrutivas pedem confirmação manual no Supabase: preferir migrações aditivas.
- Variáveis: `.env.example` (valores públicos). A chave secreta (service role) nunca entra no repositório.
- Equipa da plataforma: tabela `platform_admins`, só alterável por SQL no Supabase (não há ecrã para isso, de
  propósito).
- Verificar na base real com utilizadores `zz-test-*` dentro de um bloco `do $$ … raise exception … $$`: o erro
  final reverte tudo e traz o resultado. Confirmar depois que não ficou nada gravado.

```bash
npm install
npm run dev        # http://localhost:3000
npm test           # regras de negócio
npm run typecheck
npm run lint
npm run build
```

## Regras de código

1. **Dinheiro em cêntimos inteiros**, sempre (`src/domain/money.ts`). Percentagens em pontos-base.
2. **As regras de negócio vivem em `src/domain/`**, em funções puras e testadas. A interface e a base de dados
   chamam estas funções; nunca as reimplementam.
3. **Parâmetros comerciais versionados** (`src/domain/rules.ts`). Uma alteração cria uma versão nova e não muda
   contratações já iniciadas.
4. **A plataforma nunca guarda dinheiro ela própria.** Cada movimento é uma instrução ao parceiro de pagamentos.
5. **O papel da plataforma termina na assinatura das duas partes.** Depois disso só guarda prova.
6. **Anonimato até à apresentação:** morada, nomes, contactos e fotografias originais nunca chegam à outra parte
   antes do momento previsto em `docs/MODELO.md`. As fotografias só geram um volume 3D não reconhecível.
7. **Verificar pelo código de saída.** Um teste, build ou lint só está verde se o comando terminar com 0:
   `npm test > /tmp/t.log 2>&1; echo "EXIT=$?"`. Nunca concluir verde a partir de texto filtrado do output.
8. **Antes de declarar trabalho feito:** `git status --porcelain` vazio e as verificações corridas sobre o que
   foi enviado para o repositório remoto.
9. **Formulários com `useFormAction`** (`src/components/useFormAction.ts`), nunca `<form action={…}>` com
   `useActionState`: o React 19 apaga todos os campos depois de cada envio, mesmo quando a resposta é um erro.
10. **Argumentos ligados (`.bind`) das server actions vêm do navegador** e podem ser alterados: valide no servidor
    qualquer estado, tipo ou nome de tabela que chegue assim. Identificadores ficam protegidos pelas políticas RLS.
11. **Ver não é pertencer.** As políticas RLS deixam ver entidades alheias (fornecedores no catálogo, a outra parte
    depois da apresentação). Listas de "as suas entidades", menus e ações filtram sempre por `org_members` do
    utilizador, nunca pelo que a consulta a `organizations` devolve.
12. **Tratamento do leitor: impessoal.** Texto dirigido ao utilizador evita "tu" e "você" e usa o infinitivo
    ("Descrever o trabalho", "Comparar propostas") ou frases sem sujeito. Onde o imperativo for inevitável
    (botões, erros), a forma de cortesia: "Registe", "Indique". Aplica-se à página inicial e, ao tocar em ecrãs
    existentes, aos restantes.
13. **Alarme: uma só banda com fundo de cor por ecrã.** A banda vai no topo. Dentro de listas e de
    linhas repetidas o alarme é **texto** (`text-amber-800`), nunca fundo colorido — senão a lista
    fica aos quadrados e deixa de se ver o que é urgente. **Vermelho só para o que já fechou,
    caducou ou foi recusado**; o que ainda se pode resolver é âmbar. Cor de aviso não se usa para
    selecção nem para destaque — isso ensina a ignorar o aviso. A regra vivia num comentário de
    `obras-publicas/Concursos.tsx` e era violada em 8 ficheiros; subiu para aqui a 26/10/2026.
    *Em aberto:* `docs/DECISOES.md` (23/10/2026) mandou pôr o aviso de documento em falta a vermelho,
    o que contraria a reserva do vermelho. Decisão do promotor por tomar.
14. **Escala tipográfica: 13 / 15 / 17 / 20 / 26 / 34 px, e nada abaixo de 13.** O corpo são 17px
    (`globals.css`). Nunca pôr um campo de formulário abaixo de 16px: o Safari do iPhone dá zoom a
    cada toque, e quem preenche um levantamento está numa obra. Não passar substituições de tamanho
    a `ProposalDocument.tsx` (folha A4, pontos de papel) nem a `<text>` dentro de SVG
    (`SeverityScale.tsx`, `PhotoInstructions.tsx` — são unidades de `viewBox`). `text-slate-400` não
    se usa para texto: dá 2,33:1 e reprova o mínimo de acessibilidade. `max-w-[Nch]` dá ~1,29×N
    caracteres no Inter — para 70 caracteres reais, `max-w-[54ch]` (auditoria de 26/10/2026).
15. **O cliente nunca vê o que a plataforma cobra ao pintor** (comissão, % ou valores), em nenhum ecrã, email ou
    resumo: pode mudar e não é informação do utilizador final. Texto para o cliente fala em "confirmação do pintor".
    Valores e percentagens aparecem só ao pintor e à plataforma. A página pública Transparência diz apenas, sem números, que a plataforma cobra uma pequena comissão pelo sucesso ao prestador de serviço (exigência do parecer jurídico).
    O pintor vê o valor da sua própria comissão, com o detalhe do desconto se tiver — isto não abre excepção à regra
    acima: antes de ver a ficha completa de uma obra, aceita não revelar esse valor ao cliente nem a terceiros
    (`painter_terms_acceptances`, `src/domain/painterTerms.ts`, decisão de 22/10/2026).
