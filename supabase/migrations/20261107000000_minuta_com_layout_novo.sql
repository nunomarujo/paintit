-- Minuta de 07/11/2026: o mesmo texto, com a disposição nova do PDF (`src/lib/contractPdfV2.ts`).
--
-- O PDF assinado confere-se regenerando-o: os mesmos dados têm de dar sempre os mesmos bytes. Por isso a
-- disposição também é versionada: as contratações já criadas (`minuta_versao` nula ou '2026-11-06') continuam a
-- gerar o PDF de sempre, byte a byte (`src/lib/contractPdf.layout.test.ts`), e só as criadas a partir de agora
-- recebem a versão nova por omissão.
--
-- **Aplicar DEPOIS de o código estar publicado.** Uma contratação criada com esta versão antes de o código a
-- conhecer geraria o PDF antigo ao descarregar e outro ao conferir.

alter table public.engagements alter column minuta_versao set default '2026-11-07';

comment on column public.engagements.minuta_versao is
  'Versão da minuta. Nula nas contratações anteriores a 06/11/2026: texto de sempre. 2026-11-06: elementos das partes. 2026-11-07: mesmo texto, disposição nova do PDF.';
