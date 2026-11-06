-- Aplicada à base real a 06/11/2026 por outra sessão (contrato em PDF, disposição nova) sem o ficheiro no
-- repositório; posto aqui tal como está registado na base (supabase_migrations.schema_migrations).
alter table public.engagements alter column minuta_versao set default '2026-11-07';

comment on column public.engagements.minuta_versao is
  'Versão da minuta. Nula nas contratações anteriores a 06/11/2026: texto de sempre. 2026-11-06: elementos das partes. 2026-11-07: mesmo texto, disposição nova do PDF.';
