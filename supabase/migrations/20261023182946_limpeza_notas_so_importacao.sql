-- Alguns produtos tinham só a linha de importação (sem nenhuma nota de ficha técnica a seguir),
-- por isso não tinham o separador "|" e escaparam à primeira limpeza. Como o texto completo já
-- está preservado em nota_interna, aqui esvaziamos a nota pública quando não resta nada depois
-- de remover o rasto de importação.
--
-- Recuperada do Supabase (já aplicada pela outra sessão sem ficheiro no repositório — ver aviso em
-- docs/ESTADO.md) para repor a paridade entre as migrações do repositório e o estado real da base.

update reference_products
  set nota = nullif(trim(
        regexp_replace(nota, '^Importado da Leroy Merlin PT \(api-anything\) em \d{4}-\d{2}-\d{2}\.\s*SKU:[^|]*\.?\s*$', '', 'i')
      ), '')
  where nota ilike '%api-anything%';
