-- Índice que faltava na ligação do membro de obra à pessoa da empresa (25/10/2026).
--
-- A chave estrangeira ficou sem índice na migração `pessoas_da_empresa`, e é por este caminho que o
-- contador anual das horas suplementares percorre todas as obras de uma pessoa: sem índice, cada
-- cálculo lê a tabela inteira. Enquanto há poucas obras não se nota, e é agora que se corrige.

create index if not exists worksite_members_person_idx on public.worksite_members (person_id);
