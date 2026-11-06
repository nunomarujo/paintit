-- O lado do prédio a que pertence cada alçado (06/11/2026).
--
-- O passo 2 do pedido desenha o prédio só com os alçados entregues: cada zona de fachada ou de empena ocupa
-- um lado da planta (frente, esquerda, direita, tardoz, e os lados das asas de um L, U ou T), e as varandas
-- assentam no lado que lhes cabe. O lado guarda-se aqui, na zona, porque é da zona — o mesmo prédio pode ter
-- um pedido só para a frente e outro só para o tardoz.
--
-- O valor é o identificador de `ladosDaPlanta` (src/domain/volume.ts): `frente`, `esquerda`, `direita`, `tras`,
-- e, para os outros lados que olham para o mesmo sítio, `tras-2`, `direita-2`… (de 2 a 9). Nulo quer dizer «o
-- desenho atribui pela ordem em que as zonas foram registadas» (`atribuirFaces`, src/domain/prancheta.ts), que é
-- o que acontece com todas as zonas de antes desta migração. Se a planta do prédio mudar e o lado deixar de
-- existir, o desenho ignora o valor e atribui outro: por isso a coluna não tem chave nem depende da forma.
--
-- Não é dado de pessoas nem de morada: descreve que parede do desenho é, e nada mais (regra 6 do CLAUDE.md).
-- As políticas da tabela cobrem a linha inteira; não há política por coluna a acrescentar.
--
-- Aditiva: nenhuma coluna nem restrição existente muda, e o código tolera a falta da coluna (a página lê com
-- `select *`, e a gravação do lado repete-se sem ela).

alter table public.request_surfaces add column if not exists face_do_predio text;

alter table public.request_surfaces drop constraint if exists request_surfaces_face_do_predio_formato;
alter table public.request_surfaces add constraint request_surfaces_face_do_predio_formato check (
  face_do_predio is null or face_do_predio ~ '^(frente|esquerda|direita|tras)(-[2-9])?$'
);

comment on column public.request_surfaces.face_do_predio is
  'O lado da planta do prédio a que a zona pertence (frente, esquerda, direita, tras, ou tras-2, direita-2… nas asas de um L, U ou T). Nulo: o desenho atribui pela ordem. Migração 20261106103000.';
