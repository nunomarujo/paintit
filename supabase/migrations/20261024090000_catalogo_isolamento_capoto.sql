-- Catálogo de referência — isolamento térmico (sistemas de capoto/ETICS) e acessórios próprios (pedido do
-- Nuno, 24/10/2026): tipos de isolante (EPS, EPS grafitado, XPS, lã mineral/rocha, cortiça ICB) e materiais
-- complementares (fixadores mecânicos, rede/malha de fibra de vidro, rebocos próprios para ETICS). Estes
-- produtos não se medem em litros (não são tintas): guardam-se em campos próprios, aditivos aos já existentes
-- em reference_products, que ficam null para os tipos que não se aplicam a eles (como já acontece hoje com
-- 'massa_reparacao'/'outro' e os campos de tinta).
--
-- Nota sobre os valores do enum: têm de ser confirmados (commit) antes de poderem ser usados numa linha —
-- por isso esta migração só acrescenta os tipos e as colunas; os produtos entram numa migração seguinte.

alter type public.product_type add value if not exists 'isolamento_eps';
alter type public.product_type add value if not exists 'isolamento_eps_grafitado';
alter type public.product_type add value if not exists 'isolamento_xps';
alter type public.product_type add value if not exists 'isolamento_la_mineral';
alter type public.product_type add value if not exists 'isolamento_cortica';
alter type public.product_type add value if not exists 'fixador_capoto';
alter type public.product_type add value if not exists 'rede_fibra_vidro';
alter type public.product_type add value if not exists 'reboco_capoto';

alter table public.reference_products
  add column espessuras_mm numeric[] not null default '{}',
  add column dimensoes text,
  add column m2_por_embalagem numeric check (m2_por_embalagem is null or m2_por_embalagem > 0),
  add column condutividade_termica_w_mk numeric check (condutividade_termica_w_mk is null or condutividade_termica_w_mk > 0),
  add column reacao_fogo text,
  add column unidade_venda text;

comment on column public.reference_products.espessuras_mm is 'Espessuras disponíveis, em mm (placas de isolamento). Vazio para produtos sem placas.';
comment on column public.reference_products.dimensoes is 'Dimensões físicas da placa/rolo/embalagem, texto livre (ex.: "1200 × 600 mm", "rolo 50 m × 1 m").';
comment on column public.reference_products.m2_por_embalagem is 'm² cobertos por uma embalagem/pack — para converter área da obra em número de embalagens, como embalagens_l faz para tintas.';
comment on column public.reference_products.condutividade_termica_w_mk is 'Condutividade térmica (λ), em W/(m·K) — quanto menor, melhor isolante por centímetro.';
comment on column public.reference_products.reacao_fogo is 'Euroclasse de reação ao fogo (ex.: "A1", "E", "B-s1,d0"), quando aplicável/publicada.';
comment on column public.reference_products.unidade_venda is 'Unidade de venda para produtos que não são placas nem tintas (ex.: "saco de 25 kg", "rolo de 50 m²", "caixa de 100 buchas").';
