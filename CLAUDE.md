# Paint it — orientação para Claude Code

Paint it (nome provisório) é um marketplace de orçamentação e contratação de empreitadas de pintura em
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

Next.js 15 (App Router), TypeScript estrito, Tailwind 3, Vitest. Pagamentos: instituição de pagamento autorizada,
ainda por escolher.

**Base de dados: só o projeto Supabase "Paint it"** (`phkfrabrjqbpnmocrrvj`, organização `mar-nordico`, região
eu-west-1). A organização tem outros projetos: nunca os ler nem alterar.

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
