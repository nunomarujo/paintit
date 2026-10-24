-- Catálogo de referência — produtos reais de isolamento térmico (sistemas de capoto/ETICS) e acessórios
-- próprios, pesquisados marca a marca a partir de fichas técnicas e páginas oficiais dos fabricantes
-- (24/10/2026), seguindo o mesmo critério da migração de tintas: só entra o que foi confirmado numa fonte
-- real; o que não foi possível confirmar (espessuras, preço, ficha técnica) fica em branco, nunca inventado.
-- `uso` = 'exterior' em todos (sistemas de capoto são sempre aplicados no exterior do edifício).
-- Sem fotografias por agora (mesma nota da migração original do catálogo).

insert into public.reference_products
  (marca, nome, tipo, descricao, acabamento, uso, url_produto, url_ficha_tecnica, preco_referencia_cents,
   preco_fonte, preco_data, complementares, nota, espessuras_mm, dimensoes, m2_por_embalagem,
   condutividade_termica_w_mk, reacao_fogo, unidade_venda)
values

-- EPS -------------------------------------------------------------------------------------------------
('Secil (linha Isovit, sistema Seciltek)','Isovit Painel EPS 100','isolamento_eps'::public.product_type,
 'Placa rígida de poliestireno expandido para sistemas ETICS, densidade normal, da linha Isovit da Secil.',
 null,'exterior','https://www.secil.pt/en/products/mortars/etics-system/isovit-expanded-polystyrene-panel-eps-100',
 'https://www.secil.pt/content/dam/secilComercial/documents/pt/argamassas/sistema-etics/isovit-painel-em-poliestireno-expandido---eps-100/Ficha%20T%C3%A9cnica%20Isovit%20Painel%20em%20Poliestireno%20Expandido%20EPS%20100-150_ES.pdf.coredownload.pdf',
 null,null,null,array['Rede de fibra de vidro para ETICS','Argamassa de colagem/regularização Secil','Buchas de fixação']::text[],
 'Ficha técnica conjunta EPS100/EPS150; dimensões da placa não indicadas no documento. m² por embalagem varia por espessura (20 mm: 30 m²; 50 mm: 12 m²; 100 mm: 6 m², entre outras). Sem preço confirmado para esta referência exata.',
 array[20,30,40,50,60,70,80,90,100]::numeric[],null,null,0.036,'E',null),

('Secil (linha Isovit, sistema Seciltek)','Isovit Painel EPS 150','isolamento_eps'::public.product_type,
 'Placa rígida de poliestireno expandido de maior densidade/resistência mecânica, para sistemas ETICS, linha Isovit da Secil.',
 null,'exterior','https://www.leroymerlin.pt/produtos/placas-de-isolamento-para-etics-isovit-eps-150-50mm-12m2-81971642.html',
 'https://www.secil.pt/content/dam/secilComercial/documents/pt/argamassas/sistema-etics/isovit-painel-em-poliestireno-expandido---eps-100/Ficha%20T%C3%A9cnica%20Isovit%20Painel%20em%20Poliestireno%20Expandido%20EPS%20100-150_ES.pdf.coredownload.pdf',
 13900,'https://www.leroymerlin.pt/produtos/placas-de-isolamento-para-etics-isovit-eps-150-50mm-12m2-81971642.html','2026-10-24'::date,
 array['Rede de fibra de vidro para ETICS','Argamassa de colagem/regularização Secil','Buchas de fixação']::text[],
 'Preço é para a variante de 50 mm / 12 m² por embalagem; outras espessuras têm m²/embalagem e preço próprios na mesma gama (não todos verificados individualmente).',
 array[20,30,40,50,60,70,80,90,100,110,120,130,140,150,160,170,180,190,200]::numeric[],null,12,0.034,'E',null),

('Barbot','Placa EPS100 (Ref. 8620)','isolamento_eps'::public.product_type,
 'Placa de isolamento térmico em poliestireno expandido para aplicação em sistemas de isolamento térmico de fachadas (ETICS).',
 null,'exterior','https://barbot.pt/wp-content/uploads/2024/01/8620-FT-Placa-EPS.pdf','https://barbot.pt/wp-content/uploads/2024/01/8620-FT-Placa-EPS.pdf',
 null,null,null,array['Argamassa cola/reboco Barbot para ETICS','Rede de fibra de vidro','Buchas de fixação']::text[],
 'Ficha técnica não indica espessuras disponíveis nem m² por embalagem. Sem preço confirmado.',
 '{}'::numeric[],'500 ± 3 mm × 1000 ± 3 mm',null,0.036,'E',null),

('Esferovite (venda Leroy Merlin Portugal)','Placa de poliestireno expandido (EPS), 30 mm','isolamento_eps'::public.product_type,
 'Placa genérica de poliestireno expandido para isolamento térmico, comercializada em várias espessuras e formatos de embalagem.',
 null,'exterior','https://www.leroymerlin.pt/produtos/placa-de-poliestireno-expandido-eps-30-mm-4m2-pack-8-un-12404406.html',null,
 2396,'https://www.leroymerlin.pt/produtos/placa-de-poliestireno-expandido-eps-30-mm-4m2-pack-8-un-12404406.html','2026-10-24'::date,
 array['Cola/argamassa de fixação genérica','Rede de fibra de vidro','Fita de arranque']::text[],
 'Sem marca de fabricante própria (venda sob o nome genérico "Esferovite" via Leroy Merlin). Condutividade térmica e reação ao fogo não indicadas pelo vendedor.',
 array[10,15,20,30,40]::numeric[],'1000 × 500 mm (variante de 30 mm)',4,null,null,null),

-- EPS grafitado -----------------------------------------------------------------------------------------
('DANOSA','Danotherm Placa EPS Grafito','isolamento_eps_grafitado'::public.product_type,
 'Placa de poliestireno expandido (EPS) com grafite incorporado, utilizada como isolante térmico em sistemas ETICS. O grafite funciona como bloqueador de radiação, melhorando o desempenho térmico por centímetro de espessura face ao EPS branco convencional.',
 null,'exterior','https://www.distriplac.com','https://www.distriplac.com/media/catalog/product/3/1/31078768499.pdf',
 null,null,null,array['Danotherm Placa EPS 100mm','Danotherm Placa EPS 50mm (gama branca, mesmo fabricante)']::text[],
 'Ficha indica apenas a espessura de 40 mm para esta referência; outras espessuras "grafito" não confirmadas em ficha publicada. Presença em Portugal confirmada via distribuidor Distriplac Portugal. Sem preço público.',
 array[40]::numeric[],'1000 × 500 mm',15,0.031,'E',null),

('Weber (Saint-Gobain Weber)','webertherm placa EPS Grafito','isolamento_eps_grafitado'::public.product_type,
 'Placa de poliestireno expandido (EPS) com grafite, destinada aos sistemas de isolamento térmico pelo exterior (ETICS) e a soluções cerâmicas/flexíveis da gama webertherm.',
 null,'exterior','https://www.es.weber','https://www.es.weber/files/es/2018-07/FTC-ES-P-webertherm-placa-EPS-grafito.pdf.pdf',
 null,null,null,array['webertherm EPS 100','webertherm EPS 150 (gama branca, mesma marca)']::text[],
 'Ficha consultada é da filial espanhola do grupo (es.weber); a gama branca está confirmada em Portugal (saint-gobain.pt), mas não foi localizada página PT própria para a variante grafito. Sem preço público.',
 array[20,30,40,50,60,70,80,90,100,110,120,130,140,150,160,170,180,190,200]::numeric[],null,null,0.032,'E',null),

-- XPS -----------------------------------------------------------------------------------------------------
('Danosa','DANOPREN TL-P','isolamento_xps'::public.product_type,
 'Placa rígida de poliestireno extrudido (XPS) com juntas perimetrais a meia-madeira, para isolamento térmico sob telha em coberturas inclinadas e outras aplicações de isolamento térmico em edifícios.',
 null,'exterior','https://www.leroymerlin.pt/produtos/placa-de-isolamento-em-poliestireno-extrudado-xps-40-mm-pack-7-5m2-danosa-82601251.html',
 'https://media.adeo.com/media/3725842/media.pdf',3968,
 'https://www.leroymerlin.pt/produtos/placa-de-isolamento-em-poliestireno-extrudado-xps-40-mm-pack-7-5m2-danosa-82601251.html','2026-10-24'::date,
 array['SOPRA XPS PM','SOPRA XPS CB']::text[],
 'Resistência à compressão CS(10\Y)300 (≥300 kPa, EN 13164). Preço é para a referência de 40 mm / 7,5 m².',
 array[30,40,50,60,80,100]::numeric[],'1250 × 600 mm',7.5,0.035,'E',null),

('Soprema','SOPRA XPS PM','isolamento_xps'::public.product_type,
 'Placa de XPS de superfície lisa e encaixe macho-fêmea, destinada a fachadas duplas com caixa-de-ar ventilada e a isolamento interior com perfilaria metálica e gesso cartonado.',
 'liso','exterior',
 'https://lotus.soprema.fr/www/reftechsop.nsf/($AllByUNID)/F557DD80A207F97FC125866A00664073/$File/TDS_INSES0101-1.e.PT_SOPRA%20XPS%20PM.pdf',
 'https://lotus.soprema.fr/www/reftechsop.nsf/($AllByUNID)/F557DD80A207F97FC125866A00664073/$File/TDS_INSES0101-1.e.PT_SOPRA%20XPS%20PM.pdf',
 null,null,null,array['DANOPREN TL-P','SOPRA XPS CB']::text[],
 'Resistência à compressão ≥250 kPa (CS(10\Y)) a 10% de deformação. m² por embalagem varia por espessura (40 mm: 7,5 m²; 120 mm: 2,25 m²). Sem preço público.',
 array[40,50,60,80,100,120]::numeric[],'1250 × 600 mm',7.5,0.033,'E',null),

('Soprema','SOPRA XPS CB','isolamento_xps'::public.product_type,
 'Placa de XPS de superfície rugosa (sem pele), para sistemas de isolamento térmico pelo exterior (ETICS/capoto), incluindo correção de pontes térmicas e vãos de portas/janelas; também aplicável em coberturas com proteção pesada imediata.',
 'superfície rugosa, sem pele de extrusão','exterior',
 'https://documentacion.generadordeprecios.info/documentaciontecnica/soprema/sop_sxps_cb_ft.pdf',
 'https://documentacion.generadordeprecios.info/documentaciontecnica/soprema/sop_sxps_cb_ft.pdf',
 null,null,null,array['SOPRA XPS PM','DANOPREN TL-P']::text[],
 'Resistência à compressão ≥300 kPa (UNE EN 826). Ficha consultada em espanhol. m² por embalagem varia por espessura (40 mm: 7,5 m²; 200 mm: 1,5 m²). Sem preço público.',
 array[40,50,60,80,100,120,140,160,180,200]::numeric[],'1250 × 600 mm',7.5,0.032,'E',null),

-- Lã mineral / lã de rocha -----------------------------------------------------------------------------
('ROCKWOOL','Rocksate Duo Plus','isolamento_la_mineral'::public.product_type,
 'Painel rígido de lã de rocha de dupla densidade, sem revestimento, para sistemas ETICS (sistema REDArt). A camada exterior mais densa melhora a aderência do revestimento, a camada interior menos densa favorece o desempenho térmico.',
 null,'exterior','https://www.rockwool.com/pt/produtos/rocksate-duo-plus/',
 'https://www.rockwool.com/syssiteassets/rw-es/herramientas/fichas-tecnicas/gama-rocksate---sistema-redart/ft_rocksate-duo-plus_pt.pdf',
 null,null,null,array['Rocksate MD Plus','Rocksate Contorno','Argamassa de colagem Rocksate']::text[],
 'Densidade (dupla): 120 kg/m³ (camada exterior) / 70 kg/m³ (camada interior), valor nominal do fabricante. Sem preço público.',
 array[50,60,80,100,120,140,160,180,200]::numeric[],'1200 × 600 mm',null,0.035,'A1',null),

('ROCKWOOL','Rocksate MD Plus','isolamento_la_mineral'::public.product_type,
 'Painel rígido de lã de rocha monodensidade, sem revestimento, para sistemas ETICS (sistema REDArt), indicado para obra nova e reabilitação.',
 null,'exterior','https://www.rockwool.com/pt/produtos/rocksate-md-plus/',null,
 null,null,null,array['Rocksate Duo Plus','Rocksate Contorno']::text[],
 'Densidade 120 kg/m³. Espessuras e dimensões não encontradas na página consultada nem foi localizada ficha técnica direta — confirmar antes de divulgar ao cliente. Sem preço público.',
 '{}'::numeric[],null,null,0.036,'A1',null),

('ROCKWOOL','Rocksate Contorno','isolamento_la_mineral'::public.product_type,
 'Painel rígido de lã de rocha monodensidade, sem revestimento, destinado ao isolamento de contornos de vãos (janelas/portas) em sistemas ETICS, reduzindo pontes térmicas na ligação fachada-vão.',
 null,'exterior','https://www.rockwool.com/pt/produtos/rocksate-contorno/',null,
 null,null,null,array['Rocksate Duo Plus','Rocksate MD Plus']::text[],
 'Densidade 155 kg/m³ (20 mm) / 120 kg/m³ (30 mm). Condutividade térmica não publicada na página consultada. Sem preço público.',
 array[20,30]::numeric[],null,null,null,'A1',null),

('Knauf Insulation','Smart Wall FKD-S Thermal','isolamento_la_mineral'::public.product_type,
 'Painel semirrígido/rígido de lã mineral (rock wool), incombustível, para sistema de isolamento térmico pelo exterior (SATE/ETICS), corrigindo pontes térmicas lineares.',
 null,'exterior','https://knauf.com/pt-PT/p/produto/smart-wall-fkd-s-thermal-23150_4220',
 'https://live-place.com/siteimg/Ficheiros%20de%20Produtos/Ficheiros/CERTIFICADOS%20-%20FICHAS%20TECNICAS/KNAUFINSULATION/FT/ft-etics-fkd-s-pt.pdf',
 null,null,null,array['Argamassa/cola para SATE','Perfil de arranque ETICS']::text[],
 'Resistência térmica declarada por espessura (m²·K/W): 40 mm=1,10; 50 mm=1,35; 60 mm=1,65; 80 mm=2,20; 100 mm=2,75; 120 mm=3,30; 140 mm=3,85. Sem preço público.',
 array[40,50,60,80,100,120,140]::numeric[],'1200 × 600 mm',null,0.036,'A1 ("não combustível")',null),

-- Cortiça (ICB) -----------------------------------------------------------------------------------------
('Amorim Cork Solutions','Painel isolante em cortiça expandida (ICB)','isolamento_cortica'::public.product_type,
 'Painel de isolamento térmico e acústico produzido por aglomeração natural de granulado de cortiça expandida, sem ligantes sintéticos, usado em sistemas ETICS e outras aplicações de construção.',
 null,'exterior','https://amorimcorksolutions.com/media/10947/tds_painel-isolante-em-cortiça-expandida_pt.pdf',
 'https://amorimcorksolutions.com/media/10947/tds_painel-isolante-em-cortiça-expandida_pt.pdf',
 null,null,null,array['Argamassa de colagem ETICS','Rede de fibra de vidro','Perfil de arranque']::text[],
 'Ficha técnica CTP-465/002, maio de 2026. Densidade 110 ± 10 kg/m³. Gama de espessuras muito ampla (até 300 mm). Sem preço público (venda tipicamente por cotação/distribuidor).',
 array[10,15,25,30,35,40,45,50,55,60,65,70,75,80,90,95,100,110,120,130,140,150,160,170,180,190,210,220,230,240,250,260,270,280,290,300]::numeric[],
 '1000 × 500 mm',null,0.039,'E',null),

('Secil (gama Isovit)','Isovit Painel em Aglomerado Negro de Cortiça — ICB','isolamento_cortica'::public.product_type,
 'Painel rígido de isolamento térmico e acústico, constituído exclusivamente por granulado de cortiça aglomerado pela própria resina natural (suberina), sem ligantes sintéticos; integra o sistema ETICS Isovit Cork.',
 null,'exterior',
 'https://www.secil.pt/content/dam/secilComercial/documents/pt/argamassas/sistema-etics/isovit-painel-em-aglomerado-negro-de-corti%C3%A7a---icb/Fiche%20Technique%20Isovit%20Painel%20em%20Aglomerado%20Negro%20de%20Corti%C3%A7a%20ICB.pdf.coredownload.pdf',
 'https://qld.secil.pt/content/dam/secilComercial/documents/pt/argamassas/sistema-etics/isovit-painel-em-aglomerado-negro-de-corti%C3%A7a---icb/Data%20Sheet%20Isovit%20Painel%20em%20Aglomerado%20Negro%20de%20Corti%C3%A7a%20ICB.pdf.coredownload.pdf',
 null,null,null,array['Argamassa Isovit Cork de colagem/regularização','Rede de armadura','Perfis de arranque e remate']::text[],
 'Densidade ≤ 130 kg/m³. m² por embalagem varia por espessura (20 mm: 7,5 m²; 100 mm: 1,5 m²). Sem preço público (venda tipicamente por cotação/distribuidor).',
 array[20,30,40,50,60,80,90,100]::numeric[],'1000 ± 5 mm × 500 ± 3 mm',7.5,0.040,'E',null),

-- Fixadores (buchas mecânicas) -------------------------------------------------------------------------
('INDEX (Técnicas Expansivas S.L.)','AIS — Taco plástico para fixação de painéis isolantes','fixador_capoto'::public.product_type,
 'Taco plástico em polipropileno para fixar por percussão painéis de poliestireno expandido (EPS), lã mineral ou poliestireno extrudido (XPS) a suportes maciços.',
 null,'exterior','https://www.indexfix.com/pt/produto/10669-ais-bucha',null,
 null,null,null,array['Placas de EPS, lã mineral e XPS para ETICS']::text[],
 'Comprimentos de fixação disponíveis: 80/100/110/130 mm (diâmetro 8 mm), para isolamento até 50-100 mm. Sem preço público.',
 '{}'::numeric[],'Diâmetro 8 mm, comprimento 80–130 mm consoante o modelo',null,null,null,'Caixa de 100 unidades'),

('INDEX (Técnicas Expansivas S.L.)','AIS-M — Bucha metálica para fixação de isolamentos rígidos','fixador_capoto'::public.product_type,
 'Bucha metálica em aço zincado, instalada por percussão, para fixar painéis rígidos (EPS, lã mineral, XPS) a suportes maciços.',
 null,'exterior','https://www.indexfix.com/pt/produto/11629-ais-m-bucha-metalica/',null,
 null,null,null,array['Placas de EPS, lã mineral e XPS para ETICS']::text[],
 'Comprimentos disponíveis: 90/110/120/140/170/200/250/300 mm (diâmetro 8 mm), para isolamento até 50-260 mm. Sem preço público.',
 '{}'::numeric[],'Diâmetro 8 mm, comprimento 90–300 mm consoante o modelo',null,null,null,'Caixa de 250 unidades'),

('Pecol, Sistemas de Fixação, SA','PCL 618 — Bucha de nylon para fixação de painel com prego','fixador_capoto'::public.product_type,
 'Bucha de polipropileno com prego em poliamida reforçada com fibra de vidro, fabricada em Portugal, para fixação de painéis de isolamento (incluindo EPS e PU) a betão, pedra natural e tijolo refratário.',
 null,'exterior','https://cdn.pecol.pt/files/002_Buchas/BuchaPCL618_9.pdf','https://cdn.pecol.pt/files/002_Buchas/BuchaPCL618_9.pdf',
 null,null,null,array['Painéis de poliestireno e PU para ETICS']::text[],
 'Fabricado em Portugal. Comprimentos disponíveis: 70/90/110/130/150 mm (diâmetro 10 mm). Sem preço público.',
 '{}'::numeric[],'Diâmetro 10 mm, comprimento 70–150 mm consoante o modelo',null,null,null,'Caixa de 200 ou 250 unidades, consoante o comprimento'),

('fischer','termoz CN 8/110 neutro','fixador_capoto'::public.product_type,
 'Bucha de percussão com manga cinzenta, disco de pressão e prego compósito, com Aprovação Técnica Europeia (ETA), para fixar painéis isolantes (poliestireno e lã mineral) a tijolo maciço/furado, betão de agregados leves e betão celular.',
 null,'exterior','https://fabory.com/pt/fischer-termoz-cn-8-110-neutro/p/507418FIS',null,
 null,null,null,array['Painéis de poliestireno e lã mineral para ETICS','Argamassa de colagem ETICS']::text[],
 'Aprovação Técnica Europeia (ETA). Só foi confirmado o comprimento de 108 mm nesta pesquisa; o fabricante comercializa outros comprimentos, não verificados. Sem preço público.',
 '{}'::numeric[],'Diâmetro de furo 8 mm, comprimento 108 mm, disco de pressão com 60 mm de diâmetro',null,null,null,'Unidade (venda ao artigo)'),

-- Rede / malha de fibra de vidro -----------------------------------------------------------------------
('Weber (Saint-Gobain)','weber.therm malla 160','rede_fibra_vidro'::public.product_type,
 'Rede de fibra de vidro tratada com resina alcalino-resistente, para a camada de base armada de sistemas ETICS webertherm.',
 null,'exterior','https://www.es.weber/files/es/2018-05/FTC-ES-P-webertherm-malla-160.pdf.pdf',
 'https://www.es.weber/files/es/2018-05/FTC-ES-P-webertherm-malla-160.pdf.pdf',
 null,null,null,array['webertherm base coat (argamassa de colagem/armadura)','webertherm acabamento']::text[],
 'Ficha consultada é da gama Weber Espanha (es.weber); não encontrada ficha PT específica para esta referência. m² por embalagem calculado a partir das dimensões do rolo. Sem preço público.',
 '{}'::numeric[],'160 g/m², malha 3,5 × 3,8 mm',55,null,null,'Rolo de 55 m² (1,10 m × 50 m)'),

('Saint-Gobain ADFORS','ADFORS Vertex Mesh R131 A101','rede_fibra_vidro'::public.product_type,
 'Rede de reforço em fibra de vidro resistente a álcalis, para a camada de base de sistemas ETICS, com marcação CE.',
 null,'exterior',
 'https://eu.adfors.com/sites/hps-mac3-adfors-eu/files/assetbank_media/ADFORS-mesh-Vertex-TDS-R131-A101-EN-2128816.pdf',
 'https://eu.adfors.com/sites/hps-mac3-adfors-eu/files/assetbank_media/ADFORS-mesh-Vertex-TDS-R131-A101-EN-2128816.pdf',
 null,null,null,array['Base coat de reforço ETICS compatível','Perfil de arranque']::text[],
 'Ficha internacional; presença comercial confirmada em Portugal via distribuidores Saint-Gobain, sem página/preço de retalho PT específico. Área por rolo calculada a partir das dimensões. Sem preço público.',
 '{}'::numeric[],'163 g/m² (±5%), malha 3,5×3,8 mm (±0,5 mm)',55,null,null,'Rolo de ≈55 m² (1,10 m × 50 m)'),

('Mapei','Mapetherm Net','rede_fibra_vidro'::public.product_type,
 'Rede de fibra de vidro alcalino-resistente para reforço da camada de base (rasante) em sistemas ETICS Mapetherm.',
 null,'exterior','https://mapei.com/gb/en/products-and-solutions/products/detail/mapetherm-net',
 'https://documentacion.generadordeprecios.info/documentaciontecnica/mapei-spain/mapei_map_net_ft.pdf',
 null,null,null,array['Mapetherm base coat','Mapetherm AR2']::text[],
 'Ficha consultada é a versão espanhola (mesma ficha nos mercados ibéricos); sem página de preço de retalho PT. Sem preço público.',
 '{}'::numeric[],'155 g/m² (±5%), malha 4,15×3,80 mm (±5%)',50,null,null,'Rolo de 50 m² (1 m × 50 m)'),

('Vimaplás','VIPLÁS50 (rede em fibra de vidro)','rede_fibra_vidro'::public.product_type,
 'Rede de fibra de vidro para reforço de rebocos e sistemas de isolamento térmico pelo exterior (capoto), de fabricante português.',
 null,'exterior','https://www.leroymerlin.pt/produtos/rede-em-fibra-de-vidro-viplas50-1x10m-65gr-81966406.html',null,
 2190,'https://www.leroymerlin.pt/produtos/rede-em-fibra-de-vidro-viplas50-1x10m-65gr-81966406.html','2026-10-24'::date,
 array['Argamassa de colagem/reboco armado para capoto']::text[],
 'Fabricante português (Vimaplás). Único produto desta categoria com preço confirmado diretamente num retalhista (Leroy Merlin Portugal).',
 '{}'::numeric[],'65 g/m², malha 3×3 mm',10,null,null,'Rolo de 10 m² (1 m × 10 m)'),

('ROCKWOOL','REDArt Malla','rede_fibra_vidro'::public.product_type,
 'Rede de fibra de vidro para a camada de base armada de sistemas de isolamento térmico pelo exterior com lã de rocha ROCKWOOL.',
 null,'exterior','https://www.rockwool.com/pt/produtos/redart-malla/',null,
 null,null,null,array['Redart capa base (argamassa de base)','Isolamento ROCKWOOL para fachada']::text[],
 'A página portuguesa não publica gramagem nem preço; a ligação à ficha técnica no site aponta para um portal, não para um PDF direto confirmável.',
 '{}'::numeric[],'Malha 3,5×3,8 mm (gramagem não publicada)',null,null,null,'Rolo (área não publicada)'),

-- Rebocos para capoto (ETICS) ------------------------------------------------------------------------
('Barbot','Massa Barbotherm F (ref. 8850)','reboco_capoto'::public.product_type,
 'Reboco de base/armação fibroso, para colagem de painéis isolantes e embebimento da rede de fibra de vidro em sistemas ETICS/capoto.',
 null,'exterior','https://barbot.pt/wp-content/uploads/2024/01/8850-FT-MASSA-BARBOTHERM-FRev.-2.pdf',
 'https://barbot.pt/wp-content/uploads/2024/01/8850-FT-MASSA-BARBOTHERM-FRev.-2.pdf',
 null,null,null,array['Btherm RF (primário regulador de fundo)','Massa Barbotherm F Basic']::text[],
 'Consumo de referência ≈1,7 kg/m² por mm de espessura (≈8 kg/m² incluindo colagem de placas EPS). Sem preço público.',
 array[8]::numeric[],null,null,null,null,'Saco de 25 kg'),

('CIN (Divisão Sotinco)','Ruga F 1,5 mm (ref. 29-586)','reboco_capoto'::public.product_type,
 'Reboco de acabamento decorativo, revestimento espesso aquoso de textura rústica com granulado de mármore, aplicado sobre sistemas de isolamento térmico exterior.',
 'rugoso/riscado (granulometria 1,5 mm)','exterior','https://idoctec.cin.com/Home/Document/29586-DEC-SOT-BT-PT',
 'https://idoctec.cin.com/Home/Document/29586-DEC-SOT-BT-PT',
 null,null,null,array['Primário Acrílico (ref. 45-380)','Tincomate G10']::text[],
 'Consumo aproximado 2-3 kg/m². Peso de embalagem não confirmado na ficha. A marca comercial "Sototherm" não aparece nominalmente na ficha consultada, apenas "CIN – Divisão Sotinco". Sem preço público.',
 array[1.5]::numeric[],null,null,null,null,null),

('Mapei','Mapetherm AR1','reboco_capoto'::public.product_type,
 'Argamassa cimentícia monocomponente de base/armação para colagem de painéis termoisolantes e embebimento da rede, em sistemas ETICS.',
 null,'exterior','https://www.mapei.com/pt/pt/produtos-e-solucoes/produtos/detalhe/mapetherm-ar1',
 'https://live-place.com/siteimg/Ficheiros%20de%20Produtos/Ficheiros/CERTIFICADOS%20-%20FICHAS%20TECNICAS/LUSOMAPEI/FT/M255125_MAPETHERM%20AR1%20(SC25KG)_FT.pdf',
 null,null,null,array['Mapetherm AR1 GG (versão com fibra reforçada)']::text[],
 'Consumo ≈1,3-1,5 kg/m² por mm de espessura (≈5,2-6,0 kg/m² para 4 mm); acabamento final aplicado após 15 dias de cura. Sem preço público.',
 array[4]::numeric[],null,null,null,null,'Saco de 25 kg'),

('Weber (Saint-Gobain)','weberdecor naturkal','reboco_capoto'::public.product_type,
 'Reboco de acabamento mineral à base de cal, em camada fina, para revestimento de placas isolantes de sistemas webertherm.',
 'areado fino ou alisado','exterior','https://saint-gobain.pt/Documentos/ficha-tecnica/ficha-tecnica-weberdecor-naturkal-0.pdf',
 'https://saint-gobain.pt/Documentos/ficha-tecnica/ficha-tecnica-weberdecor-naturkal-0.pdf',
 null,null,null,array['weberprim regulador (primário)']::text[],
 'Consumo de referência ≈1,5 kg/m² por mm de espessura aplicada. Sem preço público.',
 array[3]::numeric[],null,null,null,null,'Saco de 20 kg'),

('Secil','Isovit Rev Fino / Médio','reboco_capoto'::public.product_type,
 'Reboco de acabamento decorativo 100% acrílico, texturado, aplicado como camada final sobre sistemas de isolamento térmico projetado (ISODUR) e rebocos REDUR.',
 'fino (granulometria <1,0 mm) ou médio (granulometria <1,5 mm)','exterior',
 'https://www.secil.pt/content/dam/secilComercial/documents/pt/argamassas/sistema-etics/isovit-rev-fino/FT.13009.02_ISOVIT%20REV%20FINO_M%C3%89DIO.pdf.coredownload.pdf',
 'https://www.secil.pt/content/dam/secilComercial/documents/pt/argamassas/sistema-etics/isovit-rev-fino/FT.13009.02_ISOVIT%20REV%20FINO_M%C3%89DIO.pdf.coredownload.pdf',
 null,null,null,'{}'::text[],
 'Consumo teórico 1,4-1,8 kg/m²; não convertido a m²/embalagem por a ficha não dar densidade/rendimento prático por balde. Sem preço público.',
 array[1.0,1.5]::numeric[],null,null,null,null,'Balde de 25 kg')

on conflict (marca, nome) do nothing;
