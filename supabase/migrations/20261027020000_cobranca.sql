-- Cobrança: a plataforma lembra, em nome do pintor (27/10/2026, 2.ª ferramenta decidida a 26/10).
--
-- A obra acabou, a factura foi emitida, e o dinheiro aparece dois ou três meses depois — ou quando
-- ele se lembrar de ligar. Numa empresa de cinco pessoas, 8 000 € parados são um ordenado. E cobrar
-- é a tarefa que toda a gente adia, porque é a única em que se arrisca a estragar a relação com o
-- cliente. Um lembrete educado e impessoal não estraga nada: é por isso que as empresas grandes
-- cobram a horas e as pequenas não.
--
-- A plataforma continua a não guardar dinheiro nenhum (regra 4 do CLAUDE.md). Isto **lembra**, não
-- cobra: não há juros, não há ameaças, não há mais do que três mensagens.
alter table public.worksites
  add column if not exists cobranca boolean not null default false,
  add column if not exists cliente_contacto text;

comment on column public.worksites.cobranca is
  'O pintor autorizou a plataforma a lembrar o cliente desta obra das tranches vencidas. Três toques por tranche.';
comment on column public.worksites.cliente_contacto is
  'Email do cliente desta obra, para os lembretes. Campo livre: só se escreve quando é mesmo um email.';
