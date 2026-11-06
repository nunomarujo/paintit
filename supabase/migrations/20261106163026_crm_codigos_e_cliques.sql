-- CRM: código por contacto, um clique conta uma vez por envio, e marcas do trabalho automático (promotor, 06/11/2026).
--
-- O sinal de sucesso de uma campanha deixa de ser «resposta» (quase ninguém responde a email frio) e passa a ser
-- o clique no link com o código do contacto. Cada contacto tem o seu código; cada envio conta, no máximo, um clique.
-- `descoberta_em` e `enriquecido_em` evitam repetir pesquisas: o OpenStreetMap é perguntado uma vez por semana e cada
-- website é lido uma vez.

alter table public.crm_zonas add column descoberta_em timestamptz;

alter table public.crm_contactos
  add column codigo text not null default upper(substr(md5(gen_random_uuid()::text), 1, 8)),
  add column enriquecido_em timestamptz;
create unique index crm_contactos_codigo_key on public.crm_contactos (codigo);

create unique index crm_eventos_clique_por_envio on public.crm_eventos (envio_id) where tipo = 'clique' and envio_id is not null;
