-- Limpeza de texto interno e visibilidade de produtos de referência sem confirmação,
-- mais estimativa de rendimento (m2/L) para produtos sem ficha técnica oficial.
--
-- Recuperada do Supabase (já aplicada pela outra sessão sem ficheiro no repositório — ver aviso em
-- docs/ESTADO.md) para repor a paridade entre as migrações do repositório e o estado real da base.

alter table reference_products
  add column if not exists nota_interna text,
  add column if not exists visivel boolean not null default true,
  add column if not exists rendimento_estimado boolean not null default false;

comment on column reference_products.nota_interna is 'Notas internas de importação/confiança (fonte, SKU, raciocínio do agente). Nunca mostrar ao público.';
comment on column reference_products.visivel is 'False enquanto não há confirmação suficiente de dados do fabricante; produto fica fora das listagens públicas mas os dados ficam guardados.';
comment on column reference_products.rendimento_estimado is 'True quando rendimento_m2_l é uma estimativa típica do setor, não um valor da ficha técnica do fabricante.';

-- 1) preserva todo o texto atual (importação + notas internas) antes de qualquer limpeza
update reference_products
  set nota_interna = nota
  where nota is not null and nota_interna is null;

-- 2) esconde os produtos sem correspondência confiável à ficha do fabricante; dados ficam em nota_interna
update reference_products
  set visivel = false,
      nota = null
  where nota ilike '%nao encontrada com confianca%'
     or nota ilike '%não encontrada com confiança%';

-- 3) limpa o texto público: remove o rasto de importação e o rótulo interno "(agente)"
update reference_products
  set nota = nullif(trim(
        regexp_replace(
          regexp_replace(nota, '^Importado da Leroy Merlin PT \(api-anything\) em \d{4}-\d{2}-\d{2}\.\s*SKU:[^|]*\|\s*', '', 'i'),
          'Ficha t[eé]cnica \(agente\):\s*', '', 'gi'
        )
      ), '')
  where nota is not null;

-- 4) estimativa de rendimento (m2/L por demão) só para tintas/primários/esmaltes visíveis sem valor oficial,
--    usando o extremo mais baixo dos valores típicos do setor, claramente assinalado como estimativa
update reference_products
  set rendimento_m2_l = case
        when tipo = 'tinta_interior' and acabamento ilike '%metalizado%' then 10
        when tipo = 'tinta_interior' and acabamento ilike '%extra mate%' then 13
        when tipo = 'tinta_interior' and acabamento ilike '%acetinado%' then 11
        when tipo = 'tinta_interior' then 12
        when tipo = 'tinta_exterior' then 8
        when tipo = 'primario' then 9
        when tipo = 'esmalte' then 11
      end,
      rendimento_estimado = true
  where rendimento_m2_l is null
    and visivel = true
    and tipo in ('tinta_interior', 'tinta_exterior', 'primario', 'esmalte');
