-- A fatura emitida chega a quem a deve (05/11/2026): por email, com o PDF em anexo, logo após a emissão; e fica
-- disponível na aplicação da entidade. Até aqui o PDF só era lido pela equipa da plataforma.
--
-- 1. `fiscal_documents.org_id`: a entidade a quem a fatura é emitida. Nulo nos documentos anteriores (nenhum real).
--    A tabela é imutável depois de emitida, por isso o registo dos envios vive noutra tabela.
-- 2. A entidade lê as suas faturas já emitidas (proprietários e gestores, e a administradora que a gere) e o
--    respetivo PDF. Nunca lê as que falharam: o campo `erro` traz texto interno da Moloni.
-- 3. `fiscal_document_envios`: uma linha por tentativa de envio; só a equipa da plataforma lê, só o servidor grava.

alter table public.fiscal_documents add column org_id uuid references public.organizations (id) on delete restrict;
create index fiscal_documents_org_idx on public.fiscal_documents (org_id) where org_id is not null;

create policy fiscal_documents_select_entidade on public.fiscal_documents for select to authenticated
  using (
    estado = 'emitido'
    and org_id is not null
    and exists (
      select 1
        from public.org_members m
       where m.user_id = (select auth.uid())
         and m.role in ('proprietario', 'gestor')
         and (m.org_id = fiscal_documents.org_id
              or m.org_id = (select o.gerida_por from public.organizations o where o.id = fiscal_documents.org_id))
    )
  );

create policy documentos_fiscais_select_entidade on storage.objects for select to authenticated
  using (
    bucket_id = 'documentos-fiscais'
    and exists (select 1 from public.fiscal_documents f where f.pdf_path = storage.objects.name)
  );

create table public.fiscal_document_envios (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.fiscal_documents (id) on delete restrict,
  para text not null check (char_length(para) between 3 and 320),
  estado text not null check (estado in ('enviado', 'falhou')),
  erro text,
  created_at timestamptz not null default now()
);
create index fiscal_document_envios_document_idx on public.fiscal_document_envios (document_id, created_at desc);
alter table public.fiscal_document_envios enable row level security;
revoke all on public.fiscal_document_envios from anon;
revoke insert, update, delete, truncate on public.fiscal_document_envios from authenticated;
create policy fiscal_document_envios_select on public.fiscal_document_envios for select to authenticated using ((select private.is_platform_admin()));
