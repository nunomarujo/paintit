-- A versão da minuta de cada contratação (06/11/2026; `src/domain/contracting.ts`, `MINUTA_2026_11_06`).
--
-- Aditiva. O PDF do contrato gera-se de novo a partir dos dados e os bytes têm de bater com o que cada
-- parte assinou (`src/lib/contractPdf.ts`). Por isso o texto novo (elementos das partes, o declarado no
-- pedido, a cláusula de alteração por adenda) só pode valer para contratações novas: as existentes
-- ficam com a coluna vazia e com o texto de sempre (`minuta.test.ts` fixa-o byte a byte), e as novas
-- recebem a versão por omissão no momento em que a escolha as cria.
--
-- **Aplicar no mesmo momento da publicação do código**: uma contratação criada entre as duas fica
-- com a versão nova; se o cliente a assinasse com o código antigo, o pintor receberia depois um texto
-- diferente. Hoje há uma contratação em produção (06/11/2026), por isso o risco é pequeno, mas existe.

alter table public.engagements add column if not exists minuta_versao text;
alter table public.engagements alter column minuta_versao set default '2026-11-06';

comment on column public.engagements.minuta_versao is
  'Versão do texto da minuta. Nula nas contratações anteriores a 06/11/2026: texto de sempre.';
