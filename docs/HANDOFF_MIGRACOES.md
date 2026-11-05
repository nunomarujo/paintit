# Handoff — Migrações por aplicar na base real (02/11/2026)

> **Fechado a 05/11/2026:** as duas estão aplicadas — `condominos_do_predio` (`20261101090000`) e
> `reserva_so_para_avaliadores_inscritos` (agora `20261105103114`, por decisão do promotor, sem inscrição
> automática). Fica como registo.

**Para:** uma sessão nova de Claude Code no repositório `nunomarujo/paintit` (ramo de produção
`claude/sweet-brahmagupta-xd1vp7`; a Vercel publica cada push). **Promotor:** Nuno.

Prompt a colar na sessão nova:

---

Lê `CLAUDE.md`, `docs/ESTADO.md`, `docs/EM_ABERTO.md` e as entradas de 01 e 02/11/2026 em
`docs/DECISOES.md` («Condóminos com acesso ao prédio», «Ser avaliador»). Há **duas migrações escritas,
testadas na base em memória (`npm test` verde) e não aplicadas** no projeto Supabase «Paint it»
(`phkfrabrjqbpnmocrrvj`, organização `Quem Pinta`). A sessão que as escreveu não tem autorização para
aplicar migrações em produção; esta tem, com o promotor a confirmar.

Só declaras feito com as quatro verificações a zero pelo código de saída (`npm run typecheck`,
`npm test`, `npm run lint`, `npm run build`) e `git status --porcelain` vazio depois do push.

## 1. `20261101090000_condominos_do_predio.sql`

Tabelas `building_residents`, `building_access_codes`, `proposal_votes`; funções `predio_por_codigo`
e `registar_condomino` (anon, de propósito — justificado no cabeçalho), `reclamar_acesso_de_condomino`,
`votar`; ramo do condómino nas políticas de `buildings`, `organizations`, `work_requests`,
`request_surfaces`, `proposals`; `supplier_discounts` passa a exigir pertença a uma entidade. O
código que a usa está publicado e seguro sem as tabelas (devolve vazio). Detalhe, percurso de teste em
produção e o que fica depois: documento do projeto Claude «handoff-condominos-do-predio».

## 2. `20261102120000_reserva_so_para_avaliadores_inscritos.sql`

`reserve_survey` passa a exigir a autodeclaração de avaliador: uma linha em
`survey_terms_acceptances` com a versão `avaliador-2026-11-02` (`private.versao_da_autodeclaracao_do_avaliador()`,
igual a `VERSAO_AUTODECLARACAO_DO_AVALIADOR` em `src/domain/avaliador.ts`; um teste em
`supabase/tests/rls.test.ts` falha se divergirem). Sem ela, a função recusa com «Para aceitar um
levantamento é preciso a inscrição como avaliador». O ecrã já esconde o botão de reservar a quem não
está inscrito; a base passa a garantir o mesmo.

**Atenção às pessoas que já reservam levantamentos hoje:** depois de aplicar, quem não se inscreveu em
«Avaliações › Ser avaliador» deixa de poder reservar até o fazer (um minuto, quatro compromissos). Se o
promotor preferir, insere as linhas de aceitação para os vendedores ativos antes de aplicar — pergunta-lhe.

## Como aplicar, por ordem

1. `apply_migration` com o nome do ficheiro (sem a data) e o conteúdo integral, uma de cada vez,
   primeiro a 1 e depois a 2. Se o Supabase registar outra versão (data de hoje), renomeia o ficheiro
   no repositório para essa versão **só se `npm test` continuar verde** — a regra do `CLAUDE.md` tem a
   excepção escrita para quando a ordem verdadeira é a do ficheiro.
2. `list_migrations` mostra as duas a seguir a `20261102090000_avisos_por_whatsapp`.
3. `get_advisors` (security e performance) a zero ou explicados em `docs/DECISOES.md`. Provável aviso:
   funções `security definer` executáveis por `anon` nos condóminos — é de propósito; explica, não tires.
4. `generate_typescript_types` → compara com `src/lib/database.types.ts` (escrito à mão); fica a versão
   gerada se `npm run typecheck` passar.
5. Verificação na base real sem deixar rasto, padrão do `CLAUDE.md`: utilizadores `zz-test-*` num bloco
   `do $$ … raise exception … $$`. Para a 2: um vendedor sem a linha de aceitação tenta `reserve_survey`
   e é recusado; com a linha, reserva. Confirma no fim que não ficou nada `zz-test` gravado.
6. Percurso real em quempinta.pt com a conta do promotor (ver handoff dos condóminos).

No fim: `docs/ESTADO.md`, `docs/EM_ABERTO.md` (tira «Aplicar a migração…» da lista 1 e a linha da
barreira do avaliador da lista 3) e `docs/DECISOES.md` se mudaste uma regra, no mesmo commit. Antes de
cada push, `git fetch` e `rebase` sobre `origin/claude/sweet-brahmagupta-xd1vp7` — há outra sessão a
publicar no mesmo ramo. Trailer dos commits como nos anteriores. Responde ao promotor em português
simples, sem SQL: o que ficou aplicado, o que testaste e o que fica em aberto.

---
