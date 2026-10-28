-- Janelas por piso em cada fachada (pedido do promotor, 28/10/2026).
--
-- O volume 3D do anúncio desenhava vãos só na fachada da frente, em número fixo. Ao rodar, as
-- janelas desapareciam e reapareciam — o promotor leu isso como avaria, e era: um prédio tem
-- janelas de todos os lados, e o número delas é o que o pintor precisa de saber para descontar
-- área de vãos e contar protecções a montar.
--
-- Guarda-se o número **por piso**, não o total: é assim que quem descreve a obra o sabe de cor
-- ("quatro janelas por piso para a rua"), e é assim que o desenho o usa.
--
-- Não quebra o anonimato (regra 6 do CLAUDE.md): o desenho distribui as janelas em ritmo regular,
-- igualmente espaçadas. O número é fiel; a arrumação não. Dois prédios com quatro janelas por piso
-- continuam a dar exactamente o mesmo desenho.
--
-- Nulo = não declarado, e o desenho usa o número por omissão. Zero = fachada cega, declarada como
-- tal: são coisas diferentes e por isso a coluna admite nulo.

alter table public.buildings
  add column if not exists janelas_frente smallint,
  add column if not exists janelas_esquerda smallint,
  add column if not exists janelas_direita smallint,
  add column if not exists janelas_tras smallint;

-- O mesmo tecto do desenho (`MAX_JANELAS_POR_PISO`, src/domain/volume.ts): acima disto os vãos
-- deixam de se distinguir e o número passa a ser ruído.
alter table public.buildings
  add constraint buildings_janelas_frente_limite check (janelas_frente is null or (janelas_frente >= 0 and janelas_frente <= 8)),
  add constraint buildings_janelas_esquerda_limite check (janelas_esquerda is null or (janelas_esquerda >= 0 and janelas_esquerda <= 8)),
  add constraint buildings_janelas_direita_limite check (janelas_direita is null or (janelas_direita >= 0 and janelas_direita <= 8)),
  add constraint buildings_janelas_tras_limite check (janelas_tras is null or (janelas_tras >= 0 and janelas_tras <= 8));

comment on column public.buildings.janelas_frente is 'Janelas por piso na fachada principal. Nulo: não declarado. Zero: fachada cega.';
comment on column public.buildings.janelas_esquerda is 'Janelas por piso na lateral esquerda, vista de quem está de frente para a fachada principal.';
comment on column public.buildings.janelas_direita is 'Janelas por piso na lateral direita, vista de quem está de frente para a fachada principal.';
comment on column public.buildings.janelas_tras is 'Janelas por piso no tardoz.';

-- FALTA UMA SEGUNDA METADE, DE PROPÓSITO.
--
-- O anúncio que o pintor vê não lê `buildings` (não pode: é a projecção anónima que existe
-- precisamente para ele não lhe aceder). Vive em `request_listings`, uma tabela escrita pelo
-- gatilho `private.work_request_transition`. Levar estas quatro colunas até lá é acrescentá-las a
-- essa tabela e copiá-las no gatilho.
--
-- Fica para migração própria, e não por falta de tempo: esse gatilho é a função mais delicada do
-- projecto e já foi quase partida uma vez ao ser reescrita a partir de uma versão antiga
-- (27/10/2026). Reescreve-se a partir da versão em vigor, verbatim, com os testes a correr — não
-- de passagem no fim de outra coisa.
--
-- Até lá: quem descreve a obra já declara as janelas e vê-as no seu próprio ecrã; o pintor vê o
-- volume com o número genérico. Nada fica errado, só menos fiel de um dos lados.
