-- Trabalho suplementar (25/10/2026, docs/DECISOES.md).
--
-- Registar dez horas ao preço de oito mente na margem, que é a única razão por que estas horas se
-- registam. Falta saber, de cada dia, se foi dia útil ou dia de descanso/feriado: num dia de descanso
-- não há horas normais nenhumas, todas levam acréscimo.
--
-- Cada linha de horas é **um dia de uma pessoa**, nunca um acumulado de vários dias. É isso que
-- permite separar as horas normais das suplementares, e por isso o limite passa a ser 24 horas.

alter table public.worksite_entries add column if not exists tipo_dia text;
alter table public.worksite_entries drop constraint if exists worksite_entries_tipo_dia_check;
alter table public.worksite_entries
  add constraint worksite_entries_tipo_dia_check
  check (tipo_dia is null or tipo_dia in ('util', 'descanso'));

alter table public.worksite_entries drop constraint if exists worksite_entries_horas_dia_check;
alter table public.worksite_entries
  add constraint worksite_entries_horas_dia_check
  check (horas is null or (horas > 0 and horas <= 2400));

comment on column public.worksite_entries.tipo_dia is
  'Dia útil ou dia de descanso/feriado. Null conta como dia útil. Acréscimos em src/domain/overtime.ts.';
