-- Comissão a 18% com piso de 9% (24/10/2026, decisão do promotor: os 3% em vigor estavam, nas suas
-- palavras, "abaixo do mínimo estabelecido"). A base de dados só carimba a **versão** das regras em
-- cada contratação; os valores vivem em src/domain/rules.ts, que é onde se reconstrói o dinheiro.
--
-- Contratações já criadas guardam a versão que aplicaram e não mudam: esta função só decide a versão
-- das contratações que nascem a partir de agora.
create or replace function private.current_rules_version() returns text
language sql immutable set search_path = '' as $$ select '2026-10-24' $$;
