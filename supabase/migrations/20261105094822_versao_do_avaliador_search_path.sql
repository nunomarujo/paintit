-- O analisador do Supabase avisou (05/11/2026): `private.versao_da_autodeclaracao_do_avaliador` não fixa o
-- search_path. Não lê tabela nenhuma — devolve uma constante —, por isso não havia risco real; fixa-se na
-- mesma, para o aviso ficar a zero e a regra ser a de todas as outras funções.
alter function private.versao_da_autodeclaracao_do_avaliador() set search_path = '';
