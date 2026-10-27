-- Seguimento do orçamento (27/10/2026, 1.ª das duas ferramentas decididas a 26/10).
--
-- O pintor envia o orçamento e fica à espera. O cliente lê-o, acha caro ou fica indeciso, põe de
-- lado e pede outro — e quem telefona ao terceiro dia leva a obra que o primeiro já tinha
-- orçamentado. Quase nenhuma empresa pequena faz esse seguimento: à sexta-feira ninguém se lembra de
-- quem recebeu o quê na segunda.
--
-- A plataforma passa a perguntar por ele. Três toques, no máximo, sempre educados, sem pressão —
-- e só com o consentimento do pintor, que é o que esta coluna guarda. Por omissão está desligado:
-- escrever a um cliente de alguém não é coisa que se faça por defeito.
alter table public.painter_quotes
  add column if not exists seguimento boolean not null default false;

comment on column public.painter_quotes.seguimento is
  'O pintor autorizou a plataforma a perguntar ao cliente, em nome dele, se o orçamento foi visto. Três toques.';
