-- A chave estrangeira composta (building_id, org_id) precisa de um índice próprio.
-- O índice simples org_documents_building_id_idx fica redundante; remover numa
-- migração futura (o drop exige confirmação manual no Supabase).
create index org_documents_building_org_idx on public.org_documents (building_id, org_id);
