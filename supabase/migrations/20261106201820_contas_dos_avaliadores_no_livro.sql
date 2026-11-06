-- Contas do livro de movimentos para as comissões de levantamento dos avaliadores (06/11/2026).
-- As comissões do avaliador são da pessoa (decisão de 05/11/2026) e o seu resgate passa a ser lançado no livro como o de adesão
-- (src/domain/accounting/entries.ts: surveyAccrued, surveyRedemptionInvoiced, surveyRedemptionPaid). O saldo das pessoas tem conta própria,
-- para não se misturar com o dos fornecedores (22.1). IVA dedutível (24.32) e retenções (24.2) são as mesmas contas.
-- ◆ Por validar pelo contabilista (docs/DECISOES.md, 06/11/2026). Migração aditiva. Uma instrução por linha.
insert into public.acc_accounts (codigo, nome, natureza) values ('22.3', 'Fornecedores: avaliadores (comissões de levantamento)', 'credora'), ('62.2.3', 'Comissões de levantamento a avaliadores', 'devedora') on conflict (codigo) do nothing;
