-- Os dados do cliente no orçamento do pintor (pedido do promotor, 28/10/2026).
--
-- O pedido era pesquisa nos orçamentos "por localização, nome do cliente, NIPC ou ano". Três desses
-- quatro já existiam. O NIPC não existia em lado nenhum do orçamento: só aparece no documento
-- fiscal, escrito à mão na altura de faturar.
--
-- E, ao procurá-lo, apareceu um beco: `cliente_contacto` lê-se em dois sítios — é ele que decide se
-- a plataforma pode perguntar ao cliente se o orçamento foi visto — mas **não havia um único ecrã
-- que o escrevesse**. O orçamento dizia ao pintor "o contacto do cliente está por preencher" e não
-- lhe dava onde. O seguimento estava, na prática, inalcançável para todos os orçamentos.
--
-- Daí esta coluna e, com ela, um sítio onde os dados do cliente se corrigem depois de criados — o
-- nome incluído, que até aqui ficava como tivesse sido escrito à primeira.
--
-- O NIPC segue a mesma verificação de todos os outros no projeto (`private.nif_valido`): ou está
-- bem, ou não entra. Nulo é legítimo — nem todo o cliente é empresa, e nem sempre se sabe à partida.

alter table public.painter_quotes
  add column if not exists cliente_nif text;

alter table public.painter_quotes drop constraint if exists painter_quotes_cliente_nif_check;
alter table public.painter_quotes
  add constraint painter_quotes_cliente_nif_check check (cliente_nif is null or private.nif_valido(cliente_nif));

comment on column public.painter_quotes.cliente_nif is
  'NIPC ou NIF do cliente, para a fatura e para encontrar o orçamento mais tarde. Nulo: ainda não se sabe.';
