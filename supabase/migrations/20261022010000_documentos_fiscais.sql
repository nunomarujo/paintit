-- Documentos fiscais emitidos por software certificado (Moloni): um por acontecimento (comissão, subscrição, caução retida),
-- nunca duplicado (origem + id). Não se altera nem se apaga: uma falha regista-se e repete-se; um documento emitido
-- corrige-se com nota de crédito. Só a equipa da plataforma lê; só o servidor (chave secreta) grava. Uma instrução por linha.
create table public.fiscal_documents (id uuid primary key default gen_random_uuid(), reason text not null check (reason in ('comissao', 'subscricao', 'caucao_retida')), origin_type text not null, origin_id text not null, tipo text not null check (tipo in ('FT', 'NC')), estado text not null default 'pendente' check (estado in ('pendente', 'emitido', 'falhou')), data date not null, cliente_nome text not null, cliente_nif text, total_cents integer not null check (total_cents >= 0), referencia_origin_type text, referencia_origin_id text, provider text not null default 'moloni', provider_document_id text, numero text, atcud text, pdf_path text, erro text, created_at timestamptz not null default now(), emitido_em timestamptz, unique (origin_type, origin_id));
create index fiscal_documents_reason_idx on public.fiscal_documents (reason, data);
create index fiscal_documents_estado_idx on public.fiscal_documents (estado);
alter table public.fiscal_documents enable row level security;
revoke all on public.fiscal_documents from anon;
revoke insert, update, delete, truncate on public.fiscal_documents from authenticated;
create policy fiscal_documents_select on public.fiscal_documents for select to authenticated using ((select private.is_platform_admin()));
create function private.fiscal_documents_immutable() returns trigger language plpgsql set search_path = '' as $$
begin
  raise exception 'Um documento fiscal não se altera: emite-se de novo ou corrige-se com nota de crédito.' using errcode = 'P0001';
end $$;
create trigger fiscal_documents_no_delete before delete on public.fiscal_documents for each row execute function private.fiscal_documents_immutable();
create trigger fiscal_documents_no_edit_emitted before update on public.fiscal_documents for each row when (old.estado = 'emitido') execute function private.fiscal_documents_immutable();
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values ('documentos-fiscais', 'documentos-fiscais', false, 5242880, array['application/pdf']);
create policy documentos_fiscais_select on storage.objects for select to authenticated using (bucket_id = 'documentos-fiscais' and (select private.is_platform_admin()));
