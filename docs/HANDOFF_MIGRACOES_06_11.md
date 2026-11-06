# Migrações de 06/11/2026 — ramo `claude/wizardly-ride-0mfpyl`

> **Fechado a 06/11/2026, de manhã:** as nove aplicadas à base real, por esta ordem, e o código publicado (`291beaf`). As três primeiras (poderes, assinatura, medida pelo cliente) pela sessão «Medição de zonas por retângulo e dois pontos»; as seis seguintes por esta. Ficheiros renomeados para as versões registadas. Fica como registo.

Aplicar **no mesmo momento em que o ramo for publicado**, por esta ordem, depois do «sim» do promotor. Todas são
aditivas e correm sem erro numa base construída de raiz (`npm test`, 2149 testes, com as migrações em memória).
Verificado na base real a 06/11/2026: a última aplicada é `20261105211749_faturas_ao_cliente`.

| Ordem | Migração | O que faz | Sem ela, o código novo… |
|---|---|---|---|
| 1 | `20261106083428_poderes_de_representacao` | (05/11, ramo `sweet-cray`) poderes de quem assina | ver `EM_ABERTO.md` §1 |
| 2 | `20261106083458_assinatura_so_pelo_servidor` | (05/11) a assinatura só entra pelo servidor | funciona; a falha só fecha com ela |
| 3 | `20261106083710_caleiras` | valor `caleiras` no tipo de obra; campos das caleiras no pedido e no anúncio | um pedido com «Caleiras» dá erro ao gravar; os outros gravam |
| 4 | `20261106083733_minuta_versionada` | `engagements.minuta_versao`; as novas recebem `2026-11-06` | o contrato fica com o texto de sempre |
| 5 | `20261106083814_elementos_e_comprovativos` | elementos do contrato, códigos de email, comprovativos, cofre | as secções não mostram nada; **com a 4 e sem a 5, o cliente não consegue assinar** (falta o IBAN e não há onde o pôr) — aplicar as duas juntas |
| 6 | `20261106083844_conclusao_e_garantia` | conclusão, garantias, `garantia_anos`, cofre das provas | a secção fica vazia |
| 7 | `20261106083957_registo_da_obra` | o registo do percurso e os relatórios | nada fica registado; o pedido do relatório falha |
| 8 | `20261106084200_interior_e_cores` | divisões do interior, paleta QP (60 cores), registo das alterações | o separador do interior abre mas não grava |

Depois de cada uma: `get_advisors` (segurança e desempenho). Avisos esperados e explicados: nenhum novo de
segurança — as tabelas novas têm RLS; as funções `security definer` novas estão em `private` ou revogadas a
`anon`/`authenticated` (`registar_versao_da_minuta` só para a chave de serviço). Depois de todas:
`generate_typescript_types` e comparar com `src/lib/database.types.ts` (escrito à mão).

Verificação sem rasto, com utilizadores `zz-test-*` num bloco `do $$ … raise exception … $$`: um elemento antes da
apresentação é recusado; um `update` ao `registo_da_obra` é recusado; um pedido em rascunho apagado deixa
`pedido_apagado` no registo.
