-- Despesa com comprovativo (25/10/2026, docs/DECISOES.md).
--
-- NOTA DE REGISTO (27/10/2026): aplicada por outra via sem ficar registada; re-aplicada nesse dia
-- (é idempotente) e registada como `20261027190344`. O nome do ficheiro fica na posição verdadeira
-- da sequência, pela mesma razão que a `pessoas_da_empresa` — ver a nota lá.
--
-- Lançar uma despesa passa a ser duas coisas: a fotografia do documento e o valor. O documento fica
-- guardado, e a leitura automática do que lá está dentro vem depois — a utilização básica não pode
-- depender de a interpretação acertar.
--
-- Cofre próprio, e não o da obra: o cofre `obra` é legível pelo cliente da obra, por desenho, para
-- ele ver as fotografias que lhe forem partilhadas. Uma factura de material traz os preços a que o
-- pintor compra, e isso é dele. Misturar os dois seria dar ao cliente a margem do fornecedor.

alter table public.worksite_entries add column if not exists comprovativo_path text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('comprovativos', 'comprovativos', false, 10485760, array['image/jpeg', 'image/png', 'application/pdf'])
on conflict (id) do nothing;

-- Caminho "<worksite_id>/<ficheiro>", como no cofre da obra. Só a empresa que gere a obra, nunca o
-- cliente dela.
drop policy if exists comprovativos_select on storage.objects;
create policy comprovativos_select on storage.objects for select to authenticated
  using (bucket_id = 'comprovativos' and private.can_manage_org(private.worksite_org(private.org_from_path(name))));

drop policy if exists comprovativos_insert on storage.objects;
create policy comprovativos_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'comprovativos' and private.can_manage_org(private.worksite_org(private.org_from_path(name))));

drop policy if exists comprovativos_delete on storage.objects;
create policy comprovativos_delete on storage.objects for delete to authenticated
  using (bucket_id = 'comprovativos' and private.can_manage_org(private.worksite_org(private.org_from_path(name))));

comment on column public.worksite_entries.comprovativo_path is
  'Fotografia ou PDF do documento da despesa, no cofre "comprovativos". Nunca visivel ao cliente da obra.';
